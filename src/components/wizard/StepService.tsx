'use client';

import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle2 } from 'lucide-react';
import { SERVICE_CATALOG } from '@/domain/services';
import type { ServiceType } from '@/domain/types';
import { useWizard } from '@/store/wizard';
import { cn } from '@/lib/utils';
import { StepNav } from './StepNav';
import en from '../../../messages/en.json';
import kn from '../../../messages/kn.json';

const SERVICES = Object.keys(SERVICE_CATALOG) as ServiceType[];

export function StepService() {
  const t = useTranslations();
  const locale = useLocale();
  const serviceType = useWizard((s) => s.serviceType);
  const patch = useWizard((s) => s.patch);

  function choose(type: ServiceType) {
    if (type === serviceType) return;
    // Different service means different fields; location is kept.
    patch({ serviceType: type, details: {} });
  }

  return (
    <div>
      <h2 className="text-xl font-semibold">{t('wizard.service.heading')}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('wizard.service.hint')}</p>
      <div role="radiogroup" aria-label={t('wizard.service.heading')} className="mt-4 space-y-3">
        {SERVICES.map((type) => {
          const selected = type === serviceType;
          const other = (locale === 'kn' ? en : kn).services[type].name;
          const [min, max] = SERVICE_CATALOG[type].typicalDays;
          return (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => choose(type)}
              className={cn(
                'flex min-h-11 w-full items-start gap-3 rounded-lg border bg-card p-4 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-primary/60',
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{t(`services.${type}.name`)}</span>
                <span lang={locale === 'kn' ? 'en' : 'kn'} className="block text-sm text-muted-foreground">
                  {other}
                </span>
                <span className="mt-1 block text-sm">{t(`services.${type}.desc`)}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{t('landing.typicalDays', { min, max })}</span>
              </span>
              <CheckCircle2
                aria-hidden
                className={cn('mt-0.5 size-5 shrink-0', selected ? 'text-primary' : 'text-transparent')}
              />
            </button>
          );
        })}
      </div>
      <StepNav hideNext={false} nextDisabled={!serviceType} onNext={() => useWizard.getState().setStep(1)} />
    </div>
  );
}
