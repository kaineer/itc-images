// server.js
const Fastify = require('fastify');

const server = Fastify({
  logger: true
});

// ============================================================
// MOCK DATA
// ============================================================

const MOCK_LOCATIONS = [
  { id: 'crossroad', name: 'Перекрёсток' },
  { id: 'field', name: 'Поле' },
  { id: 'snt', name: 'СНТ' },
  { id: 'stadium', name: 'Стадион' }
];

const MOCK_EVIDENCE = [
  { code: 'knife', title: 'Нож', category: 'Холодное оружие', evidence: true, attributes: { type: 'нож' } },
  { code: 'pistol', title: 'Пистолет', category: 'Огнестрельное оружие', evidence: true, attributes: { type: 'пистолет' } },
  { code: 'casing', title: 'Гильза', category: 'Боеприпасы', evidence: true, attributes: { type: 'гильза' } },
  { code: 'blood', title: 'Следы крови', category: 'Биологические следы', evidence: true, attributes: { type: 'кровь' } },
  { code: 'phone', title: 'Мобильный телефон', category: 'Электроника', evidence: true, attributes: { type: 'телефон' } },
  { code: 'drugs', title: 'Наркотические вещества', category: 'Вещества', evidence: true, attributes: { type: 'наркотики' } }
];

const MOCK_WRAPPINGS = [
  { code: 'bag', title: 'Полиэтиленовый пакет' },
  { code: 'box', title: 'Картонная коробка' },
  { code: 'film', title: 'Плёнка' },
  { code: 'envelope', title: 'Конверт' }
];

const MOCK_WORKPLACES = {
  '1': 'crossroad',
  '2': 'field',
  '3': 'snt',
  '4': 'stadium'
};

const MOCK_TICKETS = {
  'crossroad': {
    orderNo: '123/2024',
    theme: 'Осмотр места происшествия',
    circumstances: 'На перекрёстке обнаружен труп',
    task: 'Провести осмотр, изъять вещественные доказательства',
    timeLimit: 60
  },
  'field': {
    orderNo: '124/2024',
    theme: 'Осмотр поля',
    circumstances: 'Обнаружены следы преступления',
    task: 'Зафиксировать обстановку, изъять улики',
    timeLimit: 45
  },
  'snt': {
    orderNo: '125/2024',
    theme: 'Осмотр СНТ',
    circumstances: 'Кража из дачного дома',
    task: 'Осмотреть место, изъять следы',
    timeLimit: 50
  },
  'stadium': {
    orderNo: '126/2024',
    theme: 'Осмотр стадиона',
    circumstances: 'Обнаружены следы драки',
    task: 'Зафиксировать обстановку, изъять улики',
    timeLimit: 55
  }
};

// ============================================================
// HELPERS
// ============================================================

function generateId() {
  return 'attempt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

function generateToken() {
  return 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
}

function mockScene(locationId) {
  const variants = ['variant_1', 'variant_2', 'variant_3'];
  return {
    locationId: locationId || 'crossroad',
    pointId: 'point-1',
    availableVariantIds: variants,
    setBy: 'instructor@example.com',
    setAt: new Date().toISOString()
  };
}

// ============================================================
// AUTHENTICATION
// ============================================================

let currentSession = null;

// /session/login
server.post('/session/login', async (request, reply) => {
  const { name, group, role = 'student', workplace = 1 } = request.body;

  if (!name || !group) {
    return reply.code(400).send({ detail: 'name and group are required' });
  }

  const user = {
    name,
    group,
    role,
    workplace,
    uuid: 'user_' + Date.now()
  };

  const token = generateToken();
  currentSession = { token, user };

  return {
    token,
    user
  };
});

// /session/me
server.get('/session/me', async (request, reply) => {
  const auth = request.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return reply.code(401).send({ detail: 'Missing or invalid authorization header' });
  }

  if (!currentSession) {
    return reply.code(401).send({ detail: 'No active session' });
  }

  return currentSession.user;
});

// /session/update
server.post('/session/update', async (request, reply) => {
  const auth = request.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return reply.code(401).send({ detail: 'Missing or invalid authorization header' });
  }

  if (!currentSession) {
    return reply.code(401).send({ detail: 'No active session' });
  }

  const userData = request.body;
  currentSession.user = { ...currentSession.user, ...userData };
  return currentSession.user;
});

// ============================================================
// CATALOG
// ============================================================

// /catalog/locations
server.get('/catalog/locations', async (request, reply) => {
  return MOCK_LOCATIONS;
});

