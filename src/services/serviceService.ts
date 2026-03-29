import { supabase } from '../lib/supabase';
import { Service } from '../types';

export const serviceService = {
  async getServices(companyId?: string): Promise<Service[]> {
    try {
      let query = supabase
        .from('services')
        .select('*')
        .order('name', { ascending: true });

      if (companyId && companyId !== 'null' && companyId !== 'undefined') {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.warn('Services fetch failed:', error);
      return [];
    }
  },

  async createService(service: Omit<Service, 'id' | 'created_at'>): Promise<Service> {
    const { data, error } = await supabase
      .from('services')
      .insert([service])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateService(id: string, updates: Partial<Service>): Promise<void> {
    const { error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  async deleteService(id: string): Promise<void> {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
