import { supabase } from './supabase';
import { createEmptyState } from './emptyState';
import type { StudyFlowState } from '@/types';

export async function loadState(): Promise<{ state: StudyFlowState; remote: boolean }> {
  const { data, error } = await supabase
    .from('studyflow_state')
    .select('data')
    .eq('id', 'default')
    .maybeSingle();

  if (error || !data?.data || !data.data || typeof data.data !== 'object' || !('settings' in data.data)) {
    const empty = createEmptyState();
    const { error: insertError } = await supabase.from('studyflow_state').upsert({
      id: 'default',
      data: empty,
      updated_at: new Date().toISOString(),
    });
    return { state: empty, remote: !insertError };
  }

  const loaded = data.data as StudyFlowState;
  // Ensure subjects field exists for older states
  if (!loaded.subjects) loaded.subjects = [];
  return { state: loaded, remote: true };
}

export async function saveState(state: StudyFlowState): Promise<boolean> {
  const { error } = await supabase.from('studyflow_state').upsert({
    id: 'default',
    data: state,
    updated_at: new Date().toISOString(),
  });
  return !error;
}
