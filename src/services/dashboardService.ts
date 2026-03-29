import { supabase } from '../lib/supabase';
import { DashboardStats, Invoice } from '../types';

export const dashboardService = {
  async getStats(companyId?: string): Promise<DashboardStats> {
    try {
      let invQuery = supabase.from('invoices').select('amount, status');
      let clientQuery = supabase.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'active');
      let subQuery = supabase.from('subscriptions').select('amount, interval').eq('status', 'active');

      if (companyId && companyId !== 'null' && companyId !== 'undefined') {
        invQuery = invQuery.eq('company_id', companyId);
        clientQuery = clientQuery.eq('company_id', companyId);
        subQuery = subQuery.eq('company_id', companyId);
      }

      const [invRes, clientRes, subRes] = await Promise.all([invQuery, clientQuery, subQuery]);

      if (invRes.error || clientRes.error || subRes.error) {
        throw new Error('Erro ao buscar estatísticas do dashboard');
      }

      const totalRevenue = (invRes.data as any[])
        ?.filter(i => i.status === 'paid')
        .reduce((acc, i) => acc + Number(i.amount), 0) || 0;

      const overdueAmount = (invRes.data as any[])
        ?.filter(i => i.status === 'overdue')
        .reduce((acc, i) => acc + Number(i.amount), 0) || 0;

      const mrr = (subRes.data as any[])?.reduce((acc, s) => {
        const amt = Number(s.amount);
        if (s.interval === 'monthly') return acc + amt;
        if (s.interval === 'semiannual') return acc + (amt / 6);
        if (s.interval === 'yearly') return acc + (amt / 12);
        if (s.interval === 'weekly') return acc + (amt * 4);
        return acc;
      }, 0) || 0;

      return {
        totalRevenue,
        mrr,
        activeClients: clientRes.count || 0,
        overdueAmount
      };
    } catch (error) {
      console.warn('Dashboard stats fetch failed, using fallback empty state:', error);
      return { totalRevenue: 0, mrr: 0, activeClients: 0, overdueAmount: 0 };
    }
  },

  async getRecentInvoices(companyId?: string): Promise<Invoice[]> {
    try {
      let query = supabase
        .from('invoices')
        .select(`
          id,
          amount,
          due_date,
          status,
          payment_method,
          created_at,
          clients (name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(inv => ({
        id: inv.id,
        company_id: companyId || '',
        client_id: '', // Not needed for recent display
        amount: Number(inv.amount),
        due_date: inv.due_date,
        status: inv.status as any,
        payment_method: inv.payment_method as any,
        created_at: inv.created_at,
        client_name: (inv.clients as any)?.name || 'Cliente Desconhecido'
      }));
    } catch (error) {
      console.error('Recent invoices fetch failed:', error);
      return [];
    }
  },

  async getChartData(period: string, companyId?: string) {
    // Em um cenário real, faríamos agregação no Postgres
    return [
      { name: 'Jan', revenue: 4000, mrr: 2400 },
      { name: 'Fev', revenue: 3000, mrr: 2600 },
      { name: 'Mar', revenue: 2000, mrr: 2800 },
      { name: 'Abr', revenue: 2780, mrr: 3000 },
      { name: 'Mai', revenue: 1890, mrr: 3200 },
      { name: 'Jun', revenue: 2390, mrr: 3500 },
    ];
  }
};
