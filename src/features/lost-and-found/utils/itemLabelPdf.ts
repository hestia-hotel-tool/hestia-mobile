import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { formatMoment } from '@/utils/formatting';
import { fetchLostAndFoundItemDetail, type LostAndFoundItemDetail } from '../services/lostAndFound';
import { storedLocationLabel } from './storedLocations';

/**
 * The label for a registered lost & found item — "Print tracking number and
 * all related info and attach it to the item" — one page, two ways out
 * (tester feedback: Print should print, and save as a PDF): the phone's print
 * dialog (`printItemLabel`), or a PDF to the share sheet for Save to Files,
 * AirDrop and mail (`shareItemLabelPdf`).
 *
 * Built from the saved record, not the form, so the tracking number and the
 * names are the database's.
 */
async function loadItem(itemId: string): Promise<LostAndFoundItemDetail> {
  const item = await fetchLostAndFoundItemDetail(itemId);
  if (!item) throw new Error('The item could not be loaded. Try again in a moment.');
  return item;
}

/** The phone's print dialog (AirPrint / Android print), the label already laid out. */
export async function printItemLabel(itemId: string): Promise<void> {
  const item = await loadItem(itemId);
  try {
    await Print.printAsync({ html: labelHtml(item), width: 420, height: 595 });
  } catch (e) {
    // Closing the print dialog without printing is not an error worth showing.
    if (e instanceof Error && /cancel|did not complete/i.test(e.message)) return;
    throw e;
  }
}

/** The label as a PDF to the share sheet: Save to Files, AirDrop, mail. */
export async function shareItemLabelPdf(itemId: string): Promise<void> {
  const item = await loadItem(itemId);

  const { uri } = await Print.printToFileAsync({ html: labelHtml(item), width: 420, height: 595 });

  // A readable name in Files, not expo-print's random one.
  const name = `Lost-and-Found-${(item.trackingNumber ?? item.id).replace(/[^A-Za-z0-9-]/g, '')}.pdf`;
  const target = `${FileSystem.cacheDirectory}${name}`;
  await FileSystem.deleteAsync(target, { idempotent: true });
  await FileSystem.moveAsync({ from: uri, to: target });

  if (!(await Sharing.isAvailableAsync())) {
    // No share sheet (rare): fall back to the system print dialog, which can save a PDF too.
    await Print.printAsync({ uri: target });
    return;
  }
  await Sharing.shareAsync(target, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: `Lost & Found ${item.trackingNumber ?? ''}`.trim(),
  });
}

const esc = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function labelHtml(item: LostAndFoundItemDetail): string {
  const rows: [string, string | null | undefined][] = [
    ['Item', item.itemName],
    ['Description', item.description],
    ['Found at', item.foundLocation],
    ['Found on', item.foundAt ? formatMoment(item.foundAt) : null],
    ['Guest', item.guest ? `${item.guest.name}${item.guest.dates ? ` · ${item.guest.dates}` : ''}` : null],
    ['Status', item.status.charAt(0).toUpperCase() + item.status.slice(1)],
    ['Stored at', item.storageLocation ? storedLocationLabel(item.storageLocation) : null],
    ['Shipped to', item.shippedLocation],
    ['Found by', item.foundBy?.name],
    ['Registered by', item.registeredBy?.name],
    ['Registered on', item.createdAt ? formatMoment(item.createdAt) : null],
  ];
  const photo = item.photos[0];

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { margin: 18px; }
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1e1e1e; margin: 0; }
    .head { border: 2px solid #5a759d; border-radius: 10px; padding: 12px 14px; text-align: center; }
    .label { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #5a759d; }
    .tn { font-size: 34px; font-weight: 700; letter-spacing: .04em; margin-top: 4px; }
    .hotel { font-size: 12px; color: #607aa1; margin-top: 4px; }
    img { display: block; width: 100%; max-height: 190px; object-fit: cover; border-radius: 8px; margin-top: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    td { padding: 6px 0; border-bottom: 1px solid #e3e8f0; vertical-align: top; }
    td.k { width: 34%; color: #607aa1; }
  </style></head><body>
    <div class="head">
      <div class="label">Lost &amp; Found · Tracking number</div>
      <div class="tn">${esc(item.trackingNumber ?? '—')}</div>
      <div class="hotel">Hestia</div>
    </div>
    ${photo ? `<img src="${esc(photo)}" />` : ''}
    <table>${rows
      .filter(([, v]) => v != null && String(v).trim() !== '')
      .map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(String(v))}</td></tr>`)
      .join('')}</table>
  </body></html>`;
}
