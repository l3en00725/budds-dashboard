'use client';

import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Clock, AlertTriangle, TrendingUp, TrendingDown, Eye, X, Calendar, DollarSign, User, Phone } from 'lucide-react';

interface ARInvoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  amount: number;
  balance: number;
  issue_date: string;
  due_date: string;
  days_overdue: number;
  aging_bucket: 'current' | '1-30' | '31-60' | '61-90' | '90+';
  status: 'outstanding' | 'partial' | 'overdue';
}

interface ARTrendData {
  month: string;
  totalAR: number;
  over60Days: number;
  over90Days: number;
  avgDaysToPayment: number;
}

interface EnhancedARAgingWidgetProps {
  data: {
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    days90plus: number;
    over60Percent: number;
    status: 'green' | 'orange' | 'red';
    invoices: ARInvoice[];
    trends: ARTrendData[];
    alerts: {
      criticalInvoices: number;
      newOverdue: number;
      improvingAccounts: number;
    };
  };
}

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: ARInvoice[];
  bucket: string;
  totalAmount: number;
}

function InvoiceModal({ isOpen, onClose, invoices, bucket, totalAmount }: InvoiceModalProps) {
  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (invoice: ARInvoice) => {
    if (invoice.days_overdue > 90) return 'bg-red-100 text-red-800';
    if (invoice.days_overdue > 60) return 'bg-orange-100 text-orange-800';
    if (invoice.days_overdue > 30) return 'bg-amber-100 text-amber-800';
    if (invoice.days_overdue > 0) return 'bg-blue-100 text-blue-800';
    return 'bg-emerald-100 text-emerald-800';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    AR Aging: {bucket}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {invoices.length} invoices • {formatCurrency(totalAmount)} total
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Invoices Table */}
            <div className="max-h-96 overflow-y-auto">
              {invoices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No invoices in this aging bucket</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invoice
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Client
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Days Overdue
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Due Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {invoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              #{invoice.invoice_number}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{invoice.client_name}</div>
                            {invoice.client_email && (
                              <div className="text-xs text-gray-500">{invoice.client_email}</div>
                            )}
                            {invoice.client_phone && (
                              <div className="text-xs text-gray-500">{invoice.client_phone}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(invoice.balance)}
                            </div>
                            <div className="text-xs text-gray-500">
                              of {formatCurrency(invoice.amount)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-medium ${
                              invoice.days_overdue > 90 ? 'text-red-600' :
                              invoice.days_overdue > 60 ? 'text-orange-600' :
                              invoice.days_overdue > 30 ? 'text-amber-600' :
                              invoice.days_overdue > 0 ? 'text-blue-600' : 'text-emerald-600'
                            }`}>
                              {invoice.days_overdue > 0 ? `${invoice.days_overdue} days` : 'Current'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(invoice.due_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice)}`}>
                              {invoice.days_overdue > 90 ? 'Critical' :
                               invoice.days_overdue > 60 ? 'Overdue' :
                               invoice.days_overdue > 30 ? 'Past Due' :
                               invoice.days_overdue > 0 ? 'Due' : 'Current'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

export function EnhancedARAgingWidget({ data }: EnhancedARAgingWidgetProps) {
  const [selectedBucket, setSelectedBucket] = useState<{ isOpen: boolean; bucket: string; invoices: ARInvoice[]; amount: number }>({
    isOpen: false,
    bucket: '',
    invoices: [],
    amount: 0
  });

  const total = data.current + data.days1to30 + data.days31to60 + data.days61to90 + data.days90plus;

  const buckets = [
    { label: 'Current', amount: data.current, color: '#10B981', bucket: 'current' },
    { label: '1-30 Days', amount: data.days1to30, color: '#3B82F6', bucket: '1-30' },
    { label: '31-60 Days', amount: data.days31to60, color: '#F59E0B', bucket: '31-60' },
    { label: '61-90 Days', amount: data.days61to90, color: '#F97316', bucket: '61-90' },
    { label: '90+ Days', amount: data.days90plus, color: '#EF4444', bucket: '90+' },
  ];

  const pieData = buckets.map(bucket => ({
    name: bucket.label,
    value: bucket.amount,
    color: bucket.color
  }));

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const getPercentage = (amount: number) => {
    return total > 0 ? (amount / total) * 100 : 0;
  };

  const statusColor = data.status === 'green' ? 'text-emerald-400' :
                     data.status === 'orange' ? 'text-amber-400' : 'text-red-400';

  const handleBucketClick = (bucket: typeof buckets[0]) => {
    const bucketInvoices = data.invoices.filter(inv => inv.aging_bucket === bucket.bucket);
    setSelectedBucket({
      isOpen: true,
      bucket: bucket.label,
      invoices: bucketInvoices,
      amount: bucket.amount
    });
  };

  const closeModal = () => {
    setSelectedBucket({ isOpen: false, bucket: '', invoices: [], amount: 0 });
  };

  return (
    <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-xl">
      {/* Header with Alerts */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-100 mb-1">Enhanced AR Aging Analysis</h3>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-400">Total Outstanding: {formatCurrency(total)}</span>
            {data.alerts.criticalInvoices > 0 && (
              <div className="flex items-center gap-1 text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <span>{data.alerts.criticalInvoices} critical</span>
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${statusColor}`}>
            {data.over60Percent}%
          </div>
          <div className="text-sm text-gray-400">over 60 days</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* AR Breakdown Chart */}
        <div className="lg:col-span-2">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Aging Breakdown</h4>
          <div className="space-y-3">
            {buckets.map((bucket, index) => {
              const percentage = getPercentage(bucket.amount);
              const isOver60 = index >= 3;

              return (
                <div key={bucket.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300 font-medium">{bucket.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400">{percentage.toFixed(1)}%</span>
                      <span className={`font-semibold ${isOver60 ? 'text-red-400' : 'text-gray-100'}`}>
                        {formatCurrency(bucket.amount)}
                      </span>
                      <button
                        onClick={() => handleBucketClick(bucket)}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                        title="View detailed breakdown"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="relative h-3 bg-gray-700/50 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-1000 ease-out relative cursor-pointer hover:opacity-80"
                      style={{
                        width: `${Math.max(percentage, 0.5)}%`,
                        backgroundColor: bucket.color
                      }}
                      onClick={() => handleBucketClick(bucket)}
                    >
                      {bucket.amount > 0 && (
                        <div className="absolute inset-0 opacity-50 blur-sm" style={{ backgroundColor: bucket.color }} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AR Distribution Pie Chart */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">Distribution</h4>
          <div className="h-48 flex items-center justify-center">
            <PieChart width={200} height={200}>
              <Pie
                data={pieData}
                cx={100}
                cy={100}
                outerRadius={80}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F3F4F6'
                }}
                formatter={(value: number) => [formatCurrency(value), 'Amount']}
              />
            </PieChart>
          </div>
        </div>
      </div>

      {/* Trends Chart */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-300 mb-3">6-Month AR Trends</h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.trends}>
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
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F3F4F6'
                }}
                formatter={(value: number) => [formatCurrency(value), 'Amount']}
              />
              <Line
                type="monotone"
                dataKey="totalAR"
                stroke="#3B82F6"
                strokeWidth={2}
                name="Total AR"
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="over60Days"
                stroke="#F59E0B"
                strokeWidth={2}
                name="Over 60 Days"
                dot={{ fill: '#F59E0B', strokeWidth: 2, r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="over90Days"
                stroke="#EF4444"
                strokeWidth={2}
                name="Over 90 Days"
                dot={{ fill: '#EF4444', strokeWidth: 2, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="text-sm text-red-400 font-medium">Critical</span>
          </div>
          <div className="text-lg font-bold text-red-300">{data.alerts.criticalInvoices}</div>
          <div className="text-xs text-red-400/70">90+ days overdue</div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-amber-400" />
            <span className="text-sm text-amber-400 font-medium">New Overdue</span>
          </div>
          <div className="text-lg font-bold text-amber-300">{data.alerts.newOverdue}</div>
          <div className="text-xs text-amber-400/70">this week</div>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <span className="text-sm text-emerald-400 font-medium">Improving</span>
          </div>
          <div className="text-lg font-bold text-emerald-300">{data.alerts.improvingAccounts}</div>
          <div className="text-xs text-emerald-400/70">accounts paid</div>
        </div>
      </div>

      {/* Status indicator */}
      <div className="pt-4 border-t border-gray-700/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Health Status</span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              data.status === 'green' ? 'bg-emerald-500' :
              data.status === 'orange' ? 'bg-amber-500' : 'bg-red-500'
            }`} />
            <span className={statusColor}>
              {data.status === 'green' ? 'Healthy' :
               data.status === 'orange' ? 'Watch' : 'Critical'}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Target: ≤15% over 60 days = Healthy, ≤30% = Watch, &gt;30% = Critical. Click bars to view detailed invoices.
        </p>
      </div>

      {/* Invoice Detail Modal */}
      <InvoiceModal
        isOpen={selectedBucket.isOpen}
        onClose={closeModal}
        invoices={selectedBucket.invoices}
        bucket={selectedBucket.bucket}
        totalAmount={selectedBucket.amount}
      />
    </div>
  );
}