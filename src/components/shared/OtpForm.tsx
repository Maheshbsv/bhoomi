'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { PhoneSchema } from '@/domain/schemas';
import { useStore } from '@/data/provider';
import { useSession } from '@/store/session';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DualLabel } from '@/components/wizard/Field';

/** The demo never sends an SMS; the code is shown on screen. */
export const DEMO_OTP = '123456';

interface Props {
  /** Called with the verified 10-digit number after the user has been signed in. */
  onVerified(phone10: string): void;
  defaultPhone?: string;
}

export function OtpForm({ onVerified, defaultPhone = '' }: Props) {
  const t = useTranslations('wizard.otp');
  const tr = useTranslations();
  const store = useStore();
  const signIn = useSession((s) => s.signIn);
  const [phone, setPhone] = useState(defaultPhone);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [phoneError, setPhoneError] = useState<string>();
  const [codeError, setCodeError] = useState(false);
  const [busy, setBusy] = useState(false);

  function sendOtp(e: FormEvent) {
    e.preventDefault();
    const r = PhoneSchema.safeParse(phone);
    if (!r.success) {
      setPhoneError(tr('errors.phone'));
      return;
    }
    setPhoneError(undefined);
    setSent(true);
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    if (code !== DEMO_OTP) {
      setCodeError(true);
      return;
    }
    setCodeError(false);
    setBusy(true);
    try {
      const user = await store.findOrCreateUserByPhone(phone.trim(), 'CITIZEN');
      signIn(user);
      onVerified(phone.trim());
    } catch {
      setCodeError(false);
      setPhoneError(tr('demo.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={sendOtp} noValidate className="space-y-1.5">
        <DualLabel name="phone" htmlFor="otp-phone" required />
        <div className="flex gap-2">
          <Input
            id="otp-phone"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
              setSent(false);
              setCode('');
            }}
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={10}
            aria-invalid={!!phoneError}
            aria-describedby={phoneError ? 'otp-phone-err' : undefined}
            className="h-11 bg-background"
          />
          <Button type="submit" variant={sent ? 'outline' : 'default'} className="min-h-11 shrink-0 px-4">
            {sent ? t('resend') : t('send')}
          </Button>
        </div>
        {phoneError && (
          <p id="otp-phone-err" role="alert" className="text-sm text-destructive">
            {phoneError}
          </p>
        )}
      </form>

      {sent && (
        <form onSubmit={verify} noValidate className="space-y-3">
          <p role="status" className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            {t('demoOtp', { otp: DEMO_OTP })}
          </p>
          <div className="space-y-1.5">
            <DualLabel name="otp" htmlFor="otp-code" required />
            <Input
              id="otp-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                setCodeError(false);
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              aria-invalid={codeError}
              aria-describedby={codeError ? 'otp-code-err' : undefined}
              className="h-11 bg-background tracking-[0.4em]"
            />
            {codeError && (
              <p id="otp-code-err" role="alert" className="text-sm text-destructive">
                {t('wrong')}
              </p>
            )}
          </div>
          <Button type="submit" className="min-h-11 w-full" disabled={busy || code.length !== 6}>
            {t('verify')}
          </Button>
        </form>
      )}
    </div>
  );
}
