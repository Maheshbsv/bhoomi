'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import type { DataStore } from './DataStore';
import { createDemoStore } from './demoStore';

const StoreContext = createContext<DataStore | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<DataStore | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const t = useTranslations('storage');

  useEffect(() => {
    let cancelled = false;
    createDemoStore().then((s) => {
      if (!cancelled) setStore(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!store) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-3 p-4" aria-busy="true">
        <div className="h-8 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-24 animate-pulse rounded bg-muted" />
        <div className="h-24 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <StoreContext.Provider value={store}>
      {!store.persistent && !dismissed && (
        <div role="alert" className="flex items-center justify-between gap-3 bg-amber-100 px-4 py-2 text-sm text-amber-950">
          <span>{t('unavailable')}</span>
          <button type="button" className="min-h-11 min-w-11 px-2 underline" onClick={() => setDismissed(true)}>
            {t('dismiss')}
          </button>
        </div>
      )}
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): DataStore {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used inside <StoreProvider>');
  return s;
}
