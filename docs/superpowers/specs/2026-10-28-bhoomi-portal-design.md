# Karnataka Land Records Retrieval Portal — Reconciled Design Spec

**Date:** 2026-10-28
**Sources:** `PRD.txt` (product requirements v1.0) and `plan.txt` (AI implementation blueprint). Where the two disagree, this document is the tie-breaker. Every resolution is listed in §9.

---

## 1. Intent

Karnataka's older land records (pre-Bhoomi RTCs, mutation registers, land grant, land reforms and RRT dispute files) are not online. To get one today, someone has to go to the taluk record room in person. The portal lets a citizen or advocate order one of these records online, in Kannada or English, and get a watermarked scan on WhatsApp or a certified hard copy by Speed Post. A back-office team does the fulfilment by hand: operators check requests, runners search the physical *bastas*, and operators upload, watermark and deliver the scans.

**Why staged:** before building the real system, the customer needs to *see and click* the product. Stage 1 is a working demo with dummy data, hosted free on GitHub Pages. Stage 2 builds the real backend behind the same screens.

## 2. Stages

| Stage | What | Hosting | Data |
|---|---|---|---|
| **1 — Clickable demo** | All three portals (citizen, operator, advocate) fully clickable. All integrations simulated. | GitHub Pages (`https://maheshbsv.github.io/bhoomi/`) | Seeded dummy data, kept in the visitor's browser (IndexedDB) |
| **2 — Production MVP** | Real database, OTP login, file storage, WhatsApp, PDF pipeline, operator auth | Server host (decided at Stage 2: Vercel or AWS) | PostgreSQL + S3/R2 |
| **3 — Scale & Pro** | Full location master for all 31 districts, SLA reporting, advocate vault search, payments (if confirmed) | Same as Stage 2 | Same |

Stage 1 code is written so Stage 2 *replaces the data layer, not the UI*. Domain logic (state machine, schemas, request numbering, SLA, watermarking) and all screens carry over unchanged.

## 3. Users & roles

| Role | Needs | Stage 1 access |
|---|---|---|
| **Citizen** | Simple words, few required fields, track by ID or phone | Public pages; mock OTP |
| **Advocate / Real-estate pro** | Bulk orders, group by matter or client, vault of past documents | `/pro` via a "Sign in as demo advocate" button |
| **Operator** | Queue, triage, clarifications, runner assignment, upload and deliver | `/admin` via a "Sign in as demo operator" button |
| **Super admin** | SLA overview across districts and taluks, user roles | `/admin/overview` (read-only stats in Stage 1) |

## 4. Services (canonical)

| Code | Short | Name (EN / KN) | Survey No | Service-specific fields (`*` = required) |
|---|---|---|---|---|
| `OLD_RTC` | RTC | Old RTC (Pahani) / ಹಳೆಯ ಪಹಣಿ | **required** | `yearFrom*`, `yearTo*`, `hissaNo`, `khataNo`, `recordedOwnerName` |
| `OLD_MR` | MR | Old Mutation Register / ಹಳೆಯ ಮ್ಯುಟೇಶನ್ ರಿಜಿಸ್ಟರ್ | **required** | `hissaNo`, `mrNumber`, `approxYear*`, `natureOfAcquisition*` (SALE · INHERITANCE · PARTITION · GIFT · COURT_ORDER), `partiesInvolved` |
| `LND_FILE` | LND | Land Grant File (Darkhast) / ದರಖಾಸ್ತು ಕಡತ | **required** | `hissaNo`, `granteeName*`, `grantOrderNo`, `saguvaliChitNo`, `grantYear` |
| `LRF_FILE` | LRF | Land Reforms File / ಭೂ ಸುಧಾರಣೆ ಕಡತ | optional | `formType*` (FORM_7 · FORM_7A · OCCUPANCY_CERT), `applicantTenantName*`, `landlordName`, `tribunalCaseNo` |
| `RRT_FILE` | RRT | RRT Dispute File / ಆರ್‌ಆರ್‌ಟಿ ವಿವಾದ ಕಡತ | optional | `courtLevel*` (TAHSILDAR · AC · DC), `disputeCaseNo`, `petitionerName*`, `respondentName`, `disputeYear*` |

Year fields accept 1900 to the current year, and `yearFrom ≤ yearTo`. Survey and hissa numbers are free text because values like `108/A`, `2B`, `*` and `P1` all occur. Survey number inputs use `inputmode="numeric"` with a toggle to a text keyboard.

