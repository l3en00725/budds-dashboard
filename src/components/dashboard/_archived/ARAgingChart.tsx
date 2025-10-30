'use client';

import React from 'react';
import { DashboardMetrics } from '@/lib/dashboard-service';

interface ARAgingChartProps {
  data: DashboardMetrics['executiveMetrics']['revenue']['arAging'];
}

export function ARAgingChart({ data }: ARAgingChartProps) {
  const total = data.current + data.days1to30 + data.days31to60 + data.days61to90 + data.days90plus;

  const buckets = [
    { label: 'Current', amount: data.current, color: 'bg-emerald-500' },
    { label: '1-30 Days', amount: data.days1to30, color: 'bg-blue-500' },
    { label: '31-60 Days', amount: data.days31to60, color: 'bg-amber-500' },
    { label: '61-90 Days', amount: data.days61to90, color: 'bg-orange-500' },
    { label: '90+ Days', amount: data.days90plus, color: 'bg-red-500' },
  ];

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const getPercentage = (amount: number) => {
    return total > 0 ? (amount / total) * 100 : 0;
  };

  const statusColor = data.status === 'green' ? 'text-emerald-400' :
                     data.status === 'orange' ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-100">AR Aging Analysis</h3>
          <p className="text-sm text-gray-400">Accounts receivable by age</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-100">{formatCurrency(total)}</div>
          <div className={`text-sm font-medium ${statusColor}`}>
            {data.over60Percent}% over 60 days
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="space-y-4">
        {buckets.map((bucket, index) => {
          const percentage = getPercentage(bucket.amount);
          const isOver60 = index >= 3; // 61-90 and 90+ buckets

          return (
            <div key={bucket.label} className="space-y-2">
              {/* Label and amount */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300 font-medium">{bucket.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">{percentage.toFixed(1)}%</span>
                  <span className={`font-semibold ${isOver60 ? 'text-red-400' : 'text-gray-100'}`}>
                    {formatCurrency(bucket.amount)}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative h-3 bg-gray-700/50 rounded-full overflow-hidden">
                <div
                  className={`h-full ${bucket.color} transition-all duration-1000 ease-out relative`}
                  style={{ width: `${Math.max(percentage, 0.5)}%` }}
                >
                  {/* Glow effect for non-zero amounts */}
                  {bucket.amount > 0 && (
                    <div className={`absolute inset-0 ${bucket.color} opacity-50 blur-sm`} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status indicator */}
      <div className="mt-6 pt-4 border-t border-gray-700/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Health Status</span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              data.status === 'green' ? 'bg-emerald-500' :
              data.status === 'orange' ? 'bg-amber-500' : 'bg-red-500'
            }`} />
            <span className={statusColor}>
              {data.status === 'green' ? 'Healthy' :
               data.status === 'orange' ? 'Watch' : 'Critical'}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Target: ≤15% over 60 days = Healthy, ≤30% = Watch, &gt;30% = Critical
        </p>
      </div>
    </div>
  );
}