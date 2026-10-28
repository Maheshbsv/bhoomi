import { z } from 'zod';
import type { ShippingAddress } from './types';

const req = z.string().trim().min(1, 'errors.required');
const blankToUndef = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const opt = z.preprocess(blankToUndef, z.string().trim().optional()).optional();

const year = z.coerce
  .number('errors.yearRange')
  .int('errors.yearRange')
  .min(1900, 'errors.yearRange')
  .max(new Date().getFullYear(), 'errors.yearRange');
const optYear = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  year.optional(),
);

export const PhoneSchema = z.string().trim().regex(/^[6-9]\d{9}$/, 'errors.phone');

export const ShippingAddressSchema = z.object({
  name: req,
  line1: req,
  line2: opt,
  city: req,
  district: req,
  pincode: z.string().trim().regex(/^\d{6}$/, 'errors.pincode'),
});
// Compile-time check: schema output is assignable to the domain type.
type _AddrCheck = z.infer<typeof ShippingAddressSchema> extends ShippingAddress ? true : never;
const _addrCheck: _AddrCheck = true;
void _addrCheck;

const OldRtc = z
  .object({
    serviceType: z.literal('OLD_RTC'),
    surveyNo: req,
    hissaNo: opt,
    yearFrom: year,
    yearTo: year,
    khataNo: opt,
    recordedOwnerName: opt,
  })
  .refine((d) => d.yearFrom <= d.yearTo, { message: 'errors.yearOrder', path: ['yearTo'] });

const OldMr = z.object({
  serviceType: z.literal('OLD_MR'),
  surveyNo: req,
  hissaNo: opt,
  mrNumber: opt,
  approxYear: year,
  natureOfAcquisition: z.enum(['SALE', 'INHERITANCE', 'PARTITION', 'GIFT', 'COURT_ORDER'], 'errors.required'),
  partiesInvolved: opt,
});

const LndFile = z.object({
  serviceType: z.literal('LND_FILE'),
  surveyNo: req,
  hissaNo: opt,
  granteeName: req,
  grantOrderNo: opt,
  saguvaliChitNo: opt,
  grantYear: optYear,
});

const LrfFile = z.object({
  serviceType: z.literal('LRF_FILE'),
  surveyNo: opt,
  hissaNo: opt,
  formType: z.enum(['FORM_7', 'FORM_7A', 'OCCUPANCY_CERT'], 'errors.required'),
  applicantTenantName: req,
  landlordName: opt,
  tribunalCaseNo: opt,
});

const RrtFile = z.object({
  serviceType: z.literal('RRT_FILE'),
  surveyNo: opt,
  hissaNo: opt,
  courtLevel: z.enum(['TAHSILDAR', 'AC', 'DC'], 'errors.required'),
  disputeCaseNo: opt,
  petitionerName: req,
  respondentName: opt,
  disputeYear: year,
});

export const ServiceDetailsSchema = z.discriminatedUnion('serviceType', [
  OldRtc,
  OldMr,
  LndFile,
  LrfFile,
  RrtFile,
]);
export type ServiceDetails = z.infer<typeof ServiceDetailsSchema>;

export const DeliverySchema = z
  .object({
    mode: z.enum(['DIGITAL', 'PHYSICAL', 'BOTH']),
    address: ShippingAddressSchema.optional(),
    email: z.preprocess(blankToUndef, z.email().trim().optional()).optional(),
  })
  .refine((d) => d.mode === 'DIGITAL' || d.address !== undefined, {
    message: 'errors.addressRequired',
    path: ['address'],
  });

export const CreateRequestSchema = z.object({
  details: ServiceDetailsSchema,
  villageId: z.number().int(),
  delivery: DeliverySchema,
  phone: PhoneSchema,
  matterTag: opt,
  batchId: opt,
});
export type CreateRequestInput = z.infer<typeof CreateRequestSchema>;

export function toServiceMetadata(details: ServiceDetails): Record<string, unknown> {
  const { serviceType: _s, ...rest } = details;
  const meta: Record<string, unknown> = { ...rest };
  delete meta.surveyNo;
  delete meta.hissaNo;
  void _s;
  return meta;
}

export function periodLabel(details: ServiceDetails): string | undefined {
  switch (details.serviceType) {
    case 'OLD_RTC':
      return details.yearFrom === details.yearTo
        ? String(details.yearFrom)
        : `${details.yearFrom}–${details.yearTo}`;
    case 'OLD_MR':
      return String(details.approxYear);
    case 'LND_FILE':
      return details.grantYear === undefined ? undefined : String(details.grantYear);
    case 'RRT_FILE':
      return String(details.disputeYear);
    case 'LRF_FILE':
      return undefined;
  }
}
