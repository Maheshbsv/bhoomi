'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { RUNNERS } from '@/data/seedTables';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** Free-text runner name with the seeded runners as suggestions. */
export function RunnerAssign({ value, onChange, disabled }: { value: string; onChange(v: string): void; disabled?: boolean }) {
  const t = useTranslations('admin.ws.runner');
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{t('label')}</Label>
      <Input
        id={id}
        list={`${id}-list`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('placeholder')}
        disabled={disabled}
        className="h-11 bg-background"
      />
      <datalist id={`${id}-list`}>
        {RUNNERS.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
    </div>
  );
}
