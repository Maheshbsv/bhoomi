import { describe, expect, it } from 'vitest';
import { summarise, type OverviewRow } from '@/components/admin/overviewData';
import type { OrderStatus } from '@/domain/types';

const H = 3_600_000;
const T0 = Date.parse('2026-10-01T00:00:00Z');

function row(
  i: number,
  status: OrderStatus,
  sla: 'green' | 'orange' | 'red',
  taluk: string,
  opts: { district?: string; deliveredAfterH?: number } = {},
): OverviewRow {
  const district = opts.district ?? 'Mysuru';
  return {
    id: `r${i}`,
    status,
    sla,
    createdAt: new Date(T0).toISOString(),
    location: { districtEn: district, talukEn: taluk },
    timeline:
      opts.deliveredAfterH === undefined
        ? []
        : [
            {
              id: `t${i}`,
              requestId: `r${i}`,
              fromStatus: 'QC_WATERMARK_MERGE',
              toStatus: 'DELIVERED',
              createdAt: new Date(T0 + opts.deliveredAfterH * H).toISOString(),
            },
          ],
  } as unknown as OverviewRow;
}

const rows: OverviewRow[] = [
  row(1, 'DELIVERED', 'green', 'Hunsur', { deliveredAfterH: 72 }),
  row(2, 'DELIVERED', 'red', 'Hunsur', { deliveredAfterH: 120 }),
  row(3, 'RECORD_UNAVAILABLE', 'red', 'Hunsur'),
  row(4, 'UNDER_REVIEW', 'green', 'Hunsur'),
  row(5, 'ASSIGNED_TO_RUNNER', 'red', 'Nanjangud'),
  row(6, 'SUBMITTED', 'orange', 'Mysuru', { district: 'Mysuru' }),
];

describe('summarise', () => {
  const s = summarise(rows);
  it('counts by status', () => {
    expect(s.byStatus.DELIVERED).toBe(2);
    expect(s.byStatus.RECORD_UNAVAILABLE).toBe(1);
    expect(s.byStatus.CANCELLED).toBe(0);
  });
  it('counts open requests by SLA colour, ignoring terminal ones', () => {
    expect(s.bySla).toEqual({ green: 1, orange: 1, red: 1 });
  });
  it('averages days from creation to the DELIVERED entry', () => {
    expect(s.avgDaysToDeliver).toBe(4);
  });
  it('unavailable rate is over terminal requests', () => {
    expect(s.unavailableRate).toBeCloseTo(1 / 3);
  });
  it('per-taluk open and red counts, red first then open', () => {
    expect(s.byTaluk).toEqual([
      { districtEn: 'Mysuru', talukEn: 'Nanjangud', open: 1, red: 1 },
      { districtEn: 'Mysuru', talukEn: 'Hunsur', open: 1, red: 0 },
      { districtEn: 'Mysuru', talukEn: 'Mysuru', open: 1, red: 0 },
    ].sort((a, b) => b.red - a.red || b.open - a.open || a.talukEn.localeCompare(b.talukEn)));
  });
  it('null average and zero rate when nothing is terminal', () => {
    const e = summarise([row(1, 'SUBMITTED', 'green', 'Hunsur')]);
    expect(e.avgDaysToDeliver).toBeNull();
    expect(e.unavailableRate).toBe(0);
    expect(summarise([]).unavailableRate).toBe(0);
  });
  it('cancelled counts in the denominator', () => {
    const c = summarise([row(1, 'CANCELLED', 'green', 'A'), row(2, 'RECORD_UNAVAILABLE', 'red', 'A')]);
    expect(c.unavailableRate).toBe(0.5);
    expect(c.avgDaysToDeliver).toBeNull();
  });
  it('keeps same-named taluks in different districts apart', () => {
    const d = summarise([
      row(1, 'SUBMITTED', 'green', 'Mysuru', { district: 'Mysuru' }),
      row(2, 'SUBMITTED', 'green', 'Mysuru', { district: 'Other' }),
    ]);
    expect(d.byTaluk).toHaveLength(2);
  });
});

import { keyNames, parseRunSheetParams, runSheetRows } from '@/components/admin/runSheetData';
import type { QueueRow } from '@/components/admin/queueData';

describe('run sheet data', () => {
  it('keeps Kannada names unchanged and skips non-name fields', () => {
    const out = keyNames({ granteeName: ' ಸಿದ್ದರಾಮಯ್ಯ ', grantYear: 1984, landlordName: '', khataNo: '12' });
    expect(out).toHaveLength(1);
    expect(out[0].value).toBe('ಸಿದ್ದರಾಮಯ್ಯ');
  });
  it('parses leniently', () => {
    expect(parseRunSheetParams(new URLSearchParams('status=DELIVERED&taluk=%20Hunsur ')).status).toBeUndefined();
    expect(parseRunSheetParams(new URLSearchParams('taluk=%20Hunsur ')).talukEn).toBe('Hunsur');
  });
  it('filters to run statuses and runner', () => {
    const mk = (id: string, status: string, runnerName?: string) =>
      ({ id, status, runnerName, requestNumber: id, location: { hobliEn: 'h', villageEn: 'v' } }) as unknown as QueueRow;
    const rs = [mk('a', 'ASSIGNED_TO_RUNNER', 'Ravi'), mk('b', 'UNDER_REVIEW', 'Ravi'), mk('c', 'ARCHIVE_SEARCH_IN_PROGRESS', 'Sita')];
    expect(runSheetRows(rs, {}).map((r) => r.id)).toEqual(['a', 'c']);
    expect(runSheetRows(rs, { runner: 'Sita' }).map((r) => r.id)).toEqual(['c']);
    expect(runSheetRows(rs, { status: 'ASSIGNED_TO_RUNNER' }).map((r) => r.id)).toEqual(['a']);
  });
});
