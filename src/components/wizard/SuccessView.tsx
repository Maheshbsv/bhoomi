'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Check, CheckCircle2, Copy, Share2 } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useWizard } from '@/store/wizard';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for browsers without the async clipboard API.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

export function SuccessView() {
  const t = useTranslations('wizard.success');
  const locale = useLocale();
  const id = useSearchParams().get('id') ?? '';
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    useWizard.getState().reset();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  const trackUrl = `${origin}/bhoomi/${locale}/track/?id=${encodeURIComponent(id)}`;
  const shareText = t('shareText', { number: id, url: trackUrl });

  async function copy() {
    if (await copyText(id)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (!id) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-10">
        <p>{t('missing')}</p>
        <Link href="/request/" className={cn(buttonVariants(), 'mt-4 min-h-11 px-5')}>
          {t('newRequest')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 px-4 py-10 text-center">
      <CheckCircle2 aria-hidden className="mx-auto size-14 text-primary" />
      <div>
        <h1 className="text-2xl font-semibold">{t('heading')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subheading')}</p>
      </div>

      <div className="rounded-lg border bg-card p-5">
        <p className="text-sm text-muted-foreground">{t('numberLabel')}</p>
        <p data-testid="request-number" className="mt-1 font-mono text-3xl font-bold tracking-wide break-all">
          {id}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button type="button" onClick={copy} className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11 px-5')}>
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? t('copied') : t('copy')}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11 px-5')}
        >
          <Share2 aria-hidden />
          {t('whatsapp')}
        </a>
      </div>

      <Link
        href={`/track/?id=${encodeURIComponent(id)}`}
        className={cn(buttonVariants(), 'min-h-11 w-full px-5 sm:w-auto')}
      >
        {t('track')}
      </Link>
    </div>
  );
}
