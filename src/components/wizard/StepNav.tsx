'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

interface Props {
  onBack?: () => void;
  onNext?: () => void;
  /** Submit a <form id=...> instead of calling onNext. */
  formId?: string;
  nextLabel?: string;
  nextDisabled?: boolean;
  hideNext?: boolean;
}

export function StepNav({ onBack, onNext, formId, nextLabel, nextDisabled, hideNext }: Props) {
  const t = useTranslations('wizard');
  return (
    <div className="sticky bottom-0 -mx-4 mt-6 flex gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur">
      {onBack && (
        <Button type="button" variant="outline" className="min-h-11 flex-1 sm:flex-none sm:px-6" onClick={onBack}>
          {t('back')}
        </Button>
      )}
      {!hideNext && (
        <Button
          type={formId ? 'submit' : 'button'}
          form={formId}
          className="min-h-11 flex-[2] sm:flex-none sm:px-8"
          disabled={nextDisabled}
          onClick={formId ? undefined : onNext}
        >
          {nextLabel ?? t('next')}
        </Button>
      )}
    </div>
  );
}
