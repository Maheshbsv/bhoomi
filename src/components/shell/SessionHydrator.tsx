'use client';

import { useEffect } from 'react';
import { useSession } from '@/store/session';

export function SessionHydrator() {
  useEffect(() => {
    try {
      void useSession.persist.rehydrate();
    } catch {
      /* storage blocked: stay signed out */
    }
  }, []);
  return null;
}
