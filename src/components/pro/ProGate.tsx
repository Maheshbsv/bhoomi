'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Scale } from 'lucide-react';
import { useStore } from '@/data/provider';
import type { User } from '@/domain/types';
import { useSession, useSessionReady } from '@/store/session';
import { Button } from '@/components/ui/button';

/** Wraps every /pro/* page. Anyone who is not an advocate gets the demo sign-in card. */
export function ProGate({ children }: { children: ReactNode }) {
  const t = useTranslations('pro');
  const ready = useSessionReady();
  const user = useSession((s) => s.user);
  const signIn = useSession((s) => s.signIn);
  const store = useStore();
  const [advocates, setAdvocates] = useState<User[]>([]);

  const allowed = user?.role === 'ADVOCATE';

  useEffect(() => {
    if (!ready || allowed) return;
    let cancelled = false;
    store
      .listUsers()
      .then((u) => !cancelled && setAdvocates(u.filter((x) => x.role === 'ADVOCATE')))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [store, ready, allowed]);

  if (!ready) {
    return (
      <div role="status" aria-busy="true" aria-label={t('loading')} className="mx-auto w-full max-w-4xl space-y-3 px-4 py-6">
        <div className="h-8 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-24 animate-pulse rounded bg-muted" />
      </div>
    );
  }
  if (allowed) return <>{children}</>;

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <section className="space-y-4 rounded-xl border bg-card p-5">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Scale aria-hidden className="size-6 shrink-0" />
          {t('gateTitle')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('gateBody')}</p>
        <div className="flex flex-col gap-2">
          {advocates.map((a) => (
            <Button key={a.id} type="button" className="min-h-11 w-full" onClick={() => signIn(a)}>
              {t('signInAs', { name: a.fullName ?? a.phoneNumber })}
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}
