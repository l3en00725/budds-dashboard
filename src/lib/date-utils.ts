/**
 * Centralized date/time utilities for business operations
 * Always use these functions instead of raw new Date() for business logic
 */

export class BusinessDateUtils {
  // Define your business timezone
  private static readonly BUSINESS_TIMEZONE = 'America/New_York';

  /**
   * Get current date in business timezone as YYYY-MM-DD string
   */
  static getTodayBusinessDate(): string {
    const now = new Date();
    // Get date parts in business timezone
    const year = now.toLocaleDateString("en-CA", { timeZone: this.BUSINESS_TIMEZONE, year: 'numeric' });
    const month = now.toLocaleDateString("en-CA", { timeZone: this.BUSINESS_TIMEZONE, month: '2-digit' });
    const day = now.toLocaleDateString("en-CA", { timeZone: this.BUSINESS_TIMEZONE, day: '2-digit' });
    return `${year}-${month}-${day}`;
  }

  /**
   * Get yesterday's date in business timezone as YYYY-MM-DD string
   */
  static getYesterdayBusinessDate(): string {
    const today = this.getTodayBusinessDate();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  /**
   * Get start of week (Monday) in business timezone
   */
  static getWeekStartBusinessDate(): string {
    const today = this.getTodayBusinessDate();
    const date = new Date(today);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    date.setDate(diff);
    return date.toISOString().split('T')[0];
  }

  /**
   * Get start of month in business timezone
   */
  static getMonthStartBusinessDate(): string {
    const today = this.getTodayBusinessDate();
    const date = new Date(today);
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  }

  /**
   * Format date for display in business timezone
   */
  static formatBusinessDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      timeZone: this.BUSINESS_TIMEZONE,
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  /**
   * Get current business timestamp with timezone info
   */
  static getCurrentBusinessTimestamp(): string {
    const now = new Date();
    return now.toLocaleString("en-US", {
      timeZone: this.BUSINESS_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  /**
   * Debug helper to show all date interpretations
   */
  static debugDates() {
    const now = new Date();
    return {
      systemUTC: now.toISOString(),
      systemLocal: now.toString(),
      businessDate: this.getTodayBusinessDate(),
      businessTimestamp: this.getCurrentBusinessTimestamp(),
      timezone: this.BUSINESS_TIMEZONE
    };
  }
}