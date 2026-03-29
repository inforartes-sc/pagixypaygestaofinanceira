import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  LifeBuoy, 
  Search, 
  Filter, 
  RefreshCw,
  Clock,
  CheckCircle,
  MessageSquare,
  ArrowRight,
  MoreHorizontal,
  Mail,
  User,
  AlertCircle,
  X,
  Send
} from 'lucide-react';
import { formatDate, cn } from '../lib/utils';
import { adminPortalService } from '../services/adminPortalService';
import { SupportTicket, SupportMessage } from '../types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/useAuth';

export default function AdminSupport() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SupportTicket['status'] | 'all'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminPortalService.getAllSupportTickets(user?.company_id);
      setTickets(data);
      
      // Auto-select based on URL
      const ticketId = searchParams.get('id');
      if (ticketId) {
        const ticket = data.find(t => t.id === ticketId);
        if (ticket) {
          setSelectedTicket(ticket);
          const msgs = await adminPortalService.getTicketMessages(ticketId);
          setMessages(msgs);
        }
      }
    } catch (error) {
      toast.error('Erro ao carregar chamados');
    } finally {
      setLoading(false);
    }
  }, [user?.company_id, searchParams]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const fetchMessages = async (ticketId: string) => {
    try {
      const data = await adminPortalService.getTicketMessages(ticketId);
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
      await adminPortalService.sendTicketMessage(
        selectedTicket.id,
        user.id,
        'admin',
        newMessage.trim()
      );
      setNewMessage('');
      fetchMessages(selectedTicket.id);

      // Notificar Cliente
      try {
        const clientUserId = await adminPortalService.getClientUserId(selectedTicket.client_id);
        if (clientUserId) {
          await adminPortalService.sendNotification(
            clientUserId,
            'Resposta no Chamado',
            `Nova mensagem em: ${selectedTicket.subject}`,
            'ticket',
            selectedTicket.id
          );
        }
      } catch (e) {
        console.error('Erro ao notificar cliente:', e);
      }
      
      // Se o chamado estava aberto, muda para em atendimento
      if (selectedTicket.status === 'open') {
        await handleUpdateStatus(selectedTicket.id, 'in_progress');
      }
    } catch (error: any) {
      toast.error('Erro ao enviar mensagem: ' + (error.message || 'Error desconhecido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: SupportTicket['status']) => {
    try {
      await adminPortalService.updateTicketStatus(id, newStatus);
      if (selectedTicket?.id === id) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
      fetchTickets();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = 
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (t as any).client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t as any).client_email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusLabel = (status: string) => {
    const labels: any = {
      open: 'Pendente',
      in_progress: 'Em Atendimento',
      resolved: 'Resolvido',
      closed: 'Fechado'
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const labels: any = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta'
    };
    return labels[priority] || priority;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 line-clamp-1">Atendimento ao Cliente</h1>
          <p className="text-slate-500">Gerencie e responda aos tickets de suporte dos seus usuários.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col md:flex-row">
        {/* Ticket List Side */}
        <div className={cn(
          "flex-1 flex flex-col border-r border-slate-200",
          selectedTicket ? "hidden md:flex" : "flex"
        )}>
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar ticket..." 
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <select 
                className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="all">TODOS</option>
                <option value="open">PENDENTES</option>
                <option value="in_progress">ATENDIMENTO</option>
                <option value="resolved">RESOLVIDOS</option>
              </select>
              <button 
                onClick={fetchTickets}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[600px]">
            {filteredTickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => handleOpenTicket(ticket)}
                className={cn(
                  "w-full p-4 text-left border-b border-slate-100 transition-all hover:bg-slate-50",
                  selectedTicket?.id === ticket.id ? "bg-indigo-50 border-l-4 border-l-indigo-600" : ""
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                    ticket.priority === 'high' ? 'bg-red-100 text-red-700' : 
                    ticket.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                  )}>
                    {getPriorityLabel(ticket.priority)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {formatDate(ticket.created_at)}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm line-clamp-1 mb-1">{ticket.subject}</h4>
                <p className="text-xs text-slate-500 line-clamp-1 mb-2">{(ticket as any).client_name}</p>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold",
                  ticket.status === 'open' ? 'bg-amber-100 text-amber-700' : 
                  ticket.status === 'in_progress' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                )}>
                  {getStatusLabel(ticket.status)}
                </span>
              </button>
            ))}
            {filteredTickets.length === 0 && !loading && (
              <div className="p-8 text-center text-slate-400">
                <LifeBuoy className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nenhum chamado encontrado</p>
              </div>
            )}
          </div>
        </div>

        {/* Details / Chat Side */}
        <div className={cn(
          "flex-[2] flex flex-col bg-slate-50/30",
          !selectedTicket ? "hidden md:flex items-center justify-center" : "flex"
        )}>
          {selectedTicket ? (
            <>
              {/* Header */}
              <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setSelectedTicket(null)}
                    className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">
                    {(selectedTicket as any).client_name?.[0] || 'C'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{selectedTicket.subject}</h3>
                    <p className="text-xs text-slate-500">{(selectedTicket as any).client_name} • {(selectedTicket as any).client_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedTicket.status !== 'resolved' && (
                    <button 
                      onClick={() => handleUpdateStatus(selectedTicket.id, 'resolved')}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm"
                    >
                      Finalizar
                    </button>
                  )}
                  <div className="relative group">
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                {/* Initial Description */}
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="space-y-1 max-w-[85%]">
                    <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedTicket.description}</p>
                    </div>
                    <p className="text-[10px] text-slate-400 px-1">{formatDate(selectedTicket.created_at)} • Mensagem inicial</p>
                  </div>
                </div>

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
                        "p-4 rounded-2xl shadow-sm",
                        msg.sender_role === 'admin' ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white text-slate-700 rounded-tl-none border border-slate-200"
                      )}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <p className={cn(
                        "text-[10px] text-slate-400 px-1",
                        msg.sender_role === 'admin' ? "text-right" : ""
                      )}>
                        {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white border-t border-slate-200">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder={selectedTicket.status === 'resolved' || selectedTicket.status === 'closed' 
                      ? "Este chamado está finalizado." 
                      : "Digite sua resposta para o cliente..."}
                    disabled={selectedTicket.status === 'resolved' || selectedTicket.status === 'closed' || isSubmitting}
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50 disabled:bg-slate-100"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <button 
                    type="submit"
                    disabled={isSubmitting || !newMessage.trim() || selectedTicket.status === 'resolved' || selectedTicket.status === 'closed'}
                    className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
                {(selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') && (
                  <p className="text-[10px] text-slate-400 italic mt-2 text-center">
                    Este chamado está {selectedTicket.status === 'resolved' ? 'Resolvido' : 'Fechado'}.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center opacity-30 select-none">
              <MessageSquare className="w-16 h-16 mb-4 text-slate-300" />
              <p className="font-bold text-slate-400">Selecione um chamado para visualizar</p>
              <p className="text-xs text-slate-400">Responda seus clientes em tempo real</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
