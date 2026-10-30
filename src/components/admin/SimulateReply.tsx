'use client';

import { useId, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useStore } from '@/data/provider';
import { validateUpload } from '@/domain/uploads';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Workspace } from './useWorkspace';

/** Demo-only control: stands in for the customer replying on WhatsApp. */
export function SimulateReply({ ws }: { ws: Workspace }) {
  const t = useTranslations('admin.ws.thread');
  const tu = useTranslations('wizard.upload');
  const store = useStore();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>();

  function pick(f: File | null) {
    setError(undefined);
    if (f) {
      const v = validateUpload(f, 0);
      if (!v.ok) {
        setError(`${f.name}: ${tu(v.reason)}`);
        setFile(null);
        return;
      }
    }
    setFile(f);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() && !file) {
      setError(t('simEmpty'));
      return;
    }
    const ok = await ws.run(() => store.receiveCustomerReply(ws.detail.request.id, { body: body.trim() || undefined, file: file ?? undefined }));
    if (ok) {
      setOpen(false);
      setBody('');
      setFile(null);
      setError(undefined);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" className="min-h-11 w-full border-dashed" onClick={() => setOpen(true)}>
        {t('simulate')}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('simTitle')}</DialogTitle>
            <DialogDescription>{t('simHint')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void submit(e)} className="space-y-3" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-t`}>{t('simText')}</Label>
              <Textarea id={`${id}-t`} value={body} onChange={(e) => setBody(e.target.value)} rows={3} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-f`}>{t('simFile')}</Label>
              <Input id={`${id}-f`} type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e) => pick(e.target.files?.[0] ?? null)} className="h-11 bg-background pt-2" />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" className="min-h-11" disabled={ws.pending}>
                {t('simSend')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
