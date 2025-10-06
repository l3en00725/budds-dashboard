'use client';

import { CreditCard, TrendingUp, Activity } from 'lucide-react';

interface GMMetricsData {
  membershipRevenue: {
    monthly: number;
    growth: number;
    silverCount: number;
    platinumCount: number;
  };
  jobPipeline: {
    totalValue: number;
    largeProjects: number; // $10K+
    serviceTickets: number;
    averageValue: number;
  };
  businessHealth: {
    repeatCustomers: number;
    conversionRate: number;
    profitMargin: number;
    emergencyRatio: number;
  };
}

interface GMMetricsCardProps {
  data: GMMetricsData;
}

export function GMMetricsCard({ data }: GMMetricsCardProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Monthly Recurring Revenue */}
      <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400">Monthly Membership Revenue</p>
            <p className="text-2xl font-bold text-gray-100">{formatCurrency(data.membershipRevenue.monthly)}</p>
            <p className="text-sm text-emerald-400">+{data.membershipRevenue.growth}% growth</p>
          </div>
          <CreditCard className="h-8 w-8 text-blue-500" />
        </div>
        <div className="mt-4 space-y-2 text-sm text-gray-400">
          <div className="flex justify-between">
            <span>Silver Members:</span>
            <span className="font-medium text-gray-200">{data.membershipRevenue.silverCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Platinum Members:</span>
            <span className="font-medium text-gray-200">{data.membershipRevenue.platinumCount}</span>
          </div>
        </div>
      </div>

      {/* Job Pipeline Value */}
      <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400">Revenue Pipeline</p>
            <p className="text-2xl font-bold text-gray-100">{formatCurrency(data.jobPipeline.totalValue)}</p>
            <p className="text-sm text-blue-400">Across all projects</p>
          </div>
          <TrendingUp className="h-8 w-8 text-green-500" />
        </div>
        <div className="mt-4 space-y-2 text-sm text-gray-400">
          <div className="flex justify-between">
            <span>Large Projects ($10K+):</span>
            <span className="font-medium text-gray-200">{data.jobPipeline.largeProjects}</span>
          </div>
          <div className="flex justify-between">
            <span>Service Tickets:</span>
            <span className="font-medium text-gray-200">{data.jobPipeline.serviceTickets}</span>
          </div>
          <div className="flex justify-between">
            <span>Avg Job Value:</span>
            <span className="font-medium text-gray-200">{formatCurrency(data.jobPipeline.averageValue)}</span>
          </div>
        </div>
      </div>

      {/* Business Health Metrics */}
      <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400">Business Health</p>
            <p className="text-2xl font-bold text-gray-100">{formatPercent(data.businessHealth.profitMargin)}</p>
            <p className="text-sm text-emerald-400">Profit margin</p>
          </div>
          <Activity className="h-8 w-8 text-purple-500" />
        </div>
        <div className="mt-4 space-y-2 text-sm text-gray-400">
          <div className="flex justify-between">
            <span>Repeat Customers:</span>
            <span className="font-medium text-gray-200">{formatPercent(data.businessHealth.repeatCustomers)}</span>
          </div>
          <div className="flex justify-between">
            <span>Service→Project Rate:</span>
            <span className="font-medium text-gray-200">{formatPercent(data.businessHealth.conversionRate)}</span>
          </div>
          <div className="flex justify-between">
            <span>Emergency Work:</span>
            <span className="font-medium text-gray-200">{formatPercent(data.businessHealth.emergencyRatio)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}