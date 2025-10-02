'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, AlertTriangle } from "lucide-react";
import { DashboardMetrics } from "@/lib/dashboard-service";

interface UnsentInvoicesWidgetProps {
  data: DashboardMetrics['unsentInvoices'];
}

export function UnsentInvoicesWidget({ data }: UnsentInvoicesWidgetProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'green': return '🟢';
      case 'yellow': return '🟡';
      case 'red': return '🔴';
      default: return '⚫';
    }
  };

  const getBadgeColor = (status: string) => {
    switch (status) {
      case 'green': return 'bg-green-100 text-green-800';
      case 'yellow': return 'bg-yellow-100 text-yellow-800';
      case 'red': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const isUrgent = data.status === 'red';

  return (
    <Card className={isUrgent ? 'border-red-200 bg-red-50' : ''}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          Unsent Invoices
        </CardTitle>
        <div className="flex items-center space-x-1">
          {isUrgent && <AlertTriangle className="h-4 w-4 text-red-500" />}
          <FileText className="h-4 w-4 text-gray-400" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">
              {data.count}
            </div>
            <div className="text-lg">
              {getStatusIcon(data.status)}
            </div>
          </div>

          <div className="space-y-2">
            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColor(data.status)}`}>
              {data.count} invoice{data.count !== 1 ? 's' : ''} pending
            </div>

            <div className="text-lg font-semibold text-gray-900">
              {formatCurrency(data.amount)}
            </div>

            <div className="text-xs text-gray-500">
              {data.status === 'green' && 'Good! Keep invoices under 5'}
              {data.status === 'yellow' && 'Caution: 5-10 pending invoices'}
              {data.status === 'red' && 'Action needed: Over 10 pending'}
            </div>
          </div>

          {isUrgent && (
            <button className="w-full bg-red-600 text-white text-sm py-2 px-3 rounded hover:bg-red-700 transition-colors">
              Send Invoices Now
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}