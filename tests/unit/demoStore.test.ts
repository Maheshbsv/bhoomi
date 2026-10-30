import 'fake-indexeddb/auto';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createDemoStore } from '@/data/demoStore';
import { StoreError, type DataStore } from '@/data/DataStore';
import type { Location, ServiceRequest, User } from '@/domain/types';
import type { CreateRequestInput } from '@/domain/schemas';
import { canTransition, isTerminal } from '@/domain/status';
import { slaColor, slaHours } from '@/domain/sla';
import { SERVICE_CATALOG } from '@/domain/services';

const now = new Date('2026-10-28T10:00:00+05:30');
const YEAR = new Date().getFullYear();

let s: DataStore;
let locs: Location[];
let users: User[];
let bagalurId: number;
let uid: string;
let op: string;

const inputRtc = (): CreateRequestInput => ({
  details: { serviceType: 'OLD_RTC', surveyNo: '12', yearFrom: 1970, yearTo: 1980 },
  villageId: bagalurId,
  delivery: { mode: 'DIGITAL' },
  phone: '9876543210',
});

beforeAll(async () => {
  s = await createDemoStore({ now });
  locs = await s.listLocations();
  users = await s.listUsers();
  bagalurId = locs.find((l) => l.villageEn === 'Bagalur')!.id;
  uid = users.find((u) => u.phoneNumber === '+919876543210')!.id;
  op = users.find((u) => u.role === 'OPERATOR')!.id;
});

beforeEach(async () => {
  await s.reset();
});

