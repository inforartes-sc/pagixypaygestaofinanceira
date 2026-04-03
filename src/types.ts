export type ClientStatus = 'active' | 'inactive' | 'blocked';
export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';
export type PaymentMethod = 'pix' | 'boleto' | 'credit_card';
export type UserRole = 'admin' | 'client' | 'admin_master';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  client_id?: string; // Link to client if role is 'client'
}

export interface Company {
  id: string;
  name: string;
  document: string;
  email: string;
  phone: string;
  address_zip?: string;
  address_street?: string;
  address_number?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  created_at: string;
}

export interface Client {
  id: string;
  company_id: string;
  user_id?: string; // Link to auth user
  name: string;
  email: string;
  document: string;
  phone: string;
  status: ClientStatus;
  address_zip?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  contact_person?: string;
  website?: string;
  notes?: string;
  open_invoice_status?: 'pending' | 'overdue' | null;
  created_at: string;
}

export interface Service {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  base_price: number;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  service_id: string;
  service_name?: string;
  amount: number;
  description?: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  company_id: string;
  client_id: string;
  client_name?: string;
  service_id?: string;
  service_name?: string;
  amount: number;
  due_date: string;
  status: InvoiceStatus;
  payment_method: PaymentMethod;
  subscription_id?: string;
  description?: string;
  items?: InvoiceItem[];
  created_at: string;
}

export interface SubscriptionItem {
  id: string;
  subscription_id: string;
  service_id: string;
  service_name?: string;
  amount: number;
  created_at: string;
}

export interface Subscription {
  id: string;
  company_id: string;
  client_id: string;
  client_name?: string;
  service_id?: string;
  service_name?: string;
  amount: number;
  interval: 'weekly' | 'monthly' | 'semiannual' | 'yearly';
  status: 'active' | 'inactive' | 'cancelled';
  next_billing_date: string;
  items?: SubscriptionItem[];
  created_at: string;
}

export interface SupportTicket {
  id: string;
  client_id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: 'admin' | 'client';
  content: string;
  created_at: string;
}

export interface ServiceRequest {
  id: string;
  client_id: string;
  service_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
}

export interface DashboardStats {
  totalRevenue: number;
  mrr: number;
  activeClients: number;
  overdueAmount: number;
}
