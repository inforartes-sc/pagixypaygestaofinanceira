import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  ArrowRight, 
  Download, 
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  Eye,
  X,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, formatDate, cn } from '../../lib/utils';
import { portalService } from '../../services/portalService';
import { Invoice, Client, Company } from '../../types';
import { Link } from 'react-router-dom';

import { useAuth } from '../../contexts/useAuth';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

export default function ClientBilling() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [myClientId, setMyClientId] = useState<string | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    const fetchMyClient = async () => {
      if (!user) return;
      try {
        const clients = await portalService.getClientByUserId(user.id);
        if (clients[0]) {
          setMyClientId(clients[0].id);
          setClient(clients[0]);
          
          const { data: compData } = await supabase
            .from('companies')
            .select('*')
            .eq('id', clients[0].company_id)
            .single();
          if (compData) setCompany(compData);
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      }
    };
    fetchMyClient();
  }, [user]);

  const fetchInvoices = async () => {
    if (!myClientId) return;
    setLoading(true);
    try {
      const data = await portalService.getClientInvoices(myClientId);
      setInvoices(data);
    } catch (error) {
      console.error('Erro ao buscar faturas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = (invoice: Invoice) => {
    toast.promise(new Promise(resolve => setTimeout(resolve, 1000)), {
      loading: 'Gerando documento...',
      success: () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return 'Erro ao abrir janela de impressão';
        
        printWindow.document.write(`
          <html>
            <head>
              <title>Fatura #${invoice.id.slice(0, 8)}</title>
              <style>
                body { font-family: sans-serif; padding: 40px; color: #1e293b; }
                .header { border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 40px; display: flex; justify-content: space-between; align-items: center; }
                .logo-container { display: flex; align-items: center; gap: 15px; }
                .logo-img { height: 60px; width: auto; object-fit: contain; }
                .logo-text { font-size: 24px; font-weight: bold; color: #6366f1; }
                .invoice-number { font-weight: bold; font-size: 18px; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
                .section-title { font-size: 12px; font-weight: bold; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px; }
                .item-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                .item-table th { text-align: left; padding: 12px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 12px; }
                .item-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
                .total-box { background: #f8fafc; padding: 20px; border-radius: 12px; text-align: right; }
                .total-amount { font-size: 24px; font-weight: bold; color: #0f172a; }
                @media print { .no-print { display: none; } }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="logo-container">
                  ${company?.logo_url 
                    ? `<img src="${company.logo_url}" class="logo-img" alt="Logo">` 
                    : `<div class="logo-text">PagixyPay</div>`
                  }
                  <div>
                    <div style="font-size: 13px; color: #64748b; font-weight: bold;">${company?.name || 'Gestão Financeira'}</div>
                    <div style="font-size: 11px; color: #94a3b8;">CNPJ: ${company?.document || '00.000.000/0000-00'}</div>
                    <div style="font-size: 11px; color: #94a3b8;">
                      ${company?.address_street || ''}, ${company?.address_number || ''}<br>
                      ${company?.address_city || ''} - ${company?.address_state || ''}
                    </div>
                  </div>
                </div>
                <div style="text-align: right;">
                  <div class="invoice-number">FATURA #${invoice.id.slice(0, 8).toUpperCase()}</div>
                  <p style="margin: 4px 0; font-size: 13px;">Data de Emissão: ${formatDate(invoice.created_at)}</p>
                  <p style="margin: 4px 0; font-weight: bold; font-size: 13px; color: ${invoice.status === 'paid' ? '#10b981' : '#f59e0b'}">
                    Status: ${invoice.status === 'paid' ? 'PAGA' : 'PENDENTE'}
                  </p>
                </div>
              </div>
              
              <div class="grid">
                <div>
                  <div class="section-title">Dados do Cliente</div>
                  <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">${client?.name || 'Cliente'}</div>
                  <div style="font-size: 13px; color: #475569;">CPF/CNPJ: ${client?.document || 'N/A'}</div>
                  <div style="font-size: 13px; color: #475569;">Email: ${client?.email || ''}</div>
                </div>
                <div>
                  <div class="section-title">Prestador / Cobrança</div>
                  <div style="font-size: 13px; color: #475569;">
                    ${company?.name || 'PagixyPay'}<br>
                    Email: ${company?.email || 'financeiro@pagixypay.com.br'}<br>
                    Tel: ${company?.phone || ''}
                  </div>
                </div>
              </div>
              
              <table class="item-table">
                <thead>
                  <tr>
                    <th>DESCRIÇÃO DO SERVIÇO</th>
                    <th style="text-align: right;">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div style="font-weight: bold; margin-bottom: 4px;">${invoice.service_name || 'Serviço Profissional'}</div>
                      <div style="font-size: 12px; color: #64748b;">${invoice.description || 'Pagamento referente à prestação de serviços.'}</div>
                    </td>
                    <td style="text-align: right; font-weight: bold;">${formatCurrency(invoice.amount)}</td>
                  </tr>
                </tbody>
              </table>
              
              <div class="total-box">
                <div class="section-title">Total da Fatura</div>
                <div class="total-amount">${formatCurrency(invoice.amount)}</div>
              <script>
                window.onload = function() { 
                  window.print();
                  setTimeout(() => window.close(), 500);
                }
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
        return 'Documento gerado com sucesso!';
      },
      error: 'Erro ao gerar documento'
    });
  };

  useEffect(() => {
    fetchInvoices();
  }, [myClientId]);

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (inv.service_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por fatura ou serviço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          >
            <option value="all">Todos os Status</option>
            <option value="pending">Pendente</option>
            <option value="paid">Pago</option>
            <option value="overdue">Atrasado</option>
          </select>
          <button 
            onClick={fetchInvoices}
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 transition-all"
          >
            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fatura</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Serviço</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vencimento</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                  </td>
                </tr>
              ) : filteredInvoices.length > 0 ? (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">#{invoice.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-500">{invoice.service_name || 'Serviço Profissional'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600">{formatDate(invoice.due_date)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{formatCurrency(invoice.amount)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        invoice.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 
                        invoice.status === 'overdue' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                      )}>
                        {invoice.status === 'paid' ? 'Pago' : invoice.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setSelectedInvoice(invoice)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Visualizar Detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {invoice.status !== 'paid' && (
                          <Link 
                            to={`/pay/${invoice.id}`}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Pagar Agora"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        )}
                        <button 
                          onClick={() => handleDownloadPDF(invoice)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                          title="Baixar PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-sm text-slate-500">Nenhuma fatura encontrada.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalhes da Fatura */}
      <AnimatePresence>
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInvoice(null)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Detalhes da Fatura</h3>
                    <p className="text-xs text-slate-500">#{selectedInvoice.id.slice(0, 8)}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedInvoice(null)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      selectedInvoice.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 
                      selectedInvoice.status === 'overdue' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                    )}>
                      {selectedInvoice.status === 'paid' ? 'Pago' : selectedInvoice.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Valor Total</p>
                    <p className="text-2xl font-black text-slate-900">{formatCurrency(selectedInvoice.amount)}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Serviço:</span>
                    <span className="font-bold text-slate-900">{selectedInvoice.service_name || 'Serviço Profissional'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Data de Vencimento:</span>
                    <span className="font-bold text-slate-900">{formatDate(selectedInvoice.due_date)}</span>
                  </div>
                  {selectedInvoice.description && (
                    <div className="pt-4 border-t border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Observações / Descrição</p>
                      <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl italic">
                        "{selectedInvoice.description}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => handleDownloadPDF(selectedInvoice)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Baixar PDF
                  </button>
                  {selectedInvoice.status !== 'paid' && (
                    <Link 
                      to={`/pay/${selectedInvoice.id}`}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Pagar Agora
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
