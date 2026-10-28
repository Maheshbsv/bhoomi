import { SERVICE_CATALOG } from './services';
import type { ServiceType } from './types';

export function formatRequestNumber(service: ServiceType, year: number, seq: number): string {
  return `KAR-${year}-${SERVICE_CATALOG[service].short}-${String(seq).padStart(4, '0')}`;
}

const PATTERN = /^KAR-\d{4}-(RTC|MR|LND|LRF|RRT)-\d{4,}$/;

export function normalizeRequestNumber(raw: string): string | null {
  const v = raw.trim().toUpperCase();
  return PATTERN.test(v) ? v : null;
}
