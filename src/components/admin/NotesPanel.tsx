'use client';

import { useId, useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useStore } from '@/data/provider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatWhen } from '@/components/track/Timeline';
import type { Workspace } from './useWorkspace';

export function NotesPanel({ ws }: { ws: Workspace }) {
  const t = useTranslations('admin.ws.notes');
  const locale = useLocale();
  const store = useStore();
  const id = useId();
  const [body, setBody] = useState('');
  const notes = [...ws.detail.notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  async function add(e: FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    const ok = await ws.run(() => store.addNote(ws.detail.request.id, text, ws.actorId));
    if (ok) setBody('');
  }

  return (
    <section className="space-y-3">
      <h3 className="font-semibold">{t('title')}</h3>
      <p className="text-sm text-muted-foreground">{t('hint')}</p>
      <form onSubmit={(e) => void add(e)} className="space-y-2">
        <Label htmlFor={id} className="sr-only">
          {t('label')}
        </Label>
        <Textarea id={id} value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder={t('placeholder')} disabled={ws.pending} className="bg-background" />
        <Button type="submit" variant="outline" className="min-h-11 w-full" disabled={ws.pending || !body.trim()}>
          {t('add')}
        </Button>
      </form>
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border bg-card p-2.5 text-sm">
              <p className="break-words whitespace-pre-wrap">{n.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {ws.names[n.authorId] ?? n.authorId} · <time dateTime={n.createdAt}>{formatWhen(n.createdAt, locale)}</time>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
