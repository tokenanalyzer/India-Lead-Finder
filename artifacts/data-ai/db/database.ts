import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lead } from '@/types/lead';

const STORAGE_KEY = '@data_ai:leads';

export async function initDB(): Promise<void> {
  // AsyncStorage needs no initialization
}

async function readAll(): Promise<Lead[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    return json ? (JSON.parse(json) as Lead[]) : [];
  } catch {
    return [];
  }
}

export async function getAllLeads(): Promise<Lead[]> {
  const leads = await readAll();
  return leads.sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

export async function saveLead(lead: Lead): Promise<void> {
  const leads = await readAll();
  const idx = leads.findIndex(l => l.id === lead.id);
  if (idx >= 0) leads[idx] = lead;
  else leads.unshift(lead);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
}

export async function updateLead(lead: Lead): Promise<void> {
  return saveLead(lead);
}

export async function deleteLead(id: string): Promise<void> {
  const leads = await readAll();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(leads.filter(l => l.id !== id)));
}
