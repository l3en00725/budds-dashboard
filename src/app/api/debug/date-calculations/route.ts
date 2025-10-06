import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-based: 9 = October
    const currentDayOfMonth = now.getDate();

    // Current calculations
    const startOfMonth = new Date(currentYear, currentMonth, 1); // October 2025
    const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1); // September 2025
    const startOfNextMonth = new Date(currentYear, currentMonth + 1, 1); // November 2025

    // For same-day comparison in last month
    const lastMonthSameDayEnd = new Date(currentYear, currentMonth - 1, currentDayOfMonth + 1);

    const debugInfo = {
      currentDate: now.toISOString(),
      currentYear,
      currentMonth,
      currentDayOfMonth,
      calculations: {
        startOfMonth: startOfMonth.toISOString(),
        startOfLastMonth: startOfLastMonth.toISOString(),
        startOfNextMonth: startOfNextMonth.toISOString(),
        lastMonthSameDayEnd: lastMonthSameDayEnd.toISOString(),
      },
      dateRanges: {
        thisMonthRange: `${startOfMonth.toISOString().split('T')[0]} to ${startOfNextMonth.toISOString().split('T')[0]}`,
        lastMonthRange: `${startOfLastMonth.toISOString().split('T')[0]} to ${startOfMonth.toISOString().split('T')[0]}`,
        lastMonthSamePeriodRange: `${startOfLastMonth.toISOString().split('T')[0]} to ${lastMonthSameDayEnd.toISOString().split('T')[0]}`,
      }
    };

    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error('Debug date calculations error:', error);
    return NextResponse.json({ error: 'Failed to debug date calculations' }, { status: 500 });
  }
}