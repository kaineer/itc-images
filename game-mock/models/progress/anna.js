'use strict';

/**
 * Прогресс игрока.
 * Существенное: playerId, nodeId, questionStatus, currentQuestionId, isOpen
 * По умолчанию: questionStatus=NOT_ANSWERED, isOpen=true
 *
 * questionStatus: NOT_ANSWERED | WAITING | ANSWERED | FROZEN
 *
 * Когда узел становится ANSWERED, прямые дети в ветке ingame
 * получают NOT_ANSWERED (если у них ещё не было прогресса и статус
 * не FROZEN/ANSWERED). На фронте узел без записи в progress — неактивен.
 */
const ids = require('../ids');

module.exports = [
  {
    playerId: ids.userPlayer,
    nodeId: ids.universeEnglish,
    questionStatus: 'ANSWERED',
    currentQuestionId: ids.qIntro,
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
