import { prisma } from './db';

interface AuditLogParams {
  deliveryId?: string | null;
  invoiceNo: string;
  fieldName: string;
  oldValue?: string | null;
  newValue?: string | null;
  userId: string;
  userName: string;
  userEmail: string;
  action?: string;
}

export async function createAuditLog(params: AuditLogParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        deliveryId: params.deliveryId || null,
        invoiceNo: params.invoiceNo,
        fieldName: params.fieldName,
        oldValue: params.oldValue != null ? String(params.oldValue) : null,
        newValue: params.newValue != null ? String(params.newValue) : null,
        userId: params.userId,
        userName: params.userName,
        userEmail: params.userEmail,
        action: params.action || 'UI_UPDATE',
      },
    });
  } catch (error) {
    console.error('Failed to create audit log entry:', error);
    throw error;
  }
}
