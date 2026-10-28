import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { SERVICE_CATALOG } from '@/domain/services';
import type { ServiceType } from '@/domain/types';
import en from '../../../messages/en.json';
import kn from '../../../messages/kn.json';

export function ServiceCard({ type }: { type: ServiceType }) {
  const t = useTranslations();
  const locale = useLocale();
  const [min, max] = SERVICE_CATALOG[type].typicalDays;
  // Both languages are always shown; the active locale's name leads.
  const other = (locale === 'kn' ? en : kn).services[type].name;
  return (
    <Link
      href={`/request/?service=${type}`}
      className="group flex min-h-11 flex-col gap-2 rounded-lg border bg-card p-4 transition-colors hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div>
        <h3 className="text-base font-semibold">{t(`services.${type}.name`)}</h3>
        <p lang={locale === 'kn' ? 'en' : 'kn'} className="text-sm text-muted-foreground">
          {other}
        </p>
      </div>
      <p className="text-sm">{t(`services.${type}.desc`)}</p>
      <div className="mt-auto flex items-center justify-between pt-1 text-sm text-primary">
        <span>{t('landing.typicalDays', { min, max })}</span>
        <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
