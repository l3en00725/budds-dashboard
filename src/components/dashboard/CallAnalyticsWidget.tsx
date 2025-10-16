'use client';

import { useState } from 'react';
import { Phone, PhoneCall, TrendingUp, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { DashboardMetrics } from "@/lib/dashboard-service";
import { CallDetailsModal } from './CallDetailsModal';

interface CallAnalyticsWidgetProps {
  data: DashboardMetrics['callAnalytics'];
}

export function CallAnalyticsWidget({ data }: CallAnalyticsWidgetProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{
    title: string;
    calls: any[];
    color: 'purple' | 'emerald' | 'red' | 'blue' | 'amber';
  }>({ title: '', calls: [], color: 'purple' });
  const [loading, setLoading] = useState(false);

  const conversionRate = data.today.totalCalls > 0 ? Math.round((data.today.appointmentsBooked / data.today.totalCalls) * 100) : 0;
  const positiveRate = data.today.totalCalls > 0 ? Math.round((data.today.positivesentiment / data.today.totalCalls) * 100) : 0;

  const fetchCallDetails = async (category: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/calls/by-category?category=${category}&date=today`);
      const result = await response.json();

      let title = '';
      let color: 'purple' | 'emerald' | 'red' | 'blue' | 'amber' = 'purple';

      switch (category) {
        case 'booked':
          title = 'Appointments Booked';
          color = 'emerald';
          break;
        case 'emergency':
          title = 'Emergency Calls';
          color = 'red';
          break;
        case 'followup':
          title = 'Follow-ups Scheduled';
          color = 'blue';
          break;
        case 'total':
          title = 'All Calls Today';
          color = 'purple';
          break;
      }

      setModalData({ title, calls: result.calls || [], color });
      setModalOpen(true);
    } catch (error) {
      console.error('Error fetching call details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 70) return 'text-emerald-600 bg-emerald-50';
    if (percentage >= 50) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const pipelineData = [
    { label: 'Qualified', count: data.today.pipelineBreakdown.qualified, color: 'bg-emerald-500' },
    { label: 'Follow-Up', count: data.today.pipelineBreakdown.followUp, color: 'bg-blue-500' },
    { label: 'New Leads', count: data.today.pipelineBreakdown.newLeads, color: 'bg-purple-500' },
    { label: 'Closed-Lost', count: data.today.pipelineBreakdown.closedLost, color: 'bg-gray-400' },
  ];

  const getTrendIcon = (change: number) => {
    if (change > 0) return { icon: '↗️', color: 'text-emerald-600' };
    if (change < 0) return { icon: '↘️', color: 'text-red-600' };
    return { icon: '→', color: 'text-gray-600' };
  };

  return (
    <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-sm hover:shadow-lg transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100">
            <Phone className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold gradient-text text-xl">Today's Call Intelligence</h3>
            <p className="text-sm gradient-text">AI-powered call analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs gradient-text">Live AI</span>
        </div>
      </div>

      {/* Today's Metrics */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold gradient-text mb-3">Today's Performance</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Calls */}
          <button
            onClick={() => fetchCallDetails('total')}
            className="text-center p-3 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-md hover:scale-105 transition-all cursor-pointer w-full"
          >
            <PhoneCall className="h-5 w-5 text-purple-600 mx-auto mb-1" />
            <div className="text-xl font-bold gradient-text">{data.today.totalCalls}</div>
            <div className="text-xs gradient-text">Total Calls</div>
          </button>

          {/* Appointments Booked */}
          <button
            onClick={() => fetchCallDetails('booked')}
            className="text-center p-3 rounded-xl bg-emerald-50 hover:shadow-md hover:scale-105 transition-all cursor-pointer w-full"
          >
            <CheckCircle className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
            <div className="text-xl font-bold text-emerald-700">{data.today.appointmentsBooked}</div>
            <div className="text-xs text-emerald-600">Appointments</div>
          </button>

          {/* Emergency Calls */}
          <button
            onClick={() => fetchCallDetails('emergency')}
            className="text-center p-3 rounded-xl bg-red-50 hover:shadow-md hover:scale-105 transition-all cursor-pointer w-full"
          >
            <AlertTriangle className="h-5 w-5 text-red-600 mx-auto mb-1" />
            <div className="text-xl font-bold text-red-700">{data.today.emergencyCallsToday}</div>
            <div className="text-xs text-red-600">Emergency</div>
          </button>

          {/* Follow-ups */}
          <button
            onClick={() => fetchCallDetails('followup')}
            className="text-center p-3 rounded-xl bg-blue-50 hover:shadow-md hover:scale-105 transition-all cursor-pointer w-full"
          >
            <Clock className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <div className="text-xl font-bold text-blue-700">{data.today.followUpsScheduled}</div>
            <div className="text-xs text-blue-600">Follow-ups</div>
          </button>
        </div>
      </div>

      {/* Performance Rates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Conversion Rate */}
        <div className="p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Conversion Rate</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(conversionRate)}`}>
              {conversionRate}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
              style={{ width: `${Math.min(conversionRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Positive Sentiment */}
        <div className="p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Positive Sentiment</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(positiveRate)}`}>
              {positiveRate}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500"
              style={{ width: `${Math.min(positiveRate, 100)}%` }}
            />
          </div>
        </div>

        {/* AI Confidence */}
        <div className="p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">AI Confidence</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(data.today.averageConfidence)}`}>
              {data.today.averageConfidence}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-500"
              style={{ width: `${Math.min(data.today.averageConfidence, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Weekly Trends */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold gradient-text mb-3">This Week vs Last Week</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Calls Trend */}
          <div className="p-4 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Total Calls</span>
              <div className="flex items-center gap-1">
                <span className={`text-lg ${getTrendIcon(data.thisWeek.trends.callsChange).color}`}>
                  {getTrendIcon(data.thisWeek.trends.callsChange).icon}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {Math.abs(data.thisWeek.trends.callsChange)}%
                </span>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{data.thisWeek.totalCalls}</div>
            <div className="text-xs text-gray-500">this week</div>
          </div>

          {/* Appointments Trend */}
          <div className="p-4 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Appointments</span>
              <div className="flex items-center gap-1">
                <span className={`text-lg ${getTrendIcon(data.thisWeek.trends.bookedChange).color}`}>
                  {getTrendIcon(data.thisWeek.trends.bookedChange).icon}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {Math.abs(data.thisWeek.trends.bookedChange)}%
                </span>
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-700">{data.thisWeek.appointmentsBooked}</div>
            <div className="text-xs text-emerald-600">this week</div>
          </div>

          {/* Emergency Trend */}
          <div className="p-4 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Emergency</span>
              <div className="flex items-center gap-1">
                <span className={`text-lg ${getTrendIcon(data.thisWeek.trends.emergencyChange).color}`}>
                  {getTrendIcon(data.thisWeek.trends.emergencyChange).icon}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {Math.abs(data.thisWeek.trends.emergencyChange)}%
                </span>
              </div>
            </div>
            <div className="text-2xl font-bold text-red-700">{data.thisWeek.emergencyCallsWeek}</div>
            <div className="text-xs text-red-600">this week</div>
          </div>
        </div>
      </div>

      {/* Pipeline Breakdown */}
      <div>
        <h4 className="text-sm font-medium gradient-text mb-3">Sales Pipeline Breakdown</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {pipelineData.map((item, index) => (
            <div key={index} className="text-center p-3 rounded-lg border border-gray-100">
              <div className={`w-3 h-3 rounded-full ${item.color} mx-auto mb-2`}></div>
              <div className="text-lg font-bold text-gray-900">{item.count}</div>
              <div className="text-xs text-gray-500">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      {data.today.totalCalls > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Not Interested: <span className="font-medium text-gray-900">{data.today.notInterested}</span>
            </span>
            {data.today.averageConfidence > 80 && (
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                High Quality Analysis
              </span>
            )}
          </div>
        </div>
      )}

      {/* Call Details Modal */}
      <CallDetailsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalData.title}
        calls={modalData.calls}
        categoryColor={modalData.color}
      />
    </div>
  );
}