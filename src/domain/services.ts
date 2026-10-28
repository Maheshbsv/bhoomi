import type { ServiceType } from './types';

export const SERVICE_CATALOG: Record<
  ServiceType,
  { short: 'RTC' | 'MR' | 'LND' | 'LRF' | 'RRT'; surveyRequired: boolean; typicalDays: [number, number] }
> = {
  OLD_RTC: { short: 'RTC', surveyRequired: true, typicalDays: [5, 10] },
  OLD_MR: { short: 'MR', surveyRequired: true, typicalDays: [7, 14] },
  LND_FILE: { short: 'LND', surveyRequired: true, typicalDays: [10, 21] },
  LRF_FILE: { short: 'LRF', surveyRequired: false, typicalDays: [10, 21] },
  RRT_FILE: { short: 'RRT', surveyRequired: false, typicalDays: [14, 30] },
};
