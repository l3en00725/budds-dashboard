'use client';

import React, { useState } from 'react';
import { DashboardMetrics } from '@/lib/dashboard-service';
import { CircularKPI } from './CircularKPI';
import { ARAgingChart } from './ARAgingChart';
import { X, ExternalLink, DollarSign, Calendar, User, MapPin } from 'lucide-react';

interface ExecutiveDashboardProps {
  metrics: DashboardMetrics['executiveMetrics'];
}

interface JobDetails {
  id: string;
  job_number: string;
  title: string;
  client_name: string;
  revenue: number;
  end_date: string;
  status: string;
  description?: string;
  start_date?: string;
}

interface JobsModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: JobDetails[];
  totalRevenue: number;
  date: string;
}

function JobsModal({ isOpen, onClose, jobs, totalRevenue, date }: JobsModalProps) {
  if (!isOpen) return null;

  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
                <div className="p-2 rounded-lg bg-emerald-50">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Jobs Closed Today</h3>
                  <p className="text-sm text-gray-500">
                    {formatDate(date)} • {jobs.length} jobs • {formatCurrency(totalRevenue)} total revenue
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

            {/* Jobs List */}
            <div className="max-h-96 overflow-y-auto">
              {jobs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No jobs closed today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <div key={job.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-medium text-gray-900">
                              #{job.job_number}
                            </span>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              {job.status}
                            </span>
                            <span className="text-lg font-bold text-emerald-600">
                              {formatCurrency(job.revenue)}
                            </span>
                          </div>

                          <h4 className="font-medium text-gray-900 mb-1">{job.title}</h4>

                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              <span>{job.client_name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>Completed: {formatDate(job.end_date)}</span>
                            </div>
                          </div>

                          {job.description && (
                            <p className="text-sm text-gray-600 mt-2">{job.description}</p>
                          )}
                        </div>
                      </div>
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

export function ExecutiveDashboard({ metrics }: ExecutiveDashboardProps) {
  const { efficiency, revenue } = metrics;
  const [jobsModal, setJobsModal] = useState<{ isOpen: boolean; jobs: JobDetails[]; totalRevenue: number; date: string }>({
    isOpen: false,
    jobs: [],
    totalRevenue: 0,
    date: ''
  });

  const handleDailyRevenueClick = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/jobs/closed-today?date=${today}`);
      if (response.ok) {
        const data = await response.json();
        setJobsModal({
          isOpen: true,
          jobs: data.jobs,
          totalRevenue: data.totalRevenue,
          date: data.date
        });
      } else {
        alert('Failed to fetch jobs data');
      }
    } catch (error) {
      alert('Error fetching jobs data');
    }
  };

  const closeJobsModal = () => {
    setJobsModal({ isOpen: false, jobs: [], totalRevenue: 0, date: '' });
  };

  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const getTrend = (changePercent: number): 'up' | 'down' | 'neutral' => {
    if (changePercent > 0) return 'up';
    if (changePercent < 0) return 'down';
    return 'neutral';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-4">
          Executive Dashboard
        </h1>
        <p className="text-gray-300 text-lg">
          Key Performance Indicators & Business Intelligence
        </p>
      </div>

      {/* Central Hero Metric - Daily Revenue Goal */}
      <div className="flex justify-center mb-16">
        <CircularKPI
          title="Daily Revenue Goal"
          value={revenue.dailyClosedRevenue.amount}
          subtitle={`Goal: ${formatCurrency(revenue.dailyClosedRevenue.goal)}`}
          status={revenue.dailyClosedRevenue.status}
          size="large"
          percentage={revenue.dailyClosedRevenue.percentage}
          onClick={handleDailyRevenueClick}
          showDate={true}
        />
      </div>


      {/* Bottom Section - Charts and Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* AR Aging Chart */}
        <ARAgingChart data={revenue.arAging} />

        {/* MoM Trends Summary */}
        <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-xl">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-100 mb-2">Month-over-Month Trends</h3>
            <p className="text-sm text-gray-400">Month-to-date vs same period last month</p>
          </div>

          <div className="space-y-6">
            {/* Issued vs Paid Status */}
            <div className="text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 ${
                revenue.issuedVsPaidMoM.status === 'green' ? 'border-emerald-500/40 bg-emerald-500/10' :
                revenue.issuedVsPaidMoM.status === 'orange' ? 'border-amber-500/40 bg-amber-500/10' :
                'border-red-500/40 bg-red-500/10'
              }`}>
                <div className={`w-3 h-3 rounded-full ${
                  revenue.issuedVsPaidMoM.status === 'green' ? 'bg-emerald-500' :
                  revenue.issuedVsPaidMoM.status === 'orange' ? 'bg-amber-500' : 'bg-red-500'
                }`} />
                <span className={`font-medium ${
                  revenue.issuedVsPaidMoM.status === 'green' ? 'text-emerald-400' :
                  revenue.issuedVsPaidMoM.status === 'orange' ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {revenue.issuedVsPaidMoM.status === 'green' ? 'Both Up' :
                   revenue.issuedVsPaidMoM.status === 'orange' ? 'Mixed' : 'Both Down'}
                </span>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-xl bg-gray-700/30">
                <div className="text-sm text-gray-400 mb-1">Revenue Issued MTD</div>
                <div className="text-base font-semibold text-gray-200 mb-1">
                  {formatCurrency(revenue.revenueIssuedMTD.amount)}
                </div>
                <div className={`text-lg font-bold ${
                  revenue.issuedVsPaidMoM.issuedChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {revenue.issuedVsPaidMoM.issuedChange >= 0 ? '+' : ''}{revenue.issuedVsPaidMoM.issuedChange}%
                </div>
                <div className="text-xs text-gray-500">vs same period last month</div>
              </div>

              <div className="text-center p-4 rounded-xl bg-gray-700/30">
                <div className="text-sm text-gray-400 mb-1">Revenue Collected MTD</div>
                <div className="text-base font-semibold text-gray-200 mb-1">
                  {formatCurrency(revenue.revenueCollectedMTD.amount)}
                </div>
                <div className={`text-lg font-bold ${
                  revenue.issuedVsPaidMoM.paidChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {revenue.issuedVsPaidMoM.paidChange >= 0 ? '+' : ''}{revenue.issuedVsPaidMoM.paidChange}%
                </div>
                <div className="text-xs text-gray-500">vs same period last month</div>
              </div>
            </div>

            {/* Previous Month Comparison */}
            <div className="pt-4 border-t border-gray-700/50">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Last Month Issued:</span>
                  <div className="font-medium text-gray-200">
                    {formatCurrency(revenue.revenueIssuedMTD.previousMonth)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Last Month Collected:</span>
                  <div className="font-medium text-gray-200">
                    {formatCurrency(revenue.revenueCollectedMTD.previousMonth)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with Status Summary */}
      <div className="text-center text-gray-400 text-sm">
        <p>Dashboard auto-refreshes every 5 minutes during business hours (8 AM - 5 PM)</p>
        <p className="mt-1">🟢 Green: Meeting targets | 🟠 Orange: Watch closely | 🔴 Red: Needs attention</p>
        <p className="mt-1 text-xs">💡 Click the Daily Revenue Goal to see jobs closed today</p>
      </div>

      {/* Jobs Modal */}
      <JobsModal
        isOpen={jobsModal.isOpen}
        onClose={closeJobsModal}
        jobs={jobsModal.jobs}
        totalRevenue={jobsModal.totalRevenue}
        date={jobsModal.date}
      />
    </div>
  );
}