import type { OrderStatus } from './types';

export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  SUBMITTED: ['UNDER_REVIEW', 'CANCELLED'],
  UNDER_REVIEW: ['ACTION_REQUIRED', 'ASSIGNED_TO_RUNNER', 'CANCELLED'],
  ACTION_REQUIRED: ['CUSTOMER_RESPONDED', 'CANCELLED'],
  CUSTOMER_RESPONDED: ['UNDER_REVIEW', 'ACTION_REQUIRED', 'ASSIGNED_TO_RUNNER', 'CANCELLED'],
  ASSIGNED_TO_RUNNER: ['ARCHIVE_SEARCH_IN_PROGRESS', 'CANCELLED'],
  ARCHIVE_SEARCH_IN_PROGRESS: ['DOCUMENT_RETRIEVED', 'RECORD_UNAVAILABLE', 'ACTION_REQUIRED', 'CANCELLED'],
  DOCUMENT_RETRIEVED: ['QC_WATERMARK_MERGE'],
  QC_WATERMARK_MERGE: ['DELIVERED'],
  RECORD_UNAVAILABLE: [],
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** CUSTOMER_RESPONDED is automatic (customer reply), never an operator choice. */
export function operatorNextStatuses(from: OrderStatus): OrderStatus[] {
  return TRANSITIONS[from].filter((s) => s !== 'CUSTOMER_RESPONDED');
}

export function isTerminal(s: OrderStatus): boolean {
  return TRANSITIONS[s].length === 0;
}

/** Five-step citizen stepper index (0..4), or 'closed' for unavailable/cancelled. */
export function citizenStage(s: OrderStatus): 0 | 1 | 2 | 3 | 4 | 'closed' {
  switch (s) {
    case 'SUBMITTED':
      return 0;
    case 'UNDER_REVIEW':
    case 'ACTION_REQUIRED':
    case 'CUSTOMER_RESPONDED':
      return 1;
    case 'ASSIGNED_TO_RUNNER':
    case 'ARCHIVE_SEARCH_IN_PROGRESS':
      return 2;
    case 'DOCUMENT_RETRIEVED':
    case 'QC_WATERMARK_MERGE':
      return 3;
    case 'DELIVERED':
      return 4;
    default:
      return 'closed';
  }
}
