import React, { useState, useEffect } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { Order, OrderChannel, OrderStatus, OrderType } from '../../types';
import { SkeletonLoader } from '../SkeletonLoader';
import { CancelOrderModal } from '../modals/CancelOrderModal';
import { ConfirmModal } from '../modals/ConfirmModal';
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  Printer, 
  Phone, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Layers, 
  List, 
  Kanban,
  Zap,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  Truck,
  Check,
  XCircle,
  PackageCheck,
  AlertCircle,
  Bike,
  Building2,
  Store,
  Maximize2,
  Minimize2,
  X,
  MessageCircle
} from 'lucide-react';

interface OrdersViewProps {
  onOpenNewOrder: () => void;
  onEditOrder: (order: Order) => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ 
  onOpenNewOrder, 
  onEditOrder,
  isFullScreen = false,
  onToggleFullScreen
}) => {
  const { 
    orders, 
    deleteOrder, 
    clearAllOrders,
    updateOrderStatus, 
    updateOrderLogistics,
    deliverySettings,
    toggleAutoAcceptOrders,
    acceptAllPendingOrders,
    ifoodConnected, 
    nineNineFoodConnected,
    fetchIfoodOrders,
    isFetchingIfood,
    lastIfoodFetchTime,
    isIfoodStoreOpen,
    isTogglingIfoodStore,
    toggleIfoodStoreStatus,
    ifoodPollingState,
    retryIfoodPollingNow,
    dismissIfoodPollingAlert,
    executeIfoodAction,
    fetchIfoodOrderDetails,
    simulateIncomingDeliveryOrder,
    updateOrder,
    isInitialLoading,
    supabaseRealtimeStatus,
    addToast
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

  const [search, setSearch] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [apiFeedback, setApiFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Cancellation modal state
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);

  // Delete modal state
  const [orderToDelete, setOrderToDelete] = useState<{ id: string, code: string } | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState<boolean>(false);

  // Dispatch / Logistics selection modal state
  const [logisticsModalOrder, setLogisticsModalOrder] = useState<Order | null>(null);
  const [modalDeliveredBy, setModalDeliveredBy] = useState<'MERCHANT' | 'IFOOD'>('MERCHANT');
  const [modalDeliveryType, setModalDeliveryType] = useState<'DELIVERY' | 'TAKEOUT' | 'INDOOR'>('DELIVERY');
  const [isQueryingIfoodApi, setIsQueryingIfoodApi] = useState(false);
  const [isAcceptingAll, setIsAcceptingAll] = useState(false);

  const pendingIfoodOrders = (orders || []).filter(o => o && o.channel === 'ifood' && (o.status === 'pendente' || o.ifoodIntegrationStatus === 'pending_confirmation'));

  const openLogisticsModal = (order: Order) => {
    setLogisticsModalOrder(order);
    // When channel is ifood, default to IFOOD unless already explicitly set to MERCHANT
    setModalDeliveredBy(order.deliveredBy || (order.channel === 'ifood' ? 'IFOOD' : 'MERCHANT'));
    setModalDeliveryType(order.deliveryType || 'DELIVERY');
  };

  const handleQueryIfoodModalDetails = async () => {
    if (!logisticsModalOrder) return;
    setIsQueryingIfoodApi(true);
    try {
      const res = await fetchIfoodOrderDetails(logisticsModalOrder.id);
      if (res.success && res.order) {
        setModalDeliveredBy(res.order.deliveredBy || 'IFOOD');
        setModalDeliveryType(res.order.deliveryType || 'DELIVERY');
        setApiFeedback({ type: 'success', message: res.message || 'Modalidade confirmada na API!' });
      } else {
        setApiFeedback({ type: 'error', message: res.message || 'Não foi possível consultar os detalhes na API do iFood.' });
      }
    } catch (err: any) {
      setApiFeedback({ type: 'error', message: err?.message || 'Erro ao comunicar com a API do iFood.' });
    } finally {
      setIsQueryingIfoodApi(false);
    }
  };

  const handleConfirmCancelOrder = async (order: Order, reason: string, cancellationCode: string) => {
    setActionInProgressId(order.id);
    try {
      if (order.channel === 'ifood') {
        const res = await executeIfoodAction(order.id, 'requestCancellation', reason, cancellationCode);
        if (res?.message) {
          setApiFeedback({ type: res.success ? 'success' : 'error', message: res.message });
        }
      } else {
        updateOrder(order.id, {
          status: 'cancelado',
          cancellationReason: reason,
          cancellationCode
        });
        setApiFeedback({ type: 'success', message: `Pedido ${order.code} cancelado com sucesso. Motivo registrado!` });
      }
    } catch (err: any) {
      setApiFeedback({ type: 'error', message: err?.message || 'Erro ao cancelar o pedido' });
    } finally {
      setActionInProgressId(null);
      setOrderToCancel(null);
    }
  };

  const handleSaveLogistics = async (andDispatch: boolean = false) => {
    if (!logisticsModalOrder) return;
    const order = logisticsModalOrder;
    setActionInProgressId(order.id);

    try {
      await updateOrderLogistics(order.id, modalDeliveredBy, modalDeliveryType);
      
      if (andDispatch) {
        if (order.channel === 'ifood') {
          // If IFOOD partner logistics, call readyToPickup
          // If MERCHANT own delivery, call dispatch
          const actionToExecute = modalDeliveredBy === 'IFOOD' ? 'readyToPickup' : 'dispatch';
          const res = await executeIfoodAction(order.id, actionToExecute, undefined, undefined, {
            deliveredBy: modalDeliveredBy
          });
          if (res?.message) {
            setApiFeedback({ type: res.success ? 'success' : 'error', message: res.message });
          }
        } else {
          updateOrderStatus(order.id, 'saiu_entrega');
          setApiFeedback({
            type: 'success',
            message: `Pedido ${order.code} despachado via ${modalDeliveredBy === 'IFOOD' ? 'Entrega iFood' : 'Entrega Própria'}!`
          });
        }
      } else {
        setApiFeedback({
          type: 'success',
          message: `Logística do pedido ${order.code} definida como ${modalDeliveredBy === 'IFOOD' ? 'Entrega Parceira iFood' : modalDeliveryType === 'TAKEOUT' ? 'Retirada no Balcão' : 'Entrega Própria'}`
        });
      }
    } catch (err: any) {
      setApiFeedback({ type: 'error', message: err?.message || 'Erro ao atualizar logística' });
    } finally {
      setActionInProgressId(null);
      setLogisticsModalOrder(null);
    }
  };

  useEffect(() => {
    if (apiFeedback) {
      const timer = setTimeout(() => {
        setApiFeedback(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [apiFeedback]);

  // Filter orders
  const filteredOrders = (orders || []).filter(o => {
    if (!o) return false;
    const searchLower = (search || '').toLowerCase();
    const matchesSearch = 
      String(o.customerName || '').toLowerCase().includes(searchLower) ||
      String(o.code || '').toLowerCase().includes(searchLower) ||
      String(o.customerAddress || '').toLowerCase().includes(searchLower) ||
      (o.items || []).some(i => i && i.productName && String(i.productName).toLowerCase().includes(searchLower));

    const matchesChannel = selectedChannel === 'all' || o.channel === selectedChannel;
    const matchesStatus = selectedStatus === 'all' || o.status === selectedStatus;
    const matchesType = selectedType === 'all' || o.type === selectedType;

    return matchesSearch && matchesChannel && matchesStatus && matchesType;
  });

  const handleDelete = (id: string, code: string) => {
    setOrderToDelete({ id, code });
  };

  const handleOpenWhatsApp = (phone: string, customerName: string, code: string, total: number, status: string) => {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (!cleanPhone) {
      alert('Cliente sem número de telefone válido registado!');
      return;
    }
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const text = encodeURIComponent(`Olá, ${customerName}! O seu pedido ${code} na Saborê no valor de R$ ${(total || 0).toFixed(2)} está com o estado: ${(status || '').toUpperCase()}. 🥖🍰`);
    window.open(`https://wa.me/${formattedPhone}?text=${text}`, '_blank');
  };

  const handleStatusChange = async (order: Order, newStatus: OrderStatus) => {
    if (newStatus === 'cancelado') {
      setOrderToCancel(order);
      return;
    }
    
    // If transitioning an iFood order
    if (order.channel === 'ifood') {
      if (newStatus === 'em_producao') {
        const res = await executeIfoodAction(order.id, 'confirm');
        if (res?.message) setApiFeedback({ type: res.success ? 'success' : 'error', message: res.message });
      } else if (newStatus === 'pronto') {
        const res = await executeIfoodAction(order.id, 'readyToPickup');
        if (res?.message) setApiFeedback({ type: res.success ? 'success' : 'error', message: res.message });
      } else if (newStatus === 'saiu_entrega') {
        const res = await executeIfoodAction(order.id, 'dispatch');
        if (res?.message) setApiFeedback({ type: res.success ? 'success' : 'error', message: res.message });
      } else if (newStatus === 'entregue') {
        const res = await executeIfoodAction(order.id, 'conclude');
        if (res?.message) setApiFeedback({ type: res.success ? 'success' : 'error', message: res.message });
      }
    }

    await updateOrderStatus(order.id, newStatus);
    setApiFeedback({ type: 'success', message: `Pedido ${order.code} atualizado para "${newStatus.replace('_', ' ')}"` });
  };

  const handleQuickIfoodAction = async (order: Order, action: string) => {
    if (action === 'requestCancellation') {
      setOrderToCancel(order);
      return;
    }
    setActionInProgressId(order.id);
    try {
      const res = await executeIfoodAction(order.id, action);
      if (res?.message) {
        setApiFeedback({ type: res.success ? 'success' : 'error', message: res.message });
      }
    } finally {
      setActionInProgressId(null);
    }
  };

  const getChannelBadge = (ch: OrderChannel) => {
    switch (ch) {
      case 'ifood':
        return <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-[#EA1D2C]/10 text-[#EA1D2C] border border-[#EA1D2C]/20">iFood</span>;
      case '99food':
        return <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-[#FF5E00]/10 text-[#E65300] border border-[#FF5E00]/20">99Food</span>;
      case 'whatsapp':
        return <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">WhatsApp</span>;
      case 'balcao':
        return <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">Balcão</span>;
    }
  };

  const getStatusBadge = (st: OrderStatus) => {
    switch (st) {
      case 'pendente':
        return <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-amber-400 text-stone-950 dark:bg-amber-400 dark:text-stone-950 border border-amber-500/40 shadow-2xs">⏳ Pendente</span>;
      case 'em_producao':
        return <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">🥣 Em Produção</span>;
      case 'pronto':
        return <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">📦 Pronto</span>;
      case 'saiu_entrega':
        return <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800/40">🛵 Saiu p/ Entrega</span>;
      case 'entregue':
        return <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">✅ Entregue</span>;
      case 'cancelado':
        return <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700">❌ Cancelado</span>;
    }
  };

  const getLogisticsBadge = (order: Order) => {
    if (order.deliveryType === 'TAKEOUT') {
      return (
        <button
          onClick={(e) => { e.stopPropagation(); openLogisticsModal(order); }}
          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800/60 hover:bg-purple-200 transition-colors cursor-pointer"
          title="Clique para alterar modalidade de logística"
        >
          <Store className="w-2.5 h-2.5 text-purple-600" />
          <span>Retirada Balcão</span>
        </button>
      );
    }

    if (order.deliveredBy === 'IFOOD') {
      return (
        <button
          onClick={(e) => { e.stopPropagation(); openLogisticsModal(order); }}
          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-[#EA1D2C] dark:text-rose-300 border border-[#EA1D2C]/40 hover:bg-rose-200 transition-colors cursor-pointer"
          title="Clique para alterar modalidade de logística"
        >
          <Building2 className="w-2.5 h-2.5 text-[#EA1D2C]" />
          <span>iFood Parceiro</span>
        </button>
      );
    }

    return (
      <button
        onClick={(e) => { e.stopPropagation(); openLogisticsModal(order); }}
        className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 hover:bg-amber-200 transition-colors cursor-pointer"
        title="Clique para alterar modalidade de logística"
      >
        <Bike className="w-2.5 h-2.5 text-amber-600" />
        <span>Entrega Própria</span>
      </button>
    );
  };

  const getIfoodIntegrationBadge = (order: Order) => {
    if (order.channel !== 'ifood') return null;

    const isBusy = actionInProgressId === order.id;
    const status = order.ifoodIntegrationStatus;

    if (isBusy || status === 'confirming') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse">
          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
          <span>Confirmando com iFood...</span>
        </span>
      );
    }

    if (status === 'dispatching') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700 animate-pulse">
          <Truck className="w-2.5 h-2.5 animate-spin" />
          <span>Despachando no iFood...</span>
        </span>
      );
    }

    if (status === 'cancelling') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700 animate-pulse">
          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
          <span>Cancelando no iFood...</span>
        </span>
      );
    }

    if (status === 'sync_error') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700" title={order.ifoodSyncError}>
          <AlertCircle className="w-2.5 h-2.5 text-red-600" />
          <span>Erro iFood</span>
        </span>
      );
    }

    if (order.status === 'pendente') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
          <span>Aguardando Aceite</span>
        </span>
      );
    }

    if (order.status === 'em_producao' || status === 'confirmed') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          <Check className="w-2.5 h-2.5 text-blue-600" />
          <span>Confirmado (iFood)</span>
        </span>
      );
    }

    if (order.status === 'pronto' || status === 'ready') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
          <PackageCheck className="w-2.5 h-2.5 text-purple-600" />
          <span>Aguardando Despacho</span>
        </span>
      );
    }

    if (order.status === 'saiu_entrega' || status === 'dispatched') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
          <Truck className="w-2.5 h-2.5 text-orange-600" />
          <span>{order.deliveredBy === 'IFOOD' ? 'Entrega iFood' : 'Despacho Próprio'}</span>
        </span>
      );
    }

    if (order.status === 'cancelado' || status === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
          <XCircle className="w-2.5 h-2.5 text-rose-500" />
          <span>Cancelado iFood</span>
        </span>
      );
    }

    return null;
  };

  const kanbanColumns: { id: OrderStatus; title: string; color: string }[] = [
    { id: 'pendente', title: 'Pendentes de Aceite', color: 'border-amber-300' },
    { id: 'em_producao', title: 'Em Produção / Forno', color: 'border-blue-300' },
    { id: 'pronto', title: 'Pronto / Embalando', color: 'border-purple-300' },
    { id: 'saiu_entrega', title: 'Com Entregador (Rota)', color: 'border-orange-300' },
    { id: 'entregue', title: 'Entregues / Concluídos', color: 'border-emerald-300' }
  ];

  const pendingCount = (orders || []).filter(o => o && o.status === 'pendente').length;
  const inProductionCount = (orders || []).filter(o => o && o.status === 'em_producao').length;
  const readyCount = (orders || []).filter(o => o && o.status === 'pronto').length;
  const outForDeliveryCount = (orders || []).filter(o => o && o.status === 'saiu_entrega').length;
  const deliveredCount = (orders || []).filter(o => o && o.status === 'entregue').length;

  return (
    <div className="space-y-5">
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E8DFD5] dark:border-[#3F4147]">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="font-serif-brand text-2xl font-bold text-[#352527] dark:text-[#FFFFFF]">
                Gestão de Pedidos & Encomendas
              </h2>

              {/* Polling active 'Sincronizando...' indicator */}
              {(ifoodPollingState.isPolling || isFetchingIfood) && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EA1D2C]/10 text-[#EA1D2C] border border-[#EA1D2C]/30 dark:bg-[#EA1D2C]/20 dark:text-red-300 dark:border-[#EA1D2C]/50 shadow-2xs animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#EA1D2C] dark:text-red-400" />
                  <span>Sincronizando...</span>
                </span>
              )}

              {pendingCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-stone-950 border border-amber-500/40 dark:bg-amber-400 dark:text-stone-950 dark:border-amber-300 shadow-sm animate-pulse">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-stone-950 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-stone-950"></span>
                  </span>
                  <span>{pendingCount} {pendingCount === 1 ? 'pedido novo/pendente' : 'pedidos novos/pendentes'}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1]">
              Central de controle de pronta-entrega e encomendas com sincronização em tempo real e integração iFood/99Food
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex items-center bg-[#F2EAE0] dark:bg-[#1E1F22] p-1 rounded-xl border border-[#E0D3C5] dark:border-[#3F4147] text-xs">
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium transition-colors cursor-pointer ${
                viewMode === 'table' 
                  ? 'bg-white dark:bg-[#2B2D31] text-[#382628] dark:text-[#FFFFFF] shadow-2xs font-bold' 
                  : 'text-[#7A6466] dark:text-[#B5BAC1] hover:text-[#352527] dark:hover:text-[#FFFFFF] hover:bg-white/50 dark:hover:bg-[#35373C]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Tabela</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium transition-colors cursor-pointer ${
                viewMode === 'kanban' 
                  ? 'bg-white dark:bg-[#2B2D31] text-[#382628] dark:text-[#FFFFFF] shadow-2xs font-bold' 
                  : 'text-[#7A6466] dark:text-[#B5BAC1] hover:text-[#352527] dark:hover:text-[#FFFFFF] hover:bg-white/50 dark:hover:bg-[#35373C]'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onToggleFullScreen && (
              <button
                onClick={onToggleFullScreen}
                className="p-2 rounded-xl bg-white dark:bg-[#2B2D31] text-[#7A6466] dark:text-[#B5BAC1] border border-[#E8DFD5] dark:border-[#3F4147] hover:bg-[#FAF7F2] dark:hover:bg-[#35373C] transition-colors shadow-xs cursor-pointer flex items-center justify-center"
                title={isFullScreen ? "Sair da Tela Cheia" : "Modo Tela Cheia"}
              >
                {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={() => simulateIncomingDeliveryOrder('ifood')}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#2B2D31] text-[#EA1D2C] border border-[#EA1D2C]/30 hover:bg-[#EA1D2C]/5 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Injeta um pedido de teste do iFood para validar notificações e fluxos"
            >
              <Zap className="w-4 h-4 fill-[#EA1D2C]/10" />
              <span>Simular iFood</span>
            </button>

            <button
              onClick={onOpenNewOrder}
              className="px-3.5 py-2 rounded-xl bg-[#B86B77] hover:bg-[#9E5460] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Pedido</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating/inline API Confirmation Feedback Banner */}
      {apiFeedback && (
        <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs shadow-sm transition-all duration-300 animate-fadeIn ${
          apiFeedback.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
            : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {apiFeedback.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span className="font-medium">{apiFeedback.message}</span>
          </div>
          <button
            onClick={() => setApiFeedback(null)}
            className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer text-sm font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Integration Live Status Strip */}
      <div className="p-3 bg-white dark:bg-[#2B2D31] rounded-xl border border-[#E8DFD5] dark:border-[#3F4147] flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-[#4A3739] dark:text-[#FFFFFF] flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-[#B86B77]" />
            <span>Conectores de Delivery:</span>
          </span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className={`w-2 h-2 rounded-full ${supabaseRealtimeStatus.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'}`}></span>
              Supabase Realtime {supabaseRealtimeStatus.isConnected ? '(Sincronização Ativa)' : '(Desconectado)'}
            </span>
            <span className="dark:text-[#3F4147]">•</span>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#EA1D2C]">
              <span className={`w-2 h-2 rounded-full ${ifoodConnected ? (ifoodPollingState.isPolling ? 'bg-[#EA1D2C] animate-ping' : 'bg-[#EA1D2C] animate-pulse') : 'bg-stone-300'}`}></span>
              <span>iFood {ifoodConnected ? '(ONLINE - Polling Contínuo Ativo)' : '(Offline)'}</span>
              {(ifoodPollingState.isPolling || isFetchingIfood) ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-[#EA1D2C] font-semibold animate-pulse ml-0.5">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Sincronizando...</span>
                </span>
              ) : ifoodConnected && ifoodPollingState.lastSuccessTimestamp && (
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-semibold ml-0.5">
                  ({safeFormatDate(ifoodPollingState.lastSuccessTimestamp, { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
                </span>
              )}
            </span>
            <span className="dark:text-[#3F4147]">•</span>
            <span className="flex items-center gap-1 text-[11px] font-medium text-[#E65300]">
              <span className={`w-2 h-2 rounded-full ${nineNineFoodConnected ? 'bg-[#FF5E00] animate-pulse' : 'bg-stone-300'}`}></span>
              99Food Connect {nineNineFoodConnected ? '(Online)' : '(Offline)'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {ifoodConnected && (
            <div className="flex items-center gap-2 border-r border-[#E8DFD5] dark:border-[#3F4147] pr-3">
              <span className="text-[11px] text-[#8C7678] dark:text-[#B5BAC1] font-medium">Status da Loja:</span>
                <button
                onClick={toggleIfoodStoreStatus}
                disabled={isTogglingIfoodStore}
                className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer ${
                  isTogglingIfoodStore
                    ? 'bg-stone-200 dark:bg-[#1E1F22] text-stone-500 cursor-not-allowed opacity-80'
                    : isIfoodStoreOpen 
                      ? 'bg-[#EA1D2C] text-white hover:bg-[#c91825]' 
                      : 'bg-stone-200 dark:bg-[#1E1F22] text-stone-600 dark:text-[#FFFFFF] hover:bg-stone-300 dark:hover:bg-[#35373C]'
                }`}
              >
                {isTogglingIfoodStore && <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full"></span>}
                {isTogglingIfoodStore 
                  ? 'Alterando...' 
                  : isIfoodStoreOpen ? '✅ Aberta no iFood' : '⛔ Fechada no iFood'
                }
              </button>
            </div>
          )}

          {/* Auto-Accept Toggle Button */}
          <div className="flex items-center gap-2 border-r border-[#E8DFD5] dark:border-[#3F4147] pr-3">
            <button
              type="button"
              onClick={() => {
                toggleAutoAcceptOrders();
                setApiFeedback({
                  type: 'success',
                  message: deliverySettings.ifood.autoAcceptOrders
                    ? 'Auto-Aceite de pedidos iFood DESATIVADO.'
                    : 'Auto-Aceite de pedidos iFood ATIVADO! Novos pedidos serão aceitos automaticamente.'
                });
              }}
              className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border ${
                deliverySettings.ifood.autoAcceptOrders
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-emerald-500/20'
                  : 'bg-stone-100 hover:bg-stone-200 dark:bg-[#1E1F22] dark:hover:bg-[#35373C] text-stone-600 dark:text-stone-300 border-stone-300 dark:border-[#3F4147]'
              }`}
              title={deliverySettings.ifood.autoAcceptOrders ? 'Clique para desativar aceite automático' : 'Clique para ativar aceite automático de pedidos iFood'}
            >
              <Zap className={`w-3.5 h-3.5 ${deliverySettings.ifood.autoAcceptOrders ? 'text-amber-300 fill-amber-300' : 'text-stone-400'}`} />
              <span>Auto-Aceite: {deliverySettings.ifood.autoAcceptOrders ? 'LIGADO' : 'DESLIGADO'}</span>
            </button>
          </div>

          {/* Batch Accept Pending Orders Button */}
          {pendingIfoodOrders.length > 0 && (
            <div className="flex items-center gap-2 border-r border-[#E8DFD5] dark:border-[#3F4147] pr-3">
              <button
                type="button"
                disabled={isAcceptingAll}
                onClick={async () => {
                  setIsAcceptingAll(true);
                  try {
                    const res = await acceptAllPendingOrders();
                    setApiFeedback({ type: res.success ? 'success' : 'error', message: res.message });
                  } finally {
                    setIsAcceptingAll(false);
                  }
                }}
                className="px-3 py-1.5 rounded-lg font-black text-[11px] bg-gradient-to-r from-amber-500 to-[#EA1D2C] hover:from-amber-600 hover:to-[#c91825] text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer animate-pulse"
                title="Aceitar todos os pedidos pendentes do iFood imediatamente"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isAcceptingAll ? 'Aceitando...' : `⚡ Aceitar ${pendingIfoodOrders.length} Pedido(s)`}</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#8C7678] dark:text-[#B5BAC1]">Recepção de pedidos:</span>
            {lastIfoodFetchTime && (
              <span className="text-[10px] text-stone-500 dark:text-[#B5BAC1] font-mono hidden sm:inline-block mr-1">
                Última busca: {new Date(lastIfoodFetchTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <button
              onClick={async () => {
                const res = await fetchIfoodOrders();
                if (res.success) {
                  addToast({
                    type: res.newOrdersCount > 0 ? 'success' : 'info',
                    title: res.newOrdersCount > 0 ? 'Sincronização iFood' : 'Busca iFood Finalizada',
                    message: res.message || 'Sincronização concluída com sucesso.'
                  });
                } else {
                  addToast({
                    type: 'error',
                    title: 'Falha na Busca iFood',
                    message: res.message || 'Erro ao conectar à API do iFood.'
                  });
                }
              }}
              disabled={isFetchingIfood}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors flex items-center gap-1.5 cursor-pointer ${
                isFetchingIfood 
                  ? 'bg-stone-100 dark:bg-[#1E1F22] text-stone-400 cursor-not-allowed'
                  : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-[#35373C] border border-transparent dark:border-emerald-800/40'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingIfood ? 'animate-spin' : ''}`} />
              {isFetchingIfood ? 'Buscando...' : 'Buscar iFood API'}
            </button>

            <button
              onClick={() => setShowClearAllModal(true)}
              className="px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors flex items-center gap-1.5 cursor-pointer bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/30"
              title="Apagar todos os pedidos travados ou concluídos para limpar o painel"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar Pedidos</span>
            </button>
          </div>
        </div>
      </div>

      {/* Visual Alert: Polling Failure with Exponential Backoff Indicator */}
      {ifoodConnected && ifoodPollingState.failureCount > 0 && (
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 shadow-sm animate-fadeIn">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold flex items-center gap-2">
                <span>Alerta de Conexão iFood: Falha no Polling ({ifoodPollingState.failureCount} tentativa(s))</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-mono">
                  Backoff: {ifoodPollingState.currentBackoffSeconds}s
                </span>
              </div>
              <div className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                {ifoodPollingState.lastErrorMessage || 'Houve uma falha temporária ao sincronizar com a fila de eventos do iFood.'}
                {ifoodPollingState.nextRetryTimestamp && (
                  <span className="ml-1 opacity-80">
                    Próxima tentativa automática às {safeFormatDate(ifoodPollingState.nextRetryTimestamp, { hour: '2-digit', minute: '2-digit' })}.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={retryIfoodPollingNow}
              disabled={ifoodPollingState.isPolling}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${ifoodPollingState.isPolling ? 'animate-spin' : ''}`} />
              <span>{ifoodPollingState.isPolling ? 'Tentando...' : 'Tentar Agora'}</span>
            </button>

            <button
              onClick={dismissIfoodPollingAlert}
              title="Dispensar aviso"
              className="p-1.5 rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Quick Status Filter Pills with Real-Time Badges */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        <button
          onClick={() => setSelectedStatus('all')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border ${
            selectedStatus === 'all'
              ? 'bg-[#352527] dark:bg-[#FFFFFF] text-white dark:text-[#1E1F22] border-[#352527] dark:border-white shadow-xs'
              : 'bg-white dark:bg-[#2B2D31] text-[#7A6466] dark:text-[#B5BAC1] border-[#E8DFD5] dark:border-[#3F4147] hover:bg-[#FAF7F2] dark:hover:bg-[#35373C]'
          }`}
        >
          <span>Todos os Pedidos</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            selectedStatus === 'all' ? 'bg-white/20 dark:bg-black/20 text-white dark:text-[#1E1F22]' : 'bg-stone-100 dark:bg-[#1E1F22] text-stone-700 dark:text-[#B5BAC1]'
          }`}>
            {(orders || []).length}
          </span>
        </button>

        <button
          onClick={() => setSelectedStatus('pendente')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border ${
            selectedStatus === 'pendente'
              ? 'bg-amber-400 text-stone-950 border-amber-400 shadow-xs font-black'
              : 'bg-white dark:bg-[#2B2D31] text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-500/30 hover:bg-amber-50 dark:hover:bg-[#35373C]'
          }`}
        >
          {pendingCount > 0 && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          )}
          <span>⏳ Pendentes</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
            selectedStatus === 'pendente' ? 'bg-black/20 text-stone-950' : 'bg-amber-400 dark:bg-amber-400 text-stone-950'
          }`}>
            {pendingCount}
          </span>
        </button>

        <button
          onClick={() => setSelectedStatus('em_producao')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border ${
            selectedStatus === 'em_producao'
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'bg-white dark:bg-[#2B2D31] text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800/40 hover:bg-blue-50 dark:hover:bg-[#35373C]'
          }`}
        >
          <span>🥣 Em Produção</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
            selectedStatus === 'em_producao' ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-300'
          }`}>
            {inProductionCount}
          </span>
        </button>

        <button
          onClick={() => setSelectedStatus('pronto')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border ${
            selectedStatus === 'pronto'
              ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
              : 'bg-white dark:bg-[#2B2D31] text-purple-900 dark:text-purple-300 border-purple-200 dark:border-purple-800/40 hover:bg-purple-50 dark:hover:bg-[#35373C]'
          }`}
        >
          <span>📦 Pronto</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
            selectedStatus === 'pronto' ? 'bg-white/20 text-white' : 'bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-300'
          }`}>
            {readyCount}
          </span>
        </button>

        <button
          onClick={() => setSelectedStatus('saiu_entrega')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border ${
            selectedStatus === 'saiu_entrega'
              ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
              : 'bg-white dark:bg-[#2B2D31] text-orange-900 dark:text-orange-300 border-orange-200 dark:border-orange-800/40 hover:bg-orange-50 dark:hover:bg-[#35373C]'
          }`}
        >
          <span>🛵 Saiu p/ Entrega</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
            selectedStatus === 'saiu_entrega' ? 'bg-white/20 text-white' : 'bg-orange-100 dark:bg-orange-950 text-orange-900 dark:text-orange-300'
          }`}>
            {outForDeliveryCount}
          </span>
        </button>

        <button
          onClick={() => setSelectedStatus('entregue')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border ${
            selectedStatus === 'entregue'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white dark:bg-[#2B2D31] text-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-50 dark:hover:bg-[#35373C]'
          }`}
        >
          <span>✅ Entregue</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
            selectedStatus === 'entregue' ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300'
          }`}>
            {deliveredCount}
          </span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 bg-[#FAF7F2] dark:bg-[#1E1F22] p-3 rounded-xl border border-[#E8DFD5] dark:border-[#3F4147]">
        
        {/* Search */}
        <div className="sm:col-span-4 relative">
          <Search className="w-4 h-4 text-[#9E898B] dark:text-[#B5BAC1] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por cliente, código (#SAB-...) ou item..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-white dark:bg-[#1E1F22] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white placeholder-[#9E898B] dark:placeholder-[#7A6466] focus:outline-[#B86B77]"
          />
        </div>

        {/* Channel filter */}
        <div className="sm:col-span-3">
          <select
            value={selectedChannel}
            onChange={e => setSelectedChannel(e.target.value)}
            className="w-full text-xs px-3 py-2 bg-white dark:bg-[#1E1F22] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white focus:outline-[#B86B77]"
          >
            <option value="all">Todos os Canais</option>
            <option value="ifood">iFood (Comissão 23%)</option>
            <option value="99food">99Food (Comissão 20%)</option>
            <option value="whatsapp">WhatsApp / Encomenda</option>
            <option value="balcao">Balcão da Confeitaria</option>
          </select>
        </div>

        {/* Status filter */}
        <div className="sm:col-span-3">
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="w-full text-xs px-3 py-2 bg-white dark:bg-[#1E1F22] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white focus:outline-[#B86B77]"
          >
            <option value="all">Todos os Status</option>
            <option value="pendente">Pendente</option>
            <option value="em_producao">Em Produção</option>
            <option value="pronto">Pronto</option>
            <option value="saiu_entrega">Saiu p/ Entrega</option>
            <option value="entregue">Entregue</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        {/* Type filter */}
        <div className="sm:col-span-2">
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="w-full text-xs px-3 py-2 bg-white dark:bg-[#1E1F22] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white focus:outline-[#B86B77]"
          >
            <option value="all">Todos os Tipos</option>
            <option value="pronta_entrega">Pronta Entrega</option>
            <option value="encomenda">Encomendas</option>
          </select>
        </div>

      </div>

      {/* Table Mode */}
      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] overflow-hidden shadow-2xs">
          {isInitialLoading ? (
            <SkeletonLoader variant="table" rows={5} />
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center space-y-4">
              <div className="w-16 h-16 bg-[#F2EAE0] dark:bg-[#1E1F22] rounded-full flex items-center justify-center text-[#B86B77]">
                <PackageCheck className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#352527] dark:text-[#FFFFFF]">Nenhum pedido encontrado</h3>
                <p className="text-xs text-[#8C7678] dark:text-[#B5BAC1]">Não há pedidos que correspondam aos filtros atuais.</p>
              </div>
              <button
                onClick={onOpenNewOrder}
                className="mt-2 px-4 py-2 bg-[#B86B77] hover:bg-[#9E5460] text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Criar Novo Pedido
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] dark:bg-[#1E1F22] border-b border-[#E8DFD5] dark:border-[#3F4147] text-[#7A6466] dark:text-[#B5BAC1] font-semibold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Código / Canal</th>
                    <th className="p-3.5">Cliente & Endereço</th>
                    <th className="p-3.5">Itens do Pedido</th>
                    <th className="p-3.5 text-center">Data / Horário</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Total / Líquido</th>
                    <th className="p-3.5 text-center w-28">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0E8DF] dark:divide-[#382B2E]">
                  {filteredOrders.map(order => (
                    <tr key={order.id} className="hover:bg-[#FAF7F2] dark:hover:bg-[#35373C] transition-colors">
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-[#352527] dark:text-[#FFFFFF] flex items-center gap-1.5">
                          <span>{order.code}</span>
                          {order.orderTiming === 'SCHEDULED' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              Agendado
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          {getChannelBadge(order.channel)}
                          {getLogisticsBadge(order)}
                          <span className="text-[10px] text-[#8C7678] dark:text-[#B5BAC1] capitalize">
                            {order.type?.replace('_', ' ') || order.type}
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5 max-w-xs">
                        <div className="font-bold text-[#352527] dark:text-[#FFFFFF]">{order.customerName}</div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenWhatsApp(order.customerPhone, order.customerName, order.code, order.total, order.status);
                          }}
                          className="text-[11px] text-[#6E595B] dark:text-[#B5BAC1] hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 mt-0.5 transition-colors cursor-pointer group text-left"
                          title="Conversar no WhatsApp"
                        >
                          <Phone className="w-3 h-3 text-[#B86B77] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                          <span className="group-hover:underline">{order.customerPhone || 'Sem telefone'}</span>
                        </button>
                        {order.customerAddress && (
                          <div className="text-[11px] text-[#8C7678] dark:text-[#B5BAC1] truncate flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-stone-400" />
                            <span title={order.customerAddress}>{order.customerAddress}</span>
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 max-w-sm">
                        <div className="space-y-0.5">
                          {(order.items || []).map((it, idx) => {
                            if (!it) return null;
                            const name = it.productName || (it as any).product_name || (it as any).name || 'Produto';
                            const qty = it.quantity ?? (it as any).qty ?? 1;
                            const unitPrice = it.unitPrice ?? (it as any).unit_price ?? 0;
                            return (
                              <div key={`${order.id}-item-${idx}`} className="text-[#3D2C2E] dark:text-white font-medium flex items-center justify-between gap-1 text-[11px]">
                                <div className="flex items-center gap-1">
                                  <span className="font-bold text-[#B86B77]">{qty}x</span>
                                  <span>{name}</span>
                                </div>
                                {unitPrice > 0 && (
                                  <span className="text-[10px] text-stone-500">
                                    R$ {(unitPrice * qty).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {order.notes && (
                          <div className="text-[11px] text-[#9E5460] dark:text-rose-300 italic mt-1 bg-[#F9EFF0] dark:bg-rose-950/40 px-2 py-0.5 rounded border border-[#F2D7DA] dark:border-rose-900/40">
                            Obs: {order.notes}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="font-semibold text-[#352527] dark:text-[#FFFFFF]">
                          {safeFormatDate(order.deliveryDate, { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-[10px] text-[#8C7678] dark:text-[#B5BAC1]">
                          {safeFormatDate(order.deliveryDate, { day: '2-digit', month: '2-digit' })}
                        </div>
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div>{getStatusBadge(order.status)}</div>
                          {getIfoodIntegrationBadge(order)}
                          
                          {/* Quick action buttons for iFood channel */}
                          {order.channel === 'ifood' && (
                            <div className="flex items-center gap-1 mt-1">
                              {order.status === 'pendente' && (
                                <button
                                  onClick={() => handleQuickIfoodAction(order, 'confirm')}
                                  disabled={actionInProgressId === order.id}
                                  className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold transition-colors cursor-pointer shadow-2xs"
                                >
                                  Aceitar iFood
                                </button>
                              )}
                              {(order.status === 'em_producao' || order.status === 'pronto') && (
                                <button
                                  onClick={() => handleQuickIfoodAction(order, 'dispatch')}
                                  disabled={actionInProgressId === order.id}
                                  className="px-2 py-0.5 rounded bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold transition-colors cursor-pointer shadow-2xs"
                                >
                                  Despachar iFood
                                </button>
                              )}
                            </div>
                          )}

                          <div className="mt-1">
                            <select
                              value={order.status}
                              onChange={e => handleStatusChange(order, e.target.value as OrderStatus)}
                              className="text-[10px] px-1.5 py-0.5 bg-white dark:bg-[#1E1F22] rounded border border-[#DACDC0] dark:border-[#3F4147] text-[#553E41] dark:text-[#FFFFFF]"
                            >
                              <option value="pendente">Pendente</option>
                              <option value="em_producao">Em Produção</option>
                              <option value="pronto">Pronto</option>
                              <option value="saiu_entrega">Saiu Entrega</option>
                              <option value="entregue">Entregue</option>
                              <option value="cancelado">Cancelado</option>
                            </select>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="font-bold text-[#352527] dark:text-[#FFFFFF]">
                          R$ {(Number(order.total) || Number(order.netAmount) || 0).toFixed(2)}
                        </div>
                        {order.channel === 'ifood' && Number(order.netAmount) > 0 && Math.abs(Number(order.netAmount) - Number(order.total)) > 0.01 && (
                          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                            Líq: R$ {Number(order.netAmount).toFixed(2)}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setReceiptOrder(order)}
                            title="Imprimir comanda de produção / comprovante de entrega"
                            className="p-1.5 text-[#7A6466] dark:text-[#B5BAC1] hover:text-[#352527] dark:hover:text-[#FFFFFF] hover:bg-[#EAE0D5] dark:hover:bg-[#35373C] rounded-lg transition-colors cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenWhatsApp(order.customerPhone, order.customerName, order.code, order.total, order.status);
                            }}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Enviar mensagem no WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEditOrder(order)}
                            title="Editar pedido"
                            className="p-1.5 text-[#7A6466] dark:text-[#B5BAC1] hover:text-[#B86B77] dark:hover:text-white hover:bg-[#FAF0F2] dark:hover:bg-[#35373C] rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(order.id, order.code)}
                            title="Excluir pedido"
                            className="p-1.5 text-[#7A6466] dark:text-[#B5BAC1] hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-[#35373C] rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : isInitialLoading ? (
        <SkeletonLoader variant="kanban" />
      ) : (
        /* Kanban Board Mode */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {kanbanColumns.map(col => {
            const colOrders = filteredOrders.filter(o => o.status === col.id);
            return (
              <div key={col.id} className={`bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-2xl border-t-4 ${col.color} border border-[#E8DFD5] dark:border-[#3F4147] p-3 flex flex-col min-w-[240px]`}>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E8DFD5] dark:border-[#3F4147]">
                  <h3 className="font-bold text-xs text-[#352527] dark:text-[#FFFFFF]">{col.title}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAE0D5] dark:bg-[#2B2D31] text-[#553E41] dark:text-[#B5BAC1]">
                    {colOrders.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[650px] pr-1">
                  {colOrders.length === 0 ? (
                    isFetchingIfood && orders.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="animate-spin inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full text-[#EA1D2C] mb-2"></div>
                        <div className="text-[10px] text-[#A89698] dark:text-[#B5BAC1] animate-pulse">Sincronizando...</div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-[11px] text-[#A89698] dark:text-[#B5BAC1]">
                        Nenhum pedido nesta etapa
                      </div>
                    )
                  ) : (
                    colOrders.map(order => (
                      <div key={order.id} className="bg-white dark:bg-[#2B2D31] rounded-xl p-3 border border-[#E5DACF] dark:border-[#3F4147] shadow-2xs space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-[#352527] dark:text-[#FFFFFF]">{order.code}</span>
                          <div className="flex items-center gap-1">
                            {order.orderTiming === 'SCHEDULED' && (
                              <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                                Agendado
                              </span>
                            )}
                            {getChannelBadge(order.channel)}
                            {getLogisticsBadge(order)}
                          </div>
                        </div>

                        {order.channel === 'ifood' && (
                          <div className="pt-0.5">
                            {getIfoodIntegrationBadge(order)}
                          </div>
                        )}

                        <div>
                          <div className="font-bold text-[#352527] dark:text-[#FFFFFF]">{order.customerName}</div>
                          <div className="text-[11px] text-[#7A6466] dark:text-[#B5BAC1] flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-[#B86B77]" />
                            <span>
                              {safeFormatDate(order.deliveryDate, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        <div className="text-[11px] text-[#553E41] dark:text-[#B5BAC1] border-t border-[#F2ECE4] dark:border-[#3F4147] pt-1.5">
                          {(order.items || []).map(i => i ? `${i.quantity ?? (i as any).qty ?? 1}x ${i.productName || (i as any).product_name || (i as any).name || 'Item'}` : '').filter(Boolean).join(', ')}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-[#F2ECE4] dark:border-[#3F4147]">
                          <div>
                            <span className="font-bold text-[#352527] dark:text-[#FFFFFF]">
                              R$ {(Number(order.total) || Number(order.netAmount) || 0).toFixed(2)}
                            </span>
                            {order.channel === 'ifood' && Number(order.netAmount) > 0 && Math.abs(Number(order.netAmount) - Number(order.total)) > 0.01 && (
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium ml-1.5">
                                (Líq: R$ {Number(order.netAmount).toFixed(2)})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenWhatsApp(order.customerPhone, order.customerName, order.code, order.total, order.status);
                              }}
                              className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition-colors cursor-pointer"
                              title="Enviar mensagem no WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onEditOrder(order)}
                              className="p-1 text-stone-400 dark:text-[#B5BAC1] hover:text-[#B86B77] dark:hover:text-white hover:bg-[#FAF0F2] dark:hover:bg-[#35373C] rounded transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(order.id, order.code)}
                              className="p-1 text-stone-400 dark:text-[#B5BAC1] hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-[#35373C] rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Fast forward button in kanban */}
                        {order.status !== 'entregue' && (
                          <button
                            onClick={() => {
                              const nextStatus = 
                                order.status === 'pendente' ? 'em_producao' :
                                order.status === 'em_producao' ? 'pronto' :
                                order.status === 'pronto' ? 'saiu_entrega' : 'entregue';
                              handleStatusChange(order, nextStatus);
                            }}
                            className="w-full py-1 bg-[#FAF7F2] dark:bg-[#1E1F22] hover:bg-[#F2EAE0] dark:hover:bg-[#35373C] rounded-lg border border-[#E0D3C5] dark:border-[#3F4147] text-[10px] font-bold text-[#695456] dark:text-[#FFFFFF] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>Avançar Etapa</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Printable Comanda / Order Receipt Modal */}
      {receiptOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-stone-200 dark:border-[#3F4147] shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8DFD5] dark:border-[#3F4147] pb-3">
              <div>
                <h3 className="font-serif-brand text-lg font-bold text-[#352527] dark:text-[#FFFFFF]">
                  Comanda de Produção & Entrega
                </h3>
                <span className="text-[11px] text-[#7A6466] dark:text-[#B5BAC1]">Saborê — Confeitaria & Panificação</span>
              </div>
              <button
                onClick={() => setReceiptOrder(null)}
                className="p-1 text-stone-400 dark:text-[#B5BAC1] hover:text-stone-700 dark:hover:text-white hover:bg-[#FAF7F2] dark:hover:bg-[#35373C] rounded-lg text-sm font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Receipt body simulating thermal receipt */}
            <div className="bg-[#FAF8F5] dark:bg-[#1E1F22] p-4 rounded-xl border border-dashed border-[#DACDC0] dark:border-[#3F4147] font-mono text-xs space-y-2 text-[#352527] dark:text-[#FFFFFF]">
              <div className="text-center pb-2 border-b border-[#E0D5C7] dark:border-[#3F4147]">
                <div className="font-bold text-sm">SABORÊ ARTESANAL</div>
                <div className="text-[10px] text-stone-500 dark:text-[#B5BAC1]">DELIVERY & ENCOMENDAS</div>
                <div className="text-[11px] font-bold mt-1 text-[#B86B77]">{receiptOrder.code}</div>
              </div>

              <div className="text-[11px] space-y-0.5">
                <div><strong>Cliente:</strong> {receiptOrder.customerName}</div>
                <div><strong>Telefone:</strong> {receiptOrder.customerPhone}</div>
                {receiptOrder.customerDocument && (
                  <div><strong>CPF na Nota:</strong> {receiptOrder.customerDocument}</div>
                )}
                {receiptOrder.pickupCode && (
                  <div><strong>PIN/Código de Coleta:</strong> <span className="font-bold underline">{receiptOrder.pickupCode}</span></div>
                )}
                {receiptOrder.customerAddress && (
                  <div><strong>Endereço:</strong> {receiptOrder.customerAddress}</div>
                )}
                <div><strong>Canal:</strong> {receiptOrder.channel.toUpperCase()} {receiptOrder.deliveredBy ? `(${receiptOrder.deliveredBy === 'IFOOD' ? 'Entrega iFood' : 'Entrega Loja'})` : ''}</div>
                <div><strong>Previsão:</strong> {safeFormatDate(receiptOrder.deliveryDate, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }, 'Não informada')}</div>
              </div>

              <div className="border-t border-b border-[#E0D5C7] dark:border-[#3F4147] py-2 space-y-1.5">
                <div className="font-bold text-[10px] text-stone-500 dark:text-[#B5BAC1] uppercase">Itens da Cozinha:</div>
                {(receiptOrder.items || []).map((it, idx) => (
                  it && (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between font-semibold">
                        <span>{it.quantity}x {it.productName}</span>
                        <span>R$ {(Number(it.totalPrice || ((it.quantity || 0) * (it.unitPrice || 0)))).toFixed(2)}</span>
                      </div>
                      {it.notes && (
                        <div className="text-[10px] text-[#B86B77] italic pl-2">
                          Obs: {it.notes}
                        </div>
                      )}
                      {Array.isArray(it.options) && it.options.length > 0 && (
                        <div className="pl-2 space-y-0.5 text-[10px] text-stone-600 dark:text-stone-300">
                          {it.options.map((opt: any, oIdx: number) => (
                            <div key={oIdx} className="flex justify-between">
                              <span>+ {opt.quantity}x {opt.name}</span>
                              {Number(opt.price || opt.unitPrice || 0) > 0 && (
                                <span>R$ {(Number(opt.totalPrice || (opt.price * opt.quantity) || 0)).toFixed(2)}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                ))}
              </div>

              {receiptOrder.notes && (
                <div className="bg-[#FFF2F4] dark:bg-rose-950/30 p-2 rounded text-[11px] border border-[#F0D5D8] dark:border-rose-900/40 text-[#9E5460] dark:text-rose-300">
                  <strong>OBSERVAÇÃO:</strong> {receiptOrder.notes}
                </div>
              )}

              <div className="border-t border-[#E0D5C7] dark:border-[#3F4147] pt-2 space-y-1 text-right">
                <div>Subtotal: R$ {(Number(receiptOrder.subtotal) || Number(receiptOrder.total) || 0).toFixed(2)}</div>
                <div>Taxa Entrega: R$ {(Number(receiptOrder.deliveryFee) || 0).toFixed(2)}</div>
                {(Number(receiptOrder.discount) || 0) > 0 && <div>Desconto: - R$ {(Number(receiptOrder.discount) || 0).toFixed(2)}</div>}
                <div className="font-bold text-sm pt-1 border-t border-[#E0D5C7] dark:border-[#3F4147]">TOTAL: R$ {(Number(receiptOrder.total) || 0).toFixed(2)}</div>
                <div className="text-[10px] text-stone-600 dark:text-[#B5BAC1]">
                  Pagamento: {receiptOrder.paymentDescription || String(receiptOrder.paymentMethod || 'OUTRO').toUpperCase()}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setReceiptOrder(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-stone-200 dark:border-[#3F4147] bg-white dark:bg-[#1E1F22] text-[#553E41] dark:text-[#FFFFFF] hover:bg-[#FAF7F2] dark:hover:bg-[#35373C] transition-colors cursor-pointer"
              >
                Fechar
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#B86B77] hover:bg-[#9E5460] text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Comanda</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Logistics & Dispatch Selector Modal */}
      {logisticsModalOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-stone-200 dark:border-[#3F4147] shadow-2xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-start justify-between border-b border-[#E8DFD5] dark:border-[#3F4147] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif-brand text-lg font-bold text-[#352527] dark:text-[#FFFFFF]">
                    Modalidade de Logística & Envio
                  </h3>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#FAF0F2] dark:bg-stone-800 text-[#B86B77] border border-[#F2D7DA] dark:border-[#3F4147]">
                    {logisticsModalOrder.code}
                  </span>
                </div>
                <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1] mt-0.5">
                  Escolha como o pedido sairá da confeitaria: Entrega Parceira iFood ou Frota Própria Saborê
                </p>
              </div>
              <button
                onClick={() => setLogisticsModalOrder(null)}
                className="p-1 text-[#8C7678] dark:text-[#B5BAC1] hover:text-[#352527] dark:hover:text-white hover:bg-[#FAF7F2] dark:hover:bg-[#35373C] rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Customer & Order Recap */}
            <div className="bg-[#FAF6F0] dark:bg-[#1E1F22] p-3 rounded-xl border border-[#E8DFD5] dark:border-[#3F4147] space-y-2 text-xs">
              {logisticsModalOrder.channel === 'ifood' && (
                <div className="flex items-center justify-between bg-rose-50 dark:bg-rose-950/60 p-2 rounded-lg border border-rose-200 dark:border-rose-900/50">
                  <div className="flex items-center gap-1.5 text-[#EA1D2C] font-bold text-[11px]">
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span>iFood Selecionado por Padrão</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleQueryIfoodModalDetails}
                    disabled={isQueryingIfoodApi}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-white dark:bg-[#2B2D31] text-[#EA1D2C] border border-[#EA1D2C]/30 hover:bg-rose-100/50 flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                    title="Solicita à API do iFood para confirmar se a entrega é Parceira iFood ou Própria"
                  >
                    <RefreshCw className={`w-3 h-3 ${isQueryingIfoodApi ? 'animate-spin' : ''}`} />
                    <span>{isQueryingIfoodApi ? 'Consultando API...' : 'Confirmar na API iFood'}</span>
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="font-bold text-[#352527] dark:text-[#FFFFFF]">{logisticsModalOrder.customerName}</span>
                <span className="text-[10px] text-stone-500 font-mono">{logisticsModalOrder.customerPhone}</span>
              </div>
              {logisticsModalOrder.customerAddress && (
                <div className="text-[11px] text-[#7A6466] dark:text-[#B5BAC1] flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#B86B77] shrink-0" />
                  <span className="truncate">{logisticsModalOrder.customerAddress}</span>
                </div>
              )}
              {logisticsModalOrder.pickupCode && (
                <div className="mt-1 pt-1 border-t border-[#E8DFD5] dark:border-[#3F4147] flex items-center justify-between text-[11px]">
                  <span className="text-rose-700 dark:text-rose-400 font-semibold">PIN de Coleta iFood:</span>
                  <span className="font-mono font-bold text-sm bg-rose-100 dark:bg-rose-950/80 px-2 py-0.5 rounded text-[#EA1D2C]">
                    {logisticsModalOrder.pickupCode}
                  </span>
                </div>
              )}
            </div>

            {/* Logistics Choices */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-[#543E40] dark:text-[#E0D3C5]">
                Selecione quem fará a entrega / transporte:
              </label>

              {/* Option 1: Entrega Própria (MERCHANT) */}
              <button
                type="button"
                onClick={() => {
                  setModalDeliveredBy('MERCHANT');
                  setModalDeliveryType('DELIVERY');
                }}
                className={`w-full p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  modalDeliveredBy === 'MERCHANT' && modalDeliveryType !== 'TAKEOUT'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200 ring-2 ring-amber-400/40 shadow-xs'
                    : 'bg-white dark:bg-[#1E1F22] border-[#E8DFD5] dark:border-[#3F4147] text-[#553E41] dark:text-[#B5BAC1] hover:bg-[#FAF0F2] dark:hover:bg-[#35373C]'
                }`}
              >
                <div className={`p-2 rounded-lg mt-0.5 ${modalDeliveredBy === 'MERCHANT' && modalDeliveryType !== 'TAKEOUT' ? 'bg-amber-500 text-white' : 'bg-stone-100 dark:bg-[#2B2D31] text-stone-600 dark:text-stone-300'}`}>
                  <Bike className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>Entrega Própria da Confeitaria (Saborê)</span>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-200 text-amber-900">MERCHANT</span>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-snug">
                    Utiliza o motoboy ou frota própria da confeitaria Saborê. Você tem controle direto da rota de entrega.
                  </p>
                </div>
              </button>

              {/* Option 2: Entrega Parceira iFood (IFOOD) */}
              <button
                type="button"
                onClick={() => {
                  setModalDeliveredBy('IFOOD');
                  setModalDeliveryType('DELIVERY');
                }}
                className={`w-full p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  modalDeliveredBy === 'IFOOD' && modalDeliveryType !== 'TAKEOUT'
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-[#EA1D2C] text-rose-950 dark:text-rose-200 ring-2 ring-[#EA1D2C]/40 shadow-xs'
                    : 'bg-white dark:bg-[#1E1F22] border-[#E8DFD5] dark:border-[#3F4147] text-[#553E41] dark:text-[#B5BAC1] hover:bg-[#FAF0F2] dark:hover:bg-[#35373C]'
                }`}
              >
                <div className={`p-2 rounded-lg mt-0.5 ${modalDeliveredBy === 'IFOOD' && modalDeliveryType !== 'TAKEOUT' ? 'bg-[#EA1D2C] text-white' : 'bg-stone-100 dark:bg-[#2B2D31] text-stone-600 dark:text-stone-300'}`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>Entrega Parceira do iFood</span>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-rose-200 text-rose-900">IFOOD</span>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-snug">
                    O iFood aloca um entregador parceiro oficial para vir coletar o pedido na loja. A coleta é liberada ao informar o PIN ao motoboy.
                  </p>
                </div>
              </button>

              {/* Option 3: Retirada no Balcão (TAKEOUT) */}
              <button
                type="button"
                onClick={() => {
                  setModalDeliveryType('TAKEOUT');
                }}
                className={`w-full p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  modalDeliveryType === 'TAKEOUT'
                    ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-900 dark:text-purple-200 ring-2 ring-purple-400/40 shadow-xs'
                    : 'bg-white dark:bg-[#1E1F22] border-[#E8DFD5] dark:border-[#3F4147] text-[#553E41] dark:text-[#B5BAC1] hover:bg-[#FAF0F2] dark:hover:bg-[#35373C]'
                }`}
              >
                <div className={`p-2 rounded-lg mt-0.5 ${modalDeliveryType === 'TAKEOUT' ? 'bg-purple-600 text-white' : 'bg-stone-100 dark:bg-[#2B2D31] text-stone-600 dark:text-stone-300'}`}>
                  <Store className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>Retirada no Balcão Física</span>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-purple-200 text-purple-900">TAKEOUT</span>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-snug">
                    O próprio cliente vem até a loja física retirar o produto pronto.
                  </p>
                </div>
              </button>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8DFD5] dark:border-[#3F4147]">
              <button
                type="button"
                onClick={() => setLogisticsModalOrder(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-stone-200 dark:border-[#3F4147] bg-white dark:bg-[#1E1F22] text-[#553E41] dark:text-[#FFFFFF] hover:bg-[#FAF7F2] dark:hover:bg-[#35373C] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleSaveLogistics(false)}
                disabled={actionInProgressId === logisticsModalOrder.id}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-stone-100 dark:bg-[#35373C] text-[#352527] dark:text-white border border-stone-300 dark:border-[#4E5058] hover:bg-stone-200 transition-colors cursor-pointer"
              >
                {actionInProgressId === logisticsModalOrder.id ? 'Salvando...' : 'Salvar Logística'}
              </button>
              <button
                type="button"
                onClick={() => handleSaveLogistics(true)}
                disabled={actionInProgressId === logisticsModalOrder.id}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#B86B77] hover:bg-[#9E5460] text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>{actionInProgressId === logisticsModalOrder.id ? 'Processando...' : 'Salvar & Despachar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iFood & System Cancellation Modal */}
      <CancelOrderModal
        isOpen={!!orderToCancel}
        onClose={() => setOrderToCancel(null)}
        order={orderToCancel}
        onConfirmCancel={handleConfirmCancelOrder}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!orderToDelete}
        title="Excluir Pedido"
        message={`Tem certeza que deseja excluir o pedido ${orderToDelete?.code}? Esta ação não pode ser desfeita e irá restaurar os estoques dos itens produzidos associados a este pedido.`}
        confirmText="Excluir"
        onConfirm={() => {
          if (orderToDelete) {
            deleteOrder(orderToDelete.id);
          }
        }}
        onCancel={() => setOrderToDelete(null)}
      />

      {/* Clear All Confirmation Modal */}
      <ConfirmModal
        isOpen={showClearAllModal}
        title="Apagar Todos os Pedidos"
        message="Tem certeza que deseja apagar absolutamente TODOS os pedidos exibidos no painel (inclusive pedidos iFood travados ou concluídos)? Esta ação irá limpar o banco de dados temporário do servidor e não pode ser desfeita."
        confirmText="Sim, Apagar Tudo"
        onConfirm={async () => {
          setShowClearAllModal(false);
          const res = await clearAllOrders();
          setApiFeedback({ type: res.success ? 'success' : 'error', message: res.message });
        }}
        onCancel={() => setShowClearAllModal(false)}
      />
    </div>
  );
};
