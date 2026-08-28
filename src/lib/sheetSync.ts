import { prisma } from './db';
import { SheetRow, SyncStats, MismatchDetail } from '@/types';
import { invalidateDeliveryCache } from '@/lib/cache';

export const FIELD_LABELS: Record<string, string> = {
  diNo: 'DI NO',
  invoiceNo: 'INVOICE NO',
  date: 'Date',
  buyerName: 'Buyer Name',
  transporterName: 'Transporter Name',
  truckNumber: 'TRUCK NUMBER',
  driverContactNo: 'Driver Contact No',
  lrNo: 'LR. NO',
  freightOrder: 'FREIGHT ORDER',
  toPlaceName: 'To Place Name',
  address: 'Address',
  itemName: 'Item Name',
  drumQty: 'Drum Qty',
  deliveryStatus: 'DELIVERY STATUS',
  remarks: 'Remarks',
  deliveryRemarks: 'DELIVERY REMARKS',
  vehicleReachedDate: 'VEHICLE REACHED DATE',
  deliveryDate: 'DELIVERY DATE',
};

const SYNCABLE_FIELDS: (keyof SheetRow)[] = [
  'diNo',
  'date',
  'buyerName',
  'transporterName',
  'truckNumber',
  'driverContactNo',
  'lrNo',
  'freightOrder',
  'toPlaceName',
  'address',
  'itemName',
  'drumQty',
  'deliveryStatus',
  'remarks',
  'deliveryRemarks',
  'vehicleReachedDate',
  'deliveryDate',
];

const isDatePattern = (s: string) => /^\d{1,2}[-/][A-Za-z0-9]{2,3}[-/]\d{2,4}$|^\d{4}-\d{2}-\d{2}$/.test(s);

/**
 * Robust Field Mapper matching every column (DI NO + Columns B to R) from Google Sheet
 */
