import { useLocale } from 'next-intl';
import type { Location } from '@/domain/types';

/** "Village, Hobli, Taluk, District" in the active locale. */
export function LocationLabel({ location }: { location: Location }) {
  const kn = useLocale() === 'kn';
  const parts = kn
    ? [location.villageKn, location.hobliKn, location.talukKn, location.districtKn]
    : [location.villageEn, location.hobliEn, location.talukEn, location.districtEn];
  return <span>{parts.join(', ')}</span>;
}
