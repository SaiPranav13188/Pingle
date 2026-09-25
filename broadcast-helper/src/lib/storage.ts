import AsyncStorage from '@react-native-async-storage/async-storage';

export const STATE_KEY = 'pingle.state';
export const HISTORY_KEY = 'pingle.history';
export const GROUPS_KEY = 'pingle.groups';

export async function load<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export async function save(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to persist', key, e);
  }
}
