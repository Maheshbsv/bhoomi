'use client';

import { useEffect, useState } from 'react';
import { useForm, type FieldValues, type UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { ServiceDetailsSchema } from '@/domain/schemas';
import type { ServiceType } from '@/domain/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useWizard } from '@/store/wizard';
import { SERVICE_FIELDS, type FieldDef } from './fieldConfig';
import { OPTION_LABELS, dual } from './fieldLabels';
import { FieldShell, inputClass, useErrorText } from './Field';
import { StepNav } from './StepNav';

function SurveyInput({ id, reg, invalid, initial }: { id: string; reg: UseFormRegisterReturn; invalid: boolean; initial: string }) {
  const t = useTranslations('wizard.details');
  // Digits by default (numeric keypad); values such as 108/A need the text keyboard.
  const [letters, setLetters] = useState(/[^0-9]/.test(initial));
  return (
    <div className="flex gap-2">
      <Input
        id={id}
        {...reg}
        inputMode={letters ? 'text' : 'numeric'}
        autoComplete="off"
        aria-invalid={invalid}
        className={inputClass}
      />
      <button
        type="button"
        aria-pressed={letters}
        onClick={() => setLetters((v) => !v)}
        className="min-h-11 shrink-0 rounded-lg border border-input bg-background px-3 text-sm font-medium hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {letters ? t('useNumbers') : t('useLetters')}
      </button>
    </div>
  );
}

function DetailField({
  def,
  reg,
  error,
  initial,
}: {
  def: FieldDef;
  reg: UseFormRegisterReturn;
  error?: string;
  initial: string;
}) {
  const t = useTranslations('wizard.details');
  const id = `f-${def.name}`;
  const common = { id, 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-err` : undefined };
  const hint = def.kind === 'survey' && def.name === 'surveyNo' ? t('surveyHint') : undefined;
  return (
    <FieldShell name={def.name} id={id} required={def.required} error={error} hint={hint}>
      {def.kind === 'survey' ? (
        <SurveyInput id={id} reg={reg} invalid={!!error} initial={initial} />
      ) : def.kind === 'year' ? (
        <Input {...common} {...reg} inputMode="numeric" maxLength={4} autoComplete="off" placeholder="YYYY" className={inputClass} />
      ) : def.kind === 'select' ? (
        <select
          {...common}
          {...reg}
          className="h-11 w-full rounded-lg border border-input bg-background px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
        >
          <option value="">{t('choose')}</option>
          {def.options?.map((o) => (
            <option key={o} value={o}>
              {dual(OPTION_LABELS[o])}
            </option>
          ))}
        </select>
      ) : def.kind === 'textarea' ? (
        <Textarea {...common} {...reg} rows={3} className="bg-background" />
      ) : (
        <Input {...common} {...reg} autoComplete="off" className={inputClass} />
      )}
    </FieldShell>
  );
}

export function StepDetails({ serviceType }: { serviceType: ServiceType }) {
  const t = useTranslations('wizard.details');
  const errText = useErrorText();
  const saved = useWizard((s) => s.details);
  const patch = useWizard((s) => s.patch);
  const setStep = useWizard((s) => s.setStep);
  const fields = SERVICE_FIELDS[serviceType];

  const form = useForm<FieldValues>({
    resolver: zodResolver(ServiceDetailsSchema as never),
    defaultValues: { ...saved, serviceType },
    shouldFocusError: true,
  });
  const { register, handleSubmit, formState, subscribe, getValues } = form;

  // Keep typed values in the store so Back / refresh never lose them.
  useEffect(() => {
    return subscribe({ formState: { values: true }, callback: ({ values }) => patch({ details: { ...values } }) });
  }, [subscribe, patch]);

  return (
    <form
      id="details-form"
      noValidate
      onSubmit={handleSubmit(() => setStep(3))}
    >
      <h2 className="text-xl font-semibold">{t('heading')}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('hint')}</p>
      <input type="hidden" {...register('serviceType')} />
      <div className="mt-4 space-y-4">
        {fields.map((def) => (
          <DetailField
            key={def.name}
            def={def}
            reg={register(def.name)}
            error={errText(formState.errors[def.name]?.message as string | undefined)}
            initial={String(getValues(def.name) ?? '')}
          />
        ))}
      </div>
      <StepNav onBack={() => setStep(1)} formId="details-form" />
    </form>
  );
}
