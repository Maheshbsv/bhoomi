'use client';

import { useLocale, useTranslations } from 'next-intl';
import { formatWhen } from '@/components/track/Timeline';
import { operatorNote } from './workspaceLogic';
import type { Workspace } from './useWorkspace';

/** Operators see every entry, including free-text notes that citizens never see. */
export function OperatorTimeline({ ws }: { ws: Workspace }) {
  const t = useTranslations('admin.ws.timeline');
  const ts = useTranslations('status');
  const tpl = useTranslations('templates');
  const locale = useLocale();
  const entries = [...ws.detail.timeline].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <section className="space-y-3">
      <h3 className="font-semibold">{t('title')}</h3>
      <ol className="space-y-3 border-l-2 border-border pl-4">
        {entries.map((e) => {
          const note = operatorNote(e.note);
          return (
            <li key={e.id} className="relative">
              <span aria-hidden className="absolute top-1.5 -left-[1.4rem] size-2.5 rounded-full bg-primary" />
              <p className="text-sm font-medium">{ts(e.toStatus)}</p>
              <p className="text-xs text-muted-foreground">
                <time dateTime={e.createdAt}>{formatWhen(e.createdAt, locale)}</time>
                {' · '}
                {e.actorId ? (ws.names[e.actorId] ?? e.actorId) : t('system')}
              </p>
              {note && <p className="mt-0.5 text-sm break-words">{note.kind === 'template' ? tpl(note.key) : note.text}</p>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
