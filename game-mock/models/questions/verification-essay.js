'use strict';

/**
 * Вопрос VERIFICATION (проверка ментором).
 * Существенное: quiz.question, quiz.mentorsGroupId
 * По умолчанию: mentorsGroupId первой группы менторов
 */
const ids = require('../ids');

module.exports = {
  id: ids.qEssay,
  questionName: 'Короткое эссе',
  questionDescription: 'Напишите 3–5 предложений о своём дне',
  type: 'VERIFICATION',
  category: ['CATEGORY_4'],
  status: 'IN_GAME',
  oneShot: true,
  idGroupsOfTheQuestions: [ids.groupWriting],
  quiz: {
    question: 'Describe your typical weekday in English.',
    mentorsGroupId: ids.mentorsEnglish
  }
};
