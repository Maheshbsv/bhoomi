import type { DataStore } from '@/data/DataStore';
import { isTerminal } from '@/domain/status';
import type { OrderStatus, TimelineEntry } from '@/domain/types';
import { STATUSES, loadQueueRows, type QueueRow, type SlaColor } from './queueData';

/** A queue row plus its timeline, which is what the delivery time needs. */
export type OverviewRow = QueueRow & { timeline: TimelineEntry[] };

export interface TalukStat {
  districtEn: string;
  talukEn: string;
  open: number;
  red: number;
}

export interface Summary {
  byStatus: Record<OrderStatus, number>;
  /** Open (non-terminal) requests only. */
  bySla: Record<SlaColor, number>;
  byTaluk: TalukStat[];
  /** Mean days from creation to the DELIVERED entry; null when nothing was delivered. */
  avgDaysToDeliver: number | null;
  /** RECORD_UNAVAILABLE over all terminal requests (delivered, unavailable, cancelled); 0 when none. */
  unavailableRate: number;
}

const DAY = 86_400_000;

export function summarise(rows: OverviewRow[]): Summary {
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
  const bySla: Record<SlaColor, number> = { green: 0, orange: 0, red: 0 };
  const taluks = new Map<string, TalukStat>();
  const deliveredDays: number[] = [];
  let terminal = 0;
  let unavailable = 0;

  for (const r of rows) {
    byStatus[r.status] += 1;
    const open = !isTerminal(r.status);
    if (open) bySla[r.sla] += 1;
    else terminal += 1;
    if (r.status === 'RECORD_UNAVAILABLE') unavailable += 1;

    const key = `${r.location.districtEn}\u0000${r.location.talukEn}`;
    let t = taluks.get(key);
    if (!t) {
      t = { districtEn: r.location.districtEn, talukEn: r.location.talukEn, open: 0, red: 0 };
      taluks.set(key, t);
    }
    if (open) {
      t.open += 1;
      if (r.sla === 'red') t.red += 1;
    }

    if (r.status === 'DELIVERED') {
      const entry = r.timeline.find((e) => e.toStatus === 'DELIVERED');
      if (entry) deliveredDays.push((Date.parse(entry.createdAt) - Date.parse(r.createdAt)) / DAY);
    }
  }

  return {
    byStatus,
    bySla,
    byTaluk: [...taluks.values()].sort(
      (a, b) =>
        b.red - a.red || b.open - a.open || a.talukEn.localeCompare(b.talukEn, 'en') || a.districtEn.localeCompare(b.districtEn, 'en'),
    ),
    avgDaysToDeliver: deliveredDays.length ? deliveredDays.reduce((a, b) => a + b, 0) / deliveredDays.length : null,
    unavailableRate: terminal ? unavailable / terminal : 0,
  };
}

/** Every request with its timeline. Demo scale only. */
export async function loadOverviewRows(store: DataStore, now: Date): Promise<OverviewRow[]> {
  const rows: QueueRow[] = await loadQueueRows(store, {}, now);
  const details = await Promise.all(rows.map((r) => store.getRequest(r.id)));
  return rows.map((r, i) => ({ ...r, timeline: details[i]?.timeline ?? [] }));
}
