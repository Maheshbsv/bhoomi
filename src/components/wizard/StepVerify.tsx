'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { BadgeCheck } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { useStore } from '@/data/provider';
import { StoreError } from '@/data/DataStore';
import { CreateRequestSchema } from '@/domain/schemas';
import { useSession } from '@/store/session';
import { useWizard } from '@/store/wizard';
import { OtpForm } from '@/components/shared/OtpForm';
import { ReviewSummary } from './ReviewSummary';
import { StepNav } from './StepNav';
import { ReattachNotice } from './StepUploads';

export function StepVerify() {
  const t = useTranslations('wizard');
  const tr = useTranslations();
  const router = useRouter();
  const store = useStore();
  const setStep = useWizard((s) => s.setStep);
  const patch = useWizard((s) => s.patch);
  const savedPhone = useWizard((s) => s.phone);
  const user = useSession((s) => s.user);
  const [verified, setVerified] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit() {
    const w = useWizard.getState();
    const current = useSession.getState().user;
    if (!current || !w.serviceType) return;
    const input = CreateRequestSchema.safeParse({
      details: { ...w.details, serviceType: w.serviceType },
      villageId: w.location.villageId,
      delivery: w.delivery,
      phone: w.phone,
    });
    if (!input.success) {
      toast.error(tr('errors.VALIDATION'));
      return;
    }
    setPending(true);
    try {
      const [created] = await store.createRequests([input.data], current.id, [w.files]);
      router.push(`/request/success/?id=${encodeURIComponent(created.requestNumber)}`);
    } catch (e) {
      toast.error(tr(`errors.${e instanceof StoreError ? e.code : 'VALIDATION'}`));
      setPending(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold">{t('verify.heading')}</h2>
      <div className="mt-4 space-y-5">
        <ReattachNotice />
        {!verified ? (
          <>
            <p className="text-sm text-muted-foreground">{t('verify.hint')}</p>
            <OtpForm
              defaultPhone={savedPhone ?? user?.phoneNumber.replace(/^\+91/, '') ?? ''}
              onVerified={(phone) => {
                patch({ phone });
                setVerified(true);
              }}
            />
          </>
        ) : (
          <>
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <BadgeCheck aria-hidden className="size-5" />
              {t('verify.done', { phone: savedPhone ?? '' })}
            </p>
            <h3 className="text-lg font-semibold">{t('review.heading')}</h3>
            <ReviewSummary />
          </>
        )}
      </div>
      <StepNav
        onBack={() => setStep(4)}
        onNext={submit}
        nextLabel={pending ? t('review.submitting') : t('review.submit')}
        nextDisabled={!verified || pending}
      />
    </div>
  );
}
