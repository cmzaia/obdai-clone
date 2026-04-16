import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StoredScan } from './store';

const KEY_SCANS = 'pitlanehub.scans.v1';

function isValidScan(item: unknown): item is StoredScan {
  if (!item || typeof item !== 'object') return false;
  const s = item as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.createdAt === 'number' &&
    Array.isArray(s.stored) &&
    Array.isArray(s.pending)
  );
}

export async function loadScans(): Promise<StoredScan[]> {
  const raw = await AsyncStorage.getItem(KEY_SCANS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidScan);
  } catch {
    return [];
  }
}

export async function saveScans(scans: StoredScan[]) {
  await AsyncStorage.setItem(KEY_SCANS, JSON.stringify(scans));
}

