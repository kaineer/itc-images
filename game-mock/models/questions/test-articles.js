'use strict';

/**
 * Вопрос TEST.
 * Существенное: questionName, questionDescription, type, quiz, category, idGroupsOfTheQuestions
 * По умолчанию: id, createByUserId, createDate, status=APPROVED, oneShot=false,
 *               quiz.answers / correct_answers
 */
const ids = require('../ids');

module.exports = {
  id: ids.qArticlesTest,
  questionName: 'Артикли a / an',
  questionDescription: 'Выберите верный артикль',
  type: 'TEST',
  category: ['CATEGORY_1'],
  status: 'INGAME',
  idGroupsOfTheQuestions: [ids.groupArticles],
  quiz: {
    question: 'Выберите правильный вариант: I saw ___ apple.',
    answers: ['a', 'an', 'the', '—'],
    correct_answers: [1]
  }
};