export function normalizeSheetRow(rawObj: any, customColumnMapping?: Record<string, string>): SheetRow | null {
  if (!rawObj || typeof rawObj !== 'object') return null;

  const row: any = {};
  const keys = Object.keys(rawObj);

  if (customColumnMapping && Object.keys(customColumnMapping).length > 0) {
    for (const [targetField, csvHeaderOrIdx] of Object.entries(customColumnMapping)) {
      if (rawObj[csvHeaderOrIdx] !== undefined && rawObj[csvHeaderOrIdx] !== null) {
        const val = String(rawObj[csvHeaderOrIdx]).trim();
        if (val && val !== '-') row[targetField] = val;
      }
    }
  } else {
    // Header-based exact matching
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const cleanKey = key.trim().toUpperCase();
      const rawVal = rawObj[key];
      if (rawVal === undefined || rawVal === null) continue;
      const val = String(rawVal).trim();
      if (!val || val === '-') continue;

      if (
        cleanKey.includes('DI NO') ||
        cleanKey.includes('DI_NO') ||
        cleanKey.includes('DI.') ||
        cleanKey === 'DI' ||
        cleanKey.includes('DISPATCH INSTRUCTION') ||
        cleanKey.includes('DESPATCH INSTRUCTION') ||
        cleanKey.includes('DI NUMBER')
      ) {
        row.diNo = val;
      } else if (cleanKey.includes('INVOICE') || cleanKey.includes('INV NO')) row.invoiceNo = val;
      else if (cleanKey === 'DATE' || cleanKey.includes('INV DATE')) row.date = val;
      else if (cleanKey.includes('BUYER') || cleanKey.includes('CUSTOMER') || cleanKey.includes('PARTY')) row.buyerName = val;
      else if (cleanKey.includes('TRANSPORTER') || cleanKey.includes('CARRIER')) row.transporterName = val;
      else if (cleanKey.includes('TRUCK') || cleanKey.includes('VEHICLE')) row.truckNumber = val;
      else if (cleanKey.includes('DRIVER') || cleanKey.includes('CONTACT') || cleanKey.includes('PHONE')) row.driverContactNo = val;
      else if (cleanKey.includes('LR') || cleanKey.includes('DOCKET')) row.lrNo = val;
      else if (cleanKey.includes('FREIGHT') || cleanKey.includes('ORDER')) row.freightOrder = val;
      else if (cleanKey.includes('TO PLACE') || cleanKey.includes('DESTINATION')) row.toPlaceName = val;
      else if (cleanKey.includes('ADDRESS') || cleanKey.includes('LOCATION')) row.address = val;
      else if (cleanKey.includes('ITEM') || cleanKey.includes('MATERIAL')) row.itemName = val;
      else if (cleanKey.includes('DRUM') || cleanKey.includes('QTY')) row.drumQty = val;
      else if (cleanKey.includes('DELIVERY STATUS') || cleanKey.includes('STATUS')) row.deliveryStatus = val;
      else if (cleanKey === 'REMARKS') row.remarks = val;
      else if (cleanKey.includes('DELIVERY REMARKS')) row.deliveryRemarks = val;
      else if (cleanKey.includes('REACHED DATE')) row.vehicleReachedDate = val;
      else if (cleanKey.includes('DELIVERY DATE')) row.deliveryDate = val;
    }
  }

  // Ensure Invoice No or DI No is valid string and not empty or "-"
  if ((!row.invoiceNo || !String(row.invoiceNo).trim() || row.invoiceNo === '-') &&
      (!row.diNo || !String(row.diNo).trim() || row.diNo === '-') &&
      (!row.buyerName || !String(row.buyerName).trim() || row.buyerName === '-')) {
    return null;
  }

  // CLEANUP: If truckNumber contains a date string (e.g. "29-05-2026"), replace with real truck number
  if (row.truckNumber && isDatePattern(row.truckNumber)) {
    const rawTruck = rawObj['TRUCK NUMBER'] || rawObj['TRUCK NO'] || rawObj['VEHICLE NO'];
    if (rawTruck && !isDatePattern(String(rawTruck).trim())) {
      row.truckNumber = String(rawTruck).trim();
    } else {
      row.truckNumber = '';
    }
  }

  // SMART STATUS NORMALIZATION:
  // Rule: If DELIVERY REMARKS (column P) contains "YES" (case-insensitive) → DELIVERED, otherwise → PENDING
  const deliveryRemarks = row.deliveryRemarks ? String(row.deliveryRemarks).trim() : '';
  if (deliveryRemarks.toUpperCase().includes('YES')) {
    row.deliveryStatus = 'DELIVERED';
  } else {
    row.deliveryStatus = 'PENDING';
  }

  return row as SheetRow;
}

/**
 * High-performance batch sheet processor for 16,000+ records.
 * Supports all multi-item rows per invoice without discarding rows.
 */
