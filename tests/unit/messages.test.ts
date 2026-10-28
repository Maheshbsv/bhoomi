import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import kn from '../../messages/kn.json';

function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') Object.assign(out, flatten(v as Record<string, unknown>, key));
    else out[key] = String(v);
  }
  return out;
}

describe('messages', () => {
  const e = flatten(en);
  const k = flatten(kn);
  it('en and kn have identical key sets', () => {
    expect(Object.keys(k).sort()).toEqual(Object.keys(e).sort());
  });
  it('no empty values', () => {
    for (const [key, v] of Object.entries({ ...e })) expect(v.trim(), `en ${key}`).not.toBe('');
    for (const [key, v] of Object.entries(k)) expect(v.trim(), `kn ${key}`).not.toBe('');
  });
  it('covers all statuses, services, templates', () => {
    for (const s of ['SUBMITTED','UNDER_REVIEW','ACTION_REQUIRED','CUSTOMER_RESPONDED','ASSIGNED_TO_RUNNER','ARCHIVE_SEARCH_IN_PROGRESS','DOCUMENT_RETRIEVED','QC_WATERMARK_MERGE','RECORD_UNAVAILABLE','DELIVERED','CANCELLED'])
      expect(e[`status.${s}`], s).toBeTruthy();
    for (const s of ['OLD_RTC','OLD_MR','LND_FILE','LRF_FILE','RRT_FILE']) {
      expect(e[`services.${s}.name`]).toBeTruthy();
      expect(e[`services.${s}.desc`]).toBeTruthy();
    }
  });
});
