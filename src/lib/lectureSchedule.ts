import type { Lecture } from '@/types';

export const LECTURE_TIME_ZONE = 'Africa/Cairo';

export function cairoDateTimeKey(reference = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: LECTURE_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(reference);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}`;
}

function dateFromKey(key: string): Date | null {
  const [year, month, day] = key.split('-').map(Number);
  if (!year || !month || !day) return null;
  const result = new Date(year, month - 1, day);
  return Number.isNaN(result.getTime()) ? null : result;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Returns the most recent scheduled release at or before the supplied Cairo wall-clock time. */
export function latestReleaseKey(lecture: Lecture, reference = new Date()): string | null {
  const { dayOfWeek, time, startDate } = lecture.releaseSchedule;
  const start = dateFromKey(startDate);
  if (!start || !/^\d{2}:\d{2}$/.test(time) || dayOfWeek < 0 || dayOfWeek > 6) return null;

  const nowKey = cairoDateTimeKey(reference);
  const today = dateFromKey(nowKey.slice(0, 10));
  if (!today || start > today) return null;

  const first = new Date(start);
  first.setDate(first.getDate() + ((dayOfWeek - first.getDay() + 7) % 7));
  const candidate = new Date(first);
  const fullWeeks = Math.floor((today.getTime() - candidate.getTime()) / (7 * 86_400_000));
  if (fullWeeks < 0) return null;
  candidate.setDate(candidate.getDate() + fullWeeks * 7);

  let key = `${dateKey(candidate)}T${time}`;
  if (key > nowKey) {
    candidate.setDate(candidate.getDate() - 7);
    key = `${dateKey(candidate)}T${time}`;
  }
  return key >= `${startDate}T00:00` ? key : null;
}

export function nextReleaseKey(lecture: Lecture, reference = new Date()): string | null {
  const latest = latestReleaseKey(lecture, reference);
  if (!latest) {
    const start = dateFromKey(lecture.releaseSchedule.startDate);
    if (!start) return null;
    start.setDate(start.getDate() + ((lecture.releaseSchedule.dayOfWeek - start.getDay() + 7) % 7));
    return `${dateKey(start)}T${lecture.releaseSchedule.time}`;
  }
  const date = dateFromKey(latest.slice(0, 10));
  if (!date) return null;
  date.setDate(date.getDate() + 7);
  return `${dateKey(date)}T${lecture.releaseSchedule.time}`;
}

function releasesBetween(lastProcessedKey: string | null, latestKey: string): number {
  if (!lastProcessedKey) return 1;
  const last = dateFromKey(lastProcessedKey.slice(0, 10));
  const latest = dateFromKey(latestKey.slice(0, 10));
  if (!last || !latest || latest <= last) return 0;
  return Math.floor((latest.getTime() - last.getTime()) / (7 * 86_400_000));
}

/** Applies every unprocessed weekly release exactly once. Safe to call repeatedly. */
export function applyLectureReleases(lectures: Lecture[], reference = new Date()): Lecture[] {
  return lectures.map((lecture) => {
    const latest = latestReleaseKey(lecture, reference);
    if (!latest || latest === lecture.lastReleasedKey) return lecture;
    const releases = releasesBetween(lecture.lastReleasedKey, latest);
    if (releases <= 0) return lecture;
    const released = releases * lecture.releaseSchedule.lecturesPerRelease;
    return {
      ...lecture,
      backlog: lecture.backlog + released,
      totalReleased: lecture.totalReleased + released,
      lastReleasedKey: latest,
    };
  });
}
