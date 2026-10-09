/**
 * Draw the lock-screen pictures for push notifications (Figma 4443:595).
 *
 *   npx tsx scripts/generateNotificationImages.ts
 *
 * One PNG per notification type — the same colour and glyph the app gives that
 * kind in Tasks and in its toasts (taskMeta) — written into the Notification
 * Service Extension's folder, which bundles them. iOS shows the picture in a
 * circle, with the Hestia icon on its corner. Re-run after changing a type's
 * colour or icon in taskMeta.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

import { taskMeta } from '../src/features/chat/utils/taskMeta';

const REPO = path.resolve(__dirname, '..');

/**
 * The task types, read from the source rather than imported: importing
 * inAppNotifications would start the Supabase client, which needs the app.
 */
function taskTypes(): string[] {
  const src = fs.readFileSync(path.join(REPO, 'src/lib/inAppNotifications.ts'), 'utf8');
  const block = src.slice(src.indexOf('export const TASK_NOTIFICATION_TYPES = ['));
  return [...block.slice(0, block.indexOf('] as const')).matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
}
const OUT = path.join(REPO, 'plugins/notification-service/images');
const SIZE = 180;
const GLYPH = 84;

/** Find an icon's SVG by its registry name (assets/icons/<group>/<name>.svg). */
function svgPath(name: string): string {
  const root = path.join(REPO, 'assets/icons');
  for (const dir of fs.readdirSync(root)) {
    const p = path.join(root, dir, `${name}.svg`);
    if (fs.existsSync(p)) return p;
  }
  throw new Error(`No SVG for icon "${name}"`);
}

async function draw(file: string, colour: string, icon: string, glyph = '#ffffff') {
  const svg = fs.readFileSync(svgPath(icon), 'utf8').replace(/currentColor/g, glyph);
  const mark = await sharp(Buffer.from(svg), { density: 600 })
    .resize(GLYPH, GLYPH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: colour } })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toFile(path.join(OUT, file));
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const type of taskTypes()) {
    const meta = taskMeta(type);
    await draw(`${type}.png`, meta.colour, meta.icon, meta.glyph);
  }
  // Chat and announcements (an announcement shows its sender's photo when
  // there is one; this is the fallback), and anything else.
  await draw('chat_message.png', '#5a759d', 'nav-chat');
  await draw('general.png', '#5a759d', 'action-announcement');
  await draw('default.png', '#5a759d', 'nav-rooms');
  console.log(`Wrote ${fs.readdirSync(OUT).length} images to ${path.relative(REPO, OUT)}`);
}

void main();
