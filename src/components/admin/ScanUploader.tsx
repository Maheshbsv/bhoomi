'use client';

import { useId, useState, type ChangeEvent } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, FileText, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '@/data/provider';
import { validateUpload } from '@/domain/uploads';
import type { RequestDocument } from '@/domain/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { canUploadScan, moveItem, scanOrderAfterMove } from './workspaceLogic';
import type { Workspace } from './useWorkspace';

interface Props {
  ws: Workspace;
  /** Scans in the order they will be merged. */
  scans: RequestDocument[];
  hasFinal: boolean;
  onReorder(ids: string[]): void;
}

export function ScanUploader({ ws, scans, hasFinal, onReorder }: Props) {
  const t = useTranslations('admin.ws.scan');
  const tu = useTranslations('wizard.upload');
  const store = useStore();
  const id = useId();
  const [errors, setErrors] = useState<string[]>([]);
  const [fileKey, setFileKey] = useState(0);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const status = ws.detail.request.status;
  const allowed = canUploadScan(status) && !hasFinal;
  const ids = scans.map((s) => s.id);

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setFileKey((k) => k + 1);
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const f of files) {
      const v = validateUpload(f, 0);
      if (v.ok) accepted.push(f);
      else rejected.push(t('rejected', { name: f.name, reason: tu(v.reason) }));
    }
    setErrors(rejected);
    if (accepted.length === 0) return;
    const ok = await ws.run(async () => {
      for (const f of accepted) {
        await store.addDocument(ws.detail.request.id, f, { fileType: 'OPERATOR_SCAN', fileName: f.name, uploadedById: ws.actorId });
      }
    });
    if (ok) toast.success(t('added', { count: accepted.length }));
  }

  return (
    <section className="space-y-3">
      <h3 className="font-semibold">{t('title')}</h3>
      <p className="text-sm text-muted-foreground">{t('hint')}</p>
      {hasFinal ? (
        <p className="rounded-lg border bg-muted/40 p-3 text-sm">{t('locked')}</p>
      ) : !allowed ? (
        <p className="rounded-lg border bg-muted/40 p-3 text-sm">{t('notAllowed')}</p>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor={id}>{t('choose')}</Label>
          <Input
            key={fileKey}
            id={id}
            type="file"
            multiple
            accept="image/jpeg,image/png,application/pdf"
            disabled={ws.pending}
            onChange={(e) => void onFiles(e)}
            className="h-11 bg-background pt-2"
          />
        </div>
      )}
      {errors.length > 0 && (
        <ul role="alert" className="space-y-1 text-sm text-destructive">
          {errors.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
      {scans.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <ol className="space-y-2" aria-label={t('title')}>
          {scans.map((s, i) => (
            <li
              key={s.id}
              draggable={allowed && !ws.pending}
              onDragStart={() => setDragFrom(i)}
              onDragOver={(e) => allowed && e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragFrom !== null && allowed) onReorder(moveItem(ids, dragFrom, i));
                setDragFrom(null);
              }}
              onDragEnd={() => setDragFrom(null)}
              className="flex items-center gap-1 rounded-lg border bg-card p-1.5"
            >
              <GripVertical aria-hidden className="size-5 shrink-0 cursor-grab text-muted-foreground" />
              <span className="w-5 shrink-0 text-center text-xs text-muted-foreground">{i + 1}</span>
              <FileText aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm">{s.fileName}</span>
              {allowed && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="size-11 shrink-0 p-0"
                    disabled={i === 0 || ws.pending}
                    aria-label={t('moveUp', { name: s.fileName })}
                    onClick={() => onReorder(scanOrderAfterMove(ids, i, -1))}
                  >
                    <ArrowUp aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="size-11 shrink-0 p-0"
                    disabled={i === scans.length - 1 || ws.pending}
                    aria-label={t('moveDown', { name: s.fileName })}
                    onClick={() => onReorder(scanOrderAfterMove(ids, i, 1))}
                  >
                    <ArrowDown aria-hidden />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
