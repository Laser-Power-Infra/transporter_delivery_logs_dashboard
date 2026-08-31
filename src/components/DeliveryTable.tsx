'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Delivery, MismatchDetail, User } from '@/types';
import { Search, Filter, AlertTriangle, CheckCircle2, Truck, Clock, ArrowUpDown, ChevronLeft, ChevronRight, Tag, ShieldAlert, Check, Loader2, X, SlidersHorizontal, Calendar, Download } from 'lucide-react';
import { exportDeliveriesToExcel } from '@/lib/exportExcel';

interface DeliveryTableProps {
  deliveries: Delivery[];
  onEditRecord?: (delivery: Delivery) => void;
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  transporterFilter: string;
  onTransporterFilterChange: (val: string) => void;
  mismatchOnly: boolean;
  onMismatchOnlyChange: (val: boolean) => void;
  transporterOptions: string[];
  statusOptions: Array<{ status: string; count: number }>;
  activeUser: User | null;
  onRefreshData: () => void;
  onFilteredStatsChange?: (stats: {
    totalCount: number;
    mismatchCount: number;
    pendingCount: number;
    deliveredCount: number;
    statusCounts?: Record<string, number>;
  }) => void;
  
  // Server-side Pagination & Total Record Count Props
  loading?: boolean;
  serverTotal?: number;
  serverPage?: number;
  onServerPageChange?: (page: number) => void;
  serverLimit?: number;
  onServerLimitChange?: (limit: number) => void;

  onColumnFiltersChange?: (filters: Record<string, string>) => void;
  onDateRangeFiltersChange?: (ranges: Record<string, { from: string; to: string }>) => void;
  serverUniqueColumnValues?: Record<string, Array<{ val: string; count: number }>>;
}

// Helper to normalize strings for robust matching
function normalizeText(str: string | null | undefined): string {
  if (!str) return '';
  return str.toString().replace(/\s+/g, ' ').trim().toLowerCase();
}

// Helper to parse date strings into Date objects for range filtering
function parseComparableDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || !dateStr.trim() || dateStr.trim() === '-') return null;
  const s = dateStr.trim();

  // YYYY-MM-DD
  const ymdMatch = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const d = new Date(year, month, day, 12, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }

  // DD-MM-YYYY
  const dmYMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (dmYMatch) {
    let day = parseInt(dmYMatch[1], 10);
    let month = parseInt(dmYMatch[2], 10) - 1;
    let year = parseInt(dmYMatch[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day, 12, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }

  // DD-MMM-YY (e.g. 01-Aug-26)
  const dMmmYMatch = s.match(/^(\d{1,2})[-/. ]([A-Za-z]{3})[-/. ](\d{2,4})$/);
  if (dMmmYMatch) {
    let day = parseInt(dMmmYMatch[1], 10);
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    let month = months[dMmmYMatch[2].toLowerCase()];
    let year = parseInt(dMmmYMatch[3], 10);
    if (year < 100) year += 2000;
    if (month !== undefined) {
      const d = new Date(year, month, day, 12, 0, 0);
      return isNaN(d.getTime()) ? null : d;
    }
  }

  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  d.setHours(12, 0, 0, 0);
  return d;
}

const getStatusBadge = (status: string | null | undefined) => {
  const st = (status || '').trim();
  const stUpper = st.toUpperCase();

  if (stUpper === 'DELIVERED' || stUpper === 'DELIVERIED') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3 mr-1" /> Delivered
      </span>
    );
  }
  if (stUpper === 'IN TRANSIT') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
        <Truck className="w-3 h-3 mr-1" /> In Transit
      </span>
    );
  }
  if (stUpper === 'VEHICLE REACHED') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
        Vehicle Reached
      </span>
    );
  }
  if (stUpper === 'PENDING' || !st) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
        <Clock className="w-3 h-3 mr-1" /> Pending
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
      <Clock className="w-3 h-3 mr-1 text-amber-600" /> {st}
    </span>
  );
};

// Debounced Header Filter Input
const DebouncedHeaderInput = React.memo<{
  placeholder: string;
  value: string;
  hasFilter: boolean;
  onChange: (val: string) => void;
}>(({ placeholder, value, hasFilter, onChange }) => {
  const [localVal, setLocalVal] = useState(value);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localVal !== value) {
        onChange(localVal);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [localVal, value, onChange]);

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        className={`w-full px-2 py-0.5 text-[10px] font-normal bg-white border rounded focus:outline-none focus:ring-1 focus:ring-sky-500 transition ${
          hasFilter ? 'border-sky-500 bg-sky-50 font-bold text-sky-950' : 'border-slate-300 text-slate-700'
        }`}
      />
      {hasFilter && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setLocalVal('');
            onChange('');
          }}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          title="Clear filter"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
});
DebouncedHeaderInput.displayName = 'DebouncedHeaderInput';

// Debounced Date Range Input Component supporting ALL date formats & pickers
const DebouncedDateRangeInput = React.memo<{
  fieldKey: string;
  boundary: 'from' | 'to';
  value: string;
  placeholder: string;
  onChange: (field: string, boundary: 'from' | 'to', val: string) => void;
}>(({ fieldKey, boundary, value, placeholder, onChange }) => {
  const [localVal, setLocalVal] = useState(value);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localVal !== value) {
        const val = localVal.trim();
        const isValidDateStr =
          !val ||
          /^\d{4}-\d{2}-\d{2}$/.test(val) ||
          /^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/.test(val) ||
          /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2}$/.test(val) ||
          /^\d{1,2}[-/. ][A-Za-z]{3}[-/. ]\d{2,4}$/.test(val) ||
          /^\d{1,2}[-/.]\d{1,2}$/.test(val);

        if (isValidDateStr) {
          onChange(fieldKey, boundary, val);
        }
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [localVal, value, fieldKey, boundary, onChange]);

  return (
    <input
      type="date"
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      className="w-full px-1 py-0.5 bg-white border border-slate-300 rounded text-[10px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 font-semibold"
      title={`${boundary === 'from' ? 'From' : 'To'} Date`}
    />
  );
});
DebouncedDateRangeInput.displayName = 'DebouncedDateRangeInput';

