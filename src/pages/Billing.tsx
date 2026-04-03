import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreditCard, Plus, Calendar, Filter, Download, ArrowRight, Search, X, RefreshCw, Trash2, CheckCircle, AlertCircle, Clock, Mail, Link, Zap, Lock, User, MapPin } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { billingService } from '../services/billingService';
import { clientService } from '../services/clientService';
import { serviceService } from '../services/serviceService';
import { Invoice, InvoiceStatus, PaymentMethod, Client, ClientStatus, Subscription, Service } from '../types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/useAuth';
import { supabase } from '../lib/supabase';
import { translateError } from '../lib/errorTranslator';

export default function Billing() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const clientIdParam = searchParams.get('client_id');
  
  const [activeTab, setActiveTab] = useState<'invoices' | 'subscriptions'>('invoices');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isSubDetailsModalOpen, setIsSubDetailsModalOpen] = useState(false);
  const [isSubDeleteModalOpen, setIsSubDeleteModalOpen] = useState(false);
  const [isQuickClientModalOpen, setIsQuickClientModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [subToDelete, setSubToDelete] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    client_id: '',
    service_id: '',
    amount: '',
    due_date: '',
    payment_method: 'pix' as PaymentMethod,
    status: 'pending' as InvoiceStatus
  });
  const [invoiceItems, setInvoiceItems] = useState<{service_id: string, name: string, amount: number}[]>([]);

  const [subFormData, setSubFormData] = useState({
    client_id: '',
    service_id: '',
    amount: '',
    interval: 'monthly' as 'weekly' | 'monthly' | 'yearly',
    next_billing_date: ''
  });
  const [subItems, setSubItems] = useState<{service_id: string, name: string, amount: number}[]>([]);

  const [quickClientData, setQuickClientData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    document: '',
    status: 'active' as ClientStatus,
    address_zip: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    contact_person: '',
    website: '',
    notes: ''
  });
  const [quickClientTab, setQuickClientTab] = useState<'basic' | 'address' | 'extra'>('basic');

  const getIntervalLabel = (interval: string) => {
    const labels: Record<string, string> = {
      weekly: 'Semanal',
      monthly: 'Mensal',
      semiannual: 'Semestral',
      yearly: 'Anual'
    };
    return labels[interval] || interval;
  };

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      // Assinatura correta: billingService.getInvoices(status, clientId, companyId)
      const data = await billingService.getInvoices(statusFilter, clientIdParam || undefined, user?.company_id);
      setInvoices(data);
    } catch (error) {
      toast.error('Erro ao carregar cobranças');
    } finally {
      setLoading(false);
    }
  }, [user?.company_id, statusFilter, clientIdParam]);

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await billingService.getSubscriptions(undefined, user?.company_id);
      setSubscriptions(data);
    } catch (error) {
      toast.error('Erro ao carregar assinaturas');
    } finally {
      setLoading(false);
    }
  }, [user?.company_id]);

  const fetchClients = useCallback(async () => {
    try {
      const data = await clientService.getClients(undefined, 'active', user?.company_id);
      setClients(data);
    } catch (error) {
      console.error('Erro ao carregar clientes para o formulário');
    }
  }, [user?.company_id]);

  const fetchServices = useCallback(async () => {
    try {
      const data = await serviceService.getServices(user?.company_id);
      setServices(data);
    } catch (error) {
      console.error('Erro ao carregar serviços para o formulário');
    }
  }, [user?.company_id]);

  useEffect(() => {
    if (activeTab === 'invoices') {
      fetchInvoices();
    } else {
      fetchSubscriptions();
    }
  }, [fetchInvoices, fetchSubscriptions, activeTab]);

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!user?.company_id) return;
      const { data } = await supabase
        .from('companies')
        .select('*')
        .eq('id', user.company_id)
        .single();
      
      if (data) {
        setCompanyInfo(data);
        setCompanyLogo(data.logo_url);
      }
    };
    fetchCompanyData();
  }, [user?.company_id]);

  useEffect(() => {
    if (user) {
      fetchClients();
      fetchServices();
    }
  }, [fetchClients, fetchServices, user]);

  const handleServiceChange = (serviceId: string, type: 'invoice' | 'subscription') => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    if (type === 'invoice') {
      const alreadyHas = invoiceItems.find(it => it.service_id === serviceId);
      if (alreadyHas) return; // Don't add duplicate
      
      const newItems = [...invoiceItems, { service_id: service.id, name: service.name, amount: service.base_price }];
      setInvoiceItems(newItems);
      
      const totalAmount = newItems.reduce((acc, it) => acc + it.amount, 0);
      setFormData(prev => ({ ...prev, amount: totalAmount.toString() }));
    } else {
      const alreadyHas = subItems.find(it => it.service_id === serviceId);
      if (alreadyHas) return;

      const newItems = [...subItems, { service_id: service.id, name: service.name, amount: service.base_price }];
      setSubItems(newItems);
      
      const totalAmount = newItems.reduce((acc, it) => acc + it.amount, 0);
      setSubFormData(prev => ({ ...prev, amount: totalAmount.toString() }));
    }
  };

  const removeServiceItem = (serviceId: string, type: 'invoice' | 'subscription') => {
    if (type === 'invoice') {
      const newItems = invoiceItems.filter(it => it.service_id !== serviceId);
      setInvoiceItems(newItems);
      const totalAmount = newItems.reduce((acc, it) => acc + it.amount, 0);
      setFormData(prev => ({ ...prev, amount: totalAmount.toString() }));
    } else {
      const newItems = subItems.filter(it => it.service_id !== serviceId);
      setSubItems(newItems);
      const totalAmount = newItems.reduce((acc, it) => acc + it.amount, 0);
      setSubFormData(prev => ({ ...prev, amount: totalAmount.toString() }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id) {
      toast.error('Selecione um cliente');
      return;
    }

    setIsSubmitting(true);
    try {
      // Se o usuário não tiver company_id (master_admin), usar o do cliente
      let targetCompanyId = (user?.company_id && user.company_id !== 'null' && user.company_id !== 'undefined') ? user.company_id : null;
      if (!targetCompanyId) {
        const clients = await clientService.getClients();
        const targetClient = clients.find(c => c.id === formData.client_id);
        targetCompanyId = targetClient?.company_id || null;
      }

      if (!targetCompanyId) {
        throw new Error('Não foi possível identificar a empresa vinculada ao cliente.');
      }

      await billingService.createInvoice({
        company_id: targetCompanyId,
        client_id: formData.client_id,
        service_id: invoiceItems.length === 1 ? invoiceItems[0].service_id : undefined, // Compatibility
        amount: Number(formData.amount),
        due_date: formData.due_date,
        payment_method: formData.payment_method,
        status: formData.status
      }, invoiceItems);
      toast.success('Cobrança criada com sucesso!');
      setIsModalOpen(false);
      setFormData({ client_id: '', service_id: '', amount: '', due_date: '', status: 'pending', payment_method: 'pix' });
      setInvoiceItems([]);
      setActiveTab('invoices'); // Switch to invoices tab
      fetchInvoices();
    } catch (error: any) {
      console.error('Erro ao criar cobrança:', error);
      toast.error(translateError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subFormData.client_id) {
      toast.error('Selecione um cliente');
      return;
    }

    setIsSubmitting(true);
    try {
      // Se o usuário não tiver company_id (master_admin), usar o do cliente
      let targetCompanyId = (user?.company_id && user.company_id !== 'null' && user.company_id !== 'undefined') ? user.company_id : null;
      if (!targetCompanyId) {
        const clients = await clientService.getClients();
        const targetClient = clients.find(c => c.id === subFormData.client_id);
        targetCompanyId = targetClient?.company_id || null;
      }

      if (!targetCompanyId) {
        throw new Error('Não foi possível identificar a empresa vinculada ao cliente.');
      }

      await billingService.createSubscription({
        company_id: targetCompanyId,
        client_id: subFormData.client_id,
        service_id: subItems.length === 1 ? subItems[0].service_id : undefined, // Compatibility
        amount: Number(subFormData.amount),
        interval: subFormData.interval,
        status: 'active',
        next_billing_date: subFormData.next_billing_date
      }, subItems);
      toast.success('Assinatura criada com sucesso!');
      setIsSubModalOpen(false);
      setSubFormData({ client_id: '', service_id: '', amount: '', interval: 'monthly', next_billing_date: '' });
      setSubItems([]);
      setActiveTab('subscriptions'); // Switch to subscriptions tab
      fetchSubscriptions();
    } catch (error: any) {
      console.error('Erro ao criar assinatura:', error);
      toast.error(translateError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newClient = await clientService.createClientWithAuth({
        ...quickClientData,
        company_id: user.company_id || undefined // admin_master pode ser null
      });
      
      toast.success('Cliente e acesso ao portal criados!');
      
      // Atualizar lista e selecionar automaticamente
      await fetchClients();
      if (isModalOpen) setFormData(prev => ({ ...prev, client_id: newClient.id }));
      if (isSubModalOpen) setSubFormData(prev => ({ ...prev, client_id: newClient.id }));
      
      setIsQuickClientModalOpen(false);
      setQuickClientData({
        name: '', email: '', password: '', phone: '', document: '',
        status: 'active',
        address_zip: '', address_street: '', address_number: '',
        address_complement: '', address_neighborhood: '', address_city: '', address_state: '',
        contact_person: '', website: '', notes: ''
      });
      setQuickClientTab('basic');
    } catch (error: any) {
      toast.error(translateError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: InvoiceStatus) => {
    try {
      await billingService.updateInvoiceStatus(id, newStatus);
      toast.success(`Status atualizado para ${newStatus}`);
      fetchInvoices();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleGenerateInvoice = async (sub: Subscription) => {
    setIsSubmitting(true);
    try {
      const invoice = await billingService.generateInvoiceFromSubscription(sub);
      toast.success('Fatura gerada com sucesso!');
      
      // Oferecer para copiar o link
      const link = `${window.location.origin}/pay/${invoice.id}`;
      navigator.clipboard.writeText(link);
      toast.info('Link de pagamento copiado para a área de transferência');
      
      fetchSubscriptions();
      fetchInvoices();
    } catch (error) {
      toast.error('Erro ao gerar fatura');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!selectedInvoice) return;
    
    setIsSubmitting(true);
    try {
      await billingService.deleteInvoice(selectedInvoice.id);
      toast.success('Cobrança excluída');
      setIsDeleteModalOpen(false);
      setSelectedInvoice(null);
      fetchInvoices();
    } catch (error) {
      toast.error('Erro ao excluir cobrança');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsDeleteModalOpen(true);
  };

  const openDetailsModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsDetailsModalOpen(true);
  };

  const openSubDetailsModal = (sub: Subscription) => {
    setSelectedSubscription(sub);
    setIsSubDetailsModalOpen(true);
  };

  const handleUpdateSubStatus = async (id: string, newStatus: 'active' | 'inactive' | 'cancelled') => {
    try {
      await billingService.updateSubscriptionStatus(id, newStatus);
      toast.success(`Status da assinatura atualizado para ${newStatus}`);
      fetchSubscriptions();
    } catch (error) {
      toast.error('Erro ao atualizar status da assinatura');
    }
  };

  const openSubDeleteModal = (id: string) => {
    setSubToDelete(id);
    setIsSubDeleteModalOpen(true);
  };

  const confirmSubDelete = async () => {
    if (!subToDelete) return;
    setIsSubmitting(true);
    try {
      await billingService.deleteSubscription(subToDelete);
      toast.success('Assinatura excluída com sucesso');
      setIsSubDeleteModalOpen(false);
      setIsSubDetailsModalOpen(false);
      setSubToDelete(null);
      fetchSubscriptions();
    } catch (error) {
      toast.error('Erro ao excluir assinatura');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { 
      label: 'Aguardando Pagamento', 
      amount: invoices.filter(i => i.status === 'pending').reduce((acc, i) => acc + i.amount, 0),
      count: invoices.filter(i => i.status === 'pending').length,
      color: 'amber' 
    },
    { 
      label: 'Vencidas', 
      amount: invoices.filter(i => i.status === 'overdue').reduce((acc, i) => acc + i.amount, 0),
      count: invoices.filter(i => i.status === 'overdue').length,
      color: 'red' 
    },
    { 
      label: 'Pagas', 
      amount: invoices.filter(i => i.status === 'paid').reduce((acc, i) => acc + i.amount, 0),
      count: invoices.filter(i => i.status === 'paid').length,
      color: 'emerald' 
    },
    { 
      label: 'Total Geral', 
      amount: invoices.reduce((acc, i) => acc + i.amount, 0),
      count: invoices.length,
      color: 'indigo' 
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-6 print-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cobranças</h1>
          <p className="text-slate-500">Gerencie faturas, assinaturas e links de pagamento.</p>
          {clientIdParam && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full flex items-center gap-1">
                Filtrando por cliente
                <button 
                  onClick={() => {
                    searchParams.delete('client_id');
                    setSearchParams(searchParams);
                  }}
                  className="hover:text-indigo-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSubModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Nova Assinatura
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nova Cobrança
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('invoices')}
          className={cn(
            "px-6 py-2 text-sm font-bold rounded-lg transition-all",
            activeTab === 'invoices' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Faturas
        </button>
        <button 
          onClick={() => setActiveTab('subscriptions')}
          className={cn(
            "px-6 py-2 text-sm font-bold rounded-lg transition-all",
            activeTab === 'subscriptions' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Assinaturas
        </button>
      </div>

      {activeTab === 'invoices' ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((item) => (
              <div key={item.label} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{item.label}</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(item.amount)}</p>
                  <span className="text-xs font-medium text-slate-400">{item.count} faturas</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
            <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row gap-4 justify-between items-center print-hidden">
              <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
                {[
                  { id: 'all', label: 'Todas' },
                  { id: 'pending', label: 'Pendentes' },
                  { id: 'paid', label: 'Pagas' },
                  { id: 'overdue', label: 'Vencidas' },
                ].map((tab) => (
                  <button 
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id as any)}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap",
                      statusFilter === tab.id 
                        ? "bg-indigo-50 text-indigo-700" 
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center gap-2 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Buscar por cliente ou ID..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button 
                  onClick={fetchInvoices}
                  className="p-2 text-slate-400 hover:text-indigo-600 border border-slate-200 rounded-lg"
                >
                  <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </button>
                <button className="p-2 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Serviço</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vencimento</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Método</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                      </td>
                    </tr>
                  ) : filteredInvoices.length > 0 ? (
                    filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="text-xs font-mono text-slate-400 group-hover:text-slate-600 transition-colors">
                            #{invoice.id.slice(0, 8)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-700">{invoice.client_name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-slate-500">
                            {invoice.items && invoice.items.length > 1 
                              ? `${invoice.items[0].service_name} +${invoice.items.length - 1}` 
                              : invoice.service_name || '-'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-900">{formatCurrency(invoice.amount)}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-600">{formatDate(invoice.due_date)}</p>
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
                        <td className="px-6 py-4">
                          <span className="text-xs text-slate-500 capitalize">{(invoice.payment_method || 'pix').replace('_', ' ')}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {invoice.status !== 'paid' && (
                              <button 
                                onClick={() => {
                                  const link = `${window.location.origin}/pay/${invoice.id}`;
                                  navigator.clipboard.writeText(link);
                                  toast.success('Link de pagamento copiado!');
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Copiar Link de Pagamento"
                              >
                                <Link className="w-4 h-4" />
                              </button>
                            )}
                            {invoice.status !== 'paid' && (
                              <button 
                                onClick={() => handleUpdateStatus(invoice.id, 'paid')}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Marcar como Pago"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button 
                              onClick={() => openDeleteModal(invoice)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => openDetailsModal(invoice)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Ver Detalhes"
                            >
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <p className="text-sm text-slate-500">Nenhuma cobrança encontrada.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row gap-4 justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900">Assinaturas Ativas</h2>
            <button 
              onClick={fetchSubscriptions}
              className="p-2 text-slate-400 hover:text-indigo-600 border border-slate-200 rounded-lg"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Serviço</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Intervalo</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Próxima Cobrança</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                    </td>
                  </tr>
                ) : subscriptions.length > 0 ? (
                  subscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-700">{sub.client_name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-slate-500">
                          {sub.items && sub.items.length > 1 
                            ? `${sub.items[0].service_name} +${sub.items.length - 1}` 
                            : sub.service_name || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900">{formatCurrency(sub.amount)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-slate-500">{getIntervalLabel(sub.interval)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600">{formatDate(sub.next_billing_date)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          sub.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-700'
                        )}>
                          {sub.status === 'active' ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleGenerateInvoice(sub)}
                            disabled={isSubmitting}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Gerar Fatura Agora"
                          >
                            <Zap className={cn("w-4 h-4", isSubmitting && "animate-pulse")} />
                          </button>
                          <button 
                            onClick={() => openSubDetailsModal(sub)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Ver Detalhes"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <p className="text-sm text-slate-500">Nenhuma assinatura encontrada.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      </div>
      {/* Modal Nova Cobrança */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Nova Cobrança</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</label>
                    <button 
                      type="button"
                      onClick={() => setIsQuickClientModalOpen(true)}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Novo Cliente
                    </button>
                  </div>
                  <select 
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  >
                    <option value="">Selecione um cliente</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Adicionar Serviço</label>
                  <select 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    value=""
                    onChange={(e) => handleServiceChange(e.target.value, 'invoice')}
                  >
                    <option value="">Selecione um serviço para adicionar...</option>
                    {services.map(service => (
                      <option key={service.id} value={service.id}>{service.name}</option>
                    ))}
                  </select>
                </div>

                {invoiceItems.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Serviços Selecionados</label>
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                      {invoiceItems.map((item) => (
                        <div key={item.service_id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="text-xs font-medium text-slate-700">{item.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-indigo-600">{formatCurrency(item.amount)}</span>
                            <button 
                              type="button" 
                              onClick={() => removeServiceItem(item.service_id, 'invoice')}
                              className="p-1 text-slate-400 hover:text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor (R$)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vencimento</label>
                    <input 
                      type="date" 
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Método</label>
                    <select 
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formData.payment_method}
                      onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as PaymentMethod })}
                    >
                      <option value="pix">PIX</option>
                      <option value="boleto">Boleto</option>
                      <option value="credit_card">Cartão de Crédito</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status Inicial</label>
                    <select 
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as InvoiceStatus })}
                    >
                      <option value="pending">Pendente</option>
                      <option value="paid">Pago</option>
                    </select>
                  </div>
                </div>

                <div className="pt-6 flex items-center justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Criar Cobrança
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Nova Assinatura */}
      <AnimatePresence>
        {isSubModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSubModalOpen(false)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Nova Assinatura</h3>
                <button onClick={() => setIsSubModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubSubmit} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</label>
                    <button 
                      type="button"
                      onClick={() => setIsQuickClientModalOpen(true)}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Novo Cliente
                    </button>
                  </div>
                  <select 
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={subFormData.client_id}
                    onChange={(e) => setSubFormData({ ...subFormData, client_id: e.target.value })}
                  >
                    <option value="">Selecione um cliente</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Adicionar Serviço</label>
                  <select 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    value=""
                    onChange={(e) => handleServiceChange(e.target.value, 'subscription')}
                  >
                    <option value="">Selecione um serviço para adicionar...</option>
                    {services.map(service => (
                      <option key={service.id} value={service.id}>{service.name}</option>
                    ))}
                  </select>
                </div>

                {subItems.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Serviços Selecionados</label>
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                      {subItems.map((item) => (
                        <div key={item.service_id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="text-xs font-medium text-slate-700">{item.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-indigo-600">{formatCurrency(item.amount)}</span>
                            <button 
                              type="button" 
                              onClick={() => removeServiceItem(item.service_id, 'subscription')}
                              className="p-1 text-slate-400 hover:text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor (R$)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={subFormData.amount}
                      onChange={(e) => setSubFormData({ ...subFormData, amount: e.target.value })}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Intervalo</label>
                    <select 
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={subFormData.interval}
                      onChange={(e) => setSubFormData({ ...subFormData, interval: e.target.value as any })}
                    >
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensal</option>
                      <option value="semiannual">Semestral</option>
                      <option value="yearly">Anual</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Primeira Cobrança</label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={subFormData.next_billing_date}
                    onChange={(e) => setSubFormData({ ...subFormData, next_billing_date: e.target.value })}
                  />
                </div>

                <div className="pt-6 flex items-center justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsSubModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Criar Assinatura
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Confirmar Exclusão */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 text-center"
            >
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Excluir Cobrança</h3>
              <p className="text-slate-500 text-sm mb-6">
                Tem certeza que deseja excluir esta cobrança? Esta ação não pode ser desfeita.
              </p>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDeleteInvoice}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Detalhes da Cobrança */}
      <AnimatePresence>
        {isDetailsModalOpen && selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print-root">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden print-only"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white print:bg-white">
                <div className="flex items-center gap-4">
                  {companyLogo && (
                    <img src={companyLogo} alt="Logo" className="w-16 h-16 object-contain" />
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{companyInfo?.name || 'Fatura'}</h3>
                    <p className="text-[10px] text-slate-500 font-mono">{selectedInvoice.id}</p>
                    {companyInfo?.address_street && (
                      <p className="hidden print:block text-[9px] text-slate-400 mt-0.5">
                        {companyInfo.address_street}, {companyInfo.address_number} - {companyInfo.address_city}/{companyInfo.address_state}
                      </p>
                    )}
                  </div>
                </div>
                <button onClick={() => setIsDetailsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 print-hidden">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white custom-scrollbar">
                {(selectedInvoice.description?.includes('Assinatura') || !!selectedInvoice.subscription_id) && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="flex items-center gap-3 text-indigo-700">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                        <RefreshCw className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider">Fatura de Assinatura</p>
                        <p className="text-[10px] text-indigo-600/70 font-medium">Recorrência automática via SaaSFinFlow</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-indigo-200/50 text-indigo-700 text-[9px] font-black uppercase tracking-tighter">Premium</span>
                  </div>
                )}
                {/* Status and Header Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6 print:pb-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em] mb-1">Status da Cobrança</p>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                      selectedInvoice.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 
                      selectedInvoice.status === 'overdue' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                    )}>
                      {selectedInvoice.status === 'paid' ? 'Pago' : selectedInvoice.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nº da Fatura</p>
                    <p className="text-sm font-mono font-bold text-slate-700">#{selectedInvoice.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{formatDate(selectedInvoice.created_at)}</p>
                  </div>
                </div>

                {/* Emissor vs Receptor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Dados do Emissor</h4>
                      <p className="text-sm font-bold text-slate-900">{companyInfo?.name || 'Vendedor'}</p>
                      {companyInfo?.document && <p className="text-xs text-slate-500 mt-1">CNPJ: {companyInfo.document}</p>}
                      {companyInfo?.address_street && (
                        <p className="text-xs text-slate-500 mt-1">
                          {companyInfo.address_street}, {companyInfo.address_number}<br />
                          {companyInfo.address_neighborhood}<br />
                          {companyInfo.address_city} - {companyInfo.address_state}<br />
                          CEP: {companyInfo.address_zip}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Dados do Tomador</h4>
                      {(() => {
                        const client = clients.find(c => c.id === selectedInvoice.client_id);
                        return (
                          <>
                            <p className="text-sm font-bold text-slate-900">{client?.name || selectedInvoice.client_name}</p>
                            {client?.document && <p className="text-xs text-slate-500 mt-1">CPF/CNPJ: {client.document}</p>}
                            {client?.address_street && (
                              <p className="text-xs text-slate-500 mt-1">
                                {client.address_street}, {client.address_number}<br />
                                {client.address_neighborhood}<br />
                                {client.address_city} - {client.address_state}<br />
                                CEP: {client.address_zip}
                              </p>
                            )}
                            <p className="text-xs text-slate-500 mt-1">{client?.email || 'Email não informado'}</p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Itens da Fatura */}
                <div className="mt-8">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-y border-slate-100 bg-slate-50/50 print:bg-slate-50">
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Descrição do Serviço</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Data Venc.</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                        selectedInvoice.items.map((item) => (
                          <tr key={item.id} className="border-b border-slate-50">
                            <td className="px-4 py-4">
                              <p className="text-sm text-slate-900 font-bold">{item.service_name || 'Serviço'}</p>
                              {item.description && <p className="text-[10px] text-slate-500">{item.description}</p>}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-600 text-center">
                              {formatDate(selectedInvoice.due_date)}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-900 font-bold text-right">
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr className="border-b border-slate-50 font-medium">
                          <td className="px-4 py-6">
                            <p className="text-sm text-slate-900 font-bold">{selectedInvoice.service_name || 'Serviço Profissional'}</p>
                            <p className="text-xs text-slate-500 mt-1">{selectedInvoice.description || (selectedInvoice.subscription_id ? 'Serviço de Assinatura Recorrente' : 'Execução de serviços conforme contrato.')}</p>
                          </td>
                          <td className="px-4 py-6 text-sm text-slate-600 text-center">
                            {formatDate(selectedInvoice.due_date)}
                          </td>
                          <td className="px-4 py-6 text-sm text-slate-900 font-bold text-right">
                            {formatCurrency(selectedInvoice.amount)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Totais */}
                <div className="flex justify-end pt-6 border-t border-slate-100">
                  <div className="w-full sm:w-64 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Subtotal:</span>
                      <span className="text-slate-900 font-medium">{formatCurrency(selectedInvoice.amount)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                      <span className="text-lg font-bold text-slate-900">Total:</span>
                      <span className="text-2xl font-black text-indigo-600">{formatCurrency(selectedInvoice.amount)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes/Payment Method */}
                <div className="bg-slate-50 rounded-2xl p-6 space-y-4 print:p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Método de Pagamento</p>
                      <p className="text-sm font-medium text-slate-700 capitalize">{(selectedInvoice.payment_method || 'pix').replace('_', ' ')}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pagamento Via</p>
                      <p className="text-xs text-slate-500">PagixyPay Gateway Seguro</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 italic text-center pt-4">
                    Este documento serve como registro oficial de cobrança gerado digitalmente.
                  </p>
                </div>
              </div>

               <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-2 shrink-0 print-hidden">
                {selectedInvoice.status !== 'paid' && (
                  <button 
                    onClick={() => {
                      handleUpdateStatus(selectedInvoice.id, 'paid');
                      setIsDetailsModalOpen(false);
                    }}
                    className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Marcar como Pago
                  </button>
                )}
                <button 
                  onClick={() => {
                    const link = `${window.location.origin}/pay/${selectedInvoice.id}`;
                    navigator.clipboard.writeText(link);
                    toast.success('Link de pagamento copiado!');
                  }}
                  className="w-full py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Link className="w-4 h-4" />
                  Copiar Link de Pagamento
                </button>
                <button 
                  onClick={() => toast.success('Link de pagamento enviado para o email do cliente')}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Enviar por Email
                </button>
                <button 
                  onClick={() => window.print()}
                  className="w-full py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Baixar PDF / Imprimir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Detalhes da Assinatura */}
      <AnimatePresence>
        {isSubDetailsModalOpen && selectedSubscription && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSubDetailsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Detalhes da Assinatura</h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedSubscription.id}</p>
                </div>
                <button onClick={() => setIsSubDetailsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                    selectedSubscription.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-700'
                  )}>
                    {selectedSubscription.status === 'active' ? 'Ativa' : 'Inativa'}
                  </span>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(selectedSubscription.amount)}</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</p>
                    <p className="text-sm font-medium text-slate-700">{selectedSubscription.client_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Intervalo</p>
                    <p className="text-sm font-medium text-slate-700">{selectedSubscription.interval}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Próxima Cobrança</p>
                    <p className="text-sm font-medium text-slate-700">{formatDate(selectedSubscription.next_billing_date)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Criada em</p>
                    <p className="text-sm font-medium text-slate-700">{formatDate(selectedSubscription.created_at)}</p>
                  </div>
                </div>

                {selectedSubscription.items && selectedSubscription.items.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Serviços Inclusos</p>
                      <button 
                         onClick={() => {
                           const el = document.getElementById('add-srv-dropdown');
                           if (el) el.classList.toggle('hidden');
                         }}
                         className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        + Adicionar Mais
                      </button>
                    </div>
                    <div className="space-y-2">
                      {selectedSubscription.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-xs font-bold text-slate-700">{item.service_name || 'Serviço'}</span>
                          <span className="text-xs font-bold text-indigo-600">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                    </div>

                    <div id="add-srv-dropdown" className="hidden space-y-3 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      <select 
                        id="new-srv-select"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                      >
                        <option value="">Selecione um serviço...</option>
                        {services.filter(s => !selectedSubscription.items?.some(it => it.service_id === s.id)).map(service => (
                          <option key={service.id} value={service.id}>{service.name} ({formatCurrency(service.base_price)})</option>
                        ))}
                      </select>
                      <button 
                        type="button"
                        onClick={async () => {
                          const sel = document.getElementById('new-srv-select') as HTMLSelectElement;
                          if (!sel.value) return;
                          
                          const srv = services.find(s => s.id === sel.value);
                          if (!srv) return;

                          setIsSubmitting(true);
                          try {
                            await billingService.addServiceToSubscription(selectedSubscription.id, srv.id, srv.base_price);
                            toast.success('Serviço adicionado à assinatura!');
                            document.getElementById('add-srv-dropdown')?.classList.add('hidden');
                            // Refresh
                            const updated = await billingService.getSubscriptions(undefined, user?.company_id);
                            setSubscriptions(updated);
                            const newSelected = updated.find(s => s.id === selectedSubscription.id);
                            if (newSelected) setSelectedSubscription(newSelected);
                          } catch (e) {
                            toast.error('Erro ao adicionar serviço');
                          } finally {
                            setIsSubmitting(false);
                          }
                        }}
                        className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                      >
                        Confirmar Adição
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-slate-100 flex flex-col gap-2">
                  {selectedSubscription.status === 'active' ? (
                    <button 
                      onClick={() => handleUpdateSubStatus(selectedSubscription.id, 'inactive')}
                      className="w-full py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Clock className="w-4 h-4" />
                      Pausar Assinatura
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleUpdateSubStatus(selectedSubscription.id, 'active')}
                      className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Reativar Assinatura
                    </button>
                  )}
                  <button 
                    onClick={() => openSubDeleteModal(selectedSubscription.id)}
                    className="w-full py-2.5 bg-white text-red-600 border border-red-100 rounded-xl text-sm font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir Assinatura
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Cadastro Rápido de Cliente com Acesso */}
      <AnimatePresence>
        {isQuickClientModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsQuickClientModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-600">
                <div className="text-white">
                  <h3 className="text-lg font-bold">Novo Cliente & Portal</h3>
                  <p className="text-xs text-indigo-100 opacity-80">Cadastre o cliente e defina o acesso dele ao portal.</p>
                </div>
                <button onClick={() => setIsQuickClientModalOpen(false)} className="p-2 text-white/50 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex border-b border-slate-100 shrink-0">
                <button 
                  type="button"
                  onClick={() => setQuickClientTab('basic')}
                  className={cn(
                    "flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2",
                    quickClientTab === 'basic' ? "text-indigo-600 border-indigo-600" : "text-slate-400 border-transparent hover:text-slate-600"
                  )}
                >
                  <div className="flex items-center justify-center gap-2">
                    <User className="w-3.5 h-3.5" />
                    Básico
                  </div>
                </button>
                <button 
                  type="button"
                  onClick={() => setQuickClientTab('address')}
                  className={cn(
                    "flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2",
                    quickClientTab === 'address' ? "text-indigo-600 border-indigo-600" : "text-slate-400 border-transparent hover:text-slate-600"
                  )}
                >
                  <div className="flex items-center justify-center gap-2">
                    <MapPin className="w-3.5 h-3.5" />
                    Endereço
                  </div>
                </button>
                <button 
                  type="button"
                  onClick={() => setQuickClientTab('extra')}
                  className={cn(
                    "flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2",
                    quickClientTab === 'extra' ? "text-indigo-600 border-indigo-600" : "text-slate-400 border-transparent hover:text-slate-600"
                  )}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Lock className="w-3.5 h-3.5" />
                    Acesso
                  </div>
                </button>
              </div>

              <form onSubmit={handleQuickClientSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                {quickClientTab === 'basic' && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Nome Completo / Razão Social</label>
                      <input 
                        type="text" required
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                        value={quickClientData.name}
                        onChange={(e) => setQuickClientData({ ...quickClientData, name: e.target.value })}
                        placeholder="Nome do cliente"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500">Telefone / WhatsApp</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                          value={quickClientData.phone}
                          onChange={(e) => setQuickClientData({ ...quickClientData, phone: e.target.value })}
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500">CPF / CNPJ</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                          value={quickClientData.document}
                          onChange={(e) => setQuickClientData({ ...quickClientData, document: e.target.value })}
                          placeholder="000.000.000-00"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {quickClientTab === 'address' && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="sm:col-span-1 space-y-1.5">
                        <label className="text-xs font-bold text-slate-500">CEP</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                          value={quickClientData.address_zip}
                          onChange={(e) => setQuickClientData({ ...quickClientData, address_zip: e.target.value })}
                          placeholder="00000-000"
                        />
                      </div>
                      <div className="sm:col-span-3 space-y-1.5">
                        <label className="text-xs font-bold text-slate-500">Rua / Logradouro</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          value={quickClientData.address_street}
                          onChange={(e) => setQuickClientData({ ...quickClientData, address_street: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500">Número</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          value={quickClientData.address_number}
                          onChange={(e) => setQuickClientData({ ...quickClientData, address_number: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500">Complemento</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          value={quickClientData.address_complement}
                          onChange={(e) => setQuickClientData({ ...quickClientData, address_complement: e.target.value })}
                          placeholder="Apto, Sala, Loja..."
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500">Bairro</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          value={quickClientData.address_neighborhood}
                          onChange={(e) => setQuickClientData({ ...quickClientData, address_neighborhood: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500">Cidade</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          value={quickClientData.address_city}
                          onChange={(e) => setQuickClientData({ ...quickClientData, address_city: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500">UF</label>
                        <input 
                          type="text" maxLength={2}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all uppercase"
                          value={quickClientData.address_state}
                          onChange={(e) => setQuickClientData({ ...quickClientData, address_state: e.target.value.toUpperCase() })}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {quickClientTab === 'extra' && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-4">
                      <div className="flex items-center gap-2 text-indigo-700">
                        <Lock className="w-4 h-4" />
                        <h4 className="text-xs font-bold uppercase tracking-widest">Acesso ao Portal</h4>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-indigo-600">Email do Login</label>
                          <input 
                            type="email" required
                            className="w-full px-4 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            value={quickClientData.email}
                            onChange={(e) => setQuickClientData({ ...quickClientData, email: e.target.value })}
                            placeholder="email@cliente.com"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-indigo-600">Senha de Acesso</label>
                          <input 
                            type="password" required
                            className="w-full px-4 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            value={quickClientData.password}
                            onChange={(e) => setQuickClientData({ ...quickClientData, password: e.target.value })}
                            placeholder="Mínimo 6 caracteres"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Pessoa de Contato</label>
                      <input 
                        type="text"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        value={quickClientData.contact_person}
                        onChange={(e) => setQuickClientData({ ...quickClientData, contact_person: e.target.value })}
                      />
                    </div>
                  </motion.div>
                )}

                <div className="pt-4 flex items-center justify-end gap-3 shrink-0">
                  <button 
                    type="button"
                    onClick={() => setIsQuickClientModalOpen(false)}
                    className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center gap-2 transform active:scale-95"
                  >
                    {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Finalizar Cadastro
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {/* Modal de Confirmação de Exclusão de Assinatura */}
        <AnimatePresence>
          {isSubDeleteModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSubDeleteModalOpen(false)}
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl p-8 text-center"
              >
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-100/50">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Excluir Assinatura?</h3>
                <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                  Esta ação é <span className="text-red-600 font-bold uppercase tracking-wider text-[10px]">irreversível</span>. Todos os dados recorrentes e configurações deste plano serão removidos permanentemente.
                </p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={confirmSubDelete}
                    disabled={isSubmitting}
                    className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Confirmar Exclusão
                  </button>
                  <button 
                    onClick={() => setIsSubDeleteModalOpen(false)}
                    className="w-full py-4 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
                  >
                    Mudar de Ideia
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </AnimatePresence>
    </div>
  );
}
