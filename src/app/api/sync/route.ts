import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { normalizeSheetRow, processSheetSync } from '@/lib/sheetSync';
import { SheetRow } from '@/types';

export const dynamic = 'force-dynamic';

const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/19oxRDn6uiERIB97Jjz75aR2cEjzdWCFMWsnQJpDX2qg/edit?gid=0#gid=0';

function getCsvExportUrl(sheetUrl: string): string {
  const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) return sheetUrl;
  const docId = match[1];
  const gidMatch = sheetUrl.match(/gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : '0';
  return `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=${gid}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const sheetUrl = body.sheetUrl || DEFAULT_SHEET_URL;
    const activeUser = body.activeUser || {
      id: 'usr_admin_1',
      name: 'Admin',
      email: 'admin@delivery.com',
    };
    const clearOldCorruptedData = Boolean(body.clearOldCorruptedData);

    const baseCsvUrl = getCsvExportUrl(sheetUrl);
    const csvExportUrl = `${baseCsvUrl}${baseCsvUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response: Response;
    try {
      response = await fetch(csvExportUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        cache: 'no-store',
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      console.warn('Google Sheet fetch network issue:', fetchErr.message);
      return NextResponse.json({
        success: true,
        stats: { totalSheetRows: 0, newInserted: 0, updatedCount: 0, deletedCount: 0, nullIgnoredCount: 0, mismatchesCount: 0, details: ['Sheet network timeout: serving cached database data.'] },
        message: 'Google Sheet temporarily unreachable, serving cached database data.',
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch CSV from Google Sheet (HTTP status ${response.status})` },
        { status: 400 }
      );
    }

    const csvText = await response.text();

    if (!csvText || csvText.includes('<!DOCTYPE html>') || csvText.includes('<html')) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Google Sheet access restricted! Please open your Google Sheet, click Share, and set General Access to "Anyone with the link can view".',
        },
        { status: 400 }
      );
    }

    const lines = csvText.split(/\r?\n/);
    const headerLineIndex = lines.findIndex(
      (line) => line.toUpperCase().includes('INVOICE NO') || line.toUpperCase().includes('DI NO')
    );

    const cleanCsvText = headerLineIndex !== -1 ? lines.slice(headerLineIndex).join('\n') : csvText;

    const parsed = Papa.parse<any>(cleanCsvText, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
    });

    if (parsed.errors && parsed.errors.length > 0 && parsed.data.length === 0) {
      return NextResponse.json(
        { success: false, error: `CSV Parsing Error: ${parsed.errors[0].message}` },
        { status: 400 }
      );
    }

    const normalizedRows: SheetRow[] = [];
    for (const rawRow of parsed.data) {
      const normalized = normalizeSheetRow(rawRow);
      if (normalized) {
        normalizedRows.push(normalized);
      }
    }

    const syncStats = await processSheetSync(normalizedRows, activeUser, clearOldCorruptedData);

    return NextResponse.json({
      success: true,
      stats: syncStats,
      message: `Synchronized ${normalizedRows.length} sheet rows cleanly into PostgreSQL DeliveryDB.`,
    });
  } catch (error: any) {
    console.error('Error during sheet sync:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Sheet synchronization failed' },
      { status: 500 }
    );
  }
}
