'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useStore } from '@/data/provider';
import type { ServiceRequest } from '@/domain/types';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatWhen } from './Timeline';

export function MyRequests({ userId }: { userId: string }) {
  const t = useTranslations('track');
  const tr = useTranslations();
  const locale = useLocale();
  const store = useStore();
  const [list, setList] = useState<ServiceRequest[]>();

  useEffect(() => {
    let cancelled = false;
    store
      .listRequests({ userId })
      .then((r) => !cancelled && setList(r))
      .catch(() => !cancelled && setList([]));
    return () => {
      cancelled = true;
    };
  }, [store, userId]);

  if (!list) return <div aria-busy="true" className="h-24 animate-pulse rounded-lg bg-muted" />;
  if (list.length === 0) return <p className="text-sm text-muted-foreground">{t('noRequests')}</p>;
  return (
    <ul className="space-y-2">
      {list.map((r) => (
        <li key={r.id}>
          <Link
            href={`/track/?id=${encodeURIComponent(r.requestNumber)}`}
            className="flex min-h-11 flex-col gap-1 rounded-lg border bg-card p-3 hover:bg-muted/50"
          >
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-sm font-semibold">{r.requestNumber}</span>
              <StatusBadge status={r.status} />
            </span>
            <span className="text-sm">{tr(`services.${r.serviceType}.name`)}</span>
            <span className="text-xs text-muted-foreground">{formatWhen(r.createdAt, locale)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
