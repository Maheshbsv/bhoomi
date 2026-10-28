'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Progress } from '@/components/ui/progress';
import { SERVICE_CATALOG } from '@/domain/services';
import type { ServiceType } from '@/domain/types';
import { useWizard, type WizardStep } from '@/store/wizard';
import { cn } from '@/lib/utils';
import { StepDelivery } from './StepDelivery';
import { StepDetails } from './StepDetails';
import { StepLocation } from './StepLocation';
import { StepService } from './StepService';
import { StepUploads } from './StepUploads';
import { StepVerify } from './StepVerify';

const STEP_KEYS = ['service', 'location', 'details', 'uploads', 'delivery', 'verify'] as const;

export function WizardShell() {
  const t = useTranslations('wizard');
  const [ready, setReady] = useState(false);
  const step = useWizard((s) => s.step);
  const serviceType = useWizard((s) => s.serviceType);

  // Read sessionStorage after mount so the first render matches the prerendered HTML.
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve(useWizard.persist.rehydrate()).finally(() => {
      if (cancelled) return;
      const wanted = new URLSearchParams(window.location.search).get('service');
      if (wanted && wanted in SERVICE_CATALOG) {
        const s = useWizard.getState();
        if (s.serviceType !== wanted) {
          s.patch({ serviceType: wanted as ServiceType, details: {}, step: 1 });
        } else if (s.step === 0) {
          s.setStep(1);
        }
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
    // Only the first load decides whether ?service= skips ahead.
  }, []);

  if (!ready) {
    return <div className="mx-auto h-64 w-full max-w-2xl animate-pulse px-4 py-6" aria-busy="true" />;
  }

  const current: WizardStep = serviceType ? step : 0;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-5 pb-2">
      <nav aria-label={t('progress')} className="mb-5">
        <p className="mb-2 flex items-baseline justify-between text-sm">
          <span className="font-semibold">{t('stepOf', { n: current + 1, total: STEP_KEYS.length })}</span>
          <span className="text-muted-foreground">{t(`steps.${STEP_KEYS[current]}`)}</span>
        </p>
        <Progress value={((current + 1) / STEP_KEYS.length) * 100} aria-label={t('progress')} />
        <ol className="mt-2 hidden justify-between text-xs sm:flex">
          {STEP_KEYS.map((k, i) => (
            <li key={k} aria-current={i === current ? 'step' : undefined} className={cn(i === current ? 'font-semibold text-primary' : 'text-muted-foreground')}>
              {t(`steps.${k}`)}
            </li>
          ))}
        </ol>
      </nav>

      {current === 0 && <StepService />}
      {current === 1 && <StepLocation />}
      {current === 2 && serviceType && <StepDetails key={serviceType} serviceType={serviceType} />}
      {current === 3 && <StepUploads />}
      {current === 4 && <StepDelivery />}
      {current === 5 && <StepVerify />}
    </div>
  );
}
