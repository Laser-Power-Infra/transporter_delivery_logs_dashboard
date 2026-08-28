export type Role = 'ADMIN' | 'OPERATOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface SheetRow {
  diNo?: string;
  invoiceNo: string;
  date?: string;
  buyerName?: string;
  transporterName?: string;
  truckNumber?: string;
  driverContactNo?: string;
  lrNo?: string;
  freightOrder?: string;
  toPlaceName?: string;
  address?: string;
  itemName?: string;
  drumQty?: string;
  deliveryStatus?: string;
  remarks?: string;
  deliveryRemarks?: string;
  vehicleReachedDate?: string;
  deliveryDate?: string;
}

export interface MismatchDetail {
  field: keyof SheetRow;
  sheetValue: string;
  dbValue: string;
}

export interface Delivery {
  id: string;
  diNo?: string | null;
  invoiceNo: string;
  date?: string | null;
  buyerName?: string | null;
  transporterName?: string | null;
  truckNumber?: string | null;
  driverContactNo?: string | null;
  lrNo?: string | null;
  freightOrder?: string | null;
  toPlaceName?: string | null;
  address?: string | null;
  itemName?: string | null;
  drumQty?: string | null;
  deliveryStatus?: string | null;
  remarks?: string | null;
  deliveryRemarks?: string | null;
  vehicleReachedDate?: string | null;
  deliveryDate?: string | null;
  hasMismatch: boolean;
  mismatchDetails?: string | null;
  lastSyncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  deliveryId?: string | null;
  invoiceNo: string;
  fieldName: string;
  oldValue?: string | null;
  newValue?: string | null;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  timestamp: string;
}

export interface SyncStats {
  totalSheetRows: number;
  newInserted: number;
  updatedCount: number;
  nullIgnoredCount: number;
  mismatchesCount: number;
  details: string[];
}

export interface StatusCount {
  status: string;
  count: number;
}
