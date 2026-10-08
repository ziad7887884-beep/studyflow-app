import type { StudyFlowState } from '@/types';

export function createEmptyState(): StudyFlowState {
  return {
    tasks: [],
    studySessions: [],
    lectures: [],
    sleepEntries: [],
    habits: [],
    habitLogs: [],
    subjects: [],
    settings: {
      timer: {
        focusMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
      },
      goals: {
        dailyStudyMinutes: 180,
        weeklyStudyMinutes: 1200,
        monthlyStudyMinutes: 4800,
        taskCompletionPercent: 90,
      },
      soundEnabled: true,
      notificationsEnabled: true,
    },
  };
}
