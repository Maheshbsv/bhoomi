'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { districtsOf, taluksOf } from '@/domain/locations';
import type { Location } from '@/domain/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SERVICE_TYPES, STATUSES, type QueueUrlState } from './queueData';

const SELECT =
  'min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm';

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

interface Props {
  state: QueueUrlState;
  locations: Location[];
  /** Merge a patch into the URL state; the caller resets the page and the dependent taluk. */
  onChange(patch: Partial<QueueUrlState>): void;
  onClear(): void;
  dirty: boolean;
}

export function QueueFilters({ state, locations, onChange, onClear, dirty }: Props) {
  const t = useTranslations('admin');
  const tr = useTranslations();
  const kn = useLocale() === 'kn';
  const name = (p: { en: string; kn: string }) => (kn ? p.kn : p.en);

  const [text, setText] = useState(state.q ?? '');
  // Keep the box in step when the URL changes from outside (back button, clear).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(state.q ?? '');
  }, [state.q]);
  // Debounce typing into the URL.
  useEffect(() => {
    const next = text.trim();
    if (next === (state.q ?? '')) return;
    const id = setTimeout(() => onChange({ q: next || undefined }), 300);
    return () => clearTimeout(id);
  }, [text, state.q, onChange]);

  const districts = districtsOf(locations);
  const taluks = state.districtEn ? taluksOf(locations, state.districtEn) : [];

  return (
    <form
      role="search"
      aria-label={t('filters')}
      className="space-y-3 rounded-xl border bg-card p-3"
      onSubmit={(e) => {
        e.preventDefault();
        onChange({ q: text.trim() || undefined });
      }}
    >
      <Field id="q-search" label={t('search')}>
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="q-search"
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="h-11 pl-9 text-base md:text-sm"
          />
        </div>
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field id="f-district" label={t('district')}>
          <select
            id="f-district"
            className={SELECT}
            value={state.districtEn ?? ''}
            onChange={(e) => onChange({ districtEn: e.target.value || undefined, talukEn: undefined })}
          >
            <option value="">{t('allDistricts')}</option>
            {districts.map((d) => (
              <option key={d.en} value={d.en}>
                {name(d)}
              </option>
            ))}
          </select>
        </Field>
        <Field id="f-taluk" label={t('taluk')}>
          <select
            id="f-taluk"
            className={SELECT}
            disabled={!state.districtEn}
            value={state.talukEn ?? ''}
            onChange={(e) => onChange({ talukEn: e.target.value || undefined })}
          >
            <option value="">{state.districtEn ? t('allTaluks') : t('pickTalukFirst')}</option>
            {taluks.map((d) => (
              <option key={d.en} value={d.en}>
                {name(d)}
              </option>
            ))}
          </select>
        </Field>
        <Field id="f-service" label={t('service')}>
          <select
            id="f-service"
            className={SELECT}
            value={state.serviceType ?? ''}
            onChange={(e) => onChange({ serviceType: (e.target.value || undefined) as QueueUrlState['serviceType'] })}
          >
            <option value="">{t('allServices')}</option>
            {SERVICE_TYPES.map((s) => (
              <option key={s} value={s}>
                {tr(`services.${s}.name`)}
              </option>
            ))}
          </select>
        </Field>
        <Field id="f-status" label={t('status')}>
          <select
            id="f-status"
            className={SELECT}
            value={state.status ?? ''}
            onChange={(e) => onChange({ status: (e.target.value || undefined) as QueueUrlState['status'] })}
          >
            <option value="">{t('allStatuses')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {tr(`status.${s}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field id="f-sla" label={t('sla')}>
          <select
            id="f-sla"
            className={SELECT}
            value={state.sla ?? ''}
            onChange={(e) => onChange({ sla: (e.target.value || undefined) as QueueUrlState['sla'] })}
          >
            <option value="">{t('allSla')}</option>
            {(['green', 'orange', 'red'] as const).map((c) => (
              <option key={c} value={c}>
                {tr(`sla.${c}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field id="f-sort" label={t('sort')}>
          <select
            id="f-sort"
            className={SELECT}
            value={state.sort}
            onChange={(e) => onChange({ sort: e.target.value === 'updated' ? 'updated' : 'age' })}
          >
            <option value="age">{t('sortAge')}</option>
            <option value="updated">{t('sortUpdated')}</option>
          </select>
        </Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-5"
            checked={state.closed}
            onChange={(e) => onChange({ closed: e.target.checked })}
          />
          {t('showClosed')}
        </label>
        {dirty && (
          <Button type="button" variant="outline" className="min-h-11" onClick={onClear}>
            {t('clear')}
          </Button>
        )}
      </div>
    </form>
  );
}
