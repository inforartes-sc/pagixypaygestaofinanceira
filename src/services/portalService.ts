import { supabase } from '../lib/supabase';
import { SupportTicket, ServiceRequest, Invoice, Subscription } from '../types';

export const portalService = {
  async getClientByEmail(email: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('email', email);
    if (error) throw error;
    return data || [];
  },

  async getClientByUserId(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return data || [];
  },

  async getClientInvoices(clientId: string): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          services (name)
        `)
        .eq('client_id', clientId)
        .order('due_date', { ascending: false });

      if (error) throw error;

      return (data || []).map(inv => ({
        ...inv,
        service_name: (inv.services as any)?.name
      }));
    } catch (error) {
      console.warn('Portal invoices fetch failed:', error);
      return [];
    }
  },

  async getClientSubscriptions(clientId: string): Promise<Subscription[]> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          services (name)
        `)
        .eq('client_id', clientId);

      if (error) throw error;

      return (data || []).map(sub => ({
        ...sub,
        service_name: (sub.services as any)?.name
      }));
    } catch (error) {
      console.warn('Portal subscriptions fetch failed:', error);
      return [];
    }
  },

  async createSupportTicket(ticket: Omit<SupportTicket, 'id' | 'created_at' | 'status'>): Promise<SupportTicket> {
    const { data, error } = await supabase
      .from('support_tickets')
      .insert([{ ...ticket, status: 'open' }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getSupportTickets(clientId: string): Promise<SupportTicket[]> {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.warn('Support tickets fetch failed:', error);
      return [];
    }
  },

  async createServiceRequest(request: Omit<ServiceRequest, 'id' | 'created_at' | 'status'>): Promise<ServiceRequest> {
    const { data, error } = await supabase
      .from('service_requests')
      .insert([{ ...request, status: 'pending' }])
      .select()
      .single();

    if (error) throw error;
    return data;
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
       console.error('Supabase Error (sendTicket):', error);
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
       console.error('Supabase Error (sendRequest):', error);
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

  async getAdmins(): Promise<string[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'admin_master']);
    if (error) throw error;
    return (data || []).map(p => p.id);
  },

  async getClientServiceRequests(clientId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('service_requests')
      .select(`
        *,
        services (name)
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(req => ({
      ...req,
      service_name: req.service_id ? (req.services as any)?.name : req.notes
    }));
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
  }
};
