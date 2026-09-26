import React, { useState, useRef, useEffect } from 'react';
import { useBakery } from '../context/BakeryContext';
import { 
  Sparkles, Wifi, WifiOff, Bell, Plus, RefreshCw, 
  ShoppingBag, CheckCircle2, ChevronDown, Clock, ShieldCheck, User, LogOut,
  PanelLeftClose, PanelLeftOpen, AlertCircle, AlertTriangle, XCircle, Key,
  ExternalLink, X, Info
} from 'lucide-react';

interface HeaderProps {
  onOpenNewOrder: () => void;
  onOpenNewPurchase: () => void;
  onOpenIntegrations: (tab?: 'ifood' | '99food' | 'commissions' | 'simulation') => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onOpenNewOrder, 
  onOpenNewPurchase,
  onOpenIntegrations 
}) => {
  const { 
    ifoodConnected, 
    nineNineFoodConnected, 
    deliverySettings,
    orders, 
    materials, 
    lastSyncTimestamp,
    lastIfoodFetchTime,
    currentUser,
    logout,
    isSidebarCollapsed,
    toggleSidebarCollapsed,
    ifoodAuthDiagnostic,
    verifyIfoodAuth,
    isTestingIfoodConnection,
    isSupabaseSyncing,
    refreshData
  } = useBakery();

  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const [isTestingLocal, setIsTestingLocal] = useState(false);
  const diagnosticRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (diagnosticRef.current && !diagnosticRef.current.contains(event.target as Node)) {
        setIsDiagnosticOpen(false);
      }
    }
    if (isDiagnosticOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDiagnosticOpen]);

  const handleQuickVerify = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTestingLocal(true);
    try {
      await verifyIfoodAuth();
    } finally {
      setIsTestingLocal(false);
    }
  };

  // Determine health status: 'green' | 'yellow' | 'red'
  const authStatus = ifoodAuthDiagnostic?.status || (ifoodConnected ? 'green' : 'yellow');

  const statusConfig = {
    green: {
      dotColor: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]',
      borderClass: 'border-emerald-300 dark:border-emerald-800/80 hover:border-emerald-400',
      bgClass: 'bg-emerald-50/80 dark:bg-emerald-950/40',
      textPrimary: 'text-emerald-900 dark:text-emerald-200',
      textSecondary: 'text-emerald-700 dark:text-emerald-400',
      badgeText: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200',
      icon: CheckCircle2,
      label: 'Autenticado',
      shortDesc: 'Credenciais Ativas'
    },
    yellow: {
      dotColor: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)] animate-pulse',
      borderClass: 'border-amber-300 dark:border-amber-800/80 hover:border-amber-400',
      bgClass: 'bg-amber-50/80 dark:bg-amber-950/40',
      textPrimary: 'text-amber-900 dark:text-amber-200',
      textSecondary: 'text-amber-700 dark:text-amber-400',
      badgeText: 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200',
      icon: AlertTriangle,
      label: 'Verificando',
      shortDesc: 'Modo Teste / Atenção'
    },
    red: {
      dotColor: 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)] animate-pulse',
      borderClass: 'border-rose-400 dark:border-rose-700/90 hover:border-rose-500 ring-2 ring-rose-300/40 dark:ring-rose-800/40',
      bgClass: 'bg-rose-50 dark:bg-rose-950/60',
      textPrimary: 'text-rose-900 dark:text-rose-100 font-bold',
      textSecondary: 'text-rose-700 dark:text-rose-300',
      badgeText: 'bg-rose-100 dark:bg-rose-900/70 text-rose-800 dark:text-rose-100 font-bold',
      icon: AlertCircle,
      label: 'Credenciais Expiradas',
      shortDesc: 'Erro de Autenticação'
    }
  }[authStatus];

  const StatusIcon = statusConfig.icon;
  const isBusyTesting = isTestingLocal || isTestingIfoodConnection;

  const formatRemainingTime = (expiresAt?: string) => {
    if (!expiresAt) return 'Não informado';
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return 'Expirado';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `~${hours}h ${mins}min restantes`;
    return `~${mins}min restantes`;
  };

  const pendingOrdersCount = (orders || []).filter(o => o?.status === 'pendente' || o?.status === 'em_producao').length;
  const lowStockCount = (materials || []).filter(m => m && m.currentStock <= m.minStock).length;

  return (
    <header className="bg-[#FAF7F2] dark:bg-[#2B2D31] border-b border-[#E8DFD5] dark:border-[#3F4147] sticky top-0 z-30 px-4 lg:px-8 py-3.5 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Brand Logo & Identification */}
        <div className="flex items-center gap-3.5 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            {/* Sidebar Collapse / Expand Toggle Button for Desktop */}
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              className="hidden md:flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-[#1E1F22] border border-[#E8DFD5] dark:border-[#3F4147] text-[#7A6466] dark:text-[#B5BAC1] hover:text-[#B86B77] dark:hover:text-white hover:border-[#B86B77]/40 dark:hover:border-stone-500 transition-all shadow-2xs cursor-pointer shrink-0"
              title={isSidebarCollapsed ? "Expandir barra lateral de módulos" : "Ocultar nomes da barra lateral (somente ícones)"}
              aria-label={isSidebarCollapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-5 h-5 text-[#B86B77] dark:text-white" />
              ) : (
                <PanelLeftClose className="w-5 h-5" />
              )}
            </button>

            <div className="w-10 h-10 rounded-xl bg-[#B86B77] dark:bg-[#35373C] dark:border dark:border-[#4E5058] flex items-center justify-center text-white font-bold shadow-xs">
              <span className="font-serif-brand text-2xl font-bold italic">S</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif-brand text-2xl font-bold text-[#352527] dark:text-white tracking-tight leading-none">
                  Saborê
                </h1>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#F4E9EB] dark:bg-[#383A40] text-[#9E5460] dark:text-[#F2F3F5] border border-[#EACBD0] dark:border-[#3F4147]">
                  Artesanal
                </span>
              </div>
              <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1] font-medium mt-0.5">
                Confeitaria & Panificação Artesanal • Sistema de Logística & Gestão
              </p>
            </div>
          </div>

          {/* Quick status pill for mobile */}
          <div className="md:hidden flex items-center gap-1.5">
            <button 
              onClick={() => onOpenIntegrations()}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-[#E2D5C8] dark:border-[#3F4147] bg-white dark:bg-[#1E1F22] hover:bg-[#FAF7F2] dark:hover:bg-[#35373C] text-[#523F41] dark:text-[#FFFFFF] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className={`w-2 h-2 rounded-full ${authStatus === 'red' ? 'bg-rose-500 animate-pulse' : (ifoodConnected && authStatus === 'green') ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              <span>Canais</span>
            </button>
          </div>
        </div>

        {/* Integration Status Badges, User Profile & Quick Action Controls */}
        <div className="flex items-center flex-wrap justify-end gap-2.5 w-full md:w-auto">
          
          {/* iFood Connection Status Badge with Diagnostic Dropdown */}
          <div className="relative" ref={diagnosticRef}>
            <button 
              type="button"
              onClick={() => setIsDiagnosticOpen(prev => !prev)}
              title="Clique para ver o diagnóstico completo de autenticação e conexão com o iFood"
              className={`cursor-pointer group flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all shadow-2xs ${statusConfig.borderClass} ${statusConfig.bgClass}`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusConfig.dotColor}`}></span>
                <span className="text-xs font-bold text-[#EA1D2C]">iFood</span>
              </div>

              <div className="flex items-center gap-1.5 border-l border-[#EADFD6] dark:border-[#3F4147] pl-2">
                <StatusIcon className={`w-3.5 h-3.5 shrink-0 ${statusConfig.textSecondary}`} />
                <div className="flex flex-col text-left leading-tight">
                  <span className={`text-[11px] font-bold ${statusConfig.textPrimary} flex items-center gap-1`}>
                    {authStatus === 'red' ? 'Credenciais Expiradas' : authStatus === 'green' ? 'Autenticado' : 'Verificando'}
                  </span>
                  {authStatus === 'green' && lastIfoodFetchTime && (
                    <span className="text-[9px] text-emerald-600/90 dark:text-emerald-400 font-mono hidden xl:inline">
                      {new Date(lastIfoodFetchTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <ChevronDown className={`w-3 h-3 text-[#7A6466] dark:text-[#B5BAC1] transition-transform ${isDiagnosticOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {/* Quick Diagnostic Card Popover */}
            {isDiagnosticOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 p-4 rounded-xl bg-white dark:bg-[#1E1F22] border border-[#E8DFD5] dark:border-[#3F4147] shadow-xl z-50 text-[#352527] dark:text-white animate-in fade-in zoom-in-95 duration-150">
                {/* Popover Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#EFE8E0] dark:border-[#3F4147]">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${statusConfig.dotColor}`}></span>
                    <span className="text-sm font-bold text-[#352527] dark:text-white">Diagnóstico iFood</span>
                  </div>
                  <button 
                    onClick={() => setIsDiagnosticOpen(false)}
                    className="p-1 rounded-md text-[#7A6466] hover:text-[#352527] dark:text-[#B5BAC1] dark:hover:text-white hover:bg-stone-100 dark:hover:bg-[#35373C] transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Diagnostic Outcome Banner */}
                <div className="mt-3">
                  <div className={`p-3 rounded-xl border flex items-start gap-3 ${
                    authStatus === 'green' 
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' 
                      : authStatus === 'red'
                      ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100'
                      : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                  }`}>
                    <StatusIcon className="w-5 h-5 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold leading-tight">
                        {ifoodAuthDiagnostic?.title || (authStatus === 'green' ? 'Credenciais Válidas & Conectadas' : authStatus === 'red' ? 'Falha de Autenticação / Credenciais Expiradas' : 'Verificação de Conexão Pendente')}
                      </p>
                      <p className="text-[11px] mt-1 opacity-90 leading-relaxed">
                        {ifoodAuthDiagnostic?.message || (authStatus === 'green' ? 'API do iFood respondendo e autenticando requisições com sucesso.' : 'Aguardando validação das credenciais.')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Expired Warning Callout if Status is Red */}
                {authStatus === 'red' && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-rose-100/70 dark:bg-rose-900/40 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 text-[11px] flex items-start gap-2">
                    <Key className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Atenção:</span> As credenciais cadastradas (Client ID / Client Secret) expiraram ou foram revogadas no Portal do Desenvolvedor iFood. Novos pedidos não serão entregues até a renovação.
                    </div>
                  </div>
                )}

                {/* Technical Diagnostic Metadata */}
                <div className="mt-3 space-y-2 py-2 border-y border-[#EFE8E0] dark:border-[#3F4147] text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#7A6466] dark:text-[#B5BAC1] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Última Verificação:
                    </span>
                    <span className="font-mono text-[11px] font-medium">
                      {ifoodAuthDiagnostic?.lastAttemptTimestamp 
                        ? new Date(ifoodAuthDiagnostic.lastAttemptTimestamp).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' }) 
                        : (lastIfoodFetchTime ? new Date(lastIfoodFetchTime).toLocaleTimeString('pt-BR') : 'Ainda não testado')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#7A6466] dark:text-[#B5BAC1] flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> Token OAuth2:
                    </span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                      authStatus === 'green'
                        ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300'
                        : authStatus === 'red'
                        ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300 font-bold'
                        : 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300'
                    }`}>
                      {authStatus === 'green' 
                        ? formatRemainingTime(ifoodAuthDiagnostic?.tokenExpiresAt) 
                        : authStatus === 'red' 
                        ? 'Expirado / Inválido' 
                        : 'Pendente'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#7A6466] dark:text-[#B5BAC1] flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" /> Loja iFood:
                    </span>
                    <span className="text-[11px] font-medium truncate max-w-[180px]" title={deliverySettings?.ifood?.merchantId || 'Padrão'}>
                      {ifoodAuthDiagnostic?.merchantName || deliverySettings?.ifood?.merchantId || 'Loja Principal'}
                    </span>
                  </div>
                </div>

                {/* Popover Actions */}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleQuickVerify}
                    disabled={isBusyTesting}
                    className="flex-1 px-3 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-[#35373C] dark:hover:bg-[#4E5058] text-[#352527] dark:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isBusyTesting ? 'animate-spin text-[#B86B77]' : ''}`} />
                    <span>{isBusyTesting ? 'Verificando...' : 'Testar Autenticação'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDiagnosticOpen(false);
                      onOpenIntegrations('ifood');
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      authStatus === 'red'
                        ? 'bg-[#EA1D2C] hover:bg-[#c91825] text-white shadow-xs'
                        : 'bg-[#B86B77] hover:bg-[#9E5460] text-white'
                    }`}
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>{authStatus === 'red' ? 'Renovar Chaves' : 'Configurar'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 99Food Status Badge */}
          <div 
            onClick={() => onOpenIntegrations('99food')}
            title="Clique para gerenciar ou habilitar/desabilitar o 99Food"
            className="cursor-pointer group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-[#1E1F22] border border-[#EADFD6] dark:border-[#3F4147] hover:border-[#FF5E00]/40 dark:hover:bg-[#35373C] transition-colors shadow-2xs"
          >
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${nineNineFoodConnected ? 'bg-[#FF5E00] animate-pulse' : 'bg-stone-300'}`}></span>
              <span className="text-xs font-bold text-[#E65300]">99Food</span>
            </div>
            <span className="text-[11px] text-[#7A6466] dark:text-[#B5BAC1] font-medium border-l border-[#ECE2D8] dark:border-[#3F4147] pl-2">
              {nineNineFoodConnected ? (
                <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Ativo
                </span>
              ) : (
                <span className="text-amber-700 dark:text-amber-400">Desabilitado</span>
              )}
            </span>
          </div>

          {/* Quick Action: New Order */}
          <button
            onClick={onOpenNewOrder}
            className="px-3.5 py-1.5 rounded-lg bg-[#B86B77] dark:bg-white hover:bg-[#9E5460] dark:hover:bg-stone-200 text-white dark:text-[#1E1F22] font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Pedido</span>
          </button>

          {/* Quick Action: New Purchase */}
          <button
            onClick={onOpenNewPurchase}
            className="px-3.5 py-1.5 rounded-lg bg-[#594446] dark:bg-[#35373C] hover:bg-[#453436] dark:hover:bg-[#4E5058] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs border border-transparent dark:border-[#4E5058] transition-colors cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#E6C6CB] dark:text-white" />
            <span>Registrar NF-e</span>
          </button>

          {/* Cloud Sync Button */}
          <button
            onClick={() => refreshData(true)}
            disabled={isSupabaseSyncing}
            title="Sincronizar dados com a nuvem (Supabase)"
            className={`p-2 rounded-lg border transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer ${
              isSupabaseSyncing 
                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400 opacity-80' 
                : 'bg-white dark:bg-[#1E1F22] border-[#EADFD6] dark:border-[#3F4147] text-[#7A6466] dark:text-[#B5BAC1] hover:text-[#B86B77] hover:border-[#B86B77]/40'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isSupabaseSyncing ? 'animate-spin' : ''}`} />
            <span className="text-[10px] font-bold uppercase tracking-tight hidden sm:inline">
              {isSupabaseSyncing ? 'Sincronizando...' : 'Sincronizar'}
            </span>
          </button>

          {/* Current User Profile Badge & Logout Button */}
          {currentUser && (
            <div className="flex items-center gap-2 pl-2 border-l border-[#E5DACF] dark:border-[#3F4147]">
              <div className="flex flex-col text-right">
                <span className="text-xs font-bold text-[#352527] dark:text-white leading-none flex items-center justify-end gap-1">
                  <User className="w-3 h-3 text-[#B86B77] dark:text-stone-300" />
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-[#7A6466] dark:text-[#B5BAC1] font-medium">{currentUser.role}</span>
              </div>
              <button
                onClick={logout}
                title="Sair do sistema"
                className="p-1.5 rounded-lg bg-[#F2E8DF] dark:bg-[#1E1F22] hover:bg-rose-100 dark:hover:bg-[#35373C] text-[#594446] dark:text-rose-300 hover:text-rose-700 transition-colors border border-[#E0D5C9] dark:border-[#3F4147] cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

        </div>

      </div>
    </header>
  );
};

