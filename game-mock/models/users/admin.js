'use strict';

/**
 * Пользователь.
 * Существенное: userName, email, password, roles, organizationsId
 * По умолчанию: id, enabled, createdAt, email из userName
 *
 * roles: PLAYER | METHODIST | GAME_DIZ | MENTOR | ADMINISTRATOR
 */
const ids = require('../ids');

module.exports = {
  id: ids.userAdmin,
  userName: 'admin',
  email: 'admin@mock.local',
  password: 'password',
  roles: ['ADMINISTRATOR'],
  organizationsId: [ids.orgItc]
};
