'use client';

import { useEffect, useState } from 'react';
import { DashboardMetrics } from '@/lib/dashboard-service';
import MembershipCard from './MembershipCard';
import { ExecutiveDashboard } from './ExecutiveDashboard';
import { YoYComparisonCharts } from './YoYComparisonCharts';
import { EnhancedARAgingWidget } from './EnhancedARAgingWidget';
import { DailyRevenueTracker } from './DailyRevenueTracker';
import { OpenPhoneIntegration } from './OpenPhoneIntegration';

export function DashboardContent() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncSources, setSyncSources] = useState([
    {
      id: 'jobber',
      name: 'Jobber' as const,
      status: 'connected' as const,
      lastSync: new Date().toISOString(),
      lastSuccessfulSync: new Date().toISOString(),
      recordCount: 1250,
      canManualSync: true,
      autoSyncEnabled: true,
      syncDuration: 45
    },
    {
      id: 'quickbooks',
      name: 'QuickBooks' as const,
      status: 'connected' as const,
      lastSync: new Date().toISOString(),
      lastSuccessfulSync: new Date().toISOString(),
      recordCount: 890,
      canManualSync: true,
      autoSyncEnabled: true,
      syncDuration: 32
    },
    {
      id: 'openphone',
      name: 'OpenPhone' as const,
      status: 'connected' as const,
      lastSync: new Date().toISOString(),
      lastSuccessfulSync: new Date().toISOString(),
      recordCount: 345,
      canManualSync: true,
      autoSyncEnabled: true,
      syncDuration: 18
    }
  ]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/dashboard/metrics');
        if (!response.ok) {
          throw new Error('Failed to fetch metrics');
        }
        const data = await response.json();
        setMetrics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();

    // Refresh every 5 minutes during business hours (8 AM - 5 PM)
    const interval = setInterval(() => {
      const now = new Date();
      const hour = now.getHours();
      if (hour >= 8 && hour < 17) {
        fetchMetrics();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);



  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-medium mb-2">Error Loading Dashboard</h3>
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  // Mock data generators for components

  const generateYoYData = () => ({
    ytdSummary: {
      currentYTD: metrics.ytdRevenue.current,
      previousYTD: metrics.ytdRevenue.lastYear,
      growthPercent: Math.round(metrics.ytdRevenue.growth),
      status: metrics.ytdRevenue.growth > 10 ? 'green' as const : metrics.ytdRevenue.growth > 0 ? 'orange' as const : 'red' as const,
      daysIntoYear: Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24))
    },
    monthlyComparison: Array.from({ length: 12 }, (_, i) => ({
      month: new Date(0, i).toLocaleDateString('en-US', { month: 'short' }),
      currentYear: Math.floor(Math.random() * 100000) + 200000,
      previousYear: Math.floor(Math.random() * 80000) + 180000,
      growthPercent: Math.floor(Math.random() * 20) - 5,
      status: 'ahead' as const
    })),
    quarterlyBreakdown: {
      q1: { current: 650000, previous: 580000, growth: 12.1 },
      q2: { current: 720000, previous: 680000, growth: 5.9 },
      q3: { current: 690000, previous: 640000, growth: 7.8 },
      q4: { current: 580000, previous: 550000, growth: 5.5 }
    },
    projections: {
      yearEndProjection: 2800000,
      confidenceLevel: 'high' as const,
      targetAchievement: 92
    }
  });

  const generateDailyRevenueData = () => ({
    today: {
      current: metrics.executiveMetrics.revenue.dailyClosedRevenue.amount,
      target: metrics.executiveMetrics.revenue.dailyClosedRevenue.goal,
      percentage: metrics.executiveMetrics.revenue.dailyClosedRevenue.percentage,
      status: metrics.executiveMetrics.revenue.dailyClosedRevenue.status,
      lastUpdate: new Date().toISOString(),
      sources: [
        {
          source: 'Jobber' as const,
          amount: metrics.executiveMetrics.revenue.dailyClosedRevenue.amount,
          percentage: 100,
          lastSync: new Date().toISOString(),
          status: 'connected' as const
        }
      ]
    },
    weeklyData: Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        date: date.toISOString(),
        actualRevenue: Math.floor(Math.random() * 8000) + 5000,
        targetRevenue: 13000,
        jobberRevenue: Math.floor(Math.random() * 5000) + 3000,
        quickbooksRevenue: Math.floor(Math.random() * 3000) + 2000,
        dailyGoal: 13000,
        percentage: Math.floor(Math.random() * 40) + 60,
        status: 'green' as const,
        jobsCompleted: Math.floor(Math.random() * 10) + 5
      };
    }),
    monthlyProgress: {
      currentMTD: metrics.executiveMetrics.revenue.revenueCollectedMTD.amount,
      targetMTD: 400000,
      daysInMonth: 31,
      daysElapsed: new Date().getDate(),
      projectedEOM: 420000,
      onPace: true
    },
    realTimeUpdates: true
  });

  const generateEnhancedARData = () => ({
    ...metrics.executiveMetrics.revenue.arAging,
    invoices: Array.from({ length: 25 }, (_, i) => ({
      id: `inv-${i}`,
      invoice_number: `INV-${1000 + i}`,
      client_name: `Client ${i + 1}`,
      client_email: `client${i + 1}@example.com`,
      client_phone: `(555) 123-${String(i).padStart(4, '0')}`,
      amount: Math.floor(Math.random() * 5000) + 1000,
      balance: Math.floor(Math.random() * 4000) + 500,
      issue_date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      due_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      days_overdue: Math.floor(Math.random() * 120),
      aging_bucket: ['current', '1-30', '31-60', '61-90', '90+'][Math.floor(Math.random() * 5)] as any,
      status: 'outstanding' as const
    })),
    trends: Array.from({ length: 6 }, (_, i) => {
      const month = new Date();
      month.setMonth(month.getMonth() - (5 - i));
      return {
        month: month.toLocaleDateString('en-US', { month: 'short' }),
        totalAR: Math.floor(Math.random() * 50000) + 100000,
        over60Days: Math.floor(Math.random() * 20000) + 10000,
        over90Days: Math.floor(Math.random() * 10000) + 5000,
        avgDaysToPayment: Math.floor(Math.random() * 20) + 25
      };
    }),
    alerts: {
      criticalInvoices: 3,
      newOverdue: 2,
      improvingAccounts: 8
    }
  });

  const generateOpenPhoneData = () => ({
    connectionStatus: 'connected' as const,
    analytics: {
      today: {
        totalCalls: metrics.callAnalytics.today.totalCalls,
        appointmentsBooked: metrics.callAnalytics.today.appointmentsBooked,
        conversionRate: metrics.callAnalytics.today.totalCalls > 0 ? (metrics.callAnalytics.today.appointmentsBooked / metrics.callAnalytics.today.totalCalls) * 100 : 0,
        averageDuration: 245,
        revenueGenerated: 45000,
        revenuePerCall: metrics.callAnalytics.today.totalCalls > 0 ? 45000 / metrics.callAnalytics.today.totalCalls : 0
      },
      thisWeek: {
        totalCalls: metrics.callAnalytics.thisWeek.totalCalls,
        appointmentsBooked: metrics.callAnalytics.thisWeek.appointmentsBooked,
        conversionRate: metrics.callAnalytics.thisWeek.totalCalls > 0 ? (metrics.callAnalytics.thisWeek.appointmentsBooked / metrics.callAnalytics.thisWeek.totalCalls) * 100 : 0,
        averageDuration: 220,
        revenueGenerated: 180000,
        revenuePerCall: metrics.callAnalytics.thisWeek.totalCalls > 0 ? 180000 / metrics.callAnalytics.thisWeek.totalCalls : 0
      },
      thisMonth: {
        totalCalls: metrics.callAnalytics.thisWeek.totalCalls * 4,
        appointmentsBooked: metrics.callAnalytics.thisWeek.appointmentsBooked * 4,
        conversionRate: metrics.callAnalytics.thisWeek.totalCalls > 0 ? (metrics.callAnalytics.thisWeek.appointmentsBooked / metrics.callAnalytics.thisWeek.totalCalls) * 100 : 0,
        averageDuration: 235,
        revenueGenerated: 720000,
        revenuePerCall: metrics.callAnalytics.thisWeek.totalCalls > 0 ? 720000 / (metrics.callAnalytics.thisWeek.totalCalls * 4) : 0
      }
    },
    callVolumeData: Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      inbound: Math.floor(Math.random() * 15),
      outbound: Math.floor(Math.random() * 8),
      booked: Math.floor(Math.random() * 5)
    })),
    performanceData: Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString(),
        calls: Math.floor(Math.random() * 20) + 10,
        booked: Math.floor(Math.random() * 8) + 2,
        revenue: Math.floor(Math.random() * 15000) + 5000,
        conversionRate: Math.floor(Math.random() * 40) + 20
      };
    }),
    sourceData: [
      { source: 'Google Ads', calls: 45, bookings: 18, revenue: 125000, conversionRate: 40 },
      { source: 'Referrals', calls: 32, bookings: 16, revenue: 98000, conversionRate: 50 },
      { source: 'Website', calls: 28, bookings: 8, revenue: 45000, conversionRate: 28.6 },
      { source: 'Direct', calls: 15, bookings: 6, revenue: 32000, conversionRate: 40 }
    ],
    revenueCorrelation: {
      callsToRevenueRatio: 2.8,
      peakCallHours: ['9:00 AM', '2:00 PM', '4:00 PM'],
      highestRevenueDay: 'Tuesday',
      conversionTrends: 'improving' as const
    }
  });

  const handleManualSync = async (sourceId: string) => {
    console.log(`Manual sync triggered for ${sourceId}`);
    try {
      let endpoint = '';
      switch (sourceId) {
        case 'jobber':
          endpoint = '/api/sync/jobber';
          break;
        case 'openphone':
          endpoint = '/api/sync/openphone';
          break;
        case 'quickbooks':
          endpoint = '/api/sync/quickbooks';
          break;
        default:
          throw new Error(`Unknown source: ${sourceId}`);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`${sourceId} sync completed:`, result);

      // Refresh metrics after sync
      window.location.reload();
    } catch (error) {
      console.error(`Error syncing ${sourceId}:`, error);
      alert(`Failed to sync ${sourceId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleGlobalSync = async () => {
    console.log('Global sync triggered - syncing all sources');
    try {
      // Sync all sources in parallel
      const syncPromises = [
        fetch('/api/sync/jobber', { method: 'POST' }),
        fetch('/api/sync/openphone', { method: 'POST' })
      ];

      const responses = await Promise.all(syncPromises);
      console.log('All syncs completed');

      // Refresh metrics after all syncs
      window.location.reload();
    } catch (error) {
      console.error('Error during global sync:', error);
      alert(`Global sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    console.log(`Auto sync ${enabled ? 'enabled' : 'disabled'}`);
    // In a real implementation, this would update the auto sync setting
  };

  const handleConfigureSource = (sourceId: string) => {
    console.log(`Configure source: ${sourceId}`);
    // In a real implementation, this would open the configuration modal
  };

  const handleOpenPhoneConnect = () => {
    console.log('OpenPhone connect triggered');
    // In a real implementation, this would start the OAuth flow
  };

  const handleOpenPhoneConfigure = () => {
    console.log('OpenPhone configure triggered');
    // In a real implementation, this would open configuration settings
  };

  const handleOpenPhoneViewDetails = (type: 'calls' | 'bookings' | 'revenue') => {
    console.log(`View OpenPhone details for: ${type}`);
    // In a real implementation, this would navigate to detailed views
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 space-y-8">
      {/* Executive Dashboard - Full Width */}
      <div className="relative -mx-8 -mt-8">
        <ExecutiveDashboard metrics={metrics.executiveMetrics} />
      </div>

      {/* Streamlined Analytics Section */}
      <div className="space-y-8">
        {/* Single Unified Sync Button */}
        <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-100">Data Sync</h3>
              <p className="text-sm text-gray-400">Last sync: {new Date().toLocaleTimeString()}</p>
            </div>
            <button
              onClick={handleGlobalSync}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Sync All Data
            </button>
          </div>
        </div>

        {/* Daily Revenue Tracking - Keep this as primary daily widget */}
        <DailyRevenueTracker data={generateDailyRevenueData()} />

        {/* Year-over-Year Analysis - Keep only this chart (removed MoM duplicate) */}
        <YoYComparisonCharts data={generateYoYData()} />

        {/* Enhanced AR Aging - Primary Focus */}
        <EnhancedARAgingWidget data={generateEnhancedARData()} />

        {/* OpenPhone Integration - Keep this over CallAnalyticsWidget */}
        <OpenPhoneIntegration
          {...generateOpenPhoneData()}
          onConnect={handleOpenPhoneConnect}
          onConfigure={handleOpenPhoneConfigure}
          onViewDetails={handleOpenPhoneViewDetails}
        />

        {/* Membership Program - Standalone widget */}
        <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-gradient-to-b from-purple-600 to-pink-600 rounded-full"></div>
            <h2 className="text-xl font-bold text-gray-100">Membership Program</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-gray-600 to-transparent"></div>
          </div>
          <MembershipCard membershipData={metrics.gmMetrics.membershipRevenue} />
        </div>
      </div>
    </div>
  );
}


function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Executive Cards Skeleton */}
      <div className="grid gap-8 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white/60 backdrop-blur-sm p-8 rounded-2xl border border-gray-200/50 shadow-sm animate-pulse">
            <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-1/3 mb-6"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-1/2"></div>
              <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-3/4"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Performance Metrics Skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-sm animate-pulse">
            <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-2/3 mb-4"></div>
            <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-1/2 mb-2"></div>
            <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-1/3"></div>
          </div>
        ))}
      </div>

      {/* Large Widget Skeleton */}
      <div className="bg-white/60 backdrop-blur-sm p-8 rounded-2xl border border-gray-200/50 shadow-sm animate-pulse">
        <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-1/4 mb-6"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full"></div>
          ))}
        </div>
      </div>
    </div>
  );
}