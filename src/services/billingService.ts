import { supabase } from '../lib/supabase';
import { Invoice, InvoiceStatus } from '../types';

export const billingService = {
  async getInvoices(status?: InvoiceStatus | 'all', clientId?: string, companyId?: string): Promise<Invoice[]> {
    try {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          clients (name),
          services (name),
          invoice_items (
            *,
            services (name)
          )
        `)
        .order('due_date', { ascending: false });

      if (companyId && companyId !== 'null' && companyId !== 'undefined') {
        query = query.eq('company_id', companyId);
      }

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(inv => ({
        ...inv,
        client_name: (inv.clients as any)?.name || 'Cliente Desconhecido',
        service_name: (inv.services as any)?.name,
        items: (inv.invoice_items as any[])?.map(item => ({
          ...item,
          service_name: (item.services as any)?.name
        }))
      }));
    } catch (error) {
      console.warn('Invoices fetch failed, using fallback mock data:', error);
      return [];
    }
  },

  async getInvoiceById(id: string): Promise<Invoice | null> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          clients (*),
          services (*),
          invoice_items (
            *,
            services (name)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        ...data,
        client_name: (data.clients as any)?.name || 'Cliente Desconhecido',
        service_name: (data.services as any)?.name,
        items: (data.invoice_items as any[])?.map(item => ({
          ...item,
          service_name: (item.services as any)?.name
        }))
      };
    } catch (error) {
      console.warn('Invoice fetch by ID failed:', error);
      return null;
    }
  },

  async updateInvoicePaymentMethod(id: string, payment_method: any): Promise<void> {
    const { error } = await supabase
      .from('invoices')
      .update({ payment_method })
      .eq('id', id);

    if (error) throw error;
  },

  async createInvoice(invoice: Omit<Invoice, 'id' | 'created_at'>, items?: any[]): Promise<Invoice> {
    const response = await fetch('/api/admin/create-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        invoice: {
          ...invoice,
          items // Pass items as part of the invoice object or separately
        } 
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao criar fatura no servidor');
    }

    const data = await response.json();
    return data.invoice;
  },

  async updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<void> {
    const { error } = await supabase
      .from('invoices')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
  },

  async deleteInvoice(id: string): Promise<void> {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getSubscriptions(clientId?: string, companyId?: string): Promise<any[]> {
    try {
      let query = supabase
        .from('subscriptions')
        .select(`
          *,
          clients (name),
          services (name),
          subscription_items (
            *,
            services (name)
          )
        `)
        .order('next_billing_date', { ascending: true });

      if (companyId && companyId !== 'null' && companyId !== 'undefined') {
        query = query.eq('company_id', companyId);
      }

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(sub => ({
        ...sub,
        client_name: (sub.clients as any)?.name || 'Cliente Desconhecido',
        service_name: (sub.services as any)?.name,
        items: (sub.subscription_items as any[])?.map(item => ({
          ...item,
          service_name: (item.services as any)?.name
        }))
      }));
    } catch (error) {
      console.warn('Subscriptions fetch failed:', error);
      return [];
    }
  },

  async createSubscription(subscription: any, items?: any[]): Promise<any> {
    const { data, error } = await supabase
      .from('subscriptions')
      .insert([subscription])
      .select()
      .single();

    if (error) throw error;

    if (items && items.length > 0) {
      const { error: itemsError } = await supabase
        .from('subscription_items')
        .insert(items.map(item => ({
          subscription_id: data.id,
          service_id: item.service_id,
          amount: item.amount
        })));
      
      if (itemsError) console.error("Error creating subscription items:", itemsError);
    }

    return data;
  },

  async updateSubscriptionStatus(id: string, status: 'active' | 'inactive' | 'cancelled'): Promise<void> {
    const { error } = await supabase
      .from('subscriptions')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
  },

  async deleteSubscription(id: string): Promise<void> {
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async addServiceToSubscription(subscriptionId: string, serviceId: string, amount: number): Promise<void> {
    // 1. Add the item
    const { error: itemError } = await supabase
      .from('subscription_items')
      .insert({
        subscription_id: subscriptionId,
        service_id: serviceId,
        amount: amount
      });

    if (itemError) throw itemError;

    // 2. Update the total amount and potentially the main service_id if it was null
    const { data: sub } = await supabase.from('subscriptions').select('amount, service_id').eq('id', subscriptionId).single();
    const newAmount = (sub?.amount || 0) + amount;
    
    await supabase.from('subscriptions').update({ 
      amount: newAmount,
      service_id: sub?.service_id || serviceId // Set if was null
    }).eq('id', subscriptionId);
  },

  async generateInvoiceFromSubscription(subscription: any): Promise<Invoice> {
    const nextDueDate = new Date(subscription.next_billing_date);
    
    const newInvoice: Omit<Invoice, 'id' | 'created_at'> = {
      company_id: subscription.company_id,
      client_id: subscription.client_id,
      service_id: subscription.service_id,
      amount: subscription.amount,
      due_date: subscription.next_billing_date,
      status: 'pending',
      payment_method: 'pix', // Default
      subscription_id: subscription.id,
    };

    const invoice = await this.createInvoice(newInvoice);

    // Update next billing date
    const newNextBillingDate = new Date(nextDueDate);
    if (subscription.interval === 'monthly') newNextBillingDate.setMonth(newNextBillingDate.getMonth() + 1);
    else if (subscription.interval === 'weekly') newNextBillingDate.setDate(newNextBillingDate.getDate() + 7);
    else if (subscription.interval === 'semiannual') newNextBillingDate.setMonth(newNextBillingDate.getMonth() + 6);
    else if (subscription.interval === 'yearly') newNextBillingDate.setFullYear(newNextBillingDate.getFullYear() + 1);

    await supabase
      .from('subscriptions')
      .update({ next_billing_date: newNextBillingDate.toISOString().split('T')[0] })
      .eq('id', subscription.id);

    return invoice;
  }
};
