import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const KEY = '@data_ai:settings';

interface SettingsState {
  googleApiKey: string;
  isLoaded: boolean;
  load: () => Promise<void>;
  setGoogleApiKey: (key: string) => Promise<void>;
  clearGoogleApiKey: () => Promise<void>;
}

async function readSettings(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

async function writeSettings(data: Record<string, string>): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}

export const useSettingsStore = create<SettingsState>((set) => ({
  googleApiKey: '',
  isLoaded: false,

  load: async () => {
    const s = await readSettings();
    set({ googleApiKey: s.googleApiKey ?? '', isLoaded: true });
  },

  setGoogleApiKey: async (key: string) => {
    const trimmed = key.trim();
    set({ googleApiKey: trimmed });
    const s = await readSettings();
    await writeSettings({ ...s, googleApiKey: trimmed });
  },

  clearGoogleApiKey: async () => {
    set({ googleApiKey: '' });
    const s = await readSettings();
    delete s.googleApiKey;
    await writeSettings(s);
  },
}));
