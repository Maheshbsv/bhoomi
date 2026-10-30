'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileText } from 'lucide-react';
import type { RequestDocument } from '@/domain/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OpenLink } from './OpenLink';
import { useBlobUrl } from './useBlobUrl';

function Item({ doc, onZoom }: { doc: RequestDocument; onZoom(url: string, name: string): void }) {
  const t = useTranslations('admin.ws.gallery');
  const url = useBlobUrl(doc.storageKey);
  const isImage = doc.mimeType.startsWith('image/');
  return (
    <li className="flex items-center gap-3 rounded-lg border bg-card p-2">
      {isImage ? (
        <button
          type="button"
          disabled={!url}
          onClick={() => url && onZoom(url, doc.fileName)}
          className="size-16 shrink-0 overflow-hidden rounded-md border bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          aria-label={`${t('open')} ${doc.fileName}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {url && <img src={url} alt={t('imageAlt', { name: doc.fileName })} className="size-full object-cover" />}
        </button>
      ) : (
        <span className="flex size-16 shrink-0 items-center justify-center rounded-md border bg-muted">
          <FileText aria-hidden className="size-6 text-muted-foreground" />
        </span>
      )}
      <p className="min-w-0 flex-1 truncate text-sm">{doc.fileName}</p>
      {!isImage && <OpenLink url={url} className="shrink-0">{t('open')}</OpenLink>}
    </li>
  );
}

export function UploadGallery({ documents }: { documents: RequestDocument[] }) {
  const t = useTranslations('admin.ws.gallery');
  const [zoom, setZoom] = useState<{ url: string; name: string } | null>(null);
  const docs = documents
    .filter((d) => d.fileType === 'CUSTOMER_REFERENCE')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return (
    <section className="space-y-2">
      <h3 className="font-semibold">{t('title')}</h3>
      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => (
            <Item key={d.id} doc={d} onZoom={(url, name) => setZoom({ url, name })} />
          ))}
        </ul>
      )}
      <Dialog open={!!zoom} onOpenChange={(o) => !o && setZoom(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">{zoom?.name}</DialogTitle>
            <DialogDescription className="sr-only">{zoom?.name}</DialogDescription>
          </DialogHeader>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {zoom && <img src={zoom.url} alt={zoom.name} className="max-h-[75vh] w-full rounded-md object-contain" />}
        </DialogContent>
      </Dialog>
    </section>
  );
}
