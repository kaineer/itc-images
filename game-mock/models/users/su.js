'use strict';

/**
 * Superuser для быстрых сценариев контента и игры без смены учёток.
 * Все роли сразу.
 */
const ids = require('../ids');

module.exports = {
  id: ids.userSu,
  userName: 'su',
  email: 'su@mock.local',
  password: 'password',
  roles: ['PLAYER', 'METHODIST', 'GAME_DIZ', 'MENTOR', 'ADMINISTRATOR'],
  organizationsId: [ids.orgItc]
};
