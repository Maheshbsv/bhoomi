import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { buildDeliverable } from '@/pdf/deliverable';
import { formatRequestNumber } from '@/domain/requestNumber';
import { periodLabel, toServiceMetadata, type ServiceDetails } from '@/domain/schemas';
import type { TemplateKey } from '@/domain/templates';
import type {
  DocType,
  InternalNote,
  Location,
  OrderStatus,
  RequestDocument,
  RequestMessage,
  ServiceRequest,
  ServiceType,
  ShippingAddress,
  TimelineEntry,
  User,
} from '@/domain/types';
import {
  EN_NAMES,
  EN_REPLIES,
  KN_NAMES,
  KN_REPLIES,
  MATTERS,
  SURVEY_NOS,
  USER_IDS,
  buildLocations,
  buildUsers,
  runnerFor,
} from './seedTables';

export interface SeedData {
  locations: Location[];
  users: User[];
  requests: ServiceRequest[];
  timeline: TimelineEntry[];
  documents: RequestDocument[];
  messages: RequestMessage[];
  notes: InternalNote[];
  blobs: Record<string, Blob>;
  /** Last-issued sequence per `counter:{year}` key. */
  counters: Record<string, number>;
}

const HOUR = 3_600_000;
const SERVICES: ServiceType[] = ['OLD_RTC', 'OLD_MR', 'LND_FILE', 'LRF_FILE', 'RRT_FILE'];

/** Canonical path from SUBMITTED to each status (every hop is allowed by TRANSITIONS). */
const PATHS: Record<OrderStatus, OrderStatus[]> = {
  SUBMITTED: [],
  UNDER_REVIEW: ['UNDER_REVIEW'],
  ACTION_REQUIRED: ['UNDER_REVIEW', 'ACTION_REQUIRED'],
  CUSTOMER_RESPONDED: ['UNDER_REVIEW', 'ACTION_REQUIRED', 'CUSTOMER_RESPONDED'],
  ASSIGNED_TO_RUNNER: ['UNDER_REVIEW', 'ASSIGNED_TO_RUNNER'],
  ARCHIVE_SEARCH_IN_PROGRESS: ['UNDER_REVIEW', 'ASSIGNED_TO_RUNNER', 'ARCHIVE_SEARCH_IN_PROGRESS'],
  DOCUMENT_RETRIEVED: ['UNDER_REVIEW', 'ASSIGNED_TO_RUNNER', 'ARCHIVE_SEARCH_IN_PROGRESS', 'DOCUMENT_RETRIEVED'],
  QC_WATERMARK_MERGE: [
    'UNDER_REVIEW',
    'ASSIGNED_TO_RUNNER',
    'ARCHIVE_SEARCH_IN_PROGRESS',
    'DOCUMENT_RETRIEVED',
    'QC_WATERMARK_MERGE',
  ],
  RECORD_UNAVAILABLE: ['UNDER_REVIEW', 'ASSIGNED_TO_RUNNER', 'ARCHIVE_SEARCH_IN_PROGRESS', 'RECORD_UNAVAILABLE'],
  DELIVERED: [
    'UNDER_REVIEW',
    'ASSIGNED_TO_RUNNER',
    'ARCHIVE_SEARCH_IN_PROGRESS',
    'DOCUMENT_RETRIEVED',
    'QC_WATERMARK_MERGE',
    'DELIVERED',
  ],
  CANCELLED: ['UNDER_REVIEW', 'CANCELLED'],
};

