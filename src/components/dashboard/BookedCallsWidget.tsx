'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone } from "lucide-react";
import { DashboardMetrics } from "@/lib/dashboard-service";

interface BookedCallsWidgetProps {
  data: DashboardMetrics['bookedCallPercentage'];
}

export function BookedCallsWidget({ data }: BookedCallsWidgetProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'green': return '🟢';
      case 'yellow': return '🟡';
      case 'red': return '🔴';
      default: return '⚫';
    }
  };

  const getGaugeColor = (status: string) => {
    switch (status) {
      case 'green': return 'text-green-600';
      case 'yellow': return 'text-yellow-600';
      case 'red': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getGaugeFillColor = (status: string) => {
    switch (status) {
      case 'green': return 'stroke-green-500';
      case 'yellow': return 'stroke-yellow-500';
      case 'red': return 'stroke-red-500';
      default: return 'stroke-gray-500';
    }
  };

  // Calculate gauge parameters
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (data.percentage / 100) * circumference;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          Booked Call %
        </CardTitle>
        <Phone className="h-4 w-4 text-gray-400" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Gauge Chart */}
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-gray-200"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className={`transition-all duration-300 ${getGaugeFillColor(data.status)}`}
                  />
                </svg>
                {/* Percentage text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-lg font-bold ${getGaugeColor(data.status)}`}>
                    {data.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-2xl font-bold">
                  {data.booked}/{data.total}
                </div>
                <div className="text-xs text-gray-500">
                  calls today
                </div>
              </div>
            </div>

            <div className="text-lg">
              {getStatusIcon(data.status)}
            </div>
          </div>

          <div className="text-xs text-gray-500">
            {data.status === 'green' && 'Excellent! ≥70% booking rate'}
            {data.status === 'yellow' && 'Good, aim for 70%+ booking rate'}
            {data.status === 'red' && 'Needs improvement: <50% booking rate'}
          </div>

          {data.total === 0 && (
            <div className="text-sm text-gray-400 italic">
              No calls today yet
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}