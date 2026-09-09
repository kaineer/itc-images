'use strict';

const fs = require('fs');
const path = require('path');

function loadDir(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.js') && !name.startsWith('_'))
    .sort();

  const items = [];
  for (const file of files) {
    const exported = require(path.join(dir, file));
    const value = exported && exported.default ? exported.default : exported;
    if (Array.isArray(value)) items.push(...value);
    else if (value && typeof value === 'object') items.push(value);
  }
  return items;
}

module.exports = { loadDir };
