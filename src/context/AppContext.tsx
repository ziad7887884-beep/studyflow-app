import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppSettings, Habit, HabitLog, Lecture, PageKey, SleepEntry, StudySession, Subject, StudyFlowState, Task } from '@/types';
import { loadState, saveState } from '@/lib/storage';
import { createEmptyState } from '@/lib/emptyState';
import { todayKey } from '@/lib/datetime';

interface AppContextValue {
  tasks: Task[];
  studySessions: StudySession[];
  lectures: Lecture[];
  sleepEntries: SleepEntry[];
  habits: Habit[];
  habitLogs: HabitLog[];
  subjects: Subject[];
  settings: AppSettings;
  currentPage: PageKey;
  setCurrentPage: (page: PageKey) => void;
  isLoading: boolean;
  isSaving: boolean;
  isRemote: boolean;
  updateTasks: (updater: (items: Task[]) => Task[]) => void;
  updateSessions: (updater: (items: StudySession[]) => StudySession[]) => void;
  updateLectures: (updater: (items: Lecture[]) => Lecture[]) => void;
  updateSleep: (updater: (items: SleepEntry[]) => SleepEntry[]) => void;
  updateHabits: (updater: (items: Habit[]) => Habit[]) => void;
  updateHabitLogs: (updater: (items: HabitLog[]) => HabitLog[]) => void;
  updateSubjects: (updater: (items: Subject[]) => Subject[]) => void;
  updateSettings: (updater: (settings: AppSettings) => AppSettings) => void;
  toggleTask: (id: string) => void;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'completed' | 'completedAt'>) => void;
  updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => void;
  deleteTask: (id: string) => void;
  addStudySession: (session: Omit<StudySession, 'id'>) => void;
  addSleepEntry: (entry: Omit<SleepEntry, 'id' | 'durationMinutes'>) => void;
  toggleHabit: (habitId: string, date?: string) => void;
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt'>) => void;
  deleteHabit: (id: string) => void;
  addSubject: (subject: Omit<Subject, 'id'>) => void;
  renameSubject: (id: string, name: string) => void;
  updateSubject: (id: string, updates: Partial<Omit<Subject, 'id'>>) => void;
  deleteSubject: (id: string, reassignTo: string | null) => void;
  addLecture: (lecture: Omit<Lecture, 'id' | 'createdAt' | 'lastReleasedKey'>) => void;
  updateLecture: (id: string, updates: Partial<Omit<Lecture, 'id' | 'createdAt'>>) => void;
  deleteLecture: (id: string) => void;
  completeLecture: (id: string) => void;
  clearAllData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);
