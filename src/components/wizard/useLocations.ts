'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/data/provider';
import type { Location } from '@/domain/types';

/** All active locations, loaded once from the store. */
export function useLocations(): Location[] | null {
  const store = useStore();
  const [locs, setLocs] = useState<Location[] | null>(null);
  useEffect(() => {
    let live = true;
    store
      .listLocations()
      .then((l) => {
        if (live) setLocs(l.filter((x) => x.isActive));
      })
      .catch(() => {
        if (live) setLocs([]);
      });
    return () => {
      live = false;
    };
  }, [store]);
  return locs;
}
