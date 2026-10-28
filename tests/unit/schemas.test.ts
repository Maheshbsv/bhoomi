import { describe, it, expect } from 'vitest';
import {
  ServiceDetailsSchema,
  ShippingAddressSchema,
  DeliverySchema,
  PhoneSchema,
  CreateRequestSchema,
  periodLabel,
  toServiceMetadata,
} from '@/domain/schemas';

const rtc = { serviceType: 'OLD_RTC' as const, surveyNo: '108/A', yearFrom: 1975, yearTo: 1982 };
const addr = { name: 'A', line1: 'L1', city: 'Mysuru', district: 'Mysuru', pincode: '570001' };

describe('ServiceDetailsSchema', () => {
  it('accepts valid RTC and rejects bad ones', () => {
    expect(ServiceDetailsSchema.safeParse(rtc).success).toBe(true);
    expect(ServiceDetailsSchema.safeParse({ ...rtc, surveyNo: '' }).success).toBe(false);
    expect(ServiceDetailsSchema.safeParse({ ...rtc, surveyNo: '   ' }).success).toBe(false);
    expect(ServiceDetailsSchema.safeParse({ ...rtc, yearFrom: 1990, yearTo: 1980 }).success).toBe(false);
    expect(ServiceDetailsSchema.safeParse({ ...rtc, yearFrom: 1899 }).success).toBe(false);
  });
  it('uses i18n keys for messages', () => {
    const r = ServiceDetailsSchema.safeParse({ ...rtc, yearFrom: 1990, yearTo: 1980 });
    expect(JSON.stringify(r.error?.issues)).toContain('errors.yearOrder');
    const r2 = ServiceDetailsSchema.safeParse({ ...rtc, surveyNo: '' });
    expect(JSON.stringify(r2.error?.issues)).toContain('errors.required');
  });
  it('LRF: surveyNo optional, Kannada kept', () => {
    const r = ServiceDetailsSchema.safeParse({ serviceType: 'LRF_FILE', formType: 'FORM_7', applicantTenantName: ' ರುದ್ರಪ್ಪ ' });
    expect(r.success).toBe(true);
    if (r.success && r.data.serviceType === 'LRF_FILE') expect(r.data.applicantTenantName).toBe('ರುದ್ರಪ್ಪ');
    expect(ServiceDetailsSchema.safeParse({ serviceType: 'LRF_FILE', formType: 'FORM_9', applicantTenantName: 'x' }).success).toBe(false);
  });
  it('RRT requires disputeYear; courtLevel enum', () => {
    expect(ServiceDetailsSchema.safeParse({ serviceType: 'RRT_FILE', courtLevel: 'AC', petitionerName: 'Anjanappa' }).success).toBe(false);
    expect(ServiceDetailsSchema.safeParse({ serviceType: 'RRT_FILE', courtLevel: 'AC', petitionerName: 'Anjanappa', disputeYear: 1999 }).success).toBe(true);
    expect(ServiceDetailsSchema.safeParse({ serviceType: 'RRT_FILE', courtLevel: 'HC', petitionerName: 'A', disputeYear: 1999 }).success).toBe(false);
  });
  it('MR and LND required fields', () => {
    const mr = { serviceType: 'OLD_MR', surveyNo: '5', approxYear: 1960, natureOfAcquisition: 'SALE' };
    expect(ServiceDetailsSchema.safeParse(mr).success).toBe(true);
    expect(ServiceDetailsSchema.safeParse({ ...mr, natureOfAcquisition: 'LEASE' }).success).toBe(false);
    expect(ServiceDetailsSchema.safeParse({ serviceType: 'LND_FILE', surveyNo: '5', granteeName: 'X' }).success).toBe(true);
    expect(ServiceDetailsSchema.safeParse({ serviceType: 'LND_FILE', granteeName: 'X' }).success).toBe(false);
  });
});

describe('Phone / Delivery / address', () => {
  it('phone', () => {
    expect(PhoneSchema.safeParse('9876543210').success).toBe(true);
    expect(PhoneSchema.safeParse('5123456789').success).toBe(false);
  });
  it('address pincode', () => {
    expect(ShippingAddressSchema.safeParse(addr).success).toBe(true);
    expect(ShippingAddressSchema.safeParse({ ...addr, pincode: '57000' }).success).toBe(false);
  });
  it('delivery', () => {
    expect(DeliverySchema.safeParse({ mode: 'PHYSICAL' }).success).toBe(false);
    expect(DeliverySchema.safeParse({ mode: 'BOTH' }).success).toBe(false);
    expect(DeliverySchema.safeParse({ mode: 'DIGITAL' }).success).toBe(true);
    expect(DeliverySchema.safeParse({ mode: 'PHYSICAL', address: addr }).success).toBe(true);
    expect(DeliverySchema.safeParse({ mode: 'DIGITAL', email: 'bad' }).success).toBe(false);
    expect(DeliverySchema.safeParse({ mode: 'DIGITAL', email: 'a@b.com' }).success).toBe(true);
  });
});

describe('CreateRequestSchema & helpers', () => {
  it('parses full request', () => {
    const r = CreateRequestSchema.safeParse({ details: rtc, villageId: 1, delivery: { mode: 'DIGITAL' }, phone: '9876543210', matterTag: 'M1' });
    expect(r.success).toBe(true);
  });
  it('periodLabel', () => {
    expect(periodLabel(rtc)).toBe('1975–1982');
    expect(periodLabel({ ...rtc, yearTo: 1975 })).toBe('1975');
    expect(periodLabel({ serviceType: 'OLD_MR', surveyNo: '1', approxYear: 1960, natureOfAcquisition: 'GIFT' })).toBe('1960');
    expect(periodLabel({ serviceType: 'LND_FILE', surveyNo: '1', granteeName: 'x', grantYear: 1950 })).toBe('1950');
    expect(periodLabel({ serviceType: 'LND_FILE', surveyNo: '1', granteeName: 'x' })).toBeUndefined();
    expect(periodLabel({ serviceType: 'LRF_FILE', formType: 'FORM_7', applicantTenantName: 'x' })).toBeUndefined();
    expect(periodLabel({ serviceType: 'RRT_FILE', courtLevel: 'DC', petitionerName: 'x', disputeYear: 1999 })).toBe('1999');
  });
  it('toServiceMetadata strips serviceType, surveyNo, hissaNo', () => {
    expect(toServiceMetadata({ ...rtc, hissaNo: '2', khataNo: 'K' })).toEqual({ yearFrom: 1975, yearTo: 1982, khataNo: 'K' });
  });
});
