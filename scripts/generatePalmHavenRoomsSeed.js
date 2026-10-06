/**
 * Generates Supabase seed SQL for Palm Haven Hotel (synthetic, deterministic).
 * Keeps Default Hotel seed separate so it can continue to mirror mockAllRoomsData.
 *
 * Run:
 *   node scripts/generatePalmHavenRoomsSeed.js > supabase/seed_palm_haven_rooms_guests_reservations.sql
 */

function escapeSql(str) {
  if (str == null || str === '') return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function randint(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function isoDateUTC(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function timeHHMM(rng) {
  const h = String(randint(rng, 10, 18)).padStart(2, '0');
  const m = pick(rng, ['00', '15', '30', '45']);
  return `${h}:${m}`;
}

function generateRoomsAndStays({ roomCount = 15, seed = 20260414 } = {}) {
  const rng = mulberry32(seed);

  const categories = ['ST2K', 'R01K', 'RO1KY', 'RO2KT', 'ST3K', 'JS2KT', 'RO1Q', 'JS1KT', 'PS1K', 'TS1K'];
  const hkStatuses = ['Dirty', 'Cleaned', 'Inspected', 'InProgress'];
  const priorities = ['normal', 'high'];
  const linens = ['with_linen', 'no_linen'];
  const reservationStatuses = ['Occupied', 'Checked in', 'Due in / Due out', 'Checked out', 'Due out'];

  const firstNames = ['Amina', 'Jonas', 'Sofia', 'Daniel', 'Priya', 'Noah', 'Emma', 'Lucas', 'Zoe', 'Jordan', 'Fatima', 'Omar', 'Leila', 'Ivan', 'Hannah'];
  const lastNames = ['Diallo', 'Fischer', 'Mendes', 'Kim', 'Shah', 'Weber', 'Dubois', 'Braun', 'Cakeri', 'Lee', 'Ali', 'Khalid', 'Farouk', 'Petrov', 'Kim'];

  const base = new Date(Date.UTC(2026, 0, 3)); // 2026-01-03 UTC

  const rooms = [];
  const stays = [];

  const defaultLikeRoomNumbers = [
    '101', '102', '103', '104', '105', '106', '107',
    '201', '202', '203', '204', '205', '206', '207', '208',
  ];
  const roomNumbers = defaultLikeRoomNumbers.slice(0, roomCount);

  for (let i = 0; i < roomNumbers.length; i++) {
    const roomNumber = roomNumbers[i];

    rooms.push({
      roomNumber,
      category: pick(rng, categories),
      credit: randint(rng, 40, 120),
      linen_status: pick(rng, linens),
      priority: pick(rng, priorities),
      flagged: rng() < 0.15,
      special_instructions: rng() < 0.25 ? pick(rng, ['Top VIP guest', 'Allergic to flowers', 'Late checkout requested', 'Crib needed', 'Sparkling water only']) : null,
      house_keeping_status: pick(rng, hkStatuses),
    });

    const first = firstNames[i % firstNames.length];
    const last = lastNames[(i * 3) % lastNames.length];
    // Keep guest names human-friendly (no suffixes). Ensure uniqueness by picking distinct names.
    const guestName = `${first} ${last}`;
    const guestEmailLocal = `${first}.${last}.${roomNumber}.arr`.toLowerCase().replace(/[^a-z0-9.]/g, '');
    const guestEmail = `${guestEmailLocal}@palmhavenhotel.com`;
    const portraitIdx = (i % 99) + 1;
    const genderDir = i % 2 === 0 ? 'women' : 'men';
    const guestImageUrl = `https://randomuser.me/api/portraits/${genderDir}/${portraitIdx}.jpg`;

    const arrivalOffset = randint(rng, -2, 7);
    const stayLen = randint(rng, 1, 6);
    const arrival = new Date(base);
    arrival.setUTCDate(arrival.getUTCDate() + arrivalOffset);
    const departure = new Date(arrival);
    departure.setUTCDate(departure.getUTCDate() + stayLen);

    stays.push({
      roomNumber,
      guestName,
      vipCode: String(randint(rng, 1, 10)),
      guestEmail,
      guestImageUrl,
      guestCompany: pick(rng, ['Palm Haven Trading', 'Blue Horizon Group', 'Acme Ventures', 'Sunrise Consulting', 'Orchid Capital']),
      guestAddress: `${randint(rng, 10, 999)} ${pick(rng, ['Ocean', 'Palm', 'Garden', 'Market', 'Sunset'])} ${pick(rng, ['St', 'Ave', 'Rd', 'Blvd'])}`,
      guestDob: `${randint(rng, 1975, 2002)}-${String(randint(rng, 1, 12)).padStart(2, '0')}-${String(randint(rng, 1, 28)).padStart(2, '0')}`,
      arrival_date: isoDateUTC(arrival),
      departure_date: isoDateUTC(departure),
      eta: rng() < 0.2 ? null : timeHHMM(rng),
      adults: randint(rng, 1, 2),
      kids: rng() < 0.7 ? 0 : 1,
      reservation_status: pick(rng, reservationStatuses),
      front_office_status: 'Stayover',
      promised_time: rng() < 0.6 ? null : pick(rng, ['12:00', '13:00', '14:00']),
      roomNote: rng() < 0.35 ? pick(rng, ['Check minibar usage', 'Do service early', 'Extra towels requested', 'Do not move desk items', 'Refill water bottles']) : null,
    });

    // A few Arrival/Departure rooms: two reservations/guests.
    if (i % 5 === 0) {
      const depFirst = firstNames[(i + 5) % firstNames.length];
      const depLast = lastNames[(i * 5 + 1) % lastNames.length];
      // Ensure different guest info for departure.
      const depGuestName = `${depFirst} ${depLast}`;
      const depEmailLocal = `${depFirst}.${depLast}.${roomNumber}.dep`.toLowerCase().replace(/[^a-z0-9.]/g, '');
      const depGuestEmail = `${depEmailLocal}@palmhavenhotel.com`;
      const depPortraitIdx = ((i + 37) % 99) + 1;
      const depGenderDir = i % 2 === 0 ? 'men' : 'women';
      const depGuestImageUrl = `https://randomuser.me/api/portraits/${depGenderDir}/${depPortraitIdx}.jpg`;

      const depArrival = new Date(arrival);
      depArrival.setUTCDate(depArrival.getUTCDate() - randint(rng, 1, 2));
      const depDeparture = new Date(depArrival);
      depDeparture.setUTCDate(depDeparture.getUTCDate() + randint(rng, 1, 2));

      // mark both as Arrival/Departure so firstRes is correct
      stays[stays.length - 1].front_office_status = 'Arrival/Departure';
      stays[stays.length - 1].eta = stays[stays.length - 1].eta || timeHHMM(rng);

      stays.push({
        roomNumber,
        guestName: depGuestName,
        vipCode: String(randint(rng, 1, 10)),
        guestEmail: depGuestEmail,
        guestImageUrl: depGuestImageUrl,
        guestCompany: pick(rng, ['Palm Haven Trading', 'Blue Horizon Group', 'Acme Ventures', 'Sunrise Consulting', 'Orchid Capital']),
        guestAddress: `${randint(rng, 10, 999)} ${pick(rng, ['Ocean', 'Palm', 'Garden', 'Market', 'Sunset'])} ${pick(rng, ['St', 'Ave', 'Rd', 'Blvd'])}`,
        guestDob: `${randint(rng, 1975, 2002)}-${String(randint(rng, 1, 12)).padStart(2, '0')}-${String(randint(rng, 1, 28)).padStart(2, '0')}`,
        arrival_date: isoDateUTC(depArrival),
        departure_date: isoDateUTC(depDeparture),
        eta: null, // forces EDT label in UI mapping
        adults: randint(rng, 1, 2),
        kids: rng() < 0.8 ? 0 : 1,
        reservation_status: pick(rng, reservationStatuses),
        front_office_status: 'Arrival/Departure',
        promised_time: null,
        roomNote: null,
      });
    }
  }

  return { rooms, stays };
}

function main() {
  const HOTEL_NAME = process.env.SEED_HOTEL_NAME || 'Palm Haven Hotel';
  const { rooms, stays } = generateRoomsAndStays({ roomCount: 15, seed: 20260414 });
  const lines = [];

  lines.push('-- Seed: Palm Haven rooms, guests, reservations, reservation_guests, room_notes (synthetic)');
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
    lines.push(
      `INSERT INTO public.rooms (room_number, category, credit, linen_status, priority, flagged, special_instructions, house_keeping_status, hotel_id) ` +
      `VALUES (` +
        `${escapeSql(room.roomNumber)}, ${escapeSql(room.category)}, ${room.credit}, ${escapeSql(room.linen_status)}, ${escapeSql(room.priority)}, ${!!room.flagged}, ${escapeSql(room.special_instructions)}, ${escapeSql(room.house_keeping_status)}, ` +
        `(SELECT id FROM public.hotels WHERE name = ${escapeSql(HOTEL_NAME)} LIMIT 1)` +
      `) ` +
      `ON CONFLICT (hotel_id, room_number) DO UPDATE SET category = EXCLUDED.category, credit = EXCLUDED.credit, linen_status = EXCLUDED.linen_status, priority = EXCLUDED.priority, flagged = EXCLUDED.flagged, special_instructions = EXCLUDED.special_instructions, house_keeping_status = EXCLUDED.house_keeping_status;`
    );
  });
  lines.push('');

  // 2. GUESTS (per hotel)
  lines.push('-- 2. GUESTS');
  stays.forEach((s) => {
    lines.push(
      `INSERT INTO public.guests (full_name, vip_code, address, company, primary_email, dob, image_url, hotel_id) ` +
      `SELECT ${escapeSql(s.guestName)}, ${escapeSql(s.vipCode)}, ${escapeSql(s.guestAddress)}, ${escapeSql(s.guestCompany)}, ${escapeSql(s.guestEmail)}, ${escapeSql(s.guestDob)}, ${escapeSql(s.guestImageUrl)}, ` +
      `(SELECT id FROM public.hotels WHERE name = ${escapeSql(HOTEL_NAME)} LIMIT 1) ` +
      `WHERE NOT EXISTS (` +
        `SELECT 1 FROM public.guests g ` +
        `WHERE g.full_name = ${escapeSql(s.guestName)} ` +
          `AND g.hotel_id = (SELECT id FROM public.hotels WHERE name = ${escapeSql(HOTEL_NAME)} LIMIT 1)` +
      `);`
    );
  });
  lines.push('');

  // 3. RESERVATIONS
  lines.push('-- 3. RESERVATIONS');
  stays.forEach((s) => {
    lines.push(
      `INSERT INTO public.reservations (room_id, arrival_date, departure_date, eta, adults, kids, reservation_status, front_office_status, promised_time, hotel_id) ` +
      `SELECT r.id, ${escapeSql(s.arrival_date)}, ${escapeSql(s.departure_date)}, ${s.eta ? escapeSql(s.eta) : 'NULL'}, ${s.adults}, ${s.kids}, ${escapeSql(s.reservation_status)}, ${escapeSql(s.front_office_status)}, ${s.promised_time ? escapeSql(s.promised_time) : 'NULL'}, r.hotel_id ` +
      `FROM public.rooms r ` +
      `WHERE r.room_number = ${escapeSql(s.roomNumber)} AND r.hotel_id = (SELECT id FROM public.hotels WHERE name = ${escapeSql(HOTEL_NAME)} LIMIT 1) ` +
      `AND NOT EXISTS (` +
        `SELECT 1 FROM public.reservations res ` +
        `WHERE res.room_id = r.id AND res.hotel_id = r.hotel_id ` +
          `AND res.arrival_date = ${escapeSql(s.arrival_date)} AND res.departure_date = ${escapeSql(s.departure_date)} ` +
          `AND res.adults = ${s.adults} AND res.kids = ${s.kids}` +
      `);`
    );
  });
  lines.push('');

  // 4. RESERVATION_GUESTS
  lines.push('-- 4. RESERVATION_GUESTS');
  stays.forEach((s) => {
    lines.push(
      `INSERT INTO public.reservation_guests (reservation_id, guest_id, hotel_id) ` +
      `SELECT res.id, g.id, res.hotel_id ` +
      `FROM public.reservations res ` +
      `JOIN public.rooms r ON r.id = res.room_id AND r.room_number = ${escapeSql(s.roomNumber)} AND r.hotel_id = res.hotel_id ` +
      `JOIN public.guests g ON g.full_name = ${escapeSql(s.guestName)} AND g.hotel_id = res.hotel_id ` +
      `WHERE res.arrival_date = ${escapeSql(s.arrival_date)} AND res.departure_date = ${escapeSql(s.departure_date)} AND res.adults = ${s.adults} AND res.kids = ${s.kids} ` +
      `AND NOT EXISTS (SELECT 1 FROM public.reservation_guests rg WHERE rg.reservation_id = res.id AND rg.guest_id = g.id);`
    );
  });

  // 5. ROOM_NOTES (optional)
  lines.push('');
  lines.push('-- 5. ROOM_NOTES');
  stays.forEach((s) => {
    if (!s.roomNote) return;
    lines.push(
      `INSERT INTO public.room_notes (room_id, text, created_by_id, hotel_id) ` +
      `SELECT r.id, ${escapeSql(s.roomNote)}, NULL, r.hotel_id ` +
      `FROM public.rooms r ` +
      `WHERE r.room_number = ${escapeSql(s.roomNumber)} AND r.hotel_id = (SELECT id FROM public.hotels WHERE name = ${escapeSql(HOTEL_NAME)} LIMIT 1) ` +
      `AND NOT EXISTS (SELECT 1 FROM public.room_notes n WHERE n.room_id = r.id AND n.text = ${escapeSql(s.roomNote)});`
    );
  });

  return lines.join('\n');
}

console.log(main());

