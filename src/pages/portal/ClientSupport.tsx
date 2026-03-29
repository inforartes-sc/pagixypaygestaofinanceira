import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  LifeBuoy, 
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
  MessageSquare,
  Send,
  User
} from 'lucide-react';
import { formatDate, cn } from '../../lib/utils';
import { portalService } from '../../services/portalService';
import { SupportTicket, SupportMessage } from '../../types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/useAuth';

export default function ClientSupport() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myClientId, setMyClientId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Form state
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });

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

  const fetchTickets = useCallback(async () => {
    if (!myClientId) return;
    setLoading(true);
    try {
      const data = await portalService.getSupportTickets(myClientId);
      setTickets(data);

      // Auto-select based on URL
      const ticketId = searchParams.get('id');
      if (ticketId) {
        const ticket = data.find(t => t.id === ticketId);
        if (ticket) {
          setSelectedTicket(ticket);
          const msgs = await portalService.getTicketMessages(ticketId);
          setMessages(msgs);
        }
      }
    } catch (error) {
      toast.error('Erro ao buscar seus chamados');
    } finally {
      setLoading(false);
    }
  }, [myClientId, searchParams]);

  useEffect(() => {
    if (myClientId) {
      fetchTickets();
    }
  }, [myClientId]);

  const fetchMessages = async (ticketId: string) => {
    try {
      const data = await portalService.getTicketMessages(ticketId);
      setMessages(data);
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
    }
  };

  const handleOpenTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    fetchMessages(ticket.id);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newMessage.trim() || !user) return;

    setIsSubmitting(true);
    try {
      await portalService.sendTicketMessage(
        selectedTicket.id,
        user.id,
        'client',
        newMessage.trim()
      );
      setNewMessage('');
      fetchMessages(selectedTicket.id);

      // Notificar Admins
      try {
        const admins = await portalService.getAdmins();
        for (const adminId of admins) {
          await portalService.sendNotification(
            adminId,
            'Nova Mensagem (Suporte)',
            `Cliente respondeu no chamado: ${selectedTicket.subject}`,
            'ticket',
            selectedTicket.id
          );
        }
      } catch (e) {
        console.error('Erro ao notificar admins:', e);
      }
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myClientId) return;

    setIsSubmitting(true);
    try {
      const newTicket = await portalService.createSupportTicket({
        client_id: myClientId,
        subject: ticketForm.subject,
        description: ticketForm.description,
        priority: ticketForm.priority
      });
      toast.success('Chamado aberto com sucesso!');
      setIsModalOpen(false);
      
      // Notificar Admins
      try {
        const admins = await portalService.getAdmins();
        for (const adminId of admins) {
          await portalService.sendNotification(
            adminId,
            'Novo Chamado Aberto',
            `Assunto: ${ticketForm.subject}`,
            'ticket',
            newTicket.id
          );
        }
      } catch (e) {
        console.error('Erro ao notificar admins:', e);
      }

      setTicketForm({ subject: '', description: '', priority: 'medium' });
      fetchTickets();
    } catch (error) {
      toast.error('Erro ao abrir chamado');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Central de Suporte</h3>
          <p className="text-sm text-slate-500">Acompanhe seus chamados e tire suas dúvidas.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
        >
          <Plus className="w-4 h-4" />
          Abrir Chamado
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-fit">
            <h4 className="font-bold text-slate-900 mb-4">Meus Chamados</h4>
            <div className="space-y-3 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => handleOpenTicket(ticket)}
                  className={cn(
                    "w-full p-4 rounded-2xl text-left border border-slate-100 transition-all hover:border-indigo-100 group",
                    selectedTicket?.id === ticket.id ? "bg-indigo-50 border-indigo-200" : "bg-white hover:bg-slate-50"
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider",
                      ticket.priority === 'high' ? 'bg-red-50 text-red-600 border border-red-100' : 
                      ticket.priority === 'medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-50 text-slate-500 border border-slate-100'
                    )}>
                      {ticket.priority === 'high' ? 'Alta' : 
                       ticket.priority === 'medium' ? 'Média' : 'Baixa'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">{formatDate(ticket.created_at)}</span>
                  </div>
                  <h5 className="text-sm font-bold text-slate-900 mb-1 truncate">{ticket.subject}</h5>
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-[10px] font-bold",
                      ticket.status === 'open' ? 'text-amber-600' : 
                      ticket.status === 'in_progress' ? 'text-indigo-600' : 
                      ticket.status === 'resolved' ? 'text-emerald-600' : 'text-slate-500'
                    )}>
                      {ticket.status === 'open' ? 'PENDENTE' : 
                       ticket.status === 'in_progress' ? 'EM ATENDIMENTO' : 
                       ticket.status === 'resolved' ? 'RESOLVIDO' : 'FECHADO'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
                  </div>
                </button>
              ))}
              {tickets.length === 0 && !loading && (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-500 text-xs italic">Nenhum chamado aberto.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat / View Side */}
        <div className="md:col-span-2 space-y-4">
          {selectedTicket ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[600px] overflow-hidden">
               {/* Modal Header */}
               <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-100">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{selectedTicket.subject}</h4>
                    <p className="text-xs text-slate-500">ID: {selectedTicket.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                    selectedTicket.status === 'open' ? 'bg-amber-50 text-amber-700' : 
                    selectedTicket.status === 'in_progress' ? 'bg-indigo-50 text-indigo-700' : 
                    selectedTicket.status === 'resolved' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'
                  )}>
                    {selectedTicket.status === 'open' ? 'Pendente' : 
                     selectedTicket.status === 'in_progress' ? 'Em Atendimento' : 
                     selectedTicket.status === 'resolved' ? 'Resolvido' : 'Fechado'}
                  </span>
                </div>
              </div>

              {/* Chat Content */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/30">
                {/* Initial Ticket */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="space-y-1 max-w-[85%]">
                    <div className="p-4 bg-white rounded-2xl rounded-tl-none border border-slate-200 shadow-sm">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedTicket.description}</p>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold px-1 uppercase tracking-widest">{formatDate(selectedTicket.created_at)} • Mensagem Original</p>
                  </div>
                </div>

                {messages.map((msg) => (
                  <div key={msg.id} className={cn(
                    "flex gap-3",
                    msg.sender_role === 'client' ? "" : "flex-row-reverse"
                  )}>
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                      msg.sender_role === 'client' ? "bg-slate-200 text-slate-500" : "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                    )}>
                      {msg.sender_role === 'client' ? <User className="w-4 h-4" /> : <LifeBuoy className="w-4 h-4" />}
                    </div>
                    <div className={cn(
                      "space-y-1 max-w-[85%]",
                      msg.sender_role === 'client' ? "" : "items-end"
                    )}>
                       <div className={cn(
                         "p-4 rounded-2xl shadow-sm",
                         msg.sender_role === 'client' ? "bg-white text-slate-700 rounded-tl-none border border-slate-200" : "bg-indigo-600 text-white rounded-tr-none shadow-indigo-50"
                       )}>
                         <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                       </div>
                       <p className={cn(
                         "text-[10px] text-slate-400 px-1 font-bold tracking-tight",
                         msg.sender_role === 'client' ? "" : "text-right"
                       )}>
                         {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {msg.sender_role === 'admin' ? 'SUPORTE' : 'EU'}
                       </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-6 bg-white border-t border-slate-100">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder={selectedTicket.status === 'closed' || selectedTicket.status === 'resolved' 
                      ? "Este chamado está finalizado."
                      : "Digite sua mensagem de resposta..."}
                    disabled={selectedTicket.status === 'closed' || selectedTicket.status === 'resolved' || isSubmitting}
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50 disabled:bg-slate-100"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <button 
                    type="submit"
                    disabled={isSubmitting || !newMessage.trim() || selectedTicket.status === 'closed' || selectedTicket.status === 'resolved'}
                    className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
                { (selectedTicket.status === 'closed' || selectedTicket.status === 'resolved') && (
                  <p className="text-[10px] text-slate-400 italic mt-2 text-center">Este chamado foi encerrado e não recebe novas respostas.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm h-full flex flex-col items-center justify-center text-center opacity-40 select-none">
              <MessageSquare className="w-20 h-20 text-slate-300 mb-6" />
              <h4 className="text-lg font-bold text-slate-900 mb-1">Selecione um chamado</h4>
              <p className="text-sm text-slate-500 max-w-xs uppercase font-bold tracking-widest text-[9px]">Acompanhe as respostas de nossa equipe técnica.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Novo Chamado */}
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
                <h3 className="text-lg font-bold text-slate-900">Abrir Novo Chamado</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitTicket} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assunto</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Ex: Dúvida sobre faturas"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={ticketForm.subject}
                    onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prioridade</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={ticketForm.priority}
                    onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value as any })}
                  >
                    <option value="low">Baixa - Dúvidas gerais</option>
                    <option value="medium">Média - Erros operacionais</option>
                    <option value="high">Alta - Problemas críticos / Faturamento</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição do Problema</label>
                  <textarea 
                    required
                    rows={4}
                    placeholder="Descreva detalhadamente como podemos te ajudar..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    value={ticketForm.description}
                    onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Criar Chamado
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
