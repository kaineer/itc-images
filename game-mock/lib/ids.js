'use strict';

const { randomUUID } = require('crypto');

const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

function newId() {
  return randomUUID();
}

function isRootMaster(masterNodeId) {
  return (
    masterNodeId == null ||
    masterNodeId === '' ||
    masterNodeId === '0' ||
    masterNodeId === 0 ||
    masterNodeId === ZERO_UUID
  );
}

function normalizeMaster(masterNodeId) {
  return isRootMaster(masterNodeId) ? ZERO_UUID : masterNodeId;
}

module.exports = { ZERO_UUID, newId, isRootMaster, normalizeMaster };
