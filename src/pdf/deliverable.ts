import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const A4_W = 595.28;
export const A4_H = 841.89;
const MARGIN = 36;
const FOOTER_BAND = 28;
const FOOTER_SIZE = 7;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface DeliverableInput {
  bytes: Uint8Array;
  mimeType: string;
}

function istParts(date: Date): { day: string; month: number; year: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return { day: get('day'), month: Number(get('month')), year: get('year') };
}

export function footerText(requestNumber: string, date: Date): string {
  const { day, month, year } = istParts(date);
  const d = `${day}-${MONTHS[month - 1]}-${year}`;
  return `${requestNumber} · Retrieved ${d} · Copy of archival record procured on request; not a certified copy unless stamped by the issuing office.`;
}

export function fitWithin(w: number, h: number, maxLongEdge = 2000): { w: number; h: number } {
  const long = Math.max(w, h);
  if (long <= maxLongEdge) return { w, h };
  const s = maxLongEdge / long;
  return { w: Math.round(w * s), h: Math.round(h * s) };
}

/** Browser-only: downscale/re-encode large images. */
export async function prepareImage(blob: Blob): Promise<DeliverableInput> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const type = blob.type;
  if (!type.startsWith('image/')) return { bytes, mimeType: type };
  if (typeof createImageBitmap === 'undefined' || typeof OffscreenCanvas === 'undefined') {
    throw new Error('prepareImage requires a browser with createImageBitmap and OffscreenCanvas');
  }
  const bmp = await createImageBitmap(blob);
  try {
    const isJpgPng = type === 'image/jpeg' || type === 'image/png';
    if (isJpgPng && Math.max(bmp.width, bmp.height) <= 2000) return { bytes, mimeType: type };
    const { w, h } = fitWithin(bmp.width, bmp.height);
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D canvas context');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);
    const out = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
    return { bytes: new Uint8Array(await out.arrayBuffer()), mimeType: 'image/jpeg' };
  } finally {
    bmp.close();
  }
}

function fitBox(w: number, h: number) {
  const boxW = A4_W - 2 * MARGIN;
  const boxH = A4_H - 2 * MARGIN - FOOTER_BAND;
  const s = Math.min(boxW / w, boxH / h);
  const sw = w * s;
  const sh = h * s;
  return { x: MARGIN + (boxW - sw) / 2, y: MARGIN + FOOTER_BAND + (boxH - sh) / 2, w: sw, h: sh };
}

export async function buildDeliverable(
  inputs: DeliverableInput[],
  meta: { requestNumber: string; date: Date },
): Promise<Uint8Array> {
  for (const i of inputs) {
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(i.mimeType)) {
      throw new Error(`Unsupported file type for deliverable: ${i.mimeType}`);
    }
  }
  const doc = await PDFDocument.create();
  for (const input of inputs) {
    if (input.mimeType === 'application/pdf') {
      const src = await PDFDocument.load(input.bytes);
      for (let i = 0; i < src.getPageCount(); i++) {
        const srcPage = src.getPage(i);
        const page = doc.addPage([A4_W, A4_H]);
        // pdf-lib cannot embed a page with no content stream; a blank page stays blank.
        if (!srcPage.node.Contents()) continue;
        const [ep] = await doc.embedPdf(src, [i]);
        const b = fitBox(ep.width, ep.height);
        page.drawPage(ep, { x: b.x, y: b.y, width: b.w, height: b.h });
      }
    } else {
      const img = input.mimeType === 'image/png' ? await doc.embedPng(input.bytes) : await doc.embedJpg(input.bytes);
      const page = doc.addPage([A4_W, A4_H]);
      const b = fitBox(img.width, img.height);
      page.drawImage(img, { x: b.x, y: b.y, width: b.w, height: b.h });
    }
  }
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const text = footerText(meta.requestNumber, meta.date);
  const tw = font.widthOfTextAtSize(text, FOOTER_SIZE);
  for (const page of doc.getPages()) {
    page.drawText(text, {
      x: Math.max(4, (A4_W - tw) / 2),
      y: MARGIN - 4,
      size: FOOTER_SIZE,
      font,
      color: rgb(0.45, 0.45, 0.45),
    });
  }
  return doc.save();
}
