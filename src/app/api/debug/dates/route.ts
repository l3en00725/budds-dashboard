import { NextResponse } from 'next/server';

export async function GET() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Week start (Monday)
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  // Month start
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStartStr = monthStart.toISOString().split('T')[0];

  // Last month
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  return NextResponse.json({
    today,
    weekStart: weekStartStr,
    monthStart: monthStartStr,
    lastMonthStart: lastMonthStart.toISOString().split('T')[0],
    lastMonthEnd: lastMonthEnd.toISOString().split('T')[0],
    currentMonth: now.getMonth() + 1, // 1-based
    currentYear: now.getFullYear(),
  });
}