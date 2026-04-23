/**
 * Generates Supabase seed SQL for Default Hotel rooms/guests/reservations based on mockAllRoomsData (AM).
 *
 * Run:
 *   node scripts/generateRoomsSeed.js > supabase/seed_rooms_guests_reservations.sql
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const mockPath = path.join(projectRoot, 'src', 'data', 'mockAllRoomsData.ts');

function escapeSql(str) {
  if (str == null || str === '') return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

function loadMockData() {
  let content = fs.readFileSync(mockPath, 'utf8');
  content = content.replace(/^import .*$/gm, '');
  content = content.replace(/^export .*$/gm, '');
  content = content.replace(/require\([^)]+\)/g, 'null');
  const match = content.match(/const rawMockAllRoomsData[^=]*=\s*(\{[\s\S]*?\});/);
  if (!match) throw new Error('Could not extract rawMockAllRoomsData from mock file');
  // eslint-disable-next-line no-eval
  return eval('(' + match[1] + ')');
}

function main() {
  const HOTEL_NAME = 'Default Hotel';
  const mock = loadMockData();
  const rooms = mock.rooms || [];

  const lines = [];
  lines.push('-- Seed: Default Hotel rooms/guests/reservations from mockAllRoomsData (AM)');
  lines.push('-- Run after migrations and SEED_DATA.sql.');
  lines.push(`-- Target hotel (tenant): ${HOTEL_NAME}`);
  lines.push('');

  lines.push('-- Ensure target hotel exists');
  lines.push(`INSERT INTO public.hotels (name) VALUES (${escapeSql(HOTEL_NAME)}) ON CONFLICT (name) DO NOTHING;`);
  lines.push('');

  lines.push('-- Ensure required columns exist (older dev DBs)');
  lines.push('ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS house_keeping_status TEXT;');
  lines.push('ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS promised_time TIME;');
  lines.push('CREATE INDEX IF NOT EXISTS idx_rooms_house_keeping_status ON public.rooms(house_keeping_status);');
  lines.push('');

  // 1. ROOMS
  lines.push('-- 1. ROOMS');
  rooms.forEach((room) => {
    const rn = room.roomNumber;
    const cat = room.roomCategory || '';
    const credit = room.credit != null ? room.credit : 0;
    const linen = room.withLinen ? 'with_linen' : 'no_linen';
    const priority = room.isPriority ? 'high' : 'normal';
    const flagged = !!room.flagged;
    const spec = room.specialInstructions;
    const hk = room.houseKeepingStatus || 'Dirty';

    lines.push(
      `INSERT INTO public.rooms (room_number, category, credit, linen_status, priority, flagged, special_instructions, house_keeping_status, hotel_id) ` +
      `VALUES (${escapeSql(rn)}, ${escapeSql(cat)}, ${credit}, ${escapeSql(linen)}, ${escapeSql(priority)}, ${flagged}, ${escapeSql(spec)}, ${escapeSql(hk)}, (SELECT id FROM public.hotels WHERE name = ${escapeSql(HOTEL_NAME)} LIMIT 1)) ` +
      `ON CONFLICT (hotel_id, room_number) DO UPDATE SET category = EXCLUDED.category, credit = EXCLUDED.credit, linen_status = EXCLUDED.linen_status, priority = EXCLUDED.priority, flagged = EXCLUDED.flagged, special_instructions = EXCLUDED.special_instructions, house_keeping_status = EXCLUDED.house_keeping_status;`
    );
  });
  lines.push('');

  // 1b. ROOM_NOTES
  lines.push('-- 1b. ROOM_NOTES (from mock roomNotes)');
  rooms.forEach((room) => {
    const noteText = room.roomNotes ? String(room.roomNotes).trim() : '';
    if (!noteText) return;
    lines.push(
      `INSERT INTO public.room_notes (room_id, text, created_by_id, hotel_id) ` +
      `SELECT r.id, ${escapeSql(noteText)}, NULL, r.hotel_id ` +
      `FROM public.rooms r WHERE r.room_number = ${escapeSql(room.roomNumber)} AND r.hotel_id = (SELECT id FROM public.hotels WHERE name = ${escapeSql(HOTEL_NAME)} LIMIT 1) ` +
      `AND NOT EXISTS (SELECT 1 FROM public.room_notes n WHERE n.room_id = r.id AND n.text = ${escapeSql(noteText)});`
    );
  });
  lines.push('');

  // 2/3/4. GUESTS + RESERVATIONS + RESERVATION_GUESTS
  lines.push('-- 2. GUESTS');
  lines.push('-- 3. RESERVATIONS');
  lines.push('-- 4. RESERVATION_GUESTS');

  rooms.forEach((room) => {
y    // If the mock contains two guests with the same name for the same room,
    // we'll disambiguate them deterministically so Arrival/Departure doesn't
    // end up showing identical guest info for both cards.
    const perRoomNameCounts = new Map();
    (room.guests || []).forEach((g) => {
      const baseGuestName = g?.name ? String(g.name).trim() : 'Guest';
      const prev = perRoomNameCounts.get(baseGuestName) || 0;
      const next = prev + 1;
      perRoomNameCounts.set(baseGuestName, next);
      const guestName = next === 1 ? baseGuestName : `${baseGuestName} (${next})`;
      const vip = g?.vipCode != null ? String(g.vipCode) : null;
      const from = g?.datesOfStay?.from || '';
      const to = g?.datesOfStay?.to || '';
      const eta = g?.time && g.time !== 'N/A' ? g.time : null;
      const adults = g?.guestCount?.adults != null ? g.guestCount.adults : 0;
      const kids = g?.guestCount?.kids != null ? g.guestCount.kids : 0;
      const resStatus = room.reservationStatus || '';
      const frontOffice = room.frontOfficeStatus || '';
      const promisedTime = room.promisedTime ? String(room.promisedTime) : null;
      if (!from || !to) return;

      const imageUrl = g?.imageUrl ? String(g.imageUrl) : null;

      lines.push(
        `INSERT INTO public.guests (full_name, vip_code, image_url, hotel_id) ` +
        `SELECT ${escapeSql(guestName)}, ${vip ? escapeSql(vip) : 'NULL'}, ${imageUrl ? escapeSql(imageUrl) : 'NULL'}, (SELECT id FROM public.hotels WHERE name = ${escapeSql(HOTEL_NAME)} LIMIT 1) ` +
        `WHERE NOT EXISTS (SELECT 1 FROM public.guests WHERE full_name = ${escapeSql(guestName)} AND hotel_id = (SELECT id FROM public.hotels WHERE name = ${escapeSql(HOTEL_NAME)} LIMIT 1));`
      );

      lines.push(
        `INSERT INTO public.reservations (room_id, arrival_date, departure_date, eta, adults, kids, reservation_status, front_office_status, promised_time, hotel_id) ` +
        `SELECT r.id, ${escapeSql(from)}, ${escapeSql(to)}, ${eta ? escapeSql(eta) : 'NULL'}, ${adults}, ${kids}, ${escapeSql(resStatus)}, ${escapeSql(frontOffice)}, ${promisedTime ? escapeSql(promisedTime) : 'NULL'}, r.hotel_id ` +
        `FROM public.rooms r WHERE r.room_number = ${escapeSql(room.roomNumber)} AND r.hotel_id = (SELECT id FROM public.hotels WHERE name = ${escapeSql(HOTEL_NAME)} LIMIT 1) ` +
        `AND NOT EXISTS (SELECT 1 FROM public.reservations res WHERE res.room_id = r.id AND res.hotel_id = r.hotel_id AND res.arrival_date = ${escapeSql(from)} AND res.departure_date = ${escapeSql(to)} AND COALESCE(res.eta::text,'') = ${escapeSql(eta || '')} AND res.adults = ${adults} AND res.kids = ${kids});`
      );

      lines.push(
        `INSERT INTO public.reservation_guests (reservation_id, guest_id, hotel_id) ` +
        `SELECT res.id, gs.id, res.hotel_id ` +
        `FROM public.reservations res ` +
        `JOIN public.rooms r ON r.id = res.room_id AND r.room_number = ${escapeSql(room.roomNumber)} AND r.hotel_id = res.hotel_id ` +
        `JOIN public.guests gs ON gs.full_name = ${escapeSql(guestName)} AND gs.hotel_id = res.hotel_id ` +
        `WHERE res.arrival_date = ${escapeSql(from)} AND res.departure_date = ${escapeSql(to)} AND COALESCE(res.eta::text,'') = ${escapeSql(eta || '')} AND res.adults = ${adults} AND res.kids = ${kids} ` +
        `AND NOT EXISTS (SELECT 1 FROM public.reservation_guests rg WHERE rg.reservation_id = res.id AND rg.guest_id = gs.id);`
      );
    });
  });

  return lines.join('\n');
}

console.log(main());
