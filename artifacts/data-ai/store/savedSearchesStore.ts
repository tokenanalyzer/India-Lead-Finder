import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type { SavedSearch } from '@/types/lead';

const KEY = '@data_ai:saved_searches';

interface SavedSearchesState {
  searches: SavedSearch[];
  isLoaded: boolean;
  load: () => Promise<void>;
  addSearch: (s: { label: string; category: string; cities: string[] }) => Promise<SavedSearch>;
  updateSeenPlaceIds: (id: string, placeIds: string[]) => Promise<void>;
  deleteSearch: (id: string) => Promise<void>;
}

async function readAll(): Promise<SavedSearch[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedSearch[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(searches: SavedSearch[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(searches));
}

export const useSavedSearchesStore = create<SavedSearchesState>((set, get) => ({
  searches: [],
  isLoaded: false,

  load: async () => {
    if (get().isLoaded) return;
    const searches = await readAll();
    set({ searches, isLoaded: true });
  },

  addSearch: async (s) => {
    const newSearch: SavedSearch = {
      ...s,
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
      seenPlaceIds: [],
    };
    const searches = [newSearch, ...get().searches];
    set({ searches });
    await writeAll(searches);
    return newSearch;
  },

  updateSeenPlaceIds: async (id, placeIds) => {
    const searches = get().searches.map(s =>
      s.id === id ? { ...s, seenPlaceIds: placeIds, lastRunAt: new Date().toISOString() } : s
    );
    set({ searches });
    await writeAll(searches);
  },

  deleteSearch: async (id) => {
    const searches = get().searches.filter(s => s.id !== id);
    set({ searches });
    await writeAll(searches);
  },
}));
