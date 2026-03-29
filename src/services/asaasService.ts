import { supabase } from '../lib/supabase';

export const asaasService = {
  async getConfig(companyId: string) {
    const { data, error } = await supabase
      .from('companies')
      .select('gateways_config')
      .eq('id', companyId)
      .single();
    
    if (error) throw error;
    return data?.gateways_config?.asaas || { active: false, access_token: '', environment: 'sandbox' };
  },

  async saveConfig(companyId: string, config: any) {
    const { data: current, error: fetchError } = await supabase
      .from('companies')
      .select('gateways_config')
      .eq('id', companyId)
      .single();
    
    if (fetchError) throw fetchError;

    const newConfig = {
      ...(current?.gateways_config || {}),
      asaas: config
    };

    const { error } = await supabase
      .from('companies')
      .update({ gateways_config: newConfig })
      .eq('id', companyId);
    
    if (error) throw error;
  }
};
