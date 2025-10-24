'use client';

import { X } from 'lucide-react';

interface CallDetail {
  call_id: string;
  caller_number: string;
  call_date: string;
  duration: number;
  transcript: string;
  classified_as_booked: boolean;
  ai_confidence: number;
  is_emergency?: boolean;
  sentiment?: string;
  service_type?: string;
}

interface CallDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  calls: CallDetail[];
  categoryColor: 'purple' | 'emerald' | 'red' | 'blue' | 'amber';
}

export function CallDetailsModal({ isOpen, onClose, title, calls, categoryColor }: CallDetailsModalProps) {
  if (!isOpen) return null;

  const colorClasses = {
    purple: 'from-purple-600 via-pink-500 to-blue-500',
    emerald: 'from-emerald-600 via-green-500 to-teal-500',
    red: 'from-red-600 via-pink-500 to-orange-500',
    blue: 'from-blue-600 via-indigo-500 to-purple-500',
    amber: 'from-amber-600 via-yellow-500 to-orange-500',
  };

  const borderColors = {
    purple: 'border-purple-500/30',
    emerald: 'border-emerald-500/30',
    red: 'border-red-500/30',
    blue: 'border-blue-500/30',
    amber: 'border-amber-500/30',
  };

  const bgColors = {
    purple: 'bg-purple-50',
    emerald: 'bg-emerald-50',
    red: 'bg-red-50',
    blue: 'bg-blue-50',
    amber: 'bg-amber-50',
  };

  const formatPhoneNumber = (phone: string) => {
    // Format +15551234567 to (555) 123-4567
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned[0] === '1') {
      const areaCode = cleaned.slice(1, 4);
      const prefix = cleaned.slice(4, 7);
      const line = cleaned.slice(7);
      return `(${areaCode}) ${prefix}-${line}`;
    }
    return phone;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York'
    }) + ' ET';
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-3xl shadow-2xl bg-white">
        {/* Gradient Header */}
        <div className={`bg-gradient-to-r ${colorClasses[categoryColor]} p-6 relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all"
          >
            <X className="h-5 w-5 text-white" />
          </button>

          <div className="pr-12">
            <h2 className="text-3xl font-bold text-white mb-2 gradient-text">
              {title}
            </h2>
            <p className="text-white/90 text-lg">
              {calls.length} {calls.length === 1 ? 'call' : 'calls'} today
            </p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-140px)] p-6">
          {calls.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg gradient-text">No calls in this category yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {calls.map((call, index) => (
                <div
                  key={call.call_id}
                  className={`p-6 rounded-2xl border-2 ${borderColors[categoryColor]} ${bgColors[categoryColor]} hover:shadow-lg transition-all duration-200`}
                >
                  {/* Call Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl font-bold gradient-text">
                          {formatPhoneNumber(call.caller_number)}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          call.classified_as_booked
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                            : 'bg-gray-100 text-gray-700 border border-gray-300'
                        }`}>
                          {call.classified_as_booked ? '✓ Booked' : 'Not Booked'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>🕐 {formatTime(call.call_date)}</span>
                        <span>⏱️ {formatDuration(call.duration)}</span>
                        <span>🎯 {Math.round((call.ai_confidence || 0) * 100)}% confidence</span>
                      </div>
                    </div>
                  </div>

                  {/* Transcript */}
                  {call.transcript && call.transcript !== 'Test webhook - no transcript' && (
                    <div className="mt-4 p-4 bg-white/60 rounded-xl border border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                        Call Transcript
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {call.transcript}
                      </p>
                    </div>
                  )}

                  {/* Call ID (for debugging) */}
                  <div className="mt-3 text-xs text-gray-400 font-mono">
                    ID: {call.call_id}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`bg-gradient-to-r ${colorClasses[categoryColor]} p-4 text-center`}>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold rounded-xl transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
