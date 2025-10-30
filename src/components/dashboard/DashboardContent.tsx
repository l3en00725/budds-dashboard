'use client';

import { useEffect, useState } from 'react';
import { DashboardService, DashboardMetrics } from '@/lib/dashboard-service';
import { CallAnalyticsWidget } from './CallAnalyticsWidget';

export function DashboardContent() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-8">
      {/* Call Intelligence Dashboard - Main Focus */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-gradient-to-b from-purple-600 to-pink-600 rounded-full"></div>
            <h2 className="text-xl font-bold gradient-text">Call Intelligence Dashboard</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-purple-300 via-pink-300 to-transparent"></div>
          </div>
          <CallAnalyticsWidget data={metrics.callAnalytics} />
        </div>
      </div>

      {/* Additional Call Analytics Widgets - Future Enhancement */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Service Breakdown Widget - Placeholder for future */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold gradient-text mb-4">Service Breakdown</h3>
          <p className="text-gray-600 text-sm">Service type analysis coming soon...</p>
        </div>

        {/* Call Quality Widget - Placeholder for future */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold gradient-text mb-4">Call Quality</h3>
          <p className="text-gray-600 text-sm">AI confidence and quality metrics coming soon...</p>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Call Intelligence Skeleton */}
      <div className="bg-white/60 backdrop-blur-sm p-8 rounded-2xl border border-gray-200/50 shadow-sm animate-pulse">
        <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-1/4 mb-6"></div>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full"></div>
          ))}
        </div>
      </div>

      {/* Additional Widgets Skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-sm animate-pulse">
            <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-1/3 mb-4"></div>
            <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-2/3"></div>
          </div>
        ))}
      </div>
    </div>
  );
}