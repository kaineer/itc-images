'use strict';

/**
 * Архивная копия вселенной — урезанное дерево для проверки ветки archive.
 */
const ids = require('../ids');

module.exports = {
  branch: 'archive',
  nodes: [
    {
      id: ids.universeEnglish,
      nodeName: 'English Basics (archived)',
      nodeStatus: 'ARCHIVE',
      x: 0,
      y: 0
    },
    {
      id: ids.nodeArticles,
      nodeName: 'Articles',
      masterNodeId: ids.universeEnglish,
      groupOfTheQuestionId: ids.groupArticles,
      nodeStatus: 'ARCHIVE',
      x: 240,
      y: 0
    }
  ]
};
