'use strict';

const { ok, fail, optionalUser } = require('../lib/http');

function paginate(items, offset, limit) {
  const off = Math.max(0, Number(offset) || 0);
  const lim = Math.max(1, Number(limit) || items.length || 20);
  return items.slice(off, off + lim);
}

function logQuestion(store, question, comment) {
  if (!store.questionLogs[question.id]) store.questionLogs[question.id] = {};
  store.questionLogs[question.id][new Date().toISOString()] = {
    id: question.id,
    questionName: question.questionName,
    questionDescription: question.questionDescription,
    quiz: question.quiz,
    createByUserId: question.createByUserId,
    type: question.type,
    category: question.category,
    comment: comment || null
  };
}

function progressOut(store, playerId, rootNodeId) {
  let items = store.progressOf(playerId);
  if (rootNodeId) {
    const allowed = new Set(store.descendants('ingame', rootNodeId).map((n) => n.id));
    items = items.filter((p) => allowed.has(p.nodeId));
  }
  return { currentProgress: items };
}

function applyQuestionUpdate(question, body, quizFields) {
  if (body.questionName != null) question.questionName = body.questionName;
  if (body.questionDescription != null) question.questionDescription = body.questionDescription;
  if (body.category != null) question.category = body.category;
  if (body.oneShot != null) question.oneShot = body.oneShot;
  if (body.quiz) {
    question.quiz = { ...question.quiz };
    for (const field of quizFields) {
      if (body.quiz[field] !== undefined) question.quiz[field] = body.quiz[field];
    }
  }
}

function arraysEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((value, index) => {
    if (Array.isArray(value) || Array.isArray(b[index])) return arraysEqual(value, b[index]);
    return Number(value) === Number(b[index]) || value === b[index];
  });
}

