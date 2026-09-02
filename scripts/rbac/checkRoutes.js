#!/usr/bin/env node
/**
 * Verify the route manifest still matches the app.
 *
 *   npm run rbac:check
 *
 * Route gating only works if every screen is registered. `resolveRoutePermission`
 * fails closed on an unknown route, so a forgotten screen locks everyone out
 * rather than exposing itself — but that is still a bug, and this catches it
 * before anyone hits it. Run in CI alongside typecheck.
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(REPO, p), 'utf8');

const routesSrc = read('src/domain/rbac/routePermissions.ts');
const permsSrc = read('src/domain/rbac/permissions.ts');
const matrix = JSON.parse(read('src/domain/rbac/matrix.json'));

function section(src, startMarker, endMarker) {
  const from = src.indexOf(startMarker);
  if (from === -1) throw new Error(`marker not found: ${startMarker}`);
  const rest = src.slice(from);
  return rest.slice(0, rest.indexOf(endMarker));
}

const routeBlock = section(routesSrc, 'ROUTE_PERMISSIONS: Record<string, Permission> = {', '\n};');
const routes = new Map(
  [...routeBlock.matchAll(/'([^']+)':\s*PERMISSIONS\.([A-Z0-9_]+)/g)].map((m) => [m[1], m[2]])
);
const ungated = new Set(
  [...section(routesSrc, 'UNGATED_ROUTES', ']').matchAll(/'([^']+)'/g)].map((m) => m[1])
);

const constToKey = new Map(
  [...permsSrc.matchAll(/^ {2}([A-Z0-9_]+): '([^']+)',$/gm)].map((m) => [m[1], m[2]])
);
const validKeys = new Set(matrix.permissions.map((p) => p.key));

const problems = [];

// 1. Every referenced constant is a real permission.
for (const [route, constant] of routes) {
  const key = constToKey.get(constant);
  if (!validKeys.has(key)) {
    problems.push(`route '${route}' references PERMISSIONS.${constant}, which is not a permission key`);
  }
}

// 2. Every route in app/ is registered or explicitly ungated.
const appDir = path.join(REPO, 'app');
const tops = fs
  .readdirSync(appDir, { withFileTypes: true })
  .filter((e) => !e.name.startsWith('_') && e.name !== '+not-found')
  .map((e) => (e.isDirectory() ? e.name : path.parse(e.name).name));

for (const name of tops) {
  if (name === '(tabs)' || routes.has(name) || ungated.has(name)) continue;
  problems.push(`route 'app/${name}' is in neither ROUTE_PERMISSIONS nor UNGATED_ROUTES`);
}

const tabDir = path.join(appDir, '(tabs)');
for (const entry of fs.readdirSync(tabDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const key = `(tabs)/${entry.name}`;
  if (!routes.has(key)) problems.push(`tab route '${key}' is not in ROUTE_PERMISSIONS`);
}

// 3. Tab routes agree with the map the tab bar itself uses.
const TAB_SEGMENT = {
  Home: '(home)', Rooms: '(rooms)', Chat: '(chats)', Tickets: '(tickets)',
  LostAndFound: '(lost_and_found)', Staff: '(staff)', Settings: '(settings)',
};
const tabBlock = section(permsSrc, 'TAB_PERMISSION', '\n};');
for (const [, tab, constant] of tabBlock.matchAll(/^ {2}(\w+): PERMISSIONS\.([A-Z0-9_]+),$/gm)) {
  const routeConstant = routes.get(`(tabs)/${TAB_SEGMENT[tab]}`);
  if (routeConstant !== constant) {
    problems.push(
      `tab '${tab}': tab bar requires ${constant} but the route requires ${routeConstant ?? 'nothing'}`
    );
  }
}

if (problems.length) {
  console.error('RBAC route check failed:\n');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(`RBAC route check passed — ${routes.size} guarded routes, ${ungated.size} explicitly ungated.`);
