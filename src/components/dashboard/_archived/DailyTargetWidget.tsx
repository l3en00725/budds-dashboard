'use client';

import { Target, TrendingUp } from "lucide-react";
import { DashboardMetrics } from "@/lib/dashboard-service";

interface DailyTargetWidgetProps {
  data: DashboardMetrics['dailyTarget'];
}

export function DailyTargetWidget({ data }: DailyTargetWidgetProps) {
  const getStatusColors = (status: string) => {
    switch (status) {
      case 'green':
        return {
          gradient: 'from-emerald-500 to-teal-600',
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          icon: 'text-emerald-600',
          progress: 'from-emerald-400 to-teal-500'
        };
      case 'yellow':
        return {
          gradient: 'from-amber-500 to-orange-600',
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          icon: 'text-amber-600',
          progress: 'from-amber-400 to-orange-500'
        };
      case 'red':
        return {
          gradient: 'from-red-500 to-rose-600',
          bg: 'bg-red-50',
          text: 'text-red-700',
          icon: 'text-red-600',
          progress: 'from-red-400 to-rose-500'
        };
      default:
        return {
          gradient: 'from-gray-500 to-slate-600',
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          icon: 'text-gray-600',
          progress: 'from-gray-400 to-slate-500'
        };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const colors = getStatusColors(data.status);

  return (
    <div className="group relative bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
      {/* Background Gradient Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`}></div>

      {/* Header */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colors.bg}`}>
            <Target className={`h-4 w-4 ${colors.icon}`} />
          </div>
          <h3 className="font-medium text-gray-700 text-sm">Daily Revenue Target</h3>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
          {data.percentage >= 100 ? 'Complete' : data.percentage >= 75 ? 'On Track' : 'Behind'}
        </div>
      </div>

      {/* Main Value */}
      <div className="relative mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">
            {formatCurrency(data.current)}
          </span>
          <div className="flex items-center gap-1">
            <TrendingUp className={`h-4 w-4 ${colors.icon}`} />
            <span className={`text-sm font-medium ${colors.text}`}>
              {data.percentage.toFixed(1)}%
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          of {formatCurrency(data.target)} target
        </p>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full bg-gradient-to-r ${colors.progress} transition-all duration-500 ease-out`}
            style={{ width: `${Math.min(data.percentage, 100)}%` }}
          />
        </div>

        {/* Progress Labels */}
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>$0</span>
          <span>{formatCurrency(data.target)}</span>
        </div>
      </div>
    </div>
  );
}