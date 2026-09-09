'use strict';

/**
 * Прогресс игрока.
 * Существенное: playerId, nodeId, questionStatus, currentQuestionId, isOpen
 * По умолчанию: questionStatus=NOT_ANSWERED, isOpen=true
 *
 * questionStatus: NOT_ANSWERED | WAITING | ANSWERED
 */
const ids = require('../ids');

module.exports = [
  {
    playerId: ids.userPlayer,
    nodeId: ids.universeEnglish,
    questionStatus: 'ANSWERED',
    isOpen: true
  },
  {
    playerId: ids.userPlayer,
    nodeId: ids.nodeArticles,
    questionStatus: 'ANSWERED',
    currentQuestionId: ids.qArticlesTest,
    isOpen: true
  },
  {
    playerId: ids.userPlayer,
    nodeId: ids.nodeTenses,
    questionStatus: 'NOT_ANSWERED',
    currentQuestionId: ids.qTensesGaps,
    isOpen: true
  },
  {
    playerId: ids.userPlayer,
    nodeId: ids.nodeWriting,
    questionStatus: 'WAITING',
    currentQuestionId: ids.qEssay,
    isOpen: true
  }
];
