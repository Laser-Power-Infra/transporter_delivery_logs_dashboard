import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getDeliveryCache, setDeliveryCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

function parseComparableDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || !dateStr.trim() || dateStr.trim() === '-') return null;
  const s = dateStr.trim();

  let year: number | null = null;
  let month: number | null = null;
  let day: number | null = null;

  // YYYY-MM-DD
  const ymdMatch = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymdMatch) {
    year = parseInt(ymdMatch[1], 10);
    month = parseInt(ymdMatch[2], 10) - 1;
    day = parseInt(ymdMatch[3], 10);
  }

  // DD-MM-YYYY or DD-MM-YY
  if (year === null) {
    const dmYMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
    if (dmYMatch) {
      day = parseInt(dmYMatch[1], 10);
      month = parseInt(dmYMatch[2], 10) - 1;
      year = parseInt(dmYMatch[3], 10);
      if (year < 100) year += 2000;
    }
  }

  // DD-MMM-YY or DD-MMM-YYYY (e.g. 01-Aug-26, 01-Aug-2026)
  if (year === null) {
    const dMmmYMatch = s.match(/^(\d{1,2})[-/. ]([A-Za-z]{3})[-/. ](\d{2,4})$/);
    if (dMmmYMatch) {
      day = parseInt(dMmmYMatch[1], 10);
      const months: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
      };
      const mVal = months[dMmmYMatch[2].toLowerCase()];
      if (mVal !== undefined) {
        month = mVal;
        year = parseInt(dMmmYMatch[3], 10);
        if (year < 100) year += 2000;
      }
    }
  }

  // DD-MM (e.g. 01-08 -> defaults to 2026)
  if (year === null) {
    const dmMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})$/);
    if (dmMatch) {
      day = parseInt(dmMatch[1], 10);
      month = parseInt(dmMatch[2], 10) - 1;
      year = 2026;
    }
  }

  if (year !== null && month !== null && day !== null) {
    if (year < 1990 || year > 2099 || month < 0 || month > 11 || day < 1 || day > 31) {
      return null;
    }
    const d = new Date(year, month, day, 12, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  if (d.getFullYear() < 1990 || d.getFullYear() > 2099) return null;
  d.setHours(12, 0, 0, 0);
  return d;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const transporter = searchParams.get('transporter') || '';
    const mismatchOnly = searchParams.get('mismatchOnly') === 'true';

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limitParam = searchParams.get('limit');
    const limit = (limitParam && limitParam !== 'all') ? parseInt(limitParam, 10) : undefined;
    const skip = limit ? (Math.max(1, page) - 1) * limit : 0;

    // Date range filters
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const vehicleReachedFrom = searchParams.get('vehicleReachedFrom');
    const vehicleReachedTo = searchParams.get('vehicleReachedTo');
    const deliveryFrom = searchParams.get('deliveryFrom');
    const deliveryTo = searchParams.get('deliveryTo');

    // Categorical & text column filters
    const diNo = searchParams.get('diNo');
    const invoiceNo = searchParams.get('invoiceNo');
    const buyerName = searchParams.get('buyerName');
    const transporterNameCol = searchParams.get('transporterName');
    const truckNumber = searchParams.get('truckNumber');
    const driverContactNo = searchParams.get('driverContactNo');
    const lrNo = searchParams.get('lrNo');
    const freightOrder = searchParams.get('freightOrder');
    const toPlaceName = searchParams.get('toPlaceName');
    const address = searchParams.get('address');
    const itemName = searchParams.get('itemName');
    const drumQty = searchParams.get('drumQty');
    const deliveryStatusCol = searchParams.get('deliveryStatus');
    const remarks = searchParams.get('remarks');
    const deliveryRemarks = searchParams.get('deliveryRemarks');

    const hasAnyFilter = Boolean(
      search || status || transporter || mismatchOnly ||
      dateFrom || dateTo || vehicleReachedFrom || vehicleReachedTo || deliveryFrom || deliveryTo ||
      diNo || invoiceNo || buyerName || transporterNameCol || truckNumber || driverContactNo ||
      lrNo || freightOrder || toPlaceName || address || itemName || drumQty || deliveryStatusCol ||
      remarks || deliveryRemarks
    );

    const cached = getDeliveryCache();

    // FAST-PATH (<20ms): Standard Page Load / Reload without filters uses cached stats + direct limit/take SQL query
    if (!hasAnyFilter && limit !== undefined && cached) {
      const [paginatedDeliveries] = await Promise.all([
        prisma.delivery.findMany({
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      return NextResponse.json({
        success: true,
        deliveries: paginatedDeliveries,
        uniqueColumnValues: cached.uniqueColumnValues,
        pagination: {
          total: cached.total,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(cached.total / limit)),
        },
        stats: cached.stats,
        transporterOptions: cached.transporterOptions,
        statusOptions: cached.statusOptions,
      });
    }

    // Base filter conditions (search, transporter, column filters) - WITHOUT card status/mismatch filter
    const base_AND_conditions: any[] = [];

    if (search) {
      base_AND_conditions.push({
        OR: [
          { diNo: { contains: search, mode: 'insensitive' } },
          { invoiceNo: { contains: search, mode: 'insensitive' } },
          { buyerName: { contains: search, mode: 'insensitive' } },
          { transporterName: { contains: search, mode: 'insensitive' } },
          { truckNumber: { contains: search, mode: 'insensitive' } },
          { lrNo: { contains: search, mode: 'insensitive' } },
          { itemName: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (transporter) {
      base_AND_conditions.push({
        transporterName: { equals: transporter, mode: 'insensitive' },
      });
    }

    // Specific Column Filters
    if (diNo) base_AND_conditions.push({ diNo: { contains: diNo, mode: 'insensitive' } });
    if (invoiceNo) base_AND_conditions.push({ invoiceNo: { contains: invoiceNo, mode: 'insensitive' } });
    if (buyerName) base_AND_conditions.push({ buyerName: { contains: buyerName, mode: 'insensitive' } });
    if (transporterNameCol) base_AND_conditions.push({ transporterName: { contains: transporterNameCol, mode: 'insensitive' } });
    if (truckNumber) base_AND_conditions.push({ truckNumber: { contains: truckNumber, mode: 'insensitive' } });
    if (driverContactNo) base_AND_conditions.push({ driverContactNo: { contains: driverContactNo, mode: 'insensitive' } });
    if (lrNo) base_AND_conditions.push({ lrNo: { contains: lrNo, mode: 'insensitive' } });
    if (freightOrder) base_AND_conditions.push({ freightOrder: { contains: freightOrder, mode: 'insensitive' } });
    if (toPlaceName) base_AND_conditions.push({ toPlaceName: { contains: toPlaceName, mode: 'insensitive' } });
    if (address) base_AND_conditions.push({ address: { contains: address, mode: 'insensitive' } });
    if (itemName) base_AND_conditions.push({ itemName: { contains: itemName, mode: 'insensitive' } });
    if (drumQty) base_AND_conditions.push({ drumQty: { contains: drumQty, mode: 'insensitive' } });
    if (deliveryStatusCol) base_AND_conditions.push({ deliveryStatus: { contains: deliveryStatusCol, mode: 'insensitive' } });
    if (remarks) base_AND_conditions.push({ remarks: { contains: remarks, mode: 'insensitive' } });
    if (deliveryRemarks) base_AND_conditions.push({ deliveryRemarks: { contains: deliveryRemarks, mode: 'insensitive' } });

    const baseWhereClause = base_AND_conditions.length > 0 ? { AND: base_AND_conditions } : {};

    // Fetch base records matching column/text filters
    let baseDeliveries = await prisma.delivery.findMany({
      where: baseWhereClause,
      orderBy: { updatedAt: 'desc' },
    });

    // Apply Date Range Filtering in memory
    if (dateFrom || dateTo || vehicleReachedFrom || vehicleReachedTo || deliveryFrom || deliveryTo) {
      const fromObj = dateFrom ? parseComparableDate(dateFrom) : null;
      if (fromObj) fromObj.setHours(0, 0, 0, 0);

      const toObj = dateTo ? parseComparableDate(dateTo) : null;
      if (toObj) toObj.setHours(23, 59, 59, 999);

      const vrFromObj = vehicleReachedFrom ? parseComparableDate(vehicleReachedFrom) : null;
      if (vrFromObj) vrFromObj.setHours(0, 0, 0, 0);

      const vrToObj = vehicleReachedTo ? parseComparableDate(vehicleReachedTo) : null;
      if (vrToObj) vrToObj.setHours(23, 59, 59, 999);

      const delFromObj = deliveryFrom ? parseComparableDate(deliveryFrom) : null;
      if (delFromObj) delFromObj.setHours(0, 0, 0, 0);

      const delToObj = deliveryTo ? parseComparableDate(deliveryTo) : null;
      if (delToObj) delToObj.setHours(23, 59, 59, 999);

      baseDeliveries = baseDeliveries.filter((item) => {
        if (fromObj || toObj) {
          const itemD = parseComparableDate(item.date);
          if (!itemD) return false;
          if (fromObj && itemD < fromObj) return false;
          if (toObj && itemD > toObj) return false;
        }

        if (vrFromObj || vrToObj) {
          const itemD = parseComparableDate(item.vehicleReachedDate);
          if (!itemD) return false;
          if (vrFromObj && itemD < vrFromObj) return false;
          if (vrToObj && itemD > vrToObj) return false;
        }

        if (delFromObj || delToObj) {
          const itemD = parseComparableDate(item.deliveryDate);
          if (!itemD) return false;
          if (delFromObj && itemD < delFromObj) return false;
          if (delToObj && itemD > delToObj) return false;
        }

        return true;
      });
    }

    // COMPUTE OVERALL SUMMARY STATS FOR ACTIVE DATE RANGE & FILTERS (e.g. 51 Total = 2 Delivered + 49 Pending)
    const baseTotalCount = baseDeliveries.length;
    let baseMismatchCount = 0;
    let basePendingCount = 0;
    let baseDeliveredCount = 0;
    const statusCounts: Record<string, number> = {};

    baseDeliveries.forEach((d) => {
      if (d.hasMismatch) baseMismatchCount++;

      const remarksVal = (d.deliveryRemarks || '').trim().toUpperCase();
      const isDelivered = remarksVal.includes('YES');

      if (isDelivered) {
        baseDeliveredCount++;
      } else {
        basePendingCount++;
      }
    });

    statusCounts['PENDING'] = basePendingCount;
    statusCounts['DELIVERED'] = baseDeliveredCount;

    // NOW APPLY CARD STATUS & MISMATCH FILTER TO TABLE RESULT DATA
    let tableDeliveries = baseDeliveries;

    if (status) {
      const cleanStatus = status.replace(/\s*\(\d+\)$/, '').trim();
      const upperStatus = cleanStatus.toUpperCase();

      if (upperStatus === 'PENDING') {
        tableDeliveries = tableDeliveries.filter((d) => !(d.deliveryRemarks || '').toUpperCase().includes('YES'));
      } else if (upperStatus === 'DELIVERED' || upperStatus === 'DELIVERIED') {
        tableDeliveries = tableDeliveries.filter((d) => (d.deliveryRemarks || '').toUpperCase().includes('YES'));
      } else {
        tableDeliveries = tableDeliveries.filter((d) => (d.deliveryStatus || '').toUpperCase().includes(cleanStatus.toUpperCase()));
      }
    }

    if (mismatchOnly) {
      tableDeliveries = tableDeliveries.filter((d) => d.hasMismatch);
    }

    const tableFilteredCount = tableDeliveries.length;

    // Paginate table records
    const paginatedDeliveries = limit ? tableDeliveries.slice(skip, skip + limit) : tableDeliveries;

    // Compute unique column values across all base deliveries (for accurate header dropdown counts)
    const uniqueColumnValues: Record<string, Array<{ val: string; count: number }>> = {};
    const fieldsToCount = [
      'diNo',
      'buyerName',
      'transporterName',
      'truckNumber',
      'driverContactNo',
      'lrNo',
      'freightOrder',
      'toPlaceName',
      'itemName',
      'drumQty',
      'deliveryStatus',
      'deliveryRemarks',
      'remarks',
    ];

    fieldsToCount.forEach((field) => {
      const countMap = new Map<string, number>();
      baseDeliveries.forEach((d: any) => {
        const v = d[field] ? String(d[field]).trim() : '';
        if (v && v !== '-') {
          countMap.set(v, (countMap.get(v) || 0) + 1);
        }
      });

      uniqueColumnValues[field] = Array.from(countMap.entries())
        .map(([val, count]) => ({ val, count }))
        .sort((a, b) => a.val.localeCompare(b.val, undefined, { numeric: true }));
    });

    // Fetch transporter options dynamically
    const transporterGroups = await prisma.delivery.groupBy({
      by: ['transporterName'],
      where: { transporterName: { not: null } },
      _count: { _all: true },
    });

    const transporterOptions = transporterGroups
      .map((g) => g.transporterName!)
      .filter((t) => t && t.trim() !== '' && t.trim() !== '-')
      .sort((a, b) => a.localeCompare(b));

    const statusOptions = [
      { status: 'DELIVERED', count: baseDeliveredCount },
      { status: 'PENDING', count: basePendingCount },
      ...Object.entries(statusCounts)
        .filter(([st]) => st !== 'DELIVERED' && st !== 'PENDING')
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count),
    ];

    const computedStats = {
      totalCount: baseTotalCount,
      mismatchCount: baseMismatchCount,
      pendingCount: basePendingCount,
      deliveredCount: baseDeliveredCount,
      statusCounts,
    };

    if (!hasAnyFilter) {
      setDeliveryCache({
        stats: computedStats,
        uniqueColumnValues,
        transporterOptions,
        statusOptions,
        total: tableFilteredCount,
      });
    }

    return NextResponse.json({
      success: true,
      deliveries: paginatedDeliveries,
      uniqueColumnValues,
      pagination: {
        total: tableFilteredCount,
        page,
        limit: limit || tableFilteredCount,
        totalPages: limit ? Math.max(1, Math.ceil(tableFilteredCount / limit)) : 1,
      },
      stats: computedStats,
      transporterOptions,
      statusOptions,
    });
  } catch (error: any) {
    console.error('Error fetching deliveries:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch delivery records' },
      { status: 500 }
    );
  }
}