// [status, age in hours]. SLA hours (clock paused in ACTION_REQUIRED) give green/orange/red mixes.
// Positions 1, 5, 9, ... (index % 4 === 1) belong to the advocate: positions 13 and 17 are delivered and 21 and 25
// are record-unavailable, so the document vault has four rows and the matter cards show real progress.
const PLAN: [OrderStatus, number][] = [
  ['SUBMITTED', 3],
  ['SUBMITTED', 20],
  ['SUBMITTED', 70],
  ['ASSIGNED_TO_RUNNER', 90],
  ['ARCHIVE_SEARCH_IN_PROGRESS', 60],
  ['UNDER_REVIEW', 30],
  ['UNDER_REVIEW', 80],
  ['UNDER_REVIEW', 150],
  ['UNDER_REVIEW', 55],
  ['ACTION_REQUIRED', 100],
  ['ACTION_REQUIRED', 40],
  ['CUSTOMER_RESPONDED', 120],
  ['CUSTOMER_RESPONDED', 200],
  ['DELIVERED', 330],
  ['ASSIGNED_TO_RUNNER', 250],
  ['ASSIGNED_TO_RUNNER', 36],
  ['ARCHIVE_SEARCH_IN_PROGRESS', 130],
  ['DELIVERED', 190],
  ['ARCHIVE_SEARCH_IN_PROGRESS', 20],
  ['ARCHIVE_SEARCH_IN_PROGRESS', 170],
  ['DOCUMENT_RETRIEVED', 110],
  ['RECORD_UNAVAILABLE', 260],
  ['QC_WATERMARK_MERGE', 200],
  ['QC_WATERMARK_MERGE', 30],
  ['DOCUMENT_RETRIEVED', 45],
  ['RECORD_UNAVAILABLE', 220],
  ['DELIVERED', 400],
  ['DELIVERED', 260],
  ['CANCELLED', 90],
  ['CANCELLED', 30],
];

const AR_TEMPLATES: TemplateKey[] = [
  'SURVEY_VILLAGE_MISMATCH',
  'REQUEST_CLEARER_PHOTO',
  'MULTIPLE_ENTRIES_NEED_FATHER_NAME',
];

const OP_NOTES = [
  'Checked the taluk index register; entry looks to be under the older survey number.',
  'Customer prefers a call after 5 pm. Keep WhatsApp updates short.',
  'Hobli office says the volume was moved to the record room last year.',
  'Possible duplicate of an earlier request for the same survey; compare before delivery.',
];

