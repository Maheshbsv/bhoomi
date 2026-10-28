import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const DOT = { green: 'bg-green-600', orange: 'bg-orange-500', red: 'bg-red-600' } as const;

export function SlaDot({ color, className }: { color: 'green' | 'orange' | 'red'; className?: string }) {
  const t = useTranslations('sla');
  return (
    <span className={cn('inline-flex items-center', className)}>
      <span aria-hidden className={cn('inline-block size-2.5 rounded-full', DOT[color])} />
      <span className="sr-only">{t(color)}</span>
    </span>
  );
}
