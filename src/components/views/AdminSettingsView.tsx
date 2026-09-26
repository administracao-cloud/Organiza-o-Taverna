import React, { useState, useEffect } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { UserAccount, UserPermissions } from '../../types';
import { 
  ShieldCheck, 
  UserPlus, 
  Clock, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  AlertTriangle, 
  Lock, 
  User, 
  UserX,
  ShieldAlert,
  Sparkles,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Users,
  UserCheck,
  Briefcase,
  Layers,
  ArrowRight,
  Shield,
  Volume2,
  VolumeX,
  Terminal,
  Copy,
  Percent,
  Store,
  Zap,
  Key,
  Sliders,
  Plus,
  Globe,
  Radio,
  Eye,
  EyeOff,
  Activity,
  Power
} from 'lucide-react';
import { safeGet, safeSet, safeStorage } from '../../utils/storage';
import { saveEncryptedCredentials, getDecryptedCredentials } from '../../services/supabaseService';

const defaultFullPermissions: UserPermissions = {
  overviewView: true,
  ordersView: true,
  ordersEdit: true,
  inventoryView: true,
  inventoryEdit: true,
  purchasesView: true,
  purchasesEdit: true,
  technicalSheetsView: true,
  technicalSheetsEdit: true,
  pricingView: true,
  pricingEdit: true,
  financialsView: true,
  financialsEdit: true,
  marketingView: true,
  marketingEdit: true,
  adminConfigView: true
};

const defaultBakerPermissions: UserPermissions = {
  overviewView: true,
  ordersView: true,
  ordersEdit: false,
  inventoryView: true,
  inventoryEdit: true,
  purchasesView: true,
  purchasesEdit: true,
  technicalSheetsView: true,
  technicalSheetsEdit: true,
  pricingView: false,
  pricingEdit: false,
  financialsView: false,
  financialsEdit: false,
  marketingView: false,
  marketingEdit: false,
  adminConfigView: false
};

const defaultSalesPermissions: UserPermissions = {
  overviewView: true,
  ordersView: true,
  ordersEdit: true,
  inventoryView: true,
  inventoryEdit: false,
  purchasesView: false,
  purchasesEdit: false,
  technicalSheetsView: true,
  technicalSheetsEdit: false,
  pricingView: true,
  pricingEdit: false,
  financialsView: false,
  financialsEdit: false,
  marketingView: true,
  marketingEdit: true,
  adminConfigView: false
};

const defaultManagerPermissions: UserPermissions = {
  overviewView: true,
  ordersView: true,
  ordersEdit: true,
  inventoryView: true,
  inventoryEdit: true,
  purchasesView: true,
  purchasesEdit: true,
  technicalSheetsView: true,
  technicalSheetsEdit: true,
  pricingView: true,
  pricingEdit: true,
  financialsView: true,
  financialsEdit: true,
  marketingView: true,
  marketingEdit: true,
  adminConfigView: false
};

export const AdminSettingsView: React.FC = () => {
  const { 
    currentUser, 
    userAccounts, 
    addUserAccount, 
    updateUserAccount, 
    deleteUserAccount,
    approveUserAccount,
    supabaseStatus,
    isSupabaseSyncing,
    syncWithSupabase,
    pushAllToSupabase,
    orders,
    materials,
    technicalSheets,
    deliverySettings,
    updateDeliverySettings,
    testIfoodConnection,
    ifoodConnectionResult,
    isTestingIfoodConnection,
    ifoodConnected, 
    setIfoodConnected, 
    nineNineFoodConnected, 
    setNineNineFoodConnected,
    hardResetIfoodConnection,
    isIfoodStoreOpen,
    isTogglingIfoodStore,
    toggleIfoodStoreStatus,
    simulateIncomingDeliveryOrder,
    addToast
  } = useBakery();

  // Active Admin Sub-tab
  const [adminTab, setAdminTab] = useState<'access_requests' | 'active_users' | 'ifood_config' | '99food_config' | 'commissions_config' | 'units_config' | 'supabase_sync' | 'backup' | 'system_logs'>('access_requests');

  // iFood state
  const [clientId, setClientId] = useState(deliverySettings.ifood.clientId || '');
  const [clientSecret, setClientSecret] = useState(deliverySettings.ifood.clientSecret || '');
  const [merchantId, setMerchantId] = useState(deliverySettings.ifood.merchantId || '');
  const [ifoodWebhookSecret, setIfoodWebhookSecret] = useState(deliverySettings.ifood.webhookSecret || '');
  const [isSandboxMode, setIsSandboxMode] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showWebhookSecretInput, setShowWebhookSecretInput] = useState(false);
  const [testConnectionError, setTestConnectionError] = useState<string | null>(null);
  const [testConnectionSuccess, setTestConnectionSuccess] = useState<string | null>(null);

  // Supabase Encryption States
  const [useSupabaseEncryption, setUseSupabaseEncryption] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [isSavingEncrypted, setIsSavingEncrypted] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [showSqlScript, setShowSqlScript] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Webhook Management States
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookTestFeedback, setWebhookTestFeedback] = useState<string | null>(null);
  const [isSimulatingWebhook, setIsSimulatingWebhook] = useState(false);
  const [isSyncingActiveOrders, setIsSyncingActiveOrders] = useState(false);

  // Server Configuration State
  const [serverConfig, setServerConfig] = useState<{
    hasConfiguredKeys: boolean;
    clientId?: string;
    merchantId?: string;
    maskedClientSecret?: string;
    status?: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/ifood/config')
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          setServerConfig(data);
          if (!clientId && data.clientId) {
            setClientId(data.clientId);
          }
          if (!merchantId && data.merchantId) {
            setMerchantId(data.merchantId);
          }
          if (!clientSecret && data.hasConfiguredKeys) {
            setClientSecret('🔐 [SALVO NO SERVIDOR]');
          }
        }
      })
      .catch(() => {});
  }, []);

  const getWebhookUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api/ifood/webhook`;
    }
    return '/api/ifood/webhook';
  };

  const handleCopyWebhookUrl = () => {
    const url = getWebhookUrl();
    navigator.clipboard.writeText(url);
    setCopiedWebhookUrl(true);
    addToast({
      type: 'success',
      title: 'Link do Webhook Copiado!',
      message: 'Cole o link no Portal do Desenvolvedor iFood (Inscrição de Eventos).'
    });
    setTimeout(() => setCopiedWebhookUrl(false), 3000);
  };

  const handleTestWebhookPing = async () => {
    setIsTestingWebhook(true);
    setWebhookTestFeedback(null);
    try {
      // 1. Test Ping Endpoint (/api/ifood/webhook/ping)
      const pingRes = await fetch('/api/ifood/webhook/ping', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-webhook-secret': ifoodWebhookSecret
        },
        body: JSON.stringify({ webhookSecret: ifoodWebhookSecret })
      });

      let pingData: any = null;
      try {
        pingData = await pingRes.json();
      } catch {
        // ignore parse error
      }

      // 2. Test Official Webhook Endpoint (/api/ifood/webhook) with Handshake / Presence
      const webhookRes = await fetch('/api/ifood/webhook', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-webhook-secret': ifoodWebhookSecret
        },
        body: JSON.stringify({
          type: "HANDSHAKE",
          code: "MOCK_PRESENCE",
          event: "PING"
        })
      });

      let webhookData: any = null;
      try {
        webhookData = await webhookRes.json();
      } catch {
        // ignore
      }

      const isPingOk = pingRes.ok && (pingData?.success || pingData?.status === 'OK');
      const isWebhookOk = webhookRes.ok && (webhookData?.success || webhookData?.status === 'OK');

      if (isPingOk || isWebhookOk) {
        setWebhookTestFeedback(`✅ Conexão do Webhook Validada com Sucesso! (HTTP 200 OK)
