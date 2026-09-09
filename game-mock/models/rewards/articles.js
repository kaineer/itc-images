'use strict';

/**
 * Вознаграждение за ноду.
 * Существенное: nodeId, currencyId, value
 * По умолчанию: rewardId
 */
const ids = require('../ids');

module.exports = {
  rewardId: ids.rewardArticles,
  nodeId: ids.nodeArticles,
  currencyId: 1,
  value: 25
};
