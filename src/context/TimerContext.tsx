import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type TimerMode = 'focus' | 'short' | 'long';

export interface TimerState {
  mode: TimerMode;
  running: boolean;
  completed: boolean;
  secondsRemaining: number;
  durationSeconds: number;
  sessionSubject: string | null;
  tip: string;
  endTimestamp: number | null;
}

export interface TimerContextValue {
  mode: TimerMode;
  running: boolean;
  completed: boolean;
  seconds: number;
  duration: number;
  sessionSubject: string | null;
  tip: string;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  skip: () => void;
  changeMode: (mode: TimerMode) => void;
  setSessionSubject: (id: string | null) => void;
  dismissComplete: () => void;
  onComplete: (cb: (mode: TimerMode, durationMinutes: number, subjectId: string | null) => void) => void;
}

const STORAGE_KEY = 'studyflow-timer';
const TICK_MS = 250;

function getDurationSeconds(mode: TimerMode): number {
  const raw = localStorage.getItem('studyflow-timer-durations');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (mode === 'focus' && parsed.focusMinutes) return parsed.focusMinutes * 60;
      if (mode === 'short' && parsed.shortBreakMinutes) return parsed.shortBreakMinutes * 60;
      if (mode === 'long' && parsed.longBreakMinutes) return parsed.longBreakMinutes * 60;
    } catch { /* fall through */ }
  }
  return mode === 'focus' ? 25 * 60 : mode === 'short' ? 5 * 60 : 15 * 60;
}

function loadPersisted(): TimerState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as TimerState;
    if (typeof parsed.mode !== 'string' || typeof parsed.running !== 'boolean') return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist(state: TimerState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TimerState>(() => {
    const persisted = loadPersisted();
    if (!persisted) {
      const d = getDurationSeconds('focus');
      return { mode: 'focus', running: false, completed: false, secondsRemaining: d, durationSeconds: d, sessionSubject: null, tip: '', endTimestamp: null };
    }
    // Recompute remaining from endTimestamp if running (handles background throttling + refresh)
    let secondsRemaining = persisted.secondsRemaining;
    if (persisted.running && persisted.endTimestamp) {
      const elapsed = Math.floor((Date.now() - persisted.endTimestamp) / 1000);
      secondsRemaining = Math.max(0, persisted.secondsRemaining - elapsed);
    }
    return { ...persisted, secondsRemaining };
  });

  const completeCbRef = useRef<((mode: TimerMode, durationMinutes: number, subjectId: string | null) => void) | null>(null);
  const intervalRef = useRef<number | null>(null);

  const updateState = useCallback((updater: (prev: TimerState) => TimerState) => {
    setState((prev) => {
      const next = updater(prev);
      persist(next);
      return next;
    });
  }, []);

  const start = useCallback(() => {
    updateState((prev) => {
      const duration = prev.durationSeconds;
      return {
        ...prev,
        running: true,
        completed: false,
        secondsRemaining: duration,
        endTimestamp: Date.now() + duration * 1000,
      };
    });
  }, [updateState]);

  const pause = useCallback(() => {
    updateState((prev) => ({
      ...prev,
      running: false,
      endTimestamp: null,
    }));
  }, [updateState]);

  const resume = useCallback(() => {
    updateState((prev) => {
      if (prev.running || prev.secondsRemaining <= 0) return prev;
      return {
        ...prev,
        running: true,
        endTimestamp: Date.now() + prev.secondsRemaining * 1000,
      };
    });
  }, [updateState]);

  const reset = useCallback(() => {
    updateState((prev) => ({
      ...prev,
      running: false,
      completed: false,
      secondsRemaining: prev.durationSeconds,
      endTimestamp: null,
    }));
  }, [updateState]);

  const changeMode = useCallback((next: TimerMode) => {
    updateState((prev) => {
      const d = getDurationSeconds(next);
      return {
        ...prev,
        mode: next,
        running: false,
        completed: false,
        secondsRemaining: d,
        durationSeconds: d,
        endTimestamp: null,
      };
    });
  }, [updateState]);

  const skip = useCallback(() => {
    updateState((prev) => {
      const nextMode: TimerMode = prev.mode === 'focus' ? 'short' : 'focus';
      const d = getDurationSeconds(nextMode);
      return {
        ...prev,
        mode: nextMode,
        running: false,
        completed: false,
        secondsRemaining: d,
        durationSeconds: d,
        endTimestamp: null,
      };
    });
  }, [updateState]);

  const setSessionSubject = useCallback((id: string | null) => {
    updateState((prev) => ({ ...prev, sessionSubject: id }));
  }, [updateState]);

  const dismissComplete = useCallback(() => {
    updateState((prev) => ({
      ...prev,
      completed: false,
      secondsRemaining: prev.durationSeconds,
    }));
  }, [updateState]);

  const onComplete = useCallback((cb: (mode: TimerMode, durationMinutes: number, subjectId: string | null) => void) => {
    completeCbRef.current = cb;
  }, []);

  // Single interval, always alive, recomputes from endTimestamp
  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      setState((prev) => {
        if (!prev.running || !prev.endTimestamp) return prev;
        const remaining = Math.max(0, Math.round((prev.endTimestamp - Date.now()) / 1000));
        if (remaining > 0) {
          const next = { ...prev, secondsRemaining: remaining };
          persist(next);
          return next;
        }
        // Timer finished
        const finishedState: TimerState = {
          ...prev,
          running: false,
          completed: true,
          secondsRemaining: 0,
          endTimestamp: null,
        };
        persist(finishedState);
        if (completeCbRef.current) {
          completeCbRef.current(prev.mode, prev.durationSeconds / 60, prev.sessionSubject);
        }
        return finishedState;
      });
    }, TICK_MS);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, []);

  // Handle tab visibility: recompute on return
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setState((prev) => {
          if (!prev.running || !prev.endTimestamp) return prev;
          const remaining = Math.max(0, Math.round((prev.endTimestamp - Date.now()) / 1000));
          const next = { ...prev, secondsRemaining: remaining };
          persist(next);
          return next;
        });
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const value = useMemo<TimerContextValue>(() => ({
    mode: state.mode,
    running: state.running,
    completed: state.completed,
    seconds: state.secondsRemaining,
    duration: state.durationSeconds,
    sessionSubject: state.sessionSubject,
    tip: state.tip,
    start,
    pause,
    resume,
    reset,
    skip,
    changeMode,
    setSessionSubject,
    dismissComplete,
    onComplete,
  }), [state, start, pause, resume, reset, skip, changeMode, setSessionSubject, dismissComplete, onComplete]);

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within TimerProvider');
  return ctx;
}

export function updateTimerDurations(focusMinutes: number, shortBreakMinutes: number, longBreakMinutes: number) {
  localStorage.setItem('studyflow-timer-durations', JSON.stringify({ focusMinutes, shortBreakMinutes, longBreakMinutes }));
}
