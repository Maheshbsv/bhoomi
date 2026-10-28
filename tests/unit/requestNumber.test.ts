import { describe, expect, it } from 'vitest';
import { formatRequestNumber, normalizeRequestNumber } from '@/domain/requestNumber';

describe('request numbers', () => {
  it('formats', () => {
    expect(formatRequestNumber('OLD_RTC', 2026, 1082)).toBe('KAR-2026-RTC-1082');
  });
  it('normalises messy input', () => {
    expect(normalizeRequestNumber('  kar-2026-rtc-1082 ')).toBe('KAR-2026-RTC-1082');
    expect(normalizeRequestNumber('hello')).toBeNull();
    expect(normalizeRequestNumber('')).toBeNull();
    expect(normalizeRequestNumber('KAR-2026-XYZ-1082')).toBeNull();
  });
});