// Memoized Cell Component
const MemoizedTableCell = React.memo<{
  item: Delivery;
  fieldKey: keyof Delivery;
  isSticky?: boolean;
  isSaving: boolean;
  mismatch?: MismatchDetail;
  statusOptions: Array<{ status: string; count: number }>;
  onSaveCell: (item: Delivery, field: keyof Delivery, newVal: string) => void;
  onFilterByValue?: (field: string, val: string) => void;
}>(({ item, fieldKey, isSticky = false, isSaving, mismatch, statusOptions, onSaveCell, onFilterByValue }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localVal, setLocalVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  const valStr = item[fieldKey] ? String(item[fieldKey]) : '';

  useEffect(() => {
    if (isEditing) {
      if (inputRef.current) inputRef.current.focus();
      if (selectRef.current) selectRef.current.focus();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setLocalVal(valStr);
    setIsEditing(true);
  };

  const handleFinishSave = () => {
    setIsEditing(false);
    if (localVal.trim() !== valStr.trim()) {
      onSaveCell(item, fieldKey, localVal.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFinishSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  if (isEditing) {
    if (fieldKey === 'deliveryStatus') {
      return (
        <select
          ref={selectRef}
          value={localVal}
          onChange={(e) => setLocalVal(e.target.value)}
          onBlur={handleFinishSave}
          onKeyDown={handleKeyDown}
          className="w-full px-2 py-1 bg-white border-2 border-sky-500 rounded text-xs font-semibold focus:outline-none shadow-md z-30"
        >
          <option value="PENDING">PENDING</option>
          <option value="DELIVERED">DELIVERED</option>
          <option value="VEHICLE REACHED">VEHICLE REACHED</option>
          <option value="IN TRANSIT">IN TRANSIT</option>
          <option value="CANCELED">CANCELED</option>
          {statusOptions.map((opt) => (
            <option key={opt.status} value={opt.status}>
              {opt.status}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        ref={inputRef}
        type="text"
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        onBlur={handleFinishSave}
        onKeyDown={handleKeyDown}
        className="w-full px-2 py-1 bg-white border-2 border-sky-500 rounded text-xs font-semibold focus:outline-none shadow-md z-30"
      />
    );
  }

  return (
    <div
      onClick={handleStartEdit}
      className={`w-full h-full min-h-[32px] py-1.5 px-2.5 flex items-center justify-between cursor-pointer rounded hover:bg-sky-50/80 hover:ring-1 hover:ring-sky-300 transition group ${
        isSticky ? (item.hasMismatch ? 'bg-rose-100 text-rose-950 font-bold' : 'bg-white text-slate-900 font-semibold') : ''
      }`}
      title="Click to edit cell directly (Excel-like edit)"
    >
      <div className="truncate flex-1">
        {mismatch ? (
          <span className="inline-flex items-center space-x-1 bg-rose-100 text-rose-900 border-2 border-rose-500 px-1.5 py-0.5 rounded font-bold text-xs shadow-xs">
            <AlertTriangle className="w-3 h-3 text-rose-600 flex-shrink-0" />
            <span>{valStr || '-'}</span>
          </span>
        ) : fieldKey === 'deliveryStatus' ? (
          getStatusBadge(item.deliveryStatus)
        ) : (
          <span className={!valStr ? 'text-slate-400 italic' : ''}>{valStr || '-'}</span>
        )}
      </div>

      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1 flex-shrink-0">
        {onFilterByValue && valStr && valStr !== '-' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFilterByValue(fieldKey as string, valStr);
            }}
            className="text-[10px] text-sky-600 hover:text-sky-800 bg-sky-100 hover:bg-sky-200 px-1.5 py-0.5 rounded font-bold"
            title={`Filter table by '${valStr}'`}
          >
            🔍 Filter
          </button>
        )}
        {isSaving ? (
          <Loader2 className="w-3 h-3 text-sky-600 animate-spin" />
        ) : (
          <span className="text-[10px] text-slate-400">✏️</span>
        )}
      </div>
    </div>
  );
});
MemoizedTableCell.displayName = 'MemoizedTableCell';

const MemoizedTableRow = React.memo<{
  item: Delivery;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  savingCellKey: string | null;
  statusOptions: Array<{ status: string; count: number }>;
  onSaveCell: (item: Delivery, field: keyof Delivery, newVal: string) => void;
  onFilterByValue?: (field: string, val: string) => void;
}>(({ item, isSelected, onToggleSelect, savingCellKey, statusOptions, onSaveCell, onFilterByValue }) => {

  const mismatchMap = useMemo(() => {
    const map = new Map<string, MismatchDetail>();
    if (!item.hasMismatch || !item.mismatchDetails) return map;
    try {
      const details: MismatchDetail[] = JSON.parse(item.mismatchDetails);
      details.forEach((d) => map.set(d.field as string, d));
    } catch (e) {}
    return map;
  }, [item.hasMismatch, item.mismatchDetails]);

  return (
    <tr 
      className={`transition animate-fade-in ${
        isSelected
          ? 'bg-sky-50/90 border-l-4 border-l-sky-500 hover:bg-sky-100/90 font-medium'
          : item.hasMismatch 
            ? 'bg-rose-50/90 border-l-4 border-l-rose-600 hover:bg-rose-100/90' 
            : 'hover:bg-slate-50'
      }`}
    >
      {/* Checkbox Selector Cell */}
      <td className="py-2 px-3 text-center border-r border-slate-200 bg-slate-50/40">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(item.id)}
          className="w-4 h-4 text-sky-600 border-slate-300 rounded focus:ring-sky-500 cursor-pointer"
          title="Select item for export"
        />
      </td>

      {/* (A) DI NO */}
      <td className="py-1 px-1 whitespace-nowrap font-mono font-semibold">
        <MemoizedTableCell
          item={item}
          fieldKey="diNo"
          isSaving={savingCellKey === `${item.id}:diNo`}
          mismatch={mismatchMap.get('diNo')}
          statusOptions={statusOptions}
          onSaveCell={onSaveCell}
          onFilterByValue={onFilterByValue}
        />
      </td>

      {/* (B) INVOICE NO - Sticky Left */}
      <td className={`py-1 px-1 whitespace-nowrap border-r border-slate-200 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${
        item.hasMismatch ? 'bg-rose-100 text-rose-950' : 'bg-white text-slate-900'
      }`}>
        <MemoizedTableCell
          item={item}
          fieldKey="invoiceNo"
          isSticky
          isSaving={savingCellKey === `${item.id}:invoiceNo`}
          mismatch={mismatchMap.get('invoiceNo')}
          statusOptions={statusOptions}
          onSaveCell={onSaveCell}
          onFilterByValue={onFilterByValue}
        />
      </td>

      {/* (C) Date */}
      <td className="py-1 px-1 whitespace-nowrap">
        <MemoizedTableCell
          item={item}
          fieldKey="date"
          isSaving={savingCellKey === `${item.id}:date`}
          mismatch={mismatchMap.get('date')}
          statusOptions={statusOptions}
          onSaveCell={onSaveCell}
          onFilterByValue={onFilterByValue}
        />
      </td>

      {/* (D) Buyer Name */}
      <td className="py-1 px-1 whitespace-nowrap font-semibold">
        <MemoizedTableCell
          item={item}
          fieldKey="buyerName"
          isSaving={savingCellKey === `${item.id}:buyerName`}
          mismatch={mismatchMap.get('buyerName')}
          statusOptions={statusOptions}
          onSaveCell={onSaveCell}
          onFilterByValue={onFilterByValue}
        />
      </td>

      {/* (E) Transporter Name */}
      <td className="py-1 px-1 whitespace-nowrap font-medium text-sky-700">
        <MemoizedTableCell
          item={item}
          fieldKey="transporterName"
          isSaving={savingCellKey === `${item.id}:transporterName`}
          mismatch={mismatchMap.get('transporterName')}
          statusOptions={statusOptions}
          onSaveCell={onSaveCell}
          onFilterByValue={onFilterByValue}
        />
      </td>

      {/* (F) TRUCK NUMBER */}
      <td className="py-1 px-1 whitespace-nowrap font-mono font-bold">
        <MemoizedTableCell
          item={item}
          fieldKey="truckNumber"
          isSaving={savingCellKey === `${item.id}:truckNumber`}
          mismatch={mismatchMap.get('truckNumber')}
          statusOptions={statusOptions}
          onSaveCell={onSaveCell}
          onFilterByValue={onFilterByValue}
        />
      </td>

      {/* (G) Driver Contact No */}
      <td className="py-1 px-1 whitespace-nowrap">
        <MemoizedTableCell
          item={item}
          fieldKey="driverContactNo"
          isSaving={savingCellKey === `${item.id}:driverContactNo`}
          mismatch={mismatchMap.get('driverContactNo')}
          statusOptions={statusOptions}
          onSaveCell={onSaveCell}
          onFilterByValue={onFilterByValue}
        />
      </td>

      {/* (H) LR. NO */}
      <td className="py-1 px-1 whitespace-nowrap font-mono">
        <MemoizedTableCell
          item={item}
          fieldKey="lrNo"
          isSaving={savingCellKey === `${item.id}:lrNo`}
          mismatch={mismatchMap.get('lrNo')}
          statusOptions={statusOptions}
          onSaveCell={onSaveCell}
          onFilterByValue={onFilterByValue}
        />
      </td>

      {/* (I) FREIGHT ORDER */}
      <td className="py-1 px-1 whitespace-nowrap font-mono">
        <MemoizedTableCell
          item={item}
          fieldKey="freightOrder"
          isSaving={savingCellKey === `${item.id}:freightOrder`}
          mismatch={mismatchMap.get('freightOrder')}
          statusOptions={statusOptions}
          onSaveCell={onSaveCell}
          onFilterByValue={onFilterByValue}
        />
      </td>

      {/* (J) To Place Name */}
      <td className="py-1 px-1 whitespace-nowrap">
        <MemoizedTableCell
          item={item}
          fieldKey="toPlaceName"
          isSaving={savingCellKey === `${item.id}:toPlaceName`}
          mismatch={mismatchMap.get('toPlaceName')}
          statusOptions={statusOptions}
          onSaveCell={onSaveCell}
          onFilterByValue={onFilterByValue}
        />
      </td>

      {/* (K) Address */}
      <td className="py-1 px-1 max-w-xs truncate">
        <MemoizedTableCell
          item={item}
          fieldKey="address"
          isSaving={savingCellKey === `${item.id}:address`}
          mismatch={mismatchMap.get('address')}
          statusOptions={statusOptions}
          onSaveCell={onSaveCell}
          onFilterByValue={onFilterByValue}
        />
      </td>

      {/* (L) Item Name */}
      <td className="py-1 px-1 whitespace-nowrap font-semibold">
        <MemoizedTableCell
          item={item}
          fieldKey="itemName"
          isSaving={savingCellKey === `${item.id}:itemName`}
          mismatch={mismatchMap.get('itemName')}
          statusOptions={statusOptions}
          onSaveCell={onSaveCell}
          onFilterByValue={onFilterByValue}
        />
      </td>

      {/* (M) Drum Qty */}
      <td className="py-1 px-1 whitespace-nowrap font-mono">
        <MemoizedTableCell
          item={item}
          fieldKey="drumQty"
          isSaving={savingCellKey === `${item.id}:drumQty`}
          mismatch={mismatchMap.get('drumQty')}
          statusOptions={statusOptions}
          onSaveCell={onSaveCell}
          onFilterByValue={onFilterByValue}
        />
      </td>

      {/* (N) DELIVERY STATUS */}
      <td className="py-1 px-1 whitespace-nowrap">
        <MemoizedTableCell
          item={item}
          fieldKey="deliveryStatus"
          isSaving={savingCellKey === `${item.id}:deliveryStatus`}
          mismatch={mismatchMap.get('deliveryStatus')}
          statusOptions={statusOptions}
          onSaveCell={onSaveCell}
          onFilterByValue={onFilterByValue}
        />
      </td>

      {/* (O) Remarks */}
      <td className="py-1 px-1 max-w-xs truncate">
        <MemoizedTableCell
          item={item}
          fieldKey="remarks"
          isSaving={savingCellKey === `${item.id}:remarks`}
          mismatch={mismatchMap.get('remarks')}
          statusOptions={statusOptions}
          onSaveCell={onSaveCell}
          onFilterByValue={onFilterByValue}
        />
      </td>

      {/* (P) DELIVERY REMARKS */}
      <td className="py-1 px-1 max-w-xs truncate">
        <MemoizedTableCell
          item={item}
          fieldKey="deliveryRemarks"
          isSaving={savingCellKey === `${item.id}:deliveryRemarks`}
          mismatch={mismatchMap.get('deliveryRemarks')}
          statusOptions={statusOptions}
          onSaveCell={onSaveCell}
          onFilterByValue={onFilterByValue}
        />
      </td>

      {/* (Q) VEHICLE REACHED DATE */}
      <td className="py-1 px-1 whitespace-nowrap">
        <MemoizedTableCell
          item={item}
          fieldKey="vehicleReachedDate"
          isSaving={savingCellKey === `${item.id}:vehicleReachedDate`}
          mismatch={mismatchMap.get('vehicleReachedDate')}
          statusOptions={statusOptions}
          onSaveCell={onSaveCell}
          onFilterByValue={onFilterByValue}
        />
      </td>

      {/* (R) DELIVERY DATE */}
      <td className="py-1 px-1 whitespace-nowrap">
        <MemoizedTableCell
          item={item}
          fieldKey="deliveryDate"
          isSaving={savingCellKey === `${item.id}:deliveryDate`}
          mismatch={mismatchMap.get('deliveryDate')}
          statusOptions={statusOptions}
          onSaveCell={onSaveCell}
          onFilterByValue={onFilterByValue}
        />
      </td>
    </tr>
  );
});
MemoizedTableRow.displayName = 'MemoizedTableRow';

export const DeliveryTable: React.FC<DeliveryTableProps> = ({
  deliveries,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  transporterFilter,
  onTransporterFilterChange,
  mismatchOnly,
  onMismatchOnlyChange,
  transporterOptions,
  statusOptions,
  activeUser,
  onRefreshData,
  onFilteredStatsChange,
  loading = false,
  serverTotal,
  serverPage = 1,
  onServerPageChange,
  serverLimit = 50,
  onServerLimitChange,
  onColumnFiltersChange,
  onDateRangeFiltersChange,
  serverUniqueColumnValues,
}) => {
  // Determine active pagination model (Server vs Client)
  const isServerPaged = Boolean(serverTotal && onServerPageChange);

  const [sortField, setSortField] = useState<keyof Delivery | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'none'>('none');

  // Checkbox selection & Excel export state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExportingAll, setIsExportingAll] = useState<boolean>(false);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  
  // Local pagination state if server-side is not used
  const [localCurrentPage, setLocalCurrentPage] = useState<number>(1);
  const [localPageSize, setLocalPageSize] = useState<number>(50);

  // Column Filters State
  const [showColumnFilters, setShowColumnFilters] = useState<boolean>(true);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({
    diNo: '',
    invoiceNo: '',
    date: '',
    buyerName: '',
    transporterName: '',
    truckNumber: '',
    driverContactNo: '',
    lrNo: '',
    freightOrder: '',
    toPlaceName: '',
    address: '',
    itemName: '',
    drumQty: '',
    deliveryStatus: '',
    remarks: '',
    deliveryRemarks: '',
    vehicleReachedDate: '',
    deliveryDate: '',
  });

  // Date Range Filters State
  const [dateRangeFilters, setDateRangeFilters] = useState<Record<string, { from: string; to: string }>>({
    date: { from: '', to: '' },
    vehicleReachedDate: { from: '', to: '' },
    deliveryDate: { from: '', to: '' },
  });

  const [savingCellKey, setSavingCellKey] = useState<string | null>(null);

  // Unique options calculation
  const uniqueColumnValues = useMemo(() => {
    const map: Record<string, Array<{ val: string; count: number }>> = {};

    const targetFields: (keyof Delivery)[] = [
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

    targetFields.forEach((field) => {
      const countMap = new Map<string, number>();
      deliveries.forEach((d) => {
        const v = d[field] ? String(d[field]).trim() : '';
        if (v && v !== '-') {
          countMap.set(v, (countMap.get(v) || 0) + 1);
        }
      });

      const options = Array.from(countMap.entries())
        .map(([val, count]) => ({ val, count }))
        .sort((a, b) => a.val.localeCompare(b.val, undefined, { numeric: true }));

      map[field as string] = options;
    });

    return map;
  }, [deliveries]);

  // 3-State Header Sort Handler: 1st Click = ASC, 2nd Click = DESC, 3rd Click = NORMAL (Unsorted)
  const handleSort = useCallback((field: keyof Delivery) => {
    if (sortField !== field) {
      setSortField(field);
      setSortOrder('asc');
    } else {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else if (sortOrder === 'desc') {
        setSortField(null);
        setSortOrder('none');
      } else {
        setSortField(field);
        setSortOrder('asc');
      }
    }
  }, [sortField, sortOrder]);

  const handleColumnFilterChange = useCallback((field: string, val: string) => {
    const next = {
      ...columnFilters,
      [field]: val,
    };
    setColumnFilters(next);
    if (onColumnFiltersChange) onColumnFiltersChange(next);
    if (onServerPageChange) onServerPageChange(1);
    else setLocalCurrentPage(1);
  }, [columnFilters, onServerPageChange, onColumnFiltersChange]);

  const handleDateRangeChange = useCallback((field: string, boundary: 'from' | 'to', val: string) => {
    const next = {
      ...dateRangeFilters,
      [field]: { ...dateRangeFilters[field], [boundary]: val },
    };
    setDateRangeFilters(next);
    if (onDateRangeFiltersChange) onDateRangeFiltersChange(next);
    if (onServerPageChange) onServerPageChange(1);
    else setLocalCurrentPage(1);
  }, [dateRangeFilters, onServerPageChange, onDateRangeFiltersChange]);

  const clearAllColumnFilters = useCallback(() => {
    const emptyFilters = {
      diNo: '',
      invoiceNo: '',
      date: '',
      buyerName: '',
      transporterName: '',
      truckNumber: '',
      driverContactNo: '',
      lrNo: '',
      freightOrder: '',
      toPlaceName: '',
      address: '',
      itemName: '',
      drumQty: '',
      deliveryStatus: '',
      remarks: '',
      deliveryRemarks: '',
      vehicleReachedDate: '',
      deliveryDate: '',
    };
    const emptyRanges = {
      date: { from: '', to: '' },
      vehicleReachedDate: { from: '', to: '' },
      deliveryDate: { from: '', to: '' },
    };
    setColumnFilters(emptyFilters);
    setDateRangeFilters(emptyRanges);
    if (onColumnFiltersChange) onColumnFiltersChange(emptyFilters);
    if (onDateRangeFiltersChange) onDateRangeFiltersChange(emptyRanges);

    if (onServerPageChange) onServerPageChange(1);
    else setLocalCurrentPage(1);
  }, [onServerPageChange, onColumnFiltersChange, onDateRangeFiltersChange]);

  const activeColumnFilterCount = 
    Object.values(columnFilters).filter((v) => v.trim().length > 0).length +
    Object.values(dateRangeFilters).filter((r) => r.from || r.to).length;

  // Ultra-robust text matching algorithm (used for client-side fallback)
  const filteredDeliveries = useMemo(() => {
    if (isServerPaged) {
      return deliveries;
    }

    const activeFilters = Object.entries(columnFilters).filter(([_, q]) => q.trim().length > 0);
    const activeRanges = Object.entries(dateRangeFilters).filter(([_, r]) => r.from || r.to);

    if (activeFilters.length === 0 && activeRanges.length === 0) {
      return deliveries;
    }

    return deliveries.filter((item) => {
      for (let i = 0; i < activeFilters.length; i++) {
        const [field, query] = activeFilters[i];
        const valNorm = normalizeText(item[field as keyof Delivery] ? String(item[field as keyof Delivery]) : '');
        const queryNorm = normalizeText(query);

        if (!valNorm.includes(queryNorm)) {
          return false;
        }
      }

      for (let i = 0; i < activeRanges.length; i++) {
        const [dateField, range] = activeRanges[i];

        if (range.from) {
          const fromObj = parseComparableDate(range.from);
          if (fromObj) {
            fromObj.setHours(0, 0, 0, 0);
            const itemDateObj = parseComparableDate(item[dateField as keyof Delivery] ? String(item[dateField as keyof Delivery]) : null);
            if (!itemDateObj || itemDateObj < fromObj) return false;
          }
        }

        if (range.to) {
          const toObj = parseComparableDate(range.to);
          if (toObj) {
            toObj.setHours(23, 59, 59, 999);
            const itemDateObj = parseComparableDate(item[dateField as keyof Delivery] ? String(item[dateField as keyof Delivery]) : null);
            if (!itemDateObj || itemDateObj > toObj) return false;
          }
        }
      }

      return true;
    });
  }, [deliveries, columnFilters, dateRangeFilters]);

  // Recalculate dynamic KPI stats for client-side column filters
  useEffect(() => {
    if (!onFilteredStatsChange) return;

    const hasActiveLocalFilter = activeColumnFilterCount > 0;
    if (serverTotal && !hasActiveLocalFilter) return;

    let totalCount = filteredDeliveries.length;
    let mismatchCount = 0;
    let pendingCount = 0;
    let deliveredCount = 0;
    const statusCounts: Record<string, number> = {};

    filteredDeliveries.forEach((d) => {
      if (d.hasMismatch) mismatchCount++;

      const remarks = (d.deliveryRemarks || '').trim().toUpperCase();
      const isDelivered = remarks.includes('YES');

      if (isDelivered) {
        deliveredCount++;
      } else {
        pendingCount++;
      }
    });

    const finalTotal = hasActiveLocalFilter ? filteredDeliveries.length : (serverTotal || filteredDeliveries.length);

    onFilteredStatsChange({
      totalCount: finalTotal,
      mismatchCount,
      pendingCount,
      deliveredCount,
      statusCounts,
    });
  }, [filteredDeliveries, serverTotal, activeColumnFilterCount, onFilteredStatsChange]);

  // Natural alphanumeric & chronological date sorting
  const sortedDeliveries = useMemo(() => {
    if (!sortField || sortOrder === 'none') {
      return filteredDeliveries;
    }

    const sortAsc = sortOrder === 'asc';

    return [...filteredDeliveries].sort((a, b) => {
      const rawA = a[sortField];
      const rawB = b[sortField];

      const valA = (rawA || '').toString().trim();
      const valB = (rawB || '').toString().trim();

      if (!valA && !valB) return 0;
      if (!valA) return 1;
      if (!valB) return -1;

      // Chronological date sorting for Date fields
      if (sortField === 'date' || sortField === 'vehicleReachedDate' || sortField === 'deliveryDate') {
        const dateA = parseComparableDate(valA);
        const dateB = parseComparableDate(valB);
        if (dateA && dateB) {
          return sortAsc ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
        }
        if (dateA) return -1;
        if (dateB) return 1;
      }

      // Numeric sorting for drumQty
      if (sortField === 'drumQty') {
        const numA = parseFloat(valA.replace(/[^0-9.]/g, ''));
        const numB = parseFloat(valB.replace(/[^0-9.]/g, ''));
        if (!isNaN(numA) && !isNaN(numB)) {
          return sortAsc ? numA - numB : numB - numA;
        }
      }

      // Natural alphanumeric string comparison
      const res = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      return sortAsc ? res : -res;
    });
  }, [filteredDeliveries, sortField, sortOrder]);

  const displayTotal = isServerPaged ? serverTotal! : sortedDeliveries.length;
  const activePage = isServerPaged ? serverPage : localCurrentPage;
  const activeLimit = isServerPaged ? serverLimit : localPageSize;

  const totalPages = Math.max(1, Math.ceil(displayTotal / (activeLimit || displayTotal)));
  const validCurrentPage = Math.min(activePage, totalPages);

  const startIndex = displayTotal === 0 ? 0 : (validCurrentPage - 1) * (activeLimit || displayTotal) + 1;
  const endIndex = Math.min(validCurrentPage * (activeLimit || displayTotal), displayTotal);

  // If using server pagination, all returned deliveries belong to current page
  const paginatedDeliveries = isServerPaged ? sortedDeliveries : sortedDeliveries.slice((validCurrentPage - 1) * activeLimit, validCurrentPage * activeLimit);

  // Checkbox Selection & Export Helpers
  const visibleIds = useMemo(() => paginatedDeliveries.map((d) => d.id), [paginatedDeliveries]);
  const isAllVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  const handleToggleSelectAllVisible = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [isAllVisibleSelected, visibleIds]);

  const handleExportSelected = useCallback(() => {
    if (selectedIds.size === 0) {
      alert('Please select at least one delivery item using checkboxes to export.');
      return;
    }
    const selectedDeliveries = deliveries.filter((d) => selectedIds.has(d.id));
    exportDeliveriesToExcel(selectedDeliveries, `Selected_Deliveries_${selectedIds.size}_items.xlsx`);
  }, [selectedIds, deliveries]);

  const handleExportAllFiltered = useCallback(async () => {
    setIsExportingAll(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', 'all');
      if (search) params.append('search', search);
      if (statusFilter && statusFilter !== 'MISMATCH') params.append('status', statusFilter);
      if (transporterFilter) params.append('transporter', transporterFilter);
      if (mismatchOnly || statusFilter === 'MISMATCH') params.append('mismatchOnly', 'true');

      Object.entries(columnFilters).forEach(([k, v]) => {
        if (v && v.trim()) params.append(k, v.trim());
      });

      if (dateRangeFilters.date?.from) params.append('dateFrom', dateRangeFilters.date.from);
      if (dateRangeFilters.date?.to) params.append('dateTo', dateRangeFilters.date.to);
      if (dateRangeFilters.vehicleReachedDate?.from) params.append('vehicleReachedFrom', dateRangeFilters.vehicleReachedDate.from);
      if (dateRangeFilters.vehicleReachedDate?.to) params.append('vehicleReachedTo', dateRangeFilters.vehicleReachedDate.to);
      if (dateRangeFilters.deliveryDate?.from) params.append('deliveryFrom', dateRangeFilters.deliveryDate.from);
      if (dateRangeFilters.deliveryDate?.to) params.append('deliveryTo', dateRangeFilters.deliveryDate.to);

      const res = await fetch(`/api/deliveries?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.deliveries) {
        exportDeliveriesToExcel(data.deliveries, `Deliveries_Export_${data.deliveries.length}_items.xlsx`);
      } else {
        alert('Failed to fetch filtered records for export.');
      }
    } catch (err: any) {
      alert('Export failed: ' + (err.message || err));
    } finally {
      setIsExportingAll(false);
    }
  }, [search, statusFilter, transporterFilter, mismatchOnly, columnFilters, dateRangeFilters]);

  const handlePageChange = (newPage: number) => {
    if (isServerPaged && onServerPageChange) {
      onServerPageChange(newPage);
    } else {
      setLocalCurrentPage(newPage);
    }
  };

  const handleLimitChange = (newLimitStr: string) => {
    const newLim = newLimitStr === 'all' ? 999999 : Number(newLimitStr);
    if (isServerPaged && onServerLimitChange) {
      onServerLimitChange(newLim);
      if (onServerPageChange) onServerPageChange(1);
    } else {
      setLocalPageSize(newLim);
      setLocalCurrentPage(1);
    }
  };

  // Save inline cell change to PostgreSQL DB
  const handleCellSave = useCallback(async (item: Delivery, field: keyof Delivery, newVal: string) => {
    if (!activeUser) return;
    const cellKey = `${item.id}:${field}`;
    setSavingCellKey(cellKey);

    try {
      const res = await fetch(`/api/deliveries/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: { [field]: newVal },
          activeUser,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onRefreshData();
      } else {
        alert(data.error || 'Failed to update field');
      }
    } catch (err: any) {
      alert(err.message || 'Cell update error');
    } finally {
      setSavingCellKey(null);
    }
  }, [activeUser, onRefreshData]);

  // Header Cell Renderer
  const renderHeaderCell = (fieldKey: string, label: string, isSticky: boolean = false) => {
    const isDateColumn = fieldKey === 'date' || fieldKey === 'vehicleReachedDate' || fieldKey === 'deliveryDate';
    const filterVal = columnFilters[fieldKey] || '';
    const dateRange = dateRangeFilters[fieldKey] || { from: '', to: '' };
    const dropdownOptions = (serverUniqueColumnValues && serverUniqueColumnValues[fieldKey]) || uniqueColumnValues[fieldKey] || [];
    const hasFilter = filterVal.trim().length > 0 || Boolean(dateRange.from || dateRange.to);
    const cleanLabel = label.replace(/\([A-Z]\)\s*/, '');

    return (
      <th 
        className={`py-2 px-2.5 whitespace-nowrap bg-slate-100/90 hover:bg-slate-200/80 transition border-b border-slate-200 ${
          isSticky ? 'sticky left-0 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]' : ''
        }`}
      >
        <div className="space-y-1.5 min-w-[130px]">
          {/* Header Title & 3-State Sorting */}
          <div 
            onClick={() => handleSort(fieldKey as keyof Delivery)}
            className={`flex items-center justify-between cursor-pointer select-none py-0.5 group transition ${
              sortField === fieldKey && sortOrder !== 'none' ? 'text-indigo-700 font-black' : 'text-slate-700 hover:text-slate-900'
            }`}
            title={`Click to sort by ${label}`}
          >
            <span className="font-bold text-[11px] uppercase tracking-wide truncate">{label}</span>
            {sortField === fieldKey && sortOrder !== 'none' ? (
              <span className="text-indigo-600 font-extrabold text-[10px] ml-1 flex items-center">
                {sortOrder === 'asc' ? '▲' : '▼'}
              </span>
            ) : (
              <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 flex-shrink-0 ml-1 opacity-60" />
            )}
          </div>

          {/* Clean Single Header Filter Control */}
          {showColumnFilters && (
            <div>
              {isDateColumn ? (
                /* Date Range Picker for Date Columns */
                <div className={`p-1 bg-white border rounded text-[10px] space-y-1 shadow-2xs ${
                  hasFilter ? 'border-indigo-500 bg-indigo-50/50 font-bold' : 'border-slate-300'
                }`}>
                  <div className="flex items-center justify-between text-[9px] text-slate-500 font-bold">
                    <span className="flex items-center gap-0.5 text-indigo-700">
                      <Calendar className="w-2.5 h-2.5" /> Date Range
                    </span>
                    {hasFilter && (
                      <button
                        onClick={() => {
                          handleDateRangeChange(fieldKey, 'from', '');
                          handleDateRangeChange(fieldKey, 'to', '');
                        }}
                        className="text-rose-600 hover:text-rose-800 font-bold"
                        title="Clear date range"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <DebouncedDateRangeInput
                      fieldKey={fieldKey}
                      boundary="from"
                      value={dateRange.from}
                      placeholder="From"
                      onChange={handleDateRangeChange}
                    />
                    <DebouncedDateRangeInput
                      fieldKey={fieldKey}
                      boundary="to"
                      value={dateRange.to}
                      placeholder="To"
                      onChange={handleDateRangeChange}
                    />
                  </div>
                </div>
              ) : dropdownOptions.length > 0 ? (
                /* Single Categorical Dropdown Control with Clear button */
                <div className="relative">
                  <select
                    value={filterVal}
                    onChange={(e) => handleColumnFilterChange(fieldKey, e.target.value)}
                    className={`w-full pl-2 pr-6 py-1 text-[11px] font-semibold bg-white border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 transition truncate ${
                      hasFilter ? 'border-indigo-500 bg-indigo-50 text-indigo-950 font-bold shadow-2xs' : 'border-slate-300 text-slate-700'
                    }`}
                  >
                    <option value="">All {cleanLabel} ({dropdownOptions.length})</option>
                    {dropdownOptions.map((opt) => (
                      <option key={opt.val} value={opt.val}>
                        {opt.val} ({opt.count})
                      </option>
                    ))}
                  </select>
                  {hasFilter && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleColumnFilterChange(fieldKey, '');
                      }}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 p-0.5"
                      title="Clear filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ) : (
                /* Debounced Text Filter Input */
                <DebouncedHeaderInput
                  placeholder={`Search ${cleanLabel}...`}
                  value={filterVal}
                  hasFilter={hasFilter}
                  onChange={(val) => handleColumnFilterChange(fieldKey, val)}
                />
              )}
            </div>
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      
      {/* Controls Bar: Search, Column Filter Toggles & Filters */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        
        {/* Global Search */}
        <div className="relative flex-1 min-w-[240px]">
          {loading ? (
            <Loader2 className="w-4 h-4 text-sky-600 animate-spin absolute left-3 top-1/2 -translate-y-1/2" />
          ) : (
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          )}
          <input
            type="text"
            placeholder={`Global search ${displayTotal ? displayTotal.toLocaleString() : '15,000+'} invoices by DI No, Invoice No, Buyer, Item...`}
            value={search}
            onChange={(e) => {
              onSearchChange(e.target.value);
              handlePageChange(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
          />
        </div>

        {/* Dedicated Date Range Filter Widget */}
        <div className={`flex items-center space-x-2 border p-1.5 rounded-lg shadow-2xs transition ${
          (dateRangeFilters.date?.from || dateRangeFilters.date?.to)
            ? 'bg-sky-50 border-sky-300 ring-1 ring-sky-400'
            : 'bg-white border-slate-300'
        }`}>
          <div className="flex items-center space-x-1 px-1 text-xs font-extrabold text-slate-800">
            <Calendar className="w-4 h-4 text-sky-600" />
            <span className="hidden sm:inline">Date Range:</span>
          </div>
          <input
            type="date"
            value={dateRangeFilters.date?.from || ''}
            onChange={(e) => handleDateRangeChange('date', 'from', e.target.value)}
            className="px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500"
            title="From Date"
          />
          <span className="text-slate-400 text-xs font-bold">to</span>
          <input
            type="date"
            value={dateRangeFilters.date?.to || ''}
            onChange={(e) => handleDateRangeChange('date', 'to', e.target.value)}
            className="px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500"
            title="To Date"
          />
          {(dateRangeFilters.date?.from || dateRangeFilters.date?.to) && (
            <button
              type="button"
              onClick={() => {
                handleDateRangeChange('date', 'from', '');
                handleDateRangeChange('date', 'to', '');
              }}
              className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-100 rounded transition"
              title="Clear Date Range Filter"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Column Header Filters Toggle & Reset */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowColumnFilters(!showColumnFilters)}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition ${
              showColumnFilters
                ? 'bg-sky-50 text-sky-700 border-sky-300 shadow-2xs'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
            title="Toggle Excel-style Date Range Pickers & Dropdown Filters"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-600" />
            <span>Column Filters & Date Ranges</span>
            {activeColumnFilterCount > 0 && (
              <span className="bg-sky-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ml-1">
                {activeColumnFilterCount}
              </span>
            )}
          </button>

          {activeColumnFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAllColumnFilters}
              className="flex items-center space-x-1 px-2.5 py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold hover:bg-rose-100 transition"
              title="Clear all column header filters"
            >
              <X className="w-3.5 h-3.5 text-rose-600" />
              <span>Clear Column Filters ({activeColumnFilterCount})</span>
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center space-x-2">
          
          {/* Dynamic Delivery Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              onStatusFilterChange(e.target.value);
              handlePageChange(1);
            }}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Delivery Statuses</option>
            {statusOptions.map((opt) => (
              <option key={opt.status} value={opt.status}>
                {opt.status} ({opt.count.toLocaleString()})
              </option>
            ))}
          </select>

          {/* Transporter Filter */}
          <select
            value={transporterFilter}
            onChange={(e) => {
              onTransporterFilterChange(e.target.value);
              handlePageChange(1);
            }}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Transporters</option>
            {transporterOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Mismatch Only Toggle */}
          <button
            type="button"
            onClick={() => {
              onMismatchOnlyChange(!mismatchOnly);
              handlePageChange(1);
            }}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition ${
              mismatchOnly
                ? 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-400'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${mismatchOnly ? 'text-white' : 'text-rose-600'}`} />
            <span>⚠️ Mismatches Only</span>
          </button>

          {/* Excel Export Action Button / Selected Counter */}
          {selectedIds.size > 0 ? (
            <div className="flex items-center space-x-2 bg-sky-50 border border-sky-300 px-3 py-1.5 rounded-lg text-xs font-bold shadow-2xs">
              <span className="text-sky-950">
                Selected <strong>{selectedIds.size}</strong> item(s)
              </span>
              <button
                type="button"
                onClick={handleExportSelected}
                className="flex items-center space-x-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-2xs transition font-bold"
                title="Export selected items to Excel .xlsx"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Selected ({selectedIds.size})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-slate-500 hover:text-slate-700 text-[11px] font-semibold underline ml-1"
              >
                Clear
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleExportAllFiltered}
              disabled={isExportingAll}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition disabled:opacity-50"
              title="Export all currently filtered records to Excel .xlsx"
            >
              {isExportingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Export Excel ({displayTotal.toLocaleString()})</span>
            </button>
          )}

        </div>

      </div>

      {/* Main Table Grid with Responsive Dynamic Full Viewport PC Height */}
      <div className="overflow-x-auto max-h-[calc(100vh-270px)] min-h-[550px]">
        <table className="w-full text-left border-collapse text-xs">
          
          <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3 text-center w-10 border-r border-slate-200 bg-slate-100">
                <input
                  type="checkbox"
                  checked={isAllVisibleSelected}
                  onChange={handleToggleSelectAllVisible}
                  className="w-4 h-4 text-sky-600 border-slate-300 rounded focus:ring-sky-500 cursor-pointer"
                  title={isAllVisibleSelected ? 'Deselect all visible items' : 'Select all visible items on this page'}
                />
              </th>
              {renderHeaderCell('diNo', '(A) DI NO')}
              {renderHeaderCell('invoiceNo', '(B) INVOICE NO', true)}
              {renderHeaderCell('date', '(C) Date')}
              {renderHeaderCell('buyerName', '(D) Buyer Name')}
              {renderHeaderCell('transporterName', '(E) Transporter Name')}
              {renderHeaderCell('truckNumber', '(F) TRUCK NUMBER')}
              {renderHeaderCell('driverContactNo', '(G) Driver Contact No')}
              {renderHeaderCell('lrNo', '(H) LR. NO')}
              {renderHeaderCell('freightOrder', '(I) FREIGHT ORDER')}
              {renderHeaderCell('toPlaceName', '(J) To Place Name')}
              {renderHeaderCell('address', '(K) Address')}
              {renderHeaderCell('itemName', '(L) Item Name')}
              {renderHeaderCell('drumQty', '(M) Drum Qty')}
              {renderHeaderCell('deliveryStatus', '(N) DELIVERY STATUS')}
              {renderHeaderCell('remarks', '(O) Remarks')}
              {renderHeaderCell('deliveryRemarks', '(P) DELIVERY REMARKS')}
              {renderHeaderCell('vehicleReachedDate', '(Q) VEHICLE REACHED DATE')}
              {renderHeaderCell('deliveryDate', '(R) DELIVERY DATE')}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-slate-700 font-medium">
            {loading ? (
              Array.from({ length: 8 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse bg-slate-50/70">
                  <td className="py-2.5 px-3 border-r border-slate-200 text-center">
                    <div className="h-4 w-4 bg-slate-200 rounded mx-auto" />
                  </td>
                  <td className="py-2.5 px-2"><div className="h-4 w-16 bg-slate-200 rounded" /></td>
                  <td className="py-2.5 px-2 border-r border-slate-200 sticky left-0 bg-slate-100/90 z-10">
                    <div className="h-4 w-24 bg-slate-200 rounded font-mono" />
                  </td>
                  <td className="py-2.5 px-2"><div className="h-4 w-16 bg-slate-200 rounded" /></td>
                  <td className="py-2.5 px-2"><div className="h-4 w-32 bg-slate-200 rounded" /></td>
                  <td className="py-2.5 px-2"><div className="h-4 w-28 bg-slate-200 rounded" /></td>
                  <td className="py-2.5 px-2"><div className="h-4 w-20 bg-slate-200 rounded" /></td>
                  <td className="py-2.5 px-2"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
                  <td className="py-2.5 px-2"><div className="h-4 w-16 bg-slate-200 rounded" /></td>
                  <td className="py-2.5 px-2"><div className="h-4 w-16 bg-slate-200 rounded" /></td>
                  <td className="py-2.5 px-2"><div className="h-4 w-20 bg-slate-200 rounded" /></td>
                  <td className="py-2.5 px-2"><div className="h-4 w-28 bg-slate-200 rounded" /></td>
                  <td className="py-2.5 px-2"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
                  <td className="py-2.5 px-2"><div className="h-4 w-12 bg-slate-200 rounded" /></td>
                  <td className="py-2.5 px-2"><div className="h-5 w-20 bg-slate-200 rounded-full" /></td>
                  <td className="py-2.5 px-2"><div className="h-4 w-16 bg-slate-200 rounded" /></td>
                  <td className="py-2.5 px-2"><div className="h-4 w-16 bg-slate-200 rounded" /></td>
                  <td className="py-2.5 px-2"><div className="h-4 w-20 bg-slate-200 rounded" /></td>
                  <td className="py-2.5 px-2"><div className="h-4 w-20 bg-slate-200 rounded" /></td>
                </tr>
              ))
            ) : paginatedDeliveries.length === 0 ? (
              <tr>
                <td colSpan={19} className="py-12 text-center text-slate-400 font-semibold">
                  No delivery records found matching your query or column filters.
                </td>
              </tr>
            ) : (
              paginatedDeliveries.map((item) => (
                <MemoizedTableRow
                  key={item.id}
                  item={item}
                  isSelected={selectedIds.has(item.id)}
                  onToggleSelect={handleToggleSelect}
                  savingCellKey={savingCellKey}
                  statusOptions={statusOptions}
                  onSaveCell={handleCellSave}
                  onFilterByValue={handleColumnFilterChange}
                />
              ))
            )}
          </tbody>

        </table>
      </div>

      {/* Pagination Controls displaying true 15,900+ totals */}
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex flex-wrap justify-between items-center gap-3">
        
        <div>
          Showing <strong>{displayTotal === 0 ? 0 : startIndex}</strong> - <strong>{endIndex}</strong> of <strong className="text-slate-900 font-extrabold">{displayTotal.toLocaleString()}</strong> total records
        </div>

        <div className="flex items-center space-x-4">
          
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500">Rows per page:</span>
            <select
              value={activeLimit >= 999999 ? 'all' : activeLimit}
              onChange={(e) => handleLimitChange(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-semibold focus:ring-2 focus:ring-sky-500"
            >
              <option value={25}>25 rows</option>
              <option value={50}>50 rows (Fastest)</option>
              <option value={100}>100 rows</option>
              <option value={250}>250 rows</option>
              <option value={500}>500 rows</option>
              <option value="all">All ({displayTotal.toLocaleString()})</option>
            </select>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => handlePageChange(Math.max(1, validCurrentPage - 1))}
              disabled={validCurrentPage <= 1}
              className="p-1 rounded bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 transition"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2 font-semibold">
              Page {validCurrentPage} of {totalPages}
            </span>

            <button
              onClick={() => handlePageChange(Math.min(totalPages, validCurrentPage + 1))}
              disabled={validCurrentPage >= totalPages}
              className="p-1 rounded bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 transition"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
