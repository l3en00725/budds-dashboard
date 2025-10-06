'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { RefreshCw, TrendingUp, TrendingDown, Target, Clock, DollarSign, Calendar, AlertCircle } from 'lucide-react';

interface DailyRevenueData {
  date: string;
  actualRevenue: number;
  targetRevenue: number;
  jobberRevenue: number;
  quickbooksRevenue: number;
  dailyGoal: number;
  percentage: number;
  status: 'green' | 'orange' | 'red';
  jobsCompleted: number;
}

interface RevenueSource {
  source: 'Jobber';
  amount: number;
  percentage: number;
  lastSync: string;
  status: 'connected' | 'syncing' | 'error';
}

interface DailyRevenueTrackerProps {
  data: {
    today: {
      current: number;
      target: number;
      percentage: number;
      status: 'green' | 'orange' | 'red';
      lastUpdate: string;
      sources: RevenueSource[];
    };
    weeklyData: DailyRevenueData[];
    monthlyProgress: {
      currentMTD: number;
      targetMTD: number;
      daysInMonth: number;
      daysElapsed: number;
      projectedEOM: number;
      onPace: boolean;
    };
    realTimeUpdates: boolean;
  };
}

export function DailyRevenueTracker({ data }: DailyRevenueTrackerProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${Math.round(amount).toLocaleString()}`;
  };

  const formatTime = (date: string | Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'green': return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
      case 'orange': return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
      case 'red': return 'text-red-400 border-red-500/40 bg-red-500/10';
      default: return 'text-gray-400 border-gray-500/40 bg-gray-500/10';
    }
  };

  const getSourceStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <div className="w-2 h-2 bg-emerald-500 rounded-full" />;
      case 'syncing': return <RefreshCw className="h-3 w-3 text-blue-400 animate-spin" />;
      case 'error': return <AlertCircle className="h-3 w-3 text-red-400" />;
      default: return <div className="w-2 h-2 bg-gray-500 rounded-full" />;
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Simulate API call for manual refresh
      await new Promise(resolve => setTimeout(resolve, 2000));
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh during business hours
  useEffect(() => {
    if (!data.realTimeUpdates) return;

    const interval = setInterval(() => {
      const now = new Date();
      const hour = now.getHours();
      // Auto-refresh every 2 minutes during business hours (8 AM - 6 PM)
      if (hour >= 8 && hour < 18) {
        setLastRefresh(new Date());
      }
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [data.realTimeUpdates]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-gray-300 text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-200">
                {entry.name}: {formatCurrency(entry.value)}
              </span>
              {entry.dataKey === 'actualRevenue' && entry.payload.percentage && (
                <span className={`ml-2 text-xs ${
                  entry.payload.percentage >= 100 ? 'text-emerald-400' :
                  entry.payload.percentage >= 75 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  ({entry.payload.percentage.toFixed(0)}% of goal)
                </span>
              )}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const todayData = data.today;
  const remaining = Math.max(0, todayData.target - todayData.current);

  return (
    <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6 shadow-xl">
      {/* Header with Real-time Indicator */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-semibold text-gray-100">Daily Revenue Tracking</h3>
            {data.realTimeUpdates && (
              <div className="flex items-center gap-2 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs text-emerald-400 font-medium">Live</span>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-400">
            Real-time revenue tracking with source breakdown
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-gray-500">Last updated</div>
            <div className="text-sm text-gray-300">{formatTime(todayData.lastUpdate)}</div>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors disabled:opacity-50"
            title="Manual refresh"
          >
            <RefreshCw className={`h-4 w-4 text-gray-300 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Today's Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-700/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-gray-400">Today's Revenue</span>
          </div>
          <div className="text-2xl font-bold text-gray-100 mb-1">
            {formatCurrency(todayData.current)}
          </div>
          <div className={`text-sm font-medium ${
            todayData.percentage >= 100 ? 'text-emerald-400' :
            todayData.percentage >= 75 ? 'text-amber-400' : 'text-red-400'
          }`}>
            {todayData.percentage.toFixed(0)}% of daily goal
          </div>
        </div>

        <div className="bg-gray-700/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-green-400" />
            <span className="text-sm text-gray-400">Daily Goal</span>
          </div>
          <div className="text-2xl font-bold text-gray-100 mb-1">
            {formatCurrency(todayData.target)}
          </div>
          <div className="text-sm text-gray-400">
            {formatCurrency(remaining)} remaining
          </div>
        </div>

        <div className="bg-gray-700/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-gray-400">MTD Progress</span>
          </div>
          <div className="text-2xl font-bold text-gray-100 mb-1">
            {formatCurrency(data.monthlyProgress.currentMTD)}
          </div>
          <div className={`text-sm font-medium ${
            data.monthlyProgress.onPace ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {data.monthlyProgress.onPace ? 'On pace' : 'Behind pace'}
          </div>
        </div>

        <div className="bg-gray-700/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-amber-400" />
            <span className="text-sm text-gray-400">EOM Projection</span>
          </div>
          <div className="text-2xl font-bold text-gray-100 mb-1">
            {formatCurrency(data.monthlyProgress.projectedEOM)}
          </div>
          <div className={`text-sm font-medium ${
            data.monthlyProgress.projectedEOM >= data.monthlyProgress.targetMTD ? 'text-emerald-400' : 'text-red-400'
          }`}>
            vs {formatCurrency(data.monthlyProgress.targetMTD)} target
          </div>
        </div>
      </div>

      {/* Weekly Revenue Trend */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-300 mb-3">7-Day Revenue Trend</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })}
              />
              <YAxis
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
                tickFormatter={formatCurrency}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Target line */}
              <Line
                type="monotone"
                dataKey="targetRevenue"
                stroke="#6B7280"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Daily Target"
                dot={false}
              />

              {/* Actual revenue area */}
              <Area
                type="monotone"
                dataKey="actualRevenue"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.1}
                strokeWidth={3}
                name="Actual Revenue"
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue Sources Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Source Breakdown */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">Revenue Sources Today</h4>
          <div className="space-y-3">
            {todayData.sources.map((source, index) => (
              <div key={index} className="bg-gray-700/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getSourceStatusIcon(source.status)}
                    <span className="text-sm font-medium text-gray-200">{source.source}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-100">
                      {formatCurrency(source.amount)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {source.percentage.toFixed(1)}% of total
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Last sync: {formatTime(source.lastSync)}</span>
                  <span className={`px-2 py-1 rounded-full ${
                    source.status === 'connected' ? 'bg-emerald-500/20 text-emerald-400' :
                    source.status === 'syncing' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {source.status}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-3 w-full bg-gray-600/50 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${source.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily vs Monthly Targets */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">Target Performance</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                {
                  name: 'Daily',
                  actual: todayData.current,
                  target: todayData.target,
                  percentage: todayData.percentage
                },
                {
                  name: 'Monthly',
                  actual: data.monthlyProgress.currentMTD,
                  target: data.monthlyProgress.targetMTD,
                  percentage: (data.monthlyProgress.currentMTD / data.monthlyProgress.targetMTD) * 100
                }
              ]}>
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
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'actual' ? 'Actual' : 'Target'
                  ]}
                />
                <Bar dataKey="target" fill="#6B7280" name="target" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" fill="#3B82F6" name="actual" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className={`p-4 rounded-xl border ${getStatusColor(todayData.status)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              todayData.status === 'green' ? 'bg-emerald-500/20' :
              todayData.status === 'orange' ? 'bg-amber-500/20' : 'bg-red-500/20'
            }`}>
              {todayData.percentage >= 100 ? (
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              ) : todayData.percentage >= 75 ? (
                <Clock className="h-5 w-5 text-amber-400" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-400" />
              )}
            </div>
            <div>
              <div className={`font-medium ${
                todayData.status === 'green' ? 'text-emerald-400' :
                todayData.status === 'orange' ? 'text-amber-400' : 'text-red-400'
              }`}>
                {todayData.status === 'green' ? 'Exceeding Daily Goal' :
                 todayData.status === 'orange' ? 'On Track to Goal' : 'Behind Daily Goal'}
              </div>
              <div className="text-sm text-gray-400">
                {todayData.percentage >= 100 ? 'Goal achieved! ' : `${formatCurrency(remaining)} needed to reach goal`}
                {data.monthlyProgress.onPace ? ' • On pace for monthly target' : ' • Behind monthly pace'}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Updates every</div>
            <div className="text-sm font-medium text-gray-200">
              {data.realTimeUpdates ? '2 minutes' : 'Manual refresh'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to create a composed chart that shows bars and lines
function ComposedChart({ children, ...props }: any) {
  return (
    <AreaChart {...props}>
      {children}
    </AreaChart>
  );
}