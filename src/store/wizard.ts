'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ServiceType } from '@/domain/types';
import { validateUpload, type UploadResult } from '@/domain/uploads';

export interface WizardLocation {
  districtEn?: string;
  talukEn?: string;
  hobliEn?: string;
  villageId?: number;
}

export interface WizardAddress {
  name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  district?: string;
  pincode?: string;
}

export interface WizardDelivery {
  mode: 'DIGITAL' | 'PHYSICAL' | 'BOTH';
  email?: string;
  address?: WizardAddress;
}

export type WizardStep = 0 | 1 | 2 | 3 | 4 | 5;

interface Data {
  step: WizardStep;
  serviceType?: ServiceType;
  location: WizardLocation;
  /** Raw form values for the details step (strings as typed). */
  details: Record<string, unknown>;
  files: File[];
  /** How many files were attached; survives a refresh so we can ask for them again. */
  fileCount: number;
  delivery?: WizardDelivery;
  phone?: string;
}

interface WizardState extends Data {
  setStep(step: WizardStep): void;
  patch(partial: Partial<Data>): void;
  addFile(file: File): UploadResult;
  removeFile(index: number): void;
  reset(): void;
}

const initial: Data = { step: 0, location: {}, details: {}, files: [], fileCount: 0 };

/**
 * Persisted to sessionStorage (`hd-wizard`) WITHOUT files. `skipHydration` keeps the first client render equal to
 * the prerendered HTML; the wizard page rehydrates after mount.
 */
export const useWizard = create<WizardState>()(
  persist(
    (set, get) => ({
      ...initial,
      setStep: (step) => set({ step }),
      patch: (partial) => set(partial),
      addFile: (file) => {
        const result = validateUpload(file, get().files.length);
        if (result.ok) {
          const files = [...get().files, file];
          set({ files, fileCount: files.length });
        }
        return result;
      },
      removeFile: (index) => {
        const files = get().files.filter((_, i) => i !== index);
        set({ files, fileCount: files.length });
      },
      reset: () => set({ ...initial, serviceType: undefined, delivery: undefined, phone: undefined, location: {}, details: {}, files: [] }),
    }),
    {
      name: 'hd-wizard',
      skipHydration: true,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({
        step: s.step,
        serviceType: s.serviceType,
        location: s.location,
        details: s.details,
        fileCount: s.fileCount,
        delivery: s.delivery,
        phone: s.phone,
      }),
    },
  ),
);
