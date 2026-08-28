'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { MetricsOverview } from '@/components/MetricsOverview';
import { DeliveryTable } from '@/components/DeliveryTable';
import { DeliveryEditModal } from '@/components/DeliveryEditModal';
import { AuditLogsModal } from '@/components/AuditLogsModal';
import { SyncModal } from '@/components/SyncModal';
import { MismatchModal } from '@/components/MismatchModal';
import { Delivery, User } from '@/types';

export default function DashboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [activeUser, setActiveUser] = useState<User | null>(null);

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [dbStats, setDbStats] = useState<{
    totalCount: number;
    mismatchCount: number;
    pendingCount: number;
    deliveredCount: number;
    statusCounts?: Record<string, number>;
  }>({
    totalCount: 0,
    mismatchCount: 0,
    pendingCount: 0,
    deliveredCount: 0,
    statusCounts: {},
  });

  // Live dynamic stats matching the currently filtered table dataset
  const [liveStats, setLiveStats] = useState<{
    totalCount: number;
    mismatchCount: number;
    pendingCount: number;
    deliveredCount: number;
    statusCounts?: Record<string, number>;
  }>({
    totalCount: 0,
    mismatchCount: 0,
    pendingCount: 0,
    deliveredCount: 0,
    statusCounts: {},
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [isAutoSyncing, setIsAutoSyncing] = useState<boolean>(false);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [transporterFilter, setTransporterFilter] = useState<string>('');
  const [mismatchOnly, setMismatchOnly] = useState<boolean>(false);

  // Column Header & Date Range Filters
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [dateRangeFilters, setDateRangeFilters] = useState<Record<string, { from: string; to: string }>>({});

  // Pagination state: Default to 50 rows per page so browser DOM node count stays low (~900 nodes), preventing Chrome freeze!
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(50);
  const [serverTotal, setServerTotal] = useState<number>(0);

  // Filter dropdown options
  const [transporterOptions, setTransporterOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<Array<{ status: string; count: number }>>([]);
  const [serverUniqueColumnValues, setServerUniqueColumnValues] = useState<Record<string, Array<{ val: string; count: number }>>>({});

  // Modals state
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isAuditLogsModalOpen, setIsAuditLogsModalOpen] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [isMismatchModalOpen, setIsMismatchModalOpen] = useState<boolean>(false);

  // Fetch initial user list
  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch('/api/users');
        const data = await res.json();
        if (data.success && data.users?.length > 0) {
          setUsers(data.users);
          setActiveUser(data.users[0]);
        }
      } catch (err) {
        console.error('Failed to load users:', err);
      }
    }
    loadUsers();
  }, []);

  // Fetch delivery data from PostgreSQL DB with ultra-fast server-side queries
  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', limit >= 999999 ? '100' : String(limit));
      if (search) params.append('search', search);
      if (statusFilter && statusFilter !== 'MISMATCH') params.append('status', statusFilter);
      if (transporterFilter) params.append('transporter', transporterFilter);
      if (mismatchOnly || statusFilter === 'MISMATCH') params.append('mismatchOnly', 'true');

      // Append column header text & dropdown filters
      Object.entries(columnFilters).forEach(([k, v]) => {
        if (v && v.trim()) params.append(k, v.trim());
      });

      // Append date range filters
      if (dateRangeFilters.date?.from) params.append('dateFrom', dateRangeFilters.date.from);
      if (dateRangeFilters.date?.to) params.append('dateTo', dateRangeFilters.date.to);

      if (dateRangeFilters.vehicleReachedDate?.from) params.append('vehicleReachedFrom', dateRangeFilters.vehicleReachedDate.from);
      if (dateRangeFilters.vehicleReachedDate?.to) params.append('vehicleReachedTo', dateRangeFilters.vehicleReachedDate.to);

      if (dateRangeFilters.deliveryDate?.from) params.append('deliveryFrom', dateRangeFilters.deliveryDate.from);
      if (dateRangeFilters.deliveryDate?.to) params.append('deliveryTo', dateRangeFilters.deliveryDate.to);

      const res = await fetch(`/api/deliveries?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setDeliveries(data.deliveries || []);
        if (data.pagination) {
          setServerTotal(data.pagination.total || 0);
        }

        const fetchedStats = data.stats || {
          totalCount: 0,
          mismatchCount: 0,
          pendingCount: 0,
          deliveredCount: 0,
          statusCounts: {},
        };

        setDbStats(fetchedStats);
        setLiveStats(fetchedStats);

        if (data.transporterOptions) setTransporterOptions(data.transporterOptions);
        if (data.statusOptions) setStatusOptions(data.statusOptions);
        if (data.uniqueColumnValues) setServerUniqueColumnValues(data.uniqueColumnValues);
      }
    } catch (err) {
      console.error('Error fetching deliveries:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, transporterFilter, mismatchOnly, columnFilters, dateRangeFilters]);

  // Fetch data on state change
  useEffect(() => {
    fetchDeliveries();
  }, [search, statusFilter, transporterFilter, mismatchOnly, page, limit, columnFilters, dateRangeFilters, fetchDeliveries]);

  // Background Auto-Sync Sheet Data without blocking initial load
  useEffect(() => {
    async function backgroundSyncSheetData() {
      if (!activeUser) return;
      setIsAutoSyncing(true);
      try {
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activeUser,
            clearOldCorruptedData: false,
          }),
        });
        fetchDeliveries();
      } catch (err) {
        console.warn('Background sheet sync skipped:', err);
      } finally {
        setIsAutoSyncing(false);
      }
    }

    backgroundSyncSheetData();
  }, [activeUser]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased">
      
      {/* Fixed Top Navigation Bar */}
      <Navbar
        users={users}
        activeUser={activeUser}
        onSelectUser={setActiveUser}
        onOpenAuditLogs={() => setIsAuditLogsModalOpen(true)}
        onOpenSync={() => setIsSyncModalOpen(true)}
        onOpenMismatches={() => setIsMismatchModalOpen(true)}
        mismatchCount={liveStats.mismatchCount}
        isSyncing={isAutoSyncing}
      />

      {/* Main Content Viewport - Full Screen PC Desktop Width */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        
        {/* Dynamic Metric Summary KPI Cards */}
        <MetricsOverview
          stats={liveStats}
          loading={loading}
          activeStatusFilter={statusFilter}
          onFilterStatus={(st) => {
            if (st === 'MISMATCH') {
              if (mismatchOnly) {
                setMismatchOnly(false);
              } else {
                setMismatchOnly(true);
                setStatusFilter('');
              }
            } else {
              setMismatchOnly(false);
              if (statusFilter === st) {
                setStatusFilter('');
              } else {
                setStatusFilter(st);
              }
            }
            setPage(1);
          }}
        />

        {/* Deliveries Data Table */}
        <DeliveryTable
          deliveries={deliveries}
          loading={loading}
          serverTotal={serverTotal}
          serverPage={page}
          onServerPageChange={setPage}
          serverLimit={limit}
          onServerLimitChange={setLimit}
          search={search}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          statusFilter={statusFilter}
          onStatusFilterChange={(val) => {
            setStatusFilter(val);
            setPage(1);
          }}
          transporterFilter={transporterFilter}
          onTransporterFilterChange={(val) => {
            setTransporterFilter(val);
            setPage(1);
          }}
          mismatchOnly={mismatchOnly}
          onMismatchOnlyChange={(val) => {
            setMismatchOnly(val);
            setPage(1);
          }}
          transporterOptions={transporterOptions}
          statusOptions={statusOptions}
          activeUser={activeUser}
          onRefreshData={fetchDeliveries}
          onColumnFiltersChange={setColumnFilters}
          onDateRangeFiltersChange={setDateRangeFilters}
          serverUniqueColumnValues={serverUniqueColumnValues}
        />

      </main>

      {/* Manual Record Edit Modal */}
      <DeliveryEditModal
        delivery={selectedDelivery}
        activeUser={activeUser}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSaveSuccess={fetchDeliveries}
      />

      {/* Audit Trail Modal */}
      <AuditLogsModal
        isOpen={isAuditLogsModalOpen}
        onClose={() => setIsAuditLogsModalOpen(false)}
      />

      {/* Manual Sheet Sync Modal */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        activeUser={activeUser}
        onSyncComplete={fetchDeliveries}
      />

      {/* Conflict / Mismatch Resolution Modal */}
      <MismatchModal
        isOpen={isMismatchModalOpen}
        onClose={() => setIsMismatchModalOpen(false)}
        mismatchDeliveries={deliveries.filter((d) => d.hasMismatch)}
        onResolveMismatch={(del) => {
          setSelectedDelivery(del);
          setIsEditModalOpen(true);
        }}
      />

    </div>
  );
}
