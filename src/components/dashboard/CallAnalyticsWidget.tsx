'use client';

import { useState } from 'react';
import { Phone, PhoneCall, TrendingUp, Clock, AlertTriangle, CheckCircle, X, ExternalLink } from "lucide-react";
import { DashboardMetrics } from "@/lib/dashboard-service";

interface CallAnalyticsWidgetProps {
  data: DashboardMetrics['callAnalytics'];
}

interface CallDetails {
  call_id: string;
  caller_number: string;
  direction: 'inbound' | 'outbound';
  duration: number;
  call_date: string;
  transcript: string | null;
  classified_as_booked: boolean | null;
  classification_confidence: number | null;
  outcome?: string;
  pipeline_stage?: string;
  sentiment?: string;
  notes?: string;
}

interface CallDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  calls: CallDetails[];
  title: string;
  type: 'total' | 'appointments' | 'emergency' | 'followups' | 'pipeline';
}

function CallDetailsModal({ isOpen, onClose, calls, title, type }: CallDetailsModalProps) {
  console.log('Modal render:', { isOpen, calls: calls?.length, title, type });

  if (!isOpen) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getConfidenceColor = (confidence: number | null) => {
    if (!confidence) return 'text-gray-500';
    if (confidence >= 80) return 'text-emerald-600';
    if (confidence >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getDirectionIcon = (direction: string) => {
    return direction === 'inbound' ? '📞' : '📱';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Phone className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                  <p className="text-sm text-gray-500">{calls?.length || 0} calls • {type} classification</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Calls List */}
            <div className="max-h-96 overflow-y-auto">
              {calls?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Phone className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No calls found for this category</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {calls?.map((call, index) => (
                    <div key={call.call_id} className="border rounded-lg p-4 hover:bg-gray-50">
                      {/* Call Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{getDirectionIcon(call.direction)}</span>
                          <div>
                            <div className="font-medium text-gray-900">
                              {call.caller_number || 'Unknown Number'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatDate(call.call_date)} • {formatDuration(call.duration)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {call.classified_as_booked !== null && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              call.classified_as_booked
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {call.classified_as_booked ? 'Appointment Booked' : 'No Appointment'}
                            </span>
                          )}
                          {call.classification_confidence && (
                            <span className={`text-xs font-medium ${getConfidenceColor(call.classification_confidence)}`}>
                              {call.classification_confidence}% confidence
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Call Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Call ID</span>
                          <p className="text-sm text-gray-900 font-mono">{call.call_id}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Direction</span>
                          <p className="text-sm text-gray-900 capitalize">{call.direction}</p>
                        </div>
                        {call.outcome && (
                          <div>
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Outcome</span>
                            <p className="text-sm text-gray-900">{call.outcome}</p>
                          </div>
                        )}
                        {call.sentiment && (
                          <div>
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sentiment</span>
                            <p className="text-sm text-gray-900 capitalize">{call.sentiment}</p>
                          </div>
                        )}
                      </div>

                      {/* Transcript */}
                      {call.transcript && (
                        <div className="border-t pt-3">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                            Call Transcript
                          </span>
                          <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{call.transcript}</p>
                          </div>
                        </div>
                      )}

                      {/* Manual Override Buttons */}
                      {call.classified_as_booked !== null && (
                        <div className="border-t pt-3 mt-3">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                            Manual Override
                          </span>
                          <div className="flex gap-2">
                            <button className="px-3 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200 transition-colors">
                              Mark as Booked
                            </button>
                            <button className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">
                              Mark as Not Booked
                            </button>
                            <button className="px-3 py-1 text-xs bg-amber-100 text-amber-700 rounded-md hover:bg-amber-200 transition-colors">
                              Needs Review
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {call.notes && (
                        <div className="border-t pt-3 mt-3">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                            Notes
                          </span>
                          <p className="text-sm text-gray-700">{call.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CallAnalyticsWidget({ data }: CallAnalyticsWidgetProps) {
  const [modalState, setModalState] = useState<{ isOpen: boolean; type: string; title: string; calls: CallDetails[] }>({
    isOpen: false,
    type: '',
    title: '',
    calls: []
  });

  const conversionRate = data.today.totalCalls > 0 ? Math.round((data.today.appointmentsBooked / data.today.totalCalls) * 100) : 0;
  const positiveRate = data.today.totalCalls > 0 ? Math.round((data.today.positivesentiment / data.today.totalCalls) * 100) : 0;

  const fetchCallDetails = async (type: string, title: string, stage?: string) => {
    try {
      let url = `/api/calls/details?type=${type}&date=${new Date().toISOString().split('T')[0]}`;
      if (stage) {
        url += `&stage=${stage}`;
      }
      console.log('Fetching from URL:', url);
      const response = await fetch(url);
      console.log('Response status:', response.status);
      if (response.ok) {
        const calls = await response.json();
        console.log('Fetched calls:', calls);
        setModalState({ isOpen: true, type, title, calls });
      } else {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        alert('Failed to fetch call details');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      alert('Error fetching call details');
    }
  };

  const closeModal = () => {
    setModalState({ isOpen: false, type: '', title: '', calls: [] });
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
          <div className="p-2 rounded-lg bg-blue-50">
            <Phone className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Today&apos;s Call Intelligence</h3>
            <p className="text-sm text-gray-500">AI-powered call analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-600">Live AI</span>
        </div>
      </div>

      {/* Today's Metrics */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Today&apos;s Performance</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Calls */}
          <button
            onClick={() => fetchCallDetails('total', 'All Calls Today')}
            className="text-center p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group w-full"
          >
            <PhoneCall className="h-5 w-5 text-gray-600 mx-auto mb-1 group-hover:text-gray-800" />
            <div className="text-xl font-bold text-gray-900">{data.today.totalCalls}</div>
            <div className="text-xs text-gray-500 group-hover:text-gray-700">Total Calls</div>
            <ExternalLink className="h-3 w-3 text-gray-400 mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Appointments Booked */}
          <button
            onClick={() => fetchCallDetails('appointments', 'Appointments Booked Today')}
            className="text-center p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer group w-full"
          >
            <CheckCircle className="h-5 w-5 text-emerald-600 mx-auto mb-1 group-hover:text-emerald-700" />
            <div className="text-xl font-bold text-emerald-700">{data.today.appointmentsBooked}</div>
            <div className="text-xs text-emerald-600 group-hover:text-emerald-700">Appointments</div>
            <ExternalLink className="h-3 w-3 text-emerald-500 mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Emergency Calls */}
          <button
            onClick={() => fetchCallDetails('emergency', 'Emergency Calls Today')}
            className="text-center p-3 rounded-xl bg-red-50 hover:bg-red-100 transition-colors cursor-pointer group w-full"
          >
            <AlertTriangle className="h-5 w-5 text-red-600 mx-auto mb-1 group-hover:text-red-700" />
            <div className="text-xl font-bold text-red-700">{data.today.emergencyCallsToday}</div>
            <div className="text-xs text-red-600 group-hover:text-red-700">Emergency</div>
            <ExternalLink className="h-3 w-3 text-red-500 mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Follow-ups */}
          <button
            onClick={() => fetchCallDetails('followups', 'Follow-ups Scheduled Today')}
            className="text-center p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer group w-full"
          >
            <Clock className="h-5 w-5 text-blue-600 mx-auto mb-1 group-hover:text-blue-700" />
            <div className="text-xl font-bold text-blue-700">{data.today.followUpsScheduled}</div>
            <div className="text-xs text-blue-600 group-hover:text-blue-700">Follow-ups</div>
            <ExternalLink className="h-3 w-3 text-blue-500 mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
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

      {/* Pipeline Breakdown */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Sales Pipeline Breakdown</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {pipelineData.map((item, index) => (
            <button
              key={index}
              onClick={() => fetchCallDetails('pipeline', `${item.label} Calls Today`, item.label.toLowerCase().replace('-', ''))}
              className="text-center p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer group w-full"
            >
              <div className={`w-3 h-3 rounded-full ${item.color} mx-auto mb-2`}></div>
              <div className="text-lg font-bold text-gray-900">{item.count}</div>
              <div className="text-xs text-gray-500 group-hover:text-gray-700">{item.label}</div>
              <ExternalLink className="h-3 w-3 text-gray-400 mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      {data.today.totalCalls > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <button
              onClick={() => fetchCallDetails('not_interested', 'Not Interested Calls Today')}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              Not Interested: <span className="font-medium text-gray-900">{data.today.notInterested}</span>
              <ExternalLink className="h-3 w-3 inline-block ml-1" />
            </button>
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
        isOpen={modalState.isOpen}
        onClose={closeModal}
        calls={modalState.calls}
        title={modalState.title}
        type={modalState.type as any}
      />
    </div>
  );
}