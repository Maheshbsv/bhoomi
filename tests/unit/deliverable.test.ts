import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { buildDeliverable, fitWithin, footerText } from '@/pdf/deliverable';

const PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const png1x1 = { bytes: Uint8Array.from(Buffer.from(PNG_B64, 'base64')), mimeType: 'image/png' };
const date = new Date('2026-10-28T12:00:00Z');

async function twoPagePdf() {
  const d = await PDFDocument.create();
  d.addPage([300, 400]);
  d.addPage([600, 300]);
  return { bytes: await d.save(), mimeType: 'application/pdf' };
}

describe('footerText', () => {
  it('formats exactly', () => {
    expect(footerText('KAR-2026-RTC-1082', date)).toBe(
      'KAR-2026-RTC-1082 · Retrieved 28-Oct-2026 · Copy of archival record procured on request; not a certified copy unless stamped by the issuing office.',
    );
  });
  it('uses Sep not Sept, and IST date', () => {
    expect(footerText('X', new Date('2026-09-05T20:00:00Z'))).toContain('Retrieved 06-Sep-2026');
  });
});

describe('fitWithin', () => {
  it('downscales', () => expect(fitWithin(4000, 3000)).toEqual({ w: 2000, h: 1500 }));
  it('keeps small', () => expect(fitWithin(800, 600)).toEqual({ w: 800, h: 600 }));
});

describe('buildDeliverable', () => {
  it('merges to A4 pages', async () => {
    const out = await buildDeliverable([png1x1, png1x1, await twoPagePdf()], {
      requestNumber: 'KAR-2026-RTC-1082',
      date,
    });
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(4);
    doc.getPages().forEach((p) => {
      expect(Math.round(p.getWidth())).toBe(595);
      expect(Math.round(p.getHeight())).toBe(842);
    });
    expect(out.byteLength).toBeLessThan(10 * 1024 * 1024);
  });
  it('rejects unsupported types', async () => {
    await expect(
      buildDeliverable([{ bytes: new Uint8Array(1), mimeType: 'image/heic' }], { requestNumber: 'X', date }),
    ).rejects.toThrow(/image\/heic/);
  });
});
