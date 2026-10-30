'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/routing';
import { useStore } from '@/data/provider';
import { useSession, useSessionReady } from '@/store/session';
import { resetDemoData } from './resetDemoData';
import type { User } from '@/domain/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const ROLES = [
  { key: 'citizen', match: (u: User) => u.phoneNumber === '+919876543210', href: '/track/' },
  { key: 'advocate', match: (u: User) => u.phoneNumber === '+919000000005', href: '/pro/' },
  { key: 'operator', match: (u: User) => u.phoneNumber === '+919000000001', href: '/admin/' },
] as const;

export function DemoControls() {
  const t = useTranslations('demo');
  const store = useStore();
  const router = useRouter();
  const user = useSession((s) => s.user);
  const signIn = useSession((s) => s.signIn);
  const signOut = useSession((s) => s.signOut);
  const ready = useSessionReady();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function switchRole(role: (typeof ROLES)[number]) {
    try {
      const found = (await store.listUsers()).find(role.match);
      if (!found) throw new Error('user not found');
      signIn(found);
      router.push(role.href);
    } catch {
      toast.error(t('error'));
    }
  }

  async function reset() {
    setBusy(true);
    try {
      await resetDemoData(store);
      setOpen(false);
      toast.success(t('resetDone'));
      router.push('/');
    } catch {
      toast.error(t('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label={t('controls')} className="mx-auto w-full max-w-5xl space-y-1 px-4 py-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{t('viewAs')}</span>
        {ROLES.map((r) => (
          <Button key={r.key} type="button" variant="outline" className="min-h-11 px-4" onClick={() => switchRole(r)}>
            {t(r.key)}
          </Button>
        ))}
        <Button type="button" variant="ghost" className="min-h-11 px-4 text-accent" onClick={() => setOpen(true)}>
          {t('reset')}
        </Button>
      </div>
      <p className="flex flex-wrap items-center gap-x-2 text-muted-foreground" aria-live="polite">
        {ready && user ? (
          <>
            <span>{t('signedInAs', { name: user.fullName ?? t('unnamed') })}</span>
            <span aria-hidden>·</span>
            <button type="button" className="inline-flex min-h-11 items-center underline" onClick={() => signOut()}>
              {t('signOut')}
            </button>
          </>
        ) : (
          <span className="inline-flex min-h-11 items-center">{t('notSignedIn')}</span>
        )}
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('resetTitle')}</DialogTitle>
            <DialogDescription>{t('resetBody')}</DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton={false}>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="button" className="min-h-11" disabled={busy} onClick={reset}>
              {t('resetConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
