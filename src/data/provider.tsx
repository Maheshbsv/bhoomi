'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import type { DataStore } from './DataStore';
import { createDemoStore } from './demoStore';

interface StoreState {
  store: DataStore | null;
  failed: boolean;
}

const StoreContext = createContext<DataStore | null>(null);
const StateContext = createContext<StoreState>({ store: null, failed: false });

/** Always renders its children. The store is opened after first paint so static pages never wait for IndexedDB. */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>({ store: null, failed: false });
  const [dismissed, setDismissed] = useState(false);
  const t = useTranslations('storage');

  useEffect(() => {
    let cancelled = false;
    const start = () => {
      createDemoStore()
        .catch(() => createDemoStore({ memory: true }))
        .then((s) => {
          if (!cancelled) setState({ store: s, failed: false });
        })
        .catch(() => {
          if (!cancelled) setState({ store: null, failed: true });
        });
    };
    let cancel: () => void;
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(start, { timeout: 1000 });
      cancel = () => window.cancelIdleCallback(id);
    } else {
      const id = setTimeout(start, 50);
      cancel = () => clearTimeout(id);
    }
    return () => {
      cancelled = true;
      cancel();
    };
  }, []);

  const { store } = state;
  return (
    <StateContext.Provider value={state}>
      <StoreContext.Provider value={store}>
        {store && !store.persistent && !dismissed && (
          <div role="alert" className="flex items-center justify-between gap-3 bg-amber-100 px-4 py-2 text-sm text-amber-950">
            <span>{t('unavailable')}</span>
            <button type="button" className="min-h-11 min-w-11 px-2 underline" onClick={() => setDismissed(true)}>
              {t('dismiss')}
            </button>
          </div>
        )}
        {children}
      </StoreContext.Provider>
    </StateContext.Provider>
  );
}

/** Renders children only once the store is ready. Everything that calls useStore() sits inside one. */
export function StoreGate({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const t = useTranslations('storage');
  const { store, failed } = useContext(StateContext);
  if (store) return <>{children}</>;
  if (fallback !== undefined) return <>{fallback}</>;
  if (failed) return <div role="alert" className="p-4 text-sm">{t('unavailable')}</div>;
  return (
    <div className="mx-auto w-full max-w-3xl space-y-3 p-4" aria-busy="true">
      <div className="h-8 w-1/2 animate-pulse rounded bg-muted" />
      <div className="h-24 animate-pulse rounded bg-muted" />
      <div className="h-24 animate-pulse rounded bg-muted" />
    </div>
  );
}

export function useStore(): DataStore {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used inside a ready <StoreGate>');
  return s;
}
