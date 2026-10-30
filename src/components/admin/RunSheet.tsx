'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Printer } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { useStore } from '@/data/provider';
import { districtsOf, taluksOf } from '@/domain/locations';
import { useLocations } from '@/components/wizard/useLocations';
import { Button } from '@/components/ui/button';
import { AdminGate } from './AdminGate';
import { loadQueueRows, type QueueRow } from './queueData';
import {
  RUN_STATUSES,
  isoDate,
  keyNames,
  parseIsoDate,
  parseRunSheetParams,
  runSheetRows,
  runnerNames,
  toRunSheetSearch,
  type RunSheetState,
} from './runSheetData';

const SELECT =
  'min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm';
const KEY_SEP = '|';

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function Slip({ row }: { row: QueueRow }) {
  const t = useTranslations('admin.rs');
  const tr = useTranslations();
  const l = row.location;
  const names = keyNames(row.serviceMetadata);
  const survey = [row.surveyNo, row.hissaNo].filter(Boolean).join(' / ');
  return (
    <li className="run-slip space-y-3 rounded-xl border bg-card p-4">
      <div>
        <p className="text-xs text-muted-foreground">{t('reqNo')}</p>
        <p className="font-mono text-2xl font-bold tracking-wider">{row.requestNumber}</p>
      </div>
      <p className="text-sm font-medium">{tr(`services.${row.serviceType}.name`)}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">{t('place')}</dt>
        <dd>
          <span lang="en">
            {l.villageEn} / {l.hobliEn}
          </span>
          <span lang="kn" className="block">
            {l.villageKn} / {l.hobliKn}
          </span>
        </dd>
        <dt className="text-muted-foreground">{t('survey')}</dt>
        <dd className="font-mono">{survey || '-'}</dd>
        <dt className="text-muted-foreground">{t('period')}</dt>
        <dd>{row.periodOrYear ?? '-'}</dd>
        {names.map((n) => (
          <div key={n.label.en} className="contents">
            <dt className="text-muted-foreground">
              {n.label.en} / {n.label.kn}
            </dt>
            <dd>{n.value}</dd>
          </div>
        ))}
      </dl>
      <div className="slip-box space-y-3 rounded-md border-2 border-foreground/70 p-3 text-sm">
        <p className="flex gap-8">
          <span>{t('found')} &#9744;</span>
          <span>{t('notFoundBox')} &#9744;</span>
        </p>
        <p className="flex gap-6">
          <span>{t('volume')} ________</span>
          <span>{t('page')} ________</span>
        </p>
        <p>{t('sign')} ________________</p>
      </div>
    </li>
  );
}

