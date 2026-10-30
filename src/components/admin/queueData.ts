import type { DataStore, RequestFilter } from '@/data/DataStore';
import { districtsOf, taluksOf } from '@/domain/locations';
import { slaColor, slaHours } from '@/domain/sla';
import { isTerminal } from '@/domain/status';
import type { Location, OrderStatus, ServiceRequest, ServiceType } from '@/domain/types';

export type SlaColor = 'green' | 'orange' | 'red';

export type QueueRow = ServiceRequest & { location: Location; slaHours: number; sla: SlaColor };

export interface QueueQuery {
  sort: 'age' | 'updated';
  /** 1-based. */
  page: number;
  pageSize: 20;
}

/** Pure: sort, then slice one page. `total` is the unpaged row count. */
export function applyQueueQuery(rows: QueueRow[], q: QueueQuery): { rows: QueueRow[]; total: number } {
  const sorted = [...rows].sort((a, b) =>
    q.sort === 'age' ? b.slaHours - a.slaHours : Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
  const start = (Math.max(1, q.page) - 1) * q.pageSize;
  return { rows: sorted.slice(start, start + q.pageSize), total: rows.length };
}

/** List requests and attach location and SLA. Demo scale only: one getRequest per row. */
export async function loadQueueRows(store: DataStore, filter: RequestFilter, now: Date): Promise<QueueRow[]> {
  const list = await store.listRequests(filter, now);
  const details = await Promise.all(list.map((r) => store.getRequest(r.id)));
  const out: QueueRow[] = [];
  for (const d of details) {
    if (!d) continue;
    const hours = slaHours(d.request.createdAt, d.timeline, now);
    out.push({ ...d.request, location: d.location, slaHours: hours, sla: slaColor(hours) });
  }
  return out;
}

/** Count open (non-terminal) rows by SLA colour. */
export function countBySla(rows: QueueRow[]): Record<SlaColor, number> {
  const c: Record<SlaColor, number> = { green: 0, orange: 0, red: 0 };
  for (const r of rows) if (!isTerminal(r.status)) c[r.sla] += 1;
  return c;
}

/** "3d 4h", "5h", "<1h". Units are passed in so the caller can localise. */
export function formatAge(hours: number, u: { d: string; h: string; lt1h: string }): string {
  const total = Math.floor(hours);
  if (total < 1) return u.lt1h;
  const d = Math.floor(total / 24);
  const h = total % 24;
  if (d === 0) return `${h}${u.h}`;
  return h === 0 ? `${d}${u.d}` : `${d}${u.d} ${h}${u.h}`;
}

export const SERVICE_TYPES: ServiceType[] = ['OLD_RTC', 'OLD_MR', 'LND_FILE', 'LRF_FILE', 'RRT_FILE'];
export const STATUSES: OrderStatus[] = [
  'SUBMITTED', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'CUSTOMER_RESPONDED', 'ASSIGNED_TO_RUNNER',
  'ARCHIVE_SEARCH_IN_PROGRESS', 'DOCUMENT_RETRIEVED', 'QC_WATERMARK_MERGE', 'RECORD_UNAVAILABLE',
  'DELIVERED', 'CANCELLED',
];

/** Everything the queue URL carries. */
export interface QueueUrlState {
  districtEn?: string;
  talukEn?: string;
  serviceType?: ServiceType;
  status?: OrderStatus;
  sla?: SlaColor;
  q?: string;
  sort: 'age' | 'updated';
  page: number;
  closed: boolean;
}

/** Lenient parse: unknown or malformed values are dropped, never thrown. */
export function parseQueueParams(p: { get(k: string): string | null }): QueueUrlState {
  const get = (k: string) => (p.get(k) ?? '').trim() || undefined;
  const serviceType = get('service');
  const status = get('status');
  const sla = get('sla');
  const page = Number.parseInt(p.get('page') ?? '', 10);
  return {
    districtEn: get('district'),
    talukEn: get('taluk'),
    serviceType: SERVICE_TYPES.includes(serviceType as ServiceType) ? (serviceType as ServiceType) : undefined,
    status: STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : undefined,
    sla: sla === 'green' || sla === 'orange' || sla === 'red' ? sla : undefined,
    q: get('q'),
    sort: p.get('sort') === 'updated' ? 'updated' : 'age',
    page: Number.isFinite(page) && page > 0 ? page : 1,
    closed: p.get('closed') === '1',
  };
}

/** Defaults are omitted so shared URLs stay short. */
export function toQueueSearch(s: QueueUrlState): string {
  const p = new URLSearchParams();
  if (s.districtEn) p.set('district', s.districtEn);
  if (s.talukEn) p.set('taluk', s.talukEn);
  if (s.serviceType) p.set('service', s.serviceType);
  if (s.status) p.set('status', s.status);
  if (s.sla) p.set('sla', s.sla);
  if (s.q) p.set('q', s.q);
  if (s.sort !== 'age') p.set('sort', s.sort);
  if (s.page > 1) p.set('page', String(s.page));
  if (s.closed) p.set('closed', '1');
  return p.toString();
}

/** The SLA colour is applied client-side so the header counts still cover every colour. */
export function toStoreFilter(s: QueueUrlState): RequestFilter {
  return {
    districtEn: s.districtEn,
    talukEn: s.talukEn,
    serviceType: s.serviceType,
    status: s.status,
    q: s.q,
  };
}

/** Terminal rows are hidden unless asked for, either by the toggle or an explicit terminal status filter. */
export function visibleRows(rows: QueueRow[], s: QueueUrlState): QueueRow[] {
  const showClosed = s.closed || (s.status !== undefined && isTerminal(s.status));
  return showClosed ? rows : rows.filter((r) => !isTerminal(r.status));
}

export function filterBySla(rows: QueueRow[], sla?: SlaColor): QueueRow[] {
  return sla ? rows.filter((r) => !isTerminal(r.status) && r.sla === sla) : rows;
}

/** Drop a district or taluk the location master does not know, so no invisible filter stays active. */
export function sanitiseLocationFilter(s: QueueUrlState, locations: Location[]): QueueUrlState {
  const districtEn = s.districtEn && districtsOf(locations).some((d) => d.en === s.districtEn) ? s.districtEn : undefined;
  const talukEn =
    districtEn && s.talukEn && taluksOf(locations, districtEn).some((t) => t.en === s.talukEn) ? s.talukEn : undefined;
  return { ...s, districtEn, talukEn };
}
