import React, { useState } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Store, 
  Terminal,
  Activity,
  Power,
  Sliders,
  Copy
} from 'lucide-react';

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'ifood' | '99food' | 'commissions' | 'simulation';
}

export const IntegrationsModal: React.FC<IntegrationsModalProps> = ({ isOpen, onClose }) => {
  const { 
    deliverySettings,
    testIfoodConnection,
    ifoodConnectionResult,
    isTestingIfoodConnection,
    ifoodConnected, 
    setIfoodConnected,
    isIfoodStoreOpen,
    isTogglingIfoodStore,
    toggleIfoodStoreStatus,
    ifoodPollingState,
    retryIfoodPollingNow,
  } = useBakery();

  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

  const getWebhookUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api/ifood/webhook`;
    }
    return '/api/ifood/webhook';
  };

  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText(getWebhookUrl());
    setCopiedWebhookUrl(true);
    setTimeout(() => setCopiedWebhookUrl(false), 3000);
  };

  const handleTestWebhookPing = async () => {
    setIsTestingWebhook(true);
    setTestError(null);
    setTestSuccess(null);
    try {
      let res = await fetch('/api/ifood/webhook/ping', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-webhook-secret': deliverySettings.ifood.webhookSecret || ''
        },
        body: JSON.stringify({ webhookSecret: deliverySettings.ifood.webhookSecret || '' })
      });

      const rawText = await res.text();
      console.log('[IntegrationsModal Webhook Raw Response]:', {
        status: res.status,
        contentType: res.headers.get('content-type'),
        rawText
      });

      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        console.warn('[IntegrationsModal Webhook Non-JSON Body]:', rawText);
        throw new Error(`Resposta não-JSON do servidor (HTTP ${res.status}): ${rawText.substring(0, 100)}...`);
      }

      if (res.ok && (data.success || data.status === 'OK' || data.status === 'ONLINE')) {
        setTestSuccess(`PING do Webhook respondido com sucesso! (HTTP 200 - ${data.latencyMs || 10}ms) | Mensagem: ${data.message || 'Ativo'}`);
      } else {
        setTestError(`Erro no Webhook (HTTP ${res.status}): ${data.message || 'Chave secreta inválida'}`);
      }
    } catch (err: any) {
      setTestError(`Falha ao conectar com o endpoint de webhook: ${err?.message}`);
    } finally {
      setIsTestingWebhook(false);
    }
  };

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTestError(null);
    setTestSuccess(null);
    const res = await testIfoodConnection({
      clientId: deliverySettings.ifood.clientId || '',
      clientSecret: deliverySettings.ifood.clientSecret || '',
      merchantId: deliverySettings.ifood.merchantId || '',
      isSandbox: false
    });
    if (res.authenticated || res.success) {
      setTestSuccess(res.message || 'Conexão validada com sucesso com a API do iFood!');
    } else {
      setTestError(res.message || 'Erro de autenticação com o iFood. Verifique suas credenciais nas configurações.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fadeIn">
      <div className="bg-[#FAF7F2] dark:bg-[#2B2D31] rounded-2xl border border-[#E5DACF] dark:border-[#3F4147] shadow-xl w-full max-w-lg overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#EBE1D7] dark:border-[#3F4147] flex items-center justify-between bg-[#F4EFEA] dark:bg-[#1E1F22]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#EA1D2C] flex items-center justify-center text-white font-black text-sm shadow-md shrink-0">
              iF
            </div>
            <div>
              <h2 className="font-serif-brand text-base font-bold text-[#382628] dark:text-[#FFFFFF]">
                Painel Rápido iFood
              </h2>
              <p className="text-[10px] text-[#7A6466] dark:text-[#B5BAC1]">
                Status da conexão e testes da API do iFood
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-[#7A6466] dark:text-[#DBDEE1] hover:bg-[#EAE0D5] dark:hover:bg-[#35373C] transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          
          {/* Status Indicators */}
          <div className="space-y-3">
            <h3 className="font-bold text-[#5C4547] dark:text-white uppercase tracking-wider text-[10px] mb-2">
              Status Operacional
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Integração Status Card */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#1E1F22] border border-[#ECE2D8] dark:border-[#3F4147] flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-stone-500 block">Integração Principal</span>
                  <strong className="font-bold text-[#3D2C2E] dark:text-white text-xs flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${ifoodConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                    {ifoodConnected ? 'Online & Conectado' : 'Pausado'}
                  </strong>
                </div>
                <button
                  onClick={() => setIfoodConnected(!ifoodConnected)}
                  className={`p-2 rounded-lg transition-colors font-bold cursor-pointer text-[10px] flex items-center gap-1 ${
                    ifoodConnected 
                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200' 
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{ifoodConnected ? 'Pausar' : 'Ativar'}</span>
                </button>
              </div>

              {/* Loja Status Card */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#1E1F22] border border-[#ECE2D8] dark:border-[#3F4147] flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-stone-500 block">Status da Loja no iFood</span>
                  <strong className="font-bold text-[#3D2C2E] dark:text-white text-xs flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${isIfoodStoreOpen ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    {isIfoodStoreOpen ? 'Aberta' : 'Fechada'}
                  </strong>
                </div>
                <button
                  disabled={isTogglingIfoodStore}
                  onClick={toggleIfoodStoreStatus}
                  className={`p-2 rounded-lg transition-colors font-bold cursor-pointer text-[10px] flex items-center gap-1 ${
                    isIfoodStoreOpen 
                      ? 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300' 
                      : 'bg-[#EA1D2C] hover:bg-[#C91825] text-white'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>{isTogglingIfoodStore ? 'Alterando...' : isIfoodStoreOpen ? 'Fechar' : 'Abrir'}</span>
                </button>
              </div>
            </div>

            {/* Webhook Endpoint Display Box */}
            <div className="p-3 bg-stone-50 dark:bg-[#1E1F22] rounded-xl border border-stone-200 dark:border-[#3F4147] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-800 dark:text-white text-[11px] block">
                  Link do Webhook para Inscrição no iFood:
                </span>
                <span className="text-[9px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded">
                  HTTPS Ativo
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={getWebhookUrl()}
                  className="flex-1 text-[11px] px-2.5 py-1.5 bg-white dark:bg-[#2B2D31] rounded-lg border border-stone-300 dark:border-[#3F4147] font-mono text-[#EA1D2C] font-bold select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyWebhookUrl}
                  className="px-3 py-1.5 rounded-lg bg-[#EA1D2C] hover:bg-[#C91825] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shrink-0 shadow-2xs"
                >
                  {copiedWebhookUrl ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWebhookUrl ? 'Copiado!' : 'Copiar'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleTestWebhookPing}
                  disabled={isTestingWebhook}
                  className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-[#2B2D31] dark:hover:bg-[#35373C] text-stone-700 dark:text-stone-200 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors shrink-0 border border-stone-200 dark:border-[#3F4147]"
                >
                  <RefreshCw className={`w-3 h-3 ${isTestingWebhook ? 'animate-spin' : ''}`} />
                  <span>{isTestingWebhook ? 'Testando...' : 'Testar Ping'}</span>
                </button>
              </div>
              <span className="text-[10px] text-stone-500 dark:text-[#B5BAC1] block leading-tight">
                Cole esta URL no Portal <strong className="text-stone-700 dark:text-stone-300">developer.ifood.com.br</strong> em Inscrição de Webhook.
              </span>
            </div>
          </div>

          {/* Connection Test Section */}
          <div className="space-y-3 pt-3 border-t border-[#EBE1D7] dark:border-[#3F4147]">
            <h3 className="font-bold text-[#5C4547] dark:text-white uppercase tracking-wider text-[10px]">
              Diagnóstico de Conexão API
            </h3>

            <div className="flex items-center justify-between p-3 bg-white dark:bg-[#1E1F22] rounded-xl border border-[#ECE2D8] dark:border-[#3F4147] gap-3">
              <div>
                <span className="font-bold text-[#3D2C2E] dark:text-white block">Teste a comunicação com o iFood</span>
                <span className="text-[10px] text-[#7A6466] dark:text-[#B5BAC1]">Dispara uma requisição de teste para validar o Token OAuth2 e o Merchant ID atual.</span>
              </div>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTestingIfoodConnection}
                className="px-4 py-2 bg-[#EA1D2C] hover:bg-[#C91825] text-white font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingIfoodConnection ? 'animate-spin' : ''}`} />
                <span>{isTestingIfoodConnection ? 'Testando...' : 'Testar Conexão'}</span>
              </button>
            </div>

            {/* Test Feedbacks */}
            {testSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 flex items-start gap-2.5 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <strong className="font-bold block">Conexão Bem Sucedida!</strong>
                  <p className="text-[11px] leading-relaxed">{testSuccess}</p>
                </div>
              </div>
            )}

            {testError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-300 flex items-start gap-2.5 shadow-2xs">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <strong className="font-bold block">Falha no Teste</strong>
                  <p className="text-[11px] leading-relaxed">{testError}</p>
                </div>
              </div>
            )}

            {ifoodConnectionResult && !testSuccess && !testError && (
              <div className="p-3 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#EADFD6] dark:border-[#3F4147] space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-stone-700 dark:text-white">
                  <Terminal className="w-3.5 h-3.5 text-stone-500" />
                  <span>Resultado Retornado da API:</span>
                </div>
                <pre className="p-2.5 bg-stone-900 text-[#DFE4E8] rounded-lg text-[10px] font-mono overflow-x-auto max-h-32 border border-stone-800 leading-relaxed">
                  {JSON.stringify(ifoodConnectionResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Quick Config Hint */}
          <div className="bg-[#FAF0F1] dark:bg-[#2D1B1E] border border-[#F5E1E3] dark:border-[#3F4147] rounded-xl p-3 flex items-start gap-2 text-[#8F3E4A] dark:text-[#FF8A9B]">
            <Sliders className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block">Configurações Avançadas de Canal</strong>
              <p className="text-[10px] mt-0.5 leading-relaxed text-[#7D3440] dark:text-[#E892A0]">
                Chaves de API, criptografia Supabase, logs de depuração, webhook e comissões da plataforma foram movidos para a aba de **Configurações do Administrador** do sistema para maior segurança.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#EBE1D7] dark:border-[#3F4147] bg-[#F4EFEA] dark:bg-[#1E1F22] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#594446] hover:bg-[#433234] text-white font-bold rounded-xl transition-colors cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
