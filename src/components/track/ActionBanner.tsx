import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import type { RequestMessage } from '@/domain/types';

export function ActionBanner({ message, children }: { message: RequestMessage | null; children: ReactNode }) {
  const t = useTranslations('track');
  const tpl = useTranslations('templates');
  // Template messages are rendered in the active locale; free text is shown as written.
  const text = message ? (message.templateKey ? tpl(message.templateKey as never) : (message.body ?? '')) : '';
  return (
    <section className="space-y-3 rounded-xl border border-amber-300 bg-amber-100 p-4 text-amber-950">
      <h2 className="flex items-center gap-2 font-semibold">
        <AlertTriangle aria-hidden className="size-5 shrink-0" />
        {t('actionTitle')}
      </h2>
      {text && <p className="text-sm break-words">{text}</p>}
      {children}
    </section>
  );
}
