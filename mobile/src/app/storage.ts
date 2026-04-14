import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StoredScan } from './store';

const KEY_SCANS = 'pitlanehub.scans.v1';

export async function loadScans(): Promise<StoredScan[]> {
  const raw = await AsyncStorage.getItem(KEY_SCANS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as StoredScan[];
  } catch {
    return [];
  }
}

export async function saveScans(scans: StoredScan[]) {
  await AsyncStorage.setItem(KEY_SCANS, JSON.stringify(scans));
}

