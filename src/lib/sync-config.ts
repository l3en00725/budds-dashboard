/**
 * Centralized API Sync Configuration
 *
 * This file defines when and how often each data source should be synced.
 * Update this file to modify sync schedules across the application.
 */

export const SYNC_CONFIG = {
  /**
   * JOBBER FINANCIAL DATA SYNC
   * Primary revenue, invoice, and payment data
   */
  jobber: {
    // Production schedule
    production: {
      frequency: 'daily',
      time: '01:00', // 1:00 AM (after business day close)
      timezone: 'America/New_York',
      specialSchedule: {
        monthEnd: {
          // During month-end (1st-3rd), sync twice daily for accurate reporting
          frequency: 'twice-daily',
          times: ['01:00', '13:00'], // 1 AM and 1 PM
          days: [1, 2, 3] // First 3 days of month
        }
      }
    },
    // Development/manual
    development: {
      frequency: 'manual',
      endpoint: '/api/sync/jobber-financial'
    },
    // Data retention
    retention: {
      fullSync: '90 days', // Keep 90 days of detailed data
      summaryOnly: '2 years' // Summarize older data
    }
  },

  /**
   * OPENPHONE CALL DATA SYNC
   * Call analytics and lead tracking
   */
  openphone: {
    // Production schedule
    production: {
      frequency: 'daily',
      time: '06:00', // 6:00 AM (before business hours)
      timezone: 'America/New_York',
      lookback: '3 days' // Sync last 3 days to catch any delayed data
    },
    // Development/manual
    development: {
      frequency: 'manual',
      endpoint: '/api/sync/openphone'
    },
    // Alternative real-time option (if webhook available)
    realtime: {
      enabled: false, // Set to true when webhooks are configured
      webhookUrl: '/api/webhooks/openphone',
      fallback: 'daily' // Fallback to daily sync if webhook fails
    },
    // Data retention
    retention: {
      calls: '1 year',
      analytics: '2 years'
    }
  },

  /**
   * MEMBERSHIP DATA ANALYSIS
   * Extracts membership info from Jobber line items
   */
  membership: {
    // Production schedule
    production: {
      frequency: 'weekly',
      day: 'sunday',
      time: '02:00', // 2:00 AM Sunday (after Jobber sync)
      timezone: 'America/New_York',
      dependsOn: ['jobber'] // Requires Jobber data to be synced first
    },
    // Development/manual
    development: {
      frequency: 'manual',
      note: 'Runs automatically during Jobber sync via line item analysis'
    },
    // Keywords for membership detection
    keywords: ['membership', 'silver', 'gold', 'platinum', 'budd'],
    // Data retention
    retention: {
      detailed: '1 year',
      monthly_summary: '5 years'
    }
  },

  /**
   * DASHBOARD METRICS REFRESH
   * Real-time dashboard data updates
   */
  dashboard: {
    // Production schedule
    production: {
      businessHours: {
        frequency: 'every-5-minutes',
        hours: '08:00-17:00', // 8 AM - 5 PM
        timezone: 'America/New_York',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      },
      afterHours: {
        frequency: 'every-30-minutes',
        hours: '17:01-07:59', // 5:01 PM - 7:59 AM
        days: ['sunday'] // Reduced frequency on Sundays
      }
    },
    // Cache settings
    cache: {
      ttl: 300, // 5 minutes
      staleWhileRevalidate: 600 // 10 minutes
    }
  },

  /**
   * SYNC MONITORING & LOGGING
   */
  monitoring: {
    // Log retention
    logs: {
      retention: '30 days',
      level: 'info' // debug, info, warn, error
    },
    // Failure notifications
    alerts: {
      enabled: true,
      channels: ['email', 'dashboard'],
      thresholds: {
        consecutive_failures: 3,
        data_staleness: '24 hours'
      }
    },
    // Health checks
    healthCheck: {
      endpoint: '/api/health/sync',
      frequency: 'every-hour'
    }
  }
} as const;

/**
 * SYNC STATUS HELPERS
 */
export const getSyncStatus = () => ({
  lastJobberSync: process.env.LAST_JOBBER_SYNC || 'never',
  lastOpenPhoneSync: process.env.LAST_OPENPHONE_SYNC || 'never',
  lastMembershipSync: process.env.LAST_MEMBERSHIP_SYNC || 'never'
});

/**
 * NEXT SCHEDULED SYNC TIMES
 */
export const getNextSyncTimes = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    jobber: `${tomorrow.toISOString().split('T')[0]}T01:00:00Z`,
    openphone: `${tomorrow.toISOString().split('T')[0]}T06:00:00Z`,
    membership: getNextSunday(now)
  };
};

const getNextSunday = (date: Date): string => {
  const nextSunday = new Date(date);
  nextSunday.setDate(date.getDate() + (7 - date.getDay()) % 7);
  return `${nextSunday.toISOString().split('T')[0]}T02:00:00Z`;
};

/**
 * ENVIRONMENT-SPECIFIC CONFIG
 */
export const getCurrentSyncConfig = () => {
  const env = process.env.NODE_ENV;

  return {
    environment: env,
    isProduction: env === 'production',
    isDevelopment: env === 'development',
    syncMode: env === 'production' ? 'scheduled' : 'manual',
    config: SYNC_CONFIG
  };
};

/**
 * QUICK ACCESS TO ENDPOINTS
 */
export const SYNC_ENDPOINTS = {
  jobber: '/api/sync/jobber-financial',
  openphone: '/api/sync/openphone',
  health: '/api/health/sync',
  status: '/api/debug/auth-status'
} as const;

/**
 * USAGE EXAMPLES:
 *
 * import { SYNC_CONFIG, getSyncStatus, getNextSyncTimes } from '@/lib/sync-config';
 *
 * // Check when Jobber should sync in production
 * console.log(SYNC_CONFIG.jobber.production.time); // "01:00"
 *
 * // Get last sync times
 * const status = getSyncStatus();
 * console.log(status.lastJobberSync);
 *
 * // Get next scheduled sync times
 * const nextSyncs = getNextSyncTimes();
 * console.log(nextSyncs.jobber); // "2025-10-03T01:00:00Z"
 */