import { normalizeRequestNumber } from './requestNumber';
import { CLARIFICATION_TEMPLATES, type TemplateKey } from './templates';
import type { RequestDocument, RequestMessage } from './types';

/** Normalised request number from the `?id=` value, or null when blank/invalid. */
export function resolveTrackId(raw: string | null | undefined): string | null {
  return raw ? normalizeRequestNumber(raw) : null;
}

function needsReply(m: RequestMessage): boolean {
  if (m.direction !== 'OUTBOUND') return false;
  if (!m.templateKey) return false; // free text stays in the operator's thread; citizens only ever see templates
  const t = CLARIFICATION_TEMPLATES.find((x) => x.key === m.templateKey);
  return t ? t.needsReply : true;
}

/** Latest OUTBOUND template that asks the customer something; informational templates and free text are skipped. */
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

export type CitizenNote =
  | { kind: 'template'; key: TemplateKey }
  | { kind: 'system'; key: 'submitted' | 'customerReplied' | 'notFound' | 'cancelled' };

const SYSTEM_NOTES: Record<string, 'submitted' | 'customerReplied' | 'notFound' | 'cancelled'> = {
  'Request submitted': 'submitted',
  'Customer replied': 'customerReplied',
  'Not found in taluk record room; endorsement certificate attached': 'notFound',
  "Cancelled at the citizen's request": 'cancelled',
};

/**
 * Timeline notes are stored as English text written by the system or by operators. Only known
 * template keys and known system strings are shown to citizens; anything else (runner names,
 * operator free text) is hidden.
 */
export function citizenNote(note: string | undefined): CitizenNote | null {
  if (!note) return null;
  const tpl = CLARIFICATION_TEMPLATES.find((t) => t.key === note);
  if (tpl) return { kind: 'template', key: tpl.key };
  const sys = Object.prototype.hasOwnProperty.call(SYSTEM_NOTES, note) ? SYSTEM_NOTES[note] : undefined;
  return sys ? { kind: 'system', key: sys } : null;
}