describe('seed', () => {
  it('has 30 requests, 4 districts x 2 taluks, demo users', async () => {
    expect((await s.listRequests()).length).toBe(30);
    expect(new Set(locs.map((l) => l.districtEn)).size).toBe(4);
    expect(new Set(locs.map((l) => `${l.districtEn}/${l.talukEn}`)).size).toBe(8);
    expect(users.map((u) => u.fullName)).toEqual(
      expect.arrayContaining(['Ramesh Gowda', 'Lakshmamma', 'Syed Imran', 'Adv. Kavya Rao', 'Operator Suma', 'Operator Prakash']),
    );
    expect(locs.some((l) => l.hobliEn === 'Jala' && l.villageEn === 'Bagalur' && l.talukEn === 'Yelahanka')).toBe(true);
    expect(locs.some((l) => l.hobliEn === 'Kasaba' && l.villageEn === 'Devanahalli' && l.talukEn === 'Devanahalli')).toBe(true);
  });

  it('covers every status twice and every service 4 times, newest first', async () => {
    const all = await s.listRequests();
    for (const st of ['SUBMITTED','UNDER_REVIEW','ACTION_REQUIRED','CUSTOMER_RESPONDED','ASSIGNED_TO_RUNNER','ARCHIVE_SEARCH_IN_PROGRESS','DOCUMENT_RETRIEVED','QC_WATERMARK_MERGE','RECORD_UNAVAILABLE','DELIVERED','CANCELLED'] as const) {
      expect(all.filter((r) => r.status === st).length, st).toBeGreaterThanOrEqual(2);
    }
    for (const sv of Object.keys(SERVICE_CATALOG)) {
      expect(all.filter((r) => r.serviceType === sv).length, sv).toBeGreaterThanOrEqual(4);
    }
    for (let i = 1; i < all.length; i++) expect(all[i - 1].createdAt >= all[i].createdAt).toBe(true);
  });

  it('has >=5 non-terminal requests per SLA colour', async () => {
    for (const c of ['green', 'orange', 'red'] as const) {
      const list = await s.listRequests({ sla: c }, now);
      expect(list.length, c).toBeGreaterThanOrEqual(5);
      expect(list.every((r) => !isTerminal(r.status))).toBe(true);
    }
  });

  it('timelines satisfy canTransition and end at the request status', async () => {
    for (const r of await s.listRequests()) {
      const d = (await s.getRequest(r.id))!;
      const tl = [...d.timeline].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      expect(tl[0].fromStatus).toBeNull();
      expect(tl[0].toStatus).toBe('SUBMITTED');
      for (let i = 1; i < tl.length; i++) {
        expect(tl[i].fromStatus).toBe(tl[i - 1].toStatus);
        expect(canTransition(tl[i].fromStatus!, tl[i].toStatus), r.requestNumber).toBe(true);
      }
      expect(tl[tl.length - 1].toStatus).toBe(r.status);
    }
  });

  it('delivered requests have deliverables; physical delivered have consignment numbers', async () => {
    const delivered = await s.listRequests({ status: 'DELIVERED' });
    expect(delivered.length).toBeGreaterThanOrEqual(2);
    for (const r of delivered) {
      const d = (await s.getRequest(r.id))!;
      const fin = d.documents.find((x) => x.fileType === 'FINAL_DELIVERABLE')!;
      expect(fin).toBeTruthy();
      const blob = await s.getBlob(fin.storageKey);
      expect(blob).not.toBeNull();
      expect(blob!.size).toBeGreaterThan(500);
      if (r.deliveryMode !== 'DIGITAL') expect(r.consignmentNo).toMatch(/^EK\d{9}IN$/);
    }
    expect(delivered.some((r) => r.deliveryMode !== 'DIGITAL')).toBe(true);
  });

  it('uses only the demo citizen number and obviously fake numbers', async () => {
    for (const u of users) {
      expect(u.phoneNumber === '+919876543210' || /^\+91900000000\d$/.test(u.phoneNumber), u.phoneNumber).toBe(true);
    }
  });

  it('gives the advocate a vault worth showing: 4-6 documents over matters, taluks and services', async () => {
    const adv = users.find((u) => u.role === 'ADVOCATE')!;
    const mine = await s.listRequests({ userId: adv.id });
    expect(mine.filter((r) => r.status === 'DELIVERED').length).toBeGreaterThanOrEqual(2);
    for (const matter of new Set(mine.map((r) => r.matterTag))) {
      expect(mine.filter((r) => r.matterTag === matter && r.status === 'DELIVERED').length, String(matter)).toBeGreaterThanOrEqual(1);
    }
    const docs: { type: string; matter?: string; taluk: string; service: string }[] = [];
    for (const r of mine.filter((x) => x.status === 'DELIVERED' || x.status === 'RECORD_UNAVAILABLE')) {
      const d = (await s.getRequest(r.id))!;
      for (const doc of d.documents.filter((x) => x.fileType === 'FINAL_DELIVERABLE' || x.fileType === 'ENDORSEMENT_CERTIFICATE')) {
        docs.push({ type: doc.fileType, matter: r.matterTag, taluk: d.location.talukEn, service: r.serviceType });
      }
    }
    expect(docs.length).toBeGreaterThanOrEqual(4);
    expect(docs.length).toBeLessThanOrEqual(6);
    expect(new Set(docs.map((x) => x.type))).toEqual(new Set(['FINAL_DELIVERABLE', 'ENDORSEMENT_CERTIFICATE']));
    expect(new Set(docs.map((x) => x.matter)).size).toBeGreaterThanOrEqual(2);
    expect(new Set(docs.map((x) => x.taluk)).size).toBeGreaterThanOrEqual(2);
    expect(new Set(docs.map((x) => x.service)).size).toBeGreaterThanOrEqual(2);
  });

  it("keeps the demo citizen's delivered request", async () => {
    const delivered = await s.listRequests({ userId: uid, status: 'DELIVERED' });
    expect(delivered.length).toBeGreaterThanOrEqual(1);
  });

  it('has Kannada-named requests, template messages, inbound replies, notes, advocate matters', async () => {
    const all = await s.listRequests();
    const kn = all.filter((r) => Object.values(r.serviceMetadata).some((v) => typeof v === 'string' && /[ಀ-೿]/.test(v)));
    expect(kn.length).toBeGreaterThanOrEqual(3);
    const details = await Promise.all(all.map((r) => s.getRequest(r.id)));
    const msgs = details.flatMap((d) => d!.messages);
    expect(msgs.some((m) => m.templateKey && m.direction === 'OUTBOUND')).toBe(true);
    expect(msgs.some((m) => m.direction === 'INBOUND')).toBe(true);
    expect(details.flatMap((d) => d!.notes).length).toBeGreaterThan(0);
    const adv = users.find((u) => u.role === 'ADVOCATE')!;
    const mine = all.filter((r) => r.userId === adv.id);
    expect(new Set(mine.map((r) => r.matterTag))).toEqual(
      new Set(['Devanahalli 15-Acre Title Verification', 'Hoskote Layout Due Diligence']),
    );
    for (const r of mine) {
      const l = locs.find((x) => x.id === r.locationId)!;
      expect(['Devanahalli', 'Hoskote']).toContain(l.talukEn);
    }
  });
});

