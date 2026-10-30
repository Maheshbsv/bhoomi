'use client';

import { useId, useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useStore } from '@/data/provider';
import { CLARIFICATION_TEMPLATES } from '@/domain/templates';
import { isTerminal } from '@/domain/status';
import type { RequestDocument, RequestMessage } from '@/domain/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatWhen } from '@/components/track/Timeline';
import { OpenLink } from './OpenLink';
import { SimulateReply } from './SimulateReply';
import { useBlobUrl } from './useBlobUrl';
import type { Workspace } from './useWorkspace';

function Media({ mediaKey, documents }: { mediaKey: string; documents: RequestDocument[] }) {
  const t = useTranslations('admin.ws.thread');
  const url = useBlobUrl(mediaKey);
  const doc = documents.find((d) => d.storageKey === mediaKey);
  if (doc?.mimeType.startsWith('image/')) {
    return (
      <a href={url ?? undefined} target="_blank" rel="noopener noreferrer" className="mt-1 block size-28 overflow-hidden rounded-md border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url && <img src={url} alt={doc.fileName} className="size-full object-cover" />}
        <span className="sr-only">{t('openMedia')}</span>
      </a>
    );
  }
  return (
    <div className="mt-1">
      <OpenLink url={url}>{t('openMedia')}</OpenLink>
    </div>
  );
}

function Bubble({ m, ws }: { m: RequestMessage; ws: Workspace }) {
  const t = useTranslations('admin.ws.thread');
  const tpl = useTranslations('templates');
  const locale = useLocale();
  const out = m.direction === 'OUTBOUND';
  const template = m.templateKey ? CLARIFICATION_TEMPLATES.find((x) => x.key === m.templateKey) : undefined;
  const needsReply = out && (template ? template.needsReply : true);
  return (
    <li className={cn('flex', out ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl border px-3 py-2 text-sm break-words',
          out ? 'rounded-br-sm bg-primary/10' : 'rounded-bl-sm bg-card',
        )}
      >
        <p className="mb-0.5 text-xs font-medium text-muted-foreground">
          {out ? (m.senderId ? (ws.names[m.senderId] ?? t('operator')) : t('operator')) : t('customer')}
        </p>
        {template ? <p>{tpl(template.key)}</p> : m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
        {m.mediaKey && <Media mediaKey={m.mediaKey} documents={ws.detail.documents} />}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <time dateTime={m.createdAt}>{formatWhen(m.createdAt, locale)}</time>
          {out && (
            <span className={cn('rounded-full border px-1.5', needsReply ? 'border-amber-300 bg-amber-100 text-amber-900' : 'border-border bg-muted')}>
              {needsReply ? t('needsReply') : t('info')}
            </span>
          )}
        </p>
      </div>
    </li>
  );
}

export function WhatsAppThread({ ws }: { ws: Workspace }) {
  const t = useTranslations('admin.ws.thread');
  const tpl = useTranslations('templates');
  const store = useStore();
  const id = useId();
  const [body, setBody] = useState('');
  const { request, messages } = ws.detail;
  const closed = isTerminal(request.status);
  const sorted = [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  async function sendTemplate(key: (typeof CLARIFICATION_TEMPLATES)[number]['key']) {
    await ws.run(() => store.sendMessage(request.id, { templateKey: key }, ws.actorId));
  }

  async function sendFree(e: FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    const ok = await ws.run(() => store.sendMessage(request.id, { body: text }, ws.actorId));
    if (ok) setBody('');
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">{t('title')}</h2>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <ul className="space-y-2" aria-label={t('title')}>
          {sorted.map((m) => (
            <Bubble key={m.id} m={m} ws={ws} />
          ))}
        </ul>
      )}
      {closed ? (
        <p className="rounded-lg border bg-muted/40 p-3 text-sm">{t('closed')}</p>
      ) : (
        <>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">{t('templates')}</h3>
            {CLARIFICATION_TEMPLATES.map((x) => (
              <Button
                key={x.key}
                type="button"
                variant="outline"
                disabled={ws.pending}
                onClick={() => void sendTemplate(x.key)}
                className="h-auto min-h-11 w-full flex-col items-start gap-1 py-2 text-left whitespace-normal"
              >
                <span>{tpl(x.key)}</span>
                <span className="text-xs text-muted-foreground">{x.needsReply ? t('needsReply') : t('info')}</span>
              </Button>
            ))}
          </div>
          <form onSubmit={(e) => void sendFree(e)} className="space-y-2">
            <Label htmlFor={id}>{t('body')}</Label>
            <Textarea id={id} value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder={t('bodyPlaceholder')} disabled={ws.pending} className="bg-background" />
            <Button type="submit" className="min-h-11 w-full" disabled={ws.pending || !body.trim()}>
              {t('send')}
            </Button>
          </form>
        </>
      )}
      <SimulateReply ws={ws} />
    </section>
  );
}
