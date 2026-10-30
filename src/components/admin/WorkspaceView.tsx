'use client';

import { useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, SearchX } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminGate } from './AdminGate';
import { ActionPanel } from './ActionPanel';
import { DetailsPanel } from './DetailsPanel';
import { WhatsAppThread } from './WhatsAppThread';
import { useWorkspace, type Workspace } from './useWorkspace';

const DESKTOP = '(min-width: 1024px)';

function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(DESKTOP);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  );
}

function BackLink() {
  const t = useTranslations('admin.ws');
  return (
    <Link href="/admin/" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-primary hover:underline">
      <ArrowLeft aria-hidden className="size-4" />
      {t('back')}
    </Link>
  );
}

function Message({ title, body, retry }: { title: string; body?: string; retry?: () => void }) {
  const t = useTranslations('admin');
  return (
    <div role="alert" className="flex gap-3 rounded-xl border bg-card p-4">
      <SearchX aria-hidden className="mt-0.5 size-6 shrink-0 text-muted-foreground" />
      <div className="space-y-2">
        <h2 className="font-semibold">{title}</h2>
        {body && <p className="text-sm text-muted-foreground">{body}</p>}
        {retry && (
          <Button type="button" variant="outline" className="min-h-11" onClick={retry}>
            {t('retry')}
          </Button>
        )}
      </div>
    </div>
  );
}

function Panels({ ws }: { ws: Workspace }) {
  const t = useTranslations('admin.ws.tabs');
  const desktop = useIsDesktop();
  if (desktop) {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1fr)] items-start gap-6">
        <DetailsPanel detail={ws.detail} />
        <ActionPanel ws={ws} />
        <WhatsAppThread ws={ws} />
      </div>
    );
  }
  return (
    <Tabs defaultValue="details">
      <TabsList className="h-11 w-full">
        <TabsTrigger value="details" className="min-h-11">
          {t('details')}
        </TabsTrigger>
        <TabsTrigger value="actions" className="min-h-11">
          {t('actions')}
        </TabsTrigger>
        <TabsTrigger value="chat" className="min-h-11">
          {t('chat')}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="details" keepMounted className="pt-3">
        <DetailsPanel detail={ws.detail} />
      </TabsContent>
      <TabsContent value="actions" keepMounted className="pt-3">
        <ActionPanel ws={ws} />
      </TabsContent>
      <TabsContent value="chat" keepMounted className="pt-3">
        <WhatsAppThread ws={ws} />
      </TabsContent>
    </Tabs>
  );
}

function WorkspaceBody() {
  const t = useTranslations('admin.ws');
  const id = useSearchParams().get('id')?.trim() ?? '';
  const { state, ws } = useWorkspace(id);

  let body;
  if (!id || state === 'missing') body = <Message title={t('notFoundTitle')} body={t('notFoundBody')} />;
  else if (state === 'error') body = <Message title={t('loadError')} retry={() => window.location.reload()} />;
  else if (state === 'loading' || !ws)
    body = (
      <div role="status" aria-busy="true" aria-label={t('loading')} className="space-y-3">
        <div className="h-8 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded bg-muted" />
      </div>
    );
  else body = <Panels ws={ws} />;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-3 px-4 py-4">
      <BackLink />
      {body}
    </div>
  );
}

export function WorkspaceView() {
  return (
    <AdminGate>
      <WorkspaceBody />
    </AdminGate>
  );
}
