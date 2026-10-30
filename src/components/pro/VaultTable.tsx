'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useRouter } from '@/i18n/routing';
import { useStore } from '@/data/provider';
import { customerDocuments } from '@/domain/track';
import type { Location, RequestDocument, ServiceRequest } from '@/domain/types';
import { useSession } from '@/store/session';
import { Button } from '@/components/ui/button';
import { ProGate } from './ProGate';
import { NO_MATTER } from './bulkLogic';

const SELECT =
  'min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm';

interface VaultItem {
  doc: RequestDocument;
  request: ServiceRequest;
  location: Location;
}

const FILTERS = ['matter', 'taluk', 'village', 'service'] as const;
type FilterKey = (typeof FILTERS)[number];

const matterOf = (i: VaultItem) => i.request.matterTag?.trim() || NO_MATTER;
const valueOf: Record<FilterKey, (i: VaultItem) => string> = {
  matter: matterOf,
  taluk: (i) => i.location.talukEn,
  village: (i) => i.location.villageEn,
  service: (i) => i.request.serviceType,
};

function Vault() {
  const t = useTranslations('pro.vault');
  const tr = useTranslations();
  const kn = useLocale() === 'kn';
  const store = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const user = useSession((s) => s.user);
  const [state, setState] = useState<{ userId: string; items?: VaultItem[]; failed: boolean }>();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const userId = user.id;
    (async () => {
      const mine = await store.listRequests({ userId });
      const closed = mine.filter((r) => r.status === 'DELIVERED' || r.status === 'RECORD_UNAVAILABLE');
      const details = await Promise.all(closed.map((r) => store.getRequest(r.id)));
      const items: VaultItem[] = [];
      for (const d of details) {
        // Only ever the advocate's own requests; operator scans and references are filtered out.
        if (!d || d.request.userId !== userId) continue;
        for (const doc of customerDocuments(d.documents)) items.push({ doc, request: d.request, location: d.location });
      }
      items.sort((a, b) => b.doc.createdAt.localeCompare(a.doc.createdAt));
      if (!cancelled) setState({ userId, items, failed: false });
    })().catch(() => !cancelled && setState({ userId, failed: true }));
    return () => {
      cancelled = true;
    };
  }, [store, user]);

  const current = state && state.userId === user?.id ? state : undefined;
  const items = current?.items;
  const active = Object.fromEntries(FILTERS.map((k) => [k, params.get(k) ?? ''])) as Record<FilterKey, string>;

  const shown = useMemo(
    () => (items ?? []).filter((i) => FILTERS.every((k) => !active[k] || valueOf[k](i) === active[k])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, active.matter, active.taluk, active.village, active.service],
  );

  const options = useMemo(() => {
    const out = {} as Record<FilterKey, { value: string; label: string }[]>;
    for (const k of FILTERS) {
      const seen = new Map<string, string>();
      for (const i of items ?? []) {
        const v = valueOf[k](i);
        if (seen.has(v)) continue;
        const label =
          k === 'matter' ? (v === NO_MATTER ? tr('pro.dash.noMatter') : v)
          : k === 'taluk' ? (kn ? i.location.talukKn : i.location.talukEn)
          : k === 'village' ? (kn ? i.location.villageKn : i.location.villageEn)
          : tr(`services.${v}.name`);
        seen.set(v, label);
      }
      out[k] = [...seen].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
    }
    return out;
  }, [items, kn, tr]);

  function setFilter(k: FilterKey, v: string) {
    const next = new URLSearchParams(params.toString());
    if (v) next.set(k, v);
    else next.delete(k);
    const qs = next.toString();
    router.replace(`/pro/vault/${qs ? `?${qs}` : ''}`, { scroll: false });
  }

  async function download(doc: RequestDocument) {
    try {
      const blob = await store.getBlob(doc.storageKey);
      if (!blob) {
        toast.error(tr('track.downloadMissing'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      toast.error(tr('track.downloadMissing'));
    }
  }

  const anyFilter = FILTERS.some((k) => active[k]);
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('intro')}</p>
      </div>

      {current?.failed ? (
        <p role="alert" className="text-sm text-destructive">{tr('pro.loadError')}</p>
      ) : !items ? (
        <div aria-busy="true" className="h-24 animate-pulse rounded-lg bg-muted" />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FILTERS.map((k) => (
              <div key={k} className="space-y-1">
                <label htmlFor={`vault-${k}`} className="text-xs font-medium text-muted-foreground">{t(k)}</label>
                <select id={`vault-${k}`} className={SELECT} value={active[k]} onChange={(e) => setFilter(k, e.target.value)}>
                  <option value="">{t('all')}</option>
                  {options[k].map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          {anyFilter && (
            <Button type="button" variant="ghost" className="min-h-11" onClick={() => router.replace('/pro/vault/', { scroll: false })}>
              {t('clear')}
            </Button>
          )}
          {shown.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noMatch')}</p>
          ) : (
            <ul className="space-y-2">
              {shown.map((i) => (
                <li key={i.doc.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                  <FileText aria-hidden className="size-6 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-sm font-medium">
                      {i.doc.fileType === 'FINAL_DELIVERABLE' ? tr('track.docFinal') : tr('track.docEndorsement')}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{i.doc.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      <Link href={`/track/?id=${encodeURIComponent(i.request.requestNumber)}`} className="font-mono underline-offset-4 hover:underline">
                        {i.request.requestNumber}
                      </Link>{' '}
                      · {tr(`services.${i.request.serviceType}.name`)} · {kn ? i.location.villageKn : i.location.villageEn},{' '}
                      {kn ? i.location.talukKn : i.location.talukEn}
                    </p>
                    <p className="text-xs text-muted-foreground break-words">
                      {matterOf(i) === NO_MATTER ? tr('pro.dash.noMatter') : matterOf(i)}
                    </p>
                  </div>
                  <Button type="button" className="min-h-11 shrink-0" aria-label={`${t('download')} ${i.doc.fileName}`} onClick={() => void download(i.doc)}>
                    <Download aria-hidden className="size-4" />
                    {t('download')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export function VaultTable() {
  return (
    <ProGate>
      <div className="mx-auto w-full max-w-4xl px-4 py-6">
        <Suspense fallback={<div aria-busy="true" className="h-24 animate-pulse rounded-lg bg-muted" />}>
          <Vault />
        </Suspense>
      </div>
    </ProGate>
  );
}
