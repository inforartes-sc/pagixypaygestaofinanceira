import { supabase } from '../lib/supabase';

export const mercadoPagoService = {
  async createPreference(invoiceId: string, amount: number, description: string, accessToken: string) {
    try {
      console.log(`[MP] Criando preferência real para fatura ${invoiceId}. Valor: ${amount}. Ref: ${invoiceId}`);
      
      const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          items: [
            {
              title: description || "Pagamento de Fatura",
              unit_price: Number(amount),
              quantity: 1,
              currency_id: "BRL"
            }
          ],
          back_urls: {
            success: `${window.location.origin}/pay/${invoiceId}?status=success`,
            pending: `${window.location.origin}/pay/${invoiceId}?status=pending`,
            failure: `${window.location.origin}/pay/${invoiceId}?status=failure`
          },
          auto_return: "approved",
          external_reference: invoiceId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Erro do Mercado Pago:", errorData);
        throw new Error("Falha ao criar pagamento no Mercado Pago");
      }

      const data = await response.json();
      
      return {
        id: data.id,
        init_point: data.init_point,
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
