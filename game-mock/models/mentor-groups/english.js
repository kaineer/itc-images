'use strict';

/**
 * Группа менторов.
 * Существенное: mentorsGroupName, mentorsId
 * По умолчанию: mentorsGroupId
 */
const ids = require('../ids');

module.exports = {
  mentorsGroupId: ids.mentorsEnglish,
  mentorsGroupName: 'English mentors',
  mentorsId: [ids.userMentor, ids.userSu]
};
