import { supabase } from '../lib/supabase';
import { Client, ClientStatus, Invoice, SupportTicket, ServiceRequest } from '../types';

export const clientService = {
  async getClients(search?: string, status?: ClientStatus | 'all', companyId?: string): Promise<Client[]> {
    try {
      let query = supabase
        .from('clients')
        .select('*, invoices(status)')
        .order('name', { ascending: true });

      if (companyId && companyId !== 'null' && companyId !== 'undefined') {
        query = query.eq('company_id', companyId);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,document.ilike.%${search}%`);
      }

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(c => {
        const invoices = (c.invoices as any[]) || [];
        const hasOverdue = invoices.some(inv => inv.status === 'overdue');
        const hasPending = invoices.some(inv => inv.status === 'pending');
        
        return {
          ...c,
          address_zip: c.address_zip || '',
          address_street: c.address_street || '',
          address_number: c.address_number || '',
          address_complement: c.address_complement || '',
          address_neighborhood: c.address_neighborhood || '',
          address_city: c.address_city || '',
          address_state: c.address_state || '',
          status: c.status as ClientStatus,
          open_invoice_status: hasOverdue ? 'overdue' : hasPending ? 'pending' : null
        };
      });
    } catch (error) {
      console.warn('Clients fetch failed, using fallback mock data:', error);
      // Fallback em caso de erro crítico ou falta de conexão
      return [];
    }
  },

  async getClientHistory(clientId: string): Promise<{ 
    invoices: Invoice[], 
    subscriptions: any[],
    tickets: SupportTicket[],
    serviceRequests: any[]
  }> {
    try {
      const [invoicesRes, subscriptionsRes, ticketsRes, requestsRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('*, services(name)')
          .eq('client_id', clientId)
          .order('due_date', { ascending: false }),
        supabase
          .from('subscriptions')
          .select('*, services(name)')
          .eq('client_id', clientId)
          .order('next_billing_date', { ascending: true }),
        supabase
          .from('support_tickets')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false }),
        supabase
          .from('service_requests')
          .select('*, services(name)')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
      ]);

      if (invoicesRes.error) throw invoicesRes.error;
      if (subscriptionsRes.error) throw subscriptionsRes.error;
      if (ticketsRes.error) throw ticketsRes.error;
      if (requestsRes.error) throw requestsRes.error;

      return {
        invoices: (invoicesRes.data || []).map(inv => ({
          ...inv,
          service_name: (inv.services as any)?.name
        })),
        subscriptions: (subscriptionsRes.data || []).map(sub => ({
          ...sub,
          service_name: (sub.services as any)?.name
        })),
        tickets: ticketsRes.data || [],
        serviceRequests: (requestsRes.data || []).map(req => ({
          ...req,
          service_name: (req.services as any)?.name
        }))
      };
    } catch (error) {
      console.error('Erro ao buscar histórico do cliente:', error);
      return { invoices: [], subscriptions: [], tickets: [], serviceRequests: [] };
    }
  },

  async createClient(clientData: Partial<Client>): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .insert([clientData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Cria um cliente e já gera o acesso ao portal (via API Backend Segura)
   */
  async createClientWithAuth(clientData: any): Promise<Client> {
    const response = await fetch('/api/admin/create-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clientData)
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Erro ao criar cliente com acesso');
    
    return result.client;
  },

  async updateClient(id: string, updates: Partial<Client>): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  async getClientById(id: string): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async deleteClient(id: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
