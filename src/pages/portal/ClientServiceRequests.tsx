import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  PlusCircle, 
  Search, 
  Filter, 
  RefreshCw,
  X,
  Plus,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Zap,
  Trash2,
  MessageSquare,
  Send,
  User,
  MoreHorizontal
} from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../../lib/utils';
import { portalService } from '../../services/portalService';
import { serviceService } from '../../services/serviceService';
import { Service, Subscription, ServiceRequest } from '../../types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/useAuth';

export default function ClientServiceRequests() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [services, setServices] = useState<Service[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedService, setSelectedService] = useState<string>('');
  const [customServiceName, setCustomServiceName] = useState<string>('');
  const [myClientId, setMyClientId] = useState<string | null>(null);
  
  // Chat state
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMyClient = async () => {
      if (!user) return;
      try {
        const clients = await portalService.getClientByUserId(user.id);
        if (clients[0]) {
          setMyClientId(clients[0].id);
        }
      } catch (error) {
        console.error('Erro ao buscar ID do cliente:', error);
      }
    };
    fetchMyClient();
  }, [user]);

  const fetchData = useCallback(async () => {
    if (!myClientId) return;
    setLoading(true);
    try {
      const [srvData, subData, reqData] = await Promise.all([
        serviceService.getServices(),
        portalService.getClientSubscriptions(myClientId),
        // Adionar busca de solicitações se existir no portalService
        (portalService as any).getClientServiceRequests ? (portalService as any).getClientServiceRequests(myClientId) : []
      ]);
      setServices(srvData);
      setSubscriptions(subData);
      setRequests(reqData);

      // Auto-select based on URL
      const requestId = searchParams.get('id');
      if (requestId) {
        const req = reqData.find((r: any) => r.id === requestId);
        if (req) {
          setSelectedRequest(req);
          const msgs = await portalService.getRequestMessages(requestId);
          setMessages(msgs);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  }, [myClientId, searchParams]);

  useEffect(() => {
    if (myClientId) {
       fetchData();
    }
  }, [myClientId]);

  const fetchMessages = async (requestId: string) => {
    try {
      const data = await portalService.getRequestMessages(requestId);
      setMessages(data);
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
    }
  };

  const handleOpenRequest = (req: ServiceRequest) => {
    setSelectedRequest(req);
    fetchMessages(req.id);
  };

  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !newMessage.trim() || !user) return;

    setIsSubmitting(true);
    try {
      await portalService.sendRequestMessage(
        selectedRequest.id,
        user.id,
        'client',
        newMessage.trim()
      );
      setNewMessage('');
      fetchMessages(selectedRequest.id);

      // Notificar Admins
      try {
        const admins = await portalService.getAdmins();
        for (const adminId of admins) {
          await portalService.sendNotification(
            adminId,
            'Novo Feedback (Solicitação)',
            `Cliente respondeu sobre: ${(selectedRequest as any).service_name}`,
            'service',
            selectedRequest.id
          );
        }
      } catch (e) {
        console.error('Erro ao notificar admins:', e);
      }
    } catch (error) {
      toast.error('Erro ao enviar resposta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myClientId) {
      toast.error('Erro de identificação do cliente.');
      return;
    }
    if (!selectedService) return;
    
    setIsSubmitting(true);
    try {
      const srvName = selectedService === 'custom' 
        ? customServiceName 
        : services.find(s => s.id === selectedService)?.name || 'Serviço';

      const newReq = await portalService.createServiceRequest({
        client_id: myClientId,
        service_id: selectedService === 'custom' ? undefined : selectedService,
        notes: selectedService === 'custom' ? `SOLICITAÇÃO DE NOVO SERVIÇO: ${customServiceName}` : ''
      });
      toast.success('Solicitação enviada! Acompanhe o status abaixo.');
      setIsModalOpen(false);

      // Notificar Admins
      try {
        const admins = await portalService.getAdmins();
        for (const adminId of admins) {
          await portalService.sendNotification(
            adminId,
            'Nova Solicitação de Serviço',
            `O cliente solicitou: ${srvName}`,
            'service',
            newReq.id
          );
        }
      } catch (e) {
        console.error('Erro ao notificar admins:', e);
      }

      setSelectedService('');
      setCustomServiceName('');
      fetchData();
    } catch (error) {
      toast.error('Erro ao enviar solicitação');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="space-y-12">
      {/* Active Subscriptions */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
               <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Serviços Ativos</h3>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <Plus className="w-4 h-4" />
            Novo Serviço
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between group transition-all hover:bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{sub.service_name}</h4>
                  <p className="text-xs text-slate-500">
                    {formatCurrency(sub.amount)} / {sub.interval === 'monthly' ? 'mês' : sub.interval === 'yearly' ? 'ano' : sub.interval}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button 
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  title="Solicitar Cancelamento"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
          {subscriptions.length === 0 && !loading && (
            <div className="md:col-span-2 p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
              <p className="text-slate-400 text-sm">Você ainda não possui serviços ativos.</p>
            </div>
          )}
        </div>
      </section>

      {/* Pending Requests Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-100">
             <Clock className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Acompanhamento de Solicitações</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {requests.map((req) => (
            <div 
              key={req.id} 
              className={cn(
                "bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:border-indigo-200 relative overflow-hidden flex flex-col",
                selectedRequest?.id === req.id && "ring-2 ring-indigo-500 border-transparent shadow-indigo-100"
              )}
            >
              <div className="flex justify-between items-start mb-4">
                 <span className={cn(
                   "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                   req.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                   req.status === 'in_progress' ? 'bg-indigo-100 text-indigo-700' : 
                   req.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                 )}>
                   {req.status === 'pending' ? 'Pendente' : 
                    req.status === 'in_progress' ? 'Em Análise' : 
                    req.status === 'completed' ? 'Concluído' : 'Cancelado'}
                 </span>
                 <p className="text-[10px] text-slate-400 font-bold">{formatDate(req.created_at)}</p>
              </div>
              <h4 className="font-bold text-slate-900 mb-2 truncate">{(req as any).service_name || 'Serviço Personalizado'}</h4>
              <p className="text-xs text-slate-500 line-clamp-2 italic mb-4">
                {req.notes || 'Sem observações adicionais.'}
              </p>
              
              <button 
                onClick={() => handleOpenRequest(req)}
                className="mt-auto flex items-center justify-center gap-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Ver Feedback
              </button>
            </div>
          ))}
          {requests.length === 0 && !loading && (
            <div className="md:col-span-3 p-12 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
               <p className="text-slate-400 text-sm">Nenhuma solicitação pendente no momento.</p>
            </div>
          )}
        </div>
      </section>

      {/* Available Services */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Catálogo de Serviços</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {services.map((service) => (
            <div key={service.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-all flex flex-col group">
              <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                <PlusCircle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 mb-2">{service.name}</h4>
              <p className="text-sm text-slate-500 mb-6 flex-1">{service.description || 'Solução profissional para sua empresa.'}</p>
              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <p className="text-lg font-bold text-indigo-600">{formatCurrency(service.base_price)}<span className="text-[10px] text-slate-400 font-normal">/mês</span></p>
                <button 
                   className="p-2 text-indigo-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-xl transition-all"
                   onClick={() => {
                     setSelectedService(service.id);
                     setIsModalOpen(true);
                   }}
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Chat Feedback Modal */}
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
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-100">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{(selectedRequest as any).service_name || 'Solicitação'}</h4>
                    <p className="text-xs text-slate-500">Acompanhamento de Feedback</p>
                  </div>
                </div>
                <button onClick={() => setSelectedRequest(null)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/30">
                {/* User Original Request */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="space-y-1 max-w-[85%]">
                    <div className="p-4 bg-white rounded-2xl rounded-tl-none border border-slate-200">
                      <p className="text-sm text-slate-600 italic">
                        {selectedRequest.notes || 'Solicitação enviada sem observações.'}
                      </p>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold px-1 uppercase tracking-widest">{formatDate(selectedRequest.created_at)} • MEU PEDIDO</p>
                  </div>
                </div>

                {/* Messages */}
                {messages.map((msg) => (
                  <div key={msg.id} className={cn(
                    "flex gap-3",
                    msg.sender_role === 'client' ? "" : "flex-row-reverse"
                  )}>
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                      msg.sender_role === 'client' ? "bg-slate-200 text-slate-500" : "bg-indigo-600 text-white"
                    )}>
                      {msg.sender_role === 'client' ? <User className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                    </div>
                    <div className={cn(
                      "space-y-1 max-w-[85%]",
                      msg.sender_role === 'client' ? "" : "items-end"
                    )}>
                      <div className={cn(
                        "p-4 rounded-2xl shadow-sm leading-relaxed",
                        msg.sender_role === 'client' ? "bg-white text-slate-700 rounded-tl-none border border-slate-200" : "bg-indigo-600 text-white rounded-tr-none"
                      )}>
                        <p className="text-sm">{msg.content}</p>
                      </div>
                      <p className={cn(
                        "text-[10px] text-slate-400 px-1 font-bold",
                        msg.sender_role === 'client' ? "" : "text-right"
                      )}>
                         {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {msg.sender_role === 'admin' ? 'PAGIXYPAY' : 'EU'}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-6 bg-white border-t border-slate-100">
                <form onSubmit={handleSendResponse} className="flex gap-2">
                   <input 
                    type="text" 
                    placeholder={selectedRequest.status === 'completed' || selectedRequest.status === 'cancelled' 
                      ? "Esta solicitação foi finalizada." 
                      : "Deseja enviar mais informações?"}
                    disabled={selectedRequest.status === 'completed' || selectedRequest.status === 'cancelled' || isSubmitting}
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50 disabled:bg-slate-100"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <button 
                     type="submit"
                     disabled={isSubmitting || !newMessage.trim() || selectedRequest.status === 'completed' || selectedRequest.status === 'cancelled'}
                     className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
                {(selectedRequest.status === 'completed' || selectedRequest.status === 'cancelled') && (
                  <p className="text-[10px] text-slate-400 italic mt-2 text-center">
                    Esta solicitação foi {selectedRequest.status === 'completed' ? 'finalizada' : 'cancelada'} e não aceita novas mensagens.
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Nova Solicitação */}
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
              className="relative w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Solicitar Novo Serviço</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRequestService} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Serviço Desejado</label>
                    <select 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={selectedService}
                      onChange={(e) => setSelectedService(e.target.value)}
                    >
                      <option value="">Selecione um serviço</option>
                      {services.map(service => (
                        <option key={service.id} value={service.id}>{service.name} - {formatCurrency(service.base_price)}</option>
                      ))}
                      <option value="custom">Outro (Sugerir novo serviço)</option>
                    </select>
                  </div>

                  {selectedService === 'custom' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-1.5"
                    >
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Qual serviço você deseja?</label>
                      <input 
                        required
                        type="text"
                        placeholder="Ex: Consultoria em Marketing, Criação de Site..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={customServiceName}
                        onChange={(e) => setCustomServiceName(e.target.value)}
                      />
                    </motion.div>
                  )}

                <div className="p-4 bg-indigo-50 rounded-2xl flex gap-3">
                  <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0" />
                  <p className="text-xs text-indigo-700 leading-relaxed">
                    Ao solicitar um novo serviço, nossa equipe fará uma análise técnica e entrará em contato para confirmar os detalhes e prazos de ativação.
                  </p>
                </div>

                <div className="pt-6 flex items-center justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting || !selectedService}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Confirmar Solicitação
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
