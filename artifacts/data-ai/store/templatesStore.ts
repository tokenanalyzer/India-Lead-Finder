import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type { MessageTemplate } from '@/types/lead';
import { DEFAULT_MESSAGE_TEMPLATE_BODY } from '@/types/lead';

const KEY = '@data_ai:templates';

const DEFAULT_TEMPLATE: MessageTemplate = {
  id: 'default',
  name: 'Default',
  category: '',
  body: DEFAULT_MESSAGE_TEMPLATE_BODY,
};

interface TemplatesState {
  templates: MessageTemplate[];
  isLoaded: boolean;
  load: () => Promise<void>;
  addTemplate: (t: { name: string; category: string; body: string }) => Promise<void>;
  updateTemplate: (t: MessageTemplate) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  getTemplateForCategory: (category: string) => MessageTemplate;
}

async function readAll(): Promise<MessageTemplate[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as MessageTemplate[]) : [];
    return parsed.length > 0 ? parsed : [DEFAULT_TEMPLATE];
  } catch {
    return [DEFAULT_TEMPLATE];
  }
}

async function writeAll(templates: MessageTemplate[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(templates));
}

export const useTemplatesStore = create<TemplatesState>((set, get) => ({
  templates: [DEFAULT_TEMPLATE],
  isLoaded: false,

  load: async () => {
    if (get().isLoaded) return;
    const templates = await readAll();
    set({ templates, isLoaded: true });
  },

  addTemplate: async (t) => {
    const newTemplate: MessageTemplate = {
      ...t,
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
    };
    const templates = [...get().templates, newTemplate];
    set({ templates });
    await writeAll(templates);
  },

  updateTemplate: async (t) => {
    const templates = get().templates.map(x => (x.id === t.id ? t : x));
    set({ templates });
    await writeAll(templates);
  },

  deleteTemplate: async (id) => {
    if (id === 'default') return; // always keep a fallback template around
    const templates = get().templates.filter(t => t.id !== id);
    set({ templates });
    await writeAll(templates);
  },

  getTemplateForCategory: (category) => {
    const templates = get().templates;
    const match = templates.find(t => t.category && t.category.toLowerCase() === category.toLowerCase());
    return match ?? templates.find(t => t.id === 'default') ?? templates[0] ?? DEFAULT_TEMPLATE;
  },
}));
