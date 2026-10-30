'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { StoreError } from '@/data/DataStore';
import { useStore } from '@/data/provider';
import { validateUpload } from '@/domain/uploads';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function ReplyBox({ requestId, onSent }: { requestId: string; onSent(): void }) {
  const t = useTranslations('track');
  const tr = useTranslations();
  const store = useStore();
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File>();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(f: File | undefined) {
    if (!f) return;
    const r = validateUpload(f, 0);
    if (!r.ok) {
      setError(tr(`wizard.upload.${r.reason}`));
      setFile(undefined);
    } else {
      setError(undefined);
      setFile(f);
    }
    if (inputRef.current) inputRef.current.value = '';
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    if (!body.trim() && !file) {
      setError(t('replyEmpty'));
      return;
    }
    setError(undefined);
    setPending(true);
    try {
      await store.receiveCustomerReply(requestId, { body: body.trim() || undefined, file });
      toast.success(t('replySent'));
      setBody('');
      setFile(undefined);
      onSent();
    } catch (err) {
      toast.error(tr(`errors.${err instanceof StoreError ? err.code : 'VALIDATION'}`));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <p className="text-xs font-medium">{t('replyWhatsapp')}</p>
      <div className="space-y-1.5">
        <Label htmlFor="reply-body">{t('replyLabel')}</Label>
        <Textarea
          id="reply-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('replyPlaceholder')}
          disabled={pending}
          rows={3}
          className="bg-background"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          id="reply-file"
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          className="sr-only"
          tabIndex={-1}
          disabled={pending}
          onChange={(e) => pick(e.target.files?.[0])}
        />
        <Button type="button" variant="outline" className="min-h-11 bg-background" disabled={pending} onClick={() => inputRef.current?.click()}>
          <ImagePlus aria-hidden className="size-4" />
          {t('attachPhoto')}
        </Button>
        {file && (
          <span className="flex min-h-11 items-center gap-1 rounded-lg bg-background pl-2 text-sm">
            <span className="max-w-40 truncate">{file.name}</span>
            <button
              type="button"
              aria-label={t('removePhoto')}
              className="flex size-11 items-center justify-center"
              disabled={pending}
              onClick={() => setFile(undefined)}
            >
              <X aria-hidden className="size-4" />
            </button>
          </span>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={pending}>
        {pending ? t('sending') : t('send')}
      </Button>
    </form>
  );
}
