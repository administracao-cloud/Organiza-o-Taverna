import React from 'react';
import { useBakery } from '../../context/BakeryContext';
import { 
  ShoppingBag, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  ArrowUpRight, 
  ChefHat, 
  Percent, 
  Wheat, 
  Truck,
  Plus,
  Store,
  Power,
  Wifi,
  WifiOff,
  Activity,
  Zap,
  X
} from 'lucide-react';
import { ActiveTab } from '../Sidebar';

interface OverviewViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onOpenNewOrder: () => void;
  onOpenNewPurchase: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ 
  setActiveTab, 
  onOpenNewOrder,
  onOpenNewPurchase
}) => {
  const { 
    orders = [], 
    materials = [], 
    transactions = [], 
    technicalSheets = [], 
    deliverySettings,
    updateOrderStatus,
    isIfoodStoreOpen,
    toggleIfoodStoreStatus,
    ifoodConnected,
    ifoodPollingState,
    dismissedCriticalWarnings,
    dismissCriticalWarning
  } = useBakery();

  const safeFormatDate = (dateVal: any, options: Intl.DateTimeFormatOptions, fallback: string = '--:--') => {
    if (!dateVal) return fallback;
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return fallback;
      return d.toLocaleString('pt-BR', options);
    } catch {
      return fallback;
    }
  };

  // Metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = (orders || []).filter(o => o && o.createdAt && typeof o.createdAt === 'string' && o.createdAt.startsWith(todayStr));
  const pendingOrders = (orders || []).filter(o => o && (o.status === 'pendente' || o.status === 'em_producao'));
  const criticalStockItems = (materials || []).filter(m => m && (m.currentStock ?? 0) <= (m.minStock ?? 0) && !dismissedCriticalWarnings.includes(m.id));

  const totalRevenue = (transactions || [])
    .filter(t => t && t.type === 'receita')
    .reduce((acc, t) => acc + (Number(t?.amount) || 0), 0);

  const totalExpenses = (transactions || [])
    .filter(t => t && t.type === 'despesa')
    .reduce((acc, t) => acc + (Number(t?.amount) || 0), 0);

  const netProfit = totalRevenue - totalExpenses;

  // iFood Today Metrics
  const ifoodTodayOrders = todayOrders.filter(o => o && o.channel === 'ifood');
  const ifoodPendingToday = ifoodTodayOrders.filter(o => o && !['entregue', 'cancelado'].includes(o.status)).length;
  const ifoodTicketMedio = ifoodTodayOrders.length > 0 
    ? ifoodTodayOrders.reduce((acc, o) => acc + (Number(o?.netAmount) || Number(o?.total) || 0), 0) / ifoodTodayOrders.length 
    : 0;

  // Channel counts
  const ifoodOrdersCount = (orders || []).filter(o => o && o.channel === 'ifood').length;
  const nineNineOrdersCount = (orders || []).filter(o => o && o.channel === '99food').length;
  const whatsappOrdersCount = (orders || []).filter(o => o && o.channel === 'whatsapp').length;
  const balcaoOrdersCount = (orders || []).filter(o => o && o.channel === 'balcao').length;

  const ifoodTotalRate = ((deliverySettings?.ifood?.commissionPercent || 23) + (deliverySettings?.ifood?.paymentFeePercent || 3.2) + (deliverySettings?.ifood?.anticipationFeePercent || 0)).toFixed(1);
  const nineNineTotalRate = ((deliverySettings?.food99?.commissionPercent || 20) + (deliverySettings?.food99?.paymentFeePercent || 2.5)).toFixed(1);
  const balcaoCardFee = (deliverySettings?.direct?.cardFeePercent || 2.5).toFixed(1);

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#594446] to-[#78575B] dark:from-[#2B2D31] dark:to-[#1E1F22] dark:border dark:border-[#3F4147] rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ChefHat className="w-5 h-5 text-[#EACBD0] dark:text-stone-300" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#EACBD0] dark:text-stone-300">
              Painel Operacional da Confeitaria & Forneria
            </span>
          </div>
          <h2 className="font-serif-brand text-2xl md:text-3xl font-bold text-white">
            Saborê — Confeitaria e Panificação Artesanal
          </h2>
          <p className="text-xs text-[#F2E5E7] dark:text-[#B5BAC1] mt-1 max-w-xl">
            Gestão integrada de delivery (iFood & 99Food), receituário com custo por grama dinâmico e precificação inteligente.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenNewOrder}
            className="px-4 py-2.5 rounded-xl bg-[#B86B77] dark:bg-white text-white dark:text-[#1E1F22] hover:bg-[#A35965] dark:hover:bg-stone-200 text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Pedido</span>
          </button>
          <button
            onClick={onOpenNewPurchase}
            className="px-4 py-2.5 rounded-xl bg-white/15 dark:bg-[#35373C] hover:bg-white/25 dark:hover:bg-[#4E5058] text-white text-xs font-bold flex items-center gap-2 border border-white/20 dark:border-[#4E5058] transition-colors cursor-pointer"
          >
            <Wheat className="w-4 h-4 text-[#EACBD0] dark:text-stone-300" />
            <span>Registrar Insumo</span>
          </button>
        </div>
      </div>

      {/* Critical Stock Alert Banner */}
      {criticalStockItems.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-300 flex items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <strong className="font-bold">Aviso:</strong>{' '}
              <span>Você precisa conferir a reposição de insumos ({criticalStockItems.length} materiais com estoque crítico).</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                criticalStockItems.forEach(item => dismissCriticalWarning(item.id));
              }}
              title="Estou ciente"
              className="p-1.5 hover:bg-amber-200/50 dark:hover:bg-amber-800/50 rounded-lg text-amber-700 dark:text-amber-400 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className="px-3 py-1.5 rounded-lg bg-[#594446] hover:bg-[#433234] text-white font-bold text-[11px] shrink-0 transition-colors cursor-pointer"
            >
              Ver Estoque
            </button>
          </div>
        </div>
      )}

      {/* iFood Real-time Integration Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pedidos Pendentes Hoje */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#2B2D31] border border-[#EBE1D7] dark:border-[#3F4147] flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-[11px] font-semibold text-[#7A6466] dark:text-[#B5BAC1] mb-0.5 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#EA1D2C]"></span>
              Pendentes Hoje (iFood)
            </div>
            <div className="font-serif-brand text-2xl font-bold text-amber-500 dark:text-amber-400">{ifoodPendingToday}</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#EA1D2C]/10 dark:bg-[#EA1D2C]/20 flex items-center justify-center text-[#EA1D2C]">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#2B2D31] border border-[#EBE1D7] dark:border-[#3F4147] flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-[11px] font-semibold text-[#7A6466] dark:text-[#B5BAC1] mb-0.5 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#EA1D2C]"></span>
              Ticket Médio (iFood)
            </div>
            <div className="font-serif-brand text-2xl font-bold text-[#352527] dark:text-white">R$ {ifoodTicketMedio.toFixed(2)}</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#EA1D2C]/10 dark:bg-[#EA1D2C]/20 flex items-center justify-center text-[#EA1D2C]">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Status da Loja */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#2B2D31] border border-[#EBE1D7] dark:border-[#3F4147] flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-[11px] font-semibold text-[#7A6466] dark:text-[#B5BAC1] mb-0.5 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#EA1D2C]"></span>
              Status da Loja (iFood)
            </div>
            <div className={`font-serif-brand text-xl font-bold ${isIfoodStoreOpen ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-400 dark:text-stone-500'}`}>
              {isIfoodStoreOpen ? 'ABERTA' : 'FECHADA'}
            </div>
          </div>
          <button 
            onClick={toggleIfoodStoreStatus}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors border shadow-xs cursor-pointer ${
              isIfoodStoreOpen ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-[#35373C]' : 'bg-stone-50 dark:bg-[#1E1F22] text-stone-500 dark:text-stone-400 border-stone-200 dark:border-[#3F4147] hover:bg-stone-100 dark:hover:bg-[#35373C]'
            }`}
            title="Alternar Status da Loja no iFood"
          >
            <Power className="w-4 h-4" />
          </button>
        </div>

        {/* Status da Conexão iFood */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#2B2D31] border border-[#EBE1D7] dark:border-[#3F4147] flex items-center justify-between shadow-2xs">
          <div className="flex-1 min-w-0 mr-2">
            <div className="text-[11px] font-semibold text-[#EA1D2C] dark:text-[#FF5252] mb-0.5 uppercase tracking-wider flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${!ifoodConnected ? 'bg-stone-400' : 'bg-emerald-500 animate-pulse'}`}></span>
              <span>Integrador iFood (Polling)</span>
            </div>
            <div className="flex flex-col">
              <span className={`font-serif-brand text-md font-bold truncate flex items-center gap-1.5 ${!ifoodConnected ? 'text-stone-500 dark:text-stone-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {ifoodConnected ? (
                  <>
                    <span>POLLING CONTÍNUO ATIVO</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-sans font-bold">10s</span>
                  </>
                ) : (
                  'INTEGRAÇÃO PAUSADA'
                )}
              </span>
              <span className="text-[10px] text-stone-500 dark:text-stone-400 truncate mt-0.5" title={ifoodPollingState.lastSuccessTimestamp ? `Último evento recebido via Polling: ${safeFormatDate(ifoodPollingState.lastSuccessTimestamp, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Aguardando primeiros eventos'}>
                {ifoodConnected ? (
                  <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping"></span>
                    Última atualização: {ifoodPollingState.lastSuccessTimestamp ? safeFormatDate(ifoodPollingState.lastSuccessTimestamp, { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Polling Ativo'}
                  </span>
                ) : (
                  'Nenhuma atualização recente'
                )}
              </span>
            </div>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${!ifoodConnected ? 'bg-stone-100 dark:bg-[#1E1F22] text-stone-400' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500'}`}>
            {!ifoodConnected ? <WifiOff className="w-5 h-5" /> : <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-pulse" />}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Orders */}
        <div className="p-4 bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#EBE1D7] dark:border-[#3F4147] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#7A6466] dark:text-[#B5BAC1]">
            <span className="font-semibold text-[#7A6466] dark:text-[#B5BAC1]">Pedidos & Encomendas</span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF0F2] dark:bg-[#1E1F22] text-[#B86B77] dark:text-stone-300 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif-brand text-2xl font-bold text-[#352527] dark:text-white">
            {(orders || []).length} pedidos
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#8C7678] dark:text-[#B5BAC1] flex-wrap">
            <span className="font-bold px-2 py-0.5 rounded-full text-xs bg-amber-400 text-stone-950 dark:bg-amber-400 dark:text-stone-950 shadow-2xs">{pendingOrders.length} novos/pendentes</span>
            <span>•</span>
            <span className="dark:text-[#B5BAC1]">{(orders || []).filter(o => o && o.status === 'entregue').length} finalizados</span>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="p-4 bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#EBE1D7] dark:border-[#3F4147] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#7A6466] dark:text-[#B5BAC1]">
            <span className="font-semibold text-[#7A6466] dark:text-[#B5BAC1]">Faturamento Líquido</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-[#1E1F22] text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif-brand text-2xl font-bold text-[#352527] dark:text-white">
            R$ {(totalRevenue || 0).toFixed(2)}
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Após taxas de canais e maquininha</span>
          </div>
        </div>

        {/* Technical Sheets */}
        <div className="p-4 bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#EBE1D7] dark:border-[#3F4147] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#7A6466] dark:text-[#B5BAC1]">
            <span className="font-semibold text-[#7A6466] dark:text-[#B5BAC1]">Fichas Técnicas Ativas</span>
            <div className="w-7 h-7 rounded-lg bg-[#F5EDE3] dark:bg-[#1E1F22] text-[#7A5A40] dark:text-stone-300 flex items-center justify-center">
              <ChefHat className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif-brand text-2xl font-bold text-[#352527] dark:text-white">
            {technicalSheets.length} receitas
          </div>
          <div className="text-[11px] text-[#7A6466] dark:text-[#B5BAC1]">
            Custos atualizados com compras
          </div>
        </div>

        {/* Insumos Cadastrados */}
        <div className="p-4 bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#EBE1D7] dark:border-[#3F4147] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#7A6466] dark:text-[#B5BAC1]">
            <span className="font-semibold text-[#7A6466] dark:text-[#B5BAC1]">Materiais no Catálogo</span>
            <div className="w-7 h-7 rounded-lg bg-[#F4EFEA] dark:bg-[#1E1F22] text-[#594446] dark:text-stone-300 flex items-center justify-center">
              <Wheat className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif-brand text-2xl font-bold text-[#352527] dark:text-white">
            {materials.length} insumos
          </div>
          <div className="text-[11px] text-[#7A6466] dark:text-[#B5BAC1]">
            Com fornecedor e custo/g rastreado
          </div>
        </div>

      </div>

      {/* Main Split: Active Orders & Channel Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active / Pending Orders List */}
        <div className="lg:col-span-2 bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#EBE1D7] dark:border-[#3F4147] p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif-brand text-lg font-bold text-[#352527] dark:text-white">
                Pedidos em Andamento & Produção
              </h3>
              <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1]">
                Acompanhe o fluxo da cozinha e despacho para os entregadores
              </p>
            </div>
            <button
              onClick={() => setActiveTab('orders')}
              className="text-xs font-semibold text-[#B86B77] dark:text-stone-300 dark:hover:text-white hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todos ({(orders || []).length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {(orders || []).length === 0 ? (
              <div className="p-8 text-center bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-dashed border-[#DACDC0] dark:border-[#3F4147] shadow-inner space-y-2">
                <ShoppingBag className="w-8 h-8 text-[#B86B77]/60 dark:text-stone-500 mx-auto" />
                <div className="font-semibold text-xs text-[#352527] dark:text-white">Nenhum pedido registrado no momento</div>
                <p className="text-[11px] text-[#8C7678] dark:text-[#B5BAC1] max-w-sm mx-auto">
                  Clique no botão "Novo Pedido" acima para cadastrar a primeira venda ou receba pedidos diretamente pelas integrações de delivery.
                </p>
                <button
                  onClick={onOpenNewOrder}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#B86B77] dark:bg-white text-white dark:text-[#1E1F22] hover:bg-[#9E5460] dark:hover:bg-stone-200 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cadastrar Primeiro Pedido</span>
                </button>
              </div>
            ) : (
              (orders || []).slice(0, 4).map(order => {
                if (!order) return null;
                const channelBadge = 
                  order.channel === 'ifood' ? { label: 'iFood', color: 'bg-[#EA1D2C]/10 text-[#EA1D2C] border-[#EA1D2C]/20' } :
                  order.channel === '99food' ? { label: '99Food', color: 'bg-[#FF5E00]/10 text-[#E65300] border-[#FF5E00]/20' } :
                  order.channel === 'whatsapp' ? { label: 'WhatsApp', color: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' } :
                  { label: 'Balcão', color: 'bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800' };

                const statusBadge = 
                  order.status === 'pendente' ? { label: '⏳ Pendente', bg: 'bg-amber-400 text-stone-950 dark:bg-amber-400 dark:text-stone-950 border border-amber-500/40 font-bold' } :
                  order.status === 'em_producao' ? { label: 'No Forno / Produção', bg: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300' } :
                  order.status === 'pronto' ? { label: 'Pronto p/ Embalar', bg: 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300' } :
                  order.status === 'saiu_entrega' ? { label: 'Em Rota Delivery', bg: 'bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300' } :
                  order.status === 'entregue' ? { label: 'Entregue', bg: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' } :
                  { label: 'Cancelado', bg: 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300' };

                return (
                  <div key={order.id} className="p-3.5 bg-[#FAF7F2] dark:bg-[#1E1F22] hover:bg-[#F3ECE2] dark:hover:bg-[#35373C] rounded-xl border border-[#EBE1D7] dark:border-[#3F4147] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-[#352527] dark:text-white">{order.code}</span>
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${channelBadge.color}`}>
                          {channelBadge.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${statusBadge.bg}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                      <div className="font-semibold text-[#352527] dark:text-white">
                        {order.customerName || 'Cliente sem nome'}
                      </div>
                      <div className="text-[11px] text-[#7A6466] dark:text-[#B5BAC1] mt-0.5">
                        {(order.items || []).map(i => i ? `${i.quantity ?? (i as any).qty ?? 1}x ${i.productName || (i as any).product_name || (i as any).name || 'Item'}` : '').filter(Boolean).join(' • ')}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="font-bold text-sm text-[#352527] dark:text-white">R$ {(Number(order.total) || Number(order.netAmount) || 0).toFixed(2)}</span>
                        <div className="text-[10px] text-[#8C7678] dark:text-[#B5BAC1]">Líquido: R$ {(Number(order.netAmount) || Number(order.total) || 0).toFixed(2)}</div>
                      </div>

                      {/* Quick status button */}
                      {order.status !== 'entregue' && order.status !== 'cancelado' && (
                        <button
                          onClick={() => {
                            const nextStatus = 
                              order.status === 'pendente' ? 'em_producao' :
                              order.status === 'em_producao' ? 'pronto' :
                              order.status === 'pronto' ? 'saiu_entrega' : 'entregue';
                            updateOrderStatus(order.id, nextStatus);
                          }}
                          className="px-2.5 py-1 bg-white dark:bg-[#1E1F22] hover:bg-[#FAF0F2] dark:hover:bg-[#35373C] border border-[#DACDC0] dark:border-[#3F4147] hover:border-[#B86B77] dark:hover:border-stone-500 text-[#553E41] dark:text-[#FFFFFF] hover:text-[#B86B77] dark:hover:text-white rounded-lg font-semibold text-[11px] transition-colors cursor-pointer"
                        >
                          Avançar Status →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Channel Breakdown & Quick Shortcuts */}
        <div className="space-y-4">
          
          {/* Sales Channels Card */}
          <div className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#EBE1D7] dark:border-[#3F4147] p-5 shadow-2xs space-y-3.5">
            <h3 className="font-serif-brand text-lg font-bold text-[#352527] dark:text-[#FFFFFF]">
              Canais de Venda
            </h3>
            <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1]">
              Volume de pedidos distribuído por plataforma
            </p>

            <div className="space-y-2.5 pt-1 text-xs">
              
              {/* iFood */}
              <div 
                onClick={() => setActiveTab('pricing')}
                className="cursor-pointer group flex items-center justify-between p-2.5 bg-[#FAF7F2] dark:bg-[#1E1F22] hover:bg-[#FDF2F3] dark:hover:bg-[#35373C] rounded-xl border border-[#EBE1D7] dark:border-[#3F4147] hover:border-[#EA1D2C]/30 transition-colors shadow-xs"
                title="Clique para gerenciar precificação dinâmica e taxas"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EA1D2C]"></span>
                  <span className="font-semibold text-[#352527] dark:text-white group-hover:text-[#EA1D2C]">iFood Delivery</span>
                </div>
                <div className="text-right">
                  <strong className="text-[#352527] dark:text-white">{ifoodOrdersCount} pedidos</strong>
                </div>
              </div>

              {/* 99Food */}
              <div 
                onClick={() => setActiveTab('pricing')}
                className="cursor-pointer group flex items-center justify-between p-2.5 bg-[#FAF7F2] dark:bg-[#1E1F22] hover:bg-[#FFF5ED] dark:hover:bg-[#35373C] rounded-xl border border-[#EBE1D7] dark:border-[#3F4147] hover:border-[#FF5E00]/30 transition-colors shadow-xs"
                title="Clique para gerenciar precificação dinâmica e taxas"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF5E00]"></span>
                  <span className="font-semibold text-[#352527] dark:text-white group-hover:text-[#E65300]">99Food Store</span>
                </div>
                <div className="text-right">
                  <strong className="text-[#352527] dark:text-white">{nineNineOrdersCount} pedidos</strong>
                </div>
              </div>

              {/* WhatsApp */}
              <div 
                onClick={() => setActiveTab('pricing')}
                className="cursor-pointer group flex items-center justify-between p-2.5 bg-[#FAF7F2] dark:bg-[#1E1F22] hover:bg-[#F0FDF4] dark:hover:bg-[#35373C] rounded-xl border border-[#EBE1D7] dark:border-[#3F4147] hover:border-emerald-300 transition-colors shadow-xs"
                title="Clique para gerenciar precificação dinâmica e taxas"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  <span className="font-semibold text-[#352527] dark:text-white group-hover:text-emerald-700">WhatsApp / Direto</span>
                </div>
                <div className="text-right">
                  <strong className="text-[#352527] dark:text-white">{whatsappOrdersCount} pedidos</strong>
                </div>
              </div>

              {/* Balcão */}
              <div 
                onClick={() => setActiveTab('pricing')}
                className="cursor-pointer group flex items-center justify-between p-2.5 bg-[#FAF7F2] dark:bg-[#1E1F22] hover:bg-[#FBF4F5] dark:hover:bg-[#35373C] rounded-xl border border-[#EBE1D7] dark:border-[#3F4147] hover:border-[#B86B77]/30 dark:hover:border-stone-500 transition-colors shadow-xs"
                title="Clique para gerenciar precificação dinâmica e taxas"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#B86B77] dark:bg-stone-300"></span>
                  <span className="font-semibold text-[#352527] dark:text-white group-hover:text-[#9E5460] dark:group-hover:text-white">Balcão Loja Física</span>
                </div>
                <div className="text-right">
                  <strong className="text-[#352527] dark:text-white">{balcaoOrdersCount} pedidos</strong>
                </div>
              </div>

            </div>
          </div>

          {/* Quick Nav Card */}
          <div className="bg-[#F5EFE6] dark:bg-[#2B2D31] rounded-2xl border border-[#E5DACF] dark:border-[#3F4147] p-4 text-xs space-y-2 shadow-xs">
            <h4 className="font-bold text-[#352527] dark:text-white text-xs uppercase tracking-wider">
              Ações Rápidas de Gestão
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setActiveTab('pricing')}
                className="p-2.5 bg-white dark:bg-[#1E1F22] hover:bg-[#FAF7F2] dark:hover:bg-[#35373C] rounded-xl border border-[#D5C5B5] dark:border-[#3F4147] hover:border-[#B86B77] dark:hover:border-stone-500 text-left transition-colors cursor-pointer"
              >
                <Percent className="w-4 h-4 text-[#B86B77] dark:text-white mb-1" />
                <div className="font-bold text-[#352527] dark:text-white">Precificação</div>
                <div className="text-[10px] text-[#7A6466] dark:text-[#B5BAC1]">Calcular taxas</div>
              </button>

              <button
                onClick={() => setActiveTab('sheets')}
                className="p-2.5 bg-white dark:bg-[#1E1F22] hover:bg-[#FAF7F2] dark:hover:bg-[#35373C] rounded-xl border border-[#D5C5B5] dark:border-[#3F4147] hover:border-[#B86B77] dark:hover:border-stone-500 text-left transition-colors cursor-pointer"
              >
                <ChefHat className="w-4 h-4 text-[#594446] dark:text-white mb-1" />
                <div className="font-bold text-[#352527] dark:text-white">Fichas Técnicas</div>
                <div className="text-[10px] text-[#7A6466] dark:text-[#B5BAC1]">Custo por grama</div>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
