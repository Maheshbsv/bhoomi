export type ServiceType = 'OLD_RTC' | 'OLD_MR' | 'LND_FILE' | 'LRF_FILE' | 'RRT_FILE';

export type OrderStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ACTION_REQUIRED'
  | 'CUSTOMER_RESPONDED'
  | 'ASSIGNED_TO_RUNNER'
  | 'ARCHIVE_SEARCH_IN_PROGRESS'
  | 'DOCUMENT_RETRIEVED'
  | 'QC_WATERMARK_MERGE'
  | 'RECORD_UNAVAILABLE'
  | 'DELIVERED'
  | 'CANCELLED';

export type DeliveryMode = 'DIGITAL' | 'PHYSICAL' | 'BOTH';
export type DocType =
  | 'CUSTOMER_REFERENCE'
  | 'OPERATOR_SCAN'
  | 'FINAL_DELIVERABLE'
  | 'ENDORSEMENT_CERTIFICATE';
export type Role = 'CITIZEN' | 'ADVOCATE' | 'OPERATOR' | 'ADMIN';
export type Direction = 'OUTBOUND' | 'INBOUND';

export interface Location {
  id: number;
  districtEn: string;
  districtKn: string;
  talukEn: string;
  talukKn: string;
  hobliEn: string;
  hobliKn: string;
  villageEn: string;
  villageKn: string;
  pincode?: string;
  isActive: boolean;
}

export interface User {
  id: string;
  phoneNumber: string; // E.164
  fullName?: string;
  email?: string;
  role: Role;
  createdAt: string;
}

export interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  district: string;
  pincode: string;
}

export interface ServiceRequest {
  id: string;
  requestNumber: string;
  userId: string;
  serviceType: ServiceType;
  status: OrderStatus;
  locationId: number;
  surveyNo?: string;
  hissaNo?: string;
  periodOrYear?: string;
  serviceMetadata: Record<string, unknown>;
  matterTag?: string;
  batchId?: string;
  deliveryMode: DeliveryMode;
  shippingAddress?: ShippingAddress;
  consignmentNo?: string;
  runnerName?: string;
  assignedOpId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEntry {
  id: string;
  requestId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  note?: string;
  actorId?: string;
  createdAt: string;
}

export interface RequestDocument {
  id: string;
  requestId: string;
  fileType: DocType;
  storageKey: string; // Blob key, never a public URL
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  uploadedById?: string;
  createdAt: string;
}

export interface RequestMessage {
  id: string;
  requestId: string;
  direction: Direction;
  body?: string;
  templateKey?: string;
  mediaKey?: string;
  waMessageId?: string;
  senderId?: string;
  createdAt: string;
}

export interface InternalNote {
  id: string;
  requestId: string;
  body: string;
  authorId: string;
  createdAt: string;
}
