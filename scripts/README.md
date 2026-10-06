# Scripts

Utility and seed scripts for the Hestia project.

| Script | Purpose |
|--------|---------|
| `seedDepartments.js` | Seed Supabase departments (`npm run seed:departments`) |
| `seedRolesAndPermissions.js` | Seed roles and permissions (`npm run seed:roles`) |
| `seedUsers.js` | Seed users (`npm run seed:users`) |
| `generateRoomsSeed.js` | Generate Default Hotel room/reservation seed from `mockAllRoomsData` |
| `generatePalmHavenRoomsSeed.js` | Generate Palm Haven synthetic room/reservation seed |
| `generateMockFromCsv.js` | Generate mock data from CSV (e.g. in `data/`) |
| `extract-pdf.js` | Extract text from PDF (e.g. `data/datafile.pdf`) |
| `FIX_MODAL_NOW.sh` | One-off script to clear Metro cache and restart (platform-specific paths) |

Run seed scripts via npm: `npm run seed:departments`, etc.
