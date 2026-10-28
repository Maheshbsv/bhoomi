'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useTranslations } from 'next-intl';
import { FileText, UploadCloud, X } from 'lucide-react';
import type { UploadResult } from '@/domain/uploads';
import { MAX_FILES } from '@/domain/uploads';
import { cn } from '@/lib/utils';

interface Props {
  files: File[];
  onAdd(file: File): UploadResult;
  onRemove(index: number): void;
}

function Thumb({ file }: { file: File }) {
  const [url, setUrl] = useState<string>();
  const isImage = file.type.startsWith('image/');
  useEffect(() => {
    if (!isImage) return;
    const u = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file, isImage]);
  if (!isImage) {
    return (
      <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <FileText aria-hidden className="size-6" />
      </span>
    );
  }
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="size-14 shrink-0 rounded-md object-cover" />
  ) : (
    <span className="size-14 shrink-0 rounded-md bg-muted" />
  );
}

export function FileDrop({ files, onAdd, onRemove }: Props) {
  const t = useTranslations('wizard.upload');
  const inputRef = useRef<HTMLInputElement>(null);
  const [rejections, setRejections] = useState<{ name: string; reason: string }[]>([]);
  const [dragging, setDragging] = useState(false);

  function ingest(list: FileList | null) {
    if (!list) return;
    const rejected: { name: string; reason: string }[] = [];
    for (const f of Array.from(list)) {
      const r = onAdd(f);
      if (!r.ok) rejected.push({ name: f.name, reason: r.reason });
    }
    setRejections(rejected);
    if (inputRef.current) inputRef.current.value = '';
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    ingest(e.dataTransfer.files);
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'rounded-lg border-2 border-dashed bg-card p-4 text-center transition-colors',
          dragging ? 'border-primary bg-primary/5' : 'border-input',
        )}
      >
        <UploadCloud aria-hidden className="mx-auto mb-2 size-8 text-muted-foreground" />
        <p className="hidden text-sm text-muted-foreground md:block">{t('dragHere')}</p>
        <input
          ref={inputRef}
          id="file-input"
          type="file"
          multiple
          accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
          className="peer sr-only"
          onChange={(e) => ingest(e.target.files)}
        />
        <label
          htmlFor="file-input"
          className="mt-2 inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50"
        >
          {t('choose')}
        </label>
        <p className="mt-2 text-xs text-muted-foreground">{t('rules')}</p>
      </div>

      {rejections.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {rejections.map((r, i) => (
            <li key={`${r.name}-${i}`}>
              <span className="font-medium">{r.name}</span>: {t(r.reason)}
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">{t('count', { n: files.length, max: MAX_FILES })}</p>
          <ul className="space-y-2">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-lg border bg-card p-2">
                <Thumb file={f} />
                <span className="min-w-0 flex-1 truncate text-sm">{f.name}</span>
                <button
                  type="button"
                  aria-label={t('remove', { name: f.name })}
                  onClick={() => onRemove(i)}
                  className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <X aria-hidden className="size-5" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
