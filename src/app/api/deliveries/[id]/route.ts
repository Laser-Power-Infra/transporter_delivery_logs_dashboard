import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { FIELD_LABELS } from '@/lib/sheetSync';
import { invalidateDeliveryCache } from '@/lib/cache';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const delivery = await prisma.delivery.findUnique({
      where: { id: params.id },
      include: {
        auditLogs: {
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
      },
    });

    if (!delivery) {
      return NextResponse.json(
        { success: false, error: 'Delivery record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, delivery });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch record' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { updates, activeUser, resolveMismatch } = body;

    if (!activeUser || !activeUser.id) {
      return NextResponse.json(
        { success: false, error: 'User identity is required for audit logging' },
        { status: 400 }
      );
    }

    const existingDB = await prisma.delivery.findUnique({
      where: { id: params.id },
    });

    if (!existingDB) {
      return NextResponse.json(
        { success: false, error: 'Delivery record not found' },
        { status: 404 }
      );
    }

    if (updates.invoiceNo && String(updates.invoiceNo).trim() !== existingDB.invoiceNo) {
      const newInv = String(updates.invoiceNo).trim();
      const existingWithInv = await prisma.delivery.findFirst({
        where: { invoiceNo: newInv },
      });
    }

    const updateData: Record<string, any> = {};
    const auditEntries: Array<{ fieldName: string; oldValue: string | null; newValue: string | null }> = [];

    const allowedFields = [
      'invoiceNo',
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

    for (const key of Object.keys(updates)) {
      if (allowedFields.includes(key)) {
        const newFieldVal = updates[key] !== undefined && updates[key] !== null ? String(updates[key]).trim() : '';
        const oldFieldVal = existingDB[key as keyof typeof existingDB] ? String(existingDB[key as keyof typeof existingDB]).trim() : '';

        if (newFieldVal !== oldFieldVal) {
          updateData[key] = newFieldVal;
          auditEntries.push({
            fieldName: FIELD_LABELS[key] || key,
            oldValue: oldFieldVal || null,
            newValue: newFieldVal || null,
          });
        }
      }
    }

    if (resolveMismatch) {
      updateData.hasMismatch = false;
      updateData.mismatchDetails = null;
      auditEntries.push({
        fieldName: 'MISMATCH_STATUS',
        oldValue: 'FLAGGED_MISMATCH',
        newValue: 'RESOLVED_BY_USER',
      });
    }

    if (Object.keys(updateData).length === 0 && !resolveMismatch) {
      return NextResponse.json({
        success: true,
        message: 'No changes detected',
        delivery: existingDB,
      });
    }

    // Update PostgreSQL DB
    const updatedDelivery = await prisma.delivery.update({
      where: { id: params.id },
      data: updateData,
    });

    // Write all audit logs into PostgreSQL AuditLog table
    for (const logItem of auditEntries) {
      await createAuditLog({
        deliveryId: updatedDelivery.id,
        invoiceNo: updatedDelivery.invoiceNo || '',
        fieldName: logItem.fieldName,
        oldValue: logItem.oldValue,
        newValue: logItem.newValue,
        userId: activeUser.id,
        userName: activeUser.name,
        userEmail: activeUser.email,
        action: 'UI_UPDATE',
      });
    }

    invalidateDeliveryCache();

    return NextResponse.json({
      success: true,
      delivery: updatedDelivery,
      logsCreated: auditEntries.length,
    });
  } catch (error: any) {
    console.error('Error updating delivery record:', error);
    if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
      return NextResponse.json(
        {
          success: false,
          error: `Invoice No already exists in the database. Each Invoice Number must be unique.`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update record' },
      { status: 500 }
    );
  }
}
