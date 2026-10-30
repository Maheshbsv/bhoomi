'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useSession } from '@/store/session';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useCitizenStatus } from '@/components/track/useCitizenStatus';
import { formatWhen } from '@/components/track/Timeline';
import { ProGate } from './ProGate';
import { groupMatters, NO_MATTER, type MatterGroup } from './bulkLogic';
import { useMyRequests } from './useMyRequests';

const LINK_BTN =
  'inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-medium focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none';

function MatterName({ k }: { k: string }) {
  const t = useTranslations('pro.dash');
  return <>{k === NO_MATTER ? t('noMatter') : k}</>;
}

function MatterCard({ g }: { g: MatterGroup }) {
  const t = useTranslations('pro.dash');
  const pct = g.total ? Math.round((g.delivered / g.total) * 100) : 0;
  return (
    <li className="space-y-3 rounded-xl border bg-card p-4">
      <h2 className="font-semibold break-words">
        <MatterName k={g.key} />
      </h2>
      <p className="text-sm text-muted-foreground">{t('count', { count: g.total })}</p>
      <div>
        <div
          role="progressbar"
          aria-label={t('progress')}
          aria-valuemin={0}
          aria-valuemax={g.total}
          aria-valuenow={g.delivered}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t('delivered', { done: g.delivered, total: g.total })}</p>
      </div>
      <Link
        href={`/pro/?matter=${encodeURIComponent(g.key)}`}
        className={`${LINK_BTN} border border-input bg-background hover:bg-muted`}
      >
        {t('view')}
      </Link>
    </li>
  );
}

function MatterDetail({ g, matter }: { g?: MatterGroup; matter: string }) {
  const t = useTranslations('pro.dash');
  const tr = useTranslations();
  const locale = useLocale();
  const statusLabel = useCitizenStatus();
  return (
    <div className="space-y-4">
      <Link href="/pro/" className={`${LINK_BTN} -ml-2 text-primary underline-offset-4 hover:underline`}>
        {t('back')}
      </Link>
      <h1 className="text-2xl font-semibold break-words">
        <MatterName k={matter} />
      </h1>
      {!g ? (
        <p className="text-sm text-muted-foreground">{t('matterUnknown')}</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {t('count', { count: g.total })} · {t('delivered', { done: g.delivered, total: g.total })}
          </p>
          <ul className="space-y-2">
            {g.requests.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/track/?id=${encodeURIComponent(r.requestNumber)}`}
                  className="flex min-h-11 flex-col gap-1 rounded-lg border bg-card p-3 hover:bg-muted/50"
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold">{r.requestNumber}</span>
                    <StatusBadge status={r.status} label={statusLabel(r.status)} />
                  </span>
                  <span className="text-sm">{tr(`services.${r.serviceType}.name`)}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.surveyNo ? `${t('survey')} ${r.surveyNo}${r.hissaNo ? `/${r.hissaNo}` : ''} · ` : ''}
                    {formatWhen(r.createdAt, locale)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Dashboard() {
  const t = useTranslations('pro');
  const user = useSession((s) => s.user);
  const params = useSearchParams();
  const matter = params.get('matter');
  const { list, failed } = useMyRequests(user?.id ?? '');

  if (matter !== null) {
    if (failed) return <p role="alert" className="text-sm text-destructive">{t('loadError')}</p>;
    if (!list) return <div aria-busy="true" className="h-24 animate-pulse rounded-lg bg-muted" />;
    return <MatterDetail matter={matter} g={groupMatters(list).find((g) => g.key === matter)} />;
  }

  const groups = list ? groupMatters(list) : [];
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{t('dash.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('dash.intro')}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/pro/bulk/" className={`${LINK_BTN} bg-primary text-primary-foreground hover:bg-primary/90`}>
          {t('dash.newBulk')}
        </Link>
        <Link href="/pro/vault/" className={`${LINK_BTN} border border-input bg-background hover:bg-muted`}>
          {t('dash.vault')}
        </Link>
      </div>
      {failed ? (
        <p role="alert" className="text-sm text-destructive">{t('loadError')}</p>
      ) : !list ? (
        <div aria-busy="true" className="h-24 animate-pulse rounded-lg bg-muted" />
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('dash.empty')}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {groups.map((g) => (
            <MatterCard key={g.key} g={g} />
          ))}
        </ul>
      )}
    </div>
  );
}

export function MatterList() {
  return (
    <ProGate>
      <div className="mx-auto w-full max-w-4xl px-4 py-6">
        <Suspense fallback={<div aria-busy="true" className="h-24 animate-pulse rounded-lg bg-muted" />}>
          <Dashboard />
        </Suspense>
      </div>
    </ProGate>
  );
}
