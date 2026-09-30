import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppSettings, Habit, HabitLog, PageKey, SleepEntry, StudySession, Subject, StudyFlowState, Task } from '@/types';
import { loadState, saveState } from '@/lib/storage';
import { createEmptyState } from '@/lib/emptyState';
import { todayKey } from '@/lib/datetime';

interface AppContextValue {
  tasks: Task[];
  studySessions: StudySession[];
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
  clearAllData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);
const rid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

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
        setData(state);
        setIsRemote(remote);
        setIsLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

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
    }));
  }, [commit]);
  const clearAllData = useCallback(() => {
    const empty = createEmptyState();
    setData(empty);
    setIsSaving(true);
    saveState(empty).finally(() => setIsSaving(false));
  }, []);

  const value = useMemo<AppContextValue | null>(() => data ? {
    ...data, currentPage, setCurrentPage, isLoading, isSaving, isRemote,
    updateTasks, updateSessions, updateSleep, updateHabits, updateHabitLogs, updateSubjects, updateSettings,
    toggleTask, addTask, updateTask, deleteTask, addStudySession, addSleepEntry, toggleHabit, addHabit, deleteHabit,
    addSubject, renameSubject, updateSubject, deleteSubject, clearAllData,
  } : null, [data, currentPage, isLoading, isSaving, isRemote, updateTasks, updateSessions, updateSleep, updateHabits, updateHabitLogs, updateSubjects, updateSettings, toggleTask, addTask, updateTask, deleteTask, addStudySession, addSleepEntry, toggleHabit, addHabit, addSubject, renameSubject, updateSubject, deleteSubject, clearAllData, deleteHabit]);

  if (isLoading || !value) return <div className="min-h-screen bg-bg-base flex items-center justify-center"><div className="flex items-center gap-3 text-text-secondary text-sm"><span className="w-2 h-2 bg-success rounded-full animate-pulse" /> Loading your workspace…</div></div>;
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
