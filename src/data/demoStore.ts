import { clear, createStore, del, get, set, setMany, type UseStore } from 'idb-keyval';
import {
  StoreError,
  type DataStore,
  type RequestDetail,
  type RequestFilter,
} from './DataStore';
import { buildSeed, type SeedData } from './seed';
import { CreateRequestSchema } from '@/domain/schemas';
import { periodLabel, toServiceMetadata } from '@/domain/schemas';
import { formatRequestNumber, normalizeRequestNumber } from '@/domain/requestNumber';
import { canTransition, isTerminal } from '@/domain/status';
import { slaColor, slaHours } from '@/domain/sla';
import { CLARIFICATION_TEMPLATES } from '@/domain/templates';
import type {
  InternalNote,
  Location,
  OrderStatus,
  RequestDocument,
  RequestMessage,
  ServiceRequest,
  TimelineEntry,
  User,
} from '@/domain/types';

/** Minimal async key-value API shared by the IndexedDB and in-memory backends. */
interface KV {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  setMany(entries: [string, unknown][]): Promise<void>;
  del(key: string): Promise<void>;
  clear(): Promise<void>;
}

function idbKv(store: UseStore): KV {
  return {
    get: <T,>(k: string) => get<T>(k, store),
    set: (k, v) => set(k, v, store),
    setMany: (e) => setMany(e, store),
    del: (k) => del(k, store),
    clear: () => clear(store),
  };
}

function memoryKv(): KV {
  const m = new Map<string, unknown>();
  return {
    get: async <T,>(k: string) => m.get(k) as T | undefined,
    set: async (k, v) => void m.set(k, v),
    setMany: async (e) => void e.forEach(([k, v]) => m.set(k, v)),
    del: async (k) => void m.delete(k),
    clear: async () => m.clear(),
  };
}

const SEEDED_KEY = 'seeded:v1';

async function openKv(): Promise<{ kv: KV; persistent: boolean }> {
  try {
    if (typeof indexedDB === 'undefined') throw new Error('indexedDB unavailable');
    const kv = idbKv(createStore('hale-dakhale', 'kv'));
    await kv.get(SEEDED_KEY); // surfaces an async open() failure
    return { kv, persistent: true };
  } catch {
    return { kv: memoryKv(), persistent: false };
  }
}

const nowIso = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();
const NEEDS_REPLY_FROM: OrderStatus[] = ['UNDER_REVIEW', 'CUSTOMER_RESPONDED', 'ARCHIVE_SEARCH_IN_PROGRESS'];

