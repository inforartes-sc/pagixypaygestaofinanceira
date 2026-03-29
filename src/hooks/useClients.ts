import { useState, useEffect, useCallback } from 'react';
import { clientService } from '../services/clientService';
import { Client, ClientStatus } from '../types';
import { useAuth } from '../contexts/useAuth';
import { toast } from 'sonner';

export function useClients(searchTerm = '', statusFilter: ClientStatus | 'all' = 'all') {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();

  const fetchClients = useCallback(async () => {
    if (authLoading) return;

    if (!user?.company_id && user?.role === 'admin') {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await clientService.getClients(searchTerm, statusFilter, user?.company_id);
      setClients(data);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      toast.error('Erro ao carregar lista de clientes');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, user?.company_id, user?.role, authLoading]);

  useEffect(() => {
    if (!authLoading) {
      const timer = setTimeout(() => {
        fetchClients();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [fetchClients, authLoading]);

  return {
    clients,
    loading,
    refresh: fetchClients
  };
}