async function gameRoutes(fastify) {
  const { store } = fastify;

  fastify.get('/api/v2/question', async (request) => {
    const { offset, limit } = request.query || {};
    return ok(paginate(store.questions.map((q) => store.questionOut(q)), offset, limit));
  });

  fastify.put('/api/v2/question', async (request) => {
    const filter = request.body || {};
    const { offset, limit } = request.query || {};
    let items = store.questions.slice();
    if (filter.createByUserId) {
      items = items.filter((q) => q.createByUserId === filter.createByUserId);
    }
    if (filter.questionStatus) {
      items = items.filter((q) => q.status === filter.questionStatus);
    }
    if (filter.typeOfTheQuestion) {
      items = items.filter((q) => q.type === filter.typeOfTheQuestion);
    }
    if (filter.idGroupOfTheQuestions) {
      items = items.filter((q) =>
        (q.idGroupsOfTheQuestions || []).includes(filter.idGroupOfTheQuestions)
      );
    }
    if (filter.oneShot != null) {
      items = items.filter((q) => q.oneShot === filter.oneShot);
    }
    if (filter.startPeriodDate) {
      items = items.filter((q) => q.createDate >= filter.startPeriodDate);
    }
    if (filter.endPeriodDate) {
      items = items.filter((q) => q.createDate <= filter.endPeriodDate);
    }
    const sliced = paginate(items, offset, limit).map((q) => store.questionOut(q));
    return ok(
      {
        ListOfTheQuestion: sliced,
        Pagination: {
          amountOfRecordsAtAll: items.length
        }
      },
      'Ok'
    );
  });

  fastify.post('/api/v2/question', async (request, reply) => {
    const user = optionalUser(request, store);
    const body = request.body || {};
    const question = store.defaults.hydrateQuestion(
      { type: body.questionType || 'TEST', createByUserId: user && user.id },
      {
        defaultAuthorId: user && user.id,
        defaultMentorGroupId: store.mentorGroups[0] && store.mentorGroups[0].mentorsGroupId
      }
    );
    question.status = 'NEW';
    store.questions.push(question);
    logQuestion(store, question, 'created');
    return ok(store.questionOut(question));
  });

  fastify.put('/api/v2/question/verification/:questionId', async (request, reply) => {
    const question = store.questions.find((q) => q.id === request.params.questionId);
    if (!question) return fail(reply, 404, 'Question not found');
    applyQuestionUpdate(question, request.body || {}, ['question', 'mentorsGroupId']);
    question.type = 'VERIFICATION';
    logQuestion(store, question, 'verification updated');
    return ok(store.questionOut(question));
  });

  fastify.put('/api/v2/question/test/:questionId', async (request, reply) => {
    const question = store.questions.find((q) => q.id === request.params.questionId);
    if (!question) return fail(reply, 404, 'Question not found');
    applyQuestionUpdate(question, request.body || {}, ['question', 'answers', 'correct_answers']);
    question.type = 'TEST';
    logQuestion(store, question, 'test updated');
    return ok(store.questionOut(question));
  });

  fastify.put('/api/v2/question/status/:questionId', async (request, reply) => {
    const question = store.questions.find((q) => q.id === request.params.questionId);
    if (!question) return fail(reply, 404, 'Question not found');
    const { status } = request.body || {};
    if (!status) return fail(reply, 400, 'status is required');
    question.status = status;
    return ok({ id: question.id, status: question.status });
  });

  fastify.put('/api/v2/question/sentence_with_gaps/:id', async (request, reply) => {
    const question = store.questions.find((q) => q.id === request.params.id);
    if (!question) return fail(reply, 404, 'Question not found');
    applyQuestionUpdate(question, request.body || {}, ['question', 'sentenceFull', 'options']);
    question.type = 'SENTENCE_WITH_GAPS';
    logQuestion(store, question, 'sentence_with_gaps updated');
    return ok([store.questionOut(question)]);
  });

  fastify.put('/api/v2/question/reject/:questionId', async (request, reply) => {
    const question = store.questions.find((q) => q.id === request.params.questionId);
    if (!question) return fail(reply, 404, 'Question not found');
    const { comment } = request.body || {};
    question.status = 'REJECT';
    logQuestion(store, question, comment || 'rejected');
    return ok(store.questionOut(question));
  });

  fastify.put('/api/v2/question/pairs/:id', async (request, reply) => {
    const question = store.questions.find((q) => q.id === request.params.id);
    if (!question) return fail(reply, 404, 'Question not found');
    applyQuestionUpdate(question, request.body || {}, [
      'question',
      'english_words',
      'russian_words',
      'correct_answers'
    ]);
    question.type = 'PAIRS';
    logQuestion(store, question, 'pairs updated');
    return ok([store.questionOut(question)]);
  });

  fastify.get('/api/v2/question/authors', async () => {
    const ids = [...new Set(store.questions.map((q) => q.createByUserId).filter(Boolean))];
    return ok(ids.map((id) => store.userOut(store.findUser(id))).filter(Boolean));
  });

  fastify.get('/api/v2/question/logs/:questionId', async (request, reply) => {
    const question = store.questions.find((q) => q.id === request.params.questionId);
    if (!question) return fail(reply, 404, 'Question not found');
    return ok({ questionLog: store.questionLogs[question.id] || {} });
  });

  fastify.get('/api/v2/question/:questionId', async (request, reply) => {
    const question = store.questions.find((q) => q.id === request.params.questionId);
    if (!question) return fail(reply, 404, 'Question not found');
    return ok(store.questionOut(question));
  });

  fastify.delete('/api/v2/question/:questionId', async (request, reply) => {
    const index = store.questions.findIndex((q) => q.id === request.params.questionId);
    if (index < 0) return fail(reply, 404, 'Question not found');
    const [removed] = store.questions.splice(index, 1);
    return ok(store.questionOut(removed));
  });

  fastify.put('/api/v2/progress/:nodeId', async (request, reply) => {
    const user = optionalUser(request, store);
    if (!user) return fail(reply, 401, 'Unauthorized');
    const found = store.findNodeAny(request.params.nodeId);
    if (!found) return fail(reply, 404, 'Node not found');
    const progress = store.progressOf(user.id);
    let entry = progress.find((p) => p.nodeId === found.node.id);
    const question = store.pickQuestionForNode(found.node);
    if (!entry) {
      entry = {
        nodeId: found.node.id,
        questionStatus: 'NOT_ANSWERED',
        currentQuestionId: question ? question.id : null,
        isOpen: true
      };
      progress.push(entry);
    } else {
      entry.isOpen = true;
      if (!entry.currentQuestionId && question) entry.currentQuestionId = question.id;
    }
    const costs = store.costs.filter((c) => c.nodeId === found.node.id);
    if (found.node.isCost && costs.length) {
      const upd = {};
      for (const cost of costs) upd[String(cost.currencyId)] = -Number(cost.value);
      store.addBalance(user.id, upd, `open-node:${found.node.id}`);
    }
    return ok(progressOut(store, user.id));
  });

  fastify.get('/api/v2/progress', async (request) => {
    const user = optionalUser(request, store);
    return ok(progressOut(store, user.id));
  });

  fastify.get('/api/v2/progress/universal/:rootNodeId', async (request) => {
    const user = optionalUser(request, store);
    return ok(progressOut(store, user.id, request.params.rootNodeId));
  });

  fastify.get('/api/v2/progress/:playerId', async (request) => {
    return ok(progressOut(store, request.params.playerId));
  });

  fastify.delete('/api/v2/progress/:playerId', async (request) => {
    store.progressOf(request.params.playerId).splice(0);
    return ok({ reset: true });
  });

  fastify.get('/api/v2/node/dev/root', async () => {
    return ok(store.roots('dev').map((n) => store.nodeOut('dev', n)));
  });

  fastify.get('/api/v2/node/dev/nodes/:rootNodeId', async (request) => {
    return ok(store.descendants('dev', request.params.rootNodeId).map((n) => store.nodeOut('dev', n)));
  });

  fastify.get('/api/v2/node/dev/:nodeId', async (request, reply) => {
    const node = store.findNode('dev', request.params.nodeId);
    if (!node) return fail(reply, 404, 'Node not found');
    return ok(store.nodeOut('dev', node));
  });

  fastify.put('/api/v2/node/dev/positioning/:nodeId', async (request, reply) => {
    const node = store.findNode('dev', request.params.nodeId);
    if (!node) return fail(reply, 404, 'Node not found');
    const { x, y } = request.body || {};
    if (x != null) node.x = x;
    if (y != null) node.y = y;
    node.changeDate = new Date().toISOString();
    return ok(store.nodeOut('dev', node));
  });

  fastify.put('/api/v2/node/dev/:nodeId', async (request, reply) => {
    const node = store.findNode('dev', request.params.nodeId);
    if (!node) return fail(reply, 404, 'Node not found');
    const body = request.body || {};
    const fields = [
      'nodeName',
      'groupOfTheQuestionId',
      'nodeStatus',
      'nodeType',
      'x',
      'y',
      'isCost',
      'isPaid'
    ];
    for (const field of fields) {
      if (body[field] !== undefined) node[field] = body[field];
    }
    if (body.masterNodeId !== undefined) node.masterNodeId = store.normalizeMaster(body.masterNodeId);
    node.changeDate = new Date().toISOString();
    return ok(store.nodeOut('dev', node));
  });

  fastify.delete('/api/v2/node/dev/:nodeId', async (request, reply) => {
    const nodes = store.nodesByBranch.dev;
    const index = nodes.findIndex((n) => n.id === request.params.nodeId);
    if (index < 0) return fail(reply, 404, 'Node not found');
    const removed = nodes.splice(index, 1)[0];
    return ok(removed.id);
  });

  fastify.post('/api/v2/node/dev', async (request, reply) => {
    const body = request.body || {};
    if (!body.nodeName) return fail(reply, 400, 'nodeName is required');
    const node = store.defaults.hydrateNode(body);
    store.nodesByBranch.dev.push(node);
    return ok(store.nodeOut('dev', node));
  });

  fastify.get('/api/v2/node/ingame/root', async () => {
    return ok(store.roots('ingame').map((n) => store.nodeOut('ingame', n)));
  });

  fastify.get('/api/v2/node/ingame/tree/:rootNodeId', async (request) => {
    return ok(store.treeByLevel('ingame', request.params.rootNodeId));
  });

  fastify.get('/api/v2/node/ingame/nodes/:rootNodeId', async (request) => {
    return ok(
      store.descendants('ingame', request.params.rootNodeId).map((n) => store.nodeOut('ingame', n))
    );
  });

  fastify.get('/api/v2/node/ingame/:nodeId', async (request, reply) => {
    const node = store.findNode('ingame', request.params.nodeId);
    if (!node) return fail(reply, 404, 'Node not found');
    return ok(store.nodeOut('ingame', node));
  });

  fastify.get('/api/v2/node/archive/root', async () => {
    return ok(store.roots('archive').map((n) => store.nodeOut('archive', n)));
  });

  fastify.get('/api/v2/node/archive/nodes/:rootNodeId', async (request) => {
    return ok(
      store.descendants('archive', request.params.rootNodeId).map((n) => store.nodeOut('archive', n))
    );
  });

  fastify.get('/api/v2/node/archive/:nodeId', async (request, reply) => {
    const node = store.findNode('archive', request.params.nodeId);
    if (!node) return fail(reply, 404, 'Node not found');
    return ok(store.nodeOut('archive', node));
  });

  fastify.put('/api/v2/helper/graph', async (request, reply) => {
    const { type = 'dev', rootNodeId } = request.query || {};
    const branch = type === 'ingame' ? 'ingame' : type === 'archive' ? 'archive' : 'dev';
    const root = rootNodeId || (store.roots(branch)[0] && store.roots(branch)[0].id);
    if (!root) return fail(reply, 404, 'Root node not found');
    store.layoutGraph(branch, root);
    return ok({ layout: true, rootNodeId: root, branch });
  });

  fastify.put('/api/v2/group-of-question/delete-question', async (request, reply) => {
    const { groupId, questionId } = request.body || {};
    const group = store.groupById(groupId);
    if (!group) return fail(reply, 404, 'Group not found');
    group.questionsId = store.questionsForGroup(groupId).filter((id) => id !== questionId);
    const question = store.questions.find((q) => q.id === questionId);
    if (question) {
      question.idGroupsOfTheQuestions = (question.idGroupsOfTheQuestions || []).filter(
        (id) => id !== groupId
      );
    }
    return ok(store.groupOut(group));
  });

  fastify.put('/api/v2/group-of-question/change-name', async (request, reply) => {
    const { groupId, groupName } = request.body || {};
    const group = store.groupById(groupId);
    if (!group) return fail(reply, 404, 'Group not found');
    group.groupName = groupName;
    return ok(store.groupOut(group));
  });

  fastify.put('/api/v2/group-of-question/add-question', async (request, reply) => {
    const { groupId, questionId } = request.body || {};
    const group = store.groupById(groupId);
    if (!group) return fail(reply, 404, 'Group not found');
    if (!group.questionsId.includes(questionId)) group.questionsId.push(questionId);
    const question = store.questions.find((q) => q.id === questionId);
    if (question && !(question.idGroupsOfTheQuestions || []).includes(groupId)) {
      question.idGroupsOfTheQuestions = [...(question.idGroupsOfTheQuestions || []), groupId];
    }
    return ok(store.groupOut(group));
  });

  fastify.get('/api/v2/group-of-question', async () => {
    return ok(store.questionGroups.map((g) => store.groupOut(g)));
  });

  fastify.post('/api/v2/group-of-question', async (request, reply) => {
    const body = request.body || {};
    if (!body.groupName) return fail(reply, 400, 'groupName is required');
    const group = store.defaults.hydrateQuestionGroup(body);
    store.questionGroups.push(group);
    return ok(store.groupOut(group));
  });

  fastify.get('/api/v2/group-of-question/:groupId', async (request, reply) => {
    const group = store.groupById(request.params.groupId);
    if (!group) return fail(reply, 404, 'Group not found');
    return ok(store.groupOut(group));
  });

  fastify.delete('/api/v2/group-of-question/:groupId', async (request, reply) => {
    const index = store.questionGroups.findIndex((g) => g.groupId === request.params.groupId);
    if (index < 0) return fail(reply, 404, 'Group not found');
    const [removed] = store.questionGroups.splice(index, 1);
    return ok(removed.groupId);
  });

  fastify.get('/api/v2/group-of-mentors', async () => ok(store.mentorGroups));

  fastify.post('/api/v2/group-of-mentors', async (request, reply) => {
    const body = request.body || {};
    if (!body.mentorsGroupName) return fail(reply, 400, 'mentorsGroupName is required');
    const group = store.defaults.hydrateMentorGroup(body);
    store.mentorGroups.push(group);
    return ok(group);
  });

  fastify.get('/api/v2/group-of-mentors/:mentorsGroupId', async (request, reply) => {
    const group = store.mentorGroups.find((g) => g.mentorsGroupId === request.params.mentorsGroupId);
    if (!group) return fail(reply, 404, 'Mentor group not found');
    return ok(group);
  });

  fastify.put('/api/v2/group-of-mentors/:mentorsGroupId', async (request, reply) => {
    const group = store.mentorGroups.find((g) => g.mentorsGroupId === request.params.mentorsGroupId);
    if (!group) return fail(reply, 404, 'Mentor group not found');
    const body = request.body || {};
    if (body.mentorsGroupName != null) group.mentorsGroupName = body.mentorsGroupName;
    if (body.mentorsId != null) group.mentorsId = body.mentorsId;
    return ok(group);
  });

  fastify.delete('/api/v2/group-of-mentors/:mentorsGroupId', async (request, reply) => {
    const index = store.mentorGroups.findIndex(
      (g) => g.mentorsGroupId === request.params.mentorsGroupId
    );
    if (index < 0) return fail(reply, 404, 'Mentor group not found');
    store.mentorGroups.splice(index, 1);
    return ok({ deleted: true });
  });

  fastify.put('/api/v2/brunch/ingame', async (request, reply) => {
    const { rootNodeId, isDestinationToRemoveToArchiveBrunch } = request.body || {};
    if (!rootNodeId) return fail(reply, 400, 'rootNodeId is required');
    store.copyBranch('dev', 'ingame', rootNodeId, Boolean(isDestinationToRemoveToArchiveBrunch));
    return ok({ copied: true, to: 'ingame', rootNodeId });
  });

  fastify.put('/api/v2/brunch/dev', async (request, reply) => {
    const { rootNodeId, sourceBrunch } = request.body || {};
    if (!rootNodeId) return fail(reply, 400, 'rootNodeId is required');
    const source = sourceBrunch === 'archive' ? 'archive' : 'ingame';
    store.copyBranch(source, 'dev', rootNodeId, false);
    return ok({ copied: true, to: 'dev', from: source, rootNodeId });
  });

  fastify.put('/api/v2/answer/mentor', async (request, reply) => {
    const user = optionalUser(request, store);
    const { playerId, nodeId } = request.body || {};
    const answer = store.answers.find(
      (a) => a.playerId === playerId && a.nodeId === nodeId && a.answerStatus === 'NEW'
    );
    if (!answer) return fail(reply, 404, 'Answer not found');
    answer.answerStatus = 'REVIEW';
    answer.mentorId = user && user.id;
    return ok({ taken: true });
  });

  fastify.post('/api/v2/file', async (request) => {
    const body = request.body || {};
    const file = store.defaults.hydrateFile(
      {
        fileId: store.nextFileId(),
        fileName: body.fileName || `answer-${Date.now()}.bin`,
        nodeId: body.nodeId,
        playerId: body.playerId,
        kind: 'answer'
      },
      0
    );
    store.files.push(file);
    return ok({ fileId: file.fileId, fileName: file.fileName });
  });

  fastify.post('/api/v2/file/list', async (request) => {
    const { nodeId, playerId } = request.body || {};
    const list = store.files.filter(
      (f) => (!nodeId || f.nodeId === nodeId) && (!playerId || f.playerId === playerId)
    );
    return ok({
      fileDTOList: list.map((f) => ({ fileId: f.fileId, fileName: f.fileName }))
    });
  });

  fastify.post('/api/v2/file/body', async (request) => {
    const body = request.body || {};
    const fileType = body.fileType === 'MP3' ? 'MP3' : 'JPG';
    const file = store.defaults.hydrateFile(
      {
        fileId: store.nextFileId(),
        fileName: body.fileName || `question-body-${Date.now()}`,
        questionId: body.questionId,
        kind: 'question-body',
        fileType,
        mimeType: fileType === 'MP3' ? 'audio/mpeg' : 'image/jpeg',
        contentBase64: body.contentBase64 || body.content || ''
      },
      0
    );
    // один файл на тип в теле вопроса
    store.files = store.files.filter(
      (f) => !(f.questionId === file.questionId && f.kind === 'question-body' && f.fileType === fileType)
    );
    store.files.push(file);
    return ok(String(file.fileId));
  });

  fastify.post('/api/v2/file/answers', async (request) => {
    const body = request.body || {};
    const file = store.defaults.hydrateFile(
      {
        fileId: store.nextFileId(),
        fileName: body.fileName || `answer-option-${Date.now()}`,
        questionId: body.questionId,
        answerNumber: body.answerNumber,
        kind: 'question-answer',
        fileType: 'JPG',
        mimeType: 'image/jpeg',
        contentBase64: body.contentBase64 || body.content || ''
      },
      0
    );
    store.files = store.files.filter(
      (f) =>
        !(
          f.questionId === file.questionId &&
          f.kind === 'question-answer' &&
          Number(f.answerNumber) === Number(file.answerNumber)
        )
    );
    store.files.push(file);
    return ok(String(file.fileId));
  });

  fastify.get('/api/v2/file/files/:questionId', async (request) => {
    const questionId = request.params.questionId;
    const list = store.files.filter((f) => f.questionId === questionId);
    const mediaForBodyQuestion = {};
    const jpgsForAnswersQuestion = {};

    for (const file of list) {
      const payload = file.contentBase64 || '';
      if (file.kind === 'question-body') {
        const type = file.fileType === 'MP3' ? 'MP3' : 'JPG';
        mediaForBodyQuestion[type] = payload;
      } else if (file.kind === 'question-answer' && file.answerNumber != null) {
        jpgsForAnswersQuestion[String(file.answerNumber)] = payload;
      }
    }

    // оба поля обязательны — иначе фронт падает на mediaForBodyQuestion
    return ok({ mediaForBodyQuestion, jpgsForAnswersQuestion });
  });

  fastify.get('/api/v2/file/:fileId', async (request, reply) => {
    const file = store.files.find((f) => String(f.fileId) === String(request.params.fileId));
    if (!file) return fail(reply, 404, 'File not found');
    reply.header('Content-Disposition', `inline; filename="${file.fileName}"`);
    const buf = file.contentBase64
      ? Buffer.from(file.contentBase64, 'base64')
      : Buffer.from(file.fileName);
    return reply.type(file.mimeType || 'application/octet-stream').send(buf);
  });

  fastify.delete('/api/v2/file/:fileId', async (request, reply) => {
    const index = store.files.findIndex((f) => String(f.fileId) === String(request.params.fileId));
    if (index < 0) return fail(reply, 404, 'File not found');
    const [removed] = store.files.splice(index, 1);
    return ok(String(removed.fileId));
  });

  function markProgress(playerId, nodeId, status) {
    return store.markProgress(playerId, nodeId, status);
  }

  function grantRewards(playerId, nodeId) {
    const rewards = store.rewards.filter((r) => r.nodeId === nodeId);
    if (!rewards.length) return;
    const upd = {};
    for (const reward of rewards) upd[String(reward.currencyId)] = Number(reward.value);
    store.addBalance(playerId, upd, `reward:${nodeId}`);
    const xp = store.ensurePlayerExperience(playerId);
    const expNode = store.experienceNodes[0];
    if (expNode) {
      xp[expNode.experienceId] = Number(xp[expNode.experienceId] || 0) + 10;
    }
  }

  fastify.post('/api/v2/answer/verification/send', async (request, reply) => {
    const user = optionalUser(request, store);
    const { nodeId, answer } = request.body || {};
    if (!nodeId || answer == null) return fail(reply, 400, 'nodeId and answer are required');
    const record = {
      playerId: user.id,
      nodeId,
      answer,
      answerStatus: 'NEW',
      mentorId: null,
      mentorsComment: null
    };
    store.answers.push(record);
    markProgress(user.id, nodeId, 'WAITING');
    return ok(record);
  });

  fastify.post('/api/v2/answer/verification/check', async (request, reply) => {
    const user = optionalUser(request, store);
    const { playerId, nodeId, answerStatus, mentorsComment } = request.body || {};
    const answer = store.answers.find((a) => a.playerId === playerId && a.nodeId === nodeId);
    if (!answer) return fail(reply, 404, 'Answer not found');
    answer.answerStatus = answerStatus;
    answer.mentorsComment = mentorsComment;
    answer.mentorId = user && user.id;
    const passed = answerStatus === 'APPROVED';
    markProgress(playerId, nodeId, passed ? 'ANSWERED' : 'NOT_ANSWERED');
    if (passed) grantRewards(playerId, nodeId);
    return ok(progressOut(store, playerId));
  });

  fastify.post('/api/v2/answer/test/send', async (request, reply) => {
    const user = optionalUser(request, store);
    const { nodeId, answers } = request.body || {};
    const found = store.findNodeAny(nodeId);
    if (!found) return fail(reply, 404, 'Node not found');
    const question = store.pickQuestionForNode(found.node);
    const correct = question && question.quiz ? question.quiz.correct_answers : [];
    const passed = arraysEqual(answers || [], correct);
    markProgress(user.id, nodeId, passed ? 'ANSWERED' : 'NOT_ANSWERED');
    if (passed) grantRewards(user.id, nodeId);
    return ok(progressOut(store, user.id));
  });

  fastify.post('/api/v2/answer/sentence_with_gaps/send', async (request, reply) => {
    const user = optionalUser(request, store);
    const { nodeId, answers } = request.body || {};
    const found = store.findNodeAny(nodeId);
    if (!found) return fail(reply, 404, 'Node not found');
    const question = store.pickQuestionForNode(found.node);
    const expected = question && question.quiz ? question.quiz.options : [];
    const passed = arraysEqual(
      (answers || []).map((v) => String(v).trim().toLowerCase()),
      expected.map((v) => String(v).trim().toLowerCase())
    );
    markProgress(user.id, nodeId, passed ? 'ANSWERED' : 'NOT_ANSWERED');
    if (passed) grantRewards(user.id, nodeId);
    return ok(progressOut(store, user.id));
  });

  fastify.post('/api/v2/answer/pairs/send', async (request, reply) => {
    const user = optionalUser(request, store);
    const { nodeId, answers } = request.body || {};
    const found = store.findNodeAny(nodeId);
    if (!found) return fail(reply, 404, 'Node not found');
    const question = store.pickQuestionForNode(found.node);
    const expected = question && question.quiz ? question.quiz.correct_answers : [];
    const passed = arraysEqual(answers || [], expected);
    markProgress(user.id, nodeId, passed ? 'ANSWERED' : 'NOT_ANSWERED');
    if (passed) grantRewards(user.id, nodeId);
    return ok(progressOut(store, user.id));
  });

  fastify.get('/api/v2/answer/verification/status', async (request) => {
    const user = optionalUser(request, store);
    const { nodeId } = request.query || {};
    const answer = store.answers.find((a) => a.playerId === user.id && a.nodeId === nodeId);
    return ok({
      nodeId,
      answerStatus: answer ? answer.answerStatus : 'NEW',
      mentorsComment: answer ? answer.mentorsComment : null
    });
  });

  fastify.get('/api/v2/answer/review', async (request) => {
    const user = optionalUser(request, store);
    return ok(store.answers.filter((a) => a.answerStatus === 'REVIEW' && a.mentorId === user.id));
  });

  fastify.get('/api/v2/answer/new', async () => {
    return ok(store.answers.filter((a) => a.answerStatus === 'NEW'));
  });
}

module.exports = gameRoutes;
