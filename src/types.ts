export type Priority = 'high' | 'medium' | 'low';

export type PageKey =
  | 'dashboard'
  | 'focus'
  | 'tasks'
  | 'calendar'
  | 'analytics'
  | 'habits'
  | 'sleep'
  | 'goals'
  | 'lectures'
  | 'planner'
  | 'settings';

export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  subjectId: string | null;
  priority: Priority;
  estimatedMinutes: number;
  dueDate: string;
  dueTime: string;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  source?: 'manual' | 'lecture' | 'assignment' | 'reminder';
  sourceRuleId?: string;
  sourceOccurrenceId?: string;
  officialDueDate?: string;
  officialDueTime?: string;
  postponedFrom?: { date: string; time: string } | null;
}

export type RecurrenceKind = 'weekly' | 'daily' | 'intervalDays' | 'intervalWeeks' | 'monthly' | 'manual';
export interface RecurrenceRule { kind: RecurrenceKind; weekdays: number[]; interval: number; time: string; startDate: string; endDate?: string; timezone: string; }
export interface AssignmentSchedule { id: string; title: string; subjectId: string | null; courseId?: string | null; recurrence: RecurrenceRule; dueOffsetDays: number; dueTime: string; estimatedMinutes: number; priority: Priority; createTask: boolean; paused: boolean; createdAt: string; }
export interface ScheduleOccurrence { id: string; ruleId: string; kind: 'lecture' | 'assignment'; scheduledAt: string; processedAt: string; taskId?: string; deletedTask?: boolean; }
export interface AppNotification { id: string; title: string; body: string; occurrenceId?: string; createdAt: string; read: boolean; }

export interface StudySession {
  id: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  subjectId: string | null;
}

export interface Lecture {
  id: string;
  title: string;
  subjectId: string;
  releaseSchedule: {
    frequency: 'weekly';
    dayOfWeek: number;
    time: string;
    startDate: string;
    lecturesPerRelease: number;
    recurrence?: RecurrenceRule;
    createTask?: boolean;
    taskTemplate?: string;
    estimatedMinutes?: number;
    paused?: boolean;
  };
  backlog: number;
  completedCount: number;
  totalReleased: number;
  lastReleasedKey: string | null;
  createdAt: string;
}

export interface SleepEntry {
  id: string;
  date: string;
  sleepTime: string;
  wakeTime: string;
  durationMinutes: number;
}

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  createdAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  completed: boolean;
}

export interface Goals {
  dailyStudyMinutes: number;
  weeklyStudyMinutes: number;
  monthlyStudyMinutes: number;
  taskCompletionPercent: number;
}

export interface TimerSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
}

export interface AppSettings {
  timer: TimerSettings;
  goals: Goals;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

export interface StudyFlowState {
  tasks: Task[];
  studySessions: StudySession[];
  lectures: Lecture[];
  sleepEntries: SleepEntry[];
  habits: Habit[];
  habitLogs: HabitLog[];
  subjects: Subject[];
  assignmentSchedules: AssignmentSchedule[];
  occurrences: ScheduleOccurrence[];
  notifications: AppNotification[];
  settings: AppSettings;
}

export type TrendDirection = 'up' | 'stable' | 'down';
