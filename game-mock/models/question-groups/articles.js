'use strict';

/**
 * Группа вопросов.
 * Существенное: groupName, questionsId (необязательно — можно задать с стороны вопроса)
 * По умолчанию: groupId, linkedNodesId (считаются из нод)
 */
const ids = require('../ids');

module.exports = {
  groupId: ids.groupArticles,
  groupName: 'Articles'
};
