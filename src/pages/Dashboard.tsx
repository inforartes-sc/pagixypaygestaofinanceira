import React, { useEffect, useState, useCallback } from 'react';
import { 
  TrendingUp, 
  Users, 
  AlertCircle, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  RefreshCw
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';
import { dashboardService } from '../services/dashboardService';
import { DashboardStats, Invoice } from '../types';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../contexts/useAuth';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('6m');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, inv, chart] = await Promise.all([
        dashboardService.getStats(user?.company_id),
        dashboardService.getRecentInvoices(user?.company_id),
        dashboardService.getChartData(period, user?.company_id)
      ]);
      setStats(s);
      setRecentInvoices(inv);
      setChartData(chart);
    } catch (error) {
      console.error('Erro no Dashboard:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  }, [period, user?.company_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-indigo-100 rounded-full" />
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Financeiro</h1>
          <p className="text-slate-500">Bem-vindo de volta! Aqui está o resumo do seu negócio.</p>
        </div>
        <button 
          onClick={fetchData}
          disabled={loading}
          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-50"
        >
          <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Receita Total', value: stats?.totalRevenue || 0, icon: DollarSign, trend: '+12.5%', up: true },
          { label: 'MRR (Recorrência)', value: stats?.mrr || 0, icon: TrendingUp, trend: '+4.2%', up: true },
          { label: 'Clientes Ativos', value: stats?.activeClients || 0, icon: Users, trend: '+8', up: true },
          { label: 'Inadimplência', value: stats?.overdueAmount || 0, icon: AlertCircle, trend: '-2.1%', up: false },
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label} 
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <stat.icon className="w-5 h-5 text-indigo-600" />
              </div>
              <span className={cn(
                "text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1",
                stat.up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
              )}>
                {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.trend}
              </span>
            </div>
            <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {stat.label !== 'Clientes Ativos' 
                ? formatCurrency(stat.value) 
                : stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900">Crescimento de Receita</h3>
            <select 
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="text-xs border-slate-200 rounded-lg bg-slate-50 px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="6m">Últimos 6 meses</option>
              <option value="1y">Último ano</option>
            </select>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => `R$ ${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-6">Cobranças Recentes</h3>
          <div className="space-y-4">
            {recentInvoices.map((invoice) => (
              <div 
                key={invoice.id} 
                onClick={() => navigate('/billing')}
                className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    invoice.status === 'paid' ? "bg-emerald-50 text-emerald-600" : 
                    invoice.status === 'overdue' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                  )}>
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{invoice.client_name}</p>
                    <p className="text-xs text-slate-500">{invoice.due_date}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-slate-900">{formatCurrency(invoice.amount)}</p>
                  <p className={cn(
                    "text-[10px] uppercase font-bold tracking-wider",
                    invoice.status === 'paid' ? "text-emerald-600" : 
                    invoice.status === 'overdue' ? "text-red-600" : "text-amber-600"
                  )}>
                    {invoice.status === 'paid' ? 'Pago' : invoice.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                  </p>
                </div>
              </div>
            ))}
            {recentInvoices.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-slate-500">Nenhuma fatura encontrada.</p>
              </div>
            )}
          </div>
          <button 
            onClick={() => navigate('/billing')}
            className="w-full mt-6 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            Ver todas as faturas
          </button>
        </div>
      </div>
    </div>
  );
}
