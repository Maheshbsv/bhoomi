import type { CreateRequestInput } from '@/domain/schemas';
import type { TemplateKey } from '@/domain/templates';
import type {
  DocType,
  InternalNote,
  Location,
  OrderStatus,
  RequestDocument,
  RequestMessage,
  Role,
  ServiceRequest,
  ServiceType,
  TimelineEntry,
  User,
} from '@/domain/types';

/** Error thrown by every DataStore implementation. The UI maps `errors.<code>` to a message. */
export class StoreError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = 'StoreError';
    this.code = code;
  }
}

export interface RequestDetail {
  request: ServiceRequest;
  location: Location;
  user: User;
  timeline: TimelineEntry[];
  documents: RequestDocument[];
  messages: RequestMessage[];
  notes: InternalNote[];
}

export interface RequestFilter {
  districtEn?: string;
  talukEn?: string;
  serviceType?: ServiceType;
  status?: OrderStatus;
  sla?: 'green' | 'orange' | 'red';
  q?: string;
  userId?: string;
  matterTag?: string;
}

export interface DataStore {
  listLocations(): Promise<Location[]>;
  listUsers(): Promise<User[]>;
  findOrCreateUserByPhone(phone10: string, role?: Role): Promise<User>;
  /** Newest first. */
  listRequests(filter?: RequestFilter, now?: Date): Promise<ServiceRequest[]>;
  /** Accepts an id, or a request number in any case/whitespace. */
  getRequest(idOrNumber: string): Promise<RequestDetail | null>;
  createRequests(inputs: CreateRequestInput[], userId: string, files?: File[][]): Promise<ServiceRequest[]>;
  transition(
    id: string,
    to: OrderStatus,
    opts: { actorId: string; note?: string; runnerName?: string; consignmentNo?: string },
  ): Promise<ServiceRequest>;
  sendMessage(id: string, msg: { templateKey?: TemplateKey; body?: string }, actorId: string): Promise<RequestMessage>;
  receiveCustomerReply(id: string, reply: { body?: string; file?: File }): Promise<RequestMessage>;
  addNote(id: string, body: string, authorId: string): Promise<InternalNote>;
  addDocument(
    id: string,
    blob: Blob,
    meta: { fileType: DocType; fileName: string; uploadedById?: string },
  ): Promise<RequestDocument>;
  getBlob(storageKey: string): Promise<Blob | null>;
  /** Wipe and reseed. */
  reset(): Promise<void>;
  /** False when using the in-memory fallback. */
  readonly persistent: boolean;
}
