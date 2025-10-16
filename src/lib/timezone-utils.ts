/**
 * Timezone utility functions for handling Eastern Time (America/New_York)
 *
 * All date filtering in the dashboard should use Eastern Time, not UTC.
 * This ensures "today's calls" resets at midnight ET, not UTC.
 */

const EASTERN_TIMEZONE = 'America/New_York';

/**
 * Get the current date in Eastern Time as a YYYY-MM-DD string
 * @returns Date string in format YYYY-MM-DD (e.g., "2025-10-16")
 */
export function getTodayStringET(): string {
  const now = new Date();

  // Convert to Eastern Time using toLocaleString
  const etDateString = now.toLocaleString('en-US', {
    timeZone: EASTERN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  // Parse MM/DD/YYYY format and convert to YYYY-MM-DD
  const [month, day, year] = etDateString.split('/');
  return `${year}-${month}-${day}`;
}

/**
 * Get the start of today (midnight) in Eastern Time as a Date object
 * @returns Date object representing midnight ET (00:00:00) in UTC
 */
export function getTodayStartET(): Date {
  const todayET = getTodayStringET();

  // Create a date string for midnight ET
  const midnightETString = `${todayET}T00:00:00`;

  // Parse this as if it's in ET timezone by using a workaround:
  // Get current time in both UTC and ET to calculate offset
  const now = new Date();
  const utcTime = now.getTime();

  // Get the time parts in ET
  const etTimeString = now.toLocaleString('en-US', {
    timeZone: EASTERN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  // Create Date from ET string parts (will be interpreted as local timezone)
  const [etDatePart, etTimePart] = etTimeString.split(', ');
  const [etMonth, etDay, etYear] = etDatePart.split('/');
  const [etHour, etMinute, etSecond] = etTimePart.split(':');
  const etAsLocal = new Date(`${etYear}-${etMonth}-${etDay}T${etHour}:${etMinute}:${etSecond}`);

  // Calculate the offset between UTC and ET
  const offset = utcTime - etAsLocal.getTime();

  // Now create midnight ET for today
  const [year, month, day] = todayET.split('-');
  const midnightETAsLocal = new Date(`${year}-${month}-${day}T00:00:00`);

  // Apply the offset to get the correct UTC time
  return new Date(midnightETAsLocal.getTime() + offset);
}

/**
 * Get the end of today (11:59:59.999 PM) in Eastern Time as an ISO string
 * @returns ISO string representing end of day ET in UTC
 */
export function getTodayEndET(): Date {
  const startOfDay = getTodayStartET();
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);
  return endOfDay;
}

/**
 * Get tomorrow's start (midnight tomorrow) in Eastern Time
 * @returns Date object representing midnight tomorrow ET in UTC
 */
export function getTomorrowStartET(): Date {
  const startOfToday = getTodayStartET();
  return new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
}

/**
 * Get the start of the current week (Monday at midnight) in Eastern Time
 * @returns Date object representing start of week ET in UTC
 */
export function getWeekStartET(): Date {
  const now = new Date();

  // Get current date in ET
  const etDateString = now.toLocaleString('en-US', {
    timeZone: EASTERN_TIMEZONE,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  // Calculate days since Monday
  const [weekday, datePart] = etDateString.split(', ');
  const dayMap: { [key: string]: number } = {
    'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
  };
  const currentDay = dayMap[weekday];
  const daysToSubtract = currentDay === 0 ? 6 : currentDay - 1; // Monday is start of week

  const todayStart = getTodayStartET();
  const weekStart = new Date(todayStart.getTime() - daysToSubtract * 24 * 60 * 60 * 1000);

  return weekStart;
}

/**
 * Get the start of the current week as a YYYY-MM-DD string in Eastern Time
 * @returns Date string in format YYYY-MM-DD
 */
export function getWeekStartStringET(): string {
  const weekStart = getWeekStartET();
  return weekStart.toISOString().split('T')[0];
}

/**
 * Format a date to display in Eastern Time
 * @param date Date object or ISO string
 * @param includeTime Whether to include time (default: false)
 * @returns Formatted date string
 */
export function formatDateET(date: Date | string, includeTime: boolean = false): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (includeTime) {
    return dateObj.toLocaleString('en-US', {
      timeZone: EASTERN_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }) + ' ET';
  }

  return dateObj.toLocaleDateString('en-US', {
    timeZone: EASTERN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Convert a date to Eastern Time ISO string (for database queries)
 * @param date Date object
 * @returns ISO string
 */
export function toISOStringET(date: Date): string {
  return date.toISOString();
}
