import { useLocale, useTranslations } from 'next-intl';
import type { TimelineEntry } from '@/domain/types';
import { citizenNote } from '@/domain/track';
import { useCitizenStatus } from './useCitizenStatus';

export function formatWhen(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale === 'kn' ? 'kn-IN' : 'en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Customer-visible history, newest first. Internal notes are never passed in. */
export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  const statusLabel = useCitizenStatus();
  const tpl = useTranslations('templates');
  const tn = useTranslations('track.note');
  const locale = useLocale();
  const sorted = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <ol className="space-y-3 border-l-2 border-border pl-4">
      {sorted.map((e) => {
        const note = citizenNote(e.note);
        return (
        <li key={e.id} className="relative">
          <span aria-hidden className="absolute top-1.5 -left-[1.4rem] size-2.5 rounded-full bg-primary" />
          <p className="text-sm font-medium">{statusLabel(e.toStatus)}</p>
          <p className="text-xs text-muted-foreground">
            <time dateTime={e.createdAt}>{formatWhen(e.createdAt, locale)}</time>
          </p>
          {note && <p className="mt-0.5 text-sm break-words">{note.kind === 'template' ? tpl(note.key) : tn(note.key)}</p>}
        </li>
        );
      })}
    </ol>
  );
}
