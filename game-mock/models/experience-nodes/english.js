'use strict';

/**
 * Дерево опыта.
 * Существенное: experienceName, experienceDescription, parentId, currencyId
 * По умолчанию: experienceId
 */
const ids = require('../ids');

module.exports = [
  {
    experienceId: ids.expRoot,
    experienceName: 'English XP',
    experienceDescription: 'Корневой опыт вселенной English Basics',
    currencyId: 2
  },
  {
    experienceId: ids.expGrammar,
    parentId: ids.expRoot,
    experienceName: 'Grammar',
    experienceDescription: 'Грамматика',
    currencyId: 2
  },
  {
    experienceId: ids.expVocab,
    parentId: ids.expRoot,
    experienceName: 'Vocabulary',
    experienceDescription: 'Лексика',
    currencyId: 2
  }
];
