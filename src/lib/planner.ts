import type { AssignmentSchedule, Lecture, RecurrenceRule } from '@/types';
import { cairoDateTimeKey } from './lectureSchedule';

const dayMs = 86_400_000;
const parse = (key: string) => { const [y, m, d] = key.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const key = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const addDays = (date: Date, days: number) => { const next = new Date(date); next.setDate(next.getDate() + days); return next; };

export function lectureRule(lecture: Lecture): RecurrenceRule {
  return lecture.releaseSchedule.recurrence ?? { kind: 'weekly', weekdays: [lecture.releaseSchedule.dayOfWeek], interval: 1, time: lecture.releaseSchedule.time, startDate: lecture.releaseSchedule.startDate, timezone: 'Africa/Cairo' };
}

/** Produces Cairo-local occurrence keys. The bounded loop is intentional: schedules are personal planner data. */
export function dueOccurrenceKeys(rule: RecurrenceRule, reference = new Date()): string[] {
  if (rule.kind === 'manual' || !rule.startDate) return [];
  const now = cairoDateTimeKey(reference);
  const start = parse(rule.startDate);
  const end = rule.endDate ? parse(rule.endDate) : parse(now);
  if (start > end) return [];
  const result: string[] = [];
  const interval = Math.max(1, rule.interval || 1);
  for (let date = new Date(start), guard = 0; date <= end && guard < 5000; date = addDays(date, 1), guard++) {
    const days = Math.floor((date.getTime() - start.getTime()) / dayMs);
    const matches = rule.kind === 'daily' ? true
      : rule.kind === 'intervalDays' ? days % interval === 0
      : rule.kind === 'intervalWeeks' ? days % (interval * 7) === 0
      : rule.kind === 'weekly' ? (rule.weekdays.length ? rule.weekdays : [start.getDay()]).includes(date.getDay())
      : rule.kind === 'monthly' ? date.getDate() === Math.min(start.getDate(), new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate())
      : false;
    const occurrence = `${key(date)}T${rule.time}`;
    if (matches && occurrence <= now) result.push(occurrence);
  }
  return result;
}

export function nextOccurrenceKey(rule: RecurrenceRule, reference = new Date()): string | null {
  const now = cairoDateTimeKey(reference);
  const start = parse(rule.startDate);
  for (let date = new Date(start), guard = 0; guard < 5000; date = addDays(date, 1), guard++) {
    const probeRule = { ...rule, endDate: key(date) };
    const matches = dueOccurrenceKeys(probeRule, new Date(`${key(date)}T23:59:00`));
    const matched = matches[matches.length - 1];
    if (matched === `${key(date)}T${rule.time}` && matched > now) return matched;
    if (rule.endDate && key(date) > rule.endDate) return null;
  }
  return null;
}

export function assignmentDueDate(schedule: AssignmentSchedule, occurrenceKey: string): { date: string; time: string } {
  return { date: key(addDays(parse(occurrenceKey), schedule.dueOffsetDays)), time: schedule.dueTime };
}
