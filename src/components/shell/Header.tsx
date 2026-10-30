'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { DemoStrip } from './DemoStrip';
import { LocaleToggle } from './LocaleToggle';

const NAV = [
  { href: '/request/', key: 'request' },
  { href: '/track/', key: 'track' },
  { href: '/pro/', key: 'pro' },
  { href: '/admin/', key: 'admin' },
] as const;

export function Header() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const linkCls = 'inline-flex min-h-11 items-center rounded-md px-3 text-sm hover:bg-muted';
  return (
    <header className="border-b bg-background print:hidden">
      <DemoStrip />
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-1">
        <Link href="/" className="flex min-h-11 flex-col justify-center leading-tight">
          <span className="text-lg font-semibold text-primary">{t('brand.name')}</span>
          <span className="text-xs text-muted-foreground">{t('brand.tagline')}</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map(({ href, key }) => (
            <Link key={key} href={href} className={linkCls}>
              {t(`nav.${key}`)}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LocaleToggle />
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-md border md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={t('nav.menu')}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" className="mx-auto flex w-full max-w-5xl flex-col px-4 pb-2 md:hidden">
          {NAV.map(({ href, key }) => (
            <Link key={key} href={href} className={linkCls} onClick={() => setOpen(false)}>
              {t(`nav.${key}`)}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
