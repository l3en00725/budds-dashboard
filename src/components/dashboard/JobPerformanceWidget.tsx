'use client';

import { MetricsCard } from './MetricsCard';

interface JobPerformanceData {
  topJobs: Array<{
    title: string;
    revenue: number;
    client: string;
    jobNumber: string;
    type: 'membership' | 'project' | 'service';
  }>;
  serviceBreakdown: {
    emergency: number;
    scheduled: number;
    maintenance: number;
    installation: number;
  };
  revenueByType: {
    memberships: number;
    largeProjects: number;
    serviceTickets: number;
  };
}

interface JobPerformanceWidgetProps {
  data: JobPerformanceData;
}

export function JobPerformanceWidget({ data }: JobPerformanceWidgetProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const getJobTypeColor = (type: string) => {
    switch (type) {
      case 'membership': return 'bg-blue-100 text-blue-800';
      case 'project': return 'bg-green-100 text-green-800';
      case 'service': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalRevenue = data.revenueByType.memberships + data.revenueByType.largeProjects + data.revenueByType.serviceTickets;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Top Revenue Jobs */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Revenue Jobs</h3>
        <div className="space-y-3">
          {data.topJobs.slice(0, 5).map((job, index) => (
            <div key={job.jobNumber} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">#{job.jobNumber}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getJobTypeColor(job.type)}`}>
                    {job.type}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{job.title}</p>
                <p className="text-xs text-gray-500">{job.client}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(job.revenue)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Service Type</h3>

        {/* Revenue Breakdown */}
        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Membership Programs</span>
            <div className="text-right">
              <span className="text-lg font-semibold text-blue-600">{formatCurrency(data.revenueByType.memberships)}</span>
              <div className="text-xs text-gray-500">
                {totalRevenue > 0 ? ((data.revenueByType.memberships / totalRevenue) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Large Projects ($10K+)</span>
            <div className="text-right">
              <span className="text-lg font-semibold text-green-600">{formatCurrency(data.revenueByType.largeProjects)}</span>
              <div className="text-xs text-gray-500">
                {totalRevenue > 0 ? ((data.revenueByType.largeProjects / totalRevenue) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Service Tickets</span>
            <div className="text-right">
              <span className="text-lg font-semibold text-yellow-600">{formatCurrency(data.revenueByType.serviceTickets)}</span>
              <div className="text-xs text-gray-500">
                {totalRevenue > 0 ? ((data.revenueByType.serviceTickets / totalRevenue) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>
        </div>

        {/* Service Type Distribution */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Service Distribution</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Emergency:</span>
              <span className="font-medium">{data.serviceBreakdown.emergency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Scheduled:</span>
              <span className="font-medium">{data.serviceBreakdown.scheduled}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Maintenance:</span>
              <span className="font-medium">{data.serviceBreakdown.maintenance}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Installation:</span>
              <span className="font-medium">{data.serviceBreakdown.installation}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}