describe('flow', () => {
  it('creates, round-trips Kannada, enforces transitions and messaging', async () => {
    const [r] = await s.createRequests(
      [{ details: { serviceType: 'LND_FILE', surveyNo: '45', granteeName: 'ಮುನಿಯಪ್ಪ' }, villageId: bagalurId, delivery: { mode: 'DIGITAL' }, phone: '9876543210' }],
      uid,
    );
    expect(r.requestNumber).toMatch(new RegExp(`^KAR-${YEAR}-LND-\\d{4}$`));
    expect(r.status).toBe('SUBMITTED');
    expect((await s.getRequest(r.requestNumber))!.request.serviceMetadata.granteeName).toBe('ಮುನಿಯಪ್ಪ');
    expect((await s.getRequest(r.id))!.timeline).toHaveLength(1);
    await expect(s.transition(r.id, 'DELIVERED', { actorId: op })).rejects.toMatchObject({ code: 'ILLEGAL_TRANSITION' });
    await s.transition(r.id, 'UNDER_REVIEW', { actorId: op });
    await s.sendMessage(r.id, { templateKey: 'MULTIPLE_ENTRIES_NEED_FATHER_NAME' }, op);
    expect((await s.getRequest(r.id))!.request.status).toBe('ACTION_REQUIRED');
    await s.receiveCustomerReply(r.id, { body: 'ತಂದೆ: ಚಿಕ್ಕಣ್ಣ' });
    const d = (await s.getRequest(r.id))!;
    expect(d.request.status).toBe('CUSTOMER_RESPONDED');
    expect(d.messages.find((m) => m.direction === 'INBOUND')!.body).toBe('ತಂದೆ: ಚಿಕ್ಕಣ್ಣ');
    const last = d.timeline[d.timeline.length - 1];
    expect(last.actorId).toBe(uid);
    await expect(s.transition(r.id, 'ASSIGNED_TO_RUNNER', { actorId: op })).rejects.toMatchObject({ code: 'RUNNER_REQUIRED' });
  });

  it('numbers increment per request', async () => {
    const [a, b] = await s.createRequests([inputRtc(), inputRtc()], uid);
    expect(Number(b.requestNumber.slice(-4))).toBe(Number(a.requestNumber.slice(-4)) + 1);
    expect(Number(a.requestNumber.slice(-4))).toBeGreaterThanOrEqual(1001);
  });

  it('continues above seeded numbers', async () => {
    const all = await s.listRequests();
    const seededMax = Math.max(
      ...all.filter((r) => r.requestNumber.includes(`-${YEAR}-`)).map((r) => Number(r.requestNumber.slice(-4))),
      1000,
    );
    const [r] = await s.createRequests([inputRtc()], uid);
    expect(Number(r.requestNumber.slice(-4))).toBe(seededMax + 1);
  });

  it('validates input and village', async () => {
    const bad = { ...inputRtc(), phone: '123' };
    await expect(s.createRequests([bad], uid)).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(s.createRequests([{ ...inputRtc(), villageId: 999999 }], uid)).rejects.toMatchObject({ code: 'UNKNOWN_LOCATION' });
  });

  it('stores reference files as CUSTOMER_REFERENCE documents', async () => {
    const f = new File([new Uint8Array([1, 2, 3])], 'old.pdf', { type: 'application/pdf' });
    const [r] = await s.createRequests([inputRtc()], uid, [[f]]);
    const d = (await s.getRequest(r.id))!;
    expect(d.documents).toHaveLength(1);
    expect(d.documents[0]).toMatchObject({ fileType: 'CUSTOMER_REFERENCE', fileName: 'old.pdf', fileSizeBytes: 3, mimeType: 'application/pdf' });
    expect((await s.getBlob(d.documents[0].storageKey))!.size).toBe(3);
  });

  it('finds by messy request number and Kannada search', async () => {
    const [r] = await s.createRequests([inputRtc()], uid);
    const messy = ` ${r.requestNumber.toLowerCase()} `;
    expect((await s.getRequest(messy))!.request.id).toBe(r.id);
    expect(await s.getRequest('KAR-2026-RTC-9999')).toBeNull();
    expect(await s.getRequest('garbage')).toBeNull();
    const [k] = await s.createRequests(
      [{ details: { serviceType: 'LND_FILE', surveyNo: '7', granteeName: 'ಲಕ್ಷ್ಮಮ್ಮ ಕೋಂ ವೆಂಕಟಪ್ಪ' }, villageId: bagalurId, delivery: { mode: 'DIGITAL' }, phone: '9876543210' }],
      uid,
    );
    const hit = await s.listRequests({ q: 'ವೆಂಕಟ' });
    expect(hit.map((x) => x.id)).toContain(k.id);
    expect((await s.listRequests({ q: r.requestNumber.toLowerCase() })).map((x) => x.id)).toContain(r.id);
  });

  it('finds a seeded Kannada-named request by q', async () => {
    const all = await s.listRequests();
    const knReq = all.find((r) => Object.values(r.serviceMetadata).some((v) => typeof v === 'string' && /[ಀ-೿]/.test(v)))!;
    const kn = Object.values(knReq.serviceMetadata).find((v) => typeof v === 'string' && /[ಀ-೿]/.test(v)) as string;
    expect((await s.listRequests({ q: kn.slice(0, 3) })).map((x) => x.id)).toContain(knReq.id);
  });

  it('informational template does not change status', async () => {
    const [r] = await s.createRequests([inputRtc()], uid);
    await s.transition(r.id, 'UNDER_REVIEW', { actorId: op });
    await s.sendMessage(r.id, { templateKey: 'RECORD_BRITTLE_SEARCH_ONGOING' }, op);
    const d = (await s.getRequest(r.id))!;
    expect(d.request.status).toBe('UNDER_REVIEW');
    expect(d.messages).toHaveLength(1);
  });

  it('enforces endorsement, deliverable and consignment rules', async () => {
    const [r] = await s.createRequests(
      [{ ...inputRtc(), delivery: { mode: 'PHYSICAL', address: { name: 'A B', line1: '1 Main', city: 'Bengaluru', district: 'Bengaluru Urban', pincode: '560064' } } }],
      uid,
    );
    await s.transition(r.id, 'UNDER_REVIEW', { actorId: op });
    await s.transition(r.id, 'ASSIGNED_TO_RUNNER', { actorId: op, runnerName: 'Nagaraj (Yelahanka)' });
    expect((await s.getRequest(r.id))!.request.runnerName).toBe('Nagaraj (Yelahanka)');
    await s.transition(r.id, 'ARCHIVE_SEARCH_IN_PROGRESS', { actorId: op });
    await expect(s.transition(r.id, 'RECORD_UNAVAILABLE', { actorId: op })).rejects.toMatchObject({ code: 'ENDORSEMENT_REQUIRED' });
    await s.transition(r.id, 'DOCUMENT_RETRIEVED', { actorId: op });
    await s.transition(r.id, 'QC_WATERMARK_MERGE', { actorId: op });
    await expect(s.transition(r.id, 'DELIVERED', { actorId: op })).rejects.toMatchObject({ code: 'DELIVERABLE_REQUIRED' });
    await s.addDocument(r.id, new Blob(['%PDF-x'], { type: 'application/pdf' }), { fileType: 'FINAL_DELIVERABLE', fileName: 'final.pdf', uploadedById: op });
    await expect(s.transition(r.id, 'DELIVERED', { actorId: op })).rejects.toMatchObject({ code: 'CONSIGNMENT_REQUIRED' });
    const done = await s.transition(r.id, 'DELIVERED', { actorId: op, consignmentNo: 'EK123456789IN' });
    expect(done.status).toBe('DELIVERED');
    expect(done.consignmentNo).toBe('EK123456789IN');
  });

  it('allows RECORD_UNAVAILABLE with an endorsement certificate', async () => {
    const [r] = await s.createRequests([inputRtc()], uid);
    await s.transition(r.id, 'UNDER_REVIEW', { actorId: op });
    await s.transition(r.id, 'ASSIGNED_TO_RUNNER', { actorId: op, runnerName: 'Ravi (Tumakuru)' });
    await s.transition(r.id, 'ARCHIVE_SEARCH_IN_PROGRESS', { actorId: op });
    await s.addDocument(r.id, new Blob(['x'], { type: 'application/pdf' }), { fileType: 'ENDORSEMENT_CERTIFICATE', fileName: 'e.pdf' });
    expect((await s.transition(r.id, 'RECORD_UNAVAILABLE', { actorId: op, note: 'Not found' })).status).toBe('RECORD_UNAVAILABLE');
  });

  it('adds notes and findOrCreateUserByPhone is idempotent', async () => {
    const [r] = await s.createRequests([inputRtc()], uid);
    const n = await s.addNote(r.id, 'check taluk index', op);
    expect((await s.getRequest(r.id))!.notes.map((x) => x.id)).toContain(n.id);
    const u1 = await s.findOrCreateUserByPhone('9123456780');
    const u2 = await s.findOrCreateUserByPhone('9123456780');
    expect(u1.id).toBe(u2.id);
    expect(u1.phoneNumber).toBe('+919123456780');
    expect(u1.role).toBe('CITIZEN');
    expect((await s.findOrCreateUserByPhone('9876543210')).fullName).toBe('Ramesh Gowda');
  });

  it('filters by owner, matter, location and SLA', async () => {
    const adv = users.find((u) => u.role === 'ADVOCATE')!;
    expect((await s.listRequests({ userId: adv.id })).length).toBeGreaterThan(0);
    const tagged = await s.listRequests({ matterTag: 'Hoskote Layout Due Diligence' });
    expect(tagged.length).toBeGreaterThan(0);
    expect(tagged.every((r) => r.matterTag === 'Hoskote Layout Due Diligence')).toBe(true);
    const yel = await s.listRequests({ districtEn: 'Bengaluru Urban', talukEn: 'Yelahanka' });
    expect(yel.length).toBeGreaterThan(0);
    const red = await s.listRequests({ sla: 'red' }, now);
    expect(red.every((x: ServiceRequest) => x.status !== 'DELIVERED')).toBe(true);
    for (const r of red) {
      const d = (await s.getRequest(r.id))!;
      expect(slaColor(slaHours(r.createdAt, d.timeline, now))).toBe('red');
    }
  });
});