/** Small "sample archive page" PDF (Latin script only; standard fonts cannot draw Kannada). */
async function samplePage(title: string, lines: string[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  const page = doc.addPage([420, 595]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  page.drawRectangle({ x: 0, y: 0, width: 420, height: 595, color: rgb(0.96, 0.93, 0.84) });
  for (let y = 60; y < 520; y += 22) {
    page.drawLine({ start: { x: 36, y }, end: { x: 384, y }, thickness: 0.6, color: rgb(0.76, 0.71, 0.6) });
  }
  page.drawText('SAMPLE ARCHIVE PAGE - ILLUSTRATIVE ONLY', { x: 36, y: 550, size: 11, font: bold, color: rgb(0.45, 0.2, 0.15) });
  page.drawText(title, { x: 36, y: 528, size: 10, font, color: rgb(0.25, 0.2, 0.15) });
  lines.forEach((t, i) => page.drawText(t, { x: 40, y: 484 - i * 44, size: 10, font, color: rgb(0.2, 0.2, 0.3) }));
  return doc.save();
}

const pdfBlob = (bytes: Uint8Array) => new Blob([bytes as BlobPart], { type: 'application/pdf' });

function buildDetails(service: ServiceType, i: number, survey: string, hissa: string | undefined, name: string): ServiceDetails {
  const other = EN_NAMES[(i * 5 + 3) % EN_NAMES.length];
  switch (service) {
    case 'OLD_RTC':
      return {
        serviceType: 'OLD_RTC',
        surveyNo: survey,
        hissaNo: hissa,
        yearFrom: 1965 + (i % 6) * 3,
        yearTo: 1980 + (i % 5) * 4,
        khataNo: i % 2 ? String(100 + i * 7) : undefined,
        recordedOwnerName: name,
      };
    case 'OLD_MR':
      return {
        serviceType: 'OLD_MR',
        surveyNo: survey,
        hissaNo: hissa,
        mrNumber: i % 3 ? `MR-${20 + i}/${1970 + (i % 20)}` : undefined,
        approxYear: 1968 + (i % 25),
        natureOfAcquisition: (['SALE', 'INHERITANCE', 'PARTITION', 'GIFT', 'COURT_ORDER'] as const)[i % 5],
        partiesInvolved: `${name} / ${other}`,
      };
    case 'LND_FILE':
      return {
        serviceType: 'LND_FILE',
        surveyNo: survey,
        hissaNo: hissa,
        granteeName: name,
        grantOrderNo: i % 2 ? `LND/SR/${300 + i}/1975` : undefined,
        saguvaliChitNo: i % 3 === 0 ? `SC-${40 + i}` : undefined,
        grantYear: 1960 + (i % 20),
      };
    case 'LRF_FILE':
      return {
        serviceType: 'LRF_FILE',
        surveyNo: i % 2 ? survey : undefined,
        hissaNo: i % 2 ? hissa : undefined,
        formType: (['FORM_7', 'FORM_7A', 'OCCUPANCY_CERT'] as const)[i % 3],
        applicantTenantName: name,
        landlordName: other,
        tribunalCaseNo: i % 2 ? `LRF/${50 + i}/1976` : undefined,
      };
    case 'RRT_FILE':
      return {
        serviceType: 'RRT_FILE',
        surveyNo: i % 3 ? survey : undefined,
        hissaNo: i % 3 ? hissa : undefined,
        courtLevel: (['TAHSILDAR', 'AC', 'DC'] as const)[i % 3],
        disputeCaseNo: `RRT/${10 + i}/${1985 + (i % 10)}`,
        petitionerName: name,
        respondentName: other,
        disputeYear: 1985 + (i % 12),
      };
  }
}

/** Deterministic for a given `now` (no randomness; fixed tables and index arithmetic). */
export async function buildSeed(now: Date): Promise<SeedData> {
  const locations = buildLocations();
  const users = buildUsers(now);
  const citizens = [USER_IDS.ramesh, USER_IDS.lakshmamma, USER_IDS.imran];
  const ops = [USER_IDS.suma, USER_IDS.prakash];
  const userById = new Map(users.map((u) => [u.id, u]));
  // Alternate the two taluks so the advocate's delivered and unavailable requests (and so the vault) span both matters.
  const devanahalli = locations.filter((l) => l.talukEn === 'Devanahalli');
  const hoskote = locations.filter((l) => l.talukEn === 'Hoskote');
  const advVillage = (slot: number): Location =>
    slot % 2 === 0 ? devanahalli[(slot / 2) % devanahalli.length] : hoskote[((slot - 1) / 2) % hoskote.length];

  // Oldest first so request numbers rise with age.
  const order = PLAN.map((p, idx) => ({ st: p[0], age: p[1], idx })).sort((a, b) => b.age - a.age || a.idx - b.idx);

  const counters: Record<string, number> = {};
  const requests: ServiceRequest[] = [];
  const timeline: TimelineEntry[] = [];
  const documents: RequestDocument[] = [];
  const messages: RequestMessage[] = [];
  const notes: InternalNote[] = [];
  const blobs: Record<string, Blob> = {};
  let seq = 0;
  const nextSeq = () => ++seq;
  let nameCount = 0;

  const addDoc = (
    requestId: string,
    fileType: DocType,
    fileName: string,
    bytes: Uint8Array,
    at: string,
    uploadedById?: string,
  ) => {
    const n = nextSeq();
    const storageKey = `blob:seed-${n}`;
    blobs[storageKey] = pdfBlob(bytes);
    documents.push({
      id: `seed-doc-${n}`,
      requestId,
      fileType,
      storageKey,
      fileName,
      fileSizeBytes: bytes.byteLength,
      mimeType: 'application/pdf',
      uploadedById,
      createdAt: at,
    });
  };

  for (const { st, age, idx } of order) {
    const createdMs = now.getTime() - age * HOUR;
    const created = new Date(createdMs).toISOString();
    const year = Number(created.slice(0, 4));
    const ckey = `counter:${year}`;
    const num = (counters[ckey] ?? 1000) + 1;
    counters[ckey] = num;

    const service = SERVICES[idx % 5];
    const isAdv = idx % 4 === 1;
    const owner = isAdv ? USER_IDS.kavya : citizens[idx % 3];
    let loc: Location;
    let matterTag: string | undefined;
    if (isAdv) {
      loc = advVillage((idx - 1) / 4);
      matterTag = MATTERS[loc.talukEn === 'Devanahalli' ? 0 : 1];
    } else {
      loc = locations[(idx * 5 + 2) % locations.length];
    }
    const useKn = idx % 3 === 0;
    const name = useKn ? KN_NAMES[nameCount++ % KN_NAMES.length] : EN_NAMES[(idx * 7 + 1) % EN_NAMES.length];
    const survey = SURVEY_NOS[(idx * 3) % SURVEY_NOS.length];
    const hissa = idx % 4 === 2 ? String(1 + (idx % 5)) : undefined;
    const details = buildDetails(service, idx, survey, hissa, name);
    const deliveryMode = idx % 6 === 2 ? 'PHYSICAL' : idx % 6 === 4 ? 'BOTH' : 'DIGITAL';
    const ownerName = userById.get(owner)!.fullName!;
    const address: ShippingAddress | undefined =
      deliveryMode === 'DIGITAL'
        ? undefined
        : {
            name: ownerName,
            line1: `#${12 + idx}, 3rd Cross, Temple Road`,
            city: loc.talukEn,
            district: loc.districtEn,
            pincode: loc.pincode ?? '560001',
          };
    const id = `seed-req-${String(num).padStart(4, '0')}`;
    const requestNumber = formatRequestNumber(service, year, num);
    const path = PATHS[st];
    const stepAt = (k: number) => new Date(createdMs + (age * HOUR * k) / (path.length + 1)).toISOString();
    const operator = ops[idx % 2];
    const runner = runnerFor(loc);

    // Timeline
    timeline.push({ id: `seed-tl-${id}-0`, requestId: id, fromStatus: null, toStatus: 'SUBMITTED', note: 'Request submitted', actorId: owner, createdAt: created });
    let prev: OrderStatus = 'SUBMITTED';
    path.forEach((to, k) => {
      const note =
        to === 'ASSIGNED_TO_RUNNER'
          ? `Assigned to ${runner}`
          : to === 'RECORD_UNAVAILABLE'
            ? 'Not found in taluk record room; endorsement certificate attached'
            : to === 'CANCELLED'
              ? 'Cancelled at the citizen\'s request'
              : to === 'CUSTOMER_RESPONDED'
                ? 'Customer replied'
                : undefined;
      timeline.push({
        id: `seed-tl-${id}-${k + 1}`,
        requestId: id,
        fromStatus: prev,
        toStatus: to,
        note,
        actorId: to === 'CUSTOMER_RESPONDED' ? owner : operator,
        createdAt: stepAt(k + 1),
      });
      prev = to;
    });
    const stepIndex = (s: OrderStatus) => path.indexOf(s) + 1;
    const lastAt = path.length ? stepAt(path.length) : created;

    const beyondReview = path.length > 0;
    requests.push({
      id,
      requestNumber,
      userId: owner,
      serviceType: service,
      status: st,
      locationId: loc.id,
      surveyNo: details.surveyNo,
      hissaNo: details.hissaNo,
      periodOrYear: periodLabel(details),
      serviceMetadata: toServiceMetadata(details),
      matterTag,
      deliveryMode,
      shippingAddress: address,
      consignmentNo: st === 'DELIVERED' && deliveryMode !== 'DIGITAL' ? `EK${String(123456789 + idx).padStart(9, '0')}IN` : undefined,
      runnerName: stepIndex('ASSIGNED_TO_RUNNER') > 0 ? runner : undefined,
      assignedOpId: beyondReview ? operator : undefined,
      createdAt: created,
      updatedAt: lastAt,
    });

    // Messages
    const msg = (m: Partial<RequestMessage> & { direction: RequestMessage['direction']; createdAt: string }) =>
      messages.push({ id: `seed-msg-${nextSeq()}`, requestId: id, ...m });
    if (st === 'ACTION_REQUIRED' || st === 'CUSTOMER_RESPONDED') {
      const tk = st === 'CUSTOMER_RESPONDED' ? AR_TEMPLATES[2] : AR_TEMPLATES[idx % 3];
      msg({ direction: 'OUTBOUND', templateKey: tk, senderId: operator, createdAt: stepAt(stepIndex('ACTION_REQUIRED')) });
    }
    if (st === 'CUSTOMER_RESPONDED') {
      msg({ direction: 'INBOUND', body: useKn ? KN_REPLIES[idx % KN_REPLIES.length] : EN_REPLIES[idx % EN_REPLIES.length], senderId: owner, createdAt: lastAt });
    }
    if (st === 'ARCHIVE_SEARCH_IN_PROGRESS' && idx % 2 === 1) {
      msg({ direction: 'OUTBOUND', templateKey: 'RECORD_BRITTLE_SEARCH_ONGOING', senderId: operator, createdAt: lastAt });
    }

    // Notes
    if (beyondReview && idx % 2 === 0) {
      notes.push({ id: `seed-note-${nextSeq()}`, requestId: id, body: OP_NOTES[idx % OP_NOTES.length], authorId: operator, createdAt: stepAt(1) });
    }

    // Documents
    const where = `${loc.villageEn}, ${loc.talukEn} / Sy.No ${details.surveyNo ?? '-'}`;
    if (idx % 4 === 0) {
      addDoc(id, 'CUSTOMER_REFERENCE', 'old-document-photo.pdf', await samplePage('Customer reference upload', [where, requestNumber]), created, owner);
    }
    if (st === 'DOCUMENT_RETRIEVED' || st === 'QC_WATERMARK_MERGE') {
      addDoc(id, 'OPERATOR_SCAN', 'scan-1.pdf', await samplePage(`Scan - ${requestNumber}`, [where, `Village: ${loc.villageEn}`]), stepAt(stepIndex('DOCUMENT_RETRIEVED')), operator);
    }
    if (st === 'RECORD_UNAVAILABLE') {
      addDoc(id, 'ENDORSEMENT_CERTIFICATE', 'endorsement.pdf', await samplePage('Endorsement: record not available', [where, 'Searched volumes 1965-1990']), lastAt, operator);
    }
    if (st === 'DELIVERED') {
      const retrievedAt = stepAt(stepIndex('DOCUMENT_RETRIEVED'));
      const scans: Uint8Array[] = [];
      for (let p = 1; p <= 2; p++) {
        const bytes = await samplePage(`Scan page ${p} - ${requestNumber}`, [where, `Village: ${loc.villageEn}`, `Page ${p} of 2`]);
        scans.push(bytes);
        addDoc(id, 'OPERATOR_SCAN', `scan-${p}.pdf`, bytes, retrievedAt, operator);
      }
      const final = await buildDeliverable(
        scans.map((bytes) => ({ bytes, mimeType: 'application/pdf' })),
        { requestNumber, date: new Date(lastAt) },
      );
      addDoc(id, 'FINAL_DELIVERABLE', `${requestNumber}.pdf`, final, lastAt, operator);
    }
  }

  const byId = (a: { createdAt: string }, b: { createdAt: string }) => a.createdAt.localeCompare(b.createdAt);
  timeline.sort(byId);
  messages.sort(byId);
  return { locations, users, requests, timeline, documents, messages, notes, blobs, counters };
}
