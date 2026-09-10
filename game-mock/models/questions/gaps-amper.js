'use strict';

/**
 * Вопрос SENTENCE_WITH_GAPS.
 * Существенное: quiz.question, quiz.sentenceFull, quiz.options
 */
const ids = require('../ids');

module.exports = {
  id: ids.qTest,
  questionName: 'Простая фраза: пропуски',
  questionDescription: 'Вставьте слово *амперах*',
  type: 'SENTENCE_WITH_GAPS',
  category: ['CATEGORY_2'],
  status: 'APPROVED',
  idGroupsOfTheQuestions: [ids.groupTest],
  quiz: {
    question: 'Заполните пропуски в предложении',
    sentenceFull: 'не в амперах ли измеряется сила тока?',
    options: ['амперах']
  }
};

