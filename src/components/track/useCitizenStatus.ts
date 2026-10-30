import { useTranslations } from 'next-intl';
import type { OrderStatus } from '@/domain/types';

/** Citizen-facing status label: track.status.<S> where defined, else the shared status.<S>. */
export function useCitizenStatus(): (s: OrderStatus) => string {
  const t = useTranslations('track.status');
  const base = useTranslations('status');
  return (s) => (t.has(s) ? t(s) : base(s));
}
