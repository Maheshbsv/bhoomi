import { citizenNote } from '@/domain/track';
import type { TemplateKey } from '@/domain/templates';
import type { DeliveryMode, OrderStatus } from '@/domain/types';

export const PDF_LIMIT_BYTES = 10 * 1024 * 1024;

const SCAN_STATUSES: OrderStatus[] = ['ARCHIVE_SEARCH_IN_PROGRESS', 'DOCUMENT_RETRIEVED', 'QC_WATERMARK_MERGE'];

/** Moves the item at `from` to position `to` (drag and drop). Equal or out-of-range indexes return a copy. */
export function moveItem(ids: string[], from: number, to: number): string[] {
  if (from === to || from < 0 || to < 0 || from >= ids.length || to >= ids.length) return [...ids];
  const next = [...ids];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Returns a new order with the item at `index` swapped one place up (-1) or down (+1). No-op at the ends. */
export function scanOrderAfterMove(ids: string[], index: number, dir: -1 | 1): string[] {
  return moveItem(ids, index, index + dir);
}

/** Keeps the operator's local order, drops ids that no longer exist and appends new ones (given in createdAt order). */
export function reconcileOrder(prev: string[], current: string[]): string[] {
  const set = new Set(current);
  const kept = prev.filter((id) => set.has(id));
  const known = new Set(kept);
  return [...kept, ...current.filter((id) => !known.has(id))];
}

export function canUploadScan(status: OrderStatus): boolean {
  return SCAN_STATUSES.includes(status);
}

export function canGenerate(a: { status: OrderStatus; scanCount: number; hasFinal: boolean }): boolean {
  return canUploadScan(a.status) && a.scanCount > 0 && !a.hasFinal;
}

export function canDeliver(a: { status: OrderStatus; hasFinal: boolean }): boolean {
  return a.status === 'QC_WATERMARK_MERGE' && a.hasFinal;
}

export function needsConsignment(mode: DeliveryMode): boolean {
  return mode !== 'DIGITAL';
}

export type OperatorNote = { kind: 'template'; key: TemplateKey } | { kind: 'raw'; text: string };

/** Operators see every timeline note: templates as template text, anything else as written. */
export function operatorNote(note: string | undefined): OperatorNote | null {
  if (!note) return null;
  const c = citizenNote(note);
  if (c?.kind === 'template') return { kind: 'template', key: c.key };
  return { kind: 'raw', text: note };
}
