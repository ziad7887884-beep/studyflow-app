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
  | 'settings';

export interface Subject {
  id: string;
  name: string;
  icon: string; // lucide icon name
  color: string; // accent color key
}

export interface Task {
  id: string;
  title: string;
  description: string;
  subjectId: string | null; // null = "No Subject"
  priority: Priority;
  estimatedMinutes: number;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:MM
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
}

export interface StudySession {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  durationMinutes: number;
  subjectId: string | null;
}

export interface SleepEntry {
  id: string;
  date: string; // YYYY-MM-DD (the night of)
  sleepTime: string; // HH:MM
  wakeTime: string; // HH:MM
  durationMinutes: number;
}

export interface Habit {
  id: string;
  name: string;
  icon: string; // lucide icon name
  color: string;
  createdAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
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
  sleepEntries: SleepEntry[];
  habits: Habit[];
  habitLogs: HabitLog[];
  subjects: Subject[];
  settings: AppSettings;
}

export type TrendDirection = 'up' | 'stable' | 'down';
