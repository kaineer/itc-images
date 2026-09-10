'use strict';

function argValue(name) {
  const flag = `--${name}`;
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('-')) {
    return process.argv[idx + 1];
  }
  const prefix = `${flag}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

const port = Number(argValue('port') || process.env.PORT || process.env.GAME_MOCK_PORT || 8080);
const host = argValue('host') || process.env.HOST || '0.0.0.0';

module.exports = {
  port: Number.isFinite(port) && port > 0 ? port : 8080,
  host
};
