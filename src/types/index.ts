import { ObjectId } from 'mongodb';

export type EntityType = 'serial' | 'batch' | 'kit';

export type ProductStatus = 'active' | 'inactive';

export interface Product {
  _id?: ObjectId | string;
  itemNumber: number;
  name: string;
  partCode: string;
  category: string;
  unit: string;
  hsn: string | null;
  gst: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BatchStatus = 'open' | 'closed';

export interface Batch {
  _id?: ObjectId | string;
  code: string; // e.g. BAT-A00001
  baseCode: string; // e.g. A00001
  status: BatchStatus;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export type KitStatus = 'open' | 'closed';

export interface Kit {
  _id?: ObjectId | string;
  code: string; // e.g. KIT-A00001
  status: KitStatus;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export type InventoryItemStatus = 'in_batch' | 'in_kit' | 'dispatched' | 'scrapped';

export interface InventoryItem {
  _id?: ObjectId | string;
  serialCode: string; // e.g. A00001 (MUST BE UNIQUE)
  productId: string;
  productName: string;
  partCode: string;
  category?: string;
  batchId: string;
  batchCode: string; // e.g. BAT-A00001
  kitId: string | null;
  kitCode: string | null; // e.g. KIT-A00001
  status: InventoryItemStatus;
  createdAt: string;
  updatedAt: string;
}

export type QRCodeStatus = 'generated' | 'registered' | 'used';

export interface QRCodeRecord {
  _id?: ObjectId | string;
  code: string; // Unique
  type: EntityType; // 'serial' | 'batch' | 'kit'
  status: QRCodeStatus;
  used: boolean;
  entityId?: string | null;
  productId?: string | null;
  productName?: string | null;
  createdAt: string;
  usedAt?: string | null;
}

export interface SequenceCounter {
  _id: EntityType | 'unified';
  globalIndex: number;
  updatedAt?: string;
}

export type AuditAction =
  | 'QR_GENERATED'
  | 'BATCH_CREATED'
  | 'PRODUCT_REGISTERED'
  | 'PRODUCT_ADDED_TO_BATCH'
  | 'PRODUCT_ADDED_TO_KIT'
  | 'DUPLICATE_SCAN'
  | 'INVALID_QR_SCAN'
  | 'KIT_ASSIGNMENT_REJECTED'
  | 'BATCH_CLOSED'
  | 'KIT_CLOSED'
  | 'PRODUCT_CREATED'
  | 'PRODUCT_UPDATED';

export interface AuditLog {
  _id?: ObjectId | string;
  action: AuditAction;
  code: string;
  entityType: EntityType | 'system' | 'product';
  entityId?: string | null;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface DashboardStats {
  totalProducts: number;
  totalBatches: number;
  totalKits: number;
  todayScans: number;
  unassignedProducts: number;
  productsInKits: number;
  recentActivity: AuditLog[];
}
