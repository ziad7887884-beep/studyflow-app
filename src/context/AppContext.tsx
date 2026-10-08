import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppNotification, AppSettings, AssignmentSchedule, Habit, HabitLog, Lecture, PageKey, SleepEntry, StudySession, Subject, StudyFlowState, Task } from '@/types';
import { loadState, saveState } from '@/lib/storage';
import { createEmptyState } from '@/lib/emptyState';
import { todayKey } from '@/lib/datetime';
import { latestReleaseKey } from '@/lib/lectureSchedule';
import { assignmentDueDate, dueOccurrenceKeys, lectureRule } from '@/lib/planner';

interface AppContextValue {
  tasks: Task[];
  studySessions: StudySession[];
  lectures: Lecture[];
  assignmentSchedules: AssignmentSchedule[];
  notifications: AppNotification[];
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
  postponeTask: (id: string, days: number, hours?: number) => void;
  addStudySession: (session: Omit<StudySession, 'id'>) => void;
  addSleepEntry: (entry: Omit<SleepEntry, 'id' | 'durationMinutes'>) => void;
  toggleHabit: (habitId: string, date?: string) => void;
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt'>) => void;
  deleteHabit: (id: string) => void;
  addSubject: (subject: Omit<Subject, 'id'>) => void;
  renameSubject: (id: string, name: string) => void;
  updateSubject: (id: string, updates: Partial<Omit<Subject, 'id'>>) => void;
  deleteSubject: (id: string, reassignTo: string | null) => void;
  addLecture: (lecture: Omit<Lecture, 'id' | 'createdAt' | 'lastReleasedKey' | 'completedCount' | 'totalReleased'>) => void;
  updateLecture: (id: string, updates: Partial<Omit<Lecture, 'id' | 'createdAt'>>) => void;
  deleteLecture: (id: string) => void;
  completeLecture: (id: string) => void;
  addAssignmentSchedule: (rule: Omit<AssignmentSchedule, 'id' | 'createdAt'>) => void;
  updateAssignmentSchedule: (id: string, changes: Partial<Omit<AssignmentSchedule, 'id' | 'createdAt'>>) => void;
  deleteAssignmentSchedule: (id: string) => void;
  markNotificationRead: (id: string) => void;
  clearAllData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);
const rid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function normalizeLectures(lectures: Lecture[] = []): Lecture[] {
  return lectures.map((lecture) => ({
    ...lecture,
    backlog: Math.max(0, Number(lecture.backlog) || 0),
    completedCount: Math.max(0, Number(lecture.completedCount) || 0),
    totalReleased: Math.max(0, Number(lecture.totalReleased) || 0),
    releaseSchedule: { ...lecture.releaseSchedule, lecturesPerRelease: Math.max(1, Number(lecture.releaseSchedule?.lecturesPerRelease) || 1), createTask: lecture.releaseSchedule?.createTask ?? true, paused: lecture.releaseSchedule?.paused ?? false },
  }));
}

function normalizeState(state: StudyFlowState): StudyFlowState {
  return { ...state, lectures: normalizeLectures(state.lectures), assignmentSchedules: state.assignmentSchedules ?? [], occurrences: state.occurrences ?? [], notifications: state.notifications ?? [], tasks: state.tasks.map((task) => ({ ...task, source: task.source ?? 'manual', postponedFrom: task.postponedFrom ?? null })) };
}