// /catalog/evidence
server.get('/catalog/evidence', async (request, reply) => {
  return MOCK_EVIDENCE;
});

// /catalog/wrappings
server.get('/catalog/wrappings', async (request, reply) => {
  return MOCK_WRAPPINGS;
});

// /catalog/workplaces
server.get('/catalog/workplaces', async (request, reply) => {
  return MOCK_WORKPLACES;
});

// ============================================================
// EXAM
// ============================================================

let attemptsStore = {};

// /exam/attempts
server.post('/exam/attempts', async (request, reply) => {
  const auth = request.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return reply.code(401).send({ detail: 'Missing or invalid authorization header' });
  }

  if (!currentSession) {
    return reply.code(401).send({ detail: 'No active session' });
  }

  // Determine location based on workplace
  const workplace = currentSession.user.workplace || 1;
  const locationId = MOCK_WORKPLACES[workplace] || 'crossroad';
  const ticket = MOCK_TICKETS[locationId] || MOCK_TICKETS['crossroad'];

  const attemptId = generateId();
  const attempt = {
    attemptId,
    status: 'in_progress',
    locationId,
    ticket: { ...ticket, medicalReport: '', victimReport: '' },
    startedAt: new Date().toISOString(),
    timeLimit: ticket.timeLimit || 60,
    deadline: new Date(Date.now() + (ticket.timeLimit || 60) * 60000).toISOString()
  };

  attemptsStore[attemptId] = attempt;
  return attempt;
});

// /exam/attempts/{attempt_id}
server.get('/exam/attempts/:attempt_id', async (request, reply) => {
  const { attempt_id } = request.params;
  const auth = request.headers.authorization;

  if (!auth || !auth.startsWith('Bearer ')) {
    return reply.code(401).send({ detail: 'Missing or invalid authorization header' });
  }

  const attempt = attemptsStore[attempt_id];
  if (!attempt) {
    return reply.code(404).send({ detail: 'Attempt not found' });
  }

  return attempt;
});

// /exam/attempts/{attempt_id}/submit
server.post('/exam/attempts/:attempt_id/submit', async (request, reply) => {
  const { attempt_id } = request.params;
  const auth = request.headers.authorization;

  if (!auth || !auth.startsWith('Bearer ')) {
    return reply.code(401).send({ detail: 'Missing or invalid authorization header' });
  }

  const attempt = attemptsStore[attempt_id];
  if (!attempt) {
    return reply.code(404).send({ detail: 'Attempt not found' });
  }

  const { items = [], details = null, finishedAt = null } = request.body;

  // Generate mock result
  const result = {
    attemptId: attempt_id,
    status: 'submitted',
    score: 0.85,
    maxScore: 0,
    correctObjects: 5,
    maxObjects: 7,
    passed: true,
    criticalViolation: false,
    completeness: {
      score: 0.8,
      items: [
        { labelCode: 'knife', verdict: 'found', russian: 'Нож' },
        { labelCode: 'pistol', verdict: 'found', russian: 'Пистолет' },
        { labelCode: 'blood', verdict: 'not_found', russian: 'Следы крови' }
      ],
      summary: { total: 7, found: 5, missing: 2 }
    },
    marks: {
      score: 0.85,
      criticalViolation: false,
      grade: [
        { labelCode: 'knife', verdict: 'correct', russian: 'Нож' },
        { labelCode: 'pistol', verdict: 'correct', russian: 'Пистолет' },
        { labelCode: 'blood', verdict: 'missing', russian: 'Следы крови' }
      ],
      summary: { correct: 5, incorrect: 0, missing: 2 }
    },
    descriptionReview: null,
    protocol: {
      items: items.map(item => ({ ...item, capturedAt: new Date().toISOString() })),
      details: details || { techMedium: null, conditions: null, conclusion: null }
    },
    reviewedBy: null,
    reviewedAt: null,
    instructorComment: null
  };

  // Store result with attempt
  attempt.status = 'submitted';
  attempt.result = result;

  return result;
});

// /exam/attempts/{attempt_id}/result
server.get('/exam/attempts/:attempt_id/result', async (request, reply) => {
  const { attempt_id } = request.params;
  const auth = request.headers.authorization;

  if (!auth || !auth.startsWith('Bearer ')) {
    return reply.code(401).send({ detail: 'Missing or invalid authorization header' });
  }

  const attempt = attemptsStore[attempt_id];
  if (!attempt || !attempt.result) {
    return reply.code(404).send({ detail: 'Result not found' });
  }

  return attempt.result;
});

