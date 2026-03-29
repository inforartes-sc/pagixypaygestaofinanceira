import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreditCard, Shield, Bell, Building, Globe, Mail, Key, User, Smartphone, Zap, RefreshCw, Upload, Image as ImageIcon, MapPin, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/useAuth';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { translateError } from '../lib/errorTranslator';
import ConfirmationModal from '../components/ConfirmationModal';
import { mercadoPagoService } from '../services/mercadoPagoService';
import { asaasService } from '../services/asaasService';
import { motion, AnimatePresence } from 'motion/react';

type SettingsTab = 'perfil' | 'pagamentos' | 'notificacoes' | 'seguranca' | 'api';

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<SettingsTab>('perfil');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    const tab = searchParams.get('tab') as SettingsTab;
    if (tab && ['perfil', 'pagamentos', 'notificacoes', 'seguranca', 'api'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const [formData, setFormData] = useState({
    company_name: '',
    company_document: '',
    company_email: '',
    company_phone: '',
    address_zip: '',
    address_street: '',
    address_number: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    logo_url: ''
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  
  const [apiData, setApiData] = useState({
    api_key: '',
    webhook_endpoints: [] as string[]
  });

  const [isResetApiKeyModalOpen, setIsResetApiKeyModalOpen] = useState(false);

  const [paymentConfigs, setPaymentConfigs] = useState({
    mercado_pago: { active: false, public_key: '', access_token: '' },
    asaas: { active: false, access_token: '', environment: 'sandbox' }
  });

  // Notificações (Estado Local)
  const [notificationSettings, setNotificationSettings] = useState([
    { id: 'new_invoice', title: 'Novas Faturas', desc: 'Aviso imediato quando uma fatura é emitida.', active: true },
    { id: 'payment_received', title: 'Pagamentos Recebidos', desc: 'Confirmação em tempo real de liquidação.', active: true },
    { id: 'invoice_overdue', title: 'Faturas Vencidas', desc: 'Alertas críticos sobre pendências de clientes.', active: true },
    { id: 'weekly_report', title: 'Relatórios de Performance', desc: 'Resumo executivo do faturamento semanal.', active: false },
  ]);

  useEffect(() => {
    const fetchCompany = async () => {
      if (!user?.company_id) return;
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', user.company_id)
        .single();
      
      if (data && !error) {
        setFormData({
          company_name: data.name || '',
          company_document: data.document || '',
          company_email: data.email || '',
          company_phone: data.phone || '',
          address_zip: data.address_zip || '',
          address_street: data.address_street || '',
          address_number: data.address_number || '',
          address_neighborhood: data.address_neighborhood || '',
          address_city: data.address_city || '',
          address_state: data.address_state || '',
          logo_url: data.logo_url || ''
        });
        if (data.logo_url) setLogoPreview(data.logo_url);
      }
    };
    const fetchConfigs = async () => {
      if (!user?.company_id) return;
      try {
        const mpConfig = await mercadoPagoService.getConfig(user.company_id);
        const asConfig = await asaasService.getConfig(user.company_id);
        setPaymentConfigs({ mercado_pago: mpConfig, asaas: asConfig });
      } catch (err) {
        console.error('Falha ao carregar configs de pagamento:', err);
      }
    };
    const fetchApiData = async () => {
      if (!user?.company_id) return;
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('api_key')
          .eq('id', user.company_id)
          .single();
        
        if (data && !error) {
          setApiData({
            api_key: data.api_key || '',
            webhook_endpoints: [] // Column not currently in DB
          });
        }
      } catch (err) {
        console.error('Falha ao carregar dados de API:', err);
      }
    };
    fetchCompany();
    fetchConfigs();
    fetchApiData();
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      if (!user.company_id) throw new Error('Empresa não identificada');

      let logoUrl = formData.logo_url;

      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${user.company_id}-${Math.random()}.${fileExt}`;
        const filePath = `company-logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(filePath, logoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('logos')
          .getPublicUrl(filePath);
        
        logoUrl = publicUrl;
      }

      const { error } = await supabase
        .from('companies')
        .update({
          name: formData.company_name,
          document: formData.company_document,
          email: formData.company_email,
          phone: formData.company_phone,
          address_zip: formData.address_zip,
          address_street: formData.address_street,
          address_number: formData.address_number,
          address_neighborhood: formData.address_neighborhood,
          address_city: formData.address_city,
          address_state: formData.address_state,
          logo_url: logoUrl
        })
        .eq('id', user.company_id);

      if (error) throw error;
      
      toast.success('Configurações da empresa salvas!');
    } catch (error: any) {
      toast.error(translateError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('As senhas não coincidem!');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ 
        password: passwordData.newPassword 
      });
      if (error) throw error;
      
      toast.success('Senha atualizada com sucesso!');
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(translateError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePaymentConfig = async (gateway: 'mercado_pago' | 'asaas') => {
    if (!user?.company_id) return;
    setIsSubmitting(true);
    try {
      if (gateway === 'mercado_pago') {
        await mercadoPagoService.saveConfig(user.company_id, paymentConfigs.mercado_pago);
      } else {
        await asaasService.saveConfig(user.company_id, paymentConfigs.asaas);
      }
      toast.success(`Configuração do ${gateway === 'mercado_pago' ? 'Mercado Pago' : 'Asaas'} salva!`);
    } catch (error: any) {
      toast.error(translateError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetApiKey = async () => {
    if (!user?.company_id) return;
    const newKey = 'sk_live_' + Math.random().toString(36).substr(2, 24);
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({ api_key: newKey })
        .eq( 'id', user.company_id);
      
      if (error) throw error;
      setApiData({ ...apiData, api_key: newKey });
      toast.success('Nova chave de API gerada com sucesso!');
      setIsResetApiKeyModalOpen(false);
    } catch (error: any) {
      toast.error(translateError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const handleAddWebhook = async () => {
    if (!user?.company_id || !newWebhookUrl) return;
    if (!newWebhookUrl.startsWith('http')) {
      toast.error('O link do webhook deve começar com http:// ou https://');
      return;
    }

    const updatedEndpoints = [...apiData.webhook_endpoints, newWebhookUrl];
    setIsSubmitting(true);
    try {
      /* [Aguardando Migração de Banco de Dados] A coluna webhook_endpoints (tipo text[]) não existe na tabela companies ainda.
      const { error } = await supabase
        .from('companies')
        .update({ webhook_endpoints: updatedEndpoints })
        .eq('id', user.company_id);
      
      if (error) throw error;
      */
      
      // Simula uma resposta de sucesso momentaneamente para demonstração de frontend
      await new Promise(r => setTimeout(r, 500));
      
      setApiData({ ...apiData, webhook_endpoints: updatedEndpoints });
      setNewWebhookUrl('');
      toast.success('Endpoint adicionado (Temporário no Frontend. Requer migração no banco).');
    } catch (error: any) {
      toast.error(translateError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveWebhook = async (url: string) => {
    if (!user?.company_id) return;
    const updatedEndpoints = apiData.webhook_endpoints.filter(u => u !== url);
    setIsSubmitting(true);
    try {
      /* [Aguardando Migração de Banco de Dados]
      const { error } = await supabase
        .from('companies')
        .update({ webhook_endpoints: updatedEndpoints })
        .eq('id', user.company_id);
      if (error) throw error;
      */
      await new Promise(r => setTimeout(r, 500));
      setApiData({ ...apiData, webhook_endpoints: updatedEndpoints });
      toast.success('Endpoint removido (Temporário)');
    } catch (error: any) {
      toast.error(translateError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleNotification = (id: string) => {
    setNotificationSettings(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const tabs = [
    { id: 'perfil', name: 'Perfil', icon: Building },
    { id: 'pagamentos', name: 'Pagamentos', icon: CreditCard },
    { id: 'notificacoes', name: 'Notificações', icon: Bell },
    { id: 'seguranca', name: 'Segurança', icon: Shield },
    { id: 'api', name: 'API & Webhooks', icon: Globe },
  ];

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Configurações</h1>
        <p className="text-slate-500">Gerencie sua conta, empresa e integrações de pagamento.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <aside className="space-y-1">
          {tabs.map((item) => (
            <button 
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as SettingsTab);
                setSearchParams({ tab: item.id });
              }}
              className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-bold rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className={cn("w-4 h-4", activeTab === item.id ? "text-white" : "text-slate-400")} />
              {item.name}
            </button>
          ))}
        </aside>

        <div className="md:col-span-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'perfil' && (
                <form onSubmit={handleSaveProfile} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
                  <div className="flex items-center gap-3 border-b border-slate-50 pb-6">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                      <Building className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">Dados da Empresa</h3>
                      <p className="text-xs text-slate-500 font-medium">Informações fiscais e de contato da sua conta.</p>
                    </div>
                  </div>

                  {/* Logo Upload */}
                  <div className="space-y-4 pt-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Logo do Sistema (Aparece no Login e Faturas)</label>
                    <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 group hover:border-indigo-300 transition-all">
                      <div className="relative w-24 h-24 bg-white rounded-2xl border border-slate-100 flex items-center justify-center overflow-hidden shadow-sm">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-slate-200" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">Envie uma imagem em PNG ou JPG para melhor resultado.</p>
                        <input 
                          type="file" 
                          id="logo-upload"
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setLogoFile(file);
                              setLogoPreview(URL.createObjectURL(file));
                            }
                          }}
                        />
                        <label 
                          htmlFor="logo-upload"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Selecionar Imagem
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Razão Social / Nome</label>
                      <input 
                        type="text" 
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CNPJ / CPF</label>
                      <input 
                        type="text" 
                        value={formData.company_document}
                        onChange={(e) => setFormData({ ...formData, company_document: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Financeiro</label>
                      <input 
                        type="email" 
                        value={formData.company_email}
                        onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Telefone</label>
                      <input 
                        type="text" 
                        value={formData.company_phone}
                        onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex justify-end">
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSubmitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      Salvar Alterações
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'pagamentos' && (
                <div className="space-y-6">
                  {/* Mercado Pago (Primary) */}
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
                    <div className="flex items-center gap-3 border-b border-slate-50 pb-6">
                      <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">Mercado Pago (Principal)</h3>
                        <p className="text-xs text-slate-500 font-medium">Configure sua principal via de recebimentos.</p>
                      </div>
                      <div className="ml-auto">
                        <button 
                          type="button"
                          onClick={() => setPaymentConfigs({ 
                            ...paymentConfigs, 
                            mercado_pago: { ...paymentConfigs.mercado_pago, active: !paymentConfigs.mercado_pago.active } 
                          })}
                          className={cn(
                            "w-11 h-6 rounded-full relative transition-all duration-200",
                            paymentConfigs.mercado_pago.active ? "bg-blue-600" : "bg-slate-300"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all duration-200 shadow-sm transform",
                            paymentConfigs.mercado_pago.active ? "translate-x-5" : "translate-x-0"
                          )}></div>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Public Key</label>
                          <input 
                            type="text" 
                            placeholder="APP_USR-..." 
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                            value={paymentConfigs.mercado_pago.public_key}
                            onChange={(e) => setPaymentConfigs({
                              ...paymentConfigs,
                              mercado_pago: { ...paymentConfigs.mercado_pago, public_key: e.target.value }
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Access Token</label>
                          <input 
                            type="password" 
                            placeholder="APP_USR-..." 
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                            value={paymentConfigs.mercado_pago.access_token}
                            onChange={(e) => setPaymentConfigs({
                              ...paymentConfigs,
                              mercado_pago: { ...paymentConfigs.mercado_pago, access_token: e.target.value }
                            })}
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2 pt-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">URL de Notificações / Redirecionamento (Webhook)</label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 truncate select-all">
                              {`${window.location.origin}/api/webhooks/mercadopago/${user?.company_id}`}
                            </code>
                            <button 
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/mercadopago/${user?.company_id}`);
                                toast.success('URL de Webhook copiada!');
                              }}
                              className="p-2 bg-slate-50 border border-slate-200 text-slate-500 hover:text-blue-600 rounded-xl transition-colors"
                              title="Copiar URL"
                            >
                              <Zap className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium">Copie e cole esta URL completa no painel de desenvolvedor do Mercado Pago em <strong>Notificações Webhooks</strong> para dar baixa automática nas faturas.</p>
                        </div>
                      </div>
                      <div className="flex justify-end pt-4">
                        <button 
                          onClick={() => handleSavePaymentConfig('mercado_pago')}
                          disabled={isSubmitting}
                          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
                        >
                          {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          Salvar Configurações
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Asaas (Alternative) */}
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
                    <div className="flex items-center gap-3 border-b border-slate-50 pb-6">
                      <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                        <Zap className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">Asaas Pagamentos</h3>
                        <p className="text-xs text-slate-500 font-medium">Gateway secundário para liquidação via PIX e Boleto.</p>
                      </div>
                      <div className="ml-auto">
                        <button 
                          type="button"
                          onClick={() => setPaymentConfigs({ 
                            ...paymentConfigs, 
                            asaas: { ...paymentConfigs.asaas, active: !paymentConfigs.asaas.active } 
                          })}
                          className={cn(
                            "w-11 h-6 rounded-full relative transition-all duration-200",
                            paymentConfigs.asaas.active ? "bg-indigo-600" : "bg-slate-300"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all duration-200 shadow-sm transform",
                            paymentConfigs.asaas.active ? "translate-x-5" : "translate-x-0"
                          )}></div>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">API Access Token</label>
                        <input 
                          type="password" 
                          placeholder="$a..." 
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                          value={paymentConfigs.asaas.access_token}
                          onChange={(e) => setPaymentConfigs({
                            ...paymentConfigs,
                            asaas: { ...paymentConfigs.asaas, access_token: e.target.value }
                          })}
                        />
                      </div>
                      <div className="flex items-center justify-between pt-4">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-slate-500">Ambiente:</label>
                          <select 
                            className="bg-slate-100 border-none text-[10px] font-bold rounded-lg px-2 py-1 outline-none"
                            value={paymentConfigs.asaas.environment}
                            onChange={(e) => setPaymentConfigs({
                              ...paymentConfigs,
                              asaas: { ...paymentConfigs.asaas, environment: e.target.value as any }
                            })}
                          >
                            <option value="sandbox">Sandbox (Teste)</option>
                            <option value="production">Produção (Real)</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="space-y-2 pt-2 border-t border-slate-100 mt-4 pt-4">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">URL de Notificações / Redirecionamento (Webhook)</label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 truncate select-all">
                            {`${window.location.origin}/api/webhooks/asaas/${user?.company_id}`}
                          </code>
                          <button 
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/asaas/${user?.company_id}`);
                              toast.success('URL de Webhook copiada!');
                            }}
                            className="p-2 bg-slate-50 border border-slate-200 text-slate-500 hover:text-indigo-600 rounded-xl transition-colors"
                            title="Copiar URL"
                          >
                            <Zap className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium">Configure esta URL na sua conta Asaas em <strong>Integração &gt; Webhooks</strong> escolhendo a API v3 para receber confirmações de pagamento.</p>
                      </div>

                      <div className="flex justify-end pt-4">
                        <button 
                          onClick={() => handleSavePaymentConfig('asaas')}
                          disabled={isSubmitting}
                          className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-2"
                        >
                          {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          Salvar Configurações
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notificacoes' && (
                <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
                  <div className="flex items-center gap-3 border-b border-slate-50 pb-6">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                      <Bell className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">Preferências de Avisos</h3>
                      <p className="text-xs text-slate-500 font-medium">Defina como e quando você quer ser alertado.</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {notificationSettings.map((item) => (
                      <div key={item.id} className={cn(
                        "flex items-center justify-between p-4 rounded-2xl border transition-all",
                        item.active ? "bg-white border-slate-100" : "bg-slate-50/50 border-transparent opacity-80"
                      )}>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{item.title}</p>
                          <p className="text-xs text-slate-500 font-medium">{item.desc}</p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => toggleNotification(item.id)}
                          className={cn(
                            "w-11 h-6 rounded-full relative transition-all duration-200",
                            item.active ? "bg-indigo-600" : "bg-slate-300"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all duration-200 shadow-sm transform",
                            item.active ? "translate-x-5" : "translate-x-0"
                          )}></div>
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {activeTab === 'seguranca' && (
                <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
                  <div className="flex items-center gap-3 border-b border-slate-50 pb-6">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
                      <Shield className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">Segurança da Conta</h3>
                      <p className="text-xs text-slate-500 font-medium">Proteja seu acesso atualizando sua senha.</p>
                    </div>
                  </div>
                  
                  <form onSubmit={handleUpdatePassword} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nova Senha</label>
                        <input 
                          required
                          type="password" 
                          placeholder="••••••••" 
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confirmar Senha</label>
                        <input 
                          required
                          type="password" 
                          placeholder="••••••••" 
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end">
                      <button 
                         type="submit"
                         disabled={isSubmitting}
                         className="px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                         {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                         Atualizar Senha
                      </button>
                    </div>
                  </form>
                </section>
              )}

              {activeTab === 'api' && (
                <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
                  <div className="flex items-center gap-3 border-b border-slate-50 pb-6">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                      <Globe className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">API & Webhooks</h3>
                      <p className="text-xs text-slate-500 font-medium">Integre o PagixyPay com seus sistemas externos e automações.</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="p-6 bg-slate-900 rounded-3xl space-y-4 shadow-xl border border-white/5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chave de API (Produção)</p>
                          <p className="text-[9px] text-slate-500 mt-1 font-medium">Use esta chave para autenticar requisições via código.</p>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[8px] font-bold uppercase rounded-full border border-emerald-500/20">Seguro</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <code className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-indigo-100 overflow-hidden text-ellipsis select-all">
                          {apiData.api_key || 'sk_live_vazio_gerar_chave_agora...'}
                        </code>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(apiData.api_key);
                              toast.success('Chave copiada!');
                            }}
                            className="p-3 text-white/50 hover:text-white bg-white/10 rounded-xl transition-all"
                            title="Copiar Chave"
                          >
                            <Zap className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setIsResetApiKeyModalOpen(true)}
                            className="p-3 text-white/20 hover:text-red-400 bg-white/10 rounded-xl transition-all"
                            title="Gerar Nova Chave"
                          >
                            <RefreshCw className={cn("w-4 h-4", isSubmitting && "animate-spin")} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <ConfirmationModal
                      isOpen={isResetApiKeyModalOpen}
                      onClose={() => setIsResetApiKeyModalOpen(false)}
                      onConfirm={handleResetApiKey}
                      title="Gerar Nova Chave?"
                      description="Isso invalidará a chave atual permanentemente. Todos os sistemas integrados com a chave antiga pararão de funcionar até serem atualizados."
                      confirmLabel="Gerar Nova"
                      cancelLabel="Manter Atual"
                      variant="danger"
                      isSubmitting={isSubmitting}
                    />

                    <div className="space-y-4 pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">Endpoints de Webhook</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">Notificaremos estas URLs sempre que houver um evento (Fatura Paga, etc).</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <input 
                          type="url" 
                          placeholder="https://seu-servidor.com/webhook"
                          className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          value={newWebhookUrl}
                          onChange={(e) => setNewWebhookUrl(e.target.value)}
                        />
                        <button 
                          onClick={handleAddWebhook}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all"
                        >
                          Adicionar
                        </button>
                      </div>

                      <div className="space-y-3">
                        {apiData.webhook_endpoints.length > 0 ? apiData.webhook_endpoints.map((url, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl group shadow-sm">
                            <span className="text-xs font-medium text-slate-600 overflow-hidden text-ellipsis whitespace-nowrap">{url}</span>
                            <button 
                              onClick={() => handleRemoveWebhook(url)}
                              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )) : (
                          <div className="p-10 border-2 border-dashed border-slate-100 rounded-3xl text-center">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Nenhum webhook ativo</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
