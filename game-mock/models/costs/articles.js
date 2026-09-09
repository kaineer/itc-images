'use strict';

/**
 * Стоимость открытия ноды.
 * Существенное: nodeId, currencyId, value
 * По умолчанию: rewardId
 */
const ids = require('../ids');

module.exports = {
  rewardId: ids.costArticles,
  nodeId: ids.nodeArticles,
  currencyId: 1,
  value: 10
};
