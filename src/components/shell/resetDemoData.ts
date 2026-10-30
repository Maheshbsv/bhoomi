import type { DataStore } from '@/data/DataStore';
import { useSession } from '@/store/session';
import { useWizard } from '@/store/wizard';

/** Wipes and reseeds the store, signs out and drops any half-filled order (in memory and in sessionStorage). */
export async function resetDemoData(store: DataStore): Promise<void> {
  await store.reset();
  useSession.getState().signOut();
  useWizard.getState().reset();
  useWizard.persist.clearStorage();
}
