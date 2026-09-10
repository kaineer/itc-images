'use strict';

/**
 * Коды ошибок gateway.
 * Существенное: code, message, description
 */
module.exports = [
  { code: 0, message: 'OK', description: 'Успешное выполнение' },
  { code: 1001, message: 'USER_NOT_FOUND', description: 'Пользователь не найден' },
  { code: 1002, message: 'INVALID_TOKEN', description: 'Токен недействителен' },
  { code: 2001, message: 'NODE_NOT_FOUND', description: 'Нода не найдена' },
  { code: 2002, message: 'QUESTION_NOT_FOUND', description: 'Вопрос не найден' },
  { code: 3001, message: 'INSUFFICIENT_FUNDS', description: 'Недостаточно средств' }
];
