import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import type { RequestMessage } from '@/domain/types';

export function ActionBanner({ message, children }: { message: RequestMessage | null; children: ReactNode }) {
  const t = useTranslations('track');
  const tpl = useTranslations('templates');
  // Only templates are shown, in the active locale. With no template (status set by hand) a generic prompt stands in.
  const text = message?.templateKey ? tpl(message.templateKey as never) : t('actionGeneric');
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
