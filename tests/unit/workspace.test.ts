import { describe, expect, it } from 'vitest';
import {
  canDeliver,
  moveItem,
  canGenerate,
  canUploadScan,
  needsConsignment,
  operatorNote,
  reconcileOrder,
  scanOrderAfterMove,
  scanSignature,
  PDF_LIMIT_BYTES,
} from '@/components/admin/workspaceLogic';

describe('scanOrderAfterMove', () => {
  const ids = ['a', 'b', 'c'];
  it('moves up and down', () => {
    expect(scanOrderAfterMove(ids, 1, -1)).toEqual(['b', 'a', 'c']);
    expect(scanOrderAfterMove(ids, 1, 1)).toEqual(['a', 'c', 'b']);
  });
  it('is a no-op at the ends and out of range', () => {
    expect(scanOrderAfterMove(ids, 0, -1)).toEqual(ids);
    expect(scanOrderAfterMove(ids, 2, 1)).toEqual(ids);
    expect(scanOrderAfterMove(ids, 9, 1)).toEqual(ids);
  });
  it('does not mutate the input', () => {
    scanOrderAfterMove(ids, 0, 1);
    expect(ids).toEqual(['a', 'b', 'c']);
  });
});

describe('reconcileOrder', () => {
  it('keeps the local order, drops missing ids, appends new ones', () => {
    expect(reconcileOrder(['c', 'a', 'x'], ['a', 'b', 'c'])).toEqual(['c', 'a', 'b']);
  });
});

describe('canUploadScan / canGenerate', () => {
  it('uploads only in the three working statuses', () => {
    expect(canUploadScan('ARCHIVE_SEARCH_IN_PROGRESS')).toBe(true);
    expect(canUploadScan('DOCUMENT_RETRIEVED')).toBe(true);
    expect(canUploadScan('QC_WATERMARK_MERGE')).toBe(true);
    expect(canUploadScan('UNDER_REVIEW')).toBe(false);
    expect(canUploadScan('DELIVERED')).toBe(false);
  });
  it('needs a working status, at least one scan and no existing final', () => {
    expect(canGenerate({ status: 'DOCUMENT_RETRIEVED', scanCount: 2, hasFinal: false })).toBe(true);
    expect(canGenerate({ status: 'DOCUMENT_RETRIEVED', scanCount: 0, hasFinal: false })).toBe(false);
    expect(canGenerate({ status: 'DOCUMENT_RETRIEVED', scanCount: 2, hasFinal: true })).toBe(false);
    expect(canGenerate({ status: 'ASSIGNED_TO_RUNNER', scanCount: 2, hasFinal: false })).toBe(false);
  });
});

describe('canDeliver', () => {
  it('only in QC with a final', () => {
    expect(canDeliver({ status: 'QC_WATERMARK_MERGE', hasFinal: true })).toBe(true);
    expect(canDeliver({ status: 'QC_WATERMARK_MERGE', hasFinal: false })).toBe(false);
    expect(canDeliver({ status: 'DOCUMENT_RETRIEVED', hasFinal: true })).toBe(false);
  });
});

describe('misc', () => {
  it('consignment for physical and both', () => {
    expect(needsConsignment('DIGITAL')).toBe(false);
    expect(needsConsignment('PHYSICAL')).toBe(true);
    expect(needsConsignment('BOTH')).toBe(true);
  });
  it('limit is 10 MiB', () => expect(PDF_LIMIT_BYTES).toBe(10 * 1024 * 1024));
  it('operatorNote shows templates as templates and other text raw', () => {
    expect(operatorNote('REQUEST_CLEARER_PHOTO')).toEqual({ kind: 'template', key: 'REQUEST_CLEARER_PHOTO' });
    expect(operatorNote('Assigned to Ravi')).toEqual({ kind: 'raw', text: 'Assigned to Ravi' });
    expect(operatorNote(undefined)).toBeNull();
  });
});

describe('moveItem', () => {
  it('drags an item to a new position', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c']);
    expect(moveItem(['a', 'b', 'c'], 5, 0)).toEqual(['a', 'b', 'c']);
  });
});

describe('scanSignature', () => {
  it('is equal for the same order and differs after reorder or addition', () => {
    expect(scanSignature(['a', 'b'])).toBe(scanSignature(['a', 'b']));
    expect(scanSignature(['a', 'b'])).not.toBe(scanSignature(['b', 'a']));
    expect(scanSignature(['a', 'b'])).not.toBe(scanSignature(['a', 'b', 'c']));
  });
});
