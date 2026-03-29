import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  PlusCircle, 
  Search, 
  Filter, 
  RefreshCw,
  Plus,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Zap,
  Trash2,
  Package,
  User,
  MoreHorizontal,
  X,
  FileText,
  Mail,
  Smartphone,
  Send,
  MessageSquare
} from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { adminPortalService } from '../services/adminPortalService';
import { ServiceRequest } from '../types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/useAuth';

export default function AdminServiceRequests() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ServiceRequest['status'] | 'all'>('all');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminPortalService.getAllServiceRequests(user?.company_id);
      setRequests(data);

      // Auto-select based on URL
      const requestId = searchParams.get('id');
      if (requestId) {
        const req = data.find(r => r.id === requestId);
        if (req) {
          setSelectedRequest(req);
          const msgs = await adminPortalService.getRequestMessages(requestId);
          setMessages(msgs);
        }
      }
    } catch (error) {
      toast.error('Erro ao carregar solicitações');
    } finally {
      setLoading(false);
    }
  }, [user?.company_id, searchParams]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const fetchMessages = async (requestId: string) => {
    try {
      const data = await adminPortalService.getRequestMessages(requestId);
      setMessages(data);
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
    }
  };

  const handleOpenRequest = (req: ServiceRequest) => {
    setSelectedRequest(req);
    fetchMessages(req.id);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !newMessage.trim() || !user) return;

    setIsSubmitting(true);
    try {
      await adminPortalService.sendRequestMessage(
        selectedRequest.id,
        user.id,
        'admin',
        newMessage.trim()
      );
      setNewMessage('');
      fetchMessages(selectedRequest.id);
      
      // Notificar Cliente
      try {
        const clientUserId = await adminPortalService.getClientUserId(selectedRequest.client_id);
        if (clientUserId) {
          await adminPortalService.sendNotification(
            clientUserId,
            'Feedback de Solicitação',
            `Novidades sobre: ${(selectedRequest as any).service_name}`,
            'service',
            selectedRequest.id
          );
        }
      } catch (e) {
        console.error('Erro ao notificar cliente:', e);
      }

      // Feedback imediato
      if (selectedRequest.status === 'pending') {
        await handleUpdateStatus(selectedRequest.id, 'in_progress');
      }
    } catch (error: any) {
      toast.error('Erro ao enviar mensagem: ' + (error.message || 'Error desconhecido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: ServiceRequest['status']) => {
    setIsSubmitting(true);
    try {
      await adminPortalService.updateServiceRequestStatus(id, newStatus);
      if (selectedRequest?.id === id) {
        setSelectedRequest({ ...selectedRequest, status: newStatus });
      }
      fetchRequests();
      toast.success('Status atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredRequests = requests.filter(r => {
    const matchesSearch = 
      (r as any).service_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (r as any).client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusLabel = (status: string) => {
    const labels: any = {
      pending: 'Pendente',
      in_progress: 'Em Análise',
      completed: 'Concluído',
      cancelled: 'Cancelado'
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Solicitações de Serviço</h1>
          <p className="text-slate-500">Acompanhe novos pedidos e forneça feedback aos seus clientes.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 justify-between bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por serviço ou cliente..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <select 
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">TODOS OS STATUS</option>
              <option value="pending">PENDENTES</option>
              <option value="in_progress">EM ANÁLISE</option>
              <option value="completed">CONCLUÍDOS</option>
            </select>
            <button 
              onClick={fetchRequests}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Tipo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Serviço / Detalhes</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Carregando solicitações...</p>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-30" />
                    <p className="text-sm text-slate-500 font-medium">Nenhuma solicitação encontrada.</p>
                  </td>
                </tr>
              ) : filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => handleOpenRequest(req)}>
                  <td className="px-6 py-4 text-center">
                    {req.service_id ? (
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                        <Zap className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                        <PlusCircle className="w-4 h-4" />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{(req as any).service_name}</p>
                      {req.notes && (
                        <p className="text-xs text-slate-500 italic mt-0.5 max-w-xs truncate">{req.notes}</p>
                      )}
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{formatDate(req.created_at)}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <p className="text-sm font-bold text-slate-700">{(req as any).client_name}</p>
                      <p className="text-xs text-slate-400">{(req as any).client_email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      req.status === 'pending' ? 'bg-amber-50 text-amber-700' : 
                      req.status === 'in_progress' ? 'bg-indigo-50 text-indigo-700' : 
                      req.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'
                    )}>
                      {getStatusLabel(req.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleOpenRequest(req); }}
                      className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-bold hover:bg-slate-800 transition-all shadow-sm flex items-center gap-1 ml-auto"
                    >
                      <MessageSquare className="w-3 h-3" /> Responder
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRequest(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Solicitação: {(selectedRequest as any).service_name}</h3>
                    <p className="text-xs text-slate-500">Cliente: {(selectedRequest as any).client_name}</p>
                  </div>
                </div>
                <button 
                   onClick={() => setSelectedRequest(null)}
                   className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Notas do Cliente */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Descrição do Cliente
                  </p>
                  <p className="text-sm text-slate-700 italic">
                    {selectedRequest.notes || 'Nenhuma nota enviada.'}
                  </p>
                </div>

                {/* Mensagens de Feedback */}
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center py-2 border-y border-slate-100">
                    Histórico de Feedback
                  </p>
                  
                  {messages.map((msg) => (
                    <div key={msg.id} className={cn(
                      "flex gap-3",
                      msg.sender_role === 'admin' ? "flex-row-reverse" : ""
                    )}>
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        msg.sender_role === 'admin' ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"
                      )}>
                        {msg.sender_role === 'admin' ? <MessageSquare className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>
                      <div className={cn(
                        "space-y-1 max-w-[85%]",
                        msg.sender_role === 'admin' ? "items-end" : ""
                      )}>
                        <div className={cn(
                          "p-3 rounded-2xl shadow-sm",
                          msg.sender_role === 'admin' ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white text-slate-700 rounded-tl-none border border-slate-200"
                        )}>
                          <p className="text-sm">{msg.content}</p>
                        </div>
                        <p className="text-[10px] text-slate-400 px-1">
                          {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 shrink-0 space-y-4">
                {/* Status Quick Actions */}
                <div className="flex flex-wrap gap-2">
                   {selectedRequest.status !== 'completed' && (
                     <button 
                       onClick={() => handleUpdateStatus(selectedRequest.id, 'completed')}
                       className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                     >
                       <CheckCircle className="w-4 h-4" /> Finalizar Solicitação
                     </button>
                   )}
                   {selectedRequest.status === 'pending' && (
                     <button 
                       onClick={() => handleUpdateStatus(selectedRequest.id, 'in_progress')}
                       className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
                     >
                       Marcar em Análise
                     </button>
                   )}
                </div>

                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder={selectedRequest.status === 'completed' || selectedRequest.status === 'cancelled' 
                      ? "Esta solicitação foi finalizada." 
                      : "Enviar mensagem de feedback para o cliente..."}
                    disabled={selectedRequest.status === 'completed' || selectedRequest.status === 'cancelled' || isSubmitting}
                    className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50 disabled:bg-slate-100"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <button 
                    type="submit"
                    disabled={isSubmitting || !newMessage.trim() || selectedRequest.status === 'completed' || selectedRequest.status === 'cancelled'}
                    className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
                {(selectedRequest.status === 'completed' || selectedRequest.status === 'cancelled') && (
                  <p className="text-[10px] text-slate-400 italic mt-2 text-center">
                    Esta solicitação está com status de {selectedRequest.status === 'completed' ? 'Concluída' : 'Cancelada'}. Abra uma nova se precisar.
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
