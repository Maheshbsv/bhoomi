'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function TrackBox() {
  const t = useTranslations('landing');
  const router = useRouter();
  const [value, setValue] = useState('');

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    router.push(`/track/?id=${encodeURIComponent(value)}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="track-id">{t('trackLabel')}</Label>
        <Input
          id="track-id"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('trackPlaceholder')}
          autoComplete="off"
          autoCapitalize="characters"
          className="h-11 bg-background"
        />
      </div>
      <Button type="submit" className="min-h-11 px-5">
        {t('trackButton')}
      </Button>
    </form>
  );
}
