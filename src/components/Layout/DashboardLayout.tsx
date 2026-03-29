import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard,
  Users,
  CreditCard,
  Settings,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  Package,
  LifeBuoy,
  Zap,
  Check,
  Clock
} from 'lucide-react';
import { cn, formatDate } from '../../lib/utils';
import { useAuth } from '../../contexts/useAuth';
import { portalService } from '../../services/portalService';
import { motion, AnimatePresence } from 'motion/react';

const navigation = [
  { name: 'Painel Geral', href: '/', icon: LayoutDashboard },
  { name: 'Clientes', href: '/clients', icon: Users },
  { name: 'Serviços', href: '/services', icon: Package },
  { name: 'Atendimento', href: '/support', icon: LifeBuoy },
  { name: 'Solicitações', href: '/requests', icon: Zap },
  { name: 'Cobranças', href: '/billing', icon: CreditCard },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const { user, signOut, profile } = useAuth();

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

  const unreadCount = notifications.filter(n => !n.read).length;

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
    
    // Deep Linking based on type
    if (notif.type === 'ticket') {
      navigate(`/support?id=${notif.reference_id}`);
    } else if (notif.type === 'service') {
      navigate(`/requests?id=${notif.reference_id}`);
    }
  };
   

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200">
        <div className="p-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <CreditCard className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">PagixyPay</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-indigo-50 text-indigo-700" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-indigo-600" : "text-slate-400")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden p-2 text-slate-600"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar..." 
                className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-500 w-64 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={cn(
                  "p-2 rounded-xl transition-all relative",
                  isNotificationsOpen ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full border-2 border-white flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-30" 
                      onClick={() => setIsNotificationsOpen(false)}
                    />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 z-40 overflow-hidden"
                    >
                      <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 text-sm">Notificações</h4>
                        {unreadCount > 0 && (
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">
                            {unreadCount} Novas
                          </span>
                        )}
                      </div>
                      <div className="max-h-[350px] overflow-y-auto custom-scrollbar bg-white">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center">
                            <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Nenhuma notificação</p>
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
                              "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-all group-hover:scale-110",
                              notif.type === 'ticket' ? "bg-amber-50 text-amber-600" : 
                              notif.type === 'service' ? "bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-500"
                            )}>
                              {notif.type === 'ticket' ? <LifeBuoy className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                               <p className="text-xs font-bold text-slate-900 truncate mb-0.5">{notif.title}</p>
                               <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{notif.message}</p>
                               <p className="text-[9px] text-slate-400 mt-1 font-medium italic">{formatDate(notif.created_at)}</p>
                            </div>
                            {!notif.read && (
                              <button 
                                onClick={(e) => handleMarkAsRead(notif.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all absolute right-2 top-2"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <Link 
                        to="/settings?tab=notificacoes" 
                        onClick={() => setIsNotificationsOpen(false)}
                        className="p-3 text-center block text-[10px] font-bold text-indigo-600 hover:bg-slate-50 border-t border-slate-50 uppercase tracking-widest"
                      >
                        Ver todas as configurações de avisos
                      </Link>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-900 truncate max-w-[120px]">
                  {profile?.full_name || 'Usuário'}
                </p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                  {profile?.role === 'admin_master' ? 'Master Admin' : 'Administrador'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200 flex items-center justify-center text-white font-bold text-sm">
                {(profile?.full_name || 'U')[0]}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
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
              <div className="p-6 flex items-center justify-between border-b border-slate-50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <CreditCard className="text-white w-5 h-5" />
                  </div>
                  <span className="text-xl font-bold text-slate-900">PagixyPay</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              <nav className="flex-1 px-4 py-6 space-y-1">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                        isActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400")} />
                      {item.name}
                    </Link>
                  );
                })}
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 w-full text-sm font-bold text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all mt-8"
                >
                  <LogOut className="w-5 h-5" />
                  Sair da Conta
                </button>
              </nav>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
