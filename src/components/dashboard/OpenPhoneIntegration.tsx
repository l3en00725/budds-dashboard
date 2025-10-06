'use client';

import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter } from 'recharts';
import { Phone, PhoneCall, TrendingUp, TrendingDown, Clock, Users, DollarSign, Settings, Link, AlertCircle, CheckCircle, PhoneIncoming, PhoneMissed } from 'lucide-react';

interface CallAnalytics {
  totalCalls: number;
  appointmentsBooked: number;
  conversionRate: number;
  averageDuration: number;
  revenueGenerated: number;
  revenuePerCall: number;
}

interface CallVolumeData {
  hour: string;
  inbound: number;
  outbound: number;
  booked: number;
}

interface CallPerformanceData {
  date: string;
  calls: number;
  booked: number;
  revenue: number;
  conversionRate: number;
}

interface CallSourceData {
  source: string;
  calls: number;
  bookings: number;
  revenue: number;
  conversionRate: number;
}

interface OpenPhoneIntegrationProps {
  connectionStatus: 'connected' | 'disconnected' | 'setup_required';
  analytics: {
    today: CallAnalytics;
    thisWeek: CallAnalytics;
    thisMonth: CallAnalytics;
  };
  callVolumeData: CallVolumeData[];
  performanceData: CallPerformanceData[];
  sourceData: CallSourceData[];
  revenueCorrelation: {
    callsToRevenueRatio: number;
    peakCallHours: string[];
    highestRevenueDay: string;
    conversionTrends: 'improving' | 'declining' | 'stable';
  };
  onConnect: () => void;
  onConfigure: () => void;
  onViewDetails: (type: 'calls' | 'bookings' | 'revenue') => void;
}

