'use client';

import React from 'react';
import { DashboardMetrics } from '@/lib/dashboard-service';
import { CircularKPI } from './CircularKPI';

interface ExecutiveDashboardProps {
  metrics: DashboardMetrics['executiveMetrics'];
}

export function ExecutiveDashboard({ metrics }: ExecutiveDashboardProps) {
  const { efficiency, revenue } = metrics;

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
        <h1 className="text-4xl font-bold gradient-text mb-4">
          Executive Dashboard
        </h1>
        <p className="text-white/90 text-lg gradient-text">
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
        />
      </div>

      {/* Primary KPIs Circle */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 justify-items-center mb-16">
        {/* Revenue Issued MTD */}
        <CircularKPI
          title="Revenue Issued MTD"
          value={revenue.revenueIssuedMTD.amount}
          status={revenue.revenueIssuedMTD.changePercent >= 0 ? 'green' : 'red'}
          trend={getTrend(revenue.revenueIssuedMTD.changePercent)}
          trendValue={revenue.revenueIssuedMTD.changePercent}
        />

        {/* Revenue Collected MTD */}
        <CircularKPI
          title="Revenue Collected MTD"
          value={revenue.revenueCollectedMTD.amount}
          status={revenue.revenueCollectedMTD.changePercent >= 0 ? 'green' : 'red'}
          trend={getTrend(revenue.revenueCollectedMTD.changePercent)}
          trendValue={revenue.revenueCollectedMTD.changePercent}
        />

        {/* AR Outstanding */}
        <CircularKPI
          title="AR Outstanding"
          value={revenue.arOutstanding.amount}
          status={revenue.arOutstanding.status}
          subtitle="Current balance"
        />


        {/* Jobs per Tech-Day */}
        <CircularKPI
          title="Jobs per Tech-Day (7d)"
          value={efficiency.avgJobsPerTechDay7d.average}
          subtitle={`${efficiency.avgJobsPerTechDay7d.totalJobs} jobs / ${efficiency.avgJobsPerTechDay7d.techDays} tech-days`}
          status={efficiency.avgJobsPerTechDay7d.status}
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
            <p className="text-sm text-gray-400">Revenue performance comparison</p>
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
                <div className="text-sm text-gray-400 mb-1">Revenue Issued</div>
                <div className={`text-lg font-bold ${
                  revenue.issuedVsPaidMoM.issuedChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {revenue.issuedVsPaidMoM.issuedChange >= 0 ? '+' : ''}{revenue.issuedVsPaidMoM.issuedChange}%
                </div>
                <div className="text-xs text-gray-500">vs last month</div>
              </div>

              <div className="text-center p-4 rounded-xl bg-gray-700/30">
                <div className="text-sm text-gray-400 mb-1">Revenue Collected</div>
                <div className={`text-lg font-bold ${
                  revenue.issuedVsPaidMoM.paidChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {revenue.issuedVsPaidMoM.paidChange >= 0 ? '+' : ''}{revenue.issuedVsPaidMoM.paidChange}%
                </div>
                <div className="text-xs text-gray-500">vs last month</div>
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
      </div>
    </div>
  );
}