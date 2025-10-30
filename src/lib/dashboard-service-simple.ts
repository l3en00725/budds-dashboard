import { createServerComponentClient } from './supabase';
import { Database } from './supabase';
import {
  getTodayStringET,
  getTodayStartET,
  getTomorrowStartET,
  getWeekStartET,
  getWeekStartStringET
} from './timezone-utils';

export interface CallAnalyticsMetrics {
  today: {
    totalCalls: number;
    inboundCalls: number;
    outboundCalls: number;
    qualifiedInboundCalls: number;
    appointmentsBooked: number;
    followUpsScheduled: number;
    notInterested: number;
    positivesentiment: number;
    averageConfidence: number;
    emergencyCallsToday: number;
    pipelineBreakdown: {
      qualified: number;
      followUp: number;
      newLeads: number;
      closedLost: number;
    };
  };
  thisWeek: {
    totalCalls: number;
    inboundCalls: number;
    outboundCalls: number;
    appointmentsBooked: number;
    emergencyCallsWeek: number;
    averageConfidence: number;
    trends: {
      callsChange: number;
      bookedChange: number;
      emergencyChange: number;
    };
  };
}

export interface DashboardMetrics {
  callAnalytics: CallAnalyticsMetrics;
}

export class DashboardService {
  private supabase: any;