**Request number:** `KAR-{YYYY}-{SHORT}-{NNNN}`, e.g. `KAR-2026-RTC-1082`. `NNNN` is one counter per year shared by all services, starting at 1001.

## 5. Status lifecycle (canonical)

Eleven statuses. Both source files were missing some, and plan.txt renamed one.

```
SUBMITTED ─► UNDER_REVIEW ─┬─► ASSIGNED_TO_RUNNER ─► ARCHIVE_SEARCH_IN_PROGRESS ─┬─► DOCUMENT_RETRIEVED ─► QC_WATERMARK_MERGE ─► DELIVERED
                           │          ▲                         │                 └─► RECORD_UNAVAILABLE
                           ▼          │                         ▼
                     ACTION_REQUIRED ─┴─► CUSTOMER_RESPONDED ◄──┘(via ACTION_REQUIRED)
Any non-terminal ─► CANCELLED
```

Allowed transitions (anything else is rejected):

| From | To |
|---|---|
| SUBMITTED | UNDER_REVIEW, CANCELLED |
| UNDER_REVIEW | ACTION_REQUIRED, ASSIGNED_TO_RUNNER, CANCELLED |
| ACTION_REQUIRED | CUSTOMER_RESPONDED *(automatic when the customer replies)*, CANCELLED |
| CUSTOMER_RESPONDED | UNDER_REVIEW, ACTION_REQUIRED, ASSIGNED_TO_RUNNER, CANCELLED |
| ASSIGNED_TO_RUNNER | ARCHIVE_SEARCH_IN_PROGRESS, CANCELLED |
| ARCHIVE_SEARCH_IN_PROGRESS | DOCUMENT_RETRIEVED, RECORD_UNAVAILABLE, ACTION_REQUIRED, CANCELLED |
| DOCUMENT_RETRIEVED | QC_WATERMARK_MERGE |
| QC_WATERMARK_MERGE | DELIVERED |
| DELIVERED, RECORD_UNAVAILABLE, CANCELLED | *(terminal)* |

Rules:
- Every transition writes a timeline entry with the from-status, to-status, note and actor.
- `RECORD_UNAVAILABLE` requires an uploaded **endorsement certificate** (the official "no record" endorsement), which is delivered like a document.
- `DELIVERED` for physical delivery requires a Speed Post consignment number.
- An operator can send an *informational* message (for example "record volume brittle, search ongoing") at any status without changing it. Only a message that needs an answer moves the request to `ACTION_REQUIRED`.
- **Citizen-facing stepper** shows five simplified stages: Submitted → Under review → Searching archives → Preparing document → Delivered. `ACTION_REQUIRED` shows as a banner, not a step.

## 6. SLA

- The SLA clock starts at submission and stops at a terminal status.
- **My call:** the clock **pauses while the request is in `ACTION_REQUIRED`**, because the delay is the customer's.
- Colours from elapsed working-clock hours: green < 48h, orange 48–96h, red > 96h.

## 7. Data model (canonical, for Stage 2; Stage 1 uses the same shapes in TypeScript)

Starts from plan.txt's Prisma schema and puts back the PRD fields it dropped.

