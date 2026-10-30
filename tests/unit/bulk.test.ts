import { describe, expect, it } from 'vitest';
import { parsePastedRows, rowsToInputs, groupMatters, NO_MATTER } from '@/components/pro/bulkLogic';
import type { ServiceRequest } from '@/domain/types';

const base = {
  serviceType: 'OLD_RTC' as const,
  villageId: 1,
  delivery: { mode: 'DIGITAL' as const },
  phone: '9000000005',
  matterTag: 'Devanahalli 15-Acre Title Verification',
};

describe('parsePastedRows', () => {
  it('parses the brief example', () => {
    expect(parsePastedRows('Survey\tHissa\tPeriod\n45\t2B\t1975-1982\n\n108/A\t*\t1990')).toEqual([
      { surveyNo: '45', hissaNo: '2B', period: '1975-1982' },
      { surveyNo: '108/A', hissaNo: '*', period: '1990' },
    ]);
  });
  it('handles CRLF from Excel', () => {
    expect(parsePastedRows('Survey\tHissa\r\n45\t2B\r\n46\t3\r\n')).toEqual([
      { surveyNo: '45', hissaNo: '2B' },
      { surveyNo: '46', hissaNo: '3' },
    ]);
  });
  it('accepts commas when there is no tab', () => {
    expect(parsePastedRows('45, 2B, 1975-1982, Rama')).toEqual([
      { surveyNo: '45', hissaNo: '2B', period: '1975-1982', notes: 'Rama' },
    ]);
  });
  it('does not split a tab-separated cell on its commas', () => {
    expect(parsePastedRows('45\t2B\t1990\tRama, Krishna and sons')).toEqual([
      { surveyNo: '45', hissaNo: '2B', period: '1990', notes: 'Rama, Krishna and sons' },
    ]);
  });
  it('skips a Kannada header row', () => {
    expect(parsePastedRows('ಸರ್ವೆ ನಂಬರ್\tಹಿಸ್ಸಾ\n12\t1')).toEqual([{ surveyNo: '12', hissaNo: '1' }]);
  });
  it('omits empty optional cells', () => {
    expect(parsePastedRows('45\t\t\t')).toEqual([{ surveyNo: '45' }]);
  });
});

describe('rowsToInputs', () => {
  it('flags a reversed period and keeps the valid row', () => {
    const { inputs, errors } = rowsToInputs(
      [{ surveyNo: '45', period: '1982-1975' }, { surveyNo: '46', period: '1975-1982' }],
      base,
    );
    expect(inputs).toHaveLength(1);
    expect(errors).toEqual([{ row: 0, key: 'errors.yearOrder' }]);
  });
  it('maps RTC periods and passes the batch id and matter', () => {
    const { inputs } = rowsToInputs([{ surveyNo: '1', period: '1975' }], { ...base, batchId: 'b1' });
    expect(inputs[0].details).toMatchObject({ serviceType: 'OLD_RTC', yearFrom: 1975, yearTo: 1975, surveyNo: '1' });
    expect(inputs[0].batchId).toBe('b1');
    expect(inputs[0].matterTag).toBe(base.matterTag);
  });
  it('gives errors.yearRange for a non-year period', () => {
    const { inputs, errors } = rowsToInputs([{ surveyNo: '1', period: 'abc' }, { surveyNo: '2', period: '75' }], base);
    expect(inputs).toHaveLength(0);
    expect(errors).toEqual([{ row: 0, key: 'errors.yearRange' }, { row: 1, key: 'errors.yearRange' }]);
  });
  it('ignores blank rows but keeps row indices', () => {
    const { inputs, errors } = rowsToInputs(
      [{ surveyNo: '' }, { surveyNo: '5', period: 'x' }, { surveyNo: '  ' }],
      base,
    );
    expect(inputs).toHaveLength(0);
    expect(errors).toEqual([{ row: 1, key: 'errors.yearRange' }]);
  });
  it('requires a grantee for LND_FILE and maps notes to it', () => {
    const lnd = { ...base, serviceType: 'LND_FILE' as const };
    expect(rowsToInputs([{ surveyNo: '9' }], lnd).errors).toEqual([{ row: 0, key: 'errors.required' }]);
    const ok = rowsToInputs([{ surveyNo: '9', notes: 'ರಾಮಪ್ಪ', period: '1965' }], lnd);
    expect(ok.errors).toEqual([]);
    expect(ok.inputs[0].details).toMatchObject({ granteeName: 'ರಾಮಪ್ಪ', grantYear: 1965 });
  });
  it('requires an acquisition type for OLD_MR and maps parties', () => {
    const mr = { ...base, serviceType: 'OLD_MR' as const };
    expect(rowsToInputs([{ surveyNo: '9', period: '1980' }], mr).errors).toEqual([{ row: 0, key: 'errors.required' }]);
    const ok = rowsToInputs([{ surveyNo: '9', period: '1980', notes: 'A to B' }], { ...mr, natureOfAcquisition: 'SALE' });
    expect(ok.errors).toEqual([]);
    expect(ok.inputs[0].details).toMatchObject({ approxYear: 1980, natureOfAcquisition: 'SALE', partiesInvolved: 'A to B' });
  });
});

describe('groupMatters', () => {
  const r = (id: string, matterTag: string | undefined, status: ServiceRequest['status']) =>
    ({ id, matterTag, status }) as ServiceRequest;
  it('groups, counts delivered and collects untagged requests', () => {
    const g = groupMatters([r('1', 'A', 'DELIVERED'), r('2', 'A', 'SUBMITTED'), r('3', undefined, 'DELIVERED')]);
    expect(g.find((m) => m.key === 'A')).toMatchObject({ total: 2, delivered: 1 });
    expect(g.find((m) => m.key === NO_MATTER)).toMatchObject({ total: 1, delivered: 1 });
  });
});

describe('range period on single-year services', () => {
  it.each(['OLD_MR', 'LND_FILE'] as const)('%s reports the year message, not a NaN schema error', (serviceType) => {
    const { inputs, errors } = rowsToInputs([{ surveyNo: '45', period: '1975-1982', notes: 'Rama' }], {
      ...base,
      serviceType,
      natureOfAcquisition: 'SALE',
    });
    expect(inputs).toHaveLength(0);
    expect(errors).toEqual([{ row: 0, key: 'errors.yearRange' }]);
  });
  it('a same-year range is a single year; RTC still takes a real range', () => {
    expect(rowsToInputs([{ surveyNo: '45', period: '1980-1980', notes: 'Rama' }], { ...base, serviceType: 'LND_FILE' }).errors).toEqual([]);
    expect(rowsToInputs([{ surveyNo: '45', period: '1975-1982' }], base).errors).toEqual([]);
  });
});
