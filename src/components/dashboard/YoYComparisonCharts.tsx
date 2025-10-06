'use client';

import React from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { Calendar, TrendingUp, TrendingDown, BarChart3, Target, Award } from 'lucide-react';

interface YoYData {
  month: string;
  currentYear: number;
  previousYear: number;
  growthPercent: number;
  status: 'ahead' | 'behind' | 'on-track';
}

interface YoYComparisonChartsProps {
  data: {
    ytdSummary: {
      currentYTD: number;
      previousYTD: number;
      growthPercent: number;
      status: 'green' | 'orange' | 'red';
      daysIntoYear: number;
    };
    monthlyComparison: YoYData[];
    quarterlyBreakdown: {
      q1: { current: number; previous: number; growth: number };
      q2: { current: number; previous: number; growth: number };
      q3: { current: number; previous: number; growth: number };
      q4: { current: number; previous: number; growth: number };
    };
    projections: {
      yearEndProjection: number;
      confidenceLevel: 'high' | 'medium' | 'low';
      targetAchievement: number; // percentage of annual target achieved
    };
  };
}

export function YoYComparisonCharts({ data }: YoYComparisonChartsProps) {
  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${Math.round(amount).toLocaleString()}`;
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (growth < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <BarChart3 className="h-4 w-4 text-gray-500" />;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 10) return 'text-emerald-400';
    if (growth > 0) return 'text-blue-400';
    if (growth > -5) return 'text-amber-400';
    return 'text-red-400';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'green': return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400';
      case 'orange': return 'border-amber-500/40 bg-amber-500/10 text-amber-400';
      case 'red': return 'border-red-500/40 bg-red-500/10 text-red-400';
      default: return 'border-gray-500/40 bg-gray-500/10 text-gray-400';
    }
  };

  const quarterlyData = [
    { name: 'Q1', current: data.quarterlyBreakdown.q1.current, previous: data.quarterlyBreakdown.q1.previous, growth: data.quarterlyBreakdown.q1.growth },
    { name: 'Q2', current: data.quarterlyBreakdown.q2.current, previous: data.quarterlyBreakdown.q2.previous, growth: data.quarterlyBreakdown.q2.growth },
    { name: 'Q3', current: data.quarterlyBreakdown.q3.current, previous: data.quarterlyBreakdown.q3.previous, growth: data.quarterlyBreakdown.q3.growth },
    { name: 'Q4', current: data.quarterlyBreakdown.q4.current, previous: data.quarterlyBreakdown.q4.previous, growth: data.quarterlyBreakdown.q4.growth }
  ];

  const targetData = [
    { name: 'Achieved', value: data.projections.targetAchievement, color: '#10B981' },
    { name: 'Remaining', value: 100 - data.projections.targetAchievement, color: '#374151' }
  ];

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

  return (
    <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-100 mb-1">Year-over-Year Performance</h3>
          <p className="text-sm text-gray-400">Annual growth trends and projections</p>
        </div>
        <div className={`px-3 py-1 rounded-lg border ${getStatusColor(data.ytdSummary.status)}`}>
          <span className="text-sm font-medium">
            {data.ytdSummary.growthPercent >= 0 ? '+' : ''}{data.ytdSummary.growthPercent}% YTD
          </span>
        </div>
      </div>

      {/* YTD Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-700/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-gray-400">Current YTD</span>
          </div>
          <div className="text-xl font-bold text-gray-100">
            {formatCurrency(data.ytdSummary.currentYTD)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {data.ytdSummary.daysIntoYear} days into year
          </div>
        </div>

        <div className="bg-gray-700/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-amber-400" />
            <span className="text-sm text-gray-400">Previous YTD</span>
          </div>
          <div className="text-xl font-bold text-gray-100">
            {formatCurrency(data.ytdSummary.previousYTD)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Same period last year
          </div>
        </div>

        <div className="bg-gray-700/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            {getGrowthIcon(data.ytdSummary.growthPercent)}
            <span className="text-sm text-gray-400">Growth Rate</span>
          </div>
          <div className={`text-xl font-bold ${getGrowthColor(data.ytdSummary.growthPercent)}`}>
            {data.ytdSummary.growthPercent >= 0 ? '+' : ''}{data.ytdSummary.growthPercent}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Year-over-year change
          </div>
        </div>
      </div>

      {/* Monthly YoY Comparison Chart */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Monthly Year-over-Year Comparison</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.monthlyComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="month"
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                yAxisId="revenue"
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
                tickFormatter={formatCurrency}
              />
              <YAxis
                yAxisId="growth"
                orientation="right"
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                yAxisId="revenue"
                dataKey="previousYear"
                fill="#6B7280"
                name="Previous Year"
                radius={[2, 2, 0, 0]}
                opacity={0.7}
              />
              <Bar
                yAxisId="revenue"
                dataKey="currentYear"
                fill="#3B82F6"
                name="Current Year"
                radius={[2, 2, 0, 0]}
              />
              <Line
                yAxisId="growth"
                type="monotone"
                dataKey="growthPercent"
                stroke="#10B981"
                strokeWidth={3}
                name="Growth %"
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quarterly Performance & Target Achievement */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Quarterly Breakdown */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">Quarterly Performance</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={quarterlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="name"
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
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Bar dataKey="previous" fill="#6B7280" name="Previous Year" />
                <Bar dataKey="current" fill="#3B82F6" name="Current Year" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Target Achievement */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Annual Target Progress
          </h4>
          <div className="h-48 flex items-center justify-center">
            <div className="relative">
              <PieChart width={200} height={200}>
                <Pie
                  data={targetData}
                  cx={100}
                  cy={100}
                  innerRadius={60}
                  outerRadius={90}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                >
                  {targetData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-100">
                    {Math.round(data.projections.targetAchievement)}%
                  </div>
                  <div className="text-xs text-gray-400">of target</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Year-End Projections */}
      <div className="bg-gray-700/30 rounded-xl p-4 mb-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
          <Award className="h-4 w-4 text-blue-400" />
          Year-End Projections
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="text-gray-400 text-sm block mb-1">Projected Revenue</span>
            <div className="text-lg font-bold text-gray-100">
              {formatCurrency(data.projections.yearEndProjection)}
            </div>
          </div>
          <div>
            <span className="text-gray-400 text-sm block mb-1">Confidence Level</span>
            <div className={`text-lg font-bold ${
              data.projections.confidenceLevel === 'high' ? 'text-emerald-400' :
              data.projections.confidenceLevel === 'medium' ? 'text-amber-400' : 'text-red-400'
            }`}>
              {data.projections.confidenceLevel.charAt(0).toUpperCase() + data.projections.confidenceLevel.slice(1)}
            </div>
          </div>
          <div>
            <span className="text-gray-400 text-sm block mb-1">Target Achievement</span>
            <div className={`text-lg font-bold ${
              data.projections.targetAchievement >= 100 ? 'text-emerald-400' :
              data.projections.targetAchievement >= 90 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {Math.round(data.projections.targetAchievement)}%
            </div>
          </div>
        </div>
      </div>

      {/* Performance Indicator */}
      <div className="pt-4 border-t border-gray-700/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">YoY Performance</span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              data.ytdSummary.status === 'green' ? 'bg-emerald-500' :
              data.ytdSummary.status === 'orange' ? 'bg-amber-500' : 'bg-red-500'
            }`} />
            <span className={`font-medium ${
              data.ytdSummary.status === 'green' ? 'text-emerald-400' :
              data.ytdSummary.status === 'orange' ? 'text-amber-400' : 'text-red-400'
            }`}>
              {data.ytdSummary.status === 'green' ? 'Exceeding Expectations' :
               data.ytdSummary.status === 'orange' ? 'Meeting Expectations' : 'Below Expectations'}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Target: 10%+ YoY growth = Exceeding, 5-10% = Meeting, &lt;5% = Below expectations
        </p>
      </div>
    </div>
  );
}