'use client';

import { useId, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useStore } from '@/data/provider';
import { isTerminal } from '@/domain/status';
import { validateUpload } from '@/domain/uploads';
import type { OrderStatus } from '@/domain/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { needsConsignment, statusOptions } from './workspaceLogic';
import { RunnerAssign } from './RunnerAssign';
import type { Workspace } from './useWorkspace';

export const selectClass =
  'h-11 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50';

export function StatusControl({ ws }: { ws: Workspace }) {
  const t = useTranslations('admin.ws.status');
  const te = useTranslations('admin.ws.endorsement');
  const tc = useTranslations('admin.ws.consignment');
  const ts = useTranslations('status');
  const tu = useTranslations('wizard.upload');
  const tp = useTranslations('admin.ws.pdf');
  const store = useStore();
  const id = useId();
  const { request, documents } = ws.detail;
  const hasFinal = documents.some((d) => d.fileType === 'FINAL_DELIVERABLE');
  const options = statusOptions(request.status, hasFinal);

  const [pick, setTo] = useState<OrderStatus | ''>('');
  const [note, setNote] = useState('');
  const [runner, setRunner] = useState('');
  const [consignment, setConsignment] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>();
  const [fileKey, setFileKey] = useState(0);
  const [confirm, setConfirm] = useState(false);

  const to = options.includes(pick as OrderStatus) ? pick : '';
  const endorsement = documents.find((d) => d.fileType === 'ENDORSEMENT_CERTIFICATE');

  if (options.length === 0) {
    return (
      <section className="space-y-2">
        <h3 className="font-semibold">{t('title')}</h3>
        <p className="rounded-lg border bg-muted/40 p-3 text-sm">{t('closed')}</p>
      </section>
    );
  }

  function chooseFile(f: File | null) {
    setFileError(undefined);
    if (f) {
      const v = validateUpload(f, 0);
      if (!v.ok) {
        setFileError(`${f.name}: ${tu(v.reason)}`);
        setFile(null);
        setFileKey((k) => k + 1);
        return;
      }
    }
    setFile(f);
  }

  async function apply() {
    if (!to) return;
    setConfirm(false);
    const target = to;
    const ok = await ws.run(async () => {
      // The store refuses RECORD_UNAVAILABLE without an endorsement, so a missing file surfaces its error.
      if (target === 'RECORD_UNAVAILABLE' && !endorsement && file) {
        await store.addDocument(request.id, file, {
          fileType: 'ENDORSEMENT_CERTIFICATE',
          fileName: file.name,
          uploadedById: ws.actorId,
        });
      }
      await store.transition(request.id, target, {
        actorId: ws.actorId,
        note: note.trim() || undefined,
        runnerName: target === 'ASSIGNED_TO_RUNNER' ? runner : undefined,
        consignmentNo: target === 'DELIVERED' ? consignment : undefined,
      });
    });
    if (ok) {
      // Same "would send" message as the Deliver button.
      toast.success(target === 'DELIVERED' ? tp('deliverToast') : t('changed'));
      setTo('');
      setNote('');
      setRunner('');
      setConsignment('');
      setFile(null);
      setFileKey((k) => k + 1);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!to) return;
    if (isTerminal(to)) setConfirm(true);
    else void apply();
  }

  return (
    <section className="space-y-3">
      <h3 className="font-semibold">{t('title')}</h3>
      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-to`}>{t('next')}</Label>
          <select
            id={`${id}-to`}
            value={to}
            disabled={ws.pending}
            onChange={(e) => setTo(e.target.value as OrderStatus | '')}
            className={selectClass}
          >
            <option value="">{t('choose')}</option>
            {options.map((s) => (
              <option key={s} value={s}>
                {ts(s)}
              </option>
            ))}
          </select>
        </div>
        {to === 'ASSIGNED_TO_RUNNER' && <RunnerAssign value={runner} onChange={setRunner} disabled={ws.pending} />}
        {to === 'RECORD_UNAVAILABLE' && (
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-file`}>{te('label')}</Label>
            {endorsement ? (
              <p className="text-sm">{te('have', { name: endorsement.fileName })}</p>
            ) : (
              <Input
                key={fileKey}
                id={`${id}-file`}
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                disabled={ws.pending}
                onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
                className="h-11 bg-background pt-2"
              />
            )}
            {fileError && (
              <p role="alert" className="text-sm text-destructive">
                {fileError}
              </p>
            )}
          </div>
        )}
        {to === 'DELIVERED' && needsConsignment(request.deliveryMode) && (
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-cn`}>{tc('label')}</Label>
            <Input
              id={`${id}-cn`}
              value={consignment}
              onChange={(e) => setConsignment(e.target.value)}
              placeholder={tc('placeholder')}
              disabled={ws.pending}
              className="h-11 bg-background"
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-note`}>{t('note')}</Label>
          <Textarea id={`${id}-note`} value={note} onChange={(e) => setNote(e.target.value)} rows={2} disabled={ws.pending} className="bg-background" />
        </div>
        <Button type="submit" className="min-h-11 w-full" disabled={!to || ws.pending}>
          {ws.pending ? t('applying') : t('apply')}
        </Button>
      </form>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmTitle')}</DialogTitle>
            <DialogDescription>{to ? t('confirmBody', { status: ts(to) }) : ''}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setConfirm(false)}>
              {t('cancel')}
            </Button>
            <Button type="button" className="min-h-11" onClick={() => void apply()}>
              {t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
