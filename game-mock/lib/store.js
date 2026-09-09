'use strict';

const path = require('path');
const { loadDir } = require('./load-dir');
const { newId, ZERO_UUID, isRootMaster, normalizeMaster } = require('./ids');
const defaults = require('./defaults');
const { createAccessToken, createRefreshToken, verifyJwt, decodeJwt } = require('./jwt');

const MODELS = path.join(__dirname, '..', 'models');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function publicUser(user) {
  if (!user) return null;
  return {
    userId: user.id,
    userName: user.userName,
    email: user.email,
    password: user.password,
    roles: user.roles || [],
    organizationsId: user.organizationsId || [],
    enabled: user.enabled,
    createdAt: user.createdAt
  };
}

function createStore() {
  const organizations = loadDir(path.join(MODELS, 'organizations')).map((item) =>
    defaults.hydrateOrganization(item)
  );
  const defaultOrgId = organizations[0] && organizations[0].id;

  const users = loadDir(path.join(MODELS, 'users')).map((item) =>
    defaults.hydrateUser(item, { defaultOrgId })
  );
  const defaultAuthor =
    users.find((u) => u.roles.includes('METHODIST') || u.roles.includes('ADMINISTRATOR')) ||
    users[0];
  const defaultPlayer =
    users.find((u) => u.roles.includes('PLAYER')) || users[0];

  const mentorGroups = loadDir(path.join(MODELS, 'mentor-groups')).map((item) =>
    defaults.hydrateMentorGroup(item)
  );
  const defaultMentorGroupId = mentorGroups[0] && mentorGroups[0].mentorsGroupId;

  const questionGroups = loadDir(path.join(MODELS, 'question-groups')).map((item) => {
    const group = defaults.hydrateQuestionGroup(item);
    group.groupId = item.groupId || item.id || group.groupId;
    return group;
  });

  const questions = loadDir(path.join(MODELS, 'questions')).map((item) =>
    defaults.hydrateQuestion(item, {
      defaultAuthorId: defaultAuthor && defaultAuthor.id,
      defaultMentorGroupId
    })
  );

  const clients = loadDir(path.join(MODELS, 'clients')).map((item) =>
    defaults.hydrateClient(item)
  );

  const nodesByBranch = { dev: [], ingame: [], archive: [] };
  for (const pack of loadDir(path.join(MODELS, 'nodes'))) {
    const branches = pack.branches || [pack.branch || 'dev'];
    const rawNodes = pack.nodes || [];
    for (const branch of branches) {
      if (!nodesByBranch[branch]) nodesByBranch[branch] = [];
      for (const raw of rawNodes) {
        nodesByBranch[branch].push(defaults.hydrateNode({ ...raw }));
      }
    }
  }

  const progressItems = loadDir(path.join(MODELS, 'progress')).map((item) =>
    defaults.hydrateProgress(item)
  );
  const progressByPlayer = {};
  for (const item of progressItems) {
    if (!item.playerId) continue;
    if (!progressByPlayer[item.playerId]) progressByPlayer[item.playerId] = [];
    progressByPlayer[item.playerId].push({
      nodeId: item.nodeId,
      questionStatus: item.questionStatus,
      currentQuestionId: item.currentQuestionId,
      isOpen: item.isOpen
    });
  }

  const answers = loadDir(path.join(MODELS, 'answers')).map((item) =>
    defaults.hydrateAnswer(item)
  );

  const currencies = loadDir(path.join(MODELS, 'currencies')).map((item, index) =>
    defaults.hydrateCurrency(item, index)
  );

  const costs = loadDir(path.join(MODELS, 'costs')).map((item) => defaults.hydrateCost(item));
  const rewards = loadDir(path.join(MODELS, 'rewards')).map((item) =>
    defaults.hydrateReward(item)
  );
  const experienceNodes = loadDir(path.join(MODELS, 'experience-nodes')).map((item) =>
    defaults.hydrateExperienceNode(item)
  );
  const files = loadDir(path.join(MODELS, 'files')).map((item, index) =>
    defaults.hydrateFile(item, index)
  );
  const errorCodes = loadDir(path.join(MODELS, 'error-codes')).map((item) =>
    defaults.hydrateErrorCode(item)
  );
  const memberships = loadDir(path.join(MODELS, 'memberships')).map((item) =>
    defaults.hydrateMembership(item)
  );

  const tokens = new Map();
  const refreshTokens = new Map();
  const questionLogs = {};
  const balanceByPlayer = {};
  const experienceByPlayer = {};
  const transactions = [];
  let txSeq = 1;
  let nextFileId = files.reduce((max, file) => Math.max(max, Number(file.fileId) || 0), 0) + 1;
  let nextCurrencyId =
    currencies.reduce((max, c) => Math.max(max, Number(c.currencyId) || 0), 0) + 1;

  function findUser(id) {
    return users.find((u) => u.id === id) || null;
  }

  function findUserByLogin(login) {
    const value = String(login || '').toLowerCase();
    return (
      users.find(
        (u) => u.userName.toLowerCase() === value || u.email.toLowerCase() === value
      ) || null
    );
  }

  function issueTokens(user) {
    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);
    tokens.set(accessToken, user.id);
    refreshTokens.set(refreshToken, user.id);
    return { type: 'Bearer', accessToken, refreshToken };
  }

  function getUserByToken(token) {
    const mapped = tokens.get(token);
    if (mapped) return findUser(mapped);
    const payload = verifyJwt(token) || decodeJwt(token);
    if (!payload || payload.type === 'refresh') return null;
    if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) return null;
    const userId = payload.userId || payload.sub;
    return userId ? findUser(userId) || findUserByLogin(userId) : null;
  }

  function refreshAccess(refreshToken) {
    let userId = refreshTokens.get(refreshToken);
    if (!userId) {
      const payload = verifyJwt(refreshToken) || decodeJwt(refreshToken);
      if (payload && payload.type === 'refresh' && payload.sub) userId = payload.sub;
    }
    const user = userId ? findUser(userId) : null;
    if (!user) return null;
    refreshTokens.delete(refreshToken);
    return issueTokens(user);
  }

  function defaultUser() {
    return defaultPlayer || users[0] || null;
  }

  function findOrg(id) {
    return organizations.find((o) => o.id === id) || null;
  }

  function userOut(user) {
    if (!user) return null;
    return {
      ...publicUser(user),
      organizations: (user.organizationsId || []).map((id) => findOrg(id)).filter(Boolean)
    };
  }

  function userPreview(user) {
    if (!user) return null;
    return { userId: user.id, userName: user.userName };
  }

  function usersPage(items, page, size) {
    const p = Math.max(0, Number(page) || 0);
    const s = Math.max(1, Number(size) || 20);
    const start = p * s;
    const slice = items.slice(start, start + s);
    return {
      ListOfTheUsers: slice,
      Pagination: {
        pageNumber: p,
        amountOfRecordsInThePage: slice.length,
        amountOfRecordsAtAll: items.length,
        amountOfPages: Math.ceil(items.length / s) || 0
      }
    };
  }

  function groupById(groupId) {
    return questionGroups.find((g) => g.groupId === groupId) || null;
  }

  function questionsForGroup(groupId) {
    const fromGroup = groupById(groupId);
    const declared = new Set(fromGroup ? fromGroup.questionsId : []);
    for (const question of questions) {
      if ((question.idGroupsOfTheQuestions || []).includes(groupId)) {
        declared.add(question.id);
      }
    }
    return [...declared];
  }

  function nodesForGroup(groupId) {
    const ids = [];
    for (const branch of Object.keys(nodesByBranch)) {
      for (const node of nodesByBranch[branch]) {
        if (node.groupOfTheQuestionId === groupId) ids.push(node.id);
      }
    }
    return [...new Set(ids)];
  }

  function groupOut(group) {
    if (!group) return null;
    return {
      groupId: group.groupId,
      groupName: group.groupName,
      // всегда массив id вопросов (не null) — фронт ожидает список у каждой группы ноды
      questionsId: questionsForGroup(group.groupId),
      linkedNodesId: nodesForGroup(group.groupId)
    };
  }

  function slavesOf(branch, nodeId) {
    const nodes = nodesByBranch[branch] || [];
    return nodes.filter((n) => n.masterNodeId === nodeId);
  }

  function nodeOut(branch, node) {
    if (!node) return null;
    const children = slavesOf(branch, node.id);
    return {
      id: node.id,
      nodeName: node.nodeName,
      groupOfTheQuestion: node.groupOfTheQuestionId
        ? groupOut(groupById(node.groupOfTheQuestionId))
        : null,
      masterNodeId: node.masterNodeId,
      nodeStatus: node.nodeStatus,
      nodeType: node.nodeType,
      changeDate: node.changeDate,
      activeSlaveNodesId: children.filter((n) => n.nodeStatus === 'ACTIVE').map((n) => n.id),
      notActiveSlaveNodesId: children.filter((n) => n.nodeStatus !== 'ACTIVE').map((n) => n.id),
      x: node.x,
      y: node.y,
      isCost: node.isCost,
      isPaid: node.isPaid
    };
  }

  function findNode(branch, nodeId) {
    return (nodesByBranch[branch] || []).find((n) => n.id === nodeId) || null;
  }

  function findNodeAny(nodeId) {
    for (const branch of ['ingame', 'dev', 'archive']) {
      const node = findNode(branch, nodeId);
      if (node) return { branch, node };
    }
    return null;
  }

  function roots(branch) {
    return (nodesByBranch[branch] || []).filter((n) => isRootMaster(n.masterNodeId));
  }

  function descendants(branch, rootNodeId) {
    const nodes = nodesByBranch[branch] || [];
    const result = [];
    const queue = nodes.filter((n) => n.id === rootNodeId);
    const seen = new Set();
    while (queue.length) {
      const node = queue.shift();
      if (!node || seen.has(node.id)) continue;
      seen.add(node.id);
      result.push(node);
      for (const child of nodes.filter((n) => n.masterNodeId === node.id)) {
        queue.push(child);
      }
    }
    return result;
  }

  function treeByLevel(branch, rootNodeId) {
    const nodes = descendants(branch, rootNodeId);
    const levels = {};
    const depthOf = {};
    const root = nodes.find((n) => n.id === rootNodeId);
    if (!root) return levels;
    depthOf[root.id] = 0;
    levels[0] = [nodeOut(branch, root)];
    const rest = nodes.filter((n) => n.id !== rootNodeId);
    let guard = 0;
    while (rest.length && guard < 50) {
      guard += 1;
      for (let i = rest.length - 1; i >= 0; i -= 1) {
        const node = rest[i];
        const parentDepth = depthOf[node.masterNodeId];
        if (parentDepth == null) continue;
        const depth = parentDepth + 1;
        depthOf[node.id] = depth;
        if (!levels[depth]) levels[depth] = [];
        levels[depth].push(nodeOut(branch, node));
        rest.splice(i, 1);
      }
    }
    return levels;
  }

  function questionOut(question) {
    return clone(question);
  }

  function pickQuestionForNode(node) {
    if (!node || !node.groupOfTheQuestionId) return null;
    const ids = questionsForGroup(node.groupOfTheQuestionId);
    const playable = ids
      .map((id) => questions.find((q) => q.id === id))
      .filter((q) => q && q.status === 'APPROVED');
    return playable[0] || null;
  }

  function progressOf(playerId) {
    if (!progressByPlayer[playerId]) progressByPlayer[playerId] = [];
    return progressByPlayer[playerId];
  }

  function ensurePlayerBalance(playerId) {
    if (!balanceByPlayer[playerId]) {
      const start = {};
      for (const currency of currencies) {
        start[String(currency.currencyId)] = currency.currencyType === 'EXPERIENCE' ? 0 : 100;
      }
      balanceByPlayer[playerId] = start;
    }
    return balanceByPlayer[playerId];
  }

  function ensurePlayerExperience(playerId) {
    if (!experienceByPlayer[playerId]) experienceByPlayer[playerId] = {};
    return experienceByPlayer[playerId];
  }

  function addBalance(playerId, updBalance, source) {
    const balance = ensurePlayerBalance(playerId);
    for (const [currencyId, value] of Object.entries(updBalance || {})) {
      const next = Number(balance[currencyId] || 0) + Number(value || 0);
      balance[currencyId] = next;
      transactions.push({
        seq: txSeq++,
        timestamp: new Date().toISOString(),
        currencyId: Number(currencyId),
        value: Number(value || 0),
        source: source || 'mock',
        playerId
      });
    }
    return balance;
  }

  function experienceTree(playerId, rootId) {
    const values = ensurePlayerExperience(playerId);
    function build(node) {
      return {
        experienceId: node.experienceId,
        parentId: node.parentId,
        experienceName: node.experienceName,
        experienceDescription: node.experienceDescription,
        value: Number(values[node.experienceId] || 0),
        children: experienceNodes
          .filter((child) => child.parentId === node.experienceId)
          .map(build)
      };
    }
    const root = experienceNodes.find((n) => n.experienceId === rootId);
    return root ? build(root) : null;
  }

  function sumTree(node) {
    if (!node) return 0;
    return node.value + node.children.reduce((acc, child) => acc + sumTree(child), 0);
  }

  function copyBranch(source, target, rootNodeId, toArchive = false) {
    const copied = descendants(source, rootNodeId).map((node) => clone(node));
    if (toArchive) {
      const existing = descendants(target, rootNodeId);
      for (const node of existing) {
        const archived = clone(node);
        archived.nodeStatus = 'ARCHIVE';
        nodesByBranch.archive.push(archived);
      }
    }
    nodesByBranch[target] = (nodesByBranch[target] || []).filter((n) => {
      return !copied.some((c) => c.id === n.id);
    });
    nodesByBranch[target].push(...copied);
  }

  function layoutGraph(branch, rootNodeId) {
    const nodes = descendants(branch, rootNodeId);
    const levels = treeByLevel(branch, rootNodeId);
    for (const [depth, list] of Object.entries(levels)) {
      list.forEach((item, index) => {
        const node = nodes.find((n) => n.id === item.id);
        if (!node) return;
        node.x = Number(depth) * 240;
        node.y = index * 120;
        node.changeDate = new Date().toISOString();
      });
    }
  }

  // seed default balances / experience for known players
  for (const user of users) {
    ensurePlayerBalance(user.id);
    ensurePlayerExperience(user.id);
  }

  return {
    users,
    organizations,
    clients,
    questions,
    questionGroups,
    mentorGroups,
    nodesByBranch,
    answers,
    currencies,
    costs,
    rewards,
    experienceNodes,
    files,
    errorCodes,
    memberships,
    tokens,
    refreshTokens,
    questionLogs,
    transactions,
    findUser,
    findUserByLogin,
    issueTokens,
    getUserByToken,
    refreshAccess,
    defaultUser,
    findOrg,
    userOut,
    userPreview,
    usersPage,
    groupById,
    groupOut,
    questionsForGroup,
    nodeOut,
    findNode,
    findNodeAny,
    roots,
    descendants,
    treeByLevel,
    questionOut,
    pickQuestionForNode,
    progressOf,
    ensurePlayerBalance,
    ensurePlayerExperience,
    addBalance,
    experienceTree,
    sumTree,
    copyBranch,
    layoutGraph,
    newId,
    ZERO_UUID,
    normalizeMaster,
    nextFileId: () => nextFileId++,
    nextCurrencyId: () => nextCurrencyId++,
    defaults
  };
}

module.exports = { createStore };
