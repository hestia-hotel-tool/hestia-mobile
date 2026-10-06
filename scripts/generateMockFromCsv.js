/**
 * Generates src/mocks/mockAllRoomsData.ts from operational-data.csv [AM] and pm-operational-data.csv [PM].
 * Run: node scripts/generateMockFromCsv.js
 * Reads both CSVs and outputs { rooms, roomsPM } so switching to PM shows PM rooms.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const csvPathAM = path.join(projectRoot, 'data', 'operational-data.csv');
const csvPathPM = path.join(projectRoot, 'data', 'pm-operational-data.csv');
const outPath = path.join(projectRoot, 'src', 'mocks', 'mockAllRoomsData.ts');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === ',' && !inQuotes) || (c === '\r' && !inQuotes)) {
      result.push(current.trim());
      current = '';
      if (c === '\r') break;
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

function parseDateRange(str) {
  if (!str || str === 'N/A' || str.trim() === '') return null;
  const parts = str.split(/\s*-\s*/).map((s) => s.trim().replace(/\./g, ''));
  if (parts.length < 2) return null;
  const fromPart = parts[0]; // DDMMYYYY or DD.MM.YYYY
  const toPart = parts[1];
  const toISO = (s) => {
    const cleaned = s.replace(/\./g, '');
    let day, month, year;
    if (cleaned.length === 8) {
      day = cleaned.slice(0, 2);
      month = cleaned.slice(2, 4);
      year = cleaned.slice(4, 8);
    } else {
      const d = cleaned.match(/(\d{1,2})(\d{1,2})(\d{4})/);
      if (d) {
        day = d[1].padStart(2, '0');
        month = d[2].padStart(2, '0');
        year = d[3];
      } else return null;
    }
    return `${year}-${month}-${day}`;
  };
  const from = toISO(fromPart);
  const to = toISO(toPart);
  if (!from || !to) return null;
  return { from, to };
}

function mapHouseKeepingStatus(s) {
  const t = (s || '').trim();
  if (t === 'Dirty') return 'Dirty';
  if (t === 'Clean') return 'Cleaned';
  if (t === 'Inspected' || t === 'Inspected ') return 'Inspected';
  if (t === 'In Progress') return 'InProgress';
  if (t === 'Pause' || t === 'Pause ') return 'InProgress';
  if (t === 'Return Later') return 'InProgress';
  if (t === 'Refused Service') return 'Inspected';
  return 'Dirty';
}

function mapFrontOfficeStatus(task) {
  const t = (task || '').trim();
  if (t === 'Arrival / Departure' || t === 'Arrival / Departure ') return 'Arrival/Departure';
  if (t === 'Arrival') return 'Arrival';
  if (t === 'Departure') return 'Departure';
  if (t === 'Stayover No Linen') return 'Stayover';
  if (t === 'Stayover with Linen') return 'Stayover';
  return 'Stayover';
}

/** PM CSV: houskeepingTask "Turn down" -> Turndown, "No Task" -> No Task */
function mapFrontOfficeStatusPM(task) {
  const t = (task || '').trim();
  if (t === 'Turn down') return 'Turndown';
  if (t === 'No Task') return 'No Task';
  return 'Turndown';
}

function withLinen(task) {
  const t = (task || '').trim();
  if (t === 'Stayover with Linen') return true;
  if (t === 'Stayover No Linen') return false;
  return false;
}

function mapPromisedTime(s) {
  const t = (s || '').trim();
  if (!t || t === 'No Time Promised' || t === 'No Time Promised') return null;
  if (t === '12:00') return '12:00';
  if (t === '13:00') return '13:00';
  return '12:00';
}