function processPlanner(state: StudyFlowState): StudyFlowState {
  const occurrences = [...state.occurrences]; const tasks = [...state.tasks]; const notifications = [...state.notifications]; let lectures = [...state.lectures];
  const seen = new Set(occurrences.map((item) => item.id));
  const notify = (title: string, body: string, occurrenceId: string) => notifications.push({ id: rid(), title, body, occurrenceId, createdAt: new Date().toISOString(), read: false });
  const addTask = (task: Omit<Task, 'id' | 'createdAt' | 'completed' | 'completedAt'>) => { const id = rid(); tasks.unshift({ ...task, id, createdAt: new Date().toISOString(), completed: false, completedAt: null }); return id; };
  lectures = lectures.map((lecture) => {
    if (lecture.releaseSchedule.paused) return lecture;
    let backlog = lecture.backlog; let totalReleased = lecture.totalReleased;
    for (const scheduledAt of dueOccurrenceKeys(lectureRule(lecture))) {
      const id = `lecture:${lecture.id}:${scheduledAt}`; if (seen.has(id)) continue;
      const amount = lecture.releaseSchedule.lecturesPerRelease; let taskId: string | undefined;
      if (lecture.releaseSchedule.createTask) taskId = addTask({ title: (lecture.releaseSchedule.taskTemplate || `Watch ${lecture.title}`).replace('{course}', lecture.title), description: `Released ${scheduledAt.slice(0, 10)}.`, subjectId: lecture.subjectId, priority: 'medium', estimatedMinutes: lecture.releaseSchedule.estimatedMinutes ?? 60, dueDate: scheduledAt.slice(0, 10), dueTime: scheduledAt.slice(11), source: 'lecture', sourceRuleId: lecture.id, sourceOccurrenceId: id });
      occurrences.push({ id, ruleId: lecture.id, kind: 'lecture', scheduledAt, processedAt: new Date().toISOString(), taskId }); seen.add(id); backlog += amount; totalReleased += amount; notify('New lecture available', `${lecture.title} is ready to study.`, id);
    }
    return { ...lecture, backlog, totalReleased };
  });
  for (const rule of state.assignmentSchedules) {
    if (rule.paused) continue;
    for (const scheduledAt of dueOccurrenceKeys(rule.recurrence)) {
      const id = `assignment:${rule.id}:${scheduledAt}`; if (seen.has(id)) continue;
      const due = assignmentDueDate(rule, scheduledAt); let taskId: string | undefined;
      if (rule.createTask) taskId = addTask({ title: rule.title, description: `Assignment released ${scheduledAt.slice(0, 10)}. Official deadline: ${due.date} ${due.time}.`, subjectId: rule.subjectId, priority: rule.priority, estimatedMinutes: rule.estimatedMinutes, dueDate: due.date, dueTime: due.time, officialDueDate: due.date, officialDueTime: due.time, source: 'assignment', sourceRuleId: rule.id, sourceOccurrenceId: id });
      occurrences.push({ id, ruleId: rule.id, kind: 'assignment', scheduledAt, processedAt: new Date().toISOString(), taskId }); seen.add(id); notify('New assignment added', `${rule.title} is due ${due.date}.`, id);
    }
  }
  return { ...state, lectures, tasks, occurrences, notifications };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StudyFlowState | null>(null);
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemote, setIsRemote] = useState(true);
  const saveQueue = useRef(Promise.resolve());

  const persist = useCallback((state: StudyFlowState) => {
    setIsSaving(true);
    saveQueue.current = saveQueue.current.catch(() => undefined).then(() => saveState(state).then(() => undefined)).finally(() => setIsSaving(false));
  }, []);

  useEffect(() => {
    let mounted = true;
    loadState().then(({ state, remote }) => {
      if (mounted) {
        const normalized = normalizeState(state);
        setData(normalized);
        setIsRemote(remote);
        setIsLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!data) return;
    const updated = processPlanner(data);
    if (updated === data || (updated.occurrences.length === data.occurrences.length && updated.tasks.length === data.tasks.length)) return;
    setData((prev) => {
        if (!prev) return prev;
        const next = processPlanner(prev);
        persist(next);
        return next;
      });
  }, [data, persist]);

  const commit = useCallback((updater: (prev: StudyFlowState) => StudyFlowState) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      persist(next);
      return next;
    });
  }, [persist]);

  const updateTasks = useCallback((updater: (items: Task[]) => Task[]) => commit((p) => ({ ...p, tasks: updater(p.tasks) })), [commit]);
  const updateSessions = useCallback((updater: (items: StudySession[]) => StudySession[]) => commit((p) => ({ ...p, studySessions: updater(p.studySessions) })), [commit]);
  const updateLectures = useCallback((updater: (items: Lecture[]) => Lecture[]) => commit((p) => ({ ...p, lectures: updater(p.lectures) })), [commit]);
  const updateSleep = useCallback((updater: (items: SleepEntry[]) => SleepEntry[]) => commit((p) => ({ ...p, sleepEntries: updater(p.sleepEntries) })), [commit]);
  const updateHabits = useCallback((updater: (items: Habit[]) => Habit[]) => commit((p) => ({ ...p, habits: updater(p.habits) })), [commit]);
  const updateHabitLogs = useCallback((updater: (items: HabitLog[]) => HabitLog[]) => commit((p) => ({ ...p, habitLogs: updater(p.habitLogs) })), [commit]);
  const updateSubjects = useCallback((updater: (items: Subject[]) => Subject[]) => commit((p) => ({ ...p, subjects: updater(p.subjects) })), [commit]);
  const updateSettings = useCallback((updater: (settings: AppSettings) => AppSettings) => commit((p) => ({ ...p, settings: updater(p.settings) })), [commit]);

  const toggleTask = useCallback((taskId: string) => commit((p) => {
    const task = p.tasks.find((item) => item.id === taskId); if (!task) return p; const completes = !task.completed;
    return { ...p, tasks: p.tasks.map((item) => item.id === taskId ? { ...item, completed: completes, completedAt: completes ? new Date().toISOString() : null } : item), lectures: completes && task.source === 'lecture' && task.sourceRuleId ? p.lectures.map((lecture) => lecture.id === task.sourceRuleId && lecture.backlog > 0 ? { ...lecture, backlog: lecture.backlog - 1, completedCount: lecture.completedCount + 1 } : lecture) : p.lectures };
  }), [commit]);
  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt' | 'completed' | 'completedAt'>) => updateTasks((items) => [{ ...task, id: rid(), createdAt: new Date().toISOString(), completed: false, completedAt: null }, ...items]), [updateTasks]);
  const updateTask = useCallback((taskId: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => updateTasks((items) => items.map((task) => task.id === taskId ? { ...task, ...updates } : task)), [updateTasks]);
  const deleteTask = useCallback((taskId: string) => updateTasks((items) => items.filter((task) => task.id !== taskId)), [updateTasks]);
  const postponeTask = useCallback((taskId: string, days: number, hours = 0) => updateTasks((items) => items.map((task) => { if (task.id !== taskId) return task; const date = new Date(`${task.dueDate}T${task.dueTime || '09:00'}`); date.setDate(date.getDate() + days); date.setHours(date.getHours() + hours); return { ...task, dueDate: date.toISOString().slice(0, 10), dueTime: date.toTimeString().slice(0, 5), postponedFrom: task.postponedFrom ?? { date: task.dueDate, time: task.dueTime } }; })), [updateTasks]);
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
  const addLecture = useCallback((lecture: Omit<Lecture, 'id' | 'createdAt' | 'lastReleasedKey' | 'completedCount' | 'totalReleased'>) => {
    const seeded = { ...lecture, id: rid(), createdAt: new Date().toISOString(), lastReleasedKey: null, completedCount: 0, totalReleased: 0 };
    updateLectures((items) => [seeded, ...items]);
  }, [updateLectures]);
  const updateLecture = useCallback((id: string, updates: Partial<Omit<Lecture, 'id' | 'createdAt'>>) => {
    updateLectures((items) => items.map((lecture) => lecture.id === id ? {
      ...lecture, ...updates,
      // A schedule edit starts tracking from the new configuration forward, avoiding retroactive duplicates.
      lastReleasedKey: updates.releaseSchedule
        ? latestReleaseKey({ ...lecture, ...updates, releaseSchedule: updates.releaseSchedule })
        : (updates.lastReleasedKey ?? lecture.lastReleasedKey),
    } : lecture));
  }, [updateLectures]);
  const deleteLecture = useCallback((id: string) => updateLectures((items) => items.filter((lecture) => lecture.id !== id)), [updateLectures]);
  const completeLecture = useCallback((id: string) => updateLectures((items) => items.map((lecture) => lecture.id === id && lecture.backlog > 0 ? { ...lecture, backlog: lecture.backlog - 1, completedCount: lecture.completedCount + 1 } : lecture)), [updateLectures]);
  const addAssignmentSchedule = useCallback((rule: Omit<AssignmentSchedule, 'id' | 'createdAt'>) => commit((p) => ({ ...p, assignmentSchedules: [...p.assignmentSchedules, { ...rule, id: rid(), createdAt: new Date().toISOString() }] })), [commit]);
  const updateAssignmentSchedule = useCallback((id: string, changes: Partial<Omit<AssignmentSchedule, 'id' | 'createdAt'>>) => commit((p) => ({ ...p, assignmentSchedules: p.assignmentSchedules.map((rule) => rule.id === id ? { ...rule, ...changes } : rule) })), [commit]);
  const deleteAssignmentSchedule = useCallback((id: string) => commit((p) => ({ ...p, assignmentSchedules: p.assignmentSchedules.filter((rule) => rule.id !== id) })), [commit]);
  const markNotificationRead = useCallback((id: string) => commit((p) => ({ ...p, notifications: p.notifications.map((item) => item.id === id ? { ...item, read: true } : item) })), [commit]);
  const clearAllData = useCallback(() => {
    const empty = createEmptyState();
    setData(empty);
    persist(empty);
  }, [persist]);

  const value = useMemo<AppContextValue | null>(() => data ? {
    ...data, currentPage, setCurrentPage, isLoading, isSaving, isRemote,
    updateTasks, updateSessions, updateLectures, updateSleep, updateHabits, updateHabitLogs, updateSubjects, updateSettings,
    toggleTask, addTask, updateTask, deleteTask, postponeTask, addStudySession, addSleepEntry, toggleHabit, addHabit, deleteHabit,
    addSubject, renameSubject, updateSubject, deleteSubject, addLecture, updateLecture, deleteLecture, completeLecture, addAssignmentSchedule, updateAssignmentSchedule, deleteAssignmentSchedule, markNotificationRead, clearAllData,
  } : null, [data, currentPage, isLoading, isSaving, isRemote, updateTasks, updateSessions, updateLectures, updateSleep, updateHabits, updateHabitLogs, updateSubjects, updateSettings, toggleTask, addTask, updateTask, deleteTask, postponeTask, addStudySession, addSleepEntry, toggleHabit, addHabit, deleteHabit, addSubject, renameSubject, updateSubject, deleteSubject, addLecture, updateLecture, deleteLecture, completeLecture, addAssignmentSchedule, updateAssignmentSchedule, deleteAssignmentSchedule, markNotificationRead, clearAllData]);

  if (isLoading || !value) return <div className="min-h-screen bg-bg-base flex items-center justify-center"><div className="flex items-center gap-3 text-text-secondary text-sm"><span className="w-2 h-2 bg-success rounded-full animate-pulse" /> Loading your workspace…</div></div>;
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