```prisma
model Location {
  id         Int     @id @default(autoincrement())
  districtEn String
  districtKn String
  talukEn    String
  talukKn    String
  hobliEn    String
  hobliKn    String
  villageEn  String
  villageKn  String
  pincode    String?
  isActive   Boolean @default(true)
  requests   ServiceRequest[]
  @@index([districtEn, talukEn, hobliEn, villageEn])
}

model User {
  id          String   @id @default(uuid())
  phoneNumber String   @unique          // E.164, e.g. +919876543210
  fullName    String?
  email       String?
  role        Role     @default(CITIZEN)
  createdAt   DateTime @default(now())
  requests         ServiceRequest[] @relation("CitizenRequests")
  assignedRequests ServiceRequest[] @relation("OperatorRequests")
  timelineEntries  RequestTimeline[]
  uploads          RequestDocument[]
  messages         RequestMessage[]
}

enum Role { CITIZEN ADVOCATE OPERATOR ADMIN }

model ServiceRequest {
  id              String       @id @default(uuid())
  requestNumber   String       @unique
  userId          String
  user            User         @relation("CitizenRequests", fields: [userId], references: [id])
  serviceType     ServiceType
  status          OrderStatus  @default(SUBMITTED)
  locationId      Int          // village-level row; district/taluk/hobli come from it
  location        Location     @relation(fields: [locationId], references: [id])
  surveyNo        String?      // required for RTC/MR/LND, enforced in zod
  hissaNo         String?
  periodOrYear    String?      // denormalised for queue display/search
  serviceMetadata Json         @default("{}")
  matterTag       String?      // advocate grouping
  batchId         String?      // set when created via bulk grid
  deliveryMode    DeliveryMode @default(DIGITAL)
  shippingAddress Json?
  consignmentNo   String?
  runnerName      String?      // runners are not system users in MVP
  assignedOpId    String?
  operator        User?        @relation("OperatorRequests", fields: [assignedOpId], references: [id])
  documents       RequestDocument[]
  timeline        RequestTimeline[]
  messages        RequestMessage[]
  notes           InternalNote[]
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  @@index([status, serviceType])
}

enum ServiceType  { OLD_RTC OLD_MR LND_FILE LRF_FILE RRT_FILE }
enum DeliveryMode { DIGITAL PHYSICAL BOTH }
enum OrderStatus {
  SUBMITTED UNDER_REVIEW ACTION_REQUIRED CUSTOMER_RESPONDED
  ASSIGNED_TO_RUNNER ARCHIVE_SEARCH_IN_PROGRESS DOCUMENT_RETRIEVED
  QC_WATERMARK_MERGE RECORD_UNAVAILABLE DELIVERED CANCELLED
}

model RequestDocument {
  id            String   @id @default(uuid())
  requestId     String
  request       ServiceRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  fileType      DocType
  storageKey    String   // S3 key, never a public URL
  fileName      String
  fileSizeBytes Int
  mimeType      String
  uploadedById  String?
  uploadedBy    User?    @relation(fields: [uploadedById], references: [id])
  createdAt     DateTime @default(now())
}

enum DocType { CUSTOMER_REFERENCE OPERATOR_SCAN FINAL_DELIVERABLE ENDORSEMENT_CERTIFICATE }

model RequestTimeline {
  id         Int          @id @default(autoincrement())
  requestId  String
  request    ServiceRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  fromStatus OrderStatus?
  toStatus   OrderStatus
  note       String?
  actorId    String?
  actor      User?        @relation(fields: [actorId], references: [id])
  createdAt  DateTime     @default(now())
}

model RequestMessage {           // WhatsApp thread (both directions)
  id          String    @id @default(uuid())
  requestId   String
  request     ServiceRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  direction   Direction
  body        String?
  templateKey String?
  mediaKey    String?
  waMessageId String?   @unique
  senderId    String?
  sender      User?     @relation(fields: [senderId], references: [id])
  createdAt   DateTime  @default(now())
}
enum Direction { OUTBOUND INBOUND }

model InternalNote {
  id        String   @id @default(uuid())
  requestId String
  request   ServiceRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  body      String
  authorId  String
  createdAt DateTime @default(now())
}
```

**Validation:** zod 4 discriminated union on `serviceType`, in `src/domain/schemas.ts`, shared by client and server. The location payload is just `villageId`; the UI derives the cascading choices from the location list. Phone is collected as a 10-digit Indian mobile number (`^[6-9]\d{9}$`) and stored as `+91…`.

## 8. Screens

### Citizen (public)
1. **Landing** — what the service is, five service cards with typical turnaround, "Track a request" box, EN/ಕನ್ನಡ toggle.
2. **Request wizard** (6 steps, progress bar, back/next, state kept if the page is refreshed): Service → Location (4 searchable cascading selects) → Details (fields per service from §4, every label in both languages, e.g. "Survey No / ಸರ್ವೆ ನಂಬರ್") → Uploads (JPG/PNG/PDF ≤ 10 MB each, up to 5) → Delivery (Digital / Physical / Both, address form if physical) → Verify phone (OTP) and review → Success screen with the request number and a copy/share button.
3. **Track** (`/track?id=` or phone + OTP → list of my requests): simplified stepper, full timeline, action-required banner with a reply box (text + photo), and download buttons for delivered files.

### Operator back office
4. **Queue** — table with filters (district, taluk, service, status, SLA colour), sort by age, search by request number / survey no / name, SLA colour dot, pagination.
5. **Workspace** — three panels: *Left* shows submitted details, location and the customer upload gallery. *Centre* has the status control (only shows legal next statuses), runner assignment, internal notes, timeline, operator scan uploader and "Generate watermarked PDF" → preview → Deliver. *Right* is the WhatsApp thread with template buttons and a free-text reply.
6. **Run sheet** — choose taluk and date. Shows a print-ready slip per request (request no., village, survey/hissa, period, key names, a blank "found / not found / volume no." box) plus a request-number barcode-style text. Print or save as PDF from the browser.
7. **Admin overview** — counts by status and SLA colour per district/taluk, average days to deliver, unavailable rate.

