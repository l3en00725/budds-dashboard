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
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Monthly Membership Revenue</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.membershipRevenue.monthly)}</p>
            <p className="text-sm text-green-600">+{data.membershipRevenue.growth}% growth</p>
          </div>
          <CreditCard className="h-8 w-8 text-blue-500" />
        </div>
        <div className="mt-4 space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Silver Members:</span>
            <span className="font-medium">{data.membershipRevenue.silverCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Platinum Members:</span>
            <span className="font-medium">{data.membershipRevenue.platinumCount}</span>
          </div>
        </div>
      </div>

      {/* Job Pipeline Value */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Revenue Pipeline</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.jobPipeline.totalValue)}</p>
            <p className="text-sm text-blue-600">Across all projects</p>
          </div>
          <TrendingUp className="h-8 w-8 text-green-500" />
        </div>
        <div className="mt-4 space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Large Projects ($10K+):</span>
            <span className="font-medium">{data.jobPipeline.largeProjects}</span>
          </div>
          <div className="flex justify-between">
            <span>Service Tickets:</span>
            <span className="font-medium">{data.jobPipeline.serviceTickets}</span>
          </div>
          <div className="flex justify-between">
            <span>Avg Job Value:</span>
            <span className="font-medium">{formatCurrency(data.jobPipeline.averageValue)}</span>
          </div>
        </div>
      </div>

      {/* Business Health Metrics */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Business Health</p>
            <p className="text-2xl font-bold text-gray-900">{formatPercent(data.businessHealth.profitMargin)}</p>
            <p className="text-sm text-green-600">Profit margin</p>
          </div>
          <Activity className="h-8 w-8 text-purple-500" />
        </div>
        <div className="mt-4 space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Repeat Customers:</span>
            <span className="font-medium">{formatPercent(data.businessHealth.repeatCustomers)}</span>
          </div>
          <div className="flex justify-between">
            <span>Service→Project Rate:</span>
            <span className="font-medium">{formatPercent(data.businessHealth.conversionRate)}</span>
          </div>
          <div className="flex justify-between">
            <span>Emergency Work:</span>
            <span className="font-medium">{formatPercent(data.businessHealth.emergencyRatio)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}