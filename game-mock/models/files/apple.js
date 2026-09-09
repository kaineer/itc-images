'use strict';

/**
 * Файл тела вопроса.
 * Существенное: questionId, kind, fileType (JPG|MP3), contentBase64
 * По умолчанию: fileId, fileName, mimeType
 *
 * GET /file/files/:questionId отдаёт:
 *   mediaForBodyQuestion: { JPG?: string, MP3?: string }
 *   jpgsForAnswersQuestion: { [answerNumber]: string }
 */
const ids = require('../ids');

// 1×1 JPEG
const TINY_JPG_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGcP//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEABj8Cf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8hf//Z';

module.exports = {
  fileId: 1,
  fileName: 'apple.jpg',
  questionId: ids.qArticlesTest,
  kind: 'question-body',
  fileType: 'JPG',
  mimeType: 'image/jpeg',
  contentBase64: TINY_JPG_BASE64
};
