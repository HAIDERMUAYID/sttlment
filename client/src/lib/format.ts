import moment from 'moment-timezone';

// Format date in Baghdad timezone
export function formatDate(date: string | Date, format: string = 'YYYY-MM-DD'): string {
  return moment(date).tz('Asia/Baghdad').format(format);
}

// Format time in Baghdad timezone (24h)
export function formatTime(date: string | Date, format: string = 'HH:mm'): string {
  return moment(date).tz('Asia/Baghdad').format(format);
}

// Format time as 12-hour (e.g. 10:30 ص، 08:24 م)
export function formatTime12h(time: string | Date | null | undefined): string {
  if (time == null || time === '') return '—';
  const m = typeof time === 'string' && time.length <= 8
    ? moment(time, ['HH:mm', 'HH:mm:ss', 'H:mm', 'H:mm:ss'])
    : moment(time).tz('Asia/Baghdad');
  return m.isValid() ? m.locale('ar').format('hh:mm A') : String(time);
}

// Format datetime in Baghdad timezone
export function formatDateTime(date: string | Date, format: string = 'YYYY-MM-DD HH:mm'): string {
  return moment(date).tz('Asia/Baghdad').format(format);
}

// Get relative time (e.g., "2 hours ago")
export function getRelativeTime(date: string | Date): string {
  return moment(date).tz('Asia/Baghdad').fromNow();
}

// Get today in Baghdad timezone
export function getToday(): string {
  return moment().tz('Asia/Baghdad').format('YYYY-MM-DD');
}

// Get now in Baghdad timezone
export function getNow(): Date {
  return moment().tz('Asia/Baghdad').toDate();
}

// Check if date is today
export function isToday(date: string | Date): boolean {
  return moment(date).tz('Asia/Baghdad').isSame(moment().tz('Asia/Baghdad'), 'day');
}

// Check if date is overdue
export function isOverdue(date: string | Date): boolean {
  return moment(date).tz('Asia/Baghdad').isBefore(moment().tz('Asia/Baghdad'), 'day');
}
