'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import type { DataStore } from './DataStore';

interface StoreState {
  store: DataStore | null;
  failed: boolean;
}

const StoreContext = createContext<DataStore | null>(null);
const StateContext = createContext<StoreState>({ store: null, failed: false });
const RequestContext = createContext<() => Promise<DataStore>>(() =>
  Promise.reject(new Error('requestStore used outside <StoreProvider>')),
);

/** Always renders its children. The store is opened on demand (see useRequestStore), never on mount, so static pages cost nothing. */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>({ store: null, failed: false });
  const [dismissed, setDismissed] = useState(false);
  const t = useTranslations('storage');
  const pending = useRef<Promise<DataStore> | null>(null);

  const requestStore = useCallback((): Promise<DataStore> => {
    if (!pending.current) {
      // Dynamic import keeps the store (idb-keyval, and through it the seed and pdf-lib chunks) off pages that never ask.
      const p = import('./demoStore')
        .then(({ createDemoStore }) => createDemoStore().catch(() => createDemoStore({ memory: true })))
        .then(
          (s) => {
            setState({ store: s, failed: false });
            return s;
          },
          (e) => {
            setState({ store: null, failed: true });
            throw e;
          },
        );
      pending.current = p;
    }
    return pending.current;
  }, []);

  const { store } = state;
  return (
    <RequestContext.Provider value={requestStore}>
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
    </RequestContext.Provider>
  );
}

/** Starts the store if it is not started yet and resolves once it is ready; rejects if it cannot be opened at all. */
export function useRequestStore(): () => Promise<DataStore> {
  return useContext(RequestContext);
}

/** Renders children only once the store is ready. Everything that calls useStore() sits inside one. */
export function StoreGate({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const t = useTranslations('storage');
  const { store, failed } = useContext(StateContext);
  const requestStore = useRequestStore();
  const wantsStore = fallback === undefined;
  useEffect(() => {
    if (wantsStore) requestStore().catch(() => {}); // failure is reflected in `failed`
  }, [wantsStore, requestStore]);
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