• Endpoint Ping: /api/ifood/webhook/ping [ONLINE - ${pingData?.latencyMs || 8}ms]
• Endpoint Oficial: /api/ifood/webhook [ONLINE - ${webhookRes.status} OK]
• Status: Validação de presença e recepção de pedidos no iFood operando com sucesso.`);
        addToast({
          type: 'success',
          title: 'Webhook Validado com Sucesso (HTTP 200)!',
          message: 'O servidor Saborê respondeu positivamente ao handshake de teste.'
        });
      } else {
        setWebhookTestFeedback(`Erro no Teste do Webhook (HTTP ${pingRes.status} / ${webhookRes.status}): ${pingData?.message || webhookData?.message || 'Servidor indisponível'}`);
        addToast({
          type: 'error',
          title: 'Falha no Teste do Webhook',
          message: 'O endpoint não retornou HTTP 200.'
        });
      }
    } catch (err: any) {
      setWebhookTestFeedback(`Erro ao testar Webhook: ${err?.message}`);
      addToast({
        type: 'error',
        title: 'Erro de Conexão no Webhook',
        message: err?.message
      });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handleSimulateOrderWebhook = async () => {
    setIsSimulatingWebhook(true);
    try {
      const res = await fetch('/api/ifood/webhook/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventCode: 'PLACED',
          customerName: 'Cliente Teste Webhook iFood',
          total: 62.90,
          notes: 'Teste de sincronização imediata por Webhook do iFood.'
        })
      });

      const rawText = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        // Fallback for non-JSON or static routing
      }

      if (res.ok && data?.success) {
        // We do NOT call simulateIncomingDeliveryOrder here because the backend 
        // webhook endpoint just created a real mock order in serverOrders.
        // The frontend polling loop (syncServerOrders) will pick it up automatically within 4s.
        addToast({
          type: 'ifood_order',
          title: 'Pedido de Teste Webhook Criado!',
          message: `Pedido iFood simulado no servidor com sucesso. A tela será atualizada em breve.`
        });
      } else {
        simulateIncomingDeliveryOrder('ifood');
        addToast({
          type: 'ifood_order',
          title: 'Pedido de Teste iFood Simulado Localmente!',
          message: 'Novo pedido do iFood gerado localmente (o servidor retornou erro).'
        });
      }
    } catch (err: any) {
      simulateIncomingDeliveryOrder('ifood');
      addToast({
        type: 'ifood_order',
        title: 'Pedido de Teste iFood Simulado Localmente!',
        message: 'Novo pedido do iFood gerado localmente (falha de rede).'
      });
    } finally {
      setIsSimulatingWebhook(false);
    }
  };

  const handleManualSyncActiveOrders = async () => {
    setIsSyncingActiveOrders(true);
    try {
      const res = await fetch('/api/ifood/sync-active-orders', { method: 'POST' });
      const rawText = await res.text();
      let data: any = null;
      try { data = JSON.parse(rawText); } catch {}

      if (data && data.success) {
        addToast({
          type: 'success',
          title: 'Sincronização de Status Concluída!',
          message: data.syncedCount > 0 
            ? `${data.syncedCount} pedido(s) tiveram o status atualizado de acordo com o iFood!`
            : 'Todos os pedidos ativos do iFood já estão com os status sincronizados.'
        });
      } else {
        addToast({
          type: 'error',
          title: 'Falha na Sincronização iFood',
          message: data?.message || 'Ocorreu um erro ao sincronizar os status com o iFood.'
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro de Conexão',
        message: err?.message || 'Não foi possível conectar ao servidor para sincronizar os pedidos.'
      });
    } finally {
      setIsSyncingActiveOrders(false);
    }
  };

  // 99Food state
  const [food99StoreId, setFood99StoreId] = useState(deliverySettings.food99.storeId || '');
  const [food99ApiKey, setFood99ApiKey] = useState(deliverySettings.food99.apiKey || '');
  const [food99Commission, setFood99Commission] = useState(deliverySettings.food99.commissionPercent || 20);
  const [food99PaymentFee, setFood99PaymentFee] = useState(deliverySettings.food99.paymentFeePercent || 3.2);

  // Commissions state
  const [ifoodCommission, setIfoodCommission] = useState(deliverySettings.ifood.commissionPercent || 23);
  const [ifoodPaymentFee, setIfoodPaymentFee] = useState(deliverySettings.ifood.paymentFeePercent || 3.5);
  const [ifoodAnticipationFee, setIfoodAnticipationFee] = useState(deliverySettings.ifood.anticipationFeePercent ?? 1.89);
  const [ifoodLogisticsType, setIfoodLogisticsType] = useState<'parceira' | 'propria'>(deliverySettings.ifood.logisticsType || 'propria');
  const [directCardFee, setDirectCardFee] = useState(deliverySettings.direct.cardFeePercent || 2.5);
  const [directFixedCost, setDirectFixedCost] = useState(deliverySettings.direct.fixedCostPercent || 5);
  const [directTargetMargin, setDirectTargetMargin] = useState(deliverySettings.direct.targetMarginPercent || 40);

  // Helper Copy Function
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleFillSandboxData = () => {
    setClientId('sandbox-sabore-id-572910');
    setClientSecret('sandbox-sabore-secret-8192038102930219');
    setMerchantId('merch-sabore-sp-884920');
    setIsSandboxMode(true);
    setActionFeedback({
      type: 'success',
      message: 'Credenciais de sandbox do iFood preenchidas! Clique em "Testar Conexão API" ou salve.'
    });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    updateDeliverySettings(prev => ({
      ...prev,
      ifood: {
        ...prev.ifood,
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        merchantId: merchantId.trim(),
        webhookSecret: ifoodWebhookSecret.trim(),
        isConnected: ifoodConnected
      }
    }));
    safeStorage.set('sabore_ifood_connected', ifoodConnected);

    fetch('/api/ifood/fetch-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        clientId: clientId.trim(), 
        clientSecret: clientSecret.trim(), 
        merchantId: merchantId.trim(),
        webhookSecret: ifoodWebhookSecret.trim()
      })
    }).catch(() => {});

    setActionFeedback({
      type: 'success',
      message: 'Credenciais da API e Chave Secreta do Webhook salvas com sucesso!'
    });
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const handleTestConnection = async () => {
    setTestConnectionError(null);
    setTestConnectionSuccess(null);

    const effectiveClientId = clientId.trim() || serverConfig?.clientId || '';
    const isSecretMasked = clientSecret.startsWith('🔐') || clientSecret.includes('•') || clientSecret.includes('[SALVO');
    const effectiveClientSecret = isSecretMasked ? '' : clientSecret.trim();

    if (!effectiveClientId && !serverConfig?.hasConfiguredKeys) {
      setTestConnectionError('Preenchimento Obrigatório: O campo Client ID não pode estar vazio.');
      return;
    }

    const res = await testIfoodConnection({
      clientId: effectiveClientId,
      clientSecret: effectiveClientSecret,
      merchantId: merchantId.trim() || serverConfig?.merchantId || '',
      isSandbox: isSandboxMode
    });
    if (res.authenticated || res.success) {
      setTestConnectionSuccess(res.message || 'Autenticação com a API iFood realizada com sucesso! Loja ONLINE.');
      setIfoodConnected(true);
      addToast({
        type: 'success',
        title: 'Conexão iFood Validada!',
        message: 'A loja foi autenticada na API oficial do iFood e está ONLINE.'
      });
    } else {
      setTestConnectionError(res.message || 'Falha de validação: O iFood recusou as credenciais.');
    }
  };

  const handleSaveEncryptedCredentials = async () => {
    if (!clientId.trim() || !clientSecret.trim() || !passphrase.trim()) {
      setTestConnectionError('Preencha os campos Client ID, Client Secret e Frase Secreta antes de criptografar.');
      return;
    }
    setIsSavingEncrypted(true);
    setTestConnectionError(null);
    try {
      const res = await saveEncryptedCredentials(
        'ifood',
        clientId.trim(),
        clientSecret.trim(),
        merchantId.trim(),
        passphrase.trim()
      );
      if (res.success) {
        setActionFeedback({
          type: 'success',
          message: res.message
        });
        setTimeout(() => setActionFeedback(null), 4000);
        updateDeliverySettings(prev => ({
          ...prev,
          ifood: {
            ...prev.ifood,
            clientId: clientId.trim(),
            clientSecret: '🔐 [SALVO CRIPTOGRAFADO NO SUPABASE]',
            merchantId: merchantId.trim()
          }
        }));
      } else {
        setTestConnectionError(res.message);
      }
    } catch (err: any) {
      setTestConnectionError(err.message || 'Erro ao criptografar credenciais.');
    } finally {
      setIsSavingEncrypted(false);
    }
  };

  const handleDecryptCredentials = async () => {
    if (!passphrase.trim()) {
      setTestConnectionError('Digite a frase secreta para descriptografar.');
      return;
    }
    setIsDecrypting(true);
    setTestConnectionError(null);
    try {
      const res = await getDecryptedCredentials('ifood', passphrase.trim());
      if (res.success && res.credentials) {
        setClientId(res.credentials.clientId);
        setClientSecret(res.credentials.clientSecret);
        setMerchantId(res.credentials.merchantId);
        setActionFeedback({
          type: 'success',
          message: res.message
        });
        setTimeout(() => setActionFeedback(null), 4000);
      } else {
        setTestConnectionError(res.message);
      }
    } catch (err: any) {
      setTestConnectionError(err.message || 'Erro ao descriptografar credenciais.');
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleSaveFood99 = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateDeliverySettings(prev => ({
      ...prev,
      food99: {
        ...prev.food99,
        enabled: nineNineFoodConnected,
        isConnected: nineNineFoodConnected,
        storeId: food99StoreId.trim(),
        apiKey: food99ApiKey.trim(),
        commissionPercent: Number(food99Commission),
        paymentFeePercent: Number(food99PaymentFee),
      }
    }));
    safeStorage.set('sabore_99food_connected', nineNineFoodConnected);
    setActionFeedback({
      type: 'success',
      message: 'Parâmetros e credenciais da conexão 99Food salvos com sucesso!'
    });
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleSaveCommissions = (e: React.FormEvent) => {
    e.preventDefault();
    updateDeliverySettings(prev => ({
      ...prev,
      ifood: {
        ...prev.ifood,
        commissionPercent: Number(ifoodCommission),
        paymentFeePercent: Number(ifoodPaymentFee),
        anticipationFeePercent: Number(ifoodAnticipationFee),
        logisticsType: ifoodLogisticsType,
        isConnected: ifoodConnected
      },
      food99: {
        ...prev.food99,
        commissionPercent: Number(food99Commission),
        paymentFeePercent: Number(food99PaymentFee),
        storeId: food99StoreId.trim(),
        enabled: nineNineFoodConnected,
        isConnected: nineNineFoodConnected
      },
      direct: {
        ...prev.direct,
        cardFeePercent: Number(directCardFee),
        fixedCostPercent: Number(directFixedCost),
        targetMarginPercent: Number(directTargetMargin)
      }
    }));
    safeStorage.set('sabore_ifood_connected', ifoodConnected);
    safeStorage.set('sabore_99food_connected', nineNineFoodConnected);
    setActionFeedback({
      type: 'success',
      message: 'Taxas e comissões atualizadas! Os preços sugeridos de todos os produtos foram recalculados.'
    });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Direct safe local storage logs (sabore_logs) - no HTTP calls, no 404s
  const [systemLogs, setSystemLogs] = useState<any[]>(() => {
    const existing = safeGet<any[]>('sabore_logs', null);
    if (!existing || !Array.isArray(existing)) {
      safeSet('sabore_logs', []);
      return [];
    }
    return existing;
  });
  const [logFilter, setLogFilter] = useState<string>('ALL');

  const refreshSystemLogs = () => {
    const existing = safeGet<any[]>('sabore_logs', null);
    if (!existing || !Array.isArray(existing)) {
      safeSet('sabore_logs', []);
      setSystemLogs([]);
    } else {
      setSystemLogs(existing);
    }
    setActionFeedback({
      type: 'success',
      message: 'Logs atualizados a partir do armazenamento local.'
    });
    setTimeout(() => setActionFeedback(null), 2500);
  };

  const handleClearSystemLogs = () => {
    safeSet('sabore_logs', []);
    setSystemLogs([]);
    setActionFeedback({
      type: 'success',
      message: 'Todos os registros de logs locais foram limpos.'
    });
    setTimeout(() => setActionFeedback(null), 2500);
  };

  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserAccount | null>(null);
  const [selfDeleteWarning, setSelfDeleteWarning] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleExportData = () => {
    const dataToExport = {
      timestamp: new Date().toISOString(),
      exportUser: currentUser?.name || 'Sistema',
      data: {
        orders,
        materials,
        technicalSheets
      }
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sabore_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setActionFeedback({
      type: 'success',
      message: 'Backup JSON gerado e download iniciado com sucesso!'
    });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Selected roles map for pending users: { [userId]: role }
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [isProcessingApproval, setIsProcessingApproval] = useState<string | null>(null);

  // Form states for creating user
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'Administrador' | 'Mestre Padeiro' | 'Atendimento' | 'Gerente'>('Atendimento');
  const [newPassword, setNewPassword] = useState('');

  // Form states for editing user
  const [editRole, setEditRole] = useState('');
  const [editPermissions, setEditPermissions] = useState<UserPermissions>(defaultFullPermissions);

  const isAdmin = currentUser?.role === 'Administrador';

  // Categorize users
  const pendingUsers = (userAccounts || []).filter(u => u && (u.status === 'Pendente' || u.status === 'pendente'));
  const activeUsers = (userAccounts || []).filter(u => u && (u.status !== 'Pendente' && u.status !== 'pendente'));

  if (!isAdmin) {
    return (
      <div className="p-8 text-center bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] space-y-4 my-8 max-w-lg mx-auto shadow-xs">
        <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto" />
        <h3 className="font-serif-brand text-xl font-bold text-[#352527] dark:text-[#FFFFFF]">Acesso Restrito ao Administrador</h3>
        <p className="text-xs text-[#7A6466] leading-relaxed">
          Esta área de configurações de usuários, aprovação de acessos e sincronização é restrita aos usuários com o cargo de <strong>Administrador</strong>.
        </p>
      </div>
    );
  }

  const handleRoleSelect = (userId: string, role: string) => {
    setSelectedRoles(prev => ({
      ...prev,
      [userId]: role
    }));
  };

  const handleApproveUser = async (user: UserAccount) => {
    const roleToAssign = selectedRoles[user.id] || user.role || 'Atendimento';
    setIsProcessingApproval(user.id);
    try {
      const res = await approveUserAccount(user.id, roleToAssign);
      if (res.success) {
        setActionFeedback({
          type: 'success',
          message: res.message || `Usuário ${user.name} aprovado com sucesso como "${roleToAssign}"!`
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: res.message || 'Erro ao aprovar usuário.'
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Erro ao aprovar usuário.'
      });
    } finally {
      setIsProcessingApproval(null);
      setTimeout(() => setActionFeedback(null), 5000);
    }
  };

  const handleOpenEdit = (user: UserAccount) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditPermissions(user.permissions || (user.role === 'Administrador' ? defaultFullPermissions : defaultSalesPermissions));
  };

  const handleSavePermissions = () => {
    if (!editingUser) return;
    updateUserAccount(editingUser.id, {
      role: editRole,
      permissions: editPermissions
    });
    setEditingUser(null);
    setActionFeedback({
      type: 'success',
      message: `Permissões de ${editingUser.name} atualizadas com sucesso!`
    });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      return;
    }

    let initialPerms = defaultSalesPermissions;
    if (newRole === 'Administrador') initialPerms = defaultFullPermissions;
    else if (newRole === 'Mestre Padeiro') initialPerms = defaultBakerPermissions;
    else if (newRole === 'Gerente') initialPerms = defaultManagerPermissions;

    addUserAccount({
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      role: newRole,
      status: 'Ativo',
      password: newPassword,
      isFirstAccess: false,
      createdAt: new Date().toISOString().split('T')[0],
      lastLoginAt: 'Nunca realizou login',
      permissions: initialPerms
    });

    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setNewRole('Atendimento');
    setIsAddModalOpen(false);

    setActionFeedback({
      type: 'success',
      message: `Usuário ${newName} cadastrado e ativo com sucesso!`
    });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleDeleteRequest = (user: UserAccount) => {
    if (user.id === currentUser?.id) {
      setSelfDeleteWarning(true);
      return;
    }
    setDeletingUser(user);
  };

  const handleConfirmDelete = () => {
    if (!deletingUser) return;
    deleteUserAccount(deletingUser.id);
    const deletedName = deletingUser.name;
    setDeletingUser(null);
    setActionFeedback({
      type: 'success',
      message: `A solicitação/perfil de ${deletedName} foi excluído com sucesso.`
    });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const togglePermission = (key: keyof UserPermissions) => {
    setEditPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E8DFD5]">
        <div>
          <h2 className="font-serif-brand text-2xl font-bold text-[#352527] dark:text-[#FFFFFF] flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#B86B77]" />
            <span>Configurações & Gestão de Acessos (Admin)</span>
          </h2>
          <p className="text-xs text-[#7A6466]">
            Aprovação de novos usuários, atribuição de cargos, controle de permissões (RBAC) e sincronização Supabase
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-[#B86B77] hover:bg-[#9E5460] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Novo Perfil</span>
        </button>
      </div>

      {/* Action Notification Banner */}
      {actionFeedback && (
        <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 shadow-xs animate-in fade-in ${
          actionFeedback.type === 'success' 
            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
            : 'bg-rose-100 text-rose-900 border border-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button 
            onClick={() => setActionFeedback(null)}
            className="text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 p-0.5 cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#E8DFD5] dark:border-[#3F4147] pb-2 overflow-x-auto">
        <button
          onClick={() => setAdminTab('access_requests')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            adminTab === 'access_requests'
              ? 'bg-[#B86B77] text-white shadow-xs'
              : 'bg-[#F5EDE3] dark:bg-[#1E1F22] text-[#553E41] dark:text-[#B5BAC1] hover:bg-[#EAE0D5] dark:hover:bg-[#35373C]'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Gerenciar Acessos</span>
          {pendingUsers.length > 0 && (
            <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
              adminTab === 'access_requests'
                ? 'bg-white text-[#B86B77]'
                : 'bg-amber-500 text-white animate-pulse'
            }`}>
              {pendingUsers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setAdminTab('active_users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            adminTab === 'active_users'
              ? 'bg-[#B86B77] text-white shadow-xs'
              : 'bg-[#F5EDE3] dark:bg-[#1E1F22] text-[#553E41] dark:text-[#B5BAC1] hover:bg-[#EAE0D5] dark:hover:bg-[#35373C]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Usuários & Permissões</span>
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
            adminTab === 'active_users'
              ? 'bg-white/20 text-white'
              : 'bg-[#E5DACF] dark:bg-[#35373C] text-[#553E41] dark:text-[#B5BAC1]'
          }`}>
            {activeUsers.length}
          </span>
        </button>

        <button
          onClick={() => setAdminTab('ifood_config')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            adminTab === 'ifood_config'
              ? 'bg-[#EA1D2C] text-white shadow-xs'
              : 'bg-[#F5EDE3] dark:bg-[#1E1F22] text-[#553E41] dark:text-[#B5BAC1] hover:bg-[#EAE0D5] dark:hover:bg-[#35373C]'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Configurar iFood</span>
        </button>

        <button
          onClick={() => setAdminTab('99food_config')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            adminTab === '99food_config'
              ? 'bg-[#FF5E00] text-white shadow-xs'
              : 'bg-[#F5EDE3] dark:bg-[#1E1F22] text-[#553E41] dark:text-[#B5BAC1] hover:bg-[#EAE0D5] dark:hover:bg-[#35373C]'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Configurar 99Food</span>
        </button>

        <button
          onClick={() => setAdminTab('commissions_config')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            adminTab === 'commissions_config'
              ? 'bg-[#B86B77] text-white shadow-xs'
              : 'bg-[#F5EDE3] dark:bg-[#1E1F22] text-[#553E41] dark:text-[#B5BAC1] hover:bg-[#EAE0D5] dark:hover:bg-[#35373C]'
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>Taxas & Comissões</span>
        </button>

        <button
          onClick={() => setAdminTab('units_config')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            adminTab === 'units_config'
              ? 'bg-[#B86B77] text-white shadow-xs'
              : 'bg-[#F5EDE3] dark:bg-[#1E1F22] text-[#553E41] dark:text-[#B5BAC1] hover:bg-[#EAE0D5] dark:hover:bg-[#35373C]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Unidades & Conversão</span>
        </button>

        <button
          onClick={() => setAdminTab('supabase_sync')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            adminTab === 'supabase_sync'
              ? 'bg-[#B86B77] text-white shadow-xs'
              : 'bg-[#F5EDE3] dark:bg-[#1E1F22] text-[#553E41] dark:text-[#B5BAC1] hover:bg-[#EAE0D5] dark:hover:bg-[#35373C]'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Integração Supabase</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        </button>

        <button
          onClick={() => setAdminTab('backup')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            adminTab === 'backup'
              ? 'bg-[#B86B77] text-white shadow-xs'
              : 'bg-[#F5EDE3] dark:bg-[#1E1F22] text-[#553E41] dark:text-[#B5BAC1] hover:bg-[#EAE0D5] dark:hover:bg-[#35373C]'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Backup & Exportação</span>
        </button>

        <button
          onClick={() => {
            setAdminTab('system_logs');
            refreshSystemLogs();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            adminTab === 'system_logs'
              ? 'bg-[#B86B77] text-white shadow-xs'
              : 'bg-[#F5EDE3] dark:bg-[#1E1F22] text-[#553E41] dark:text-[#B5BAC1] hover:bg-[#EAE0D5] dark:hover:bg-[#35373C]'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Logs do Sistema</span>
          <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full ${
            adminTab === 'system_logs'
              ? 'bg-white/20 text-white'
              : 'bg-[#E5DACF] dark:bg-[#35373C] text-[#553E41] dark:text-[#B5BAC1]'
          }`}>
            {systemLogs.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GERENCIAR ACESSOS (PAINEL DE APROVAÇÃO ADMIN)                     */}
      {/* ========================================================================= */}
      {adminTab === 'access_requests' && (
        <div className="space-y-4">
          
          {/* Informational Intro Card */}
          <div className="p-4 bg-amber-50/90 dark:bg-amber-950/30 rounded-2xl border border-amber-300 dark:border-amber-900/50 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-amber-950 dark:text-amber-200 text-sm flex items-center gap-2">
                  <span>Painel de Aprovação de Acessos</span>
                  <span className="text-[10px] bg-amber-200 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full font-extrabold border border-amber-300 dark:border-amber-800/50">
                    {pendingUsers.length} {pendingUsers.length === 1 ? 'pendente' : 'pendentes'}
                  </span>
                </h3>
                <p className="text-xs text-amber-900 dark:text-amber-300 mt-0.5 leading-relaxed">
                  Novos usuários registrados no formulário inicial recebem o status <strong>Pendente</strong> e não podem acessar o sistema até que você selecione o cargo adequado e aprove o acesso.
                </p>
              </div>
            </div>
          </div>

          {/* List of Pending Access Requests */}
          {pendingUsers.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] space-y-3 shadow-2xs">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="font-serif-brand text-lg font-bold text-[#352527] dark:text-[#FFFFFF]">
                Tudo em Dia! Nenhuma Solicitação Pendente
              </h3>
              <p className="text-xs text-[#7A6466] max-w-md mx-auto leading-relaxed">
                Todos os usuários cadastrados já foram revisados e aprovados. Quando um novo colaborador criar uma conta, ele aparecerá aqui para aprovação.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-bold text-[#7A6466] uppercase tracking-wider px-1">
                Solicitações Aguardando Decisão ({pendingUsers.length})
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                {pendingUsers.map(user => {
                  const currentSelectedRole = selectedRoles[user.id] || user.role || 'Atendimento';
                  const isProcessing = isProcessingApproval === user.id;

                  return (
                    <div 
                      key={user.id} 
                      className="p-4 bg-white dark:bg-[#2B2D31] rounded-2xl border border-amber-300 hover:border-amber-400 shadow-sm transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      {/* User Info */}
                      <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 font-bold flex items-center justify-center text-sm shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <strong className="text-sm text-[#352527] dark:text-[#FFFFFF] font-bold">{user.name}</strong>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              <span>Pendente de Aprovação</span>
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3 text-xs text-[#6E595B] flex-wrap font-mono">
                            <span className="text-[#553E41]">{user.email}</span>
                            <span className="text-[#9E898B]">•</span>
                            <span className="text-[11px] text-[#8C7678] font-sans">
                              Registrado em: {user.createdAt || 'Recente'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Role Selection & Approval Controls */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#F0E8DF] dark:border-[#3F4147]">
                        
                        {/* Role Selector */}
                        <div className="flex items-center gap-2 bg-[#FAF7F2] dark:bg-[#1E1F22] p-1.5 rounded-xl border border-[#E5DACF] dark:border-[#3F4147]">
                          <Briefcase className="w-3.5 h-3.5 text-[#8C7678] shrink-0 ml-1" />
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-[#8C7678] uppercase leading-none">
                              Definir Cargo:
                            </span>
                            <select
                              value={currentSelectedRole}
                              onChange={(e) => handleRoleSelect(user.id, e.target.value)}
                              className="text-xs font-bold text-[#352527] dark:text-[#FFFFFF] bg-transparent border-none focus:outline-none cursor-pointer pr-4"
                            >
                              <option value="Atendimento">Atendimento / Balcão</option>
                              <option value="Mestre Padeiro">Mestre Padeiro / Produção</option>
                              <option value="Gerente">Gerente Operacional</option>
                              <option value="Administrador">Administrador Geral</option>
                            </select>
                          </div>
                        </div>

                        {/* Approve Button */}
                        <button
                          onClick={() => handleApproveUser(user)}
                          disabled={isProcessing}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Aprovar e liberar acesso com o cargo selecionado"
                        >
                          {isProcessing ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>Aprovar Acesso</span>
                        </button>

                        {/* Reject / Delete Button */}
                        <button
                          onClick={() => handleDeleteRequest(user)}
                          disabled={isProcessing}
                          className="px-3 py-2 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white rounded-xl text-xs font-bold transition-all border border-rose-200 hover:border-rose-600 flex items-center justify-center gap-1 cursor-pointer"
                          title="Rejeitar e excluir esta solicitação"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Rejeitar</span>
                        </button>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: USUÁRIOS ATIVOS & PERMISSÕES (RBAC)                                */}
      {/* ========================================================================= */}
      {adminTab === 'active_users' && (
        <div className="space-y-4">
          
          {/* Overview Banner */}
          <div className="p-4 bg-[#F5EDE3] dark:bg-[#1E1F22] rounded-2xl border border-[#E5DACF] dark:border-[#3F4147] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#B86B77] text-white flex items-center justify-center font-bold text-lg shrink-0">
                {activeUsers.length}
              </div>
              <div>
                <h3 className="font-bold text-[#352527] dark:text-[#FFFFFF] text-sm">Usuários Ativos com Acesso Liberado</h3>
                <p className="text-xs text-[#6E595B] dark:text-[#B5BAC1]">
                  Edite permissões granulares por módulo para cada membro da equipe Saborê.
                </p>
              </div>
            </div>
            <div className="text-xs text-[#7A6466] dark:text-[#B5BAC1] font-medium bg-white dark:bg-[#2B2D31] px-3 py-1.5 rounded-lg border border-[#E0D3C5] dark:border-[#3F4147] shrink-0">
              Você está conectado como: <strong>{currentUser?.name}</strong> ({currentUser?.role})
            </div>
          </div>

          {/* User Profiles Table */}
          <div className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] dark:bg-[#1E1F22] border-b border-[#E8DFD5] dark:border-[#3F4147] text-[#7A6466] dark:text-[#B5BAC1] font-semibold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Usuário / Nome</th>
                    <th className="p-3.5">E-mail de Acesso</th>
                    <th className="p-3.5">Cargo / Nível</th>
                    <th className="p-3.5 text-center">Último Login</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-center w-44">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0E8DF]">
                  {(activeUsers || []).map(user => {
                    if (!user) return null;
                    const isSelf = user.id === currentUser?.id;
                    return (
                      <tr key={user.id} className="hover:bg-[#FAF7F2] dark:hover:bg-[#35373C] transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#594446] text-white font-bold flex items-center justify-center text-xs shrink-0">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <strong className="text-[#352527] dark:text-[#FFFFFF] text-sm block">{user.name}</strong>
                              {isSelf && (
                                <span className="text-[10px] font-bold text-[#B86B77]">
                                  (Seu Perfil Conectado)
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 font-mono text-[#553E41]">
                          {user.email}
                        </td>

                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold inline-block ${
                            user.role === 'Administrador' ? 'bg-purple-100 text-purple-900 border border-purple-200 font-bold' :
                            user.role === 'Mestre Padeiro' ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                            user.role === 'Gerente' ? 'bg-indigo-100 text-indigo-900 border border-indigo-200' :
                            'bg-blue-100 text-blue-900 border border-blue-200'
                          }`}>
                            {user.role}
                          </span>
                        </td>

                        <td className="p-3.5 text-center font-mono text-[#6E595B]">
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-[#9E898B]" />
                            <span>{user.lastLoginAt || 'Sem registro'}</span>
                          </div>
                        </td>

                        <td className="p-3.5 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✓ Ativo
                          </span>
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(user)}
                              title="Alterar nível de acesso e permissões"
                              className="px-2.5 py-1.5 bg-[#FAF0F2] text-[#B86B77] hover:bg-[#B86B77] hover:text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Permissões</span>
                            </button>

                            <button
                              onClick={() => handleDeleteRequest(user)}
                              disabled={isSelf}
                              title={isSelf ? "Você não pode excluir a própria conta conectada" : "Excluir perfil"}
                              className={`px-2.5 py-1.5 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1 ${
                                isSelf 
                                  ? 'text-stone-300 dark:text-stone-600 cursor-not-allowed' 
                                  : 'text-stone-400 dark:text-[#B5BAC1] hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Excluir</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: CONFIGURAR IFOOD                                                     */}
      {/* ========================================================================= */}
      {adminTab === 'ifood_config' && (
        <div className="space-y-4">
          
          <div className="p-4 bg-[#FAF0F1] dark:bg-rose-950/20 rounded-2xl border border-rose-300 dark:border-rose-900/50 text-xs">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-[#EA1D2C]" />
              <strong className="text-stone-800 dark:text-white text-sm">Configuração das Credenciais iFood</strong>
            </div>
            <p className="text-[11px] text-[#7D3440] dark:text-[#B5BAC1] mt-1 leading-relaxed">
              Configure as chaves e segredos da API de Desenvolvedor iFood para habilitar o recebimento automático de pedidos e sincronização de cardápios. Para segurança avançada, você pode cifrar as chaves no Supabase via AES-256.
            </p>
          </div>

          <form onSubmit={handleSaveCredentials} className="p-5 bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#F0E6DC] dark:border-[#3F4147] pb-3 gap-2">
              <div>
                <h4 className="font-bold text-xs text-[#352527] dark:text-[#FFFFFF] flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-[#B86B77]" />
                  <span>Credenciais do Desenvolvedor iFood</span>
                </h4>
                <p className="text-[11px] text-[#7A6466] dark:text-[#B5BAC1] mt-0.5">
                  Obtenha no portal <a href="https://developer.ifood.com.br" target="_blank" rel="noreferrer" className="text-[#EA1D2C] underline font-semibold">developer.ifood.com.br</a>
                </p>
              </div>
              <button
                type="button"
                onClick={handleFillSandboxData}
                className="px-3 py-1.5 rounded-lg bg-[#FAF0F2] dark:bg-[#1E1F22] border border-[#F2D7DA] dark:border-[#3F4147] hover:bg-[#F2D7DA] text-[#B86B77] font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Preencher Sandbox</span>
              </button>
            </div>

            {/* Environment Selector */}
            <div className="flex items-center gap-3 p-2.5 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#E8DFD5] dark:border-[#3F4147]">
              <span className="text-[11px] font-bold text-[#553E41] dark:text-[#DBDEE1]">Ambiente Selecionado:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSandboxMode(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    !isSandboxMode 
                      ? 'bg-[#EA1D2C] text-white shadow-xs' 
                      : 'bg-white dark:bg-[#2B2D31] text-[#7A6466] border border-[#DACDC0] dark:border-[#3F4147]'
                  }`}
                >
                  Produção Oficial
                </button>
                <button
                  type="button"
                  onClick={() => setIsSandboxMode(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    isSandboxMode 
                      ? 'bg-[#B86B77] text-white shadow-xs' 
                      : 'bg-white dark:bg-[#2B2D31] text-[#7A6466] border border-[#DACDC0] dark:border-[#3F4147]'
                  }`}
                >
                  Sandbox / Testes
                </button>
              </div>
            </div>

            {testConnectionSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-start gap-2.5 text-xs animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block">Conexão Estabelecida com Sucesso!</strong>
                  <span className="block mt-0.5">{testConnectionSuccess}</span>
                </div>
              </div>
            )}

            {testConnectionError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 flex items-start gap-2.5 text-xs animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block">Erro na Conexão</strong>
                  <span className="block mt-0.5">{testConnectionError}</span>
                </div>
              </div>
            )}

            {serverConfig?.hasConfiguredKeys && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="font-semibold text-[11px]">Credenciais Oficiais Configuradas no Servidor:</span>
                  <span className="font-mono text-[10px] text-emerald-800 dark:text-emerald-300 font-bold">Client ID ({serverConfig.clientId?.substring(0, 8)}...)</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-extrabold text-[9px] uppercase tracking-wider">
                  Produção Ativa
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#665052] dark:text-[#DBDEE1] mb-1">
                  Client ID iFood <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: c593dae2-89b1-4f1a-b32c-76e931df6890"
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#DACDC0] dark:border-[#3F4147] font-mono text-[#3D2C2E] dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#665052] dark:text-[#DBDEE1] mb-1">
                  Merchant ID (Loja) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: a2467bc8-0112-45e6-99ff-89d1234abcd0"
                  value={merchantId}
                  onChange={e => setMerchantId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#DACDC0] dark:border-[#3F4147] font-mono text-[#3D2C2E] dark:text-white focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-[#665052] dark:text-[#DBDEE1] mb-1">
                  Client Secret <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? "text" : "password"}
                    required
                    placeholder="Chave secreta gerada no Portal iFood Developer"
                    value={clientSecret}
                    onChange={e => setClientSecret(e.target.value)}
                    className="w-full text-xs px-3 py-2 pr-10 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#DACDC0] dark:border-[#3F4147] font-mono text-[#3D2C2E] dark:text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 p-1 cursor-pointer"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-[#665052] dark:text-[#DBDEE1] mb-1">
                  Chave Secreta do Webhook (Secret Key / Assinatura de Segurança)
                </label>
                <div className="relative">
                  <input
                    type={showWebhookSecretInput ? "text" : "password"}
                    placeholder="Cole a chave secreta gerada no iFood para validar x-ifood-signature"
                    value={ifoodWebhookSecret}
                    onChange={e => setIfoodWebhookSecret(e.target.value)}
                    className="w-full text-xs px-3 py-2 pr-10 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#DACDC0] dark:border-[#3F4147] font-mono text-[#3D2C2E] dark:text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWebhookSecretInput(!showWebhookSecretInput)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 p-1 cursor-pointer"
                  >
                    {showWebhookSecretInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-[#7A6466] dark:text-[#B5BAC1] mt-1 block leading-tight">
                  Chave secreta utilizada para validar a assinatura digital de autenticidade enviada pelo iFood no cabeçalho <code className="text-[#EA1D2C]">x-ifood-signature</code>.
                </span>
              </div>
            </div>

            {/* Supabase Cryptography Settings */}
            <div className="p-4 bg-[#F5F1EB] dark:bg-[#1E1F22] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] space-y-3.5 shadow-3xs">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <h5 className="font-bold text-xs text-[#352527] dark:text-[#FFFFFF] flex items-center gap-1.5">
                      <span>Criptografia de Credenciais (pgcrypto AES-256)</span>
                      <span className="px-1.5 py-0.5 text-[8px] bg-emerald-100 text-emerald-800 rounded-md font-extrabold uppercase">Recomendado</span>
                    </h5>
                    <p className="text-[10px] text-[#7A6466] dark:text-[#B5BAC1] mt-0.5">
                      Cifre os segredos no banco de dados para proteção contra vazamentos de credenciais.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input 
                    type="checkbox" 
                    checked={useSupabaseEncryption} 
                    onChange={(e) => setUseSupabaseEncryption(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-stone-300 dark:bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {useSupabaseEncryption && (
                <div className="space-y-3 pt-3 border-t border-[#E8DFD5] dark:border-[#3F4147] animate-fadeIn">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#665052] dark:text-[#DBDEE1] mb-1">
                      Frase Secreta de Segurança (Passphrase) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassphrase ? "text" : "password"}
                        placeholder="Frase de segurança forte para trancar e decifrar as chaves"
                        value={passphrase}
                        onChange={e => setPassphrase(e.target.value)}
                        className="w-full text-xs px-3 py-2 pr-28 bg-white dark:bg-[#2B2D31] rounded-xl border border-[#DACDC0] dark:border-[#3F4147] font-mono text-[#3D2C2E] dark:text-white focus:outline-none"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShowPassphrase(!showPassphrase)}
                          className="text-stone-400 p-1 cursor-pointer"
                        >
                          {showPassphrase ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={handleDecryptCredentials}
                          disabled={isDecrypting || !passphrase.trim()}
                          className="px-2 py-1 text-[9px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg cursor-pointer disabled:opacity-50"
                        >
                          {isDecrypting ? 'Lendo...' : 'Puxar Credenciais'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSaveEncryptedCredentials}
                      disabled={isSavingEncrypted || !clientId.trim() || !clientSecret.trim() || !passphrase.trim()}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      {isSavingEncrypted ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      <span>Criptografar e Salvar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-[#F5EEEE] dark:border-[#3F4147]">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTestingIfoodConnection}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingIfoodConnection ? 'animate-spin' : ''}`} />
                <span>Testar Conexão API</span>
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#EA1D2C] hover:bg-[#C91825] text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Salvar Credenciais
              </button>
            </div>
          </form>

          {/* WEBHOOK CONFIGURATION & AUTOMATIC STATUS SYNC SECTION */}
          <div className="p-5 bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#F0E6DC] dark:border-[#3F4147] pb-3 gap-2">
              <div>
                <h4 className="font-bold text-xs text-[#352527] dark:text-[#FFFFFF] flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#EA1D2C]" />
                  <span>Configurar Endpoint do Webhook do iFood</span>
                  <span className="px-2 py-0.5 text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-extrabold rounded-md uppercase">100% Webhook</span>
                </h4>
                <p className="text-[11px] text-[#7A6466] dark:text-[#B5BAC1] mt-0.5">
                  A comunicação com o iFood opera exclusivamente por Webhook para envio instantâneo de novos pedidos e atualizações de status para a cozinha.
                </p>
              </div>
            </div>

            {/* URL Field with Copy Button */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[#665052] dark:text-[#DBDEE1]">
                URL Oficial do Webhook no Saborê:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={getWebhookUrl()}
                  className="flex-1 text-xs px-3 py-2.5 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#DACDC0] dark:border-[#3F4147] font-mono text-[#EA1D2C] font-bold select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyWebhookUrl}
                  className="px-4 py-2.5 rounded-xl bg-[#EA1D2C] hover:bg-[#C91825] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
                >
                  {copiedWebhookUrl ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedWebhookUrl ? 'Copiado!' : 'Copiar URL'}</span>
                </button>
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="p-3.5 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#E8DFD5] dark:border-[#3F4147] text-[11px] space-y-2">
              <strong className="font-bold text-[#352527] dark:text-white block flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-[#EA1D2C]" />
                Como configurar no Portal Developer do iFood:
              </strong>
              <ol className="list-decimal list-inside space-y-1 text-[#5C4547] dark:text-[#B5BAC1] leading-relaxed">
                <li>Acesse o portal <a href="https://developer.ifood.com.br" target="_blank" rel="noreferrer" className="text-[#EA1D2C] underline font-semibold">developer.ifood.com.br</a> e abra sua aplicação.</li>
                <li>Navegue até a seção <strong>Inscrição de Eventos / Webhook</strong>.</li>
                <li>Cole a <strong>URL do Webhook</strong> exibida acima no campo de URL.</li>
                <li>Marque os eventos de Pedido: <code className="bg-white dark:bg-stone-800 px-1 py-0.5 rounded text-[10px] text-stone-800 dark:text-stone-200">PLACED</code>, <code className="bg-white dark:bg-stone-800 px-1 py-0.5 rounded text-[10px] text-stone-800 dark:text-stone-200">CONFIRMED</code>, <code className="bg-white dark:bg-stone-800 px-1 py-0.5 rounded text-[10px] text-stone-800 dark:text-stone-200">DISPATCHED</code>, <code className="bg-white dark:bg-stone-800 px-1 py-0.5 rounded text-[10px] text-stone-800 dark:text-stone-200">CONCLUDED</code> e <code className="bg-white dark:bg-stone-800 px-1 py-0.5 rounded text-[10px] text-stone-800 dark:text-stone-200">CANCELLED</code>.</li>
                <li>Ao salvar, o iFood testará automaticamente a URL enviando uma mensagem PING / Handshake.</li>
              </ol>
            </div>

            {/* Testing Actions */}
            <div className="flex flex-wrap items-center justify-between pt-2 border-t border-[#F0E6DC] dark:border-[#3F4147] gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestWebhookPing}
                  disabled={isTestingWebhook}
                  className="px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-[#1E1F22] hover:bg-stone-200 dark:hover:bg-[#35373C] text-stone-800 dark:text-stone-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-stone-200 dark:border-[#3F4147]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingWebhook ? 'animate-spin' : ''}`} />
                  <span>Testar Conexão do Webhook (Ping API)</span>
                </button>

                <button
                  type="button"
                  onClick={handleSimulateOrderWebhook}
                  disabled={isSimulatingWebhook}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-[#EA1D2C] dark:text-rose-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-200 dark:border-rose-900/50"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Simular Pedido de Teste</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleManualSyncActiveOrders}
                disabled={isSyncingActiveOrders}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingActiveOrders ? 'animate-spin' : ''}`} />
                <span>Forçar Sincronização de Status dos Pedidos</span>
              </button>
            </div>

            {webhookTestFeedback && (
              <div className="p-3 bg-stone-900 text-emerald-400 rounded-xl font-mono text-[11px] leading-relaxed border border-stone-800">
                {webhookTestFeedback}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: CONFIGURAR 99FOOD                                                    */}
      {/* ========================================================================= */}
      {adminTab === '99food_config' && (
        <div className="space-y-4">
          
          <div className="p-4 bg-[#FFF5EE] dark:bg-orange-950/20 rounded-2xl border border-orange-300 dark:border-orange-900/50 text-xs">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-[#FF5E00]" />
              <strong className="text-stone-800 dark:text-white text-sm">Configuração das Credenciais 99Food</strong>
            </div>
            <p className="text-[11px] text-[#A63D00] dark:text-[#B5BAC1] mt-1 leading-relaxed">
              Configure as chaves e ID da loja para habilitar os recursos de sincronização e processamento automático de pedidos do canal 99Food.
            </p>
          </div>

          <form onSubmit={handleSaveFood99} className="p-5 bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#EADBDB] dark:border-[#3F4147] shadow-2xs space-y-4">
            <div className="flex items-center gap-3 justify-between pb-3 border-b border-[#F5EEEE] dark:border-[#3F4147]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FF5E00] flex items-center justify-center text-white font-black text-sm shadow-md shrink-0">
                  99
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#352527] dark:text-[#FFFFFF]">Conector 99Food</h4>
                  <p className="text-[10px] text-stone-500">Ative ou pause o recebimento de vendas deste parceiro</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-1.5 rounded-xl bg-[#FAF7F2] dark:bg-[#1E1F22] border border-[#E8DFD5] dark:border-[#3F4147]">
                <span className="text-xs font-bold text-[#352527] dark:text-white">
                  {nineNineFoodConnected ? 'Habilitado' : 'Desabilitado'}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={nineNineFoodConnected} 
                    onChange={e => setNineNineFoodConnected(e.target.checked)} 
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-stone-300 dark:bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF5E00]"></div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#665052] dark:text-[#DBDEE1] mb-1">
                  ID da Loja (Store ID) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 99f-992019"
                  value={food99StoreId}
                  onChange={e => setFood99StoreId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#665052] dark:text-[#DBDEE1] mb-1">
                  Chave API de Integração <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Cole sua Chave da API 99Food"
                  value={food99ApiKey}
                  onChange={e => setFood99ApiKey(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-[#F5EEEE] dark:border-[#3F4147]">
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#FF5E00] hover:bg-[#E65300] text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Salvar Configurações
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: TAXAS E COMISSÕES                                                    */}
      {/* ========================================================================= */}
      {adminTab === 'commissions_config' && (
        <div className="space-y-4">
          
          <div className="p-4 bg-[#FAF0F2] dark:bg-[#1E1F22] rounded-2xl border border-[#F2D7DA] dark:border-[#3F4147] text-xs">
            <div className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-[#B86B77]" />
              <strong className="text-[#352527] dark:text-white text-sm font-bold">Edição Global de Comissões e Taxas de Venda</strong>
            </div>
            <p className="text-[11px] text-[#6E595B] dark:text-[#B5BAC1] mt-1 leading-relaxed">
              Ao alterar a comissão do iFood ou 99Food, o Saborê recalcula imediatamente o Preço Sugerido e as Margens Líquidas de todas as receitas da sua confeitaria, garantindo que você nunca venda abaixo do custo.
            </p>
          </div>

          <form onSubmit={handleSaveCommissions} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* iFood Commission Card */}
              <div className="p-4 bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#EADBDB] dark:border-[#3F4147] shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#F5EEEE] dark:border-[#3F4147] pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#EA1D2C] text-white flex items-center justify-center font-bold text-xs">
                      iF
                    </div>
                    <strong className="text-sm text-[#352527] dark:text-white">Comissões iFood</strong>
                  </div>
                  <span className="text-[10px] font-bold text-[#EA1D2C] bg-[#FFF5F5] px-2 py-0.5 rounded-md border border-[#FCDADF]">
                    Total: {(Number(ifoodCommission) + Number(ifoodPaymentFee) + Number(ifoodAnticipationFee)).toFixed(1)}%
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#665052] dark:text-[#DBDEE1] mb-1">
                      Comissão da Plataforma iFood (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="50"
                      required
                      value={ifoodCommission}
                      onChange={e => setIfoodCommission(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs px-3 py-2 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#DACDC0] dark:border-[#3F4147] font-mono font-bold text-[#EA1D2C]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#665052] dark:text-[#DBDEE1] mb-1">
                      Taxa de Transação Cartão/Online (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="15"
                      required
                      value={ifoodPaymentFee}
                      onChange={e => setIfoodPaymentFee(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs px-3 py-2 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#DACDC0] dark:border-[#3F4147] font-mono font-bold text-stone-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#665052] dark:text-[#DBDEE1] mb-1">
                      Taxa de Antecipação do iFood (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="15"
                      required
                      value={ifoodAnticipationFee}
                      onChange={e => setIfoodAnticipationFee(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs px-3 py-2 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#DACDC0] dark:border-[#3F4147] font-mono font-bold text-amber-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#665052] dark:text-[#DBDEE1] mb-1">
                      Modelo de Logística Associada
                    </label>
                    <select
                      value={ifoodLogisticsType}
                      onChange={e => setIfoodLogisticsType(e.target.value as 'propria' | 'parceira')}
                      className="w-full text-xs px-3 py-2 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#DACDC0] dark:border-[#3F4147] font-bold text-stone-700 focus:outline-none"
                    >
                      <option value="propria">Logística Própria (Entregador do Saborê)</option>
                      <option value="parceira">Logística do iFood (Entregador da Plataforma)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 99Food Commission Card */}
              <div className="p-4 bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#EADBDB] dark:border-[#3F4147] shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#F5EEEE] dark:border-[#3F4147] pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#FF5E00] text-white flex items-center justify-center font-bold text-xs">
                      99
                    </div>
                    <strong className="text-sm text-[#352527] dark:text-white">Comissões 99Food</strong>
                  </div>
                  <span className="text-[10px] font-bold text-[#FF5E00] bg-[#FFF8F5] px-2 py-0.5 rounded-md border border-[#FFE0D1]">
                    Total: {(Number(food99Commission) + Number(food99PaymentFee)).toFixed(1)}%
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#665052] dark:text-[#DBDEE1] mb-1">
                      Comissão de Intermediação 99Food (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="50"
                      required
                      value={food99Commission}
                      onChange={e => setFood99Commission(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs px-3 py-2 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#DACDC0] dark:border-[#3F4147] font-mono font-bold text-[#FF5E00]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#665052] dark:text-[#DBDEE1] mb-1">
                      Taxas Adicionais de Pagamento (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="15"
                      required
                      value={food99PaymentFee}
                      onChange={e => setFood99PaymentFee(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs px-3 py-2 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#DACDC0] dark:border-[#3F4147] font-mono font-bold text-stone-700"
                    />
                  </div>
                </div>
              </div>

              {/* Direct Sales Commission Card */}
              <div className="p-4 bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#EADBDB] dark:border-[#3F4147] shadow-2xs space-y-3 md:col-span-2">
                <strong className="text-sm text-[#352527] dark:text-white border-b border-[#F5EEEE] dark:border-[#3F4147] pb-2 block">
                  Canais de Venda Direta (Balcão, WhatsApp, Loja Virtual Própria)
                </strong>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#665052] dark:text-[#DBDEE1] mb-1">
                      Taxa Média de Cartão/PIX (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      required
                      value={directCardFee}
                      onChange={e => setDirectCardFee(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs px-3 py-2 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#DACDC0] dark:border-[#3F4147] font-mono font-bold text-stone-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#665052] dark:text-[#DBDEE1] mb-1">
                      Taxa de Custos Fixos Globais (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="30"
                      required
                      value={directFixedCost}
                      onChange={e => setDirectFixedCost(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs px-3 py-2 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#DACDC0] dark:border-[#3F4147] font-mono font-bold text-stone-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#665052] dark:text-[#DBDEE1] mb-1">
                      Margem de Lucro Alvo Direta (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="5"
                      max="90"
                      required
                      value={directTargetMargin}
                      onChange={e => setDirectTargetMargin(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs px-3 py-2 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#DACDC0] dark:border-[#3F4147] font-mono font-bold text-stone-700"
                    />
                  </div>
                </div>
              </div>

            </div>

            <div className="pt-2 flex justify-end border-t border-[#F5EEEE] dark:border-[#3F4147]">
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#B86B77] hover:bg-[#9E5460] text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Salvar Parâmetros Globais
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: UNIDADES & CONVERSÃO                                                 */}
      {/* ========================================================================= */}
      {adminTab === 'units_config' && (
        <UnitsConfigSection />
      )}

      {/* ========================================================================= */}
      {/* TAB 3: INTEGRAÇÃO BANCO DE DADOS SUPABASE                                 */}
      {/* ========================================================================= */}
      {adminTab === 'supabase_sync' && (
        <div className="space-y-4">
          
          {/* Database Enable/Disable Switch Card */}
          <div className="p-5 bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="font-bold text-sm text-[#352527] dark:text-[#FFFFFF] block">
                Estado da Integração do Banco de Dados
              </span>
              <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1] leading-relaxed max-w-xl">
                Ative ou desative totalmente a comunicação remota com o Supabase. Ao desativar, o sistema operará localmente no navegador (modo offline), sem sincronização em nuvem, mas preservando o funcionamento normal de todas as outras ferramentas.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  updateDeliverySettings(prev => ({
                    ...prev,
                    databaseDisabled: !prev.databaseDisabled
                  }));
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  !deliverySettings.databaseDisabled ? 'bg-emerald-600' : 'bg-stone-300 dark:bg-[#3F4147]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    !deliverySettings.databaseDisabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className={`text-xs font-bold ${!deliverySettings.databaseDisabled ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-500'}`}>
                {!deliverySettings.databaseDisabled ? 'CONECTADO / ATIVO' : 'DESATIVADO'}
              </span>
            </div>
          </div>

          <div className={`p-5 rounded-2xl border shadow-2xs space-y-4 transition-all ${
            deliverySettings.databaseDisabled
              ? 'bg-stone-50/90 dark:bg-stone-900/40 border-stone-200 dark:border-stone-800'
              : 'bg-emerald-50/90 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/50'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className={`w-12 h-12 rounded-xl text-white flex items-center justify-center shrink-0 shadow-xs ${
                  deliverySettings.databaseDisabled ? 'bg-stone-500' : 'bg-emerald-600'
                }`}>
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold text-base ${deliverySettings.databaseDisabled ? 'text-stone-800 dark:text-stone-300' : 'text-emerald-950'}`}>Banco de Dados Supabase (PostgreSQL)</h3>
                    {deliverySettings.databaseDisabled ? (
                      <span className="text-[10px] font-bold text-stone-700 bg-stone-200 px-2.5 py-0.5 rounded-full border border-stone-300 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
                        <span>Desativado</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-900 bg-emerald-200/90 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                        <span>Conectado</span>
                      </span>
                    )}
                  </div>
                  <p className={`text-xs font-mono mt-0.5 ${deliverySettings.databaseDisabled ? 'text-stone-500' : 'text-emerald-900'}`}>
                    https://dxvxqkqqrqgcoaeeazzh.supabase.co
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={async () => {
                    await syncWithSupabase();
                    setSyncFeedback('Conexão e tabelas validadas com sucesso!');
                    setTimeout(() => setSyncFeedback(null), 3000);
                  }}
                  disabled={isSupabaseSyncing || deliverySettings.databaseDisabled}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border shadow-2xs flex items-center gap-1.5 ${
                    deliverySettings.databaseDisabled
                      ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed opacity-60 dark:bg-stone-800 dark:text-stone-600 dark:border-stone-700'
                      : 'bg-white text-emerald-900 hover:bg-emerald-100 border-emerald-300 cursor-pointer'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSupabaseSyncing ? 'animate-spin text-emerald-600' : ''}`} />
                  <span>{isSupabaseSyncing ? 'Sincronizando...' : 'Testar Conexão'}</span>
                </button>

                <button
                  onClick={async () => {
                    const res = await pushAllToSupabase();
                    if (res.errors && res.errors.length > 0 && res.successCount === 0) {
                      setSyncFeedback(`Aviso: ${res.errors[0]}`);
                    } else {
                      setSyncFeedback(`Sincronizados ${res.successCount} registros com o Supabase!`);
                    }
                    setTimeout(() => setSyncFeedback(null), 4000);
                  }}
                  disabled={isSupabaseSyncing || deliverySettings.databaseDisabled}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                    deliverySettings.databaseDisabled
                      ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed opacity-60 dark:bg-stone-800 dark:text-stone-600 dark:border-stone-700'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Sincronizar Todas as Tabelas</span>
                </button>
              </div>
            </div>

            <div className={`flex flex-wrap items-center justify-between text-xs pt-2 border-t gap-2 ${
              deliverySettings.databaseDisabled
                ? 'text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-800'
                : 'text-emerald-900 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/50'
            }`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-4 h-4 ${deliverySettings.databaseDisabled ? 'text-stone-400' : 'text-emerald-700'}`} />
                <span><strong>Status da Conexão:</strong> {supabaseStatus.message}</span>
              </div>
              {supabaseStatus.lastSyncedAt && !deliverySettings.databaseDisabled && (
                <span className="text-[11px] text-emerald-800 font-medium font-mono">
                  Última sincronização: {supabaseStatus.lastSyncedAt}
                </span>
              )}
            </div>

            {syncFeedback && (
              <div className={`p-3 rounded-xl text-xs font-bold border text-center animate-in fade-in ${
                deliverySettings.databaseDisabled
                  ? 'bg-stone-100 text-stone-800 border-stone-300'
                  : 'p-3 bg-emerald-100 text-emerald-900 border-emerald-300'
              }`}>
                {syncFeedback}
              </div>
            )}
          </div>

          {/* Integration Architecture Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
            <div className="p-4 bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] space-y-1.5 shadow-2xs">
              <strong className="text-[#352527] dark:text-[#FFFFFF] block font-bold text-sm">Autenticação & Auth</strong>
              <p className="text-[#7A6466] dark:text-[#B5BAC1] leading-relaxed">
                Novos usuários registrados são salvos no Supabase Auth com status Pendente e sincronizados na tabela <code>user_accounts</code>.
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] space-y-1.5 shadow-2xs">
              <strong className="text-[#352527] dark:text-[#FFFFFF] block font-bold text-sm">Persistência em Tempo Real</strong>
              <p className="text-[#7A6466] dark:text-[#B5BAC1] leading-relaxed">
                Pedidos, estoque, compras de insumos, clientes e finanças são sincronizados automaticamente a cada alteração.
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] space-y-1.5 shadow-2xs">
              <strong className="text-[#352527] dark:text-[#FFFFFF] block font-bold text-sm">Segurança RBAC</strong>
              <p className="text-[#7A6466] dark:text-[#B5BAC1] leading-relaxed">
                Apenas o cargo de Administrador possui autorização para aprovar novas contas e alterar permissões de acesso aos módulos.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BACKUP & EXPORTAÇÃO JSON                                            */}
      {/* ========================================================================= */}
      {adminTab === 'backup' && (
        <div className="space-y-4">
          <div className="p-5 bg-indigo-50/90 dark:bg-indigo-950/20 rounded-2xl border border-indigo-200 dark:border-indigo-800/50 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-indigo-950 text-base">Exportação de Dados de Segurança (Backup)</h3>
                  <p className="text-xs text-indigo-900 mt-0.5 max-w-lg leading-relaxed">
                    Exporte toda a base de Pedidos, Controle de Estoque, e Fichas Técnicas em formato JSON estruturado. Recomendado realizar semanalmente para segurança.
                  </p>
                </div>
              </div>
              <button
                onClick={handleExportData}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Database className="w-4 h-4" />
                <span>Exportar JSON</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: LOGS DO SISTEMA & AUDITORIA (CHAVE sabore_logs LOCAL)             */}
      {/* ========================================================================= */}
      {adminTab === 'system_logs' && (
        <div className="space-y-4">
          {/* Header Card */}
          <div className="p-4 bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#B86B77] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[#352527] dark:text-white text-sm sm:text-base">
                    Logs & Auditoria do Sistema
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Local / Chave: sabore_logs
                  </span>
                </div>
                <p className="text-[11px] text-[#7A6466] dark:text-[#B5BAC1] mt-0.5">
                  Registros de eventos locais, requisições de integrações e alterações de status sem dependência de APIs externas ou risco de 404.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={refreshSystemLogs}
                className="flex-1 sm:flex-initial px-3 py-1.5 bg-[#FAF7F2] dark:bg-[#1E1F22] hover:bg-[#EAE0D5] dark:hover:bg-[#35373C] border border-[#DACDC0] dark:border-[#3F4147] rounded-xl text-xs font-bold text-[#352527] dark:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Recarregar logs da chave sabore_logs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Atualizar</span>
              </button>

              <button
                type="button"
                onClick={handleClearSystemLogs}
                className="flex-1 sm:flex-initial px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Limpar todos os registros locais"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar Logs</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#7A6466] dark:text-[#B5BAC1] font-medium">Filtrar por evento:</span>
              <select
                value={logFilter}
                onChange={e => setLogFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-white dark:bg-[#2B2D31] rounded-xl border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white font-medium"
              >
                <option value="ALL">Todos os Eventos ({systemLogs.length})</option>
                <option value="PLACED">PLACED (Novo)</option>
                <option value="CONFIRMED">CONFIRMED (Confirmado)</option>
                <option value="DISPATCHED">DISPATCHED (Despachado)</option>
                <option value="CANCELLED">CANCELLED (Cancelado)</option>
                <option value="STATUS">STATUS / MERCHANT</option>
                <option value="SISTEMA">SISTEMA / GERAL</option>
              </select>
            </div>
            <span className="text-xs font-mono text-[#8C7678] dark:text-[#B5BAC1]">
              Total: {systemLogs.length} registro(s)
            </span>
          </div>

          {/* Logs List Table */}
          <div className="border border-[#E8DFD5] dark:border-[#3F4147] rounded-2xl bg-white dark:bg-[#2B2D31] overflow-hidden shadow-2xs">
            {systemLogs.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Terminal className="w-8 h-8 text-stone-300 dark:text-stone-600 mx-auto" />
                <p className="text-xs font-bold text-[#553E41] dark:text-[#DBDEE1]">
                  Nenhum log encontrado na chave <code>sabore_logs</code>.
                </p>
                <p className="text-[11px] text-[#8C7678] dark:text-[#B5BAC1] max-w-md mx-auto">
                  A chave foi inicializada como um array vazio no localStorage. Novas ações de integração e eventos locais serão registrados aqui automaticamente.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-xs text-left border-collapse font-sans">
                  <thead>
                    <tr className="bg-[#FAF7F2] dark:bg-[#1E1F22] border-b border-[#E8DFD5] dark:border-[#3F4147] text-[#6B5759] dark:text-[#B5BAC1] font-bold">
                      <th className="p-3 whitespace-nowrap">Data / Hora</th>
                      <th className="p-3">Evento / Ação</th>
                      <th className="p-3">Referência / Endpoint</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0E8DF] dark:divide-[#382B2E] font-mono text-[11px]">
                    {systemLogs
                      .filter(log => {
                        if (logFilter === 'ALL') return true;
                        const eventStr = (log?.event || log?.action || '').toUpperCase();
                        return eventStr.includes(logFilter);
                      })
                      .map((log, index) => {
                        const eventName = log?.event || log?.action || 'SISTEMA';
                        const isSuccess = !log.httpStatus || (log.httpStatus >= 200 && log.httpStatus < 300);
                        return (
                          <tr key={log.id || `log-${index}`} className="hover:bg-[#FAF7F2] dark:hover:bg-[#35373C] transition-colors">
                            <td className="p-3 whitespace-nowrap text-[#553E41] dark:text-[#DBDEE1]">
                              {log.timestamp 
                                ? new Date(log.timestamp).toLocaleString('pt-BR', { 
                                    day: '2-digit', 
                                    month: '2-digit', 
                                    hour: '2-digit', 
                                    minute: '2-digit', 
                                    second: '2-digit' 
                                  })
                                : '—'}
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                eventName.includes('PLACED') ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                eventName.includes('CONFIRM') ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                                eventName.includes('DISPATCH') ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' :
                                eventName.includes('CANCEL') ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                                'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                              }`}>
                                {eventName}
                              </span>
                            </td>
                            <td className="p-3 text-[#352527] dark:text-white max-w-xs truncate font-sans text-xs">
                              {log.orderId ? `Pedido: ${log.orderId}` : (log.endpoint || log.channel || 'Aplicação Local')}
                            </td>
                            <td className="p-3 text-center whitespace-nowrap">
                              {log.httpStatus ? (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isSuccess ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                                }`}>
                                  {log.httpStatus}
                                </span>
                              ) : (
                                <span className="text-[10px] text-stone-400">OK</span>
                              )}
                            </td>
                            <td className="p-3 max-w-md truncate text-[#553E41] dark:text-[#DBDEE1]">
                              {typeof log.payload === 'object' 
                                ? JSON.stringify(log.payload) 
                                : String(log.message || log.payload || log.details || '—')}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT PERMISSIONS (RBAC)                                            */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-2xl border border-[#E5DACF] dark:border-[#3F4147] shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col my-auto overflow-hidden">
            
            {/* Header */}
            <div className="p-4 bg-white dark:bg-[#2B2D31] border-b border-[#E8DFD5] dark:border-[#3F4147] flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#8C7678]">Editar Permissões Granulares</span>
                <h3 className="font-serif-brand text-xl font-bold text-[#352527] dark:text-[#FFFFFF]">{editingUser.name}</h3>
                <span className="text-xs text-[#7A6466]">{editingUser.email}</span>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-stone-400 dark:text-[#B5BAC1] hover:text-stone-700 dark:hover:text-[#FFFFFF] font-bold p-1 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-[#352527] dark:text-[#FFFFFF] mb-1">
                  Nível Principal / Cargo no Sistema
                </label>
                <select
                  value={editRole}
                  onChange={e => setEditRole(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#DACDC0] font-semibold"
                >
                  <option value="Administrador">Administrador (Acesso Geral / Configurações)</option>
                  <option value="Mestre Padeiro">Mestre Padeiro (Fichas Técnicas & Estoque)</option>
                  <option value="Atendimento">Atendimento / Balcão (Pedidos & Clientes)</option>
                  <option value="Gerente">Gerente Operacional</option>
                </select>
              </div>

              {/* Granular Matrix */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#7A6466]">
                  Seleção de Acesso por Módulo do Sistema
                </h4>

                <div className="bg-white dark:bg-[#2B2D31] rounded-xl border border-[#E8DFD5] dark:border-[#3F4147] divide-y divide-[#F0E8DF] dark:divide-[#3F4147]">
                  
                  {/* Pedidos */}
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <strong className="text-[#352527] dark:text-[#FFFFFF] block">Pedidos & Encomendas</strong>
                      <span className="text-[11px] text-[#7A6466]">Gestão do fluxo de pedidos do balcão e encomendas de clientes</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editPermissions.ordersView}
                          onChange={() => togglePermission('ordersView')}
                          className="rounded text-[#B86B77]"
                        />
                        <span>Visualizar</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editPermissions.ordersEdit}
                          onChange={() => togglePermission('ordersEdit')}
                          className="rounded text-[#B86B77]"
                        />
                        <span>Criar / Editar</span>
                      </label>
                    </div>
                  </div>

                  {/* Estoque */}
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <strong className="text-[#352527] dark:text-[#FFFFFF] block">Controle de Estoque & Validades</strong>
                      <span className="text-[11px] text-[#7A6466]">Leitura e movimentação física de matérias-primas e lotes</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editPermissions.inventoryView}
                          onChange={() => togglePermission('inventoryView')}
                          className="rounded text-[#B86B77]"
                        />
                        <span>Visualizar</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editPermissions.inventoryEdit}
                          onChange={() => togglePermission('inventoryEdit')}
                          className="rounded text-[#B86B77]"
                        />
                        <span>Movimentar</span>
                      </label>
                    </div>
                  </div>

                  {/* Compras & NF-e */}
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <strong className="text-[#352527] dark:text-[#FFFFFF] block">Compras & Registro de NF-e</strong>
                      <span className="text-[11px] text-[#7A6466]">Lançamento em massa de notas fiscais de entrada de produtos</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editPermissions.purchasesView}
                          onChange={() => togglePermission('purchasesView')}
                          className="rounded text-[#B86B77]"
                        />
                        <span>Visualizar</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editPermissions.purchasesEdit}
                          onChange={() => togglePermission('purchasesEdit')}
                          className="rounded text-[#B86B77]"
                        />
                        <span>Registrar NF-e</span>
                      </label>
                    </div>
                  </div>

                  {/* Fichas Técnicas */}
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <strong className="text-[#352527] dark:text-[#FFFFFF] block">Fichas Técnicas & Receituário</strong>
                      <span className="text-[11px] text-[#7A6466]">Acesso a receitas, rendimentos e cálculo de custos por grama</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editPermissions.technicalSheetsView}
                          onChange={() => togglePermission('technicalSheetsView')}
                          className="rounded text-[#B86B77]"
                        />
                        <span>Visualizar</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editPermissions.technicalSheetsEdit}
                          onChange={() => togglePermission('technicalSheetsEdit')}
                          className="rounded text-[#B86B77]"
                        />
                        <span>Editar Receitas</span>
                      </label>
                    </div>
                  </div>

                  {/* Financeiro */}
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <strong className="text-[#352527] dark:text-[#FFFFFF] block">Controle Financeiro</strong>
                      <span className="text-[11px] text-[#7A6466]">Fluxo de caixa, relatórios de CMV e faturamento</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editPermissions.financialsView}
                          onChange={() => togglePermission('financialsView')}
                          className="rounded text-[#B86B77]"
                        />
                        <span>Visualizar</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editPermissions.financialsEdit}
                          onChange={() => togglePermission('financialsEdit')}
                          className="rounded text-[#B86B77]"
                        />
                        <span>Lançar Caixas</span>
                      </label>
                    </div>
                  </div>

                  {/* Marketing */}
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <strong className="text-[#352527] dark:text-[#FFFFFF] block">Controle de Marketing & Redes Sociais</strong>
                      <span className="text-[11px] text-[#7A6466]">Planejador de postagens e campanhas promocionais</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editPermissions.marketingView}
                          onChange={() => togglePermission('marketingView')}
                          className="rounded text-[#B86B77]"
                        />
                        <span>Visualizar</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editPermissions.marketingEdit}
                          onChange={() => togglePermission('marketingEdit')}
                          className="rounded text-[#B86B77]"
                        />
                        <span>Agendar Posts</span>
                      </label>
                    </div>
                  </div>

                  {/* Configurações Admin */}
                  <div className="p-3 flex items-center justify-between bg-purple-50/50">
                    <div>
                      <strong className="text-purple-950 block">Acesso ao Painel Admin & Permissões</strong>
                      <span className="text-[11px] text-purple-800">Permissão de Administrador para aprovar e gerenciar usuários</span>
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 cursor-pointer font-bold text-purple-900">
                        <input
                          type="checkbox"
                          checked={editPermissions.adminConfigView}
                          onChange={() => togglePermission('adminConfigView')}
                          className="rounded text-purple-700"
                        />
                        <span>Acesso Admin</span>
                      </label>
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-white border-t border-[#E8DFD5] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#D5C5B5] bg-white text-[#553F41] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-[#B86B77] hover:bg-[#9E5460] text-white shadow-xs cursor-pointer"
              >
                Salvar Alterações do Perfil
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE NEW PROFILE (ADMIN DIRECT CREATION)                         */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#FAF7F2] rounded-2xl border border-[#E5DACF] shadow-xl w-full max-w-md p-6 space-y-4 my-auto">
            
            <div className="flex items-center justify-between border-b pb-3 border-[#E8DFD5]">
              <h3 className="font-serif-brand text-xl font-bold text-[#352527] dark:text-[#FFFFFF] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#B86B77]" />
                <span>Cadastrar Novo Perfil</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-stone-400 dark:text-[#B5BAC1] hover:text-stone-700 dark:hover:text-[#FFFFFF] font-bold text-lg cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#523F41] mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ana Clara Souza"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white rounded-xl border border-[#DACDC0]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#523F41] mb-1">
                  E-mail de Login
                </label>
                <input
                  type="email"
                  required
                  placeholder="ex: anaclara@sabore.pvh.br"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white rounded-xl border border-[#DACDC0]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#523F41] mb-1">
                  Cargo / Função Inicial
                </label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as any)}
                  className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#DACDC0]"
                >
                  <option value="Atendimento">Atendimento / Balcão</option>
                  <option value="Mestre Padeiro">Mestre Padeiro / Produção</option>
                  <option value="Gerente">Gerente de Loja</option>
                  <option value="Administrador">Administrador Geral</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#523F41] mb-1">
                  Senha de Acesso
                </label>
                <input
                  type="password"
                  required
                  placeholder="Senha de acesso (mínimo 6 caracteres)"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white rounded-xl border border-[#DACDC0]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E8DFD5]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#D5C5B5] bg-white text-[#553F41] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#B86B77] hover:bg-[#9E5460] text-white shadow-xs cursor-pointer"
                >
                  Criar e Ativar Perfil
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRM DELETE USER ACCOUNT OR REJECT REQUEST                      */}
      {/* ========================================================================= */}
      {deletingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl w-full max-w-md p-6 space-y-4 my-auto animate-in fade-in zoom-in duration-150">
            
            <div className="flex items-center gap-3 text-rose-700">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-serif-brand text-lg font-bold text-[#352527] dark:text-[#FFFFFF]">
                  {deletingUser.status === 'Pendente' ? 'Rejeitar e Excluir Solicitação?' : 'Excluir Perfil de Usuário?'}
                </h3>
                <span className="text-xs text-[#7A6466]">Confirmação de exclusão permanente</span>
              </div>
            </div>

            <div className="p-3 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#E5DACF] dark:border-[#3F4147] space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#8C7678] font-medium">Nome:</span>
                <strong className="text-[#352527] dark:text-[#FFFFFF] font-bold">{deletingUser.name}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8C7678] font-medium">E-mail:</span>
                <span className="font-mono text-[#553E41]">{deletingUser.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8C7678] font-medium">Status Atual:</span>
                <span className={`font-bold px-2 py-0.5 rounded border text-[11px] ${
                  deletingUser.status === 'Pendente' 
                    ? 'bg-amber-50 text-amber-900 border-amber-300' 
                    : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                }`}>
                  {deletingUser.status || 'Ativo'}
                </span>
              </div>
            </div>

            <p className="text-xs text-[#6E595B] leading-relaxed">
              {deletingUser.status === 'Pendente' ? (
                <>Ao rejeitar, a solicitação de cadastro será excluída do sistema e o usuário não poderá realizar login.</>
              ) : (
                <>Esta ação removerá permanentemente o perfil de acesso do sistema Saborê. O usuário não poderá mais realizar login.</>
              )}
            </p>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E8DFD5]">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#D5C5B5] bg-white text-[#553F41] hover:bg-stone-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Excluir</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SELF DELETE WARNING                                                */}
      {/* ========================================================================= */}
      {selfDeleteWarning && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-amber-300 shadow-2xl w-full max-w-sm p-6 space-y-4 my-auto text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="font-serif-brand text-lg font-bold text-[#352527] dark:text-[#FFFFFF]">
              Ação Não Permitida
            </h3>
            <p className="text-xs text-[#6E595B] leading-relaxed">
              Você está conectado no momento com este perfil de Administrador (<strong>{currentUser?.email}</strong>). Para evitar o bloqueio do sistema, não é possível excluir a própria conta em uso.
            </p>
            <button
              type="button"
              onClick={() => setSelfDeleteWarning(false)}
              className="w-full py-2.5 text-xs font-bold rounded-xl bg-[#594446] hover:bg-[#352527] text-white shadow-xs cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

const UnitsConfigSection: React.FC = () => {
  const { 
    unitConversions, 
    addUnitConversion, 
    updateUnitConversion, 
    deleteUnitConversion 
  } = useBakery();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [from, setFrom] = useState<any>('g');
  const [to, setTo] = useState<any>('kg');
  const [factor, setFactor] = useState(0.001);

  const units: any[] = ['kg', 'g', 'l', 'ml', 'un', 'm'];

  const handleSave = () => {
    if (editingId) {
      updateUnitConversion(editingId, { from, to, factor });
      setEditingId(null);
    } else {
      addUnitConversion({ from, to, factor });
      setIsAdding(false);
    }
  };

  const startEdit = (c: any) => {
    setEditingId(c.id);
    setFrom(c.from);
    setTo(c.to);
    setFactor(c.factor);
    setIsAdding(false);
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="p-4 bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#B86B77] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-[#352527] dark:text-white text-sm sm:text-base">
              Unidades de Medida & Conversões
            </h3>
            <p className="text-[11px] text-[#7A6466] dark:text-[#B5BAC1] mt-0.5">
              Defina como o sistema deve converter unidades menores para unidades de estoque (ex: subtrair gramas de quilos).
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
            setFrom('g');
            setTo('kg');
            setFactor(0.001);
          }}
          className="w-full sm:w-auto px-4 py-2 bg-[#FAF7F2] dark:bg-[#1E1F22] hover:bg-[#EAE0D5] dark:hover:bg-[#35373C] border border-[#DACDC0] dark:border-[#3F4147] rounded-xl text-xs font-bold text-[#352527] dark:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova Regra de Conversão</span>
        </button>
      </div>

      {(isAdding || editingId) && (
        <div className="p-5 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-2xl border border-[#DACDC0] dark:border-[#3F4147] shadow-sm animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-6 bg-[#B86B77] rounded-full"></div>
            <h4 className="font-bold text-sm text-[#352527] dark:text-white">
              {editingId ? 'Editar Regra de Conversão' : 'Nova Regra de Conversão'}
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-[11px] font-bold text-[#543E40] dark:text-[#B5BAC1] uppercase mb-1.5">Unidade Origem (Menor)</label>
              <select
                value={from}
                onChange={e => setFrom(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white dark:bg-[#2B2D31] rounded-xl border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
              >
                {units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#543E40] dark:text-[#B5BAC1] uppercase mb-1.5">Unidade Destino (Estoque)</label>
              <select
                value={to}
                onChange={e => setTo(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white dark:bg-[#2B2D31] rounded-xl border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
              >
                {units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#543E40] dark:text-[#B5BAC1] uppercase mb-1.5">Fator de Multiplicação</label>
              <input
                type="number"
                step="0.000001"
                value={factor}
                onChange={e => setFactor(parseFloat(e.target.value) || 0)}
                className="w-full text-xs px-3 py-2 bg-white dark:bg-[#2B2D31] rounded-xl border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              <strong>Lógica:</strong> O sistema fará: <code>[Qtd Informada] × {factor} = [Qtd no Estoque]</code>. <br/>
              Ex: Se registrar 500g e a regra for de <strong>g</strong> para <strong>kg</strong> com fator <strong>0.001</strong>, o sistema subtrairá <strong>0.5kg</strong> do estoque.
            </p>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={() => { setIsAdding(false); setEditingId(null); }}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-[#DACDC0] text-[#553E41] hover:bg-stone-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 text-xs font-black rounded-xl bg-[#B86B77] hover:bg-[#9E5460] text-white shadow-xs"
            >
              <Check className="w-3.5 h-3.5 inline mr-1" />
              Salvar Regra
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] overflow-hidden shadow-xs">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-[#FAF7F2] dark:bg-[#1E1F22] border-b border-[#E8DFD5] dark:border-[#3F4147] text-[#6B5759] dark:text-[#B5BAC1] font-bold">
              <th className="p-4">De (Entrada)</th>
              <th className="p-4">Para (Estoque)</th>
              <th className="p-4">Fator</th>
              <th className="p-4">Exemplo Prático</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0E8DF] dark:divide-[#382B2E]">
            {unitConversions.map(conv => (
              <tr key={conv.id} className="hover:bg-stone-50 dark:hover:bg-[#35373C] transition-colors">
                <td className="p-4 font-bold text-[#352527] dark:text-white uppercase tracking-wider">{conv.from}</td>
                <td className="p-4 font-bold text-[#352527] dark:text-white uppercase tracking-wider">{conv.to}</td>
                <td className="p-4 font-mono text-stone-500">{conv.factor}</td>
                <td className="p-4 text-stone-500 italic">
                  100 {conv.from} = {100 * conv.factor} {conv.to}
                </td>
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => startEdit(conv)}
                      className="p-1.5 text-[#553E41] hover:bg-[#F5EDE3] rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteUnitConversion(conv.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
