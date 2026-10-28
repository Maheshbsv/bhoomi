'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { districtsOf, hoblisOf, taluksOf, villagesOf, type NamePair } from '@/domain/locations';
import { useWizard } from '@/store/wizard';
import { DualLabel } from './Field';
import { SearchableSelect, type SelectOption } from './SearchableSelect';
import { StepNav } from './StepNav';
import { useLocations } from './useLocations';

const toOptions = (pairs: NamePair[]): SelectOption[] => pairs.map((p) => ({ value: p.en, en: p.en, kn: p.kn }));

export function StepLocation() {
  const t = useTranslations('wizard.location');
  const tw = useTranslations('wizard');
  const locs = useLocations();
  const loc = useWizard((s) => s.location);
  const patch = useWizard((s) => s.patch);
  const setStep = useWizard((s) => s.setStep);

  const options = useMemo(() => {
    if (!locs) return { d: [], t: [], h: [], v: [] };
    const d = toOptions(districtsOf(locs));
    const tk = loc.districtEn ? toOptions(taluksOf(locs, loc.districtEn)) : [];
    const h = loc.districtEn && loc.talukEn ? toOptions(hoblisOf(locs, loc.districtEn, loc.talukEn)) : [];
    const v =
      loc.districtEn && loc.talukEn && loc.hobliEn
        ? villagesOf(locs, loc.districtEn, loc.talukEn, loc.hobliEn).map((l) => ({
            value: String(l.id),
            en: l.villageEn,
            kn: l.villageKn,
          }))
        : [];
    return { d, t: tk, h, v };
  }, [locs, loc.districtEn, loc.talukEn, loc.hobliEn]);

  const common = { searchPlaceholder: tw('search'), emptyText: tw('noMatch') };

  return (
    <div>
      <h2 className="text-xl font-semibold">{t('heading')}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('hint')}</p>
      <div className="mt-4 space-y-4">
        <div className="space-y-1.5">
          <DualLabel name="district" htmlFor="loc-district" required />
          <SearchableSelect
            id="loc-district"
            value={loc.districtEn}
            options={options.d}
            placeholder={t('pickDistrict')}
            disabled={!locs}
            onChange={(v) => patch({ location: { districtEn: v } })}
            {...common}
          />
        </div>
        <div className="space-y-1.5">
          <DualLabel name="taluk" htmlFor="loc-taluk" required />
          <SearchableSelect
            id="loc-taluk"
            value={loc.talukEn}
            options={options.t}
            placeholder={t('pickTaluk')}
            disabled={!loc.districtEn}
            onChange={(v) => patch({ location: { districtEn: loc.districtEn, talukEn: v } })}
            {...common}
          />
        </div>
        <div className="space-y-1.5">
          <DualLabel name="hobli" htmlFor="loc-hobli" required />
          <SearchableSelect
            id="loc-hobli"
            value={loc.hobliEn}
            options={options.h}
            placeholder={t('pickHobli')}
            disabled={!loc.talukEn}
            onChange={(v) => patch({ location: { districtEn: loc.districtEn, talukEn: loc.talukEn, hobliEn: v } })}
            {...common}
          />
        </div>
        <div className="space-y-1.5">
          <DualLabel name="village" htmlFor="loc-village" required />
          <SearchableSelect
            id="loc-village"
            value={loc.villageId === undefined ? undefined : String(loc.villageId)}
            options={options.v}
            placeholder={t('pickVillage')}
            disabled={!loc.hobliEn}
            onChange={(v) => patch({ location: { ...loc, villageId: Number(v) } })}
            {...common}
          />
        </div>
      </div>
      <StepNav onBack={() => setStep(0)} nextDisabled={loc.villageId === undefined} onNext={() => setStep(2)} />
    </div>
  );
}
