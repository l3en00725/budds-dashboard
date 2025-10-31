/**
 * Unified Call Query Builder
 * 
 * Single source of truth for call filtering logic.
 * Ensures summary counts and detail views use identical filters.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getTodayStartET, getTomorrowStartET } from './timezone-utils';

export type CallCategory = 'booked' | 'emergency' | 'followup' | 'total' | 'qualified';

export interface QueryFilters {
  category: CallCategory;
  startDate?: Date;
  endDate?: Date;
  includeAnalysis?: boolean;
}

export interface QueryDebugInfo {
  category: CallCategory;
  dateRange: { start: string; end: string };
  filters: string[];
  excludes: string[];
}

/**
 * Build a Supabase query for calls with consistent filtering
 */
export function buildCallQuery(
  supabase: SupabaseClient,
  filters: QueryFilters
) {
  const { category, startDate, endDate, includeAnalysis = false } = filters;
  
  // Use consistent date range
  const rangeStart = startDate || getTodayStartET();
  const rangeEnd = endDate || getTomorrowStartET();
  
  // Build select clause
  const selectClause = includeAnalysis
    ? `
        *,
        analysis:calls_ai_analysis!left(
          category, 
          intent, 
          sentiment, 
          service_detail, 
          customer_need, 
          confidence, 
          needs_review
        )
      `
    : '*';
  
  // Start with base query
  let query = supabase
    .from('openphone_calls')
    .select(selectClause)
    .gte('call_date', rangeStart.toISOString())
    .lt('call_date', rangeEnd.toISOString())
    .not('call_id', 'like', 'test%')         // Exclude test calls
    .not('call_id', 'like', 'ACtest%')       // Exclude test calls
    .order('call_date', { ascending: false });
  
  // Apply category-specific filters
  query = applyCategoryFilter(query, category);
  
  // Debug info
  const debugInfo: QueryDebugInfo = {
    category,
    dateRange: {
      start: rangeStart.toISOString(),
      end: rangeEnd.toISOString(),
    },
    filters: getCategoryFilterDescription(category),
    excludes: ['test%', 'ACtest%'],
  };
  
  return { query, debugInfo };
}

/**
 * Apply category-specific filters to query
 */
function applyCategoryFilter(query: any, category: CallCategory) {
  switch (category) {
    case 'booked':
      // CRITICAL: Use proper AND logic for inbound + booked
      // Filter 1: Must be classified as booked
      // Filter 2: Must be inbound (or null/unknown direction)
      return query
        .eq('classified_as_booked', true)
        .or('direction.is.null,direction.eq.inbound,direction.eq.incoming');
      
    case 'emergency':
      // Use is_emergency field OR emergency keywords in transcript
      return query.or(
        'is_emergency.eq.true,' +
        'transcript.ilike.%emergency%,' +
        'transcript.ilike.%leak%,' +
        'transcript.ilike.%flooding%,' +
        'transcript.ilike.%burst%'
      );
      
    case 'followup':
      // Follow-up keywords in transcript
      return query.or(
        'transcript.ilike.%call back%,' +
        'transcript.ilike.%follow up%,' +
        'transcript.ilike.%checking in%'
      );
    
    case 'qualified':
      // Qualified calls: inbound, >30s duration, has transcript
      // Note: Additional filtering happens in JavaScript
      return query
        .or('direction.is.null,direction.eq.inbound,direction.eq.incoming')
        .gte('duration', 30)
        .not('transcript', 'is', null);
      
    case 'total':
      // No additional filters - return all calls in date range
      return query;
      
    default:
      return query;
  }
}

/**
 * Get human-readable description of category filters
 */
function getCategoryFilterDescription(category: CallCategory): string[] {
  switch (category) {
    case 'booked':
      return [
        'classified_as_booked = true',
        'direction IN (null, inbound, incoming)'
      ];
    case 'emergency':
      return [
        'is_emergency = true OR',
        'transcript ILIKE %emergency% OR',
        'transcript ILIKE %leak/flooding/burst%'
      ];
    case 'followup':
      return [
        'transcript ILIKE %call back% OR',
        'transcript ILIKE %follow up%'
      ];
    case 'qualified':
      return [
        'direction IN (null, inbound, incoming)',
        'duration >= 30',
        'transcript IS NOT NULL'
      ];
    case 'total':
      return ['No additional filters'];
    default:
      return [];
  }
}

/**
 * Post-process results with JavaScript filters
 * (for complex logic that's easier in JS than SQL)
 */
export function postProcessCalls(calls: any[], category: CallCategory): any[] {
  if (category === 'qualified') {
    // Additional JavaScript filters for qualified calls
    return calls.filter(call => 
      (call.duration || 0) >= 30 &&
      !call.caller_number?.toLowerCase().includes('spam') &&
      !call.caller_number?.startsWith('AC') &&
      (call.transcript?.length || 0) > 50 &&
      call.transcript !== null &&
      call.transcript !== ''
    );
  }
  
  return calls;
}

/**
 * Count calls by direction (for statistics)
 */
export function countByDirection(calls: any[]): {
  total: number;
  inbound: number;
  outbound: number;
  unknown: number;
} {
  const inbound = calls.filter(
    call =>
      !call.direction ||
      call.direction.toLowerCase() === 'incoming' ||
      call.direction.toLowerCase() === 'inbound'
  ).length;
  
  const outbound = calls.filter(
    call =>
      call.direction &&
      (call.direction.toLowerCase() === 'outgoing' ||
       call.direction.toLowerCase() === 'outbound')
  ).length;
  
  return {
    total: calls.length,
    inbound,
    outbound,
    unknown: calls.length - inbound - outbound,
  };
}

