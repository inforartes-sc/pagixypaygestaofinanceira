import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CreditCard, 
  LifeBuoy, 
  PlusCircle, 
  LogOut, 
  Bell, 
  User as UserIcon,
  Menu,
  X,
  ShieldCheck,
  Settings,
  Check,
  Clock,
  Zap
} from 'lucide-react';
import { cn, formatDate } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Client } from '../../types';
import { useAuth } from '../../contexts/useAuth';
import { portalService } from '../../services/portalService';

export default function ClientPortalLayout() {
  const { user, signOut, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [client, setClient] = useState<Client | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const data = await portalService.getNotifications(user.id);
      setNotifications(data);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (user && user.role === 'client') {
      portalService.getClientByUserId(user.id).then(clients => {
        if (clients[0]) setClient(clients[0]);
      });
    }
  }, [user]);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Início', path: '/portal' },
    { icon: CreditCard, label: 'Minhas Faturas', path: '/portal/billing' },
    { icon: PlusCircle, label: 'Solicitar Serviços', path: '/portal/services' },
    { icon: LifeBuoy, label: 'Suporte', path: '/portal/support' },
    { icon: Settings, label: 'Configurações', path: '/portal/settings' },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await portalService.markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    setIsNotificationsOpen(false);
    if (!notif.read) {
      await handleMarkAsRead(notif.id);
    }
    
    // Portal Deep Linking
    if (notif.type === 'ticket') {
      navigate(`/portal/support?id=${notif.reference_id}`);
    } else if (notif.type === 'service') {
      navigate(`/portal/services?id=${notif.reference_id}`);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-200 sticky top-0 h-screen">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Portal PagixyPay</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gestão de Cobrança</p>
            </div>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  location.pathname === item.path
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-6 p-3 bg-slate-50 rounded-2xl">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 font-bold text-indigo-600 text-xs shadow-sm">
              {(client?.name || user?.email || 'C')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{client?.name || user?.email?.split('@')[0] || 'Cliente'}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email || 'cliente@empresa.com'}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sair do Portal
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:p-8 pt-20 lg:pt-8 p-4 overflow-x-hidden">
        <div className="max-w-6xl mx-auto">
          {/* Internal Header with Greetings and NOTIFICATIONS */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Bem-vindo, {client?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Cliente'}!</h2>
              <p className="text-slate-500">Acompanhe suas faturas e serviços contratados.</p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Notifications Center */}
              <div className="relative">
                <button 
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className={cn(
                    "p-2.5 rounded-xl transition-all relative border bg-white",
                    isNotificationsOpen ? "text-indigo-600 border-indigo-100 shadow-sm" : "text-slate-400 hover:text-slate-600 border-slate-200"
                  )}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] font-bold rounded-full border-2 border-white flex items-center justify-center animate-in zoom-in duration-300">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {isNotificationsOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setIsNotificationsOpen(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 z-40 overflow-hidden"
                      >
                        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                          <h4 className="font-bold text-slate-900 text-[10px] uppercase tracking-widest">Novos Avisos</h4>
                          {unreadCount > 0 && (
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">
                              {unreadCount} Pendentes
                            </span>
                          )}
                        </div>
                        <div className="max-h-[350px] overflow-y-auto custom-scrollbar bg-white">
                          {notifications.length === 0 ? (
                            <div className="p-10 text-center">
                              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Sem mensagens críticas</p>
                            </div>
                          ) : notifications.map((notif) => (
                            <div 
                              key={notif.id}
                              onClick={() => handleNotificationClick(notif)}
                              className={cn(
                                "p-4 border-b border-slate-50 transition-colors flex gap-3 group relative cursor-pointer",
                                notif.read ? "opacity-60 grayscale-[0.5]" : "bg-white hover:bg-slate-50"
                              )}
                            >
                              <div className={cn(
                                "w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105",
                                notif.type === 'ticket' ? "bg-amber-50 text-amber-600" : 
                                notif.type === 'service' ? "bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-500"
                              )}>
                                {notif.type === 'ticket' ? <LifeBuoy className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-xs font-bold text-slate-900 truncate mb-0.5">{notif.title}</p>
                                 <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">{notif.message}</p>
                                 <p className="text-[9px] text-slate-400 mt-1 font-bold italic">{formatDate(notif.created_at)}</p>
                              </div>
                              {!notif.read && (
                                <button 
                                  onClick={(e) => handleMarkAsRead(notif.id, e)}
                                  className="opacity-0 group-hover:opacity-100 p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all absolute right-2 top-2"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <Link 
                          to="/portal/settings?tab=notificacoes"
                          onClick={() => setIsNotificationsOpen(false)}
                          className="p-4 text-center block text-[10px] font-bold text-indigo-600 hover:bg-slate-50 border-t border-slate-100 uppercase tracking-widest"
                        >
                          Configurações do Portal
                        </Link>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <div className="h-10 w-px bg-slate-200 mx-2 hidden md:block"></div>
              
              <div className="hidden md:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{client?.name || 'Empresa'}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CNPJ: {client?.document || '00.000.000/0000-00'}</p>
                </div>
              </div>
            </div>
          </header>

          <Outlet />
        </div>
      </main>

      {/* Mobile Nav Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-900 text-sm">Portal PagixyPay</span>
        </div>
        <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" 
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 w-72 bg-white shadow-2xl flex flex-col"
            >
              <div className="p-6 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-indigo-600" />
                  <span className="font-bold text-slate-900">Portal</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              <nav className="flex-1 px-4 py-6 space-y-1">
                {menuItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl text-sm font-bold transition-all",
                      location.pathname === item.path ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <item.icon className={cn("w-6 h-6", location.pathname === item.path ? "text-white" : "text-slate-400")} />
                    {item.label}
                  </Link>
                ))}
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-4 p-4 w-full rounded-2xl text-sm font-bold text-red-500 hover:bg-red-50 mt-8"
                >
                  <LogOut className="w-6 h-6" />
                  Sair do Portal
                </button>
              </nav>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
