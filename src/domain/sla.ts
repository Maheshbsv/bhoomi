import { isTerminal } from './status';
import type { OrderStatus, TimelineEntry } from './types';

const HOUR = 3_600_000;

/** Elapsed working-clock hours: paused in ACTION_REQUIRED, stopped at a terminal status. Rounded to 0.1h. */
export function slaHours(createdAt: string, timeline: TimelineEntry[], now: Date): number {
  const entries = [...timeline].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  let state: OrderStatus = 'SUBMITTED';
  let cursor = Date.parse(createdAt);
  let ms = 0;
  let stopped = false;
  for (const e of entries) {
    const at = Date.parse(e.createdAt);
    if (state !== 'ACTION_REQUIRED') ms += Math.max(0, at - cursor);
    state = e.toStatus;
    cursor = at;
    if (isTerminal(state)) {
      stopped = true;
      break;
    }
  }
  if (!stopped && state !== 'ACTION_REQUIRED') ms += Math.max(0, now.getTime() - cursor);
  return Math.round((ms / HOUR) * 10) / 10;
}

export function slaColor(hours: number): 'green' | 'orange' | 'red' {
  if (hours < 48) return 'green';
  if (hours <= 96) return 'orange';
  return 'red';
}
