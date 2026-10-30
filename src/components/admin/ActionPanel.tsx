'use client';

import { useState } from 'react';
import { reconcileOrder } from './workspaceLogic';
import { DeliverablePreview } from './DeliverablePreview';
import { NotesPanel } from './NotesPanel';
import { OperatorTimeline } from './OperatorTimeline';
import { ScanUploader } from './ScanUploader';
import { StatusControl } from './StatusControl';
import type { Workspace } from './useWorkspace';

/** Centre column. Owns the scan order, which the uploader edits and the PDF builder consumes. */
export function ActionPanel({ ws }: { ws: Workspace }) {
  const [userOrder, setUserOrder] = useState<string[]>([]);
  const docs = ws.detail.documents;
  const scanDocs = docs.filter((d) => d.fileType === 'OPERATOR_SCAN').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const orderedIds = reconcileOrder(userOrder, scanDocs.map((d) => d.id));
  const byId = new Map(scanDocs.map((d) => [d.id, d]));
  const scans = orderedIds.map((id) => byId.get(id)!);
  const hasFinal = docs.some((d) => d.fileType === 'FINAL_DELIVERABLE');

  return (
    <div className="space-y-6">
      <StatusControl ws={ws} />
      <ScanUploader ws={ws} scans={scans} hasFinal={hasFinal} onReorder={setUserOrder} />
      <DeliverablePreview ws={ws} scans={scans} />
      <NotesPanel ws={ws} />
      <OperatorTimeline ws={ws} />
    </div>
  );
}
