import type { Location } from './types';

export interface NamePair {
  en: string;
  kn: string;
}

function unique(items: NamePair[]): NamePair[] {
  const map = new Map<string, NamePair>();
  for (const i of items) if (!map.has(i.en)) map.set(i.en, i);
  return [...map.values()].sort((a, b) => a.en.localeCompare(b.en, 'en'));
}

export const districtsOf = (locs: Location[]): NamePair[] =>
  unique(locs.map((l) => ({ en: l.districtEn, kn: l.districtKn })));

export const taluksOf = (locs: Location[], districtEn: string): NamePair[] =>
  unique(locs.filter((l) => l.districtEn === districtEn).map((l) => ({ en: l.talukEn, kn: l.talukKn })));

export const hoblisOf = (locs: Location[], districtEn: string, talukEn: string): NamePair[] =>
  unique(
    locs
      .filter((l) => l.districtEn === districtEn && l.talukEn === talukEn)
      .map((l) => ({ en: l.hobliEn, kn: l.hobliKn })),
  );

export const villagesOf = (
  locs: Location[],
  districtEn: string,
  talukEn: string,
  hobliEn: string,
): Location[] =>
  locs
    .filter((l) => l.districtEn === districtEn && l.talukEn === talukEn && l.hobliEn === hobliEn)
    .sort((a, b) => a.villageEn.localeCompare(b.villageEn, 'en'));
