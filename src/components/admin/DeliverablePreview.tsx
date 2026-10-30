'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '@/data/provider';
import type { RequestDocument } from '@/domain/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PDF_LIMIT_BYTES, canDeliver, canGenerate, canUploadScan, needsConsignment, scanSignature } from './workspaceLogic';
import { OpenLink } from './OpenLink';
import { useBlobUrl } from './useBlobUrl';
import type { Workspace } from './useWorkspace';

interface Generated {
  blob: Blob;
  url: string;
  sig: string;
}

export function DeliverablePreview({ ws, scans }: { ws: Workspace; scans: RequestDocument[] }) {
  const t = useTranslations('admin.ws.pdf');
  const tc = useTranslations('admin.ws.consignment');
  const store = useStore();
  const { request, documents } = ws.detail;
  const finals = documents.filter((d) => d.fileType === 'FINAL_DELIVERABLE').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const finalDoc = finals.length ? finals[finals.length - 1] : undefined;
  const finalUrl = useBlobUrl(finalDoc?.storageKey);

  const [gen, setGen] = useState<Generated | null>(null);
  const genRef = useRef<Generated | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<'failed' | 'tooLarge' | 'stale' | null>(null);
  const [consignment, setConsignment] = useState('');

  function replaceGen(next: Generated | null) {
    if (genRef.current) URL.revokeObjectURL(genRef.current.url);
    genRef.current = next;
    setGen(next);
  }
  useEffect(
    () => () => {
      if (genRef.current) URL.revokeObjectURL(genRef.current.url);
    },
    [],
  );

  const hasFinal = !!finalDoc;
  const sig = scanSignature(scans.map((s) => s.id));

  // Drop the generated PDF once it no longer matches the scans on screen, or once a final exists.
  useEffect(() => {
    if (!gen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (hasFinal) replaceGen(null);
    else if (gen.sig !== sig) {
      replaceGen(null);
      setError('stale');
    }
  }, [gen, hasFinal, sig]);
  const mayGenerate = canGenerate({ status: request.status, scanCount: scans.length, hasFinal });

  async function generate() {
    setBusy(true);
    setError(null);
    replaceGen(null);
    try {
      // Loaded on demand so pdf-lib stays out of the page's first-load JS.
      const { prepareImage, buildDeliverable } = await import('@/pdf/deliverable');
      const inputs = [];
      for (const s of scans) {
        const stored = await store.getBlob(s.storageKey);
        if (!stored) throw new Error(`Missing blob for ${s.fileName}`);
        const blob = stored.type ? stored : new Blob([stored], { type: s.mimeType });
        inputs.push(await prepareImage(blob));
      }
      const bytes = await buildDeliverable(inputs, { requestNumber: request.requestNumber, date: new Date() });
      if (bytes.byteLength >= PDF_LIMIT_BYTES) {
        setError('tooLarge');
        return;
      }
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      replaceGen({ blob, url: URL.createObjectURL(blob), sig: scanSignature(scans.map((s) => s.id)) });
    } catch {
      setError('failed');
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!gen) return;
    const { blob } = gen;
    const ok = await ws.run(async () => {
      await store.addDocument(request.id, blob, {
        fileType: 'FINAL_DELIVERABLE',
        fileName: `${request.requestNumber}.pdf`,
        uploadedById: ws.actorId,
      });
      if (request.status === 'DOCUMENT_RETRIEVED') {
        await store.transition(request.id, 'QC_WATERMARK_MERGE', { actorId: ws.actorId });
      }
    });
    if (ok) replaceGen(null);
  }

  async function deliver() {
    const ok = await ws.run(() => store.transition(request.id, 'DELIVERED', { actorId: ws.actorId, consignmentNo: consignment }));
    if (ok) toast.success(t('deliverToast'));
  }

  const previewUrl = hasFinal ? finalUrl : (gen?.url ?? null);
  const disabled = ws.pending || busy;

  return (
    <section className="space-y-3">
      <h3 className="font-semibold">{t('title')}</h3>
      {!hasFinal && (
        <>
          <Button type="button" className="min-h-11 w-full" disabled={!mayGenerate || disabled} onClick={() => void generate()}>
            {busy && <Loader2 aria-hidden className="size-4 animate-spin" />}
            {busy ? t('generating') : t('generate')}
          </Button>
          {!mayGenerate &&
            (canUploadScan(request.status) ? (
              <p className="text-sm text-muted-foreground">{t('needScans')}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{t('wrongStatus')}</p>
            ))}
        </>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {t(error)}
        </p>
      )}
      {(gen || hasFinal) && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{t('footerNote')}</p>
          {previewUrl && (
            <iframe title={t('previewTitle')} src={previewUrl} className="hidden h-[28rem] w-full rounded-lg border bg-muted lg:block" />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <OpenLink url={previewUrl}>{t('open')}</OpenLink>
            {gen && !hasFinal && (
              <>
                <span className="text-xs text-muted-foreground">{t('size', { size: (gen.blob.size / (1024 * 1024)).toFixed(2) })}</span>
                <Button type="button" className="ml-auto min-h-11" disabled={disabled} onClick={() => void save()}>
                  {ws.pending ? t('saving') : t('save')}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
      {hasFinal && (
        <p className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-900">
          <CheckCircle2 aria-hidden className="size-4 shrink-0" />
          {t('saved')}
        </p>
      )}
      {canDeliver({ status: request.status, hasFinal }) && (
        <div className="space-y-2 rounded-lg border p-3">
          {needsConsignment(request.deliveryMode) && (
            <div className="space-y-1.5">
              <Label htmlFor="deliver-consignment">{tc('label')}</Label>
              <Input
                id="deliver-consignment"
                value={consignment}
                onChange={(e) => setConsignment(e.target.value)}
                placeholder={tc('placeholder')}
                disabled={disabled}
                className="h-11 bg-background"
              />
            </div>
          )}
          <Button type="button" className="min-h-11 w-full" disabled={disabled} onClick={() => void deliver()}>
            {ws.pending ? t('delivering') : t('deliver')}
          </Button>
        </div>
      )}
    </section>
  );
}