### Advocate
8. **Pro dashboard** — matters (client/project tags) with request counts and progress.
9. **Bulk order** — choose service and one village, then a spreadsheet-style grid (add/remove/paste rows of survey no, hissa, period, notes) and a matter tag. Submitting creates one request per row with a shared `batchId`.
10. **Vault** — every delivered document, filter by matter / taluk / village / service, download.

### WhatsApp clarification templates (canonical keys)
- `SURVEY_VILLAGE_MISMATCH` — "Survey number does not match the selected village register." *(needs reply)*
- `MULTIPLE_ENTRIES_NEED_FATHER_NAME` — "Multiple entries found for this surname; please share the ancestor's father's name." *(needs reply)*
- `RECORD_BRITTLE_SEARCH_ONGOING` — "Record volume is brittle or partly damaged at the taluk; search is ongoing." *(informational)*
- `REQUEST_CLEARER_PHOTO` — "Please share a clearer photo of the old document you uploaded." *(needs reply; my addition)*

### Watermark footer (every page of the final PDF)
`{requestNumber} · Retrieved {dd-MMM-yyyy} · Copy of archival record procured on request; not a certified copy unless stamped by the issuing office.` Pages are scaled to A4, and the output is kept under 10 MB (images are downscaled when needed).

## 9. Reconciliation decisions

| # | Conflict / gap | Resolution |
|---|---|---|
| 1 | Status enums differed between the PRD SQL, PRD diagram and plan Prisma | 11 canonical statuses in §5, with an explicit transition table |
| 2 | Plan schema dropped PRD fields (matter tag, shipping address, email, pincode, endorsement doc, actor, file size/MIME) | All put back (§7). Added `RequestMessage`, `InternalNote`, `batchId`, `consignmentNo`, `runnerName` |
| 3 | `surveyNo` required in the database but LRF and RRT have no survey field | Nullable column; zod requires it only for RTC/MR/LND |
| 4 | `LocationSchema` used district/taluk/hobli IDs against a flat table | Request stores `villageId` only |
| 5 | `(admin)` route group would not produce `/admin/*` and overlapped `(public)/request` | Real `admin/` segment |
| 6 | OTP, watermarking, run sheets, SLA, inbound webhook, advocate portal and request numbering were in no phase | All scheduled (§10 and the implementation plan) |
| 7 | `fileUrl` implied public URLs; the PRD requires private storage | `storageKey` stored; pre-signed URLs issued on demand (30-day expiry for delivery links) |
| 8 | "Next.js 14+" | Next.js 16 / React 19 / Tailwind 4 / zod 4 (current stable releases) |
| 9 | Runners have no role in the schema | Runner is a free-text name on the request for MVP; a runner role/app is a Stage 3 consideration |
| 10 | `DOCUMENT_RETRIEVED → DELIVERED` skipped QC in the plan | `QC_WATERMARK_MERGE` is mandatory between them |

## 10. Stage 1 — Clickable demo on GitHub Pages

### Goal
A visitor opens one URL and can play every role, end to end, with nothing installed. The customer should come away with an accurate feel for the screens, the flow and the bilingual experience.

### Non-goals
No real OTP, SMS, WhatsApp, email, payments or server. No data is shared between visitors.

### Anti-goals (failure even if it "works")
- Anything that looks like a real government portal. No state emblem, no "Government of Karnataka" branding, no Bhoomi logo. A permanent **"Demo — sample data, no messages are sent"** strip is shown on every page.
- Stage 1 code that has to be thrown away for Stage 2.

### Architecture
- **Next.js 16 static export** (`output: 'export'`, `basePath: '/bhoomi'`, `trailingSlash: true`, `images.unoptimized`).
- **Routing:** locale prefix `/en/…` and `/kn/…` generated statically. The root `/bhoomi/` redirects on the client to `/bhoomi/en/` (or `kn` if the browser prefers it). Dynamic records use query strings (`/admin/request/?id=…`) because a static export cannot pre-render IDs created at runtime.
- **i18n:** `next-intl` with `messages/en.json` and `messages/kn.json`. **The Kannada text is machine-assisted and must be reviewed by a native speaker before it is shown to the customer** (tracked as an open item).
- **UI:** Tailwind 4 + shadcn/ui components, mobile-first, 44px minimum touch targets, Noto Sans Kannada / Noto Sans for text.
- **State:** a Zustand store for the wizard (persisted to sessionStorage). Domain data goes through a `DataStore` interface in `src/data/`:
  - `DemoStore` (Stage 1) — IndexedDB via `idb-keyval`. Files are stored as Blobs.
  - `ApiStore` (Stage 2) — server actions / route handlers. The UI depends only on the interface.
