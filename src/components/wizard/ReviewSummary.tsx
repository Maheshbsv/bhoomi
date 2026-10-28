'use client';

import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useWizard } from '@/store/wizard';
import { SERVICE_FIELDS } from './fieldConfig';
import { FIELD_LABELS, OPTION_LABELS, dual } from './fieldLabels';
import { useLocations } from './useLocations';

function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 py-2 sm:grid-cols-[14rem_1fr] sm:gap-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words">{children}</dd>
    </div>
  );
}

export function ReviewSummary() {
  const t = useTranslations();
  const locale = useLocale();
  const s = useWizard();
  const locs = useLocations();
  if (!s.serviceType) return null;

  const loc = locs?.find((l) => l.id === s.location.villageId);
  const modeKey = s.delivery?.mode ?? 'DIGITAL';
  const a = s.delivery?.address;

  const values = SERVICE_FIELDS[s.serviceType]
    .map((def) => ({ def, value: String(s.details[def.name] ?? '').trim() }))
    .filter((x) => x.value !== '');

  return (
    <dl className="divide-y rounded-lg border bg-card px-4">
      <Row label={t('wizard.review.service')}>{t(`services.${s.serviceType}.name`)}</Row>
      {loc && (
        <Row label={t('wizard.review.location')}>
          <span className="block">{[loc.villageEn, loc.hobliEn, loc.talukEn, loc.districtEn].join(', ')}</span>
          <span lang="kn" className="block text-muted-foreground">
            {[loc.villageKn, loc.hobliKn, loc.talukKn, loc.districtKn].join(', ')}
          </span>
        </Row>
      )}
      {values.map(({ def, value }) => (
        <Row key={def.name} label={dual(FIELD_LABELS[def.name])}>
          {def.kind === 'select' && OPTION_LABELS[value] ? dual(OPTION_LABELS[value]) : value}
        </Row>
      ))}
      <Row label={t('wizard.review.files')}>
        {s.files.length > 0 ? t('wizard.review.fileCount', { n: s.files.length }) : t('wizard.review.noFiles')}
      </Row>
      <Row label={t('wizard.review.delivery')}>
        <span lang={locale}>{t(`wizard.delivery.${modeKey}.name`)}</span>
        {modeKey !== 'DIGITAL' && a && (
          <span className="mt-1 block font-normal">
            {[a.name, a.line1, a.line2, a.city, a.district, a.pincode].filter(Boolean).join(', ')}
          </span>
        )}
        {s.delivery?.email && <span className="mt-1 block font-normal">{s.delivery.email}</span>}
      </Row>
      <Row label={dual(FIELD_LABELS.phone)}>{s.phone}</Row>
    </dl>
  );
}
