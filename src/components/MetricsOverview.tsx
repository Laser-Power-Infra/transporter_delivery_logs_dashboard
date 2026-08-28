'use client';

import React from 'react';
import { Package, Truck, Clock, CheckCircle2, AlertTriangle, ArrowUpRight, Anchor, Tag, ShieldAlert } from 'lucide-react';

interface MetricsProps {
  stats: {
    totalCount: number;
    mismatchCount: number;
    pendingCount: number;
    deliveredCount: number;
    statusCounts?: Record<string, number>;
  };
  loading?: boolean;
  onFilterStatus: (status: string) => void;
  activeStatusFilter: string;
}

export const MetricsOverview: React.FC<MetricsProps> = ({
  stats,
  loading = false,
  onFilterStatus,
  activeStatusFilter,
}) => {
  const statusCounts = stats.statusCounts || {};

  // Build list of all status cards dynamically
  const dynamicCards: Array<{
    id: string;
    title: string;
    value: number;
    icon: any;
    iconBg: string;
    activeBg: string;
  }> = [
    {
      id: '',
      title: 'Total Deliveries',
      value: stats.totalCount,
      icon: Package,
      iconBg: 'bg-blue-600 text-white',
      activeBg: 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-500 shadow-md',
    },
    {
      id: 'DELIVERED',
      title: 'Delivered',
      value: stats.deliveredCount || statusCounts['DELIVERED'] || 0,
      icon: CheckCircle2,
      iconBg: 'bg-emerald-600 text-white',
      activeBg: 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500 shadow-md',
    },
    {
      id: 'PENDING',
      title: 'Pending Orders',
      value: stats.pendingCount || statusCounts['PENDING'] || 0,
      icon: Clock,
      iconBg: 'bg-amber-500 text-white',
      activeBg: 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-500 shadow-md',
    },
  ];

  // Add custom status cards (e.g. kolkata port, LASER, CANCELED, BHUTAN, VEHICLE REACHED, IN TRANSIT...)
  const knownKeys = ['PENDING', 'DELIVERED', 'DELIVERIED'];
  
  Object.keys(statusCounts).forEach((stKey) => {
    if (!knownKeys.includes(stKey.toUpperCase())) {
      const count = statusCounts[stKey];
      if (count > 0) {
        let icon = Tag;
        let iconBg = 'bg-sky-600 text-white';
        let activeBg = 'bg-sky-50/90 border-sky-400 ring-2 ring-sky-500 shadow-md';

        const stUpper = stKey.toUpperCase();
        if (stUpper.includes('PORT') || stUpper.includes('EXPORT')) {
          icon = Anchor;
          iconBg = 'bg-indigo-600 text-white';
          activeBg = 'bg-indigo-50/90 border-indigo-400 ring-2 ring-indigo-500 shadow-md';
        } else if (stUpper.includes('CANCEL')) {
          icon = ShieldAlert;
          iconBg = 'bg-rose-600 text-white';
          activeBg = 'bg-rose-50/90 border-rose-400 ring-2 ring-rose-500 shadow-md';
        } else if (stUpper.includes('REACHED')) {
          icon = ArrowUpRight;
          iconBg = 'bg-purple-600 text-white';
          activeBg = 'bg-purple-50/90 border-purple-400 ring-2 ring-purple-500 shadow-md';
        } else if (stUpper.includes('TRANSIT')) {
          icon = Truck;
          iconBg = 'bg-sky-600 text-white';
          activeBg = 'bg-sky-50/90 border-sky-400 ring-2 ring-sky-500 shadow-md';
        }

        dynamicCards.push({
          id: stKey,
          title: stKey,
          value: count,
          icon,
          iconBg,
          activeBg,
        });
      }
    }
  });

  // Add Mismatches Card at the end if present
  if (stats.mismatchCount > 0) {
    dynamicCards.push({
      id: 'MISMATCH',
      title: 'Sheet Mismatches',
      value: stats.mismatchCount,
      icon: AlertTriangle,
      iconBg: 'bg-rose-600 text-white',
      activeBg: 'bg-rose-50/90 border-rose-400 ring-2 ring-rose-500 shadow-md',
    });
  }

  return (
    <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-thin">
      {dynamicCards.map((card) => {
        const Icon = card.icon;
        const isSelected = activeStatusFilter === card.id;

        return (
          <button
            key={card.title}
            onClick={() => onFilterStatus(card.id)}
            className={`min-w-[160px] flex-1 p-3.5 rounded-xl border text-left transition-all shadow-sm flex flex-col justify-between cursor-pointer ${
              isSelected
                ? card.activeBg
                : 'bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate max-w-[110px]" title={card.title}>
                {card.title}
              </span>
              <div className={`p-1.5 rounded-lg ${card.iconBg}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2">
              {loading ? (
                <div className="h-6 w-16 bg-slate-200/80 rounded animate-pulse" />
              ) : (
                <span className="text-xl font-extrabold text-slate-900 transition-opacity animate-fade-in">
                  {card.value.toLocaleString()}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};
