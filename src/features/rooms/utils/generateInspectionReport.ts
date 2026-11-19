import { inspectionCategoryLabel, INSPECTION_CATEGORY_ORDER } from '../constants/inspectionImages';
import type { RoomInspection } from '../services/roomInspection';
import { exportReportPdf } from './generateChecklistReport';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** "20 November 2026 | 16:00" */
export function formatInspectionStamp(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} | ${hh}:${mm}`;
}

/**
 * The engineering checklist as a PDF — "View Report" on the completed tab
 * (Figma 4759:1554). Every item by category, Good or Issue, with the issue's
 * note and whether a ticket was raised.
 */
export async function generateInspectionReport({
  roomNumber,
  roomCode,
  inspection,
}: {
  roomNumber: string;
  roomCode?: string;
  inspection: RoomInspection;
}): Promise<void> {
  const rank = (k: string) => {
    const i = INSPECTION_CATEGORY_ORDER.indexOf(k);
    return i < 0 ? 99 : i;
  };
  const categories = [...new Set(inspection.items.map((i) => i.category))].sort((a, b) => rank(a) - rank(b));
  const issues = inspection.items.filter((i) => i.result === 'issue').length;

  const sections = categories
    .map((cat) => {
      const rows = inspection.items
        .filter((i) => i.category === cat)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((i) => {
          const result =
            i.result === 'good'
              ? '<span class="good">Good</span>'
              : i.result === 'issue'
                ? '<span class="issue">Issue</span>'
                : '<span class="none">Unchecked</span>';
          const note = i.result === 'issue' && i.note ? escape(i.note) : '';
          const ticket = i.result === 'issue' ? (i.ticketId ? 'Raised' : '—') : '';
          return `<tr><td>${escape(i.name)}</td><td>${result}</td><td>${note}</td><td>${ticket}</td></tr>`;
        })
        .join('');
      return `<h2>${escape(inspectionCategoryLabel(cat))}</h2>
        <table><thead><tr><th>Item</th><th>Result</th><th>Note</th><th>Ticket</th></tr></thead><tbody>${rows}</tbody></table>`;
    })
    .join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />
  <title>Room ${escape(roomNumber)} Engineering Checklist</title>
  <style>
    body { font-family: Helvetica, Arial, sans-serif; color: #1e1e1e; padding: 32px; }
    h1 { font-size: 22px; margin: 0 0 4px; color: #334866; }
    .meta { font-size: 13px; color: #5a759d; margin-bottom: 4px; }
    .summary { font-size: 14px; font-weight: bold; margin: 16px 0 8px; color: ${issues ? '#f92424' : '#41d541'}; }
    h2 { font-size: 15px; margin: 22px 0 8px; color: #5a759d; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; background: #f1f6fc; color: #334866; padding: 8px; }
    td { padding: 8px; border-bottom: 1px solid #eef2f7; vertical-align: top; }
    .good { color: #41d541; font-weight: bold; }
    .issue { color: #f92424; font-weight: bold; }
    .none { color: #8e8888; }
  </style></head><body>
  <h1>Room ${escape(roomNumber)} — Engineering Checklist</h1>
  ${roomCode ? `<div class="meta">${escape(roomCode)}</div>` : ''}
  <div class="meta">${inspection.completedAt ? `Completed ${escape(formatInspectionStamp(inspection.completedAt))}` : 'Not completed'}${
    inspection.completedBy ? ` by ${escape(inspection.completedBy)}` : ''
  }</div>
  <div class="summary">${issues === 0 ? 'All items good' : issues === 1 ? '1 issue found' : `${issues} issues found`}</div>
  ${sections}
  </body></html>`;

  await exportReportPdf({
    html,
    filename: `Room_${roomNumber}_Engineering_Checklist_${inspection.serviceDay.replace(/-/g, '')}.pdf`,
    roomNumber,
    title: `Room ${roomNumber} Engineering Checklist`,
  });
}
