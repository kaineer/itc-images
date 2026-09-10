'use strict';

/**
 * Вводный вопрос корневой ноды вселенной.
 */
const ids = require('../ids');

module.exports = {
  id: ids.qIntro,
  questionName: 'Добро пожаловать',
  questionDescription: 'Вводный вопрос вселенной English Basics',
  type: 'TEST',
  category: ['CATEGORY_1'],
  status: 'APPROVED',
  idGroupsOfTheQuestions: [ids.groupIntro],
  quiz: {
    question: 'Ready to start English Basics?',
    answers: ['Yes', 'Later'],
    correct_answers: [0]
  }
};
