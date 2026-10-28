import type { ServiceType } from '@/domain/types';
import type { FieldName } from './fieldLabels';

export type FieldKind = 'survey' | 'text' | 'year' | 'select' | 'textarea';

export interface FieldDef {
  name: FieldName;
  kind: FieldKind;
  required: boolean;
  options?: string[];
}

const survey = (required: boolean): FieldDef => ({ name: 'surveyNo', kind: 'survey', required });
const hissa: FieldDef = { name: 'hissaNo', kind: 'survey', required: false };
const text = (name: FieldName, required = false): FieldDef => ({ name, kind: 'text', required });
const year = (name: FieldName, required = false): FieldDef => ({ name, kind: 'year', required });

/** Spec §4. Order is the order shown on screen. */
export const SERVICE_FIELDS: Record<ServiceType, FieldDef[]> = {
  OLD_RTC: [survey(true), hissa, year('yearFrom', true), year('yearTo', true), text('khataNo'), text('recordedOwnerName')],
  OLD_MR: [
    survey(true),
    hissa,
    text('mrNumber'),
    year('approxYear', true),
    { name: 'natureOfAcquisition', kind: 'select', required: true, options: ['SALE', 'INHERITANCE', 'PARTITION', 'GIFT', 'COURT_ORDER'] },
    { name: 'partiesInvolved', kind: 'textarea', required: false },
  ],
  LND_FILE: [survey(true), hissa, text('granteeName', true), text('grantOrderNo'), text('saguvaliChitNo'), year('grantYear')],
  LRF_FILE: [
    survey(false),
    hissa,
    { name: 'formType', kind: 'select', required: true, options: ['FORM_7', 'FORM_7A', 'OCCUPANCY_CERT'] },
    text('applicantTenantName', true),
    text('landlordName'),
    text('tribunalCaseNo'),
  ],
  RRT_FILE: [
    survey(false),
    hissa,
    { name: 'courtLevel', kind: 'select', required: true, options: ['TAHSILDAR', 'AC', 'DC'] },
    text('disputeCaseNo'),
    text('petitionerName', true),
    text('respondentName'),
    year('disputeYear', true),
  ],
};