function Sheet() {
  const t = useTranslations('admin');
  const tr = useTranslations();
  const locale = useLocale();
  const kn = locale === 'kn';
  const store = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const locations = useLocations();
  const state = useMemo(() => parseRunSheetParams(params), [params]);

  const districts = useMemo(() => (locations ? districtsOf(locations) : []), [locations]);
  const taluks = useMemo(
    () => (locations && state.districtEn ? taluksOf(locations, state.districtEn) : []),
    [locations, state.districtEn],
  );
  // Only a district and taluk the location master knows count as chosen.
  const talukPair = taluks.find((x) => x.en === state.talukEn);
  const chosen = state.districtEn && talukPair ? { districtEn: state.districtEn, talukEn: talukPair.en } : null;
  const chosenKey = chosen ? `${chosen.districtEn}${KEY_SEP}${chosen.talukEn}` : '';

  const [loaded, setLoaded] = useState<{ key: string; rows: QueueRow[] } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!chosenKey) return;
    let cancelled = false;
    const [districtEn, talukEn] = chosenKey.split(KEY_SEP);
    loadQueueRows(store, { districtEn, talukEn }, new Date())
      .then((rows) => {
        if (cancelled) return;
        setLoaded({ key: chosenKey, rows });
        setFailedKey(null);
      })
      .catch(() => {
        if (!cancelled) setFailedKey(chosenKey);
      });
    return () => {
      cancelled = true;
    };
  }, [store, chosenKey, version]);

  const replace = useCallback(
    (next: RunSheetState) => {
      const qs = toRunSheetSearch(next);
      router.replace(`/admin/run-sheet/${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router],
  );

  const rows = loaded && loaded.key === chosenKey ? loaded.rows : null;
  const runners = useMemo(() => (rows ? runnerNames(rows.filter((r) => RUN_STATUSES.includes(r.status))) : []), [rows]);
  const slips = useMemo(() => (rows ? runSheetRows(rows, state) : []), [rows, state]);
  const failed = chosenKey !== '' && failedKey === chosenKey;
  const name = (p: { en: string; kn: string }) => (kn ? p.kn : p.en);
  // The date is a printed label only (it does not filter requests); empty means today.
  const todayIso = useMemo(() => isoDate(new Date()), []);
  const sheetDate = state.date ?? todayIso;
  const today = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(parseIsoDate(sheetDate) ?? new Date()),
    [locale, sheetDate],
  );

  return (
    <div className="run-sheet mx-auto w-full max-w-4xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-semibold print:hidden">{t('rs.title')}</h1>

      <form
        aria-label={t('rs.filters')}
        className="space-y-3 rounded-xl border bg-card p-3 print:hidden"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field id="rs-district" label={t('rs.district')}>
            <select
              id="rs-district"
              className={SELECT}
              value={state.districtEn ?? ''}
              onChange={(e) => replace({ ...state, districtEn: e.target.value || undefined, talukEn: undefined, runner: undefined })}
            >
              <option value="">{t('allDistricts')}</option>
              {districts.map((d) => (
                <option key={d.en} value={d.en}>
                  {name(d)}
                </option>
              ))}
            </select>
          </Field>
          <Field id="rs-taluk" label={t('rs.taluk')}>
            <select
              id="rs-taluk"
              className={SELECT}
              disabled={!state.districtEn}
              value={chosen?.talukEn ?? ''}
              onChange={(e) => replace({ ...state, talukEn: e.target.value || undefined, runner: undefined })}
            >
              <option value="">{state.districtEn ? t('allTaluks') : t('pickTalukFirst')}</option>
              {taluks.map((d) => (
                <option key={d.en} value={d.en}>
                  {name(d)}
                </option>
              ))}
            </select>
          </Field>
          <Field id="rs-status" label={t('rs.status')}>
            <select
              id="rs-status"
              className={SELECT}
              value={state.status ?? ''}
              onChange={(e) => replace({ ...state, status: (e.target.value || undefined) as RunSheetState['status'] })}
            >
              <option value="">{t('rs.statusBoth')}</option>
              {RUN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {tr(`status.${s}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field id="rs-date" label={t('rs.date')}>
            <input
              id="rs-date"
              type="date"
              className={SELECT}
              value={sheetDate}
              onChange={(e) => replace({ ...state, date: e.target.value && e.target.value !== todayIso ? e.target.value : undefined })}
            />
          </Field>
          <Field id="rs-runner" label={t('rs.runner')}>
            <select
              id="rs-runner"
              className={SELECT}
              value={state.runner ?? ''}
              onChange={(e) => replace({ ...state, runner: e.target.value || undefined })}
            >
              <option value="">{t('rs.allRunners')}</option>
              {state.runner && !runners.includes(state.runner) && <option value={state.runner}>{state.runner}</option>}
              {runners.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </form>

      {!locations ? (
        <div role="status" aria-busy="true" aria-label={t('loading')} className="space-y-2 print:hidden">
          <div className="h-32 animate-pulse rounded-xl bg-muted" />
        </div>
      ) : !chosen ? (
        <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground print:hidden">
          {t('rs.pickTaluk')}
        </p>
      ) : failed ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4 text-sm print:hidden">
          <span>{t('rs.error')}</span>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => setVersion((v) => v + 1)}>
            {t('retry')}
          </Button>
        </div>
      ) : !rows ? (
        <div role="status" aria-busy="true" aria-label={t('loading')} className="space-y-2">
          <div className="h-32 animate-pulse rounded-xl bg-muted" />
          <div className="h-32 animate-pulse rounded-xl bg-muted" />
        </div>
      ) : (
        <>
          <header className="run-sheet-head flex flex-wrap items-center justify-between gap-3 border-b pb-3">
            <div>
              <p className="text-lg font-semibold">
                <span lang="en">{talukPair?.en}</span> / <span lang="kn">{talukPair?.kn}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {today} · {t('rs.count', { count: slips.length })}
              </p>
            </div>
            <Button type="button" className="min-h-11 print:hidden" disabled={slips.length === 0} onClick={() => window.print()}>
              <Printer aria-hidden className="size-4" />
              {t('rs.print')}
            </Button>
          </header>
          <p className="hidden text-xs print:block">{t('rs.demoLine')}</p>
          {slips.length === 0 ? (
            <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground print:hidden">
              {t('rs.empty')}
            </p>
          ) : (
            <ul aria-label={t('rs.sheet')} className="run-slips grid grid-cols-1 gap-4 md:grid-cols-2">
              {slips.map((r) => (
                <Slip key={r.id} row={r} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export function RunSheet() {
  return (
    <AdminGate>
      <Suspense fallback={<div className="mx-auto h-64 w-full max-w-4xl animate-pulse px-4 py-6" aria-busy="true" />}>
        <Sheet />
      </Suspense>
    </AdminGate>
  );
}
