'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/data/provider';
import type { ServiceRequest } from '@/domain/types';

/** The signed-in user's own requests. `list` is undefined while loading; `failed` after an error. */
export function useMyRequests(userId: string): { list?: ServiceRequest[]; failed: boolean } {
  const store = useStore();
  const [state, setState] = useState<{ userId: string; list?: ServiceRequest[]; failed: boolean }>();
  useEffect(() => {
    let cancelled = false;
    store
      .listRequests({ userId })
      .then((list) => !cancelled && setState({ userId, list, failed: false }))
      .catch(() => !cancelled && setState({ userId, failed: true }));
    return () => {
      cancelled = true;
    };
  }, [store, userId]);
  return state && state.userId === userId ? state : { failed: false };
}