function num(v) {
  if (v === undefined || v === null || v === '' || v === 'N/A') return 0;
  const n = parseInt(String(v).replace(/\D/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

function creditVal(v) {
  const s = String(v || '').trim().replace(/min/gi, '');
  const n = parseInt(s, 10);
  return isNaN(n) ? 45 : n;
}

// Parse CSV helper
function parseCsvFile(filePath) {
  const csv = fs.readFileSync(filePath, 'utf8');
  const lines = csv.split('\n').filter((l) => l.trim());
  return lines.slice(1).map(parseCSVLine);
}

const defaultAvatar = "require('../../assets/icons/profile-avatar.png')";
const reservationStatusMap = {
  'Due in / Due out': 'Due in / Due out',
  'Due out /      Due in': 'Due Out / Out Of Order',
  'Due out /      Due in': 'Due Out / Out Of Order',
  'Checked out / Due in': 'Checked out / Due in',
  'Checked in': 'Checked in',
  'Checked out': 'Checked out',
  'Due out': 'Due out',
  'Occupied': 'Occupied',
  'Vacant': 'Vacant',
  'Out Of Order': 'Out Of Order',
  'Due Out /      Out Of Order': 'Due Out / Out Of Order',
  'check out /    Out Of Order': 'Checked out / Out Of Order',
};

function normalizeReservationStatus(s) {
  const t = (s || '').trim();
  return reservationStatusMap[t] || 'Occupied';
}

function buildRoomsFromRows(rows, mapFrontOffice, isPM) {
  return rows.map((cells) => {
  const roomNumber = (cells[0] || '').trim();
  const task = cells[4] || '';
  const frontOffice = mapFrontOffice(task);
  const hasArrival = frontOffice === 'Arrival' || frontOffice === 'Arrival/Departure';
  const hasDeparture = frontOffice === 'Departure' || frontOffice === 'Arrival/Departure';

  const dateIn = parseDateRange(cells[10]);
  const dateOut = parseDateRange(cells[11]);
  const guestNameIn = (cells[8] || '').trim();
  const guestNameOut = (cells[9] || '').trim();
  const eta = (cells[18] || '').trim();
  const etd = (cells[19] || '').trim();
  const adultsIn = num(cells[14]);
  const kidsIn = num(cells[15]);
  const adultsOut = num(cells[16]);
  const kidsOut = num(cells[17]);
  const vipIn = num(cells[12]);
  const vipOut = num(cells[13]);

  const guests = [];
  if (hasArrival && guestNameIn && guestNameIn !== 'N/A') {
    guests.push({
      name: guestNameIn,
      datesOfStay: dateIn || { from: '', to: '' },
      time: eta && eta !== 'N/A' ? eta : 'N/A',
      timeLabel: eta && eta !== 'N/A' ? 'ETA' : 'N/A',
      guestCount: { adults: adultsIn, kids: kidsIn },
      vipCode: vipIn || undefined,
      arrivalDate: dateIn ? dateIn.from : undefined,
    });
  }
  if (hasDeparture && guestNameOut && guestNameOut !== 'N/A') {
    guests.push({
      name: guestNameOut,
      datesOfStay: dateOut || { from: '', to: '' },
      time: etd && etd !== 'N/A' ? etd : 'N/A',
      timeLabel: etd && etd !== 'N/A' ? 'EDT' : 'N/A',
      guestCount: { adults: adultsOut, kids: kidsOut },
      vipCode: vipOut || undefined,
    });
  }
  if (guests.length === 0 && (guestNameIn || guestNameOut)) {
    const name = guestNameIn || guestNameOut;
    const dates = dateIn || dateOut || { from: '', to: '' };
    const isOut = frontOffice === 'Departure';
    guests.push({
      name: name === 'N/A' ? 'Guest' : name,
      datesOfStay: dates,
      time: 'N/A',
      timeLabel: 'N/A',
      guestCount: { adults: isOut ? adultsOut : adultsIn, kids: isOut ? kidsOut : kidsIn },
      vipCode: isOut ? vipOut : vipIn,
      arrivalDate: dateIn ? dateIn.from : undefined,
    });
  }
  if (guests.length === 0) {
    guests.push({
      name: 'N/A',
      datesOfStay: { from: '', to: '' },
      time: 'N/A',
      timeLabel: 'N/A',
      guestCount: { adults: 0, kids: 0 },
      isVacant: true,
    });
  }

  const attendantName = (cells[20] || '').trim();
  const isNotAssigned = !attendantName || attendantName === 'Not Assigned';
  const noteMadeByStr = isPM ? '' : (cells[23] || '').trim();
  const notesCount = (cells[22] && cells[22].trim()) ? 1 : 0;

  const specialInstr = (cells[21] || '').trim();
  const specialInstructions = frontOffice === 'Departure' ? null : (specialInstr || null);
  const roomNotesVal = (cells[22] || '').trim() || null;
  const noteMadeByVal = !isPM && roomNotesVal && noteMadeByStr ? { name: noteMadeByStr, avatar: defaultAvatar } : null;

  const flaggedCol = isPM ? 23 : 24;
  const flagged = /^yes$/i.test((cells[flaggedCol] || '').trim());

  return {
    id: `room-${roomNumber}`,
    roomNumber,
    roomCategory: (cells[1] || 'ST2K').trim(),
    credit: creditVal(cells[2]),
    frontOfficeStatus: frontOffice,
    withLinen: task.includes('with Linen'),
    houseKeepingStatus: mapHouseKeepingStatus(cells[3]),
    reservationStatus: normalizeReservationStatus(cells[5]),
    isPriority: /^yes$/i.test((cells[6] || '').trim()),
    promisedTime: mapPromisedTime(cells[7]),
    guests,
    roomAttendantAssigned: {
      name: isNotAssigned ? 'Not Assigned' : attendantName,
      ...(isNotAssigned ? { initials: 'N/A' } : { avatar: defaultAvatar }),
      statusText: 'Not Started',
      statusColor: '#1e1e1e',
    },
    flagged,
    notes: notesCount > 0 ? { count: notesCount, hasRushed: false } : undefined,
    specialInstructions,
    roomNotes: roomNotesVal,
    noteMadeBy: noteMadeByVal,
  };
  });
}

// Read AM CSV and build rooms
const rowsAM = parseCsvFile(csvPathAM);
const rooms = buildRoomsFromRows(rowsAM, mapFrontOfficeStatus, false);

// Read PM CSV if exists and build roomsPM
let roomsPM = [];
if (fs.existsSync(csvPathPM)) {
  const rowsPM = parseCsvFile(csvPathPM);
  roomsPM = buildRoomsFromRows(rowsPM, mapFrontOfficeStatusPM, true);
}

function escapeStr(s) {
  if (s == null) return 'null';
  return JSON.stringify(s);
}

function roomToTs(room) {
  const avatarExpr = "require('../../assets/icons/profile-avatar.png')";
  const lines = [
    `    {`,
    `      id: ${escapeStr(room.id)},`,
    `      roomNumber: ${escapeStr(room.roomNumber)},`,
    `      roomCategory: ${escapeStr(room.roomCategory)},`,
    `      credit: ${room.credit},`,
    `      frontOfficeStatus: ${escapeStr(room.frontOfficeStatus)},`,
    `      withLinen: ${room.withLinen},`,
    `      houseKeepingStatus: ${escapeStr(room.houseKeepingStatus)},`,
    `      reservationStatus: ${escapeStr(room.reservationStatus)},`,
    `      isPriority: ${room.isPriority},`,
    `      promisedTime: ${room.promisedTime === null ? 'null' : escapeStr(room.promisedTime)},`,
    `      guests: [`,
  ];
  room.guests.forEach((g) => {
    lines.push(`        {`);
    lines.push(`          name: ${escapeStr(g.name)},`);
    lines.push(`          datesOfStay: { from: ${escapeStr(g.datesOfStay.from)}, to: ${escapeStr(g.datesOfStay.to)} },`);
    lines.push(`          time: ${escapeStr(g.time)},`);
    lines.push(`          timeLabel: ${escapeStr(g.timeLabel)},`);
    lines.push(`          guestCount: { adults: ${g.guestCount.adults}, kids: ${g.guestCount.kids} },`);
    if (g.vipCode) lines.push(`          vipCode: ${g.vipCode},`);
    if (g.arrivalDate) lines.push(`          arrivalDate: ${escapeStr(g.arrivalDate)},`);
    if (g.isVacant) lines.push(`          isVacant: true,`);
    lines.push(`        },`);
  });
  lines.push(`      ],`);
  lines.push(`      roomAttendantAssigned: {`);
  if (room.roomAttendantAssigned.initials) {
    lines.push(`        initials: ${escapeStr(room.roomAttendantAssigned.initials)},`);
  } else {
    lines.push(`        avatar: ${avatarExpr},`);
  }
  lines.push(`        name: ${escapeStr(room.roomAttendantAssigned.name)},`);
  lines.push(`        statusText: ${escapeStr(room.roomAttendantAssigned.statusText)},`);
  lines.push(`        statusColor: ${escapeStr(room.roomAttendantAssigned.statusColor)},`);
  lines.push(`      },`);
  lines.push(`      flagged: ${room.flagged},`);
  if (room.notes) {
    lines.push(`      notes: { count: ${room.notes.count}, hasRushed: ${room.notes.hasRushed} },`);
  }
  lines.push(`      specialInstructions: ${room.specialInstructions === null ? 'null' : escapeStr(room.specialInstructions)},`);
  lines.push(`      roomNotes: ${room.roomNotes === null ? 'null' : escapeStr(room.roomNotes)},`);
  lines.push(`      noteMadeBy: ${room.noteMadeBy === null ? 'null' : `{ name: ${escapeStr(room.noteMadeBy.name)}, avatar: ${avatarExpr} }`},`);
  lines.push(`    },`);
  return lines.join('\n');
}

const roomsTs = rooms.map(roomToTs).join('\n');
const roomsPMTs = roomsPM.map(roomToTs).join('\n');

const tsContent = `/**
 * Mock rooms data generated from operational-data.csv [AM] and pm-operational-data.csv [PM].
 * Regenerate with: node scripts/generateMockFromCsv.js
 */

import type { RoomCardData } from '@features/rooms';

export const mockAllRoomsData: {
  selectedShift: 'AM';
  rooms: RoomCardData[];
  roomsPM: RoomCardData[];
} = {
  selectedShift: 'AM',
  rooms: [
${roomsTs}
  ],
  roomsPM: [
${roomsPMTs}
  ],
};
`;

fs.writeFileSync(outPath, tsContent, 'utf8');
console.log('Generated', outPath, 'with', rooms.length, 'AM rooms and', roomsPM.length, 'PM rooms.');