- **Seed data:** 4 districts (Bengaluru Urban, Bengaluru Rural, Mysuru, Tumakuru), 2 taluks each, 1–2 hoblis per taluk, and 2–4 villages per hobli, with EN/KN names. Seed names are illustrative, not an authoritative master. There are ~30 requests spread across every status and service, with ages chosen so all three SLA colours appear relative to *now*, plus timelines, message threads and two delivered sample PDFs generated at seed time. There are 3 demo citizens (one shown on the OTP screen), 1 advocate with 2 matters, and 2 operators.
- **Simulations, all clearly labelled:**
  - *OTP:* any phone number works. The code is shown on screen ("Demo OTP: 123456").
  - *WhatsApp:* outbound templates appear in the thread. Customer replies come from the track page's reply box (a stand-in for WhatsApp) or a "Simulate customer reply" button in the workspace.
  - *Uploads:* real file picking and preview; stored in the browser.
  - *Watermark/merge:* **real**, done in the browser with `pdf-lib`. Images and PDFs are merged, the footer from §8 is stamped, and the result is downloadable.
  - *Delivery:* marks the request delivered and puts the PDF on the track page and in the vault; shows a "would send via WhatsApp + email" toast.
  - *Run sheet:* real printable page (`window.print`).
- **Demo controls** (in the footer): "Reset demo data", and a role switcher (Citizen / Advocate / Operator).

### Quality bar
- Unit tests (Vitest) for the state machine, request numbering, SLA calculation, zod schemas and the watermark pipeline.
- One Playwright smoke test against the built static site: submit a request → operator moves it to DELIVERED → citizen downloads the PDF.
- Lighthouse mobile performance ≥ 85 on the landing page.
- Works on a 360px-wide phone and on desktop.

### Deployment
GitHub Actions workflow on push to `main`: install → test → `next build` → upload `out/` → `actions/deploy-pages`. Repo `Maheshbsv/bhoomi` is public. Pages must be set to "GitHub Actions" as its source (one-time setting).

### Demo script (for the customer walkthrough)
1. Landing in Kannada → switch to English.
2. Order an Old RTC for Bagalur village, upload a photo, choose digital delivery, verify with the demo OTP → get `KAR-2026-RTC-xxxx`.
3. Switch to Operator → find it in the queue (green) → Under review → send the "multiple entries" template.
4. Switch to Citizen → the track page shows the banner → reply with the father's name.
5. Operator → Assign runner → print the run sheet → Searching → upload two scan images → generate the watermarked PDF → Deliver.
6. Citizen → download the PDF from the track page.
7. Advocate → bulk-order 5 survey numbers under "Devanahalli 15-Acre Title Verification" → view matter progress and the vault.
8. Admin overview → SLA picture across districts.

## 11. Stage 2+ (summary; detailed plans written when Stage 1 is accepted)

- **Stage 2 — MVP:** Postgres + Prisma schema from §7; `ApiStore` behind the same interface; phone OTP through an Indian SMS provider registered on the DLT platform (TRAI requires this for sending SMS in India), with a WhatsApp OTP fallback; operator login with role-based access; S3/R2 private bucket with pre-signed upload/download; WhatsApp Cloud API (approved templates, inbound webhook matched to the active request by phone number, 24-hour session window handling); server-side `pdf-lib` pipeline; audit timeline; email delivery link.
- **Stage 3:** full location master for all 31 districts (source to be confirmed), advocate vault search, SLA reports and exports, runner workflow, payments if in scope.

## 12. Open items for the customer

1. **Payments / fees** — neither source document mentions pricing or payment. Is there a fee, and is it paid upfront, on delivery, or offline?
2. **Kannada copy review** — who on the customer side can review the Kannada wording?
3. **Location master data** — where will the full District → Village list come from for Stage 3?
4. **WhatsApp Business account** — the customer must own the Meta Business account and get the templates approved (takes days to weeks).
5. **Branding** — product name, logo and colours for the demo. Until they're decided, a neutral working name is used: **"Hale Dakhale / ಹಳೆ ದಾಖಲೆ — Old Land Records"**. It deliberately avoids "Bhoomi", which is the government system's name.
