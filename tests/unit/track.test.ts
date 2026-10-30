import { describe, expect, it } from 'vitest';
import { bannerMessage, citizenNote, customerDocuments, resolveTrackId } from '@/domain/track';
import type { RequestDocument, RequestMessage } from '@/domain/types';

const m = (o: Partial<RequestMessage> & { id: string; direction: RequestMessage['direction']; createdAt: string }): RequestMessage => ({
  requestId: 'r',
  ...o,
});
const d = (fileType: RequestDocument['fileType'], id = fileType): RequestDocument => ({
  id,
  requestId: 'r',
  fileType,
  storageKey: id,
  fileName: `${id}.pdf`,
  fileSizeBytes: 1,
  mimeType: 'application/pdf',
  createdAt: '2026-01-01T00:00:00Z',
});

describe('bannerMessage', () => {
  it('returns null with no outbound messages', () => {
    expect(bannerMessage([])).toBeNull();
    expect(bannerMessage([m({ id: '1', direction: 'INBOUND', body: 'hi', createdAt: '2026-01-01' })])).toBeNull();
  });
  it('picks the latest needs-reply outbound', () => {
    const msgs = [
      m({ id: '1', direction: 'OUTBOUND', templateKey: 'SURVEY_VILLAGE_MISMATCH', createdAt: '2026-01-01' }),
      m({ id: '2', direction: 'OUTBOUND', templateKey: 'REQUEST_CLEARER_PHOTO', createdAt: '2026-01-03' }),
    ];
    expect(bannerMessage(msgs)?.id).toBe('2');
  });
  it('skips a newer informational message', () => {
    const msgs = [
      m({ id: '1', direction: 'OUTBOUND', templateKey: 'SURVEY_VILLAGE_MISMATCH', createdAt: '2026-01-01' }),
      m({ id: '2', direction: 'OUTBOUND', templateKey: 'RECORD_BRITTLE_SEARCH_ONGOING', createdAt: '2026-01-03' }),
    ];
    expect(bannerMessage(msgs)?.id).toBe('1');
  });
  it('counts free-text outbound as needing a reply, regardless of input order', () => {
    const msgs = [
      m({ id: '2', direction: 'OUTBOUND', body: 'Please send father name', createdAt: '2026-01-03' }),
      m({ id: '1', direction: 'OUTBOUND', templateKey: 'RECORD_BRITTLE_SEARCH_ONGOING', createdAt: '2026-01-04' }),
    ];
    expect(bannerMessage(msgs)?.id).toBe('2');
  });
  it('returns null when only informational messages exist', () => {
    expect(
      bannerMessage([m({ id: '1', direction: 'OUTBOUND', templateKey: 'RECORD_BRITTLE_SEARCH_ONGOING', createdAt: '2026-01-01' })]),
    ).toBeNull();
  });
});

describe('customerDocuments', () => {
  it('keeps only final deliverable and endorsement certificate', () => {
    const out = customerDocuments([
      d('OPERATOR_SCAN'),
      d('CUSTOMER_REFERENCE'),
      d('FINAL_DELIVERABLE'),
      d('ENDORSEMENT_CERTIFICATE'),
    ]);
    expect(out.map((x) => x.fileType)).toEqual(['FINAL_DELIVERABLE', 'ENDORSEMENT_CERTIFICATE']);
  });
});

describe('resolveTrackId', () => {
  it('normalises messy input', () => {
    expect(resolveTrackId(' kar-2026-rtc-1001 ')).toBe('KAR-2026-RTC-1001');
  });
  it('returns null for blank or invalid', () => {
    expect(resolveTrackId(null)).toBeNull();
    expect(resolveTrackId('nope')).toBeNull();
  });
});

describe('citizenNote', () => {
  it('maps a template key to the template', () => {
    expect(citizenNote('REQUEST_CLEARER_PHOTO')).toEqual({ kind: 'template', key: 'REQUEST_CLEARER_PHOTO' });
    expect(citizenNote('SURVEY_VILLAGE_MISMATCH')).toEqual({ kind: 'template', key: 'SURVEY_VILLAGE_MISMATCH' });
  });
  it('maps the known system strings', () => {
    expect(citizenNote('Request submitted')).toEqual({ kind: 'system', key: 'submitted' });
    expect(citizenNote('Customer replied')).toEqual({ kind: 'system', key: 'customerReplied' });
    expect(citizenNote('Not found in taluk record room; endorsement certificate attached')).toEqual({ kind: 'system', key: 'notFound' });
    expect(citizenNote("Cancelled at the citizen's request")).toEqual({ kind: 'system', key: 'cancelled' });
  });
  it('hides runner and operator free-text notes', () => {
    expect(citizenNote('Assigned to Manjunath')).toBeNull();
    expect(citizenNote('Spoke to the tahsildar, volume 3 is damaged')).toBeNull();
    expect(citizenNote(undefined)).toBeNull();
    expect(citizenNote('')).toBeNull();
  });
});
