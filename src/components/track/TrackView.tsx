'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Ban, SearchX } from 'lucide-react';
import { useStore } from '@/data/provider';
import type { RequestDetail } from '@/data/DataStore';
import { bannerMessage, customerDocuments, resolveTrackId } from '@/domain/track';
import { citizenStage } from '@/domain/status';
import { useSession, useSessionReady } from '@/store/session';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { OtpDialog } from '@/components/shared/OtpDialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LocationLabel } from '@/components/shared/LocationLabel';
import { ActionBanner } from './ActionBanner';
import { DeliveredFiles } from './DeliveredFiles';
import { MyRequests } from './MyRequests';
import { ReplyBox } from './ReplyBox';
import { Stepper } from './Stepper';
import { Timeline } from './Timeline';
import { TrackLookup } from './TrackLookup';

function Skeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="space-y-3">
      <div className="h-8 w-1/2 animate-pulse rounded bg-muted" />
      <div className="h-24 animate-pulse rounded bg-muted" />
    </div>
  );
}

function NotFound() {
  const t = useTranslations('track');
  return (
    <div className="space-y-4">
      <div role="alert" className="flex gap-3 rounded-xl border bg-card p-4">
        <SearchX aria-hidden className="mt-0.5 size-6 shrink-0 text-muted-foreground" />
        <div>
          <h2 className="font-semibold">{t('notFoundTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('notFoundBody')}</p>
        </div>
      </div>
      <TrackLookup />
    </div>
  );
}

function Lookup() {
  const t = useTranslations('track');
  const ready = useSessionReady();
  const user = useSession((s) => s.user);
  const [open, setOpen] = useState(false);

  if (!ready) return <Skeleton label={t('loading')} />;
  if (user) {
    return (
      <div className="space-y-6">
        <TrackLookup />
        <section className="space-y-3">
          <h2 className="font-semibold">{t('myRequests')}</h2>
          <MyRequests userId={user.id} />
        </section>
      </div>
    );
  }
  return (
    <>
      <TrackLookup>
        <Button type="button" variant="outline" className="min-h-11 w-full bg-background sm:w-auto" onClick={() => setOpen(true)}>
          {t('viewAll')}
        </Button>
      </TrackLookup>
      <OtpDialog open={open} onOpenChange={setOpen} onVerified={() => undefined} />
    </>
  );
}

function Detail({ number }: { number: string }) {
  const t = useTranslations('track');
  const tr = useTranslations();
  const store = useStore();
  const [detail, setDetail] = useState<RequestDetail | null | undefined>();

  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    store
      .getRequest(number)
      .catch(() => null)
      .then((d) => {
        if (!cancelled) setDetail(d);
      });
    return () => {
      cancelled = true;
    };
  }, [store, number, version]);

  if (detail === undefined) return <Skeleton label={t('loading')} />;
  if (detail === null) return <NotFound />;

  const { request, location, timeline, messages, documents } = detail;
  const stage = citizenStage(request.status);
  const files = customerDocuments(documents);

  return (
    <div className="space-y-6">
      <section className="space-y-1 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-base font-semibold break-all">{request.requestNumber}</p>
          <StatusBadge status={request.status} />
        </div>
        <p className="text-sm font-medium">{tr(`services.${request.serviceType}.name`)}</p>
        <p className="text-sm text-muted-foreground">
          <LocationLabel location={location} />
        </p>
        {request.surveyNo && (
          <p className="text-sm text-muted-foreground">
            {t('survey')} {request.surveyNo}
            {request.hissaNo ? `/${request.hissaNo}` : ''}
          </p>
        )}
      </section>

      {stage === 'closed' ? (
        <section className="space-y-2 rounded-xl border bg-card p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Ban aria-hidden className="size-5 shrink-0 text-muted-foreground" />
            {request.status === 'RECORD_UNAVAILABLE' ? t('unavailableTitle') : t('cancelledTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {request.status === 'RECORD_UNAVAILABLE' ? t('unavailableBody') : t('cancelledBody')}
          </p>
        </section>
      ) : (
        <Stepper stage={stage} />
      )}

      {request.status === 'ACTION_REQUIRED' && (
        <ActionBanner message={bannerMessage(messages)}>
          <ReplyBox requestId={request.id} onSent={() => setVersion((v) => v + 1)} />
        </ActionBanner>
      )}

      {(request.status === 'DELIVERED' || request.status === 'RECORD_UNAVAILABLE') && (
        <DeliveredFiles documents={files} />
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">{t('history')}</h2>
        <Timeline entries={timeline} />
      </section>

      <Link href="/track/" className="inline-flex min-h-11 items-center text-sm underline">
        {t('backToLookup')}
      </Link>
    </div>
  );
}

export function TrackView() {
  const t = useTranslations('track');
  const raw = (useSearchParams().get('id') ?? '').trim();
  const number = raw ? resolveTrackId(raw) : null;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      {!raw ? <Lookup /> : number ? <Detail key={number} number={number} /> : <NotFound />}
    </div>
  );
}
