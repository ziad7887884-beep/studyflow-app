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
}

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
  settings: AppSettings;
}

export type TrendDirection = 'up' | 'stable' | 'down';