// /exam/attempts/{attempt_id}/protocol
server.get('/exam/attempts/:attempt_id/protocol', async (request, reply) => {
  const { attempt_id } = request.params;
  const { fmt = 'json' } = request.query;
  const auth = request.headers.authorization;

  if (!auth || !auth.startsWith('Bearer ')) {
    return reply.code(401).send({ detail: 'Missing or invalid authorization header' });
  }

  const attempt = attemptsStore[attempt_id];
  if (!attempt || !attempt.result) {
    return reply.code(404).send({ detail: 'Result not found' });
  }

  if (fmt === 'text') {
    const protocol = attempt.result.protocol;
    let text = '=== ПРОТОКОЛ ОСМОТРА ===\n\n';
    text += `Попытка: ${attempt_id}\n`;
    text += `Локация: ${attempt.locationId}\n`;
    text += `Статус: ${attempt.status}\n\n`;
    text += '--- ИЗЪЯТЫЕ ПРЕДМЕТЫ ---\n';
    if (protocol && protocol.items) {
      protocol.items.forEach((item, idx) => {
        text += `${idx + 1}. ${item.labelCode} (${item.source || 'manual'})\n`;
      });
    }
    if (protocol && protocol.details) {
      text += '\n--- ДЕТАЛИ ---\n';
      text += `Технические средства: ${protocol.details.techMedium || '—'}\n`;
      text += `Условия: ${protocol.details.conditions || '—'}\n`;
      text += `Заключение: ${protocol.details.conclusion || '—'}\n`;
    }
    reply.type('text/plain').send(text);
    return;
  }

  return attempt.result.protocol;
});

// ============================================================
// INSTRUCTOR
// ============================================================

// /instructor/scene (GET)
server.get('/instructor/scene', async (request, reply) => {
  const auth = request.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return reply.code(401).send({ detail: 'Missing or invalid authorization header' });
  }

  if (!currentSession || currentSession.user.role !== 'instructor') {
    return reply.code(403).send({ detail: 'Instructor role required' });
  }

  return mockScene('crossroad');
});

// /instructor/scene (PUT)
server.put('/instructor/scene', async (request, reply) => {
  const auth = request.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return reply.code(401).send({ detail: 'Missing or invalid authorization header' });
  }

  if (!currentSession || currentSession.user.role !== 'instructor') {
    return reply.code(403).send({ detail: 'Instructor role required' });
  }

  const { locationId = 'crossroad', pointId = 'point-1' } = request.body;
  return mockScene(locationId);
});

// /instructor/scene/instances (PUT)
server.put('/instructor/scene/instances', async (request, reply) => {
  const auth = request.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return reply.code(401).send({ detail: 'Missing or invalid authorization header' });
  }

  if (!currentSession || currentSession.user.role !== 'instructor') {
    return reply.code(403).send({ detail: 'Instructor role required' });
  }

  const tags = request.body;
  return { success: true, tagged: tags.length };
});

// /instructor/attempts
server.get('/instructor/attempts', async (request, reply) => {
  const auth = request.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return reply.code(401).send({ detail: 'Missing or invalid authorization header' });
  }

  if (!currentSession || currentSession.user.role !== 'instructor') {
    return reply.code(403).send({ detail: 'Instructor role required' });
  }

  const { group, status } = request.query;
  let attempts = Object.values(attemptsStore);

  if (group) {
    // Mock filtering by group (stored in user data)
    attempts = attempts.filter(a => a.group === group);
  }
  if (status) {
    attempts = attempts.filter(a => a.status === status);
  }

  return attempts.length > 0 ? attempts : [
    {
      attemptId: 'demo_attempt_1',
      status: 'submitted',
      locationId: 'crossroad',
      ticket: MOCK_TICKETS['crossroad'],
      startedAt: new Date().toISOString(),
      timeLimit: 60,
      deadline: new Date(Date.now() + 60000).toISOString()
    }
  ];
});

// /instructor/attempts/{attempt_id}/review
server.post('/instructor/attempts/:attempt_id/review', async (request, reply) => {
  const { attempt_id } = request.params;
  const auth = request.headers.authorization;

  if (!auth || !auth.startsWith('Bearer ')) {
    return reply.code(401).send({ detail: 'Missing or invalid authorization header' });
  }

  if (!currentSession || currentSession.user.role !== 'instructor') {
    return reply.code(403).send({ detail: 'Instructor role required' });
  }

  const { approve = true, scoreOverride = null, itemOverrides = null, comment = null } = request.body;

  const attempt = attemptsStore[attempt_id];
  if (!attempt || !attempt.result) {
    return reply.code(404).send({ detail: 'Result not found' });
  }

  // Update result with review
  const updatedResult = {
    ...attempt.result,
    status: approve ? 'approved' : 'rejected',
    score: scoreOverride !== null ? scoreOverride : attempt.result.score,
    reviewedBy: currentSession.user.name,
    reviewedAt: new Date().toISOString(),
    instructorComment: comment,
    marks: {
      ...attempt.result.marks,
      itemOverrides: itemOverrides || []
    }
  };

  attempt.result = updatedResult;
  attempt.status = 'reviewed';

  return updatedResult;
});