  constructor() {
    // Initialize in async method
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createServerComponentClient();
    }
    return this.supabase;
  }

  private getWeekStart(): string {
    return getWeekStartStringET();
  }

  private getWeekStartDate(): Date {
    return getWeekStartET();
  }

  private getTodayString(): string {
    return getTodayStringET();
  }

  async getCallAnalytics(): Promise<CallAnalyticsMetrics> {
    const supabase = await this.getSupabase();
    const todayStart = getTodayStartET();
    const tomorrowStart = getTomorrowStartET();
    const weekStartDate = this.getWeekStartDate();
    const weekStart = weekStartDate.toISOString();
    const lastWeekStart = new Date(
      weekStartDate.getTime() - 7 * 24 * 60 * 60 * 1000,
    );
    const lastWeekEnd = new Date(weekStartDate.getTime() - 1);

    // Get today's calls using new schema fields (ET timezone) - include direction field
    const { data: todayCalls } = await supabase
      .from('openphone_calls')
      .select(
        'classified_as_booked, ai_confidence, transcript, duration, caller_number, is_emergency, service_type, sentiment, direction',
      )
      .gte('call_date', todayStart.toISOString())
      .lt('call_date', tomorrowStart.toISOString());

    // Get this week's calls - include direction field
    const { data: thisWeekCalls } = await supabase
      .from('openphone_calls')
      .select(
        'classified_as_booked, ai_confidence, transcript, duration, caller_number, is_emergency, service_type, sentiment, direction',
      )
      .gte('call_date', weekStart)
      .lt('call_date', tomorrowStart.toISOString());

    // Get last week's calls for comparison - include direction field
    const { data: lastWeekCalls } = await supabase
      .from('openphone_calls')
      .select(
        'classified_as_booked, ai_confidence, transcript, duration, caller_number, is_emergency, service_type, sentiment, direction',
      )
      .gte('call_date', lastWeekStart.toISOString())
      .lt('call_date', lastWeekEnd.toISOString());

    // Process today's data
    const todayData = this.processCallData(todayCalls || []);

    // Process this week's data
    const thisWeekData = this.processCallData(thisWeekCalls || []);
    const lastWeekData = this.processCallData(lastWeekCalls || []);

    // Calculate trends
    const callsChange =
      lastWeekData.totalCalls > 0
        ? Math.round(
            ((thisWeekData.totalCalls - lastWeekData.totalCalls) /
              lastWeekData.totalCalls) *
              100,
          )
        : 0;

    const bookedChange =
      lastWeekData.appointmentsBooked > 0
        ? Math.round(
            ((thisWeekData.appointmentsBooked -
              lastWeekData.appointmentsBooked) /
              lastWeekData.appointmentsBooked) *
              100,
          )
        : 0;

    const emergencyChange =
      lastWeekData.emergencyCallsToday > 0
        ? Math.round(
            ((thisWeekData.emergencyCallsToday -
              lastWeekData.emergencyCallsToday) /
              lastWeekData.emergencyCallsToday) *
              100,
          )
        : 0;

    return {
      today: todayData,
      thisWeek: {
        totalCalls: thisWeekData.totalCalls,
        inboundCalls: thisWeekData.inboundCalls,
        outboundCalls: thisWeekData.outboundCalls,
        appointmentsBooked: thisWeekData.appointmentsBooked,
        emergencyCallsWeek: thisWeekData.emergencyCallsToday,
        averageConfidence: thisWeekData.averageConfidence,
        trends: {
          callsChange,
          bookedChange,
          emergencyChange,
        },
      },
    };
  }

  private processCallData(calls: any[]) {
    const totalCalls = calls?.length || 0;

    if (totalCalls === 0) {
      return {
        totalCalls: 0,
        inboundCalls: 0,
        outboundCalls: 0,
        qualifiedInboundCalls: 0,
        appointmentsBooked: 0,
        followUpsScheduled: 0,
        notInterested: 0,
        positivesentiment: 0,
        averageConfidence: 0,
        emergencyCallsToday: 0,
        pipelineBreakdown: {
          qualified: 0,
          followUp: 0,
          newLeads: 0,
          closedLost: 0,
        },
      };
    }

    // Split calls by direction
    const inboundCalls =
      calls?.filter(
        (call) =>
          !call.direction ||
          call.direction.toLowerCase() === 'incoming' ||
          call.direction.toLowerCase() === 'inbound',
      ) || [];

    const outboundCalls =
      calls?.filter(
        (call) =>
          call.direction &&
          (call.direction.toLowerCase() === 'outgoing' ||
            call.direction.toLowerCase() === 'outbound'),
      ) || [];

    // Filter for qualified inbound calls (real conversations, not spam/hangups)
    const qualifiedInboundCalls = inboundCalls.filter(
      (call) =>
        (call.duration || 0) >= 30 && // Not a hangup/missed call
        !call.caller_number?.toLowerCase().includes('spam') && // Not marked as spam
        (call.transcript?.length || 0) > 50, // Had actual conversation
    );

    // Only count inbound calls for appointments booked
    const appointmentsBooked = inboundCalls.filter(
      (call) => call.classified_as_booked === true,
    ).length;

    // Follow-ups: outbound calls with follow-up keywords
    const followUpKeywords = [
      'follow up',
      'check in',
      'checking in',
      'confirm satisfaction',
      'how did',
      'feedback',
    ];
    const followUpsScheduled = outboundCalls.filter((call) =>
      followUpKeywords.some((keyword) =>
        call.transcript?.toLowerCase().includes(keyword),
      ),
    ).length;

    // Not interested (inbound only)
    const notInterested = inboundCalls.filter(
      (call) => call.classified_as_booked === false && call.duration > 30,
    ).length;

    // Use sentiment field if available, fall back to confidence/booked status
    const positivesentiment =
      calls?.filter((call) => {
        if (call.sentiment) {
          return call.sentiment.toLowerCase() === 'positive';
        }
        return (
          call.classified_as_booked === true || (call.ai_confidence || 0) > 0.7
        );
      }).length || 0;

    // Use is_emergency field if available, fall back to transcript keywords
    const emergencyCallsToday =
      calls?.filter((call) => {
        if (call.is_emergency !== undefined && call.is_emergency !== null) {
          return call.is_emergency === true;
        }
        // Fallback to transcript keywords
        const transcript = call.transcript?.toLowerCase() || '';
        return (
          transcript.includes('emergency') ||
          transcript.includes('leak') ||
          transcript.includes('leaking') ||
          transcript.includes('flood') ||
          transcript.includes('flooding') ||
          transcript.includes('no heat') ||
          transcript.includes('burst')
        );
      }).length || 0;

    // Use ai_confidence (0-1 decimal), convert to percentage
    const confidenceScores =
      calls
        ?.map((call) => {
          const confidence = call.ai_confidence || 0;
          // If confidence is already 0-1, multiply by 100; if it's 0-100, use as-is
          return confidence <= 1 ? confidence * 100 : confidence;
        })
        .filter((score) => score > 0) || [];

    const averageConfidence =
      confidenceScores.length > 0
        ? Math.round(
            confidenceScores.reduce((sum, score) => sum + score, 0) /
              confidenceScores.length,
          )
        : 0;

    // Pipeline breakdown (inbound calls only)
    const pipelineBreakdown = {
      qualified: inboundCalls.filter(
        (call) => call.classified_as_booked === true,
      ).length,
      followUp: inboundCalls.filter((call) => {
        const transcript = call.transcript?.toLowerCase() || '';
        return (
          transcript.includes('call back') || transcript.includes('follow')
        );
      }).length,
      newLeads: inboundCalls.filter(
        (call) => call.classified_as_booked === false && call.duration < 60,
      ).length,
      closedLost: inboundCalls.filter(
        (call) => call.classified_as_booked === false && call.duration > 60,
      ).length,
    };

    return {
      totalCalls,
      inboundCalls: inboundCalls.length,
      outboundCalls: outboundCalls.length,
      qualifiedInboundCalls: qualifiedInboundCalls.length,
      appointmentsBooked,
      followUpsScheduled,
      notInterested,
      positivesentiment,
      averageConfidence,
      emergencyCallsToday,
      pipelineBreakdown,
    };
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const callAnalytics = await this.getCallAnalytics();

    return {
      callAnalytics,
    };
  }
}