describe('concurrency', () => {
  it('keeps both documents from concurrent addDocument', async () => {
    const [r] = await s.createRequests([inputRtc()], uid);
    const mk = (n: string) => new Blob([n], { type: 'application/pdf' });
    await Promise.all([
      s.addDocument(r.id, mk('a'), { fileType: 'OPERATOR_SCAN', fileName: 'a.pdf' }),
      s.addDocument(r.id, mk('b'), { fileType: 'OPERATOR_SCAN', fileName: 'b.pdf' }),
    ]);
    expect((await s.getRequest(r.id))!.documents).toHaveLength(2);
  });

  it('issues distinct numbers for concurrent createRequests', async () => {
    const [x, y] = await Promise.all([s.createRequests([inputRtc()], uid), s.createRequests([inputRtc()], uid)]);
    expect(x[0].requestNumber).not.toBe(y[0].requestNumber);
    expect((await s.listRequests()).length).toBe(32);
  });

  it('a rejected mutation does not block the next one', async () => {
    const [r] = await s.createRequests([inputRtc()], uid);
    const bad = s.transition(r.id, 'DELIVERED', { actorId: op });
    const good = s.transition(r.id, 'UNDER_REVIEW', { actorId: op });
    await expect(bad).rejects.toMatchObject({ code: 'ILLEGAL_TRANSITION' });
    expect((await good).status).toBe('UNDER_REVIEW');
  });
});

