import { supabase } from '../lib/supabase';
import { SupportTicket, ServiceRequest } from '../types';

export const adminPortalService = {
  async getAllSupportTickets(companyId?: string): Promise<SupportTicket[]> {
    try {
      let query = supabase
        .from('support_tickets')
        .select(`
          *,
          clients (name, email)
        `)
        .order('created_at', { ascending: false });

      if (companyId && companyId !== 'null' && companyId !== 'undefined') {
        // Como tickets estão vinculados a clientes, e clientes a empresas:
        const { data: clients } = await supabase.from('clients').select('id').eq('company_id', companyId);
        const clientIds = (clients || []).map(c => c.id);
        query = query.in('client_id', clientIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(t => ({
        ...t,
        client_name: (t.clients as any)?.name || 'Cliente Desconhecido',
        client_email: (t.clients as any)?.email
      }));
    } catch (error) {
      console.error('Erro ao buscar tickets admin:', error);
      return [];
    }
  },

  async updateTicketStatus(id: string, status: SupportTicket['status']): Promise<void> {
    const { error } = await supabase
      .from('support_tickets')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
  },

  async getAllServiceRequests(companyId?: string): Promise<ServiceRequest[]> {
    try {
      let query = supabase
        .from('service_requests')
        .select(`
          *,
          clients (name, email),
          services (name)
        `)
        .order('created_at', { ascending: false });

      if (companyId && companyId !== 'null' && companyId !== 'undefined') {
        const { data: clients } = await supabase.from('clients').select('id').eq('company_id', companyId);
        const clientIds = (clients || []).map(c => c.id);
        query = query.in('client_id', clientIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(r => ({
        ...r,
        client_name: (r.clients as any)?.name || 'Cliente Desconhecido',
        client_email: (r.clients as any)?.email,
        service_name: (r.services as any)?.name || 'Serviço Personalizado'
      }));
    } catch (error) {
      console.error('Erro ao buscar solicitações admin:', error);
      return [];
    }
  },

  async updateServiceRequestStatus(id: string, status: ServiceRequest['status']): Promise<void> {
    const { error } = await supabase
      .from('service_requests')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
  },

  async getTicketMessages(ticketId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async sendTicketMessage(ticketId: string, senderId: string, senderRole: string, content: string): Promise<void> {
    const { error } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: senderId,
        sender_role: senderRole,
        content
      });
    if (error) {
       console.error('Admin Supabase Error (sendTicket):', error);
       throw error;
    }
  },

  async getRequestMessages(requestId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('service_request_messages')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async sendRequestMessage(requestId: string, senderId: string, senderRole: string, content: string): Promise<void> {
    const { error } = await supabase
      .from('service_request_messages')
      .insert({
        request_id: requestId,
        sender_id: senderId,
        sender_role: senderRole,
        content
      });
    if (error) {
       console.error('Admin Supabase Error (sendRequest):', error);
       throw error;
    }
  },

  async sendNotification(userId: string, title: string, message: string, type: string, referenceId?: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        reference_id: referenceId
      });
    if (error) throw error;
  },

  async getNotifications(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async markNotificationAsRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    if (error) throw error;
  },

  async getClientUserId(clientId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('clients')
      .select('user_id')
      .eq('id', clientId)
      .single();
    if (error) return null;
    return data?.user_id;
  },

  async getAdmins(): Promise<string[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'admin_master']);
    if (error) throw error;
    return (data || []).map(p => p.id);
  }
};