export async function createDemoStore(opts: { now?: Date } = {}): Promise<DataStore> {
  const { kv, persistent } = await openKv();

  const load = async <T,>(name: string): Promise<T[]> => (await kv.get<T[]>(name)) ?? [];

  async function writeSeed(seed: SeedData): Promise<void> {
    const entries: [string, unknown][] = [
      ['locations', seed.locations],
      ['users', seed.users],
      ['requests', seed.requests],
      ['timeline', seed.timeline],
      ['documents', seed.documents],
      ['messages', seed.messages],
      ['notes', seed.notes],
      ...Object.entries(seed.counters),
      ...Object.entries(seed.blobs),
    ];
    await kv.setMany(entries);
    await kv.set(SEEDED_KEY, true);
  }

  async function ensureSeeded(): Promise<void> {
    if (await kv.get(SEEDED_KEY)) return;
    await writeSeed(await buildSeed(opts.now ?? new Date()));
  }
  await ensureSeeded();

  async function findRequest(id: string): Promise<{ all: ServiceRequest[]; req: ServiceRequest }> {
    const all = await load<ServiceRequest>('requests');
    const req = all.find((r) => r.id === id);
    if (!req) throw new StoreError('NOT_FOUND', `Request ${id} not found`);
    return { all, req };
  }

  async function saveRequest(all: ServiceRequest[], req: ServiceRequest): Promise<void> {
    await kv.set('requests', all.map((r) => (r.id === req.id ? req : r)));
  }

  async function pushTo<T>(name: string, item: T): Promise<void> {
    const list = await load<T>(name);
    list.push(item);
    await kv.set(name, list);
  }

  async function logTransition(
    req: ServiceRequest,
    from: OrderStatus,
    to: OrderStatus,
    actorId: string | undefined,
    note?: string,
  ): Promise<void> {
    const at = nowIso();
    const entry: TimelineEntry = { id: uuid(), requestId: req.id, fromStatus: from, toStatus: to, note, actorId, createdAt: at };
    await pushTo('timeline', entry);
    req.status = to;
    req.updatedAt = at;
  }

  async function putBlob(blob: Blob): Promise<string> {
    const key = `blob:${uuid()}`;
    await kv.set(key, blob);
    return key;
  }

  async function newDoc(
    requestId: string,
    blob: Blob,
    meta: { fileType: RequestDocument['fileType']; fileName: string; uploadedById?: string },
  ): Promise<RequestDocument> {
    const doc: RequestDocument = {
      id: uuid(),
      requestId,
      fileType: meta.fileType,
      storageKey: await putBlob(blob),
      fileName: meta.fileName,
      fileSizeBytes: blob.size,
      mimeType: blob.type,
      uploadedById: meta.uploadedById,
      createdAt: nowIso(),
    };
    await pushTo('documents', doc);
    return doc;
  }

  function matchesQuery(r: ServiceRequest, q: string): boolean {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    const hay = [r.requestNumber, r.surveyNo, r.hissaNo, ...Object.values(r.serviceMetadata)].filter(
      (v): v is string => typeof v === 'string',
    );
    return hay.some((v) => v.toLowerCase().includes(needle));
  }

  const store: DataStore = {
    persistent,

    listLocations: () => load<Location>('locations'),
    listUsers: () => load<User>('users'),

    async findOrCreateUserByPhone(phone10, role = 'CITIZEN') {
      const phoneNumber = `+91${phone10}`;
      const users = await load<User>('users');
      const found = users.find((u) => u.phoneNumber === phoneNumber);
      if (found) return found;
      const user: User = { id: uuid(), phoneNumber, role, createdAt: nowIso() };
      users.push(user);
      await kv.set('users', users);
      return user;
    },

    async listRequests(filter: RequestFilter = {}, now = new Date()) {
      let list = await load<ServiceRequest>('requests');
      if (filter.districtEn || filter.talukEn) {
        const locs = new Map((await load<Location>('locations')).map((l) => [l.id, l]));
        list = list.filter((r) => {
          const l = locs.get(r.locationId);
          return !!l && (!filter.districtEn || l.districtEn === filter.districtEn) && (!filter.talukEn || l.talukEn === filter.talukEn);
        });
      }
      if (filter.serviceType) list = list.filter((r) => r.serviceType === filter.serviceType);
      if (filter.status) list = list.filter((r) => r.status === filter.status);
      if (filter.userId) list = list.filter((r) => r.userId === filter.userId);
      if (filter.matterTag) list = list.filter((r) => r.matterTag === filter.matterTag);
      if (filter.q) list = list.filter((r) => matchesQuery(r, filter.q!));
      if (filter.sla) {
        const tl = await load<TimelineEntry>('timeline');
        const by = new Map<string, TimelineEntry[]>();
        for (const e of tl) (by.get(e.requestId) ?? by.set(e.requestId, []).get(e.requestId)!).push(e);
        list = list.filter(
          (r) => !isTerminal(r.status) && slaColor(slaHours(r.createdAt, by.get(r.id) ?? [], now)) === filter.sla,
        );
      }
      return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.requestNumber.localeCompare(a.requestNumber));
    },

    async getRequest(idOrNumber): Promise<RequestDetail | null> {
      const requests = await load<ServiceRequest>('requests');
      const number = normalizeRequestNumber(idOrNumber);
      const request = requests.find((r) => r.id === idOrNumber) ?? (number ? requests.find((r) => r.requestNumber === number) : undefined);
      if (!request) return null;
      const [locations, users, timeline, documents, messages, notes] = await Promise.all([
        load<Location>('locations'),
        load<User>('users'),
        load<TimelineEntry>('timeline'),
        load<RequestDocument>('documents'),
        load<RequestMessage>('messages'),
        load<InternalNote>('notes'),
      ]);
      const mine = <T extends { requestId: string; createdAt: string }>(xs: T[]) =>
        xs.filter((x) => x.requestId === request.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return {
        request,
        location: locations.find((l) => l.id === request.locationId)!,
        user: users.find((u) => u.id === request.userId)!,
        timeline: mine(timeline),
        documents: mine(documents),
        messages: mine(messages),
        notes: mine(notes),
      };
    },

    async createRequests(inputs, userId, files) {
      const users = await load<User>('users');
      if (!users.some((u) => u.id === userId)) throw new StoreError('UNKNOWN_USER', `User ${userId} not found`);
      const locations = await load<Location>('locations');
      const parsed = inputs.map((input) => {
        const r = CreateRequestSchema.safeParse(input);
        if (!r.success) throw new StoreError('VALIDATION', r.error.issues.map((i) => i.message).join('; '));
        if (!locations.some((l) => l.id === r.data.villageId)) throw new StoreError('UNKNOWN_LOCATION', `Unknown village ${r.data.villageId}`);
        return r.data;
      });

      const requests = await load<ServiceRequest>('requests');
      const created: ServiceRequest[] = [];
      const year = new Date().getFullYear();
      const ckey = `counter:${year}`;
      let counter = (await kv.get<number>(ckey)) ?? 1000;

      for (let i = 0; i < parsed.length; i++) {
        const p = parsed[i];
        const at = nowIso();
        counter += 1;
        const req: ServiceRequest = {
          id: uuid(),
          requestNumber: formatRequestNumber(p.details.serviceType, year, counter),
          userId,
          serviceType: p.details.serviceType,
          status: 'SUBMITTED',
          locationId: p.villageId,
          surveyNo: p.details.surveyNo,
          hissaNo: p.details.hissaNo,
          periodOrYear: periodLabel(p.details),
          serviceMetadata: toServiceMetadata(p.details),
          matterTag: p.matterTag,
          batchId: p.batchId,
          deliveryMode: p.delivery.mode,
          shippingAddress: p.delivery.address,
          createdAt: at,
          updatedAt: at,
        };
        created.push(req);
        await pushTo<TimelineEntry>('timeline', {
          id: uuid(),
          requestId: req.id,
          fromStatus: null,
          toStatus: 'SUBMITTED',
          note: 'Request submitted',
          actorId: userId,
          createdAt: at,
        });
        for (const f of files?.[i] ?? []) {
          await newDoc(req.id, f, { fileType: 'CUSTOMER_REFERENCE', fileName: f.name, uploadedById: userId });
        }
      }
      await kv.set('requests', [...requests, ...created]);
      await kv.set(ckey, counter);
      return created;
    },

    async transition(id, to, opts) {
      const { all, req } = await findRequest(id);
      const from = req.status;
      if (!canTransition(from, to)) throw new StoreError('ILLEGAL_TRANSITION', `${from} -> ${to} is not allowed`);
      const runnerName = opts.runnerName?.trim() || req.runnerName;
      if (to === 'ASSIGNED_TO_RUNNER' && !runnerName) throw new StoreError('RUNNER_REQUIRED');
      const docs = to === 'RECORD_UNAVAILABLE' || to === 'DELIVERED' ? (await load<RequestDocument>('documents')).filter((d) => d.requestId === id) : [];
      if (to === 'RECORD_UNAVAILABLE' && !docs.some((d) => d.fileType === 'ENDORSEMENT_CERTIFICATE')) {
        throw new StoreError('ENDORSEMENT_REQUIRED');
      }
      const consignmentNo = opts.consignmentNo?.trim() || req.consignmentNo;
      if (to === 'DELIVERED') {
        if (!docs.some((d) => d.fileType === 'FINAL_DELIVERABLE')) throw new StoreError('DELIVERABLE_REQUIRED');
        if (req.deliveryMode !== 'DIGITAL' && !consignmentNo) throw new StoreError('CONSIGNMENT_REQUIRED');
      }
      if (to === 'ASSIGNED_TO_RUNNER') {
        req.runnerName = runnerName;
        req.assignedOpId = opts.actorId;
      }
      if (to === 'DELIVERED' && consignmentNo) req.consignmentNo = consignmentNo;
      await logTransition(req, from, to, opts.actorId, opts.note);
      await saveRequest(all, req);
      return req;
    },

    async sendMessage(id, msg, actorId) {
      const { all, req } = await findRequest(id);
      const tpl = msg.templateKey ? CLARIFICATION_TEMPLATES.find((t) => t.key === msg.templateKey) : undefined;
      if (msg.templateKey && !tpl) throw new StoreError('VALIDATION', `Unknown template ${msg.templateKey}`);
      if (!tpl && !msg.body?.trim()) throw new StoreError('VALIDATION', 'Message needs a template or body');
      const message: RequestMessage = {
        id: uuid(),
        requestId: id,
        direction: 'OUTBOUND',
        templateKey: msg.templateKey,
        body: msg.body,
        senderId: actorId,
        createdAt: nowIso(),
      };
      await pushTo('messages', message);
      if (tpl?.needsReply && NEEDS_REPLY_FROM.includes(req.status)) {
        await logTransition(req, req.status, 'ACTION_REQUIRED', actorId, tpl.key);
        await saveRequest(all, req);
      }
      return message;
    },

    async receiveCustomerReply(id, reply) {
      const { all, req } = await findRequest(id);
      if (!reply.body?.trim() && !reply.file) throw new StoreError('VALIDATION', 'Reply needs text or a file');
      let mediaKey: string | undefined;
      if (reply.file) {
        const doc = await newDoc(id, reply.file, { fileType: 'CUSTOMER_REFERENCE', fileName: reply.file.name, uploadedById: req.userId });
        mediaKey = doc.storageKey;
      }
      const message: RequestMessage = {
        id: uuid(),
        requestId: id,
        direction: 'INBOUND',
        body: reply.body,
        mediaKey,
        senderId: req.userId,
        createdAt: nowIso(),
      };
      await pushTo('messages', message);
      if (req.status === 'ACTION_REQUIRED') {
        await logTransition(req, 'ACTION_REQUIRED', 'CUSTOMER_RESPONDED', req.userId, 'Customer replied');
        await saveRequest(all, req);
      }
      return message;
    },

    async addNote(id, body, authorId) {
      await findRequest(id);
      const note: InternalNote = { id: uuid(), requestId: id, body, authorId, createdAt: nowIso() };
      await pushTo('notes', note);
      return note;
    },

    async addDocument(id, blob, meta) {
      await findRequest(id);
      return newDoc(id, blob, meta);
    },

    async getBlob(storageKey) {
      return (await kv.get<Blob>(storageKey)) ?? null;
    },

    async reset() {
      await kv.clear();
      await ensureSeeded();
    },
  };
  return store;
}
