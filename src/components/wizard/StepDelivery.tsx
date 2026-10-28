'use client';

import { useEffect } from 'react';
import { useForm, useWatch, type FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { useWizard, type WizardDelivery } from '@/store/wizard';
import { cn } from '@/lib/utils';
import type { FieldName } from './fieldLabels';
import { DeliveryFormSchema } from './deliveryForm';
import { FieldShell, inputClass, useErrorText } from './Field';
import { StepNav } from './StepNav';

const MODES = ['DIGITAL', 'PHYSICAL', 'BOTH'] as const;

const ADDRESS_FIELDS: { key: string; label: FieldName; required: boolean; numeric?: boolean; autoComplete: string }[] = [
  { key: 'name', label: 'addrName', required: true, autoComplete: 'name' },
  { key: 'line1', label: 'addrLine1', required: true, autoComplete: 'address-line1' },
  { key: 'line2', label: 'addrLine2', required: false, autoComplete: 'address-line2' },
  { key: 'city', label: 'addrCity', required: true, autoComplete: 'address-level2' },
  { key: 'district', label: 'addrDistrict', required: true, autoComplete: 'address-level1' },
  { key: 'pincode', label: 'addrPincode', required: true, numeric: true, autoComplete: 'postal-code' },
];

export function StepDelivery() {
  const t = useTranslations('wizard.delivery');
  const tr = useTranslations();
  const errText = useErrorText();
  const saved = useWizard((s) => s.delivery);
  const patch = useWizard((s) => s.patch);
  const setStep = useWizard((s) => s.setStep);

  const form = useForm<FieldValues>({
    resolver: zodResolver(DeliveryFormSchema as never),
    defaultValues: {
      mode: saved?.mode ?? 'DIGITAL',
      email: saved?.email ?? '',
      address: { name: '', line1: '', line2: '', city: '', district: '', pincode: '', ...saved?.address },
    },
  });
  const { register, handleSubmit, formState, control, subscribe } = form;
  const mode = useWatch({ control, name: 'mode' }) as WizardDelivery['mode'];
  const needsAddress = mode !== 'DIGITAL';
  const errors = formState.errors as Record<string, { message?: string } & Record<string, { message?: string }>>;

  useEffect(() => {
    return subscribe({ formState: { values: true }, callback: ({ values }) => patch({ delivery: values as WizardDelivery }) });
  }, [subscribe, patch]);

  return (
    <form id="delivery-form" noValidate onSubmit={handleSubmit((data) => {
      patch({ delivery: data as WizardDelivery });
      setStep(5);
    })}>
      <h2 className="text-xl font-semibold">{t('heading')}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('hint')}</p>

      <div role="radiogroup" aria-label={t('heading')} className="mt-4 space-y-3">
        {MODES.map((m) => (
          <label
            key={m}
            className={cn(
              'flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border bg-card p-4 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
              mode === m ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-primary/60',
            )}
          >
            <input type="radio" value={m} {...register('mode')} className="mt-1 size-5 accent-primary" />
            <span>
              <span className="block font-semibold">{t(`${m}.name`)}</span>
              <span className="block text-sm text-muted-foreground">{t(`${m}.desc`)}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        <FieldShell
          name="email"
          id="d-email"
          error={errors.email ? tr('errors.email') : undefined}
          hint={t('emailHint')}
        >
          <Input
            id="d-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...register('email')}
            className={inputClass}
          />
        </FieldShell>
      </div>

      {needsAddress && (
        <fieldset className="mt-6 space-y-4 rounded-lg border bg-card p-4">
          <legend className="px-1 text-base font-semibold">{t('addressHeading')}</legend>
          {errors.address?.message && (
            <p role="alert" className="text-sm text-destructive">{errText(errors.address.message)}</p>
          )}
          {ADDRESS_FIELDS.map((f) => {
            const id = `d-${f.key}`;
            const err = errText(errors.address?.[f.key]?.message);
            return (
              <FieldShell key={f.key} name={f.label} id={id} required={f.required} error={err}>
                <Input
                  id={id}
                  autoComplete={f.autoComplete}
                  inputMode={f.numeric ? 'numeric' : undefined}
                  maxLength={f.numeric ? 6 : undefined}
                  aria-invalid={!!err}
                  {...register(`address.${f.key}`)}
                  className={inputClass}
                />
              </FieldShell>
            );
          })}
        </fieldset>
      )}

      <StepNav onBack={() => setStep(3)} formId="delivery-form" />
    </form>
  );
}
