'use client';

import { useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from '@/i18n/routing';
import { useStore } from '@/data/provider';
import { StoreError } from '@/data/DataStore';
import type { ServiceRequest } from '@/domain/types';
import { useSession } from '@/store/session';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DualLabel, inputClass, useErrorText } from '@/components/wizard/Field';
import { OPTION_LABELS, FIELD_LABELS, dual, type FieldName } from '@/components/wizard/fieldLabels';
import { SearchableSelect, type SelectOption } from '@/components/wizard/SearchableSelect';
import { useLocations } from '@/components/wizard/useLocations';
import { ProGate } from './ProGate';
import { BULK_SERVICES, parsePastedRows, phone10, rowsToInputs, type BulkRow, type BulkService } from './bulkLogic';
import { useMyRequests } from './useMyRequests';

const SELECT =
  'min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm';
const NEW_MATTER = '__new__';
const ACQUISITIONS = ['SALE', 'INHERITANCE', 'PARTITION', 'GIFT', 'COURT_ORDER'];

/** The fourth column means something different for each service. */
const NOTES_FIELD: Record<BulkService, { name: FieldName; required: boolean }> = {
  OLD_RTC: { name: 'recordedOwnerName', required: false },
  OLD_MR: { name: 'partiesInvolved', required: false },
  LND_FILE: { name: 'granteeName', required: true },
};

interface GridRow {
  key: number;
  surveyNo: string;
  hissaNo: string;
  period: string;
  notes: string;
}

let keySeq = 0;
const blankRow = (): GridRow => ({ key: ++keySeq, surveyNo: '', hissaNo: '', period: '', notes: '' });
const isBlankRow = (r: GridRow) => !r.surveyNo.trim() && !r.hissaNo.trim() && !r.period.trim() && !r.notes.trim();

