'use client';

import { useTranslations } from 'next-intl';
import { Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '@/data/provider';
import { Button } from '@/components/ui/button';
import type { RequestDocument } from '@/domain/types';

export function DeliveredFiles({ documents }: { documents: RequestDocument[] }) {
  const t = useTranslations('track');
  const store = useStore();

  async function download(doc: RequestDocument) {
    try {
      const blob = await store.getBlob(doc.storageKey);
      if (!blob) {
        toast.error(t('downloadMissing'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      toast.error(t('downloadMissing'));
    }
  }

  if (documents.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="font-semibold">{t('deliveredTitle')}</h2>
      <ul className="space-y-2">
        {documents.map((d) => (
          <li key={d.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
            <FileText aria-hidden className="size-6 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{d.fileType === 'FINAL_DELIVERABLE' ? t('docFinal') : t('docEndorsement')}</p>
              <p className="truncate text-xs text-muted-foreground">{d.fileName}</p>
            </div>
            <Button type="button" className="min-h-11 shrink-0" onClick={() => void download(d)}>
              <Download aria-hidden className="size-4" />
              {t('download')}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
