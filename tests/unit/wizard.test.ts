// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { useWizard } from '@/store/wizard';

describe('wizard store', () => {
  beforeEach(() => {
    useWizard.getState().reset();
    sessionStorage.clear();
  });

  it('persists fields but never files', () => {
    useWizard.getState().patch({ serviceType: 'OLD_RTC' });
    const r = useWizard.getState().addFile(new File([new Uint8Array(10)], 'a.jpg', { type: 'image/jpeg' }));
    expect(r).toEqual({ ok: true });
    const persisted = JSON.parse(sessionStorage.getItem('hd-wizard')!);
    expect(persisted.state.serviceType).toBe('OLD_RTC');
    expect(persisted.state.files).toBeUndefined();
    expect(persisted.state.fileCount).toBe(1);
  });

  it('rejects bad uploads without storing them', () => {
    const w = useWizard.getState();
    expect(w.addFile(new File([], 'b.heic', { type: 'image/heic' }))).toEqual({ ok: false, reason: 'TYPE' });
    expect(useWizard.getState().files).toHaveLength(0);
  });

  it('caps at five files and removes by index', () => {
    for (let i = 0; i < 5; i++) useWizard.getState().addFile(new File([new Uint8Array(1)], `f${i}.png`, { type: 'image/png' }));
    expect(useWizard.getState().addFile(new File([new Uint8Array(1)], 'x.png', { type: 'image/png' }))).toEqual({ ok: false, reason: 'COUNT' });
    useWizard.getState().removeFile(0);
    expect(useWizard.getState().files.map((f) => f.name)).toEqual(['f1.png', 'f2.png', 'f3.png', 'f4.png']);
    expect(useWizard.getState().fileCount).toBe(4);
  });

  it('reset clears everything', () => {
    useWizard.getState().patch({ serviceType: 'OLD_MR', step: 3 });
    useWizard.getState().reset();
    expect(useWizard.getState().serviceType).toBeUndefined();
    expect(useWizard.getState().step).toBe(0);
  });
});

import { DeliveryFormSchema } from '@/components/wizard/deliveryForm';
import { CreateRequestSchema } from '@/domain/schemas';

describe('delivery form to CreateRequestInput', () => {
  const base = {
    details: { serviceType: 'OLD_RTC', surveyNo: '108', yearFrom: '2005', yearTo: '2010' },
    villageId: 1,
    phone: '9876543210',
  };
  const blank = { name: '', line1: '', line2: '', city: '', district: '', pincode: '' };

  it('digital with untouched defaults is accepted', () => {
    const d = DeliveryFormSchema.parse({ mode: 'DIGITAL', email: '', address: blank });
    expect(CreateRequestSchema.safeParse({ ...base, delivery: d }).success).toBe(true);
  });

  it('physical with a filled address is accepted', () => {
    const address = { name: 'A', line1: 'B', line2: '', city: 'C', district: 'D', pincode: '570001' };
    const d = DeliveryFormSchema.parse({ mode: 'PHYSICAL', email: '', address });
    expect(CreateRequestSchema.safeParse({ ...base, delivery: d }).success).toBe(true);
  });

  it('physical with an empty address is rejected', () => {
    expect(DeliveryFormSchema.safeParse({ mode: 'PHYSICAL', email: '', address: blank }).success).toBe(false);
  });
});
