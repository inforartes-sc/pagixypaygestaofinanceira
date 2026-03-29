import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  ArrowRight, 
  Smartphone, 
  FileText, 
  ExternalLink,
  Zap,
  LifeBuoy
} from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../../lib/utils';
import { portalService } from '../../services/portalService';
import { Invoice, Subscription, User } from '../../types';
import { Link } from 'react-router-dom';

import { useAuth } from '../../contexts/useAuth';

export default function ClientDashboard() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        // Buscar o cliente vinculado ao usuário logado
        const clients = await portalService.getClientByUserId(user.id);
        const myClient = clients[0];
        
        if (myClient) {
          const [invData, subData] = await Promise.all([
            portalService.getClientInvoices(myClient.id),
            portalService.getClientSubscriptions(myClient.id)
          ]);
          setInvoices(invData);
          setSubscriptions(subData);
        }
      } catch (error) {
        console.error('Erro ao buscar dados do portal:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const pendingInvoices = invoices.filter(inv => inv.status === 'pending' || inv.status === 'overdue');
  const totalPending = pendingInvoices.reduce((acc, inv) => acc + inv.amount, 0);

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">A pagar</p>
              <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(totalPending)}</h3>
            </div>
          </div>
          <p className="text-xs text-slate-500">{pendingInvoices.length} faturas pendentes</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Assinaturas</p>
              <h3 className="text-2xl font-bold text-slate-900">{subscriptions.length}</h3>
            </div>
          </div>
          <p className="text-xs text-slate-500">Serviços ativos em sua conta</p>
        </div>

        <div className="bg-indigo-600 p-6 rounded-3xl shadow-lg shadow-indigo-200 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <LifeBuoy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-100 uppercase tracking-widest">Suporte</p>
              <h3 className="text-2xl font-bold">Atendimento</h3>
            </div>
          </div>
          <Link to="/portal/support" className="text-xs font-bold flex items-center gap-2 hover:underline">
            Abrir novo chamado <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Invoices */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Faturas Recentes</h3>
            <Link to="/portal/billing" className="text-xs font-bold text-indigo-600 hover:underline">Ver todas</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {invoices.slice(0, 5).map((invoice) => (
              <div key={invoice.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    invoice.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  )}>
                    {invoice.status === 'paid' ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(invoice.amount)}</p>
                    <p className="text-xs text-slate-500">Vence em {formatDate(invoice.due_date)}</p>
                  </div>
                </div>
                {invoice.status !== 'paid' && (
                  <Link 
                    to={`/pay/${invoice.id}`}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    Pagar <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            ))}
            {invoices.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-sm text-slate-500">Nenhuma fatura encontrada.</p>
              </div>
            )}
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Meus Serviços</h3>
            <Link to="/portal/services" className="text-xs font-bold text-indigo-600 hover:underline">Solicitar novo</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{sub.service_name}</p>
                    <p className="text-xs text-slate-500">
                      {formatCurrency(sub.amount)} / {sub.interval === 'monthly' ? 'mês' : sub.interval === 'yearly' ? 'ano' : sub.interval}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Ativo
                </span>
              </div>
            ))}
            {subscriptions.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-sm text-slate-500">Nenhum serviço contratado.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
