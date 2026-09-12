import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { invalidateDeliveryCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { records, activeUser } = body;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No data records provided for bulk update' },
        { status: 400 }
      );
    }

    const user = activeUser || {
      id: 'usr_admin_1',
      name: 'Admin',
      email: 'admin@delivery.com',
    };

    // Load all DB deliveries to match quickly by DI NO or INVOICE NO
    const dbDeliveries = await prisma.delivery.findMany({
      select: {
        id: true,
        diNo: true,
        invoiceNo: true,
        storeRemarks: true,
        storeOtherDetails: true,
      },
    });

    const diMap = new Map<string, any[]>();
    const invMap = new Map<string, any[]>();

    dbDeliveries.forEach((d) => {
      if (d.diNo) {
        const cleanDi = d.diNo.trim().toUpperCase();
        if (!diMap.has(cleanDi)) diMap.set(cleanDi, []);
        diMap.get(cleanDi)!.push(d);
      }
      if (d.invoiceNo) {
        const cleanInv = d.invoiceNo.trim().toUpperCase();
        if (!invMap.has(cleanInv)) invMap.set(cleanInv, []);
        invMap.get(cleanInv)!.push(d);
      }
    });

    const updatesToPerform: Array<{
      id: string;
      invoiceNo: string;
      data: { storeRemarks?: string; storeOtherDetails?: string };
      logs: Array<{ fieldName: string; oldValue: string | null; newValue: string | null }>;
    }> = [];

    let updatedCount = 0;
    let notFoundCount = 0;
    let skippedCount = 0;

    for (const rec of records) {
      const diNo = rec.diNo ? String(rec.diNo).trim().toUpperCase() : '';
      const invoiceNo = rec.invoiceNo ? String(rec.invoiceNo).trim().toUpperCase() : '';
      const newRemarks = rec.storeRemarks !== undefined && rec.storeRemarks !== null ? String(rec.storeRemarks).trim() : undefined;
      const newOther = rec.storeOtherDetails !== undefined && rec.storeOtherDetails !== null ? String(rec.storeOtherDetails).trim() : undefined;

      if (!diNo && !invoiceNo) {
        skippedCount++;
        continue;
      }

      // Find target DB records
      let matchedDBList: any[] = [];
      if (diNo && diMap.has(diNo)) {
        matchedDBList = diMap.get(diNo)!;
      } else if (invoiceNo && invMap.has(invoiceNo)) {
        matchedDBList = invMap.get(invoiceNo)!;
      }

      if (matchedDBList.length === 0) {
        notFoundCount++;
        continue;
      }

      for (const targetDB of matchedDBList) {
        const updateData: Record<string, any> = {};
        const logs: Array<{ fieldName: string; oldValue: string | null; newValue: string | null }> = [];

        if (newRemarks !== undefined && newRemarks !== (targetDB.storeRemarks || '')) {
          updateData.storeRemarks = newRemarks;
          logs.push({
            fieldName: 'STORE REMARKS',
            oldValue: targetDB.storeRemarks || null,
            newValue: newRemarks || null,
          });
        }

        if (newOther !== undefined && newOther !== (targetDB.storeOtherDetails || '')) {
          updateData.storeOtherDetails = newOther;
          logs.push({
            fieldName: 'STORE OTHER DETAILS',
            oldValue: targetDB.storeOtherDetails || null,
            newValue: newOther || null,
          });
        }

        if (Object.keys(updateData).length > 0) {
          updatesToPerform.push({
            id: targetDB.id,
            invoiceNo: targetDB.invoiceNo || '',
            data: updateData,
            logs,
          });
          updatedCount++;
        } else {
          skippedCount++;
        }
      }
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

        // Audit Logging
        for (const item of chunk) {
          for (const log of item.logs) {
            await createAuditLog({
              deliveryId: item.id,
              invoiceNo: item.invoiceNo,
              fieldName: log.fieldName,
              oldValue: log.oldValue,
              newValue: log.newValue,
              userId: user.id,
              userName: user.name,
              userEmail: user.email,
              action: 'BULK_STORE_UPLOAD',
            });
          }
        }
      }

      invalidateDeliveryCache();
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      notFoundCount,
      skippedCount,
      totalProcessed: records.length,
      message: `Bulk store upload completed: ${updatedCount} records updated, ${notFoundCount} not found, ${skippedCount} unchanged.`,
    });
  } catch (error: any) {
    console.error('Error during bulk store upload:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Bulk store upload failed' },
      { status: 500 }
    );
  }
}
