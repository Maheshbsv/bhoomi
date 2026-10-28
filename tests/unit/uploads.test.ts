import { describe, expect, it } from 'vitest';
import { validateUpload } from '@/domain/uploads';

describe('validateUpload', () => {
  it('rejects HEIC', () => expect(validateUpload({ name: 'a.heic', type: 'image/heic', size: 1e6 }, 0)).toEqual({ ok: false, reason: 'TYPE' }));
  it('rejects 15 MB', () =>
    expect(validateUpload({ name: 'a.jpg', type: 'image/jpeg', size: 15 * 1024 * 1024 }, 0)).toEqual({ ok: false, reason: 'SIZE' }));
  it('rejects sixth file', () => expect(validateUpload({ name: 'a.pdf', type: 'application/pdf', size: 1e6 }, 5)).toEqual({ ok: false, reason: 'COUNT' }));
  it('accepts exactly 10 MB as the fifth file', () =>
    expect(validateUpload({ name: 'a.png', type: 'image/png', size: 10 * 1024 * 1024 }, 4)).toEqual({ ok: true }));
});
