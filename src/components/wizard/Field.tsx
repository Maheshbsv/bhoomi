'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { FIELD_LABELS, type FieldName } from './fieldLabels';

/** "English / ಕನ್ನಡ" label, always both scripts. */
export function DualLabel({ name, htmlFor, required }: { name: FieldName; htmlFor?: string; required?: boolean }) {
  const t = useTranslations('wizard');
  const l = FIELD_LABELS[name];
  return (
    <Label htmlFor={htmlFor} className="flex-wrap gap-x-1 leading-snug">
      <span>
        {l.en} / <span lang="kn">{l.kn}</span>
      </span>
      {required ? (
        <span aria-hidden className="text-destructive">*</span>
      ) : (
        <span className="text-xs font-normal text-muted-foreground">({t('optional')})</span>
      )}
    </Label>
  );
}

/** Translates a zod message (an `errors.*` key) for display. */
export function useErrorText() {
  const t = useTranslations();
  return (message?: string) => {
    if (!message) return undefined;
    return message.startsWith('errors.') ? t(message) : t('errors.required');
  };
}

export function FieldShell({
  name,
  id,
  required,
  error,
  hint,
  children,
}: {
  name: FieldName;
  id: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <DualLabel name={name} htmlFor={id} required={required} />
      {children}
      {hint && !error && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${id}-err`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass = 'h-11 bg-background';
