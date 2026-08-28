import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const invoiceNo = searchParams.get('invoiceNo') || '';

    const whereClause: any = {};

    if (invoiceNo) {
      whereClause.invoiceNo = invoiceNo;
    }

    if (search) {
      whereClause.OR = [
        { invoiceNo: { contains: search, mode: 'insensitive' } },
        { fieldName: { contains: search, mode: 'insensitive' } },
        { userName: { contains: search, mode: 'insensitive' } },
        { oldValue: { contains: search, mode: 'insensitive' } },
        { newValue: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      logs,
      count: logs.length,
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
