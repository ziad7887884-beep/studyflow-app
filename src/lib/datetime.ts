// Date/time utilities — all study data keyed by YYYY-MM-DD dates

export function todayKey(): string {
  return dateKey(new Date());
}

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function lastNDays(n: number): string[] {
  const result: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    result.push(dateKey(addDays(today, -i)));
  }
  return result;
}

export function formatDateLong(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateLongFromKey(key: string): string {
  return formatDateLong(parseDateKey(key));
}

export function formatDateShortFromKey(key: string): string {
  const d = parseDateKey(key);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatDayName(key: string): string {
  const d = parseDateKey(key);
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatDurationShort(minutes: number): string {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
}

export function getGreeting(d: Date): string {
  const h = d.getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

export function getCairoDate(): Date {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
  }).formatToParts(now);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return new Date(value('year'), value('month') - 1, value('day'), value('hour') % 24, value('minute'), value('second'));
}

export function formatCairoTime(): { hh: string; mm: string; ss: string } {
  const cairo = getCairoDate();
  return {
    hh: String(cairo.getHours()).padStart(2, '0'),
    mm: String(cairo.getMinutes()).padStart(2, '0'),
    ss: String(cairo.getSeconds()).padStart(2, '0'),
  };
}

export function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60; // overnight
  return mins;
}

export function startOfWeek(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  const diff = r.getDate() - day; // Sunday start
  r.setDate(diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function getWeekKeys(d: Date): string[] {
  const start = startOfWeek(d);
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    keys.push(dateKey(addDays(start, i)));
  }
  return keys;
}

export function monthName(m: number): string {
  return new Date(2000, m, 1).toLocaleDateString('en-US', { month: 'long' });
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}
