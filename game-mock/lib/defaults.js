'use strict';

const { newId, ZERO_UUID, normalizeMaster } = require('./ids');

const NOW = '2026-09-01T12:00:00.000Z';

const QUIZ_DEFAULTS = {
  TEST: {
    question: '',
    answers: ['Вариант A', 'Вариант B', 'Вариант C', 'Вариант D'],
    correct_answers: [0]
  },
  VERIFICATION: {
    question: '',
    mentorsGroupId: null
  },
  SENTENCE_WITH_GAPS: {
    question: '',
    sentenceFull: '',
    options: []
  },
  PAIRS: {
    question: '',
    english_words: [],
    russian_words: [],
    correct_answers: []
  }
};

function fill(raw, defaults) {
  const out = { ...defaults };
  for (const [key, value] of Object.entries(raw || {})) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

function hydrateUser(raw, ctx) {
  const user = fill(raw, {
    id: newId(),
    userName: 'user',
    email: 'user@mock.local',
    password: 'password',
    roles: ['PLAYER'],
    organizationsId: ctx.defaultOrgId ? [ctx.defaultOrgId] : [],
    enabled: true,
    createdAt: NOW
  });
  if (!raw.email && raw.userName) {
    user.email = `${String(raw.userName).toLowerCase()}@mock.local`;
  }
  return user;
}

function hydrateOrganization(raw) {
  return fill(raw, {
    id: newId(),
    name: 'Organization',
    contact: 'contact@mock.local'
  });
}

function hydrateClient(raw) {
  return fill(raw, {
    clientId: newId(),
    clientSecret: 'mock-secret',
    clientName: 'mock-client',
    clientAuthenticationMethods: ['CLIENT_SECRET_BASIC'],
    authorizationGrantTypes: ['AUTHORIZATION_CODE', 'REFRESH_TOKEN'],
    redirectUris: ['http://localhost:5173/callback'],
    postLogoutRedirectUris: ['http://localhost:5173/']
  });
}

function hydrateQuestion(raw, ctx) {
  const type = raw.type || raw.questionType || 'TEST';
  const quizDefaults = QUIZ_DEFAULTS[type] || QUIZ_DEFAULTS.TEST;
  const question = fill(raw, {
    id: newId(),
    questionName: 'Вопрос',
    questionDescription: '',
    type,
    quiz: {},
    createByUserId: ctx.defaultAuthorId,
    createDate: NOW,
    category: ['CATEGORY_1'],
    status: 'APPROVED',
    idGroupsOfTheQuestions: [],
    oneShot: false
  });
  question.type = type;
  question.quiz = fill(raw.quiz || {}, quizDefaults);
  if (type === 'VERIFICATION' && !question.quiz.mentorsGroupId && ctx.defaultMentorGroupId) {
    question.quiz.mentorsGroupId = ctx.defaultMentorGroupId;
  }
  delete question.questionType;
  return question;
}

function hydrateQuestionGroup(raw) {
  return fill(raw, {
    groupId: raw.id || newId(),
    groupName: 'Группа вопросов',
    questionsId: [],
    linkedNodesId: []
  });
}

function hydrateMentorGroup(raw) {
  return fill(raw, {
    mentorsGroupId: raw.id || newId(),
    mentorsGroupName: 'Группа менторов',
    mentorsId: []
  });
}

function hydrateNode(raw) {
  const node = fill(raw, {
    id: newId(),
    nodeName: 'Нода',
    groupOfTheQuestionId: null,
    masterNodeId: ZERO_UUID,
    nodeStatus: 'ACTIVE',
    nodeType: 'COMMON',
    changeDate: NOW,
    x: 0,
    y: 0,
    isCost: false,
    isPaid: false
  });
  node.masterNodeId = normalizeMaster(node.masterNodeId);
  return node;
}

function hydrateProgress(raw) {
  return fill(raw, {
    playerId: null,
    nodeId: null,
    questionStatus: 'NOT_ANSWERED',
    currentQuestionId: null,
    isOpen: true
  });
}

function hydrateAnswer(raw) {
  return fill(raw, {
    playerId: null,
    nodeId: null,
    answer: '',
    answerStatus: 'NEW',
    mentorId: null,
    mentorsComment: null
  });
}

function hydrateCurrency(raw, index = 0) {
  return fill(raw, {
    currencyId: raw.id || raw.currencyId || index + 1,
    currencyName: 'Монета',
    currencyType: 'GAME'
  });
}

function hydrateCost(raw) {
  return fill(raw, {
    rewardId: raw.id || raw.rewardId || newId(),
    nodeId: null,
    currencyId: 1,
    value: 0
  });
}

function hydrateReward(raw) {
  return fill(raw, {
    rewardId: raw.id || raw.rewardId || newId(),
    nodeId: null,
    currencyId: 1,
    value: 0
  });
}

function hydrateExperienceNode(raw) {
  return fill(raw, {
    experienceId: raw.id || raw.experienceId || newId(),
    parentId: raw.parentId || null,
    experienceName: 'Опыт',
    experienceDescription: '',
    currencyId: 2
  });
}

function hydrateFile(raw, index = 0) {
  return fill(raw, {
    fileId: raw.fileId || index + 1,
    fileName: 'file.bin',
    questionId: null,
    playerId: null,
    nodeId: null,
    kind: 'question-body',
    answerNumber: null,
    mimeType: 'application/octet-stream',
    content: Buffer.from('')
  });
}

function hydrateErrorCode(raw) {
  return fill(raw, {
    code: 0,
    message: 'OK',
    description: ''
  });
}

function hydrateMembership(raw) {
  return fill(raw, {
    organizationId: null,
    nodeIds: []
  });
}

module.exports = {
  NOW,
  hydrateUser,
  hydrateOrganization,
  hydrateClient,
  hydrateQuestion,
  hydrateQuestionGroup,
  hydrateMentorGroup,
  hydrateNode,
  hydrateProgress,
  hydrateAnswer,
  hydrateCurrency,
  hydrateCost,
  hydrateReward,
  hydrateExperienceNode,
  hydrateFile,
  hydrateErrorCode,
  hydrateMembership
};
