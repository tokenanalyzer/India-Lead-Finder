import { create } from 'zustand';
import type { Lead } from '@/types/lead';
import * as DB from '@/db/database';

interface LeadsState {
  leads: Lead[];
  isLoaded: boolean;
  initialize: () => Promise<void>;
  addLead: (lead: Lead) => Promise<void>;
  updateLead: (lead: Lead) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  getLeadById: (id: string) => Lead | undefined;
  refreshLeads: () => Promise<void>;
}

export const useLeadsStore = create<LeadsState>((set, get) => ({
  leads: [],
  isLoaded: false,

  initialize: async () => {
    if (get().isLoaded) return;
    try {
      await DB.initDB();
      const leads = await DB.getAllLeads();
      set({ leads, isLoaded: true });
    } catch (e) {
      console.error('Failed to initialize DB:', e);
      set({ isLoaded: true });
    }
  },

  refreshLeads: async () => {
    try {
      const leads = await DB.getAllLeads();
      set({ leads });
    } catch (e) {
      console.error('Failed to refresh leads:', e);
    }
  },

  addLead: async (lead: Lead) => {
    try {
      await DB.saveLead(lead);
      set(state => ({ leads: [lead, ...state.leads] }));
    } catch (e) {
      console.error('Failed to save lead:', e);
      throw e;
    }
  },

  updateLead: async (lead: Lead) => {
    try {
      await DB.updateLead(lead);
      set(state => ({
        leads: state.leads.map(l => (l.id === lead.id ? lead : l)),
      }));
    } catch (e) {
      console.error('Failed to update lead:', e);
      throw e;
    }
  },

  deleteLead: async (id: string) => {
    try {
      await DB.deleteLead(id);
      set(state => ({ leads: state.leads.filter(l => l.id !== id) }));
    } catch (e) {
      console.error('Failed to delete lead:', e);
      throw e;
    }
  },

  getLeadById: (id: string) => get().leads.find(l => l.id === id),
}));
