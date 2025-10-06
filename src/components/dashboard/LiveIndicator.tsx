'use client';

import { useEffect, useState } from 'react';

export function LiveIndicator() {
  const [tokenStatus, setTokenStatus] = useState<'valid' | 'expired' | 'unknown'>('unknown');
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const checkTokenStatus = async () => {
      try {
        // Check if we have a token in cookies
        const getCookie = (name: string) => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop()?.split(';').shift();
          return null;
        };

        const token = getCookie('jobber_access_token');
        if (!token) {
          setTokenStatus('expired');
          return;
        }

        // Test the token with a simple API call
        const testResponse = await fetch('/api/auth/jobber/test-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        setTokenStatus(testResponse.ok ? 'valid' : 'expired');
      } catch {
        setTokenStatus('expired');
      }
    };

    // Check status immediately
    checkTokenStatus();

    // Check every 30 seconds
    const interval = setInterval(checkTokenStatus, 30 * 1000);

    // Listen for focus events to check token status when user returns to tab
    const handleFocus = () => {
      setTimeout(checkTokenStatus, 1000); // Small delay to ensure cookies are updated
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleResync = async () => {
    setIsLoading(true);
    setShowMenu(false);

    try {
      // Run both Jobber and OpenPhone syncs in parallel
      const [jobberResponse, openPhoneResponse] = await Promise.allSettled([
        fetch('/api/sync/manual', { method: 'POST' }),
        fetch('/api/sync/openphone', { method: 'POST' })
      ]);

      const results = [];

      // Check Jobber sync result
      if (jobberResponse.status === 'fulfilled' && jobberResponse.value.ok) {
        results.push('Jobber financial data synced');
      } else if (jobberResponse.status === 'fulfilled') {
        const error = await jobberResponse.value.json();
        results.push(`Jobber sync: ${error.message || 'Error'}`);
      } else {
        results.push('Jobber sync failed');
      }

      // Check OpenPhone sync result
      if (openPhoneResponse.status === 'fulfilled' && openPhoneResponse.value.ok) {
        const data = await openPhoneResponse.value.json();
        results.push(`OpenPhone: ${data.recordsSynced} calls synced`);
      } else if (openPhoneResponse.status === 'fulfilled') {
        const error = await openPhoneResponse.value.json();
        results.push(`OpenPhone sync: ${error.error || 'Error'}`);
      } else {
        results.push('OpenPhone sync failed');
      }

      // Show results and reload page
      alert(`Sync completed:\n\n${results.join('\n')}`);
      window.location.reload();

    } catch (error) {
      alert(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshToken = () => {
    window.location.href = '/api/auth/jobber/reauth';
  };

  const getStatusColor = () => {
    switch (tokenStatus) {
      case 'valid':
        return 'bg-green-500';
      case 'expired':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const getStatusText = () => {
    switch (tokenStatus) {
      case 'valid':
        return 'Live';
      case 'expired':
        return 'Expired';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center space-x-3 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors"
        disabled={isLoading}
      >
        <div className={`w-2 h-2 ${getStatusColor()} rounded-full ${tokenStatus === 'valid' && !isLoading ? 'animate-pulse' : ''}`}></div>
        <span className="text-sm text-gray-600 font-medium">
          {isLoading ? 'Syncing...' : getStatusText()}
        </span>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="py-1">
            <button
              onClick={handleResync}
              disabled={isLoading}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Resync Data</span>
            </button>

            {tokenStatus === 'expired' && (
              <button
                onClick={handleRefreshToken}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <span>Refresh Token</span>
              </button>
            )}

            <div className="border-t border-gray-100 my-1"></div>

            <div className="px-4 py-2 text-xs text-gray-500">
              Status: {tokenStatus}
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        ></div>
      )}
    </div>
  );
}