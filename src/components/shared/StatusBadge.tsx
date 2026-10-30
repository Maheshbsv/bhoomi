import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/domain/types';

const FAMILY: Record<OrderStatus, string> = {
  SUBMITTED: 'bg-stone-100 text-stone-800 border-stone-300',
  UNDER_REVIEW: 'bg-stone-100 text-stone-800 border-stone-300',
  ACTION_REQUIRED: 'bg-amber-100 text-amber-900 border-amber-300',
  CUSTOMER_RESPONDED: 'bg-amber-100 text-amber-900 border-amber-300',
  ASSIGNED_TO_RUNNER: 'bg-blue-100 text-blue-900 border-blue-300',
  ARCHIVE_SEARCH_IN_PROGRESS: 'bg-blue-100 text-blue-900 border-blue-300',
  DOCUMENT_RETRIEVED: 'bg-violet-100 text-violet-900 border-violet-300',
  QC_WATERMARK_MERGE: 'bg-violet-100 text-violet-900 border-violet-300',
  DELIVERED: 'bg-green-100 text-green-900 border-green-300',
  RECORD_UNAVAILABLE: 'bg-red-100 text-red-900 border-red-300',
  CANCELLED: 'bg-gray-100 text-gray-600 border-gray-300',
};

export function StatusBadge({ status, className, label }: { status: OrderStatus; className?: string; label?: string }) {
  const t = useTranslations('status');
  return (
    <span
      data-status={status}
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        FAMILY[status],
        className,
      )}
    >
      {label ?? t(status)}
    </span>
  );
}