describe('fallback', () => {
  it('can be forced into memory mode', async () => {
    const mem = await createDemoStore({ now, memory: true });
    expect(mem.persistent).toBe(false);
  });

  it('uses an in-memory store when indexedDB is unavailable', async () => {
    const saved = globalThis.indexedDB;
    // @ts-expect-error simulate private browsing
    delete globalThis.indexedDB;
    try {
      const mem = await createDemoStore({ now });
      expect(mem.persistent).toBe(false);
      expect((await mem.listRequests()).length).toBe(30);
      const [r] = await mem.createRequests([inputRtc()], uid);
      expect((await mem.getRequest(r.id))!.request.id).toBe(r.id);
    } finally {
      globalThis.indexedDB = saved;
    }
    expect(s.persistent).toBe(true);
  });

  it('exports StoreError with a code', () => {
    const e = new StoreError('X', 'msg');
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe('X');
  });
});

describe('behaviours fixed in the final round', () => {
  it('an empty userId lists nothing, not everything', async () => {
    expect((await s.listRequests()).length).toBe(30);
    expect(await s.listRequests({ userId: '' })).toEqual([]);
  });

  it('queue search finds the customer account name as well as applicant names', async () => {
    const [r] = await s.createRequests([inputRtc()], uid);
    const hit = await s.listRequests({ q: 'ramesh gow' });
    expect(hit.map((x) => x.id)).toContain(r.id);
    expect(hit.every((x) => x.userId === uid)).toBe(true);
    expect(await s.listRequests({ q: 'no such person' })).toEqual([]);
  });

  it('saving a final during the search walks to QC through the normal transitions, so Deliver is possible', async () => {
    const { statusesAfterSavingFinal, canDeliver } = await import('@/components/admin/workspaceLogic');
    const [r] = await s.createRequests([inputRtc()], uid);
    for (const to of ['UNDER_REVIEW', 'ASSIGNED_TO_RUNNER', 'ARCHIVE_SEARCH_IN_PROGRESS'] as const) {
      await s.transition(r.id, to, { actorId: op, runnerName: 'Nagaraj (Yelahanka)' });
    }
    await s.addDocument(r.id, new Blob(['%PDF-x'], { type: 'application/pdf' }), { fileType: 'FINAL_DELIVERABLE', fileName: 'f.pdf', uploadedById: op });
    for (const to of statusesAfterSavingFinal('ARCHIVE_SEARCH_IN_PROGRESS')) await s.transition(r.id, to, { actorId: op });
    const d = (await s.getRequest(r.id))!;
    expect(d.request.status).toBe('QC_WATERMARK_MERGE');
    expect(d.timeline.slice(-2).map((t) => [t.fromStatus, t.toStatus])).toEqual([
      ['ARCHIVE_SEARCH_IN_PROGRESS', 'DOCUMENT_RETRIEVED'],
      ['DOCUMENT_RETRIEVED', 'QC_WATERMARK_MERGE'],
    ]);
    expect(canDeliver({ status: d.request.status, hasFinal: true })).toBe(true);
    expect((await s.transition(r.id, 'DELIVERED', { actorId: op })).status).toBe('DELIVERED');
  });

  it('a needs-reply template from a status that cannot reach Action required adds the message but no transition', async () => {
    const [r] = await s.createRequests([inputRtc()], uid);
    await s.sendMessage(r.id, { templateKey: 'REQUEST_CLEARER_PHOTO' }, op);
    const d = (await s.getRequest(r.id))!;
    expect(d.request.status).toBe('SUBMITTED');
    expect(d.messages).toHaveLength(1);
  });
});
