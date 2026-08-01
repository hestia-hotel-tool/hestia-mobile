const fs = require('fs');
const path = require('path');
const appDir = '/Users/malambi/dev/projects/personal-projects/hestia/app';
function createContext(dir) {
  const keys = [];
  (function walk(d, rel) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const full = path.join(d, e.name);
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) walk(full, r);
      else if (/\.(ts|tsx|js|jsx)$/.test(e.name)) keys.push('./' + r);
    }
  })(dir, '');
  function keyF() { return keys; }
  keyF.keys = () => keys;
  return keyF;
}
const ctx = createContext(appDir);
const { getRoutes } = require('expo-router/build/getRoutes');
const { getStateFromPath } = require('expo-router/build/fork/getStateFromPath');
const routes = getRoutes(ctx, { platform: 'ios' });
const { createLinkingConfig } = require('expo-router/build/link/createLinkingConfig');
const config = createLinkingConfig(routes, {});
for (const url of ['/rooms', '/(tabs)/(rooms)', '/home']) {
  try {
    const state = getStateFromPath(url, config.config);
    console.log(url, '=>', JSON.stringify(state));
  } catch (e) { console.log(url, 'ERR', e.message); }
}
