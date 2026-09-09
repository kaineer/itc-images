'use strict';

/**
 * Файл, привязанный к вопросу.
 * Существенное: fileName, questionId, kind
 * По умолчанию: fileId, mimeType, пустое содержимое
 */
const ids = require('../ids');

module.exports = {
  fileId: 1,
  fileName: 'apple.png',
  questionId: ids.qArticlesTest,
  kind: 'question-body',
  mimeType: 'image/png'
};
