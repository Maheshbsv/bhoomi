import { describe, expect, it } from 'vitest';
import { canTransition, citizenStage, isTerminal, operatorNextStatuses, TRANSITIONS } from '@/domain/status';

describe('status machine', () => {
  it('allows and rejects transitions per spec', () => {
    expect(canTransition('SUBMITTED', 'UNDER_REVIEW')).toBe(true);
    expect(canTransition('DOCUMENT_RETRIEVED', 'DELIVERED')).toBe(false);
    expect(canTransition('ARCHIVE_SEARCH_IN_PROGRESS', 'ACTION_REQUIRED')).toBe(true);
  });
  it('operator options exclude CUSTOMER_RESPONDED', () => {
    expect(operatorNextStatuses('ACTION_REQUIRED')).toEqual(['CANCELLED']);
  });
  it('terminal states have no transitions', () => {
    expect(TRANSITIONS.DELIVERED).toEqual([]);
    expect(isTerminal('CANCELLED')).toBe(true);
    expect(isTerminal('SUBMITTED')).toBe(false);
  });
  it('maps citizen stages', () => {
    expect(citizenStage('CUSTOMER_RESPONDED')).toBe(1);
    expect(citizenStage('QC_WATERMARK_MERGE')).toBe(3);
    expect(citizenStage('DELIVERED')).toBe(4);
    expect(citizenStage('RECORD_UNAVAILABLE')).toBe('closed');
  });
});
