'use client';

import { useEffect, useState } from 'react';
import { DashboardService, DashboardMetrics } from '@/lib/dashboard-service';
import MembershipCard from './MembershipCard';
import { CallAnalyticsWidget } from './CallAnalyticsWidget';
import { ExecutiveDashboard } from './ExecutiveDashboard';

export function DashboardContent() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

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

  const syncJobberData = async () => {
    setSyncing(true);
    try {
      // Get token from cookie
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
      };

      let token = getCookie('jobber_access_token');
      if (!token) {
        // Try to refresh token automatically before prompting user
        try {
          console.log('No access token found, attempting automatic refresh...');
          const refreshResponse = await fetch('/api/auth/jobber/refresh', {
            method: 'POST',
            credentials: 'include'
          });

          if (refreshResponse.ok) {
            console.log('Token refreshed successfully, retrying sync...');
            // Get the new token from the updated cookie
            token = getCookie('jobber_access_token');
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
        }

        // If still no token after refresh attempt, prompt for re-authentication
        if (!token) {
          const shouldReauth = confirm('Jobber authentication required. Click OK to re-authenticate with Jobber now.');
          if (shouldReauth) {
            window.location.href = '/api/auth/jobber';
            return;
          } else {
            throw new Error('Authentication cancelled');
          }
        }
      }

      const response = await fetch('/api/sync/jobber-financial', {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Check if it's an authentication error
        if (response.status === 401 || errorData.details?.includes('authentication') || errorData.details?.includes('token')) {
          // Try to refresh token one more time before giving up
          try {
            console.log('Authentication error during sync, attempting token refresh...');
            const refreshResponse = await fetch('/api/auth/jobber/refresh', {
              method: 'POST',
              credentials: 'include'
            });

            if (refreshResponse.ok) {
              console.log('Token refreshed, retrying sync operation...');
              // Get the new token and retry the sync
              const newToken = getCookie('jobber_access_token');
              if (newToken) {
                // Retry the sync with the new token
                const retryResponse = await fetch('/api/sync/jobber-financial', {
                  method: 'POST',
                  credentials: 'include',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${newToken}`,
                  },
                });

                if (retryResponse.ok) {
                  const retryResult = await retryResponse.json();
                  console.log('Sync successful after token refresh:', retryResult);
                  alert(`Sync completed successfully! Synced ${retryResult.recordsSynced} records.`);
                  fetchMetrics(); // Refresh the dashboard
                  return;
                }
              }
            }
          } catch (retryError) {
            console.error('Token refresh and retry failed:', retryError);
          }

          // If token refresh failed or retry failed, prompt for re-authentication
          const shouldReauth = confirm('Your Jobber session has expired. Click OK to re-authenticate with Jobber now.');
          if (shouldReauth) {
            window.location.href = '/api/auth/jobber';
            return;
          } else {
            throw new Error('Authentication cancelled');
          }
        }

        throw new Error(errorData.details || 'Sync failed');
      }

      const result = await response.json();
      console.log('Sync successful:', result);

      // Refresh metrics after sync
      const metricsResponse = await fetch('/api/dashboard/metrics');
      if (metricsResponse.ok) {
        const data = await metricsResponse.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error('Sync error:', err);
      if (err instanceof Error && err.message !== 'Authentication cancelled') {
        alert(`Sync failed: ${err.message}`);
      }
    } finally {
      setSyncing(false);
    }
  };

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
      {/* Modern Sync Button */}
      <div className="flex justify-end">
        <button
          onClick={syncJobberData}
          disabled={syncing}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 shadow-lg transition-all duration-200 transform hover:scale-105"
        >
          {syncing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              <span className="font-medium">Syncing Financial Data...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="font-medium">Sync Financial Data</span>
            </>
          )}
        </button>
      </div>

      {/* Executive Dashboard - Full Width */}
      <div className="relative -mx-8 -mt-8">
        <ExecutiveDashboard metrics={metrics.executiveMetrics} />
      </div>

      {/* Traditional Dashboard Sections */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
        {/* Membership Overview */}
        <div className="relative mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-gradient-to-b from-purple-600 to-pink-600 rounded-full"></div>
            <h2 className="text-xl font-bold text-gray-900">Membership Program</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-gray-300 to-transparent"></div>
          </div>
          <MembershipCard membershipData={metrics.gmMetrics.membershipRevenue} />
        </div>

        {/* Call Intelligence */}
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full"></div>
            <h2 className="text-xl font-bold text-gray-900">Call Intelligence</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-gray-300 to-transparent"></div>
          </div>
          <CallAnalyticsWidget data={metrics.callAnalytics} />
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