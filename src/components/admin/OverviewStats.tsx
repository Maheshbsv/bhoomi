'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useStore } from '@/data/provider';
import { useLocations } from '@/components/wizard/useLocations';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AdminGate } from './AdminGate';
import { STATUSES, type SlaColor } from './queueData';
import { loadOverviewRows, summarise, type OverviewRow } from './overviewData';

const DOT = { green: 'bg-green-600', orange: 'bg-orange-500', red: 'bg-red-600' } as const;
const TH = 'px-3 py-2 text-left text-xs font-medium text-muted-foreground';
const TD = 'px-3 py-2 text-sm';

function Overview() {
  const t = useTranslations('admin');
  const tr = useTranslations();
  const locale = useLocale();
  const store = useStore();
  const locations = useLocations();
  const [rows, setRows] = useState<OverviewRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadOverviewRows(store, new Date())
      .then((r) => {
        if (cancelled) return;
        setRows(r);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [store, version]);

  const summary = useMemo(() => (rows ? summarise(rows) : null), [rows]);
  const num = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 }), [locale]);
  const pct = useMemo(() => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }), [locale]);

  const kn = locale === 'kn';
  // Display names in the active locale; the English names stay the grouping key.
  const names = useMemo(() => {
    const m = new Map<string, { taluk: string; district: string }>();
    for (const l of locations ?? []) m.set(`${l.districtEn}|${l.talukEn}`, { taluk: kn ? l.talukKn : l.talukEn, district: kn ? l.districtKn : l.districtEn });
    return m;
  }, [locations, kn]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-semibold">{t('ov.title')}</h1>

      {failed ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4 text-sm">
          <span>{t('ov.error')}</span>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => setVersion((v) => v + 1)}>
            {t('retry')}
          </Button>
        </div>
      ) : !summary ? (
        <div role="status" aria-busy="true" aria-label={t('loading')} className="space-y-2">
          <div className="h-20 animate-pulse rounded-xl bg-muted" />
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
        </div>
      ) : (
        <>
          <ul aria-label={t('ov.tiles')} className="grid grid-cols-3 gap-2">
            {(['green', 'orange', 'red'] as SlaColor[]).map((c) => (
              <li key={c} className="flex flex-col gap-0.5 rounded-xl border bg-card p-3">
                <span className="flex items-center gap-2 text-2xl font-semibold" data-testid={`ov-${c}`}>
                  <span aria-hidden className={cn('inline-block size-2.5 rounded-full', DOT[c])} />
                  {summary.bySla[c]}
                </span>
                <span className="text-xs text-muted-foreground">{t(`count.${c}`)}</span>
              </li>
            ))}
          </ul>

          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-xl border bg-card p-3">
              <dt className="text-xs text-muted-foreground">{t('ov.avgDays')}</dt>
              <dd className="text-2xl font-semibold" data-testid="ov-avg">
                {summary.avgDaysToDeliver === null ? '-' : num.format(summary.avgDaysToDeliver)}
              </dd>
            </div>
            <div className="rounded-xl border bg-card p-3">
              <dt className="text-xs text-muted-foreground">{t('ov.unavailableRate')}</dt>
              <dd className="text-2xl font-semibold" data-testid="ov-rate">
                {pct.format(summary.unavailableRate)}
              </dd>
              <dd className="text-xs text-muted-foreground">{t('ov.unavailableNote')}</dd>
            </div>
          </dl>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">{t('ov.byStatus')}</h2>
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th scope="col" className={TH}>{t('ov.status')}</th>
                    <th scope="col" className={cn(TH, 'text-right')}>{t('ov.total')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {STATUSES.map((s) => (
                    <tr key={s}>
                      <td className={TD}>{tr(`status.${s}`)}</td>
                      <td className={cn(TD, 'text-right tabular-nums')}>{summary.byStatus[s]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">{t('ov.byTaluk')}</h2>
            {summary.byTaluk.length === 0 ? (
              <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">{t('ov.noRequests')}</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border bg-card">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th scope="col" className={TH}>{t('ov.taluk')}</th>
                      <th scope="col" className={TH}>{t('ov.district')}</th>
                      <th scope="col" className={cn(TH, 'text-right')}>{t('ov.open')}</th>
                      <th scope="col" className={cn(TH, 'text-right')}>{t('ov.red')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {summary.byTaluk.map((r) => (
                      <tr key={`${r.districtEn}|${r.talukEn}`}>
                        <td className={TD}>{names.get(`${r.districtEn}|${r.talukEn}`)?.taluk ?? r.talukEn}</td>
                        <td className={TD}>{names.get(`${r.districtEn}|${r.talukEn}`)?.district ?? r.districtEn}</td>
                        <td className={cn(TD, 'text-right tabular-nums')}>{r.open}</td>
                        <td className={cn(TD, 'text-right tabular-nums', r.red > 0 && 'font-semibold text-destructive')}>{r.red}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export function OverviewStats() {
  return (
    <AdminGate>
      <Overview />
    </AdminGate>
  );
}
