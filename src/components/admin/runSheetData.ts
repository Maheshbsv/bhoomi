import type { OrderStatus } from '@/domain/types';
import { FIELD_LABELS, type Dual } from '@/components/wizard/fieldLabels';
import { STATUSES, type QueueRow } from './queueData';

export const RUN_STATUSES: OrderStatus[] = ['ASSIGNED_TO_RUNNER', 'ARCHIVE_SEARCH_IN_PROGRESS'];

export interface RunSheetState {
  districtEn?: string;
  talukEn?: string;
  /** Empty means both run statuses. */
  status?: OrderStatus;
  runner?: string;
}

export function parseRunSheetParams(p: { get(k: string): string | null }): RunSheetState {
  const get = (k: string) => (p.get(k) ?? '').trim() || undefined;
  const status = get('status');
  return {
    districtEn: get('district'),
    talukEn: get('taluk'),
    status: RUN_STATUSES.includes(status as OrderStatus) && STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : undefined,
    runner: get('runner'),
  };
}

export function toRunSheetSearch(s: RunSheetState): string {
  const p = new URLSearchParams();
  if (s.districtEn) p.set('district', s.districtEn);
  if (s.talukEn) p.set('taluk', s.talukEn);
  if (s.status) p.set('status', s.status);
  if (s.runner) p.set('runner', s.runner);
  return p.toString();
}

/** Rows for the sheet: run statuses, optional single status and runner, ordered by village then number. */
export function runSheetRows(rows: QueueRow[], s: RunSheetState): QueueRow[] {
  const statuses = s.status ? [s.status] : RUN_STATUSES;
  return rows
    .filter((r) => statuses.includes(r.status) && (!s.runner || r.runnerName === s.runner))
    .sort(
      (a, b) =>
        a.location.hobliEn.localeCompare(b.location.hobliEn, 'en') ||
        a.location.villageEn.localeCompare(b.location.villageEn, 'en') ||
        a.requestNumber.localeCompare(b.requestNumber, 'en'),
    );
}

const NAME_FIELDS = [
  'granteeName',
  'applicantTenantName',
  'landlordName',
  'petitionerName',
  'respondentName',
  'recordedOwnerName',
  'partiesInvolved',
] as const satisfies readonly (keyof typeof FIELD_LABELS)[];

/** Name-like string values from serviceMetadata, labelled in both languages. Other fields are ignored. */
export function keyNames(meta: Record<string, unknown>): { label: Dual; value: string }[] {
  const out: { label: Dual; value: string }[] = [];
  for (const f of NAME_FIELDS) {
    const v = meta[f];
    if (typeof v === 'string' && v.trim()) out.push({ label: FIELD_LABELS[f], value: v.trim() });
  }
  return out;
}

export function runnerNames(rows: QueueRow[]): string[] {
  return [...new Set(rows.map((r) => r.runnerName).filter((n): n is string => Boolean(n)))].sort((a, b) =>
    a.localeCompare(b, 'en'),
  );
}
