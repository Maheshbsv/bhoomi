'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useStore } from '@/data/provider';
import { StoreError, type RequestDetail } from '@/data/DataStore';
import type { User } from '@/domain/types';
import { useSession } from '@/store/session';

export interface Workspace {
  detail: RequestDetail;
  actorId: string;
  /** user id -> display name */
  names: Record<string, string>;
  pending: boolean;
  /** Runs a mutation: disables controls, toasts any error, always refetches. Resolves true on success. */
  run(fn: () => Promise<unknown>): Promise<boolean>;
}

type Loaded = { id: string; detail: RequestDetail | null } | { id: string; failed: true };

/** Loads one request (guarding stale loads) plus the user directory, and wraps mutations. */
export function useWorkspace(id: string): {
  state: 'loading' | 'error' | 'missing' | 'ready';
  ws: Workspace | null;
} {
  const store = useStore();
  const t = useTranslations();
  const session = useSession((s) => s.user);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [tick, setTick] = useState(0);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    store
      .getRequest(id)
      .then((detail) => !cancelled && setLoaded({ id, detail }))
      .catch(() => !cancelled && setLoaded({ id, failed: true }));
    return () => {
      cancelled = true;
    };
  }, [store, id, tick]);

  useEffect(() => {
    let cancelled = false;
    store
      .listUsers()
      .then((u) => !cancelled && setUsers(u))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [store]);

  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      setPending(true);
      try {
        await fn();
        return true;
      } catch (e) {
        const code = e instanceof StoreError ? `errors.${e.code}` : '';
        toast.error(code && t.has(code) ? t(code) : t('admin.ws.genericError'));
        return false;
      } finally {
        setPending(false);
        setTick((n) => n + 1);
      }
    },
    [t],
  );

  const names = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u.fullName ?? u.phoneNumber])), [users]);

  if (!loaded || loaded.id !== id) return { state: 'loading', ws: null };
  if ('failed' in loaded) return { state: 'error', ws: null };
  if (!loaded.detail || !session) return { state: loaded.detail ? 'loading' : 'missing', ws: null };
  return { state: 'ready', ws: { detail: loaded.detail, actorId: session.id, names, pending, run } };
}
