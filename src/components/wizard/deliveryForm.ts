import { z } from 'zod';
import { DeliverySchema } from '@/domain/schemas';

/** A digital-only order ignores any half-typed address. Parsed output is what the wizard stores. */
export const DeliveryFormSchema = z.preprocess((v) => {
  const o = v as { mode?: string };
  return o?.mode === 'DIGITAL' || !o?.mode ? { ...o, address: undefined } : v;
}, DeliverySchema);
