import { supabase } from '../lib/supabase';

export const mercadoPagoService = {
  async createPreference(invoiceId: string, amount: number, description: string, companyId: string) {
    try {
      // No Mercado Pago, passamos o external_reference para identificar a fatura no webhook.
      
      console.log(`[MP] Criando preferência para fatura ${invoiceId}. Valor: ${amount}. Ref: ${invoiceId}`);
      
      // Simulação de resposta da API do Mercado Pago
      // Em uma integração real via backend, você enviaria:
      // { items: [{...}], external_reference: invoiceId, back_urls: {...} }
      
      return {
        id: `mp_pref_${Math.random().toString(36).substr(2, 9)}`,
        init_point: `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=mp_pref_${Math.random().toString(36).substr(2, 9)}`,
        external_reference: invoiceId
      };
    } catch (error) {
      console.error('Error creating MP preference:', error);
      throw error;
    }
  },

  async getConfig(companyId: string) {
    const { data, error } = await supabase
      .from('companies')
      .select('gateways_config')
      .eq('id', companyId)
      .single();
    
    if (error) throw error;
    return data?.gateways_config?.mercado_pago || { active: false, access_token: '', public_key: '' };
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
      mercado_pago: config
    };

    const { error } = await supabase
      .from('companies')
      .update({ gateways_config: newConfig })
      .eq('id', companyId);
    
    if (error) throw error;
  }
};
