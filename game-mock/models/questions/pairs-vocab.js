'use strict';

/**
 * Вопрос PAIRS.
 * Существенное: quiz.english_words, quiz.russian_words, quiz.correct_answers
 */
const ids = require('../ids');

module.exports = {
  id: ids.qVocabPairs,
  questionName: 'Слова: пары',
  questionDescription: 'Соедините английские и русские слова',
  type: 'PAIRS',
  category: ['CATEGORY_3'],
  status: 'INGAME',
  idGroupsOfTheQuestions: [ids.groupTenses],
  quiz: {
    question: 'Составьте пары',
    english_words: ['go', 'went', 'gone'],
    russian_words: ['идти', 'шёл', 'ушедший'],
    correct_answers: [
      [0, 0],
      [1, 1],
      [2, 2]
    ]
  }
};
