import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import DashboardLayout from './components/Layout/DashboardLayout';
import ClientPortalLayout from './components/Layout/ClientPortalLayout';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Billing from './pages/Billing';
import Services from './pages/Services';
import Settings from './pages/Settings';
import Login from './pages/Login';
import PaymentLink from './pages/PaymentLink';
import ClientDashboard from './pages/portal/ClientDashboard';
import ClientBilling from './pages/portal/ClientBilling';
import ClientSupport from './pages/portal/ClientSupport';
import ClientServiceRequests from './pages/portal/ClientServiceRequests';
import ClientSettings from './pages/portal/ClientSettings';
import AdminSupport from './pages/AdminSupport';
import AdminServiceRequests from './pages/AdminServiceRequests';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/useAuth';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={
          user ? (
            <Navigate to={user.role === 'client' ? "/portal" : "/"} replace />
          ) : (
            <Login />
          )
        } 
      />
      <Route path="/pay/:invoiceId" element={<PaymentLink />} />
      
      {/* Admin Routes */}
      <Route
        path="/"
        element={['admin', 'admin_master'].includes(user?.role || '') ? <DashboardLayout /> : <Navigate to="/login" />}
      >
        <Route index element={<Dashboard />} />
        <Route path="clients" element={<Clients />} />
        <Route path="billing" element={<Billing />} />
        <Route path="services" element={<Services />} />
        <Route path="support" element={<AdminSupport />} />
        <Route path="requests" element={<AdminServiceRequests />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Client Portal Routes */}
      <Route
        path="/portal"
        element={user?.role === 'client' ? <ClientPortalLayout /> : <Navigate to="/login" />}
      >
        <Route index element={<ClientDashboard />} />
        <Route path="billing" element={<ClientBilling />} />
        <Route path="support" element={<ClientSupport />} />
        <Route path="services" element={<ClientServiceRequests />} />
        <Route path="settings" element={<ClientSettings />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to={user?.role === 'client' ? "/portal" : "/"} />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

