import { NextResponse } from 'next/server';
import {
  getTodayStringET,
  getTodayStartET,
  getTomorrowStartET,
  getWeekStartET,
  getWeekStartStringET,
  formatDateET
} from '@/lib/timezone-utils';

export async function GET() {
  const now = new Date();

  const todayStringET = getTodayStringET();
  const todayStartET = getTodayStartET();
  const tomorrowStartET = getTomorrowStartET();
  const weekStartET = getWeekStartET();
  const weekStartStringET = getWeekStartStringET();

  // Current time in different formats
  const utcNow = now.toISOString();
  const etNow = formatDateET(now, true);

  // Calculate the UTC offset for ET
  const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  const etDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const offsetHours = (utcDate.getTime() - etDate.getTime()) / (1000 * 60 * 60);

  return NextResponse.json({
    currentTime: {
      utc: utcNow,
      easternTime: etNow,
      offsetFromUTC: `UTC${offsetHours >= 0 ? '+' : ''}${offsetHours}`
    },
    todayInET: {
      dateString: todayStringET,
      startOfDay: {
        iso: todayStartET.toISOString(),
        formatted: formatDateET(todayStartET, true)
      },
      endOfDay: {
        iso: tomorrowStartET.toISOString(),
        formatted: formatDateET(tomorrowStartET, true)
      }
    },
    weekInET: {
      startDateString: weekStartStringET,
      startOfWeek: {
        iso: weekStartET.toISOString(),
        formatted: formatDateET(weekStartET, true)
      }
    },
    explanation: {
      message: "All date filtering should use these ET-based timestamps",
      example: `Queries for 'today' should use: call_date >= '${todayStartET.toISOString()}' AND call_date < '${tomorrowStartET.toISOString()}'`,
      midnightET: `Midnight ET (${todayStringET} 00:00:00 ET) = ${todayStartET.toISOString()} in UTC`,
      correctBehavior: "This ensures 'today's calls' resets at midnight Eastern Time, not UTC midnight"
    }
  });
}