// /instructor/variants
server.get('/instructor/variants', async (request, reply) => {
  const auth = request.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return reply.code(401).send({ detail: 'Missing or invalid authorization header' });
  }

  const { locationId } = request.query;
  const variants = [
    { id: 'variant_1', name: 'Вариант 1', locationId: locationId || 'crossroad' },
    { id: 'variant_2', name: 'Вариант 2', locationId: locationId || 'crossroad' },
    { id: 'variant_3', name: 'Вариант 3', locationId: locationId || 'field' }
  ];

  if (locationId) {
    return variants.filter(v => v.locationId === locationId);
  }
  return variants;
});

// /instructor/variants/{variant_id}/key (GET)
server.get('/instructor/variants/:variant_id/key', async (request, reply) => {
  const { variant_id } = request.params;
  const auth = request.headers.authorization;

  if (!auth || !auth.startsWith('Bearer ')) {
    return reply.code(401).send({ detail: 'Missing or invalid authorization header' });
  }

  return {
    variantId: variant_id,
    mustCollect: ['knife', 'pistol', 'casing'],
    mustNotCollect: ['phone', 'drugs']
  };
});

// /instructor/variants/{variant_id}/key (PUT)
server.put('/instructor/variants/:variant_id/key', async (request, reply) => {
  const { variant_id } = request.params;
  const auth = request.headers.authorization;

  if (!auth || !auth.startsWith('Bearer ')) {
    return reply.code(401).send({ detail: 'Missing or invalid authorization header' });
  }

  if (!currentSession || currentSession.user.role !== 'instructor') {
    return reply.code(403).send({ detail: 'Instructor role required' });
  }

  const { mustCollect, mustNotCollect } = request.body;
  return {
    variantId: variant_id,
    mustCollect: mustCollect || [],
    mustNotCollect: mustNotCollect || [],
    updatedBy: currentSession.user.name,
    updatedAt: new Date().toISOString()
  };
});

// /instructor/stats
server.get('/instructor/stats', async (request, reply) => {
  const auth = request.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return reply.code(401).send({ detail: 'Missing or invalid authorization header' });
  }

  if (!currentSession || currentSession.user.role !== 'instructor') {
    return reply.code(403).send({ detail: 'Instructor role required' });
  }

  const { group } = request.query;
  return {
    total: 42,
    submitted: 30,
    approved: 25,
    rejected: 5,
    averageScore: 0.82,
    group: group || 'all',
    byLocation: {
      crossroad: 18,
      field: 10,
      snt: 8,
      stadium: 6
    }
  };
});

// ============================================================
// START SERVER
// ============================================================

const start = async () => {
  try {
    await server.listen({ port: 3000, host: '0.0.0.0' });
    console.log('🚀 Mock server running on http://localhost:3000');
    console.log('📋 Available endpoints:');
    console.log('  POST /session/login');
    console.log('  GET /session/me');
    console.log('  POST /session/update');
    console.log('  GET /catalog/locations');
    console.log('  GET /catalog/evidence');
    console.log('  GET /catalog/wrappings');
    console.log('  GET /catalog/workplaces');
    console.log('  POST /exam/attempts');
    console.log('  GET /exam/attempts/:id');
    console.log('  POST /exam/attempts/:id/submit');
    console.log('  GET /exam/attempts/:id/result');
    console.log('  GET /exam/attempts/:id/protocol');
    console.log('  GET /instructor/scene');
    console.log('  PUT /instructor/scene');
    console.log('  PUT /instructor/scene/instances');
    console.log('  GET /instructor/attempts');
    console.log('  POST /instructor/attempts/:id/review');
    console.log('  GET /instructor/variants');
    console.log('  GET /instructor/variants/:id/key');
    console.log('  PUT /instructor/variants/:id/key');
    console.log('  GET /instructor/stats');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Add CORS support
server.addHook('onRequest', async (request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') {
    reply.status(200).send();
  }
});

start();
