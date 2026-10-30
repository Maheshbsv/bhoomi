import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = ['s0', 's1', 's2', 's3', 's4'] as const;

/** Five citizen-facing steps. `stage` is 0..4 from citizenStage(). */
export function Stepper({ stage }: { stage: 0 | 1 | 2 | 3 | 4 }) {
  const t = useTranslations('track');
  return (
    <ol aria-label={t('stepperLabel')} className="grid grid-cols-5 gap-1">
      {STEPS.map((s, i) => {
        const done = i < stage || stage === 4;
        const current = i === stage && stage !== 4;
        return (
          <li
            key={s}
            aria-current={current ? 'step' : undefined}
            className="relative flex flex-col items-center gap-1.5 text-center"
          >
            {i > 0 && (
              <span
                aria-hidden
                className={cn('absolute top-3.5 right-1/2 h-0.5 w-full', i <= stage ? 'bg-primary' : 'bg-border')}
              />
            )}
            <span
              className={cn(
                'relative z-10 flex size-7 items-center justify-center rounded-full border-2 text-xs font-semibold',
                done && 'border-primary bg-primary text-primary-foreground',
                current && 'border-primary bg-background text-primary ring-4 ring-primary/20',
                !done && !current && 'border-border bg-background text-muted-foreground',
              )}
            >
              {done ? <Check aria-hidden className="size-4" /> : i + 1}
            </span>
            <span className={cn('text-[11px] leading-tight break-words sm:text-xs', current ? 'font-semibold' : 'text-muted-foreground')}>
              {t(`stepsList.${s}`)}
              {current && <span className="sr-only"> ({t('currentStep')})</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
