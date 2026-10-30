# Stage 1 — Clickable Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A fully clickable, bilingual demo of the land-records portal (citizen, operator and advocate) that runs entirely in the browser with seeded dummy data and is deployed to `https://maheshbsv.github.io/bhoomi/`.

**Architecture:** Next.js 16 static export under `basePath: '/bhoomi'`, with locale-prefixed routes (`/en`, `/kn`) via next-intl. All domain rules live in framework-free modules under `src/domain/` (these carry over to Stage 2 unchanged). The UI talks only to a `DataStore` interface. Stage 1 implements it as `DemoStore` on IndexedDB (`idb-keyval`), with files stored as Blobs. PDF merge and watermark run for real in the browser with `pdf-lib`.

**Tech Stack:** Next.js 16, React 19, TypeScript (strict), Tailwind CSS 4, shadcn/ui, next-intl 4, zod 4, react-hook-form 7, Zustand 5, idb-keyval 6, pdf-lib 1.17, Vitest 5 (+ fake-indexeddb, jsdom), Playwright 1.64, GitHub Actions → GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-28-bhoomi-portal-design.md` (read §4–§10 before starting any task).

## Global Constraints

- `next.config.ts`: `output: 'export'`, `basePath: '/bhoomi'`, `trailingSlash: true`, `images: { unoptimized: true }`. No middleware, no route handlers, no server actions (static export).
- Runtime-created records are addressed by query string (`/admin/request/?id=…`, `/track/?id=…`), never by dynamic segments.
- Locales: `en`, `kn`. Every user-visible string comes from `messages/{en,kn}.json`. Form field labels show both languages ("Survey No / ಸರ್ವೆ ನಂಬರ್") whatever the active locale.
- Working product name: "Hale Dakhale / ಹಳೆ ದಾಖಲೆ — Old Land Records". No government emblem, no "Government of Karnataka", no "Bhoomi" in the UI.
- Every page shows the strip: "Demo — sample data, no messages are sent" / "ಡೆಮೊ — ಮಾದರಿ ಮಾಹಿತಿ, ಯಾವುದೇ ಸಂದೇಶ ಕಳುಹಿಸಲಾಗುವುದಿಲ್ಲ".
- Request number format `KAR-{YYYY}-{RTC|MR|LND|LRF|RRT}-{NNNN}`; one counter per year shared by all services, starting at 1001.
- SLA: green < 48h, orange 48–96h (inclusive), red > 96h. The clock pauses during `ACTION_REQUIRED` and stops at a terminal status.
- Uploads: JPG/PNG/PDF only, ≤ 10 MB each, ≤ 5 per request.
- Demo OTP is `123456` and is displayed on screen.
- Mobile-first: works at 360px width; touch targets ≥ 44px; survey number inputs use `inputMode="numeric"` with a "use letters" toggle.
- Fonts: Noto Sans + Noto Sans Kannada (via `next/font/google`).
- Scripts: `npm test` = `vitest run`; `npm run build` produces `out/`; `npm run e2e` = Playwright.

## Review Focus

1. **Names typed in Kannada** (grantee, parties, reply text) must save, show in the queue and print on the run sheet unchanged. Test in Task 4.
2. **Track lookup with messy input** (`" kar-2026-rtc-1082 "`, unknown IDs) should normalise and either find the request or show "not found", never crash. Test in Task 2.
3. **Bad uploads from phones** (HEIC, 15 MB photo, sixth file) should be rejected with a specific message before they are stored. Test in Task 2.
4. **IndexedDB unavailable** (private browsing, blocked storage) should fall back to an in-memory store with a banner rather than a blank app. Test in Task 4.
5. **Huge camera images in the deliverable** (4000×3000 px) should be downscaled so the merged PDF stays under 10 MB. Test in Task 5.

---

## File Structure

```
next.config.ts  vitest.config.ts  playwright.config.ts  components.json
messages/en.json  messages/kn.json
scripts/serve-out.mjs                       # serves out/ at /bhoomi for e2e
.github/workflows/deploy.yml
src/
  i18n/routing.ts  i18n/request.ts          # next-intl config
  domain/                                   # pure TS, no React — carried to Stage 2
    types.ts            # entity + enum types mirroring spec §7
    services.ts         # SERVICE_CATALOG (spec §4)
    status.ts           # transition table, citizen stage mapping
    requestNumber.ts    # format/parse/normalise
    sla.ts              # elapsed hours with pause + colour
    schemas.ts          # zod schemas
    uploads.ts          # validateUpload
    templates.ts        # WhatsApp clarification templates (spec §8)
    locations.ts        # cascade helpers over flat Location[]
  pdf/deliverable.ts                         # pdf-lib merge + watermark
  data/
    DataStore.ts        # interface
    demoStore.ts        # IndexedDB implementation + memory fallback
    seed.ts             # dummy data builder
    provider.tsx        # React context: useStore()
  store/wizard.ts  store/session.ts          # Zustand
  components/ui/*                            # shadcn
  components/shell/*                         # Header, LocaleToggle, DemoStrip, DemoControls
  components/wizard/*  components/track/*  components/admin/*  components/pro/*  components/shared/*
  app/
    layout.tsx  page.tsx (root redirect)  not-found.tsx
    [locale]/layout.tsx  [locale]/page.tsx
    [locale]/request/page.tsx  [locale]/request/success/page.tsx
    [locale]/track/page.tsx
    [locale]/admin/page.tsx  admin/request/page.tsx  admin/run-sheet/page.tsx  admin/overview/page.tsx
    [locale]/pro/page.tsx  pro/bulk/page.tsx  pro/vault/page.tsx
tests/unit/*.test.ts   tests/e2e/demo-flow.spec.ts
```

---

### Task 1: Scaffold, static export, i18n shell

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `components.json`, `src/i18n/routing.ts`, `src/i18n/request.ts`, `messages/en.json`, `messages/kn.json`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx` (placeholder heading), `src/components/shell/{Header,LocaleToggle,DemoStrip}.tsx`, `.gitignore`
- Test: `tests/build/build-output.test.ts`

**Interfaces:**
- Produces: `routing` (`locales: ['en','kn']`, `defaultLocale: 'en'`, `localePrefix: 'always'`); `Link`, `useRouter`, `usePathname` exported from `src/i18n/routing.ts` via `createNavigation`; `<Header/>` rendered by `[locale]/layout.tsx` and containing `<LocaleToggle/>` and `<DemoStrip/>`.

- [ ] **Step 1:** Scaffold with `npx create-next-app@16 . --ts --tailwind --app --src-dir --eslint --import-alias "@/*" --use-npm`. Add deps: `next-intl zod react-hook-form @hookform/resolvers zustand idb-keyval pdf-lib`. Add dev deps: `vitest jsdom fake-indexeddb @testing-library/react @playwright/test`. Run `npx shadcn@latest init`, then add `button card input label select dialog table badge tabs textarea sonner command popover progress separator`.
- [ ] **Step 2:** Configure `next.config.ts` per Global Constraints, wrapped with `createNextIntlPlugin('./src/i18n/request.ts')`. `[locale]/layout.tsx` exports `generateStaticParams()` → `[{locale:'en'},{locale:'kn'}]` and calls `setRequestLocale(locale)`; it loads Noto Sans + Noto Sans Kannada and sets `<html lang>`. Root `src/app/page.tsx` is a client component that does `location.replace` to `/bhoomi/kn/` if `navigator.language` starts with `kn`, else `/bhoomi/en/`.
- [ ] **Step 3: Write failing test** `tests/build/build-output.test.ts`. `vitest.config.ts` includes only `tests/unit/**`. The `test:build` script is `next build && vitest run --dir tests/build`:

```ts
test('static export emits both locales under out/', () => {
  expect(existsSync('out/en/index.html')).toBe(true);
  expect(existsSync('out/kn/index.html')).toBe(true);
  expect(readFileSync('out/en/index.html','utf8')).toContain('/bhoomi/_next/');
  expect(readFileSync('out/kn/index.html','utf8')).toContain('ಹಳೆ ದಾಖಲೆ');
});
```

- [ ] **Step 4:** Run `npm run test:build`. Expected: FAIL until the layout, header (product name from messages) and locales exist. Implement, then re-run → PASS.
- [ ] **Step 5:** Run `npm run dev` and open `http://localhost:3000/bhoomi/en/`. Check that the toggle switches to `/bhoomi/kn/` and the demo strip is visible at 360px.
- [ ] **Step 6: Commit** `chore: scaffold Next 16 static export with en/kn i18n shell`

---

### Task 2: Domain core — types, catalog, status machine, numbering, SLA, uploads

**Files:**
- Create: `src/domain/{types,services,status,requestNumber,sla,uploads,templates,locations}.ts`
- Test: `tests/unit/{status,requestNumber,sla,uploads,locations}.test.ts`

**Interfaces:**
- Produces (types.ts): `ServiceType`, `OrderStatus` (11 values, spec §5), `DeliveryMode`, `DocType` (`CUSTOMER_REFERENCE | OPERATOR_SCAN | FINAL_DELIVERABLE | ENDORSEMENT_CERTIFICATE`), `Role`, and interfaces `Location`, `User`, `ServiceRequest`, `TimelineEntry`, `RequestDocument`, `RequestMessage`, `InternalNote`. Fields mirror the Prisma models in spec §7 (camelCase; dates as ISO strings; `RequestDocument.storageKey` holds the Blob key).
- `SERVICE_CATALOG: Record<ServiceType, { short: 'RTC'|'MR'|'LND'|'LRF'|'RRT'; surveyRequired: boolean; typicalDays: [number, number] }>`. Typical days: RTC [5,10], MR [7,14], LND [10,21], LRF [10,21], RRT [14,30] (my call; labelled "typical" in the UI).
- `TRANSITIONS: Record<OrderStatus, OrderStatus[]>` (spec §5 table, exactly), `canTransition(from, to): boolean`, `operatorNextStatuses(from): OrderStatus[]` (TRANSITIONS minus `CUSTOMER_RESPONDED`), `isTerminal(s): boolean`, `citizenStage(s): 0|1|2|3|4|'closed'`.
- `formatRequestNumber(service: ServiceType, year: number, seq: number): string`, `normalizeRequestNumber(raw: string): string | null` (trim, uppercase, must match `/^KAR-\d{4}-(RTC|MR|LND|LRF|RRT)-\d{4,}$/`).
- `slaHours(createdAt: string, timeline: TimelineEntry[], now: Date): number`, `slaColor(hours: number): 'green'|'orange'|'red'`.
- `validateUpload(file: {name: string; type: string; size: number}, existingCount: number): { ok: true } | { ok: false; reason: 'TYPE' | 'SIZE' | 'COUNT' }`.
- `CLARIFICATION_TEMPLATES: { key: TemplateKey; needsReply: boolean }[]` with the four keys from spec §8. The text lives in messages under `templates.<KEY>`.
- `districtsOf(locs)`, `taluksOf(locs, districtEn)`, `hoblisOf(locs, districtEn, talukEn)`, `villagesOf(locs, districtEn, talukEn, hobliEn): Location[]`. Each returns unique items sorted by English name, as `{ en: string; kn: string }`, except villages, which return the `Location` rows.

- [ ] **Step 1: Write failing tests:**

```ts
// status.test.ts
expect(canTransition('SUBMITTED','UNDER_REVIEW')).toBe(true);
expect(canTransition('DOCUMENT_RETRIEVED','DELIVERED')).toBe(false);
expect(canTransition('ARCHIVE_SEARCH_IN_PROGRESS','ACTION_REQUIRED')).toBe(true);
expect(operatorNextStatuses('ACTION_REQUIRED')).toEqual(['CANCELLED']);
expect(TRANSITIONS.DELIVERED).toEqual([]);
expect(citizenStage('CUSTOMER_RESPONDED')).toBe(1);
expect(citizenStage('QC_WATERMARK_MERGE')).toBe(3);
expect(citizenStage('RECORD_UNAVAILABLE')).toBe('closed');
// requestNumber.test.ts
expect(formatRequestNumber('OLD_RTC', 2026, 1082)).toBe('KAR-2026-RTC-1082');
expect(normalizeRequestNumber('  kar-2026-rtc-1082 ')).toBe('KAR-2026-RTC-1082');
expect(normalizeRequestNumber('hello')).toBeNull();
// sla.test.ts  (t0 = 2026-10-01T00:00Z; h(n) = t0 + n hours)
expect(slaHours(t0, [], h(50))).toBe(50);
expect(slaHours(t0, [entry('UNDER_REVIEW','ACTION_REQUIRED',h(10)), entry('ACTION_REQUIRED','CUSTOMER_RESPONDED',h(30))], h(60))).toBe(40);
expect(slaHours(t0, [entry('UNDER_REVIEW','ACTION_REQUIRED',h(10))], h(60))).toBe(10);  // still paused
expect(slaHours(t0, [entry('QC_WATERMARK_MERGE','DELIVERED',h(100))], h(200))).toBe(100); // stopped
expect([slaColor(47.9), slaColor(48), slaColor(96), slaColor(96.1)]).toEqual(['green','orange','orange','red']);
// uploads.test.ts
expect(validateUpload({name:'a.heic',type:'image/heic',size:1e6},0)).toEqual({ok:false,reason:'TYPE'});
expect(validateUpload({name:'a.jpg',type:'image/jpeg',size:15*1024*1024},0)).toEqual({ok:false,reason:'SIZE'});
expect(validateUpload({name:'a.pdf',type:'application/pdf',size:1e6},5)).toEqual({ok:false,reason:'COUNT'});
expect(validateUpload({name:'a.png',type:'image/png',size:10*1024*1024},4)).toEqual({ok:true});
// locations.test.ts — fixture of 3 rows across 2 taluks
expect(taluksOf(rows,'Bengaluru Urban').map(t=>t.en)).toEqual(['Anekal','Yelahanka']);
```

- [ ] **Step 2:** Run `npx vitest run tests/unit` → FAIL (modules missing).
- [ ] **Step 3:** Implement the modules with the signatures above. `slaHours` walks the timeline in order, adding time while not in `ACTION_REQUIRED` and stopping at the first entry into a terminal status. Result is rounded to 0.1h.
- [ ] **Step 4:** Run `npx vitest run tests/unit` → PASS.
- [ ] **Step 5: Commit** `feat(domain): status machine, request numbers, SLA, upload rules`

---

### Task 3: Zod schemas

**Files:**
- Create: `src/domain/schemas.ts`
- Test: `tests/unit/schemas.test.ts`

**Interfaces:**
- Consumes: `ServiceType`, `DeliveryMode` from Task 2.
- Produces: `ServiceDetailsSchema` (zod `discriminatedUnion('serviceType', …)`, with fields per spec §4; `surveyNo` required for OLD_RTC/OLD_MR/LND_FILE, optional otherwise), `ShippingAddressSchema` (`name, line1, line2?, city, district, pincode /^\d{6}$/`), `DeliverySchema` (`mode`, `address` required when mode ≠ DIGITAL, plus `email?`), `PhoneSchema` (`/^[6-9]\d{9}$/`), `CreateRequestSchema = { details: ServiceDetails, villageId: number, delivery, phone, matterTag?: string, batchId?: string }`. Inferred types: `ServiceDetails`, `CreateRequestInput`. Also `toServiceMetadata(details): Record<string, unknown>` (everything except `serviceType`, `surveyNo` and `hissaNo`) and `periodLabel(details): string | undefined` (RTC → `"1975–1982"`, others → their year field).

- [ ] **Step 1: Write failing tests:**

```ts
const rtc = { serviceType:'OLD_RTC', surveyNo:'108/A', yearFrom:1975, yearTo:1982 };
expect(ServiceDetailsSchema.safeParse(rtc).success).toBe(true);
expect(ServiceDetailsSchema.safeParse({...rtc, surveyNo:''}).success).toBe(false);
expect(ServiceDetailsSchema.safeParse({...rtc, yearFrom:1990, yearTo:1980}).success).toBe(false);
expect(ServiceDetailsSchema.safeParse({...rtc, yearFrom:1899}).success).toBe(false);
expect(ServiceDetailsSchema.safeParse({ serviceType:'LRF_FILE', formType:'FORM_7', applicantTenantName:'ರುದ್ರಪ್ಪ' }).success).toBe(true);
expect(ServiceDetailsSchema.safeParse({ serviceType:'RRT_FILE', courtLevel:'AC', petitionerName:'Anjanappa' }).success).toBe(false); // disputeYear missing
expect(PhoneSchema.safeParse('9876543210').success).toBe(true);
expect(PhoneSchema.safeParse('5123456789').success).toBe(false);
expect(DeliverySchema.safeParse({ mode:'PHYSICAL' }).success).toBe(false);
expect(periodLabel(rtc)).toBe('1975–1982');
```

- [ ] **Step 2:** `npx vitest run tests/unit/schemas.test.ts` → FAIL.
- [ ] **Step 3:** Implement. Year fields use `z.coerce.number().int().min(1900).max(new Date().getFullYear())`; the RTC year order is checked with `.refine` on the RTC branch. Error messages are i18n keys (e.g. `'errors.yearOrder'`), not English text.
- [ ] **Step 4:** Re-run → PASS.
- [ ] **Step 5: Commit** `feat(domain): zod schemas for all five services`

---

### Task 4: DataStore interface, DemoStore, seed data

**Files:**
- Create: `src/data/DataStore.ts`, `src/data/demoStore.ts`, `src/data/seed.ts`, `src/data/provider.tsx`
- Test: `tests/unit/demoStore.test.ts` (with `import 'fake-indexeddb/auto'`)

**Interfaces:**
- Consumes: Task 2 types/rules, Task 3 `CreateRequestInput`, `toServiceMetadata`, `periodLabel`.
- Produces:

```ts
export interface RequestDetail { request: ServiceRequest; location: Location; user: User;
  timeline: TimelineEntry[]; documents: RequestDocument[]; messages: RequestMessage[]; notes: InternalNote[] }
export interface RequestFilter { districtEn?: string; talukEn?: string; serviceType?: ServiceType;
  status?: OrderStatus; sla?: 'green'|'orange'|'red'; q?: string; userId?: string; matterTag?: string }
export interface DataStore {
  listLocations(): Promise<Location[]>;
  listUsers(): Promise<User[]>;
  findOrCreateUserByPhone(phone10: string, role?: Role): Promise<User>;
  listRequests(filter?: RequestFilter, now?: Date): Promise<ServiceRequest[]>;   // newest first
  getRequest(idOrNumber: string): Promise<RequestDetail | null>;
  createRequests(inputs: CreateRequestInput[], userId: string, files?: File[][]): Promise<ServiceRequest[]>;
  transition(id: string, to: OrderStatus, opts: { actorId: string; note?: string; runnerName?: string; consignmentNo?: string }): Promise<ServiceRequest>;
  sendMessage(id: string, msg: { templateKey?: TemplateKey; body?: string }, actorId: string): Promise<RequestMessage>;
  receiveCustomerReply(id: string, reply: { body?: string; file?: File }): Promise<RequestMessage>;
  addNote(id: string, body: string, authorId: string): Promise<InternalNote>;
  addDocument(id: string, blob: Blob, meta: { fileType: DocType; fileName: string; uploadedById?: string }): Promise<RequestDocument>;
  getBlob(storageKey: string): Promise<Blob | null>;
  reset(): Promise<void>;          // wipe + reseed
  readonly persistent: boolean;    // false when using memory fallback
}
export function createDemoStore(): Promise<DataStore>;          // demoStore.ts
export function StoreProvider(props): JSX.Element; export function useStore(): DataStore; // provider.tsx
```

- Store rules (each throws `StoreError` with a `code`):
  - `transition` rejects moves not in `canTransition` (`ILLEGAL_TRANSITION`).
  - `ASSIGNED_TO_RUNNER` needs `runnerName` (`RUNNER_REQUIRED`).
  - `RECORD_UNAVAILABLE` needs an `ENDORSEMENT_CERTIFICATE` document (`ENDORSEMENT_REQUIRED`).
  - `DELIVERED` needs a `FINAL_DELIVERABLE` document, plus `consignmentNo` when the mode is not DIGITAL (`DELIVERABLE_REQUIRED`, `CONSIGNMENT_REQUIRED`).
  - `sendMessage` with a `needsReply` template moves `UNDER_REVIEW`, `CUSTOMER_RESPONDED` or `ARCHIVE_SEARCH_IN_PROGRESS` to `ACTION_REQUIRED`; other statuses get the message without a status change.
  - `receiveCustomerReply` stores an INBOUND message (and a `CUSTOMER_REFERENCE` doc if there is a file) and moves `ACTION_REQUIRED` to `CUSTOMER_RESPONDED`.
  - `createRequests` assigns numbers from a per-year counter (key `counter:{year}`, first value 1001) and writes the SUBMITTED timeline entry.
- Persistence: an `idb-keyval` store `createStore('hale-dakhale','kv')`. Each collection is one key (`locations`, `users`, `requests`, `timeline`, `documents`, `messages`, `notes`); blobs are under `blob:{uuid}`; `seeded:v1` is a flag. If `indexedDB` is missing or `open` throws, fall back to a `Map`-backed implementation of the same get/set with `persistent=false`.
- `seed.ts` exports `buildSeed(now: Date): Promise<SeedData>`. Contents per spec §10 "Seed data": 4 districts × 2 taluks, 1–2 hoblis each, 2–4 villages each, EN+KN names (illustrative, including Yelahanka → Jala → Bagalur and Devanahalli → Kasaba → Devanahalli). Demo users are citizen `9876543210` "Ramesh Gowda", citizen `9000000003` "Lakshmamma", citizen `9000000004` "Syed Imran", advocate `9000000005` "Adv. Kavya Rao" with matters "Devanahalli 15-Acre Title Verification" and "Hoskote Layout Due Diligence", and operators `9000000001` "Operator Suma" and `9000000002` "Operator Prakash". There are 30 requests: every status at least twice, every service at least 4 times, `createdAt` offsets chosen so each SLA colour has ≥ 5 requests. Two DELIVERED requests carry a `FINAL_DELIVERABLE` built by `buildDeliverable` (Task 5) from generated "sample archive page" images. Timelines are consistent with `TRANSITIONS`.

- [ ] **Step 1: Write failing tests** (`now = new Date('2026-10-28T10:00:00+05:30')`):

```ts
const s = await createDemoStore();
expect((await s.listRequests()).length).toBe(30);
const [r] = await s.createRequests([{ details:{ serviceType:'LND_FILE', surveyNo:'45', granteeName:'ಮುನಿಯಪ್ಪ' }, villageId: bagalurId, delivery:{mode:'DIGITAL'}, phone:'9876543210' }], uid);
expect(r.requestNumber).toMatch(/^KAR-2026-LND-\d{4}$/);
expect((await s.getRequest(r.requestNumber))!.request.serviceMetadata.granteeName).toBe('ಮುನಿಯಪ್ಪ');
await expect(s.transition(r.id,'DELIVERED',{actorId:op})).rejects.toMatchObject({code:'ILLEGAL_TRANSITION'});
await s.transition(r.id,'UNDER_REVIEW',{actorId:op});
await s.sendMessage(r.id,{templateKey:'MULTIPLE_ENTRIES_NEED_FATHER_NAME'},op);
expect((await s.getRequest(r.id))!.request.status).toBe('ACTION_REQUIRED');
await s.receiveCustomerReply(r.id,{body:'ತಂದೆ: ಚಿಕ್ಕಣ್ಣ'});
expect((await s.getRequest(r.id))!.request.status).toBe('CUSTOMER_RESPONDED');
await expect(s.transition(r.id,'ASSIGNED_TO_RUNNER',{actorId:op})).rejects.toMatchObject({code:'RUNNER_REQUIRED'});
// sequence counter
const [a,b] = await s.createRequests([inputRtc, inputRtc], uid);
expect(Number(b.requestNumber.slice(-4))).toBe(Number(a.requestNumber.slice(-4)) + 1);
// fallback
const saved = globalThis.indexedDB; // @ts-expect-error
delete globalThis.indexedDB;
const mem = await createDemoStore(); expect(mem.persistent).toBe(false);
expect((await mem.listRequests()).length).toBe(30);
globalThis.indexedDB = saved;
// filters
expect((await s.listRequests({ sla:'red' }, now)).every(x => x.status !== 'DELIVERED')).toBe(true);
```

- [ ] **Step 2:** `npx vitest run tests/unit/demoStore.test.ts` → FAIL.
- [ ] **Step 3:** Implement `DataStore.ts`, `demoStore.ts`, `seed.ts`. The seed's PDF generation depends on Task 5; until then, stub `buildDeliverable` behind an import and finish Task 5 first if running sequentially. **Execution order: do Task 5 before Step 3 of this task.**
- [ ] **Step 4:** Implement `provider.tsx`: a client component that awaits `createDemoStore()`, shows a skeleton until ready, and shows a dismissible "Storage unavailable — changes won't survive a refresh" banner when `persistent === false`. Wrap `[locale]/layout.tsx` children in it.
- [ ] **Step 5:** Re-run → PASS.
- [ ] **Step 6: Commit** `feat(data): DataStore interface, IndexedDB demo store, seed data`

---

### Task 5: PDF deliverable pipeline

**Files:**
- Create: `src/pdf/deliverable.ts`
- Test: `tests/unit/deliverable.test.ts`

**Interfaces:**
- Produces: `footerText(requestNumber: string, date: Date): string` — exactly `` `${requestNumber} · Retrieved ${dd-MMM-yyyy} · Copy of archival record procured on request; not a certified copy unless stamped by the issuing office.` `` (e.g. `28-Oct-2026`, English month abbreviations); `fitWithin(w: number, h: number, maxLongEdge = 2000): {w: number; h: number}`; `buildDeliverable(inputs: { bytes: Uint8Array; mimeType: string }[], meta: { requestNumber: string; date: Date }): Promise<Uint8Array>`.
- Behaviour: every image becomes one A4 portrait page (595.28 × 841.89 pt), scaled to fit inside 36pt margins with a 28pt footer band. Every page of an input PDF is copied in and scaled to A4. The footer is drawn at 7pt Helvetica, grey, centred, on every page. Images larger than `fitWithin` are re-encoded by the caller in the browser (`createImageBitmap` + `OffscreenCanvas` → JPEG 0.85) through `prepareImage(blob): Promise<{bytes, mimeType}>`, exported from the same file. Tests cover `fitWithin` only, because `OffscreenCanvas` isn't available in Node.
- Footer text is English only: the built-in PDF fonts cannot render Kannada (my call; noted on the delivery screen).

- [ ] **Step 1: Write failing tests:**

```ts
expect(footerText('KAR-2026-RTC-1082', new Date('2026-10-28T12:00:00Z'))).toBe('KAR-2026-RTC-1082 · Retrieved 28-Oct-2026 · Copy of archival record procured on request; not a certified copy unless stamped by the issuing office.');
expect(fitWithin(4000,3000)).toEqual({w:2000,h:1500});
expect(fitWithin(800,600)).toEqual({w:800,h:600});
const out = await buildDeliverable([png1x1, png1x1, twoPagePdf], { requestNumber:'KAR-2026-RTC-1082', date });
const doc = await PDFDocument.load(out);
expect(doc.getPageCount()).toBe(4);
doc.getPages().forEach(p => { expect(Math.round(p.getWidth())).toBe(595); expect(Math.round(p.getHeight())).toBe(842); });
expect(out.byteLength).toBeLessThan(10 * 1024 * 1024);
```

(`png1x1` is a base64 constant in the test; `twoPagePdf` is built in the test with `PDFDocument.create()` + 2 `addPage()`.)

- [ ] **Step 2:** `npx vitest run tests/unit/deliverable.test.ts` → FAIL.
- [ ] **Step 3:** Implement with `pdf-lib` (`embedJpg`/`embedPng`, `copyPages` + `embedPage` for PDF inputs so they can be scaled).
- [ ] **Step 4:** Re-run → PASS.
- [ ] **Step 5: Commit** `feat(pdf): merge + watermark deliverable pipeline`

---

### Task 6: App shell, session, demo controls, landing page

**Files:**
- Create: `src/store/session.ts`, `src/components/shell/DemoControls.tsx`, `src/components/shared/{LocationLabel,StatusBadge,SlaDot,ServiceCard}.tsx`
- Modify: `src/app/[locale]/page.tsx`, `src/app/[locale]/layout.tsx`, `messages/*.json`

**Interfaces:**
- Produces: `useSession` (Zustand, persisted to `localStorage` key `hd-session`): `{ user: User | null; signIn(user: User): void; signOut(): void }`. `<StatusBadge status/>` (colour per status family, localised label `status.<STATUS>`), `<SlaDot color/>`, `<LocationLabel location/>` (village, hobli, taluk, district in the active locale).
- `DemoControls` (in the footer): role switcher buttons. "Citizen" signs in as `9876543210` and goes to `/track/`; "Advocate" goes to `/pro/`; "Operator" signs in as Operator Suma and goes to `/admin/`. A "Reset demo data" button opens a confirm dialog, then calls `store.reset()` and `signOut()`.
- Landing: hero with the product name and one-line pitch, five `ServiceCard`s (name EN+KN, a description line, typical days from `SERVICE_CATALOG`) linking to `/request/?service=OLD_RTC` and so on, a "Track a request" input that routes to `/track/?id=…`, and a three-step "How it works" strip. The header has nav: Request · Track · For advocates · Operator desk.

- [ ] **Step 1:** Implement the components and landing page. All copy goes in `messages/en.json` and `messages/kn.json` under `landing.*`, `nav.*`, `status.*`, `services.<TYPE>.{name,desc}`, `templates.<KEY>`, `errors.*`.
- [ ] **Step 2:** Add a key-parity test `tests/unit/messages.test.ts`: the flattened key sets of `en.json` and `kn.json` are equal, and no `kn` value is an empty string. Run → PASS after filling both files.
- [ ] **Step 3:** Run `npm run dev` and check at 360px and 1280px in both locales: the cards link with the service preselected, and Reset restores 30 requests.
- [ ] **Step 4: Commit** `feat(ui): app shell, demo controls, landing page`

---

### Task 7: Citizen request wizard

**Files:**
- Create: `src/store/wizard.ts`, `src/components/wizard/{WizardShell,StepService,StepLocation,StepDetails,StepUploads,StepDelivery,StepVerify,SearchableSelect,FileDrop}.tsx`, `src/app/[locale]/request/page.tsx`, `src/app/[locale]/request/success/page.tsx`
- Test: `tests/unit/wizard.test.ts`

**Interfaces:**
- Consumes: `SERVICE_CATALOG`, `districtsOf…villagesOf`, `ServiceDetailsSchema`, `DeliverySchema`, `PhoneSchema`, `validateUpload`, `useStore().createRequests`, `findOrCreateUserByPhone`, `useSession`.
- Produces: `useWizard` (Zustand, persisted to `sessionStorage` key `hd-wizard`, with `partialize` that **excludes `files`**): `{ step: 0..5; serviceType?; location?: {districtEn?, talukEn?, hobliEn?, villageId?}; details: Partial<ServiceDetails>; files: File[]; delivery?; phone?; setStep; patch(partial); addFile(f): ReturnType<typeof validateUpload>; removeFile(i); reset() }`.
- Behaviour:
  - Steps follow spec §8.2. `?service=` preselects and skips to step 1.
  - `SearchableSelect` is a shadcn `Command` in a `Popover` that shows "English / ಕನ್ನಡ" and filters on both.
  - The details step renders fields per service from `SERVICE_CATALOG` + spec §4 with `react-hook-form` + `zodResolver(ServiceDetailsSchema)`.
  - The uploads step shows thumbnails (images) or file-name chips (PDF) and an inline reason for each rejected file. If the page is refreshed with files lost, it shows "Please re-attach your files".
  - The delivery step shows the address form when needed.
  - The verify step: phone input → "Send OTP" → shows "Demo OTP: 123456" → 6-digit input. Wrong code → error. Correct → review summary → Submit → `createRequests` → `/request/success/?id=KAR-…`.
  - The success page shows the number in large monospace, Copy and WhatsApp-share (`https://wa.me/?text=…`) buttons, and a "Track this request" link. It then calls `reset()` on the wizard.

- [ ] **Step 1: Write failing test:**

```ts
useWizard.getState().patch({ serviceType:'OLD_RTC' });
useWizard.getState().addFile(new File([new Uint8Array(10)],'a.jpg',{type:'image/jpeg'}));
const persisted = JSON.parse(sessionStorage.getItem('hd-wizard')!);
expect(persisted.state.serviceType).toBe('OLD_RTC');
expect(persisted.state.files).toBeUndefined();
expect(useWizard.getState().addFile(new File([],'b.heic',{type:'image/heic'}))).toEqual({ok:false,reason:'TYPE'});
```

- [ ] **Step 2:** `npx vitest run tests/unit/wizard.test.ts` (jsdom environment) → FAIL. Implement the store → PASS.
- [ ] **Step 3:** Build the step components and pages.
- [ ] **Step 4:** Manual check in `npm run dev`: complete one request per service in both locales. RTC with `yearFrom > yearTo` shows the localised error. A physical-delivery request without a pincode is blocked. Refreshing on step 3 keeps the fields.
- [ ] **Step 5: Commit** `feat(citizen): six-step request wizard with demo OTP`

---

### Task 8: Tracking page and customer reply

**Files:**
- Create: `src/components/track/{TrackLookup,Stepper,Timeline,ActionBanner,ReplyBox,DeliveredFiles,MyRequests}.tsx`, `src/components/shared/OtpDialog.tsx`, `src/app/[locale]/track/page.tsx`

**Interfaces:**
- Consumes: `normalizeRequestNumber`, `citizenStage`, `useStore().getRequest/listRequests/receiveCustomerReply/getBlob`, `useSession`.
- Behaviour:
  - With `?id=`, normalise it. If invalid or unknown, show a "not found" card with the lookup box.
  - Otherwise show a 5-step `Stepper` (`citizenStage`; `'closed'` shows a status card instead), the service, location, request number, and a `Timeline` with localised statuses and the operator's customer-visible notes. Internal notes are never shown.
  - When the status is `ACTION_REQUIRED`, show an `ActionBanner` with the latest OUTBOUND message text and a `ReplyBox` (textarea + one photo through `validateUpload`), labelled "In the live service you'd reply on WhatsApp".
  - When delivered, `DeliveredFiles` lists `FINAL_DELIVERABLE` / `ENDORSEMENT_CERTIFICATE` documents with Download buttons (object URL from `getBlob`).
  - Without `?id=`: a lookup box plus "View all my requests" → `OtpDialog` (shared with the wizard's verify step: phone → demo OTP → sign in) → `MyRequests` list for that user.

- [ ] **Step 1:** Implement the components; extract `OtpDialog` from Task 7's verify step so both pages use it.
- [ ] **Step 2:** Manual check: `/track/?id=%20kar-2026-rtc-1001%20` resolves; `?id=nope` shows not-found; a seeded ACTION_REQUIRED request accepts a reply and flips to "Under review"; a seeded DELIVERED request downloads a PDF that opens with the footer visible.
- [ ] **Step 3: Commit** `feat(citizen): tracking page with stepper, reply and downloads`

---

### Task 9: Operator queue

**Files:**
- Create: `src/components/admin/{AdminGate,QueueFilters,QueueTable}.tsx`, `src/app/[locale]/admin/page.tsx`
- Test: `tests/unit/queue.test.ts`

**Interfaces:**
- Consumes: `useStore().listRequests(filter, now)`, `slaHours`, `slaColor`, `useSession`.
- Produces: `AdminGate` — a wrapper used by every `/admin/*` page. If `session.user.role` is not OPERATOR or ADMIN, it shows a "Sign in as demo operator" card with buttons for each seeded operator. Also `applyQueueQuery(rows: QueueRow[], q: { sort: 'age'|'updated'; page: number; pageSize: 20 }): { rows: QueueRow[]; total: number }`, where `QueueRow = ServiceRequest & { location: Location; slaHours: number; sla: 'green'|'orange'|'red' }`.
- Behaviour:
  - Filters (district → taluk cascade, service, status, SLA colour, free-text `q` across request number, survey no, and the names in metadata) are synced to the URL query string.
  - Table columns: SLA dot + hours, request no., service, village/taluk, survey/hissa, status badge, age. Row click → `/admin/request/?id=`.
  - Default view hides terminal statuses, with a toggle to show them.
  - Header counts by SLA colour.

- [ ] **Step 1: Write failing test:** `applyQueueQuery` with 45 rows → page 2 has 20 rows, page 3 has 5, `total` 45; `sort:'age'` puts the largest `slaHours` first.
- [ ] **Step 2:** Run → FAIL; implement → PASS.
- [ ] **Step 3:** Build the page; manual check that filters combine, the URL is shareable, and a Kannada-name search finds the seeded request.
- [ ] **Step 4: Commit** `feat(operator): triage queue with SLA colours and filters`

---

### Task 10: Fulfilment workspace

**Files:**
- Create: `src/components/admin/{DetailsPanel,UploadGallery,ActionPanel,StatusControl,RunnerAssign,NotesPanel,ScanUploader,DeliverablePreview,WhatsAppThread}.tsx`, `src/app/[locale]/admin/request/page.tsx`

**Interfaces:**
- Consumes: `operatorNextStatuses`, `CLARIFICATION_TEMPLATES`, `buildDeliverable`, `prepareImage`, `footerText`, all `DataStore` mutation methods. Errors map `StoreError.code` → `errors.<code>` toast.
- Behaviour (three columns on ≥ 1024px; tabs "Details / Actions / Chat" on mobile):
  - **Left:** service fields with dual labels, location, delivery mode/address, customer upload gallery (lightbox for images; PDFs open in a new tab via object URL).
  - **Centre:**
    - `StatusControl` is a select of `operatorNextStatuses` plus a note and Apply. Choosing `ASSIGNED_TO_RUNNER` reveals a runner-name input (with suggestions from the seed: "Nagaraj (Yelahanka)", "Mahadev (Devanahalli)", …). `RECORD_UNAVAILABLE` requires uploading an endorsement file first. `DELIVERED` with physical mode reveals a consignment input.
    - `ScanUploader` takes multiple images/PDFs as `OPERATOR_SCAN`, allowed only in `ARCHIVE_SEARCH_IN_PROGRESS`, `DOCUMENT_RETRIEVED` or `QC_WATERMARK_MERGE`. A drag handle reorders them.
    - "Generate watermarked PDF" runs `prepareImage` and `buildDeliverable` on the scans in order, shows an iframe preview, then "Save as final" → `addDocument(FINAL_DELIVERABLE)`. If the status is `DOCUMENT_RETRIEVED`, it auto-transitions to `QC_WATERMARK_MERGE`.
    - "Deliver" → `transition('DELIVERED')` + toast "Would send via WhatsApp + email (demo)".
    - Internal notes list + add.
    - Timeline.
  - **Right:** `WhatsAppThread` shows chat bubbles (OUTBOUND right, INBOUND left, with media thumbnails), four template buttons (text from `templates.<KEY>`, marked "needs reply" or "info"), a free-text send, and a "Simulate customer reply" button (prompts for text in a dialog, never `window.prompt`).

- [ ] **Step 1:** Implement the components and page.
- [ ] **Step 2:** Manual end-to-end check on a fresh request: Under review → template (status becomes Action required) → simulate reply → Assign runner → Search → upload 2 images + 1 PDF → generate → preview shows a footer on every page → save → Deliver → track page downloads it. Illegal options never appear in the select. Mobile tabs work at 360px.
- [ ] **Step 3: Commit** `feat(operator): three-panel fulfilment workspace with PDF pipeline`

---

### Task 11: Run sheet and admin overview

**Files:**
- Create: `src/app/[locale]/admin/run-sheet/page.tsx`, `src/components/admin/{RunSheet,OverviewStats}.tsx`, `src/app/[locale]/admin/overview/page.tsx`, print CSS in `src/app/globals.css`
- Test: `tests/unit/overview.test.ts`

**Interfaces:**
- Consumes: `listRequests`, `slaHours`, `slaColor`, `AdminGate`.
- Produces: `summarise(rows: QueueRow[]): { byStatus: Record<OrderStatus, number>; bySla: Record<'green'|'orange'|'red', number>; byTaluk: { districtEn: string; talukEn: string; open: number; red: number }[]; avgDaysToDeliver: number | null; unavailableRate: number }`. Rates are over terminal requests only; `avgDaysToDeliver` is from `createdAt` to the DELIVERED entry.
- Run sheet:
  - Filters: taluk (required), statuses `ASSIGNED_TO_RUNNER` + `ARCHIVE_SEARCH_IN_PROGRESS` (default), and a runner name.
  - Each slip has the request no. (large monospace), service, village/hobli in EN+KN, survey/hissa, period, key names from metadata, and a ruled box "Found ☐ / Not found ☐ / Volume no. ____ / Page ____ / Runner sign ____".
  - Header has taluk, date and count. A "Print / Save PDF" button calls `window.print()`.
  - `@media print` hides the shell and the demo strip, and puts two slips per A4 page.
- Overview: SLA tiles, a status count table, and a per-taluk table sorted by red count.

- [ ] **Step 1: Write failing test** for `summarise` on a 6-row fixture (2 delivered after 72h and 120h → `avgDaysToDeliver` 4; 1 unavailable → `unavailableRate` = 1/3; `bySla` counts as constructed).
- [ ] **Step 2:** Run → FAIL; implement → PASS.
- [ ] **Step 3:** Build both pages; check that browser print preview shows two slips per page with no app chrome and that Kannada renders.
- [ ] **Step 4: Commit** `feat(operator): printable taluk run sheets and admin overview`

---

### Task 12: Advocate portal — dashboard, bulk grid, vault

**Files:**
- Create: `src/components/pro/{ProGate,MatterList,BulkGrid,VaultTable}.tsx`, `src/app/[locale]/pro/page.tsx`, `src/app/[locale]/pro/bulk/page.tsx`, `src/app/[locale]/pro/vault/page.tsx`
- Test: `tests/unit/bulk.test.ts`

**Interfaces:**
- Consumes: `ServiceDetailsSchema`, `createRequests`, `listRequests({userId, matterTag})`, `getBlob`, `citizenStage`.
- Produces: `parsePastedRows(text: string): { surveyNo: string; hissaNo?: string; period?: string; notes?: string }[]` (tab- or comma-separated; blank lines skipped; header row skipped if its first cell is non-numeric and contains "survey"). Also `rowsToInputs(rows, base: { serviceType: ServiceType; villageId: number; delivery; phone: string; matterTag: string }): { inputs: CreateRequestInput[]; errors: { row: number; key: string }[] }`. `period` maps to `yearFrom`/`yearTo` for RTC (`"1975-1982"` or `"1975"`) and to the service's single year field otherwise.
- Behaviour:
  - `ProGate` is like `AdminGate`, for the ADVOCATE role.
  - The dashboard shows matter cards: name, count, a progress bar of `citizenStage` (delivered/total), and links to filtered lists. The "New bulk order" CTA goes to the bulk page.
  - Bulk page: service select (RTC/MR/LND, the survey-based services), a single village via `SearchableSelect`, a matter tag (existing or new), an editable grid with add/remove row and a "Paste from Excel" textarea, and per-row error highlighting. Submit creates all requests with a shared `batchId` and shows the created numbers.
  - Vault: DELIVERED documents for the advocate, filterable by matter/taluk/village/service, with download.

- [ ] **Step 1: Write failing tests:**

```ts
expect(parsePastedRows('Survey\tHissa\tPeriod\n45\t2B\t1975-1982\n\n108/A\t*\t1990')).toEqual([
  { surveyNo:'45', hissaNo:'2B', period:'1975-1982' }, { surveyNo:'108/A', hissaNo:'*', period:'1990' }]);
const { inputs, errors } = rowsToInputs([{surveyNo:'45',period:'1982-1975'},{surveyNo:'46',period:'1975-1982'}], base);
expect(inputs).toHaveLength(1); expect(errors).toEqual([{ row:0, key:'errors.yearOrder' }]);
```

- [ ] **Step 2:** Run → FAIL; implement → PASS.
- [ ] **Step 3:** Build the pages; manual check: paste 5 rows under "Devanahalli 15-Acre Title Verification" → 5 requests appear in the operator queue and on the matter card.
- [ ] **Step 4: Commit** `feat(pro): advocate matters, bulk order grid, document vault`

---

### Task 13: E2E smoke test and GitHub Pages deployment

**Files:**
- Create: `scripts/serve-out.mjs`, `playwright.config.ts`, `tests/e2e/demo-flow.spec.ts`, `.github/workflows/deploy.yml`, `public/.nojekyll`
- Modify: `README.md` (what the demo is, the live URL, the demo script from spec §10, and `npm run dev`/`test`/`build`)

**Interfaces:**
- `serve-out.mjs`: a Node `http` static server on port 4173 that maps `/bhoomi/*` → `out/*` (index.html for directories, 404 → `out/404.html`).
- The workflow runs on push to `main` and `workflow_dispatch`, with `permissions: { contents: read, pages: write, id-token: write }` and a `concurrency: pages` group. Job `build`: checkout → setup-node (Node 24, npm cache) → `npm ci` → `npm test` → `npm run build` → `npx playwright install --with-deps chromium` → `npm run e2e` → `actions/upload-pages-artifact` (path `out`). Job `deploy`: `actions/deploy-pages`, environment `github-pages`. Use the current major versions of `actions/checkout`, `actions/setup-node`, `actions/configure-pages`, `actions/upload-pages-artifact` and `actions/deploy-pages`.

- [ ] **Step 1: Write the e2e test** (Chromium, viewport 390×844), mirroring spec §10's demo script steps 2–6:
  - Open `/bhoomi/en/` → click Old RTC → pick Bengaluru Urban / Yelahanka / Jala / Bagalur → survey `45`, years 1975–1982 → upload `tests/e2e/fixtures/deed.jpg` → Digital → phone `9876543210`, OTP `123456` → submit → capture the `KAR-2026-RTC-\d{4}` number.
  - Operator: open queue → search the number → open → Under review → send `MULTIPLE_ENTRIES_NEED_FATHER_NAME`.
  - Track page → reply "Father: Chikkanna".
  - Operator → assign runner "Nagaraj (Yelahanka)" → Search → upload 2 fixture images → generate → save → Deliver.
  - Track page → expect status "Delivered" and a download button whose download is a `.pdf` > 1 KB.
- [ ] **Step 2:** Run `npm run build && npm run e2e`. Expected: PASS (fix any failing UI wiring it exposes).
- [ ] **Step 3:** Add the workflow and README. Run `npx --yes action-validator .github/workflows/deploy.yml` (or a YAML lint) → no errors.
- [ ] **Step 4: Commit** `ci: e2e smoke test and GitHub Pages deploy workflow`
- [ ] **Step 5 (needs the user's go-ahead, because it is outward-facing):** push `main`; set the Pages source to Actions with `gh api -X POST repos/Maheshbsv/bhoomi/pages -f build_type=workflow` (or `PUT` if Pages already exists); watch the run with `gh run watch`; open `https://maheshbsv.github.io/bhoomi/` and run through the demo script on a phone-sized viewport.

---

## After Stage 1

Once the customer has reviewed the demo and answered the open items in spec §12, write `docs/superpowers/plans/<date>-stage2-mvp.md` covering: Prisma schema from spec §7 + migrations + seed; `ApiStore` implementing `DataStore` on server actions; OTP auth (DLT-registered SMS provider + WhatsApp fallback) and operator RBAC; S3/R2 pre-signed uploads/downloads; WhatsApp Cloud API outbound templates + inbound webhook; server-side `buildDeliverable`; hosting move off GitHub Pages.