const rid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function lectureReleaseKey(lecture: Lecture, reference = new Date()): string | null {
  const schedule = lecture.releaseSchedule;
  const start = new Date(`${schedule.startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;

  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const ref = new Date(reference);
  ref.setHours(0, 0, 0, 0);
  if (cursor > ref) return null;

  cursor.setDate(cursor.getDate() + ((schedule.dayOfWeek - cursor.getDay() + 7) % 7));
  if (cursor > ref) return null;

  const weeks = Math.floor((ref.getTime() - cursor.getTime()) / (7 * 86400000));
  cursor.setDate(cursor.getDate() + weeks * 7);
  return `${localDateKey(cursor)}T${schedule.time}`;
}

function applyLectureReleases(lectures: Lecture[], reference = new Date()): Lecture[] {
  return lectures.map((lecture) => {
    const latestRelease = lectureReleaseKey(lecture, reference);
    if (!latestRelease || latestRelease === lecture.lastReleasedKey) return lecture;

    const latest = new Date(latestRelease.replace(' ', 'T'));
    const last = lecture.lastReleasedKey ? new Date(lecture.lastReleasedKey.replace(' ', 'T')) : null;
    const start = last && !Number.isNaN(last.getTime()) ? last : null;

    const scheduleStart = new Date(`${lecture.releaseSchedule.startDate}T${lecture.releaseSchedule.time}`);
    if (start && !Number.isNaN(scheduleStart.getTime()) && start >= latest) return lecture;

    let additions = 0;
    let cursor = start ? new Date(start) : new Date(scheduleStart);
    if (!start && !Number.isNaN(cursor.getTime()) && cursor <= latest) additions = 1;

    if (start) {
      cursor.setDate(cursor.getDate() + 7);
      while (cursor <= latest) {
        additions += 1;
        cursor.setDate(cursor.getDate() + 7);
        if (additions > 520) break;
      }
    }

    return { ...lecture, backlog: lecture.backlog + additions, lastReleasedKey: latestRelease };
  });
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StudyFlowState | null>(null);
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemote, setIsRemote] = useState(true);

  useEffect(() => {
    let mounted = true;
    loadState().then(({ state, remote }) => {
      if (mounted) {
        const normalized = { ...state, lectures: state.lectures ?? [] };
        setData(normalized);
        setIsRemote(remote);
        setIsLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!data || data.lectures.length === 0) return;
    const updatedLectures = applyLectureReleases(data.lectures);
    const changed = updatedLectures.some((lecture, i) =>
      lecture.backlog !== data.lectures[i].backlog || lecture.lastReleasedKey !== data.lectures[i].lastReleasedKey
    );
    if (!changed) return;

    setData((prev) => {
      if (!prev) return prev;
      const next = { ...prev, lectures: updatedLectures };
      setIsSaving(true);
      saveState(next).finally(() => setIsSaving(false));
      return next;
    });
  }, [data]);

  const commit = useCallback((updater: (prev: StudyFlowState) => StudyFlowState) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      setIsSaving(true);
      saveState(next).finally(() => setIsSaving(false));
      return next;
    });
  }, []);

  const updateTasks = useCallback((updater: (items: Task[]) => Task[]) => commit((p) => ({ ...p, tasks: updater(p.tasks) })), [commit]);
  const updateSessions = useCallback((updater: (items: StudySession[]) => StudySession[]) => commit((p) => ({ ...p, studySessions: updater(p.studySessions) })), [commit]);
  const updateLectures = useCallback((updater: (items: Lecture[]) => Lecture[]) => commit((p) => ({ ...p, lectures: updater(p.lectures) })), [commit]);
  const updateSleep = useCallback((updater: (items: SleepEntry[]) => SleepEntry[]) => commit((p) => ({ ...p, sleepEntries: updater(p.sleepEntries) })), [commit]);
  const updateHabits = useCallback((updater: (items: Habit[]) => Habit[]) => commit((p) => ({ ...p, habits: updater(p.habits) })), [commit]);
  const updateHabitLogs = useCallback((updater: (items: HabitLog[]) => HabitLog[]) => commit((p) => ({ ...p, habitLogs: updater(p.habitLogs) })), [commit]);
  const updateSubjects = useCallback((updater: (items: Subject[]) => Subject[]) => commit((p) => ({ ...p, subjects: updater(p.subjects) })), [commit]);
  const updateSettings = useCallback((updater: (settings: AppSettings) => AppSettings) => commit((p) => ({ ...p, settings: updater(p.settings) })), [commit]);

  const toggleTask = useCallback((taskId: string) => updateTasks((items) => items.map((task) => task.id === taskId ? { ...task, completed: !task.completed, completedAt: !task.completed ? new Date().toISOString() : null } : task)), [updateTasks]);
  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt' | 'completed' | 'completedAt'>) => updateTasks((items) => [{ ...task, id: rid(), createdAt: new Date().toISOString(), completed: false, completedAt: null }, ...items]), [updateTasks]);
  const updateTask = useCallback((taskId: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => updateTasks((items) => items.map((task) => task.id === taskId ? { ...task, ...updates } : task)), [updateTasks]);
  const deleteTask = useCallback((taskId: string) => updateTasks((items) => items.filter((task) => task.id !== taskId)), [updateTasks]);
  const addStudySession = useCallback((session: Omit<StudySession, 'id'>) => updateSessions((items) => [...items, { ...session, id: rid() }]), [updateSessions]);
  const addSleepEntry = useCallback((entry: Omit<SleepEntry, 'id' | 'durationMinutes'>) => {
    const [sh, sm] = entry.sleepTime.split(':').map(Number);
    const [wh, wm] = entry.wakeTime.split(':').map(Number);
    let durationMinutes = (wh * 60 + wm) - (sh * 60 + sm);
    if (durationMinutes < 0) durationMinutes += 1440;
    updateSleep((items) => [{ ...entry, id: rid(), durationMinutes }, ...items.filter((item) => item.date !== entry.date)]);
  }, [updateSleep]);
  const toggleHabit = useCallback((habitId: string, date = todayKey()) => {
    updateHabitLogs((items) => {
      const existing = items.find((item) => item.habitId === habitId && item.date === date);
      if (existing) return items.map((item) => item.id === existing.id ? { ...item, completed: !item.completed } : item);
      return [...items, { id: rid(), habitId, date, completed: true }];
    });
  }, [updateHabitLogs]);
  const addHabit = useCallback((habit: Omit<Habit, 'id' | 'createdAt'>) => updateHabits((items) => [...items, { ...habit, id: rid(), createdAt: new Date().toISOString() }]), [updateHabits]);
  const deleteHabit = useCallback((habitId: string) => commit((p) => ({ ...p, habits: p.habits.filter((habit) => habit.id !== habitId), habitLogs: p.habitLogs.filter((log) => log.habitId !== habitId) })), [commit]);
  const addSubject = useCallback((subject: Omit<Subject, 'id'>) => updateSubjects((items) => [...items, { ...subject, id: rid() }]), [updateSubjects]);
  const renameSubject = useCallback((id: string, name: string) => updateSubjects((items) => items.map((s) => s.id === id ? { ...s, name } : s)), [updateSubjects]);
  const updateSubject = useCallback((id: string, updates: Partial<Omit<Subject, 'id'>>) => updateSubjects((items) => items.map((s) => s.id === id ? { ...s, ...updates } : s)), [updateSubjects]);
  const deleteSubject = useCallback((id: string, reassignTo: string | null) => {
    commit((p) => ({
      ...p,
      subjects: p.subjects.filter((s) => s.id !== id),
      tasks: p.tasks.map((t) => t.subjectId === id ? { ...t, subjectId: reassignTo } : t),
      studySessions: p.studySessions.map((s) => s.subjectId === id ? { ...s, subjectId: reassignTo } : s),
      lectures: p.lectures.filter((l) => l.subjectId !== id),
    }));
  }, [commit]);
  const addLecture = useCallback((lecture: Omit<Lecture, 'id' | 'createdAt' | 'lastReleasedKey'>) => {
    const seeded = { ...lecture, id: rid(), createdAt: new Date().toISOString(), lastReleasedKey: null };
    const normalized = applyLectureReleases([seeded])[0] ?? seeded;
    updateLectures((items) => [normalized, ...items]);
  }, [updateLectures]);
  const updateLecture = useCallback((id: string, updates: Partial<Omit<Lecture, 'id' | 'createdAt'>>) => {
    updateLectures((items) => items.map((lecture) => lecture.id === id ? { ...lecture, ...updates } : lecture));
  }, [updateLectures]);
  const deleteLecture = useCallback((id: string) => updateLectures((items) => items.filter((lecture) => lecture.id !== id)), [updateLectures]);
  const completeLecture = useCallback((id: string) => updateLectures((items) => items.map((lecture) => lecture.id === id ? { ...lecture, backlog: Math.max(0, lecture.backlog - 1) } : lecture)), [updateLectures]);
  const clearAllData = useCallback(() => {
    const empty = createEmptyState();
    setData(empty);
    setIsSaving(true);
    saveState(empty).finally(() => setIsSaving(false));
  }, []);

  const value = useMemo<AppContextValue | null>(() => data ? {
    ...data, currentPage, setCurrentPage, isLoading, isSaving, isRemote,
    updateTasks, updateSessions, updateLectures, updateSleep, updateHabits, updateHabitLogs, updateSubjects, updateSettings,
    toggleTask, addTask, updateTask, deleteTask, addStudySession, addSleepEntry, toggleHabit, addHabit, deleteHabit,
    addSubject, renameSubject, updateSubject, deleteSubject, addLecture, updateLecture, deleteLecture, completeLecture, clearAllData,
  } : null, [data, currentPage, isLoading, isSaving, isRemote, updateTasks, updateSessions, updateLectures, updateSleep, updateHabits, updateHabitLogs, updateSubjects, updateSettings, toggleTask, addTask, updateTask, deleteTask, addStudySession, addSleepEntry, toggleHabit, addHabit, deleteHabit, addSubject, renameSubject, updateSubject, deleteSubject, addLecture, updateLecture, deleteLecture, completeLecture, clearAllData]);

  if (isLoading || !value) return <div className="min-h-screen bg-bg-base flex items-center justify-center"><div className="flex items-center gap-3 text-text-secondary text-sm"><span className="w-2 h-2 bg-success rounded-full animate-pulse" /> Loading your workspace…</div></div>;
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