export async function processSheetSync(
  rows: SheetRow[],
  activeUser: { id: string; name: string; email: string },
  clearCorruptedOldRecords: boolean = false
): Promise<SyncStats> {
  const stats: SyncStats = {
    totalSheetRows: rows.length,
    newInserted: 0,
    updatedCount: 0,
    nullIgnoredCount: 0,
    mismatchesCount: 0,
    details: [],
  };

  if (rows.length === 0) return stats;

  // Drop unique constraint on invoiceNo if present in PostgreSQL
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "Delivery" DROP CONSTRAINT IF EXISTS "Delivery_invoiceNo_key";');
    await prisma.$executeRawUnsafe('DROP INDEX IF EXISTS "Delivery_invoiceNo_key";');
  } catch (e) {
    // Ignore error if constraint already dropped
  }

  if (clearCorruptedOldRecords) {
    try {
      await prisma.auditLog.deleteMany({});
      await prisma.delivery.deleteMany({});
      stats.details.push('Database reset: Purged all old records for clean re-sync');
    } catch (e) {
      console.warn('Failed to reset database:', e);
    }
  }

  const existingCount = await prisma.delivery.count();

  if (existingCount === 0 || clearCorruptedOldRecords) {
    // Ultra-fast Bulk Insert for all sheet rows (16,000+ items)
    const now = new Date();
    const toCreate = rows.map((row, idx) => {
      const data: Record<string, any> = {
        id: `del_${now.getTime()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        invoiceNo: row.invoiceNo || '',
        diNo: row.diNo || '',
        deliveryStatus: row.deliveryStatus || 'PENDING',
        lastSyncedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      SYNCABLE_FIELDS.forEach((field) => {
        const val = row[field];
        if (val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== '-') {
          data[field] = String(val).trim();
        }
      });

      return data;
    });

    const CHUNK_SIZE = 2000;
    for (let i = 0; i < toCreate.length; i += CHUNK_SIZE) {
      const chunk = toCreate.slice(i, i + CHUNK_SIZE);
      await prisma.delivery.createMany({
        data: chunk,
      });
    }

    stats.newInserted = toCreate.length;
    stats.details.push(`Successfully imported ${toCreate.length} complete delivery items into PostgreSQL DeliveryDB.`);
    return stats;
  }

  // Incremental sync for existing database records
  const allDBRecords = await prisma.delivery.findMany({
    select: {
      id: true,
      invoiceNo: true,
      diNo: true,
      itemName: true,
      drumQty: true,
      date: true,
      buyerName: true,
      transporterName: true,
      truckNumber: true,
      driverContactNo: true,
      lrNo: true,
      freightOrder: true,
      toPlaceName: true,
      address: true,
      deliveryStatus: true,
      remarks: true,
      deliveryRemarks: true,
      vehicleReachedDate: true,
      deliveryDate: true,
      hasMismatch: true,
    },
  });

  const dbPrimaryQueueMap = new Map<string, any[]>();
  const dbSecondaryQueueMap = new Map<string, any[]>();

  allDBRecords.forEach((rec) => {
    const key1 = `${rec.invoiceNo || ''}||${rec.diNo || ''}||${rec.itemName || ''}||${rec.drumQty || ''}||${rec.date || ''}`;
    if (!dbPrimaryQueueMap.has(key1)) dbPrimaryQueueMap.set(key1, []);
    dbPrimaryQueueMap.get(key1)!.push(rec);

    const key2 = `${rec.buyerName || ''}||${rec.date || ''}||${rec.transporterName || ''}||${rec.truckNumber || ''}`;
    if (key2 !== '||||') {
      if (!dbSecondaryQueueMap.has(key2)) dbSecondaryQueueMap.set(key2, []);
      dbSecondaryQueueMap.get(key2)!.push(rec);
    }
  });

  const usedDbIds = new Set<string>();
  const newRecordsToCreate: any[] = [];
  const updatesToPerform: Array<{ id: string; data: Record<string, any> }> = [];
  const now = new Date();

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const key1 = `${row.invoiceNo || ''}||${row.diNo || ''}||${row.itemName || ''}||${row.drumQty || ''}||${row.date || ''}`;
    const key2 = `${row.buyerName || ''}||${row.date || ''}||${row.transporterName || ''}||${row.truckNumber || ''}`;

    let existingDB: any = null;

    // 1. Primary queue match (invoiceNo + diNo + itemName + drumQty + date)
    const primaryQueue = dbPrimaryQueueMap.get(key1);
    if (primaryQueue) {
      while (primaryQueue.length > 0) {
        const candidate = primaryQueue.shift();
        if (candidate && !usedDbIds.has(candidate.id)) {
          existingDB = candidate;
          break;
        }
      }
    }

    // 2. Secondary queue match (buyerName + date + transporterName + truckNumber) for edited rows
    if (!existingDB && key2 !== '||||') {
      const secondaryQueue = dbSecondaryQueueMap.get(key2);
      if (secondaryQueue) {
        while (secondaryQueue.length > 0) {
          const candidate = secondaryQueue.shift();
          if (candidate && !usedDbIds.has(candidate.id)) {
            existingDB = candidate;
            break;
          }
        }
      }
    }

    if (existingDB) {
      usedDbIds.add(existingDB.id);
    }

    if (!existingDB) {
      const newDeliveryData: Record<string, any> = {
        id: `del_${now.getTime()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        invoiceNo: row.invoiceNo || '',
        diNo: row.diNo || '',
        deliveryStatus: row.deliveryStatus || 'PENDING',
        lastSyncedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      SYNCABLE_FIELDS.forEach((field) => {
        const val = row[field];
        if (val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== '-') {
          newDeliveryData[field] = String(val).trim();
        }
      });

      newRecordsToCreate.push(newDeliveryData);
      stats.newInserted++;
    } else {
      const updateData: Record<string, any> = { lastSyncedAt: now };
      let recordWasUpdated = false;

      for (const field of SYNCABLE_FIELDS) {
        const rawSheetVal = row[field];
        const sheetVal = rawSheetVal !== undefined && rawSheetVal !== null ? String(rawSheetVal).trim() : '';
        const dbVal = (existingDB as any)[field] ? String((existingDB as any)[field]).trim() : '';

        if (sheetVal !== '' && sheetVal !== '-' && sheetVal !== dbVal) {
          updateData[field] = sheetVal;
          recordWasUpdated = true;
        }
      }

      if (existingDB.hasMismatch) {
        updateData.hasMismatch = false;
        updateData.mismatchDetails = null;
        recordWasUpdated = true;
      }

      if (recordWasUpdated) {
        updatesToPerform.push({ id: existingDB.id, data: updateData });
        stats.updatedCount++;
      }
    }
  }

  // Find DB records that were deleted/removed from the Google Sheet
  const deletedDbIds: string[] = [];
  allDBRecords.forEach((rec) => {
    if (!usedDbIds.has(rec.id)) {
      deletedDbIds.push(rec.id);
    }
  });

  // Fast-path: If no new rows, no updated rows, and no deleted rows exist, do not write to DB
  if (updatesToPerform.length === 0 && newRecordsToCreate.length === 0 && deletedDbIds.length === 0) {
    stats.details.push(`All ${rows.length} sheet rows are already up-to-date in database. 0 changes required.`);
    return stats;
  }

  if (updatesToPerform.length > 0) {
    const BATCH_SIZE = 100;
    for (let i = 0; i < updatesToPerform.length; i += BATCH_SIZE) {
      const chunk = updatesToPerform.slice(i, i + BATCH_SIZE);
      await prisma.$transaction(
        chunk.map((item) =>
          prisma.delivery.update({
            where: { id: item.id },
            data: item.data,
          })
        )
      );
    }
  }

  if (newRecordsToCreate.length > 0) {
    const CHUNK_SIZE = 2000;
    for (let i = 0; i < newRecordsToCreate.length; i += CHUNK_SIZE) {
      const chunk = newRecordsToCreate.slice(i, i + CHUNK_SIZE);
      await prisma.delivery.createMany({
        data: chunk,
      });
    }
  }

  if (deletedDbIds.length > 0) {
    const CHUNK_SIZE = 500;
    for (let i = 0; i < deletedDbIds.length; i += CHUNK_SIZE) {
      const chunk = deletedDbIds.slice(i, i + CHUNK_SIZE);
      await prisma.delivery.deleteMany({
        where: { id: { in: chunk } },
      });
    }
    stats.deletedCount = deletedDbIds.length;
  }

  invalidateDeliveryCache();
  stats.details.push(
    `Successfully synchronized ${rows.length} total rows (${stats.newInserted} new, ${stats.updatedCount} updated, ${stats.deletedCount || 0} deleted).`
  );
  return stats;
}
