import { describe, expect, it } from 'vitest';
import { applyQueueQuery, sanitiseLocationFilter, type QueueRow } from '@/components/admin/queueData';
import type { Location } from '@/domain/types';

const row = (i: number, slaHours: number, updatedAt: string): QueueRow =>
  ({
    id: `r${i}`,
    requestNumber: `KAR-2026-RTC-${1000 + i}`,
    slaHours,
    sla: 'green',
    updatedAt,
  }) as unknown as QueueRow;

const rows = Array.from({ length: 45 }, (_, i) =>
  row(i, (i * 7) % 45, new Date(Date.UTC(2026, 9, 1, 0, (i * 11) % 45)).toISOString()),
);

describe('applyQueueQuery', () => {
  it('pages by 20', () => {
    const q = { sort: 'age' as const, pageSize: 20 as const };
    const p2 = applyQueueQuery(rows, { ...q, page: 2 });
    const p3 = applyQueueQuery(rows, { ...q, page: 3 });
    expect(p2.rows).toHaveLength(20);
    expect(p3.rows).toHaveLength(5);
    expect(p2.total).toBe(45);
    expect(p3.total).toBe(45);
  });
  it('sorts by age, largest first', () => {
    const { rows: out } = applyQueueQuery(rows, { sort: 'age', page: 1, pageSize: 20 });
    const hours = out.map((r) => r.slaHours);
    expect(hours).toEqual([...hours].sort((a, b) => b - a));
    expect(hours[0]).toBe(Math.max(...rows.map((r) => r.slaHours)));
  });
  it('sorts by updated, newest first', () => {
    const { rows: out } = applyQueueQuery(rows, { sort: 'updated', page: 1, pageSize: 20 });
    const times = out.map((r) => Date.parse(r.updatedAt));
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(times[0]).toBe(Math.max(...rows.map((r) => Date.parse(r.updatedAt))));
  });
  it('out-of-range page is empty with the correct total', () => {
    const out = applyQueueQuery(rows, { sort: 'age', page: 9, pageSize: 20 });
    expect(out.rows).toEqual([]);
    expect(out.total).toBe(45);
  });
  it('does not mutate the input', () => {
    const copy = [...rows];
    applyQueueQuery(rows, { sort: 'age', page: 1, pageSize: 20 });
    expect(rows).toEqual(copy);
  });
});

describe('sanitiseLocationFilter', () => {
  const loc = (districtEn: string, talukEn: string) =>
    ({ districtEn, districtKn: districtEn, talukEn, talukKn: talukEn, isActive: true }) as unknown as Location;
  const locs = [loc('A', 'A1'), loc('A', 'A2'), loc('B', 'B1')];
  const base = { sort: 'age' as const, page: 1, closed: false };

  it('drops an unknown district (and its taluk)', () => {
    const s = sanitiseLocationFilter({ ...base, districtEn: 'Nope', talukEn: 'A1' }, locs);
    expect(s.districtEn).toBeUndefined();
    expect(s.talukEn).toBeUndefined();
  });
  it('drops a taluk that is not in the district', () => {
    const s = sanitiseLocationFilter({ ...base, districtEn: 'A', talukEn: 'B1' }, locs);
    expect(s.districtEn).toBe('A');
    expect(s.talukEn).toBeUndefined();
  });
  it('drops a taluk when there is no district', () => {
    expect(sanitiseLocationFilter({ ...base, talukEn: 'A1' }, locs).talukEn).toBeUndefined();
  });
  it('keeps a valid pair unchanged', () => {
    const s = { ...base, districtEn: 'A', talukEn: 'A2' };
    expect(sanitiseLocationFilter(s, locs)).toEqual(s);
  });
});
