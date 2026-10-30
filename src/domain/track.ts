import { normalizeRequestNumber } from './requestNumber';
import { CLARIFICATION_TEMPLATES } from './templates';
import type { RequestDocument, RequestMessage } from './types';

/** Normalised request number from the `?id=` value, or null when blank/invalid. */
export function resolveTrackId(raw: string | null | undefined): string | null {
  return raw ? normalizeRequestNumber(raw) : null;
}

function needsReply(m: RequestMessage): boolean {
  if (m.direction !== 'OUTBOUND') return false;
  if (!m.templateKey) return true; // free text expects an answer
  const t = CLARIFICATION_TEMPLATES.find((x) => x.key === m.templateKey);
  return t ? t.needsReply : true;
}

/** Latest OUTBOUND message that asks the customer something; informational ones are skipped. */
export function bannerMessage(messages: RequestMessage[]): RequestMessage | null {
  const sorted = messages
    .filter(needsReply)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return sorted.length ? sorted[sorted.length - 1] : null;
}

/** Documents the citizen may download. Operator scans and customer references stay hidden. */
export function customerDocuments(docs: RequestDocument[]): RequestDocument[] {
  return docs.filter((d) => d.fileType === 'FINAL_DELIVERABLE' || d.fileType === 'ENDORSEMENT_CERTIFICATE');
}
