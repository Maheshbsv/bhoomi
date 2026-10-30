'use client';

import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OtpForm } from './OtpForm';

interface Props {
  open: boolean;
  onOpenChange(open: boolean): void;
  /** Called after the user is signed in; the dialog closes itself first. */
  onVerified(phone10: string): void;
}

/** Phone, demo OTP, sign in: inside a dialog. */
export function OtpDialog({ open, onOpenChange, onVerified }: Props) {
  const t = useTranslations('track');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('otpTitle')}</DialogTitle>
          <DialogDescription>{t('otpHint')}</DialogDescription>
        </DialogHeader>
        <OtpForm
          onVerified={(phone) => {
            onOpenChange(false);
            onVerified(phone);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
