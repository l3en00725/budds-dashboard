'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { DashboardMetrics } from "@/lib/dashboard-service";

interface WeeklyPaymentsWidgetProps {
  data: DashboardMetrics['weeklyPayments'];
}

export function WeeklyPaymentsWidget({ data }: WeeklyPaymentsWidgetProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'green': return '🟢';
      case 'red': return '🔴';
      default: return '⚫';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const onPace = data.status === 'green';

  return (
    <Card className={!onPace ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          Weekly Payments Collected vs Goal
        </CardTitle>
        <div className="flex items-center space-x-1">
          {onPace ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
          <DollarSign className="h-4 w-4 text-gray-400" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">
                {formatCurrency(data.current)}
              </div>
              <div className="text-sm text-gray-600">
                of {formatCurrency(data.target)} goal
              </div>
            </div>
            <div className="text-lg">
              {getStatusIcon(data.status)}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progress</span>
              <span>{data.percentage.toFixed(1)}%</span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all duration-300 ${
                  onPace ? 'bg-green-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(data.percentage, 100)}%` }}
              />
              {/* Goal line marker */}
              <div
                className="relative top-[-16px] w-0.5 h-4 bg-gray-600"
                style={{ marginLeft: '100%', transform: 'translateX(-1px)' }}
              />
            </div>

            <div className={`text-sm font-medium ${onPace ? 'text-green-700' : 'text-red-700'}`}>
              {onPace ? '✓ On pace to meet weekly goal' : '⚠ Off pace - need to accelerate collections'}
            </div>
          </div>

          {/* Recent Payments */}
          {data.payments.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Recent Payments This Week</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {data.payments.slice(0, 5).map((payment, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600 truncate max-w-[120px]">
                      {payment.customer || 'Unknown Customer'}
                    </span>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatCurrency(payment.amount || 0)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {payment.payment_date ? formatDate(payment.payment_date) : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {data.payments.length > 5 && (
                <div className="text-xs text-gray-500 text-center">
                  +{data.payments.length - 5} more payments
                </div>
              )}
            </div>
          )}

          {data.payments.length === 0 && (
            <div className="text-sm text-gray-400 italic text-center py-4">
              No payments recorded this week
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}