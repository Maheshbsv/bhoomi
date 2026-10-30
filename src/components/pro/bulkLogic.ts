import { CreateRequestSchema, type CreateRequestInput } from '@/domain/schemas';
import { citizenStage } from '@/domain/status';
import type { ServiceRequest, ServiceType } from '@/domain/types';

export interface BulkRow {
  surveyNo: string;
  hissaNo?: string;
  period?: string;
  /** Fourth column. Its meaning depends on the service: owner (RTC), parties (MR) or grantee (LND). */
  notes?: string;
}

export type BulkService = 'OLD_RTC' | 'OLD_MR' | 'LND_FILE';
export const BULK_SERVICES: BulkService[] = ['OLD_RTC', 'OLD_MR', 'LND_FILE'];

export interface BulkBase {
  serviceType: ServiceType;
  villageId: number;
  delivery: CreateRequestInput['delivery'];
  phone: string;
  matterTag: string;
  batchId?: string;
  /** OLD_MR only: chosen once for the whole batch. */
  natureOfAcquisition?: string;
}

const HEADER_WORDS = ['survey', 'ಸರ್ವೆ', 'ಸರ್ವೇ'];

/** Parses text pasted from Excel/Sheets (tab-separated) or typed as CSV. */
export function parsePastedRows(text: string): BulkRow[] {
  const lines = text.split(/\r\n|\r|\n/).filter((l) => l.trim() !== '');
  const rows: BulkRow[] = [];
  lines.forEach((line, i) => {
    const cells = (line.includes('\t') ? line.split('\t') : line.split(',')).map((c) => c.trim());
    if (i === 0) {
      const first = cells[0].toLowerCase();
      if (!/^\d/.test(first) && HEADER_WORDS.some((w) => first.includes(w))) return;
    }
    const [surveyNo = '', hissaNo, period, notes] = cells;
    if (!surveyNo && !hissaNo && !period && !notes) return;
    const row: BulkRow = { surveyNo };
    if (hissaNo) row.hissaNo = hissaNo;
    if (period) row.period = period;
    if (notes) row.notes = notes;
    rows.push(row);
  });
  return rows;
}

const isBlank = (r: BulkRow) => !r.surveyNo?.trim() && !r.hissaNo?.trim() && !r.period?.trim() && !r.notes?.trim();

const YEAR_ERR = 'errors.yearRange';

/** null = no period given; undefined = not a year or YYYY-YYYY. */
function parsePeriod(raw: string | undefined): { from: number; to: number } | null | undefined {
  const p = raw?.trim();
  if (!p) return null;
  const single = /^(\d{4})$/.exec(p);
  if (single) return { from: Number(single[1]), to: Number(single[1]) };
  const range = /^(\d{4})\s*[-–—]\s*(\d{4})$/.exec(p);
  if (range) return { from: Number(range[1]), to: Number(range[2]) };
  return undefined;
}

function detailsFor(row: BulkRow, base: BulkBase, period: { from: number; to: number } | null): Record<string, unknown> {
  const common = { serviceType: base.serviceType, surveyNo: row.surveyNo?.trim(), hissaNo: row.hissaNo?.trim() };
  const notes = row.notes?.trim();
  switch (base.serviceType) {
    case 'OLD_RTC':
      return { ...common, yearFrom: period?.from, yearTo: period?.to, recordedOwnerName: notes };
    case 'OLD_MR':
      return {
        ...common,
        approxYear: period && period.from === period.to ? period.from : period ? NaN : undefined,
        natureOfAcquisition: base.natureOfAcquisition || undefined,
        partiesInvolved: notes,
      };
    case 'LND_FILE':
      return { ...common, granteeName: notes, grantYear: period && period.from === period.to ? period.from : period ? NaN : undefined };
    default:
      return common;
  }
}

/** Validates every non-blank row. `errors[].row` is the index in `rows` (blank rows keep their slot). */
export function rowsToInputs(
  rows: BulkRow[],
  base: BulkBase,
): { inputs: CreateRequestInput[]; errors: { row: number; key: string }[] } {
  const inputs: CreateRequestInput[] = [];
  const errors: { row: number; key: string }[] = [];
  rows.forEach((row, index) => {
    if (isBlank(row)) return;
    const period = parsePeriod(row.period);
    if (period === undefined) {
      errors.push({ row: index, key: YEAR_ERR });
      return;
    }
    const parsed = CreateRequestSchema.safeParse({
      details: detailsFor(row, base, period),
      villageId: base.villageId,
      delivery: base.delivery,
      phone: base.phone,
      matterTag: base.matterTag,
      batchId: base.batchId,
    });
    if (parsed.success) {
      inputs.push(parsed.data);
      return;
    }
    const msg = parsed.error.issues[0]?.message;
    errors.push({ row: index, key: msg?.startsWith('errors.') ? msg : 'errors.required' });
  });
  return { inputs, errors };
}

/** Last 10 digits of a stored E.164 number. */
export const phone10 = (phoneNumber: string): string => phoneNumber.replace(/\D/g, '').slice(-10);

export const NO_MATTER = '__none__';

export interface MatterGroup {
  key: string;
  total: number;
  delivered: number;
  requests: ServiceRequest[];
}

/** Groups requests by matter tag; untagged requests go under NO_MATTER. Largest matters first. */
export function groupMatters(requests: ServiceRequest[]): MatterGroup[] {
  const map = new Map<string, MatterGroup>();
  for (const r of requests) {
    const key = r.matterTag?.trim() || NO_MATTER;
    const g = map.get(key) ?? { key, total: 0, delivered: 0, requests: [] };
    g.total += 1;
    if (citizenStage(r.status) === 4) g.delivered += 1;
    g.requests.push(r);
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => (a.key === NO_MATTER ? 1 : b.key === NO_MATTER ? -1 : b.total - a.total));
}
