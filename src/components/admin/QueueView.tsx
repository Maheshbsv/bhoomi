'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { useStore } from '@/data/provider';
import { useLocations } from '@/components/wizard/useLocations';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AdminGate } from './AdminGate';
import { QueueFilters } from './QueueFilters';
import { QueueTable } from './QueueTable';
import {
  applyQueueQuery,
  countBySla,
  filterBySla,
  loadQueueRows,
  parseQueueParams,
  sanitiseLocationFilter,
  toQueueSearch,
  toStoreFilter,
  visibleRows,
  type QueueRow,
  type QueueUrlState,
  type SlaColor,
} from './queueData';

const PAGE_SIZE = 20 as const;
const DOT = { green: 'bg-green-600', orange: 'bg-orange-500', red: 'bg-red-600' } as const;

function Queue() {
  const t = useTranslations('admin');
  const store = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const locations = useLocations();
  const state = useMemo(() => {
    const parsed = parseQueueParams(params);
    return locations ? sanitiseLocationFilter(parsed, locations) : parsed;
  }, [params, locations]);

  const [rows, setRows] = useState<QueueRow[] | undefined>();
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);

  // Only the store-side filter triggers a reload; SLA colour, closed toggle, sort and page are client-side.
  const filterKey = JSON.stringify(toStoreFilter(state));

  const replace = useCallback(
    (next: QueueUrlState) => {
      const qs = toQueueSearch(next);
      router.replace(`/admin/${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router],
  );

  const onChange = useCallback(
    (patch: Partial<QueueUrlState>) => {
      const isPage = 'page' in patch;
      replace({ ...state, ...patch, page: isPage ? (patch.page ?? 1) : 1 });
    },
    [replace, state],
  );

  useEffect(() => {
    // Wait for the location master so an unknown district or taluk never reaches the store.
    if (!locations) return;
    let cancelled = false;
    const filter = JSON.parse(filterKey);
    loadQueueRows(store, filter, new Date())
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
  }, [store, locations, filterKey, version]);

  // A request submitted in another tab should appear when this one regains focus.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setVersion((v) => v + 1);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const dirty = Boolean(
    state.districtEn || state.talukEn || state.serviceType || state.status || state.sla || state.q || state.closed ||
      state.sort !== 'age',
  );

  const shown = useMemo(() => (rows ? visibleRows(rows, state) : []), [rows, state]);
  const counts = useMemo(() => countBySla(shown), [shown]);
  const filtered = useMemo(() => filterBySla(shown, state.sla), [shown, state.sla]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(state.page, pages);
  const view = applyQueueQuery(filtered, { sort: state.sort, page, pageSize: PAGE_SIZE });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t('queueTitle')}</h1>
        <nav className="flex gap-2">
          <Link href="/admin/run-sheet/" className="inline-flex min-h-11 items-center rounded-lg border px-3 text-sm hover:bg-muted">
            {t('runSheetsLink')}
          </Link>
          <Link href="/admin/overview/" className="inline-flex min-h-11 items-center rounded-lg border px-3 text-sm hover:bg-muted">
            {t('overviewLink')}
          </Link>
        </nav>
      </div>

      <ul aria-label={t('countsLabel')} className="grid grid-cols-3 gap-2">
        {(['green', 'orange', 'red'] as SlaColor[]).map((c) => (
          <li key={c}>
            <button
              type="button"
              aria-pressed={state.sla === c}
              onClick={() => onChange({ sla: state.sla === c ? undefined : c })}
              className={cn(
                'flex min-h-11 w-full flex-col items-start gap-0.5 rounded-xl border bg-card p-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                state.sla === c && 'border-foreground',
              )}
            >
              <span className="flex items-center gap-2 text-2xl font-semibold" data-testid={`count-${c}`}>
                <span aria-hidden className={cn('inline-block size-2.5 rounded-full', DOT[c])} />
                {rows ? counts[c] : '-'}
              </span>
              <span className="text-xs text-muted-foreground">{t(`count.${c}`)}</span>
            </button>
          </li>
        ))}
      </ul>

      <QueueFilters state={state} locations={locations ?? []} onChange={onChange} onClear={() => replace({ sort: 'age', page: 1, closed: false })} dirty={dirty} />

      {failed ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4 text-sm">
          <span>{t('error')}</span>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => setVersion((v) => v + 1)}>
            {t('retry')}
          </Button>
        </div>
      ) : !rows ? (
        <div role="status" aria-busy="true" aria-label={t('loading')} className="space-y-2">
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          {dirty ? t('emptyFiltered') : t('empty')}
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {t('results', { count: filtered.length })}
          </p>
          <QueueTable rows={view.rows} />
          {pages > 1 && (
            <nav aria-label={t('pagination')} className="flex items-center justify-between gap-3">
              <Button type="button" variant="outline" className="min-h-11" disabled={page <= 1} onClick={() => onChange({ page: page - 1 })}>
                {t('prev')}
              </Button>
              <span className="text-sm">{t('page', { page, pages })}</span>
              <Button type="button" variant="outline" className="min-h-11" disabled={page >= pages} onClick={() => onChange({ page: page + 1 })}>
                {t('next')}
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

export function QueueView() {
  return (
    <AdminGate>
      <Queue />
    </AdminGate>
  );
}
