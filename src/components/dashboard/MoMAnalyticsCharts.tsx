'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, DollarSign } from 'lucide-react';

interface MoMData {
  month: string;
  revenueIssued: number;
  revenueCollected: number;
  changePercent: number;
  status: 'green' | 'orange' | 'red';
}

interface MoMAnalyticsChartsProps {
  data: {
    currentMonth: {
      issued: number;
      collected: number;
      issuedChange: number;
      collectedChange: number;
      status: 'green' | 'orange' | 'red';
    };
    historicalData: MoMData[];
    seasonalPatterns?: {
      strongMonths: string[];
      weakMonths: string[];
      avgGrowthRate: number;
    };
  };
}

export function MoMAnalyticsCharts({ data }: MoMAnalyticsChartsProps) {
  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${Math.round(amount).toLocaleString()}`;
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) {
      return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    } else if (change < 0) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-emerald-400';
    if (change < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-gray-300 text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-200 text-sm">
                {entry.name}: {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const statusColor = data.currentMonth.status === 'green' ? 'border-emerald-500/40 bg-emerald-500/10' :
                     data.currentMonth.status === 'orange' ? 'border-amber-500/40 bg-amber-500/10' :
                     'border-red-500/40 bg-red-500/10';

  return (
    <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-100 mb-1">Month-over-Month Revenue Trends</h3>
          <p className="text-sm text-gray-400">Revenue patterns and growth analysis</p>
        </div>
        <div className={`px-3 py-1 rounded-lg border ${statusColor}`}>
          <span className={`text-sm font-medium ${
            data.currentMonth.status === 'green' ? 'text-emerald-400' :
            data.currentMonth.status === 'orange' ? 'text-amber-400' : 'text-red-400'
          }`}>
            {data.currentMonth.status === 'green' ? 'Strong Growth' :
             data.currentMonth.status === 'orange' ? 'Moderate Growth' : 'Needs Attention'}
          </span>
        </div>
      </div>

      {/* Current Month Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-700/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Revenue Issued MTD</span>
            {getChangeIcon(data.currentMonth.issuedChange)}
          </div>
          <div className="text-xl font-bold text-gray-100 mb-1">
            {formatCurrency(data.currentMonth.issued)}
          </div>
          <div className={`text-sm font-medium ${getChangeColor(data.currentMonth.issuedChange)}`}>
            {data.currentMonth.issuedChange >= 0 ? '+' : ''}{data.currentMonth.issuedChange}% vs last month
          </div>
        </div>

        <div className="bg-gray-700/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Revenue Collected MTD</span>
            {getChangeIcon(data.currentMonth.collectedChange)}
          </div>
          <div className="text-xl font-bold text-gray-100 mb-1">
            {formatCurrency(data.currentMonth.collected)}
          </div>
          <div className={`text-sm font-medium ${getChangeColor(data.currentMonth.collectedChange)}`}>
            {data.currentMonth.collectedChange >= 0 ? '+' : ''}{data.currentMonth.collectedChange}% vs last month
          </div>
        </div>
      </div>

      {/* Historical Trend Chart */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-300 mb-3">6-Month Revenue Trend</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.historicalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="month"
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
                tickFormatter={formatCurrency}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="revenueIssued"
                stroke="#3B82F6"
                strokeWidth={3}
                name="Revenue Issued"
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="revenueCollected"
                stroke="#10B981"
                strokeWidth={3}
                name="Revenue Collected"
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Growth Rate Bar Chart */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Monthly Growth Rates</h4>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.historicalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="month"
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F3F4F6'
                }}
                formatter={(value: number) => [`${value}%`, 'Growth Rate']}
              />
              <Bar dataKey="changePercent" radius={[4, 4, 0, 0]}>
                {data.historicalData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.changePercent > 0 ? '#10B981' : '#EF4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Seasonal Patterns (if available) */}
      {data.seasonalPatterns && (
        <div className="border-t border-gray-700/50 pt-4">
          <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Seasonal Insights
          </h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-400 block mb-1">Strong Months</span>
              <span className="text-emerald-400 font-medium">
                {data.seasonalPatterns.strongMonths.join(', ')}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block mb-1">Weak Months</span>
              <span className="text-amber-400 font-medium">
                {data.seasonalPatterns.weakMonths.join(', ')}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block mb-1">Avg Growth Rate</span>
              <span className={`font-medium ${
                data.seasonalPatterns.avgGrowthRate > 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {data.seasonalPatterns.avgGrowthRate > 0 ? '+' : ''}{data.seasonalPatterns.avgGrowthRate}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Performance Indicator */}
      <div className="mt-4 pt-4 border-t border-gray-700/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Revenue Health</span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              data.currentMonth.status === 'green' ? 'bg-emerald-500' :
              data.currentMonth.status === 'orange' ? 'bg-amber-500' : 'bg-red-500'
            }`} />
            <span className={`font-medium ${
              data.currentMonth.status === 'green' ? 'text-emerald-400' :
              data.currentMonth.status === 'orange' ? 'text-amber-400' : 'text-red-400'
            }`}>
              {data.currentMonth.status === 'green' ? 'Healthy Growth' :
               data.currentMonth.status === 'orange' ? 'Moderate Concern' : 'Requires Action'}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Target: Both issued and collected revenue increasing month-over-month
        </p>
      </div>
    </div>
  );
}