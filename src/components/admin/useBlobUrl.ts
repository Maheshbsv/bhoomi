'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/data/provider';

/** Object URL for a stored blob. Revoked when the key changes or the component unmounts. */
export function useBlobUrl(storageKey: string | undefined): string | null {
  const store = useStore();
  const [loaded, setLoaded] = useState<{ key: string; url: string } | null>(null);
  useEffect(() => {
    if (!storageKey) return;
    let cancelled = false;
    let created: string | null = null;
    store
      .getBlob(storageKey)
      .then((blob) => {
        if (cancelled || !blob) return;
        created = URL.createObjectURL(blob);
        setLoaded({ key: storageKey, url: created });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [store, storageKey]);
  return loaded && loaded.key === storageKey ? loaded.url : null;
}