const newBatchId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `batch-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function DualText({ name }: { name: FieldName }) {
  const l = FIELD_LABELS[name];
  return (
    <>
      {l.en} / <span lang="kn">{l.kn}</span>
    </>
  );
}

function SurveyCell({ id, value, invalid, onChange }: { id: string; value: string; invalid: boolean; onChange(v: string): void }) {
  const t = useTranslations('pro.bulk');
  // Digits by default (numeric keypad); values such as 108/A need the text keyboard. Never block letters.
  const [letters, setLetters] = useState(/[^0-9]/.test(value));
  return (
    <div className="flex gap-2">
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={letters ? 'text' : 'numeric'}
        autoComplete="off"
        aria-invalid={invalid}
        className={inputClass}
      />
      <button
        type="button"
        aria-pressed={letters}
        onClick={() => setLetters((v) => !v)}
        className="min-h-11 shrink-0 rounded-lg border border-input bg-background px-2 text-xs font-medium hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {letters ? t('useNumbers') : t('useLetters')}
      </button>
    </div>
  );
}

function CellLabel({ htmlFor, name, required }: { htmlFor: string; name: FieldName; required: boolean }) {
  const tw = useTranslations('wizard');
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium leading-snug">
      <DualText name={name} />
      {required ? <span aria-hidden className="text-destructive"> *</span> : <span className="font-normal text-muted-foreground"> ({tw('optional')})</span>}
    </label>
  );
}

function BulkForm() {
  const t = useTranslations('pro.bulk');
  const tr = useTranslations();
  const errText = useErrorText();
  const store = useStore();
  const user = useSession((s) => s.user);
  const locs = useLocations();
  const { list: existing } = useMyRequests(user?.id ?? '');

  const [service, setService] = useState<BulkService>('OLD_RTC');
  const [villageId, setVillageId] = useState<string>();
  const [matterChoice, setMatterChoice] = useState('');
  const [newMatter, setNewMatter] = useState('');
  const [acquisition, setAcquisition] = useState('');
  const [rows, setRows] = useState<GridRow[]>(() => [blankRow()]);
  const [paste, setPaste] = useState('');
  const [pasteMsg, setPasteMsg] = useState<string>();
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<{ list: ServiceRequest[]; matter: string }>();
  const lock = useRef(false);

  const matters = useMemo(
    () => [...new Set((existing ?? []).map((r) => r.matterTag?.trim()).filter((m): m is string => !!m))].sort(),
    [existing],
  );
  const villageOptions: SelectOption[] = useMemo(
    () =>
      (locs ?? [])
        .map((l) => ({
          value: String(l.id),
          en: `${l.villageEn}, ${l.talukEn}`,
          kn: `${l.villageKn}, ${l.talukKn}`,
        }))
        .sort((a, b) => a.en.localeCompare(b.en, 'en')),
    [locs],
  );

  const matter = (matterChoice === NEW_MATTER ? newMatter : matterChoice).trim();
  const notesField = NOTES_FIELD[service];
  const needsAcquisition = service === 'OLD_MR';

  const asBulkRows = (): BulkRow[] =>
    rows.map((r) => ({ surveyNo: r.surveyNo, hissaNo: r.hissaNo, period: r.period, notes: r.notes }));

  const result = useMemo(
    () =>
      rowsToInputs(
        rows.map((r) => ({ surveyNo: r.surveyNo, hissaNo: r.hissaNo, period: r.period, notes: r.notes })),
        {
          serviceType: service,
          villageId: Number(villageId ?? 0),
          delivery: { mode: 'DIGITAL' },
          phone: phone10(user?.phoneNumber ?? ''),
          matterTag: matter || 'x',
          // A missing batch-wide acquisition type is reported once on the select, not on every row.
          natureOfAcquisition: needsAcquisition ? acquisition || 'SALE' : undefined,
        },
      ),
    [rows, service, villageId, user?.phoneNumber, matter, needsAcquisition, acquisition],
  );
  const rowError = new Map(result.errors.map((e) => [e.row, e.key]));

  const patchRow = (key: number, patch: Partial<GridRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  function addPasted() {
    const parsed = parsePastedRows(paste);
    if (parsed.length === 0) {
      setPasteMsg(t('pasteEmpty'));
      return;
    }
    setPasteMsg(undefined);
    setRows((rs) => [
      ...rs.filter((r) => !isBlankRow(r)),
      ...parsed.map((p) => ({ key: ++keySeq, surveyNo: p.surveyNo, hissaNo: p.hissaNo ?? '', period: p.period ?? '', notes: p.notes ?? '' })),
    ]);
    setPaste('');
  }

  const topErrors = {
    village: villageId === undefined ? t('villageRequired') : undefined,
    matter: !matter ? t('matterRequired') : undefined,
    acquisition: needsAcquisition && !acquisition ? t('acquisitionRequired') : undefined,
    rows: result.inputs.length === 0 && result.errors.length === 0 ? t('noRows') : undefined,
  };
  const blocked = Object.values(topErrors).some(Boolean) || result.errors.length > 0;

  async function submit() {
    setAttempted(true);
    if (lock.current || blocked || !user) return;
    lock.current = true;
    setPending(true);
    try {
      const batchId = newBatchId();
      const { inputs } = rowsToInputs(asBulkRows(), {
        serviceType: service,
        villageId: Number(villageId),
        delivery: { mode: 'DIGITAL' },
        phone: phone10(user.phoneNumber),
        matterTag: matter,
        batchId,
        natureOfAcquisition: needsAcquisition ? acquisition : undefined,
      });
      const list = await store.createRequests(inputs, user.id);
      setCreated({ list, matter });
    } catch (e) {
      toast.error(e instanceof StoreError ? tr(`errors.${e.code}`) : t('submitFailed'));
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  function reset() {
    setCreated(undefined);
    setRows([blankRow()]);
    setAttempted(false);
    setPaste('');
  }

  if (created) {
    return (
      <section className="space-y-4" aria-live="polite">
        <h1 className="text-2xl font-semibold">{t('createdTitle', { count: created.list.length })}</h1>
        <p className="text-sm text-muted-foreground">{t('createdBody')}</p>
        <ul className="space-y-2">
          {created.list.map((r) => (
            <li key={r.id}>
              <Link
                href={`/track/?id=${encodeURIComponent(r.requestNumber)}`}
                className="flex min-h-11 items-center justify-between gap-2 rounded-lg border bg-card p-3 hover:bg-muted/50"
              >
                <span className="font-mono text-sm font-semibold">{r.requestNumber}</span>
                <span className="text-sm text-muted-foreground">
                  {r.surveyNo}
                  {r.hissaNo ? `/${r.hissaNo}` : ''}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/pro/?matter=${encodeURIComponent(created.matter)}`}
            className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t('viewMatter')}
          </Link>
          <Button type="button" variant="outline" className="min-h-11" onClick={reset}>
            {t('another')}
          </Button>
        </div>
      </section>
    );
  }

  const show = attempted;
  const count = result.inputs.length;
  return (
    <form
      className="space-y-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('intro')}</p>
        <p className="text-sm text-muted-foreground">{t('digitalOnly')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="bulk-service" className="text-sm font-medium">{t('service')}</label>
          <select
            id="bulk-service"
            className={SELECT}
            value={service}
            onChange={(e) => setService(e.target.value as BulkService)}
          >
            {BULK_SERVICES.map((s) => (
              <option key={s} value={s}>{tr(`services.${s}.name`)}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <DualLabel name="village" htmlFor="bulk-village" required />
          <SearchableSelect
            id="bulk-village"
            value={villageId}
            options={villageOptions}
            onChange={setVillageId}
            placeholder={t('choose')}
            searchPlaceholder={tr('wizard.search')}
            emptyText={tr('wizard.noMatch')}
            disabled={!locs}
          />
          {show && topErrors.village && <p role="alert" className="text-sm text-destructive">{topErrors.village}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="bulk-matter" className="text-sm font-medium">
            {t('matter')} <span aria-hidden className="text-destructive">*</span>
          </label>
          <select
            id="bulk-matter"
            className={SELECT}
            value={matterChoice}
            aria-invalid={show && !!topErrors.matter}
            onChange={(e) => setMatterChoice(e.target.value)}
          >
            <option value="">{t('matterPick')}</option>
            {matters.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
            <option value={NEW_MATTER}>{t('matterNew')}</option>
          </select>
          {matterChoice === NEW_MATTER && (
            <Input
              aria-label={t('matterNewLabel')}
              placeholder={t('matterNewLabel')}
              value={newMatter}
              onChange={(e) => setNewMatter(e.target.value)}
              className={inputClass}
            />
          )}
          {show && topErrors.matter && <p role="alert" className="text-sm text-destructive">{topErrors.matter}</p>}
        </div>

        {needsAcquisition && (
          <div className="space-y-1.5">
            <label htmlFor="bulk-acq" className="text-sm font-medium">
              <DualText name="natureOfAcquisition" /> <span aria-hidden className="text-destructive">*</span>
            </label>
            <select
              id="bulk-acq"
              className={SELECT}
              value={acquisition}
              aria-invalid={show && !!topErrors.acquisition}
              onChange={(e) => setAcquisition(e.target.value)}
            >
              <option value="">{t('choose')}</option>
              {ACQUISITIONS.map((o) => (
                <option key={o} value={o}>{dual(OPTION_LABELS[o])}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">{t('acquisition')}</p>
            {show && topErrors.acquisition && <p role="alert" className="text-sm text-destructive">{topErrors.acquisition}</p>}
          </div>
        )}
      </div>

      <section className="space-y-2 rounded-xl border bg-card p-4">
        <label htmlFor="bulk-paste" className="text-sm font-semibold">{t('paste')}</label>
        <p className="text-xs text-muted-foreground">{t('pasteHint')}</p>
        <Textarea
          id="bulk-paste"
          rows={4}
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder={t('pastePlaceholder')}
          className="bg-background font-mono text-sm"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" className="min-h-11" onClick={addPasted} disabled={!paste.trim()}>
            {t('pasteAdd')}
          </Button>
          {pasteMsg && <p role="alert" className="text-sm text-destructive">{pasteMsg}</p>}
        </div>
      </section>

      <section className="space-y-3" aria-label={t('rows')}>
        <h2 className="font-semibold">{t('rows')}</h2>
        <ol className="space-y-3">
          {rows.map((r, i) => {
            const err = rowError.get(i);
            const bad = show && !!err;
            const p = `bulk-${r.key}`;
            return (
              <li
                key={r.key}
                data-invalid={bad || undefined}
                className={`rounded-xl border bg-card p-3 ${bad ? 'border-destructive ring-1 ring-destructive' : ''}`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{t('row', { n: i + 1 })}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11 min-w-11"
                    aria-label={t('removeRow', { n: i + 1 })}
                    onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.key !== r.key) : [blankRow()]))}
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_1.6fr]">
                  <div className="space-y-1">
                    <CellLabel htmlFor={`${p}-s`} name="surveyNo" required />
                    <SurveyCell id={`${p}-s`} value={r.surveyNo} invalid={bad} onChange={(v) => patchRow(r.key, { surveyNo: v })} />
                  </div>
                  <div className="space-y-1">
                    <CellLabel htmlFor={`${p}-h`} name="hissaNo" required={false} />
                    <Input id={`${p}-h`} value={r.hissaNo} autoComplete="off" onChange={(e) => patchRow(r.key, { hissaNo: e.target.value })} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <CellLabel htmlFor={`${p}-p`} name="period" required={service !== 'LND_FILE'} />
                    <Input
                      id={`${p}-p`}
                      value={r.period}
                      autoComplete="off"
                      placeholder={service === 'OLD_RTC' ? '1975-1982' : 'YYYY'}
                      aria-invalid={bad}
                      onChange={(e) => patchRow(r.key, { period: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <CellLabel htmlFor={`${p}-n`} name={notesField.name} required={notesField.required} />
                    <Input id={`${p}-n`} value={r.notes} autoComplete="off" aria-invalid={bad} onChange={(e) => patchRow(r.key, { notes: e.target.value })} className={inputClass} />
                  </div>
                </div>
                {bad && err && (
                  <p role="alert" className="mt-2 text-sm text-destructive">
                    {errText(err)}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
        <p className="text-xs text-muted-foreground">{t('periodHint')}</p>
        <Button type="button" variant="outline" className="min-h-11" onClick={() => setRows((rs) => [...rs, blankRow()])}>
          <Plus aria-hidden className="size-4" />
          {t('addRow')}
        </Button>
      </section>

      {show && topErrors.rows && <p role="alert" className="text-sm text-destructive">{topErrors.rows}</p>}
      {show && result.errors.length > 0 && <p role="alert" className="text-sm font-medium text-destructive">{t('fixErrors')}</p>}
      <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={pending}>
        {pending ? t('submitting') : t('submit', { count })}
      </Button>
    </form>
  );
}

export function BulkGrid() {
  return (
    <ProGate>
      <div className="mx-auto w-full max-w-4xl px-4 py-6">
        <BulkForm />
      </div>
    </ProGate>
  );
}
