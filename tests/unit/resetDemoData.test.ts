// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createDemoStore } from '@/data/demoStore';
import { resetDemoData } from '@/components/shell/resetDemoData';
import { useSession } from '@/store/session';
import { useWizard } from '@/store/wizard';

describe('resetDemoData', () => {
  it('restores the seed, signs out and drops the half-filled order including sessionStorage', async () => {
    const store = await createDemoStore({ memory: true });
    const users = await store.listUsers();
    useSession.getState().signIn(users[0]);
    useWizard.getState().patch({ serviceType: 'OLD_RTC', step: 3, phone: '9876543210', details: { surveyNo: '45' } });
    expect(sessionStorage.getItem('hd-wizard')).toContain('OLD_RTC');

    await store.createRequests(
      [
        {
          details: { serviceType: 'OLD_RTC', surveyNo: '1', yearFrom: 1970, yearTo: 1971 },
          villageId: (await store.listLocations())[0].id,
          delivery: { mode: 'DIGITAL' },
          phone: '9876543210',
        },
      ],
      users[0].id,
    );
    expect((await store.listRequests()).length).toBe(31);

    await resetDemoData(store);

    expect((await store.listRequests()).length).toBe(30);
    expect(useSession.getState().user).toBeNull();
    const w = useWizard.getState();
    expect([w.serviceType, w.step, w.phone, w.details]).toEqual([undefined, 0, undefined, {}]);
    expect(sessionStorage.getItem('hd-wizard')).toBeNull();
  });
});
