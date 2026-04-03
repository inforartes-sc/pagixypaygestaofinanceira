import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CreditCard, CheckCircle, AlertCircle, Clock, Smartphone, FileText, ArrowRight, ShieldCheck, Copy, Check, RefreshCw } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { billingService } from '../services/billingService';
import { Invoice, PaymentMethod } from '../types';
import { translateError } from '../lib/errorTranslator';
import { mercadoPagoService } from '../services/mercadoPagoService';
import { asaasService } from '../services/asaasService';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

export default function PaymentLink() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'selection' | 'processing' | 'success'>('selection');
  const [copied, setCopied] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [clientData, setClientData] = useState<any>(null);
  const [gateways, setGateways] = useState<any>({ mercado_pago: { active: false }, asaas: { active: false } });
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const status = searchParams.get('status');
    if (status) {
      if (status === 'success' || status === 'approved') {
        setPaymentStep('success');
      } else if (status === 'pending') {
        toast.info('Seu pagamento está em análise pela operadora.', { id: 'mp_pending' });
      } else if (status === 'failure' || status === 'rejected') {
        toast.error('O pagamento foi recusado. Tente outro método.', { id: 'mp_fail' });
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchInvoiceAndCompany = async () => {
      if (!invoiceId) return;
      try {
        const data = await billingService.getInvoiceById(invoiceId);
        setInvoice(data);
        
        if (data?.company_id) {
          const { data: companyRes } = await supabase
            .from('companies')
            .select('*')
            .eq('id', data.company_id)
            .single();
          
          if (companyRes) {
            setCompanyInfo(companyRes);
            setCompanyLogo(companyRes.logo_url);
            setGateways(companyRes.gateways_config || { mercado_pago: { active: false }, asaas: { active: false } });
          }
        }

        if (data?.client_id) {
          const { data: clientRes } = await supabase
            .from('clients')
            .select('*')
            .eq('id', data.client_id)
            .single();
          
          if (clientRes) {
            setClientData(clientRes);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar detalhes da fatura:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoiceAndCompany();
  }, [invoiceId]);

  const handlePayment = async () => {
    if (!invoice || !selectedMethod) return;
    
    setIsPaying(true);
    setPaymentStep('processing');
    
    try {
      // Logic for initiating the selected gateway
      if (gateways.mercado_pago?.active) {
         toast.info(`Iniciando checkout ${selectedMethod.toUpperCase()} via Mercado Pago...`);
         
         const accessToken = gateways.mercado_pago.access_token;
         if (!accessToken) throw new Error("Mercado Pago não está devidamente configurado (Token faltando).");
         
         const pref = await mercadoPagoService.createPreference(
           invoice.id, 
           invoice.amount, 
           invoice.service_name || invoice.description || "Pagamento de Fatura", 
           accessToken
         );
         
         // Redireciona para o checkout do Mercado Pago
         window.location.href = pref.init_point;
         return; // O fluxo é interrompido pois haverá o redirecionamento da janela
         
      } else if (gateways.asaas?.active) {
         toast.info(`Iniciando checkout ${selectedMethod.toUpperCase()} via Asaas...`);
         await new Promise(resolve => setTimeout(resolve, 1500));
         // Simulação temporária para Asaas
         await billingService.updateInvoicePaymentMethod(invoice.id, selectedMethod);
         await billingService.updateInvoiceStatus(invoice.id, 'paid');
         setPaymentStep('success');
         toast.success('Pagamento realizado com sucesso!');
      } else {
         // Fallback default simulation
         await new Promise(resolve => setTimeout(resolve, 2000));
         await billingService.updateInvoicePaymentMethod(invoice.id, selectedMethod);
         await billingService.updateInvoiceStatus(invoice.id, 'paid');
         setPaymentStep('success');
         toast.success('Pagamento realizado com sucesso!');
      }
      
    } catch (error) {
      toast.error(translateError(error));
      setPaymentStep('selection');
    } finally {
      setIsPaying(false);
    }
  };

  const copyPix = () => {
    const pixKey = "00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-4266141740005204000053039865802BR5913Visual Super6009Sao Paulo62070503***6304E2CA";
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    toast.success('Código PIX copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 font-medium">Carregando detalhes do pagamento...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">Fatura não encontrada</h1>
            <p className="text-slate-500">O link que você acessou pode estar expirado ou incorreto.</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (invoice.status === 'paid' && paymentStep !== 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">Fatura já paga</h1>
            <p className="text-slate-500">Esta fatura foi liquidada em {formatDate(invoice.created_at)}.</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Valor:</span>
              <span className="font-bold text-slate-900">{formatCurrency(invoice.amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Método:</span>
              <span className="font-bold text-slate-900 capitalize">{(invoice.payment_method || 'pix').replace('_', ' ')}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 print-root">
      <div className="max-w-2xl mx-auto">
        {/* Header/Logo */}
        <div className="text-center mb-8 space-y-2">
          {companyLogo ? (
            <img src={companyLogo} alt="Logo" className="w-auto max-w-[280px] h-24 object-contain mx-auto mb-4" />
          ) : (
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-200 mb-4 print-hidden">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
          )}
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest print-hidden">Checkout Seguro</h2>
          <p className="text-slate-600 font-medium print-hidden">{invoice.client_name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Main Content */}
          <div className="md:col-span-3 space-y-6">
            <AnimatePresence mode="wait">
              {paymentStep === 'selection' && (
                <motion.div
                  key="selection"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                >
                  <div className="p-6 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900">Escolha como pagar</h3>
                    <p className="text-sm text-slate-500">Selecione o método de sua preferência</p>
                  </div>
                    <div className="p-6 space-y-3">
                      {gateways.mercado_pago?.active && (
                        <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center font-black text-blue-600 text-[8px] shadow-sm">MP</div>
                            <p className="text-xs font-bold text-blue-900 uppercase tracking-widest">Via Mercado Pago</p>
                          </div>
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-700 text-[8px] font-bold uppercase rounded-full">Principal</span>
                        </div>
                      )}

                      {(invoice.description?.includes('Assinatura') || !!invoice.subscription_id) && (
                        <div className="mb-4 bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center gap-3 text-indigo-700">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                            <RefreshCw className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider">Checkout de Assinatura</p>
                            <p className="text-[10px] text-indigo-600/70 font-medium">Este pagamento refere-se a um plano recorrente.</p>
                          </div>
                        </div>
                      )}
                      
                      {[
                        { id: 'pix', label: 'PIX', icon: Smartphone, desc: 'Aprovação imediata' },
                        { id: 'credit_card', label: 'Cartão de Crédito', icon: CreditCard, desc: 'Até 12x no cartão' },
                        { id: 'boleto', label: 'Boleto Bancário', icon: FileText, desc: 'Até 3 dias úteis' },
                      ].map((method) => (
                        <button
                          key={method.id}
                          onClick={() => setSelectedMethod(method.id as PaymentMethod)}
                          className={cn(
                            "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                            selectedMethod === method.id 
                              ? (gateways.mercado_pago?.active ? "border-blue-600 bg-blue-50/50" : "border-indigo-600 bg-indigo-50/50") 
                              : "border-slate-100 hover:border-slate-200"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            selectedMethod === method.id 
                              ? (gateways.mercado_pago?.active ? "bg-blue-600 text-white" : "bg-indigo-600 text-white") 
                              : "bg-slate-100 text-slate-500"
                          )}>
                            <method.icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-slate-900 text-sm">{method.label}</p>
                            <p className="text-xs text-slate-500">{method.desc}</p>
                          </div>
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                            selectedMethod === method.id 
                              ? (gateways.mercado_pago?.active ? "border-blue-600 bg-blue-600" : "border-indigo-600 bg-indigo-600") 
                              : "border-slate-200"
                          )}>
                            {selectedMethod === method.id && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="p-6 bg-slate-50 border-t border-slate-100">
                      <button
                        disabled={!selectedMethod || isPaying}
                        onClick={handlePayment}
                        className={cn(
                          "w-full py-4 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                          gateways.mercado_pago?.active 
                            ? "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200" 
                            : "bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200",
                          "disabled:opacity-50 disabled:shadow-none"
                        )}
                      >
                        {gateways.mercado_pago?.active ? 'Pagar com Mercado Pago' : 'Pagar Agora'}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                </motion.div>
              )}

              {paymentStep === 'processing' && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center space-y-6"
                >
                  <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-slate-900">Processando Pagamento</h3>
                    <p className="text-slate-500">Por favor, não feche esta janela...</p>
                  </div>
                </motion.div>
              )}

              {paymentStep === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-6 print-only"
                >
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-slate-900">Pagamento Confirmado!</h3>
                    <p className="text-slate-500">Obrigado! Seu pagamento foi processado com sucesso.</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-2xl text-left space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Emitente</p>
                        <p className="text-xs font-bold text-slate-700">{companyInfo?.name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tomador</p>
                        <p className="text-xs font-bold text-slate-700">{clientData?.name || invoice.client_name}</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-slate-200 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Serviço:</span>
                        <span className="font-bold text-slate-900">{invoice.service_name || 'Serviço Profissional'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Valor Pago:</span>
                        <span className="font-bold text-emerald-600">{formatCurrency(invoice.amount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Código:</span>
                        <span className="font-mono text-[10px] text-slate-900">#{invoice.id.slice(0, 12).toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => window.print()}
                    className="w-full py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                  >
                    Imprimir Comprovante
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar / Summary */}
          <div className="md:col-span-2 space-y-6 print-hidden">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-bold text-slate-900">Resumo da Fatura</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Emitente</p>
                    <p className="text-sm font-bold text-slate-900">{companyInfo?.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tomador</p>
                    <p className="text-sm font-bold text-slate-900">{clientData?.name || invoice.client_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Serviço</p>
                    <p className="text-sm font-medium text-slate-700">{invoice.service_name || 'Serviço Profissional'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vencimento</p>
                    <p className="text-sm font-medium text-slate-700">{formatDate(invoice.due_date)}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-baseline">
                    <p className="text-sm font-bold text-slate-900">Total</p>
                    <p className="text-2xl font-bold text-indigo-600">{formatCurrency(invoice.amount)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-indigo-600 rounded-2xl p-6 text-white space-y-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 opacity-80" />
                <p className="text-sm font-bold">Ambiente 100% Seguro</p>
              </div>
              <p className="text-xs text-indigo-100 leading-relaxed">
                Seus dados estão protegidos por criptografia de ponta a ponta. Não armazenamos informações sensíveis de cartões.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
