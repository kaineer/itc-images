'use strict';

/**
 * Вопрос SENTENCE_WITH_GAPS.
 * Существенное: quiz.question, quiz.sentenceFull, quiz.options
 */
const ids = require('../ids');

module.exports = {
  id: ids.qTensesGaps,
  questionName: 'Present Simple: пропуски',
  questionDescription: 'Вставьте нужную форму глагола',
  type: 'SENTENCE_WITH_GAPS',
  category: ['CATEGORY_2'],
  status: 'IN_GAME',
  idGroupsOfTheQuestions: [ids.groupTenses],
  quiz: {
    question: 'Заполните пропуски в предложении',
    sentenceFull: 'She goes to school every day.',
    options: ['goes']
  }
};