export function OpenPhoneIntegration({
  connectionStatus,
  analytics,
  callVolumeData,
  performanceData,
  sourceData,
  revenueCorrelation,
  onConnect,
  onConfigure,
  onViewDetails
}: OpenPhoneIntegrationProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'thisWeek' | 'thisMonth'>('today');

  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${Math.round(amount).toLocaleString()}`;
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case 'disconnected':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'setup_required':
        return <Settings className="h-5 w-5 text-amber-500" />;
      default:
        return <Phone className="h-5 w-5 text-gray-500" />;
    }
  };

  const getConnectionColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400';
      case 'disconnected':
        return 'border-red-500/40 bg-red-500/10 text-red-400';
      case 'setup_required':
        return 'border-amber-500/40 bg-amber-500/10 text-amber-400';
      default:
        return 'border-gray-500/40 bg-gray-500/10 text-gray-400';
    }
  };

  const getConnectionText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'disconnected': return 'Disconnected';
      case 'setup_required': return 'Setup Required';
      default: return 'Unknown';
    }
  };

  const currentAnalytics = analytics[selectedPeriod];

  // Setup Required View
  if (connectionStatus === 'setup_required') {
    return (
      <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-xl">
        <div className="text-center py-12">
          <div className="p-4 rounded-full bg-amber-500/20 inline-block mb-4">
            <Phone className="h-12 w-12 text-amber-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-100 mb-2">
            OpenPhone Integration Setup
          </h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Connect your OpenPhone account to track call analytics, monitor conversion rates,
            and correlate phone activity with revenue generation.
          </p>
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span>Real-time call tracking and analytics</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span>Appointment booking conversion rates</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span>Call-to-revenue correlation analysis</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span>Peak performance time identification</span>
            </div>
          </div>
          <button
            onClick={onConnect}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 mx-auto"
          >
            <Link className="h-4 w-4" />
            Connect OpenPhone
          </button>
        </div>
      </div>
    );
  }

  // Disconnected View
  if (connectionStatus === 'disconnected') {
    return (
      <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-xl">
        <div className="text-center py-8">
          <div className="p-4 rounded-full bg-red-500/20 inline-block mb-4">
            <PhoneMissed className="h-8 w-8 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-100 mb-2">
            OpenPhone Connection Lost
          </h3>
          <p className="text-gray-400 mb-4">
            Unable to connect to OpenPhone. Please check your connection and try again.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onConnect}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Reconnect
            </button>
            <button
              onClick={onConfigure}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            >
              Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Connected View with Full Analytics
  return (
    <div className="space-y-6">
      {/* Header with Connection Status */}
      <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Phone className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-100">OpenPhone Integration</h3>
              <p className="text-sm text-gray-400">Call analytics and revenue correlation</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-lg border flex items-center gap-2 ${getConnectionColor()}`}>
              {getConnectionIcon()}
              <span className="text-sm font-medium">{getConnectionText()}</span>
            </div>
            <button
              onClick={onConfigure}
              className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors"
              title="Configure integration"
            >
              <Settings className="h-4 w-4 text-gray-300" />
            </button>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2 mb-4">
          {(['today', 'thisWeek', 'thisMonth'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                selectedPeriod === period
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {period === 'today' ? 'Today' : period === 'thisWeek' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-gray-700/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <PhoneCall className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-gray-400">Total Calls</span>
            </div>
            <div className="text-xl font-bold text-gray-100 mb-1">
              {currentAnalytics.totalCalls}
            </div>
            <button
              onClick={() => onViewDetails('calls')}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              View details
            </button>
          </div>

          <div className="bg-gray-700/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-gray-400">Bookings</span>
            </div>
            <div className="text-xl font-bold text-gray-100 mb-1">
              {currentAnalytics.appointmentsBooked}
            </div>
            <button
              onClick={() => onViewDetails('bookings')}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              View details
            </button>
          </div>

          <div className="bg-gray-700/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-gray-400">Conversion</span>
            </div>
            <div className="text-xl font-bold text-gray-100 mb-1">
              {currentAnalytics.conversionRate.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">
              of calls booked
            </div>
          </div>

          <div className="bg-gray-700/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-gray-400">Avg Duration</span>
            </div>
            <div className="text-xl font-bold text-gray-100 mb-1">
              {formatDuration(currentAnalytics.averageDuration)}
            </div>
            <div className="text-xs text-gray-500">
              per call
            </div>
          </div>

          <div className="bg-gray-700/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-gray-400">Revenue</span>
            </div>
            <div className="text-xl font-bold text-gray-100 mb-1">
              {formatCurrency(currentAnalytics.revenueGenerated)}
            </div>
            <button
              onClick={() => onViewDetails('revenue')}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              View details
            </button>
          </div>

          <div className="bg-gray-700/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-gray-400">Per Call</span>
            </div>
            <div className="text-xl font-bold text-gray-100 mb-1">
              {formatCurrency(currentAnalytics.revenuePerCall)}
            </div>
            <div className="text-xs text-gray-500">
              avg revenue
            </div>
          </div>
        </div>
      </div>

      {/* Call Volume and Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Call Volume by Hour */}
        <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-xl">
          <h4 className="text-lg font-semibold text-gray-100 mb-4">Call Volume by Hour</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={callVolumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="hour"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Bar dataKey="inbound" fill="#3B82F6" name="Inbound" radius={[2, 2, 0, 0]} />
                <Bar dataKey="outbound" fill="#8B5CF6" name="Outbound" radius={[2, 2, 0, 0]} />
                <Bar dataKey="booked" fill="#10B981" name="Booked" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Trends */}
        <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-xl">
          <h4 className="text-lg font-semibold text-gray-100 mb-4">Performance Trends</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis
                  yAxisId="calls"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="rate"
                  orientation="right"
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
                />
                <Line
                  yAxisId="calls"
                  type="monotone"
                  dataKey="calls"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="Total Calls"
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 3 }}
                />
                <Line
                  yAxisId="rate"
                  type="monotone"
                  dataKey="conversionRate"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="Conversion Rate (%)"
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Call Sources and Revenue Correlation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Call Sources Performance */}
        <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-xl">
          <h4 className="text-lg font-semibold text-gray-100 mb-4">Call Sources Performance</h4>
          <div className="space-y-4">
            {sourceData.map((source, index) => (
              <div key={index} className="bg-gray-700/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-100">{source.source}</span>
                  <span className="text-sm text-gray-400">{source.calls} calls</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400 block">Bookings</span>
                    <span className="text-emerald-400 font-medium">{source.bookings}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Revenue</span>
                    <span className="text-blue-400 font-medium">{formatCurrency(source.revenue)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Conversion</span>
                    <span className="text-purple-400 font-medium">{source.conversionRate.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="mt-3 w-full bg-gray-600/50 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${source.conversionRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Correlation Insights */}
        <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-xl">
          <h4 className="text-lg font-semibold text-gray-100 mb-4">Revenue Correlation Insights</h4>
          <div className="space-y-4">
            <div className="bg-gray-700/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-medium text-gray-200">Calls to Revenue Ratio</span>
              </div>
              <div className="text-2xl font-bold text-emerald-400 mb-1">
                {revenueCorrelation.callsToRevenueRatio.toFixed(1)}:1
              </div>
              <div className="text-xs text-gray-500">
                Average revenue per call relationship
              </div>
            </div>

            <div className="bg-gray-700/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium text-gray-200">Peak Call Hours</span>
              </div>
              <div className="text-lg font-bold text-amber-400 mb-1">
                {revenueCorrelation.peakCallHours.join(', ')}
              </div>
              <div className="text-xs text-gray-500">
                Highest volume and conversion times
              </div>
            </div>

            <div className="bg-gray-700/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-gray-200">Best Revenue Day</span>
              </div>
              <div className="text-lg font-bold text-blue-400 mb-1">
                {revenueCorrelation.highestRevenueDay}
              </div>
              <div className="text-xs text-gray-500">
                Top performing day this period
              </div>
            </div>

            <div className="bg-gray-700/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                {revenueCorrelation.conversionTrends === 'improving' ? (
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                ) : revenueCorrelation.conversionTrends === 'declining' ? (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                ) : (
                  <Clock className="h-4 w-4 text-gray-400" />
                )}
                <span className="text-sm font-medium text-gray-200">Conversion Trends</span>
              </div>
              <div className={`text-lg font-bold mb-1 ${
                revenueCorrelation.conversionTrends === 'improving' ? 'text-emerald-400' :
                revenueCorrelation.conversionTrends === 'declining' ? 'text-red-400' : 'text-gray-400'
              }`}>
                {revenueCorrelation.conversionTrends.charAt(0).toUpperCase() + revenueCorrelation.conversionTrends.slice(1)}
              </div>
              <div className="text-xs text-gray-500">
                Booking rate trend analysis
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}