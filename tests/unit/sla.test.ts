import { describe, expect, it } from 'vitest';
import { slaColor, slaHours } from '@/domain/sla';
import type { OrderStatus, TimelineEntry } from '@/domain/types';

const T0 = Date.parse('2026-10-01T00:00:00Z');
const t0 = new Date(T0).toISOString();
const h = (n: number) => new Date(T0 + n * 3600_000);
const entry = (from: OrderStatus, to: OrderStatus, at: Date): TimelineEntry => ({
  id: `${from}-${to}-${at.getTime()}`,
  requestId: 'r1',
  fromStatus: from,
  toStatus: to,
  createdAt: at.toISOString(),
});

describe('sla', () => {
  it('counts elapsed time', () => expect(slaHours(t0, [], h(50))).toBe(50));
  it('pauses during ACTION_REQUIRED', () => {
    expect(
      slaHours(t0, [entry('UNDER_REVIEW', 'ACTION_REQUIRED', h(10)), entry('ACTION_REQUIRED', 'CUSTOMER_RESPONDED', h(30))], h(60)),
    ).toBe(40);
  });
  it('stays paused while still ACTION_REQUIRED', () => {
    expect(slaHours(t0, [entry('UNDER_REVIEW', 'ACTION_REQUIRED', h(10))], h(60))).toBe(10);
  });
  it('stops at a terminal status', () => {
    expect(slaHours(t0, [entry('QC_WATERMARK_MERGE', 'DELIVERED', h(100))], h(200))).toBe(100);
  });
  it('colours at the boundaries', () => {
    expect([slaColor(47.9), slaColor(48), slaColor(96), slaColor(96.1)]).toEqual(['green', 'orange', 'orange', 'red']);
  });
});
