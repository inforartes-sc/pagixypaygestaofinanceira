import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, MoreHorizontal, Mail, Phone, FileText, X, RefreshCw, Trash2, Edit2, AlertCircle, MapPin, Globe, Info, User, Zap, Lock } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { clientService } from '../services/clientService';
import { Client, ClientStatus, Invoice, SupportTicket, ServiceRequest } from '../types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useClients } from '../hooks/useClients';
import { useAuth } from '../contexts/useAuth';
import { translateError } from '../lib/errorTranslator';

export default function Clients() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'all'>('all');
  const { clients, loading, refresh } = useClients(searchTerm, statusFilter);
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'address' | 'extra'>('basic');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedClientHistory, setSelectedClientHistory] = useState<{
    client: Client | null;
    invoices: Invoice[];
    subscriptions: any[];
    tickets: SupportTicket[];
    serviceRequests: any[];
    loading: boolean;
  }>({
    client: null,
    invoices: [],
    subscriptions: [],
    tickets: [],
    serviceRequests: [],
    loading: false
  });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    document: '',
    phone: '',
    status: 'active' as ClientStatus,
    address_zip: '',
    address_street: '',
    address_number: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    contact_person: '',
    website: '',
    notes: '',
    password: ''
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
    setActiveTab('basic');
    setFormData({ 
      name: '', 
      email: '', 
      document: '', 
      phone: '', 
      status: 'active',
      address_zip: '',
      address_street: '',
      address_number: '',
      address_complement: '',
      address_neighborhood: '',
      address_city: '',
      address_state: '',
      contact_person: '',
      website: '',
      notes: '',
      password: ''
    });
  };

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleEditClick = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email,
      document: client.document,
      phone: client.phone || '',
      status: client.status,
      address_zip: client.address_zip || '',
      address_street: client.address_street || '',
      address_number: client.address_number || '',
      address_neighborhood: client.address_neighborhood || '',
      address_city: client.address_city || '',
      address_state: client.address_state || '',
      contact_person: client.contact_person || '',
      website: client.website || '',
      notes: client.notes || '',
      password: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient && formData.password && formData.password.length < 6) {
      toast.error('A senha para o portal deve ter pelo menos 6 caracteres.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingClient) {
        const { password, ...updateData } = formData;
        await clientService.updateClient(editingClient.id, updateData);
        toast.success('Cliente atualizado com sucesso!');
      } else {
        // Se houver senha, criar com Auth (Portal)
        if (formData.password) {
          await clientService.createClientWithAuth({
            ...formData,
            company_id: user?.company_id || undefined
          });
          toast.success('Cliente e acesso ao portal criados!');
        } else {
          const { password, ...createData } = formData;
          await clientService.createClient({
            ...createData,
            company_id: user?.company_id || undefined
          });
          toast.success('Cliente cadastrado com sucesso!');
        }
      }
      closeModal();
      refresh();
    } catch (error: any) {
      console.error('Erro ao processar cliente:', error);
      toast.error(translateError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setClientToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;
    setIsSubmitting(true);
    try {
      await clientService.deleteClient(clientToDelete);
      toast.success('Cliente excluído com sucesso');
      refresh();
      setIsDeleteModalOpen(false);
    } catch (error: any) {
      console.error('Erro ao excluir cliente:', error);
      toast.error(error.message || 'Erro ao excluir cliente (existem faturas ou assinaturas vinculadas)');
    } finally {
      setIsSubmitting(false);
      setClientToDelete(null);
    }
  };

  const handleViewHistory = async (client: Client) => {
    setSelectedClientHistory({
      client,
      invoices: [],
      subscriptions: [],
      tickets: [],
      serviceRequests: [],
      loading: true
    });
    setIsHistoryModalOpen(true);
        try {
      const history = await clientService.getClientHistory(client.id);
      setSelectedClientHistory({
        client,
        invoices: history.invoices,
        subscriptions: history.subscriptions,
        tickets: history.tickets,
        serviceRequests: history.serviceRequests,
        loading: false
      });
    } catch (error) {
      toast.error('Erro ao carregar histórico do cliente');
      setIsHistoryModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="text-slate-500">Gerencie sua base de clientes e histórico de serviços.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Cliente
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por nome, email ou documento..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={refresh}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
              title="Atualizar"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
            <div className="relative">
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-all",
                  statusFilter !== 'all' 
                    ? "bg-indigo-50 text-indigo-600 border-indigo-200" 
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
              >
                <Filter className="w-4 h-4" />
                Filtros
                {statusFilter !== 'all' && (
                  <span className="w-2 h-2 bg-indigo-600 rounded-full" />
                )}
              </button>

              <AnimatePresence>
                {isFilterOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsFilterOpen(false)}
                    />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden"
                    >
                      <div className="p-2">
                        <p className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
                        {[
                          { id: 'all', label: 'Todos' },
                          { id: 'active', label: 'Ativos' },
                          { id: 'inactive', label: 'Inativos' },
                        ].map((option) => (
                          <button
                            key={option.id}
                            onClick={() => {
                              setStatusFilter(option.id as any);
                              setIsFilterOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                              statusFilter === option.id 
                                ? "bg-indigo-50 text-indigo-600 font-bold" 
                                : "text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Documento</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cadastrado em</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && clients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Carregando clientes...</p>
                  </td>
                </tr>
              ) : clients.map((client) => (
                <tr 
                  key={client.id} 
                  className={cn(
                    "hover:bg-slate-50/50 transition-colors group relative",
                    activeMenuId === client.id ? "z-30" : "z-0"
                  )}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                        {client.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">{client.name}</p>
                          {client.open_invoice_status && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/billing?client_id=${client.id}`);
                              }}
                              className={cn(
                                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors",
                                client.open_invoice_status === 'overdue' 
                                  ? "bg-red-50 text-red-600 border-red-100 hover:bg-red-100" 
                                  : "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100"
                              )}
                            >
                              <AlertCircle className="w-3 h-3" />
                              {client.open_invoice_status === 'overdue' ? 'Fatura Atrasada' : 'Fatura em Dia'}
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{client.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {client.document}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      client.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    )}>
                      {client.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatDate(client.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 transition-opacity">
                      <button 
                        onClick={() => handleEditClick(client)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" 
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(client.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === client.id ? null : client.id);
                          }}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        
                        <AnimatePresence>
                          {activeMenuId === client.id && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-20"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button 
                                onClick={() => {
                                  toast.info(`Email para ${client.email}`);
                                  setActiveMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                              >
                                <Mail className="w-4 h-4" />
                                Enviar Email
                              </button>
                              <button 
                                onClick={() => {
                                  handleViewHistory(client);
                                  setActiveMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                              >
                                <FileText className="w-4 h-4" />
                                Ver Histórico
                              </button>
                              <button 
                                onClick={() => {
                                  toast.info(`Ligando para ${client.phone}`);
                                  setActiveMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                              >
                                <Phone className="w-4 h-4" />
                                Ligar
                              </button>
                              <div className="h-px bg-slate-100 my-1" />
                              <button 
                                onClick={() => {
                                  handleDeleteClick(client.id);
                                  setActiveMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                                Excluir Cliente
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && clients.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <p className="text-sm text-slate-500">Nenhum cliente encontrado.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo Cliente */}
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
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">
                  {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                </h3>
                <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex border-b border-slate-100">
                <button 
                  onClick={() => setActiveTab('basic')}
                  className={cn(
                    "flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2",
                    activeTab === 'basic' ? "text-indigo-600 border-indigo-600" : "text-slate-400 border-transparent hover:text-slate-600"
                  )}
                >
                  <div className="flex items-center justify-center gap-2">
                    <User className="w-3.5 h-3.5" />
                    Básico
                  </div>
                </button>
                <button 
                  onClick={() => setActiveTab('address')}
                  className={cn(
                    "flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2",
                    activeTab === 'address' ? "text-indigo-600 border-indigo-600" : "text-slate-400 border-transparent hover:text-slate-600"
                  )}
                >
                  <div className="flex items-center justify-center gap-2">
                    <MapPin className="w-3.5 h-3.5" />
                    Endereço
                  </div>
                </button>
                <button 
                  onClick={() => setActiveTab('extra')}
                  className={cn(
                    "flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2",
                    activeTab === 'extra' ? "text-indigo-600 border-indigo-600" : "text-slate-400 border-transparent hover:text-slate-600"
                  )}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Info className="w-3.5 h-3.5" />
                    Adicional
                  </div>
                </button>
                {!editingClient && (
                  <button 
                    onClick={() => setActiveTab('extra')} // Using activeTab logic below to show password
                    className={cn(
                      "flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2",
                      activeTab === 'extra' ? "text-indigo-600 border-indigo-600" : "text-slate-400 border-transparent hover:text-slate-600"
                    )}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Lock className="w-3.5 h-3.5" />
                      Acesso
                    </div>
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {activeTab === 'basic' && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome / Razão Social</label>
                      <input 
                        type="text" 
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                        <input 
                          type="email" 
                          required
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
                        <select 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as ClientStatus })}
                        >
                          <option value="active">Ativo</option>
                          <option value="inactive">Inativo</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Telefone</label>
                        <input 
                          type="text" 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CPF / CNPJ</label>
                        <input 
                          type="text" 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={formData.document}
                          onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pessoa de Contato</label>
                      <input 
                        type="text" 
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={formData.contact_person}
                        onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                        placeholder="Ex: João Silva"
                      />
                    </div>
                  </motion.div>
                )}

                {activeTab === 'address' && (
                  <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-1 space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CEP</label>
                        <input 
                          type="text" 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={formData.address_zip}
                          onChange={(e) => setFormData({ ...formData, address_zip: e.target.value })}
                        />
                      </div>
                      <div className="sm:col-span-1 space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Número</label>
                        <input 
                          type="text" 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={formData.address_number}
                          onChange={(e) => setFormData({ ...formData, address_number: e.target.value })}
                        />
                      </div>
                      <div className="sm:col-span-1 space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bairro</label>
                        <input 
                          type="text" 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={formData.address_neighborhood}
                          onChange={(e) => setFormData({ ...formData, address_neighborhood: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rua / Logradouro</label>
                      <input 
                        type="text" 
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={formData.address_street}
                        onChange={(e) => setFormData({ ...formData, address_street: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cidade</label>
                        <input 
                          type="text" 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={formData.address_city}
                          onChange={(e) => setFormData({ ...formData, address_city: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estado (UF)</label>
                        <input 
                          type="text" 
                          maxLength={2}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={formData.address_state}
                          onChange={(e) => setFormData({ ...formData, address_state: e.target.value.toUpperCase() })}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'extra' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Website</label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="url" 
                          className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={formData.website}
                          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                          placeholder="https://exemplo.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Observações / Notas</label>
                      <textarea 
                        rows={4}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Informações adicionais sobre o cliente..."
                      />
                    </div>

                    {!editingClient ? (
                      <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-4">
                        <div className="flex items-center gap-2 text-indigo-700">
                          <Lock className="w-4 h-4" />
                          <h4 className="text-xs font-bold uppercase tracking-widest">Acesso ao Portal</h4>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-indigo-600">Email do Login</label>
                            <input 
                              type="email" 
                              className="w-full px-4 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              placeholder="email@cliente.com"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-indigo-600">Senha de Acesso</label>
                            <input 
                              type="password" 
                              className="w-full px-4 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                              value={formData.password}
                              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                              placeholder="Mínimo 6 caracteres"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                        <Lock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-medium text-slate-500">O acesso ao portal já foi configurado.</p>
                        <p className="text-[10px] text-slate-400">Para alterar a senha, utilize o módulo de usuários.</p>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Pessoa de Contato</label>
                      <input 
                        type="text"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        value={formData.contact_person}
                        onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      />
                    </div>
                  </motion.div>
                )}

                <div className="pt-6 flex items-center justify-end gap-3 shrink-0">
                  <button 
                    type="button"
                    onClick={closeModal}
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
                    {editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Histórico do Cliente */}
      <AnimatePresence>
        {isHistoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryModalOpen(false)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Histórico do Cliente</h3>
                  <p className="text-sm text-slate-500">{selectedClientHistory.client?.name}</p>
                </div>
                <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {selectedClientHistory.loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                    <p className="text-sm text-slate-500">Carregando histórico...</p>
                  </div>
                ) : (
                  <>
                    {/* Assinaturas */}
                    <section className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5" />
                        Assinaturas
                      </h4>
                      <div className="space-y-2">
                        {selectedClientHistory.subscriptions.length > 0 ? (
                          selectedClientHistory.subscriptions.map((sub) => (
                            <div key={sub.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-bold text-slate-900">{sub.service_name || 'Serviço Personalizado'}</p>
                                <p className="text-xs text-slate-500">Próxima cobrança: {formatDate(sub.next_billing_date)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-slate-900">{formatCurrency(sub.amount)}</p>
                                <span className={cn(
                                  "text-[10px] font-bold uppercase tracking-wider",
                                  sub.status === 'active' ? 'text-emerald-600' : 'text-slate-500'
                                )}>
                                  {sub.status === 'active' ? 'Ativa' : 'Inativa'}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500 italic">Nenhuma assinatura encontrada.</p>
                        )}
                      </div>
                    </section>

                    {/* Cobranças */}
                    <section className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" />
                        Cobranças Recentes
                      </h4>
                      <div className="space-y-2">
                        {selectedClientHistory.invoices.length > 0 ? (
                          selectedClientHistory.invoices.map((inv) => (
                            <div key={inv.id} className="p-4 bg-white rounded-xl border border-slate-100 flex items-center justify-between hover:border-slate-200 transition-colors">
                              <div>
                                <p className="text-sm font-bold text-slate-900">{inv.service_name || 'Cobrança Avulsa'}</p>
                                <p className="text-xs text-slate-500">Vencimento: {formatDate(inv.due_date)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-slate-900">{formatCurrency(inv.amount)}</p>
                                <span className={cn(
                                  "text-[10px] font-bold uppercase tracking-wider",
                                  inv.status === 'paid' ? 'text-emerald-600' : 
                                  inv.status === 'overdue' ? 'text-red-600' : 'text-amber-600'
                                )}>
                                  {inv.status === 'paid' ? 'Pago' : inv.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500 italic">Nenhuma cobrança encontrada.</p>
                        )}
                      </div>
                    </section>

                    {/* Solicitações de Serviço */}
                    <section className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5" />
                        Solicitações de Serviço
                      </h4>
                      <div className="space-y-2">
                        {selectedClientHistory.serviceRequests.length > 0 ? (
                          selectedClientHistory.serviceRequests.map((req) => (
                            <div key={req.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-bold text-slate-900">{req.service_name || 'Serviço Personalizado'}</p>
                                <p className="text-xs text-slate-500">Solicitado em: {formatDate(req.created_at)}</p>
                              </div>
                              <div className="text-right">
                                <span className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                  req.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 
                                  req.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                                )}>
                                  {req.status === 'approved' ? 'Aprovado' : req.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500 italic">Nenhuma solicitação encontrada.</p>
                        )}
                      </div>
                    </section>

                    {/* Tickets de Suporte */}
                    <section className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Info className="w-3.5 h-3.5" />
                        Tickets de Suporte
                      </h4>
                      <div className="space-y-2">
                        {selectedClientHistory.tickets.length > 0 ? (
                          selectedClientHistory.tickets.map((tkt) => (
                            <div key={tkt.id} className="p-4 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-bold text-slate-900">{tkt.subject}</p>
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                  tkt.status === 'closed' ? 'bg-slate-100 text-slate-600' : 
                                  tkt.status === 'in_progress' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                                )}>
                                  {tkt.status === 'closed' ? 'Fechado' : tkt.status === 'in_progress' ? 'Em Andamento' : 'Aberto'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 line-clamp-2">{tkt.description}</p>
                              <p className="text-[10px] text-slate-400 mt-2">Data: {formatDate(tkt.created_at)}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500 italic">Nenhum ticket encontrado.</p>
                        )}
                      </div>
                    </section>
                  </>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 shrink-0">
                <button 
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="w-full py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação de Exclusão */}
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
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden p-6 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Confirmar Exclusão</h3>
              <p className="text-slate-500 text-sm mb-6">
                Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.
              </p>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete}
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
    </div>
  );
}
