'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function TrackLookup({ initial = '', children }: { initial?: string; children?: ReactNode }) {
  const t = useTranslations('track');
  const router = useRouter();
  const [value, setValue] = useState(initial);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    router.push(`/track/?id=${encodeURIComponent(value.trim())}`);
  }

  return (
    <div className="space-y-3">
      <form onSubmit={onSubmit} className="space-y-1.5">
        <Label htmlFor="lookup-id">{t('lookupLabel')}</Label>
        <div className="flex gap-2">
          <Input
            id="lookup-id"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t('lookupPlaceholder')}
            autoComplete="off"
            autoCapitalize="characters"
            className="h-11 bg-background"
          />
          <Button type="submit" className="min-h-11 shrink-0 px-5">
            {t('lookupButton')}
          </Button>
        </div>
      </form>
      {children}
    </div>
  );
}
