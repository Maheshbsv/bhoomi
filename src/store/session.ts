'use client';

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { User } from '@/domain/types';

interface SessionState {
  user: User | null;
  signIn(user: User): void;
  signOut(): void;
}

/**
 * Persisted to localStorage (`hd-session`). `skipHydration` keeps the first client render equal to the
 * prerendered HTML; <SessionHydrator/> rehydrates after mount.
 */
export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      signIn: (user) => set({ user }),
      signOut: () => set({ user: null }),
    }),
    {
      name: 'hd-session',
      skipHydration: true,
      partialize: (s) => ({ user: s.user }),
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** True once the persisted session has been read (always false during SSR / first render). */
export function useSessionReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(useSession.persist.hasHydrated());
    return useSession.persist.onFinishHydration(() => setReady(true));
  }, []);
  return ready;
}
