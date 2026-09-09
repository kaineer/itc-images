'use strict';

/**
 * Вселенная (дерево нод).
 * Существенное: nodeName, masterNodeId, groupOfTheQuestionId, x, y, isCost, isPaid, nodeType
 * По умолчанию: nodeStatus=ACTIVE, changeDate, slave-списки считаются из дерева
 *
 * branch / branches: 'dev' | 'ingame' | 'archive'
 * masterNodeId не указывайте у корня (подставится нулевой UUID).
 * У каждой ноды, включая корень, должен быть groupOfTheQuestionId.
 */
const ids = require('../ids');

module.exports = {
  branches: ['dev', 'ingame'],
  nodes: [
    {
      id: ids.universeEnglish,
      nodeName: 'English Basics',
      groupOfTheQuestionId: ids.groupIntro,
      x: 0,
      y: 240
    },
    {
      id: ids.nodeArticles,
      nodeName: 'Articles',
      masterNodeId: ids.universeEnglish,
      groupOfTheQuestionId: ids.groupArticles,
      x: 240,
      y: 80,
      isCost: true,
      isPaid: true
    },
    {
      id: ids.nodeTenses,
      nodeName: 'Tenses',
      masterNodeId: ids.universeEnglish,
      groupOfTheQuestionId: ids.groupTenses,
      x: 240,
      y: 240,
      isCost: true
    },
    {
      id: ids.nodePresent,
      nodeName: 'Present Simple',
      masterNodeId: ids.nodeTenses,
      groupOfTheQuestionId: ids.groupTenses,
      x: 480,
      y: 180
    },
    {
      id: ids.nodePast,
      nodeName: 'Past Simple',
      masterNodeId: ids.nodeTenses,
      groupOfTheQuestionId: ids.groupTenses,
      x: 480,
      y: 300
    },
    {
      id: ids.nodeWriting,
      nodeName: 'Writing',
      masterNodeId: ids.universeEnglish,
      groupOfTheQuestionId: ids.groupWriting,
      nodeType: 'SERIAL',
      x: 240,
      y: 400,
      isPaid: true
    }
  ]
};
