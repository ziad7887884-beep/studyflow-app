import { createEmptyState } from './emptyState';
import type { StudyFlowState } from '@/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseApiKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const headers = {
  apikey: supabaseApiKey,
  Accept: 'application/json',
};

function supabaseRestUrl(path = '') {
  return supabaseUrl + '/rest/v1' + path;
}

export async function loadState(): Promise<{ state: StudyFlowState; remote: boolean }> {
  try {
    const response = await fetch(
      supabaseRestUrl('/studyflow_state?select=data&eq.id=default&limit=1'),
      { headers }
    );

    if (!response.ok) {
      throw new Error('Supabase read failed: HTTP ' + response.status);
    }

    const rows = await response.json();
    const remoteData = rows?.[0]?.data;

    if (!remoteData || typeof remoteData !== 'object' || !('settings' in remoteData)) {
      const empty = createEmptyState();
      const saved = await saveState(empty);
      return { state: empty, remote: saved };
    }

    const loaded = remoteData as StudyFlowState;
    if (!loaded.subjects) loaded.subjects = [];
    return { state: loaded, remote: true };
  } catch (error) {
    console.error('StudyFlow: failed to load remote state.', error);
    return { state: createEmptyState(), remote: false };
  }
}

export async function saveState(state: StudyFlowState): Promise<boolean> {
  try {
    const response = await fetch(supabaseRestUrl('/studyflow_state?on_conflict=id'), {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        id: 'default',
        data: state,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      console.error('StudyFlow: save failed with HTTP ' + response.status + '.', details);
      return false;
    }

    return true;
  } catch (error) {
    console.error('StudyFlow: failed to save remote state.', error);
    return false;
  }
}