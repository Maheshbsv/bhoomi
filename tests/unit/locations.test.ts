import { describe, expect, it } from 'vitest';
import { districtsOf, hoblisOf, taluksOf, villagesOf } from '@/domain/locations';
import type { Location } from '@/domain/types';

const row = (id: number, talukEn: string, hobliEn: string, villageEn: string): Location => ({
  id, districtEn: 'Bengaluru Urban', districtKn: 'ಬೆಂಗಳೂರು ನಗರ', talukEn, talukKn: talukEn + '-kn',
  hobliEn, hobliKn: hobliEn + '-kn', villageEn, villageKn: villageEn + '-kn', isActive: true,
});
const rows = [row(1, 'Yelahanka', 'Jala', 'Bagalur'), row(2, 'Anekal', 'Attibele', 'Hosur'), row(3, 'Yelahanka', 'Jala', 'Achit')];

describe('locations', () => {
  it('lists unique sorted taluks', () => {
    expect(taluksOf(rows, 'Bengaluru Urban').map((t) => t.en)).toEqual(['Anekal', 'Yelahanka']);
    expect(taluksOf(rows, 'Nowhere')).toEqual([]);
  });
  it('districts, hoblis, villages', () => {
    expect(districtsOf(rows)).toEqual([{ en: 'Bengaluru Urban', kn: 'ಬೆಂಗಳೂರು ನಗರ' }]);
    expect(hoblisOf(rows, 'Bengaluru Urban', 'Yelahanka').map((x) => x.en)).toEqual(['Jala']);
    expect(villagesOf(rows, 'Bengaluru Urban', 'Yelahanka', 'Jala').map((v) => v.villageEn)).toEqual(['Achit', 'Bagalur']);
  });
});
