'use strict';

/**
 * OAuth2-клиент.
 * Существенное: clientId, clientName, redirectUris
 * По умолчанию: secret, grant types, auth methods, postLogoutRedirectUris
 */
const ids = require('../ids');

module.exports = {
  clientId: ids.clientWeb,
  clientName: 'talent-id-web',
  clientSecret: 'mock-web-secret',
  redirectUris: ['http://localhost:5173/callback', 'http://localhost:3000/callback']
};
