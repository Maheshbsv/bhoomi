'use client';

import { useTranslations } from 'next-intl';
import { useWizard } from '@/store/wizard';
import { FileDrop } from './FileDrop';
import { StepNav } from './StepNav';

export function ReattachNotice() {
  const t = useTranslations('wizard.upload');
  const lost = useWizard((s) => s.fileCount > 0 && s.files.length === 0);
  if (!lost) return null;
  return (
    <p role="status" className="rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm">
      {t('reattach')}
    </p>
  );
}

export function StepUploads() {
  const t = useTranslations('wizard.upload');
  const files = useWizard((s) => s.files);
  const addFile = useWizard((s) => s.addFile);
  const removeFile = useWizard((s) => s.removeFile);
  const setStep = useWizard((s) => s.setStep);

  return (
    <div>
      <h2 className="text-xl font-semibold">{t('heading')}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('hint')}</p>
      <div className="mt-4 space-y-3">
        <ReattachNotice />
        <FileDrop files={files} onAdd={addFile} onRemove={removeFile} />
      </div>
      <StepNav onBack={() => setStep(2)} onNext={() => setStep(4)} nextLabel={files.length === 0 ? t('skip') : undefined} />
    </div>
  );
}
