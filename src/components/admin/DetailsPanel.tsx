'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import type { RequestDetail } from '@/data/DataStore';
import { SERVICE_FIELDS } from '@/components/wizard/fieldConfig';
import { FIELD_LABELS, OPTION_LABELS } from '@/components/wizard/fieldLabels';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LocationLabel } from '@/components/shared/LocationLabel';
import { UploadGallery } from './UploadGallery';

function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2 border-b py-1.5 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}

export function DetailsPanel({ detail }: { detail: RequestDetail }) {
  const t = useTranslations('admin.ws.details');
  const ts = useTranslations('services');
  const { request: r, location, user } = detail;
  const none = <span className="text-muted-foreground">{t('notGiven')}</span>;

  function value(name: string): ReactNode {
    const raw = name === 'surveyNo' ? r.surveyNo : name === 'hissaNo' ? r.hissaNo : r.serviceMetadata[name];
    if (raw === undefined || raw === null || raw === '') return none;
    const s = String(raw);
    const opt = OPTION_LABELS[s];
    return opt ? (
      <>
        {opt.en} / <span lang="kn">{opt.kn}</span>
      </>
    ) : (
      s
    );
  }

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <p className="font-mono text-sm">{r.requestNumber}</p>
        <StatusBadge status={r.status} />
        <dl>
          <Row label={t('service')}>{ts(`${r.serviceType}.name`)}</Row>
          <Row label={t('location')}>
            <LocationLabel location={location} />
          </Row>
          {SERVICE_FIELDS[r.serviceType].map((f) => (
            <Row
              key={f.name}
              label={
                <>
                  {FIELD_LABELS[f.name].en} / <span lang="kn">{FIELD_LABELS[f.name].kn}</span>
                </>
              }
            >
              {value(f.name)}
            </Row>
          ))}
          {r.periodOrYear && <Row label={t('period')}>{r.periodOrYear}</Row>}
          <Row label={t('customer')}>{user.fullName ?? none}</Row>
          <Row label={t('phone')}>{user.phoneNumber}</Row>
        </dl>
      </section>
      <section className="space-y-2">
        <h3 className="font-semibold">{t('delivery')}</h3>
        <dl>
          <Row label={t('delivery')}>{t(`mode.${r.deliveryMode}`)}</Row>
          {r.shippingAddress && (
            <Row label={t('address')}>
              {[r.shippingAddress.name, r.shippingAddress.line1, r.shippingAddress.line2, r.shippingAddress.city, r.shippingAddress.district, r.shippingAddress.pincode]
                .filter(Boolean)
                .join(', ')}
            </Row>
          )}
          {r.runnerName && <Row label={t('runner')}>{r.runnerName}</Row>}
          {r.consignmentNo && <Row label={t('consignment')}>{r.consignmentNo}</Row>}
        </dl>
      </section>
      <UploadGallery documents={detail.documents} />
    </div>
  );
}
