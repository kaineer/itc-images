'use strict';

/**
 * Ответ на VERIFICATION.
 * Существенное: playerId, nodeId, answer, answerStatus
 * По умолчанию: mentorId, mentorsComment, answerStatus=NEW
 *
 * answerStatus: NEW | REVIEW | APPROVED | REJECTED
 */
const ids = require('../ids');

module.exports = {
  playerId: ids.userPlayer,
  nodeId: ids.nodeWriting,
  answer: 'I wake up at seven, go to work and study English in the evening.',
  answerStatus: 'NEW'
};
