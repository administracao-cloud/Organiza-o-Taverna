import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { Order, OrderStatus, OrderChannel, DailyProduction } from '../../types';
import { subscribeToOrdersRealtime, RealtimeEvent } from '../../services/supabaseService';
import { 
  ChefHat, 
  Clock, 
  Flame, 
  CheckCircle2, 
  AlertTriangle, 
  ShoppingBag, 
  Truck, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  Search, 
  Filter, 
  Utensils, 
  Check, 
  RotateCcw, 
  Printer, 
  Calendar, 
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Package,
  Layers,
  ArrowRight,
  Radio,
  Database,
  Copy,
  ExternalLink,
  Zap,
  Info,
  Cookie,
  Croissant
} from 'lucide-react';

interface Props {
  onOpenReceiptModal?: (order: Order) => void;
}

export type KitchenCategory = 'all' | 'Panificação' | 'Confeitaria' | 'Salgados';

export const KitchenDisplaySystem: React.FC<Props> = ({ onOpenReceiptModal }) => {
  const { 
    orders = [], 
    dailyProductions = [],
    technicalSheets = [],
    updateDailyProduction,
    updateOrderStatus, 
    executeIfoodAction,
    deliverySettings,
    toggleAutoAcceptOrders,
    acceptAllPendingOrders,
    supabaseRealtimeStatus 
  } = useBakery();

  // KDS Filter States
  const [activeFilter, setActiveFilter] = useState<'all' | 'pendente' | 'em_producao' | 'pronto'>('all');
  const [selectedCategory, setSelectedCategory] = useState<KitchenCategory>('all');
  const [taskViewType, setTaskViewType] = useState<'all' | 'orders' | 'batches'>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | OrderChannel>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'fifo' | 'urgency' | 'newest'>('fifo');
  const [cardDensity, setCardDensity] = useState<'large' | 'standard'>('large');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('sabore_kds_sound') !== 'false';
  });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showItemAggregation, setShowItemAggregation] = useState<boolean>(false);
  const [isAcceptingAll, setIsAcceptingAll] = useState<boolean>(false);
  
  // Track checked items inside orders for kitchen prep checklist (orderId_itemIndex: boolean)
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  
  // Track action in progress for buttons
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [kdsFeedback, setKdsFeedback] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Track recently updated orders for visual highlight animation on tablets
  const [recentlyUpdatedOrderIds, setRecentlyUpdatedOrderIds] = useState<Set<string>>(new Set());
  const [showSupabaseGuide, setShowSupabaseGuide] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [realtimeChannelState, setRealtimeChannelState] = useState<string>('SUBSCRIBED');
  const [lastRealtimeEventTime, setLastRealtimeEventTime] = useState<string | null>(null);

  // Subscribe directly to Supabase Realtime channel for live visual animations and sounds
  useEffect(() => {
    const unsubscribe = subscribeToOrdersRealtime(
      (event: RealtimeEvent) => {
        setLastRealtimeEventTime(new Date().toLocaleTimeString('pt-BR'));
        
        const targetId = event.record?.id || (event as any).orderId;
        if (targetId) {
          setRecentlyUpdatedOrderIds(prev => {
            const next = new Set(prev);
            next.add(targetId);
            return next;
          });

          // Remove highlight after 8 seconds
          setTimeout(() => {
            setRecentlyUpdatedOrderIds(prev => {
              const next = new Set(prev);
              next.delete(targetId);
              return next;
            });
          }, 8000);
        }

        if (event.eventType === 'INSERT') {
          playKitchenChime();
          setKdsFeedback({
            type: 'info',
            message: `🔔 Novo pedido recebido em tempo real: ${event.record?.code || 'Pedido'}`
          });
        } else if (event.eventType === 'UPDATE') {
          if (event.record) {
            const statusLabel = 
              event.record.status === 'em_producao' ? 'No Forno / Em Preparo' :
              event.record.status === 'pronto' ? 'Pronto' :
              event.record.status === 'entregue' ? 'Entregue / Concluído' : 'Pendente';

            setKdsFeedback({
              type: 'success',
              message: `⚡ Atualização Realtime: ${event.record.code} agora está ${statusLabel}`
            });
          }
        }
      },
      (status: string) => {
        setRealtimeChannelState(status);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [soundEnabled]);

  // Live timer tick to update order age every 10 seconds
  const [, setTimerTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerTick(t => t + 1);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Web Audio Chime synthesizer for new incoming orders
  const previousOrdersCountRef = useRef<number>(orders.length);
  const playKitchenChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.001, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      // Two-tone bell (C5 -> E5 -> G5)
      playTone(523.25, 0, 0.25);
      playTone(659.25, 0.15, 0.35);
      playTone(783.99, 0.3, 0.5);
    } catch {
      // Audio playback guarded
    }
  };

  // Detect when new pending orders arrive to chime
  useEffect(() => {
    const currentActivePending = orders.filter(o => o && o.status === 'pendente').length;
    if (previousOrdersCountRef.current < currentActivePending) {
      playKitchenChime();
    }
    previousOrdersCountRef.current = currentActivePending;
  }, [orders, soundEnabled]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('sabore_kds_sound', String(next));
    if (next) {
      playKitchenChime();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Helper to categorize items & technical sheets accurately
  const resolveCategory = (
    name: string,
    sku?: string,
    explicitCategory?: string
  ): 'Panificação' | 'Confeitaria' | 'Salgados' => {
    if (explicitCategory) {
      const c = explicitCategory.toLowerCase();
      if (c.includes('panifica') || c.includes('pão') || c.includes('pao') || c.includes('viennoiserie')) return 'Panificação';
      if (c.includes('confeit') || c.includes('bolo') || c.includes('doce') || c.includes('torta') || c.includes('sobremesa')) return 'Confeitaria';
      if (c.includes('salgado') || c.includes('lanche') || c.includes('pastel') || c.includes('quiche')) return 'Salgados';
    }

    const sheet = technicalSheets.find(s => 
      (sku && s.sku === sku) || 
      (s.name && s.name.toLowerCase() === name.toLowerCase())
    );
    if (sheet && sheet.category) {
      const c = sheet.category.toLowerCase();
      if (c.includes('panifica') || c.includes('pão') || c.includes('pao') || c.includes('viennoiserie')) return 'Panificação';
      if (c.includes('confeit') || c.includes('bolo') || c.includes('doce') || c.includes('torta')) return 'Confeitaria';
      if (c.includes('salgado') || c.includes('lanche') || c.includes('pastel')) return 'Salgados';
    }

    const n = name.toLowerCase();
    if (
      n.includes('pão') || n.includes('pao') || n.includes('baguete') || 
      n.includes('croissant') || n.includes('brioche') || n.includes('ciabatta') || 
      n.includes('focaccia') || n.includes('levain') || n.includes('fermenta') ||
      n.includes('broa') || n.includes('torrada') || n.includes('baguette')
    ) {
      return 'Panificação';
    }
    if (
      n.includes('bolo') || n.includes('torta') || n.includes('doce') || 
      n.includes('brigadeiro') || n.includes('tarte') || n.includes('mousse') || 
      n.includes('brownie') || n.includes('cookie') || n.includes('churros') || 
      n.includes('caramelo') || n.includes('pudim') || n.includes('sonho') ||
      n.includes('éclair') || n.includes('eclair') || n.includes('cupcake') ||
      n.includes('pavê') || n.includes('cheesecake')
    ) {
      return 'Confeitaria';
    }
    if (
      n.includes('salgado') || n.includes('coxinha') || n.includes('empada') || 
      n.includes('esfirra') || n.includes('quiche') || n.includes('pastel') || 
      n.includes('kibe') || n.includes('enroladinho') || n.includes('folhado') ||
      n.includes('empadão') || n.includes('risole') || n.includes('torta salgada')
    ) {
      return 'Salgados';
    }

    return 'Panificação';
  };

  // Helper for High-Visibility Timing Badges (Verde, Amarelo, Vermelho)
  const getTimingMarker = (
    deliveryDateOrTime?: string, 
    createdAt?: string, 
    isBatch?: boolean
  ) => {
    const now = new Date();
    let target: Date;

    if (isBatch && deliveryDateOrTime) {
      if (deliveryDateOrTime.includes(':') && !deliveryDateOrTime.includes('T')) {
        const [h, m] = deliveryDateOrTime.split(':').map(Number);
        target = new Date();
        target.setHours(h || 0, m || 0, 0, 0);
      } else {
        target = new Date(deliveryDateOrTime);
      }
    } else if (deliveryDateOrTime) {
      if (deliveryDateOrTime.includes(':') && !deliveryDateOrTime.includes('T')) {
        const [h, m] = deliveryDateOrTime.split(':').map(Number);
        target = new Date();
        target.setHours(h || 0, m || 0, 0, 0);
      } else {
        target = new Date(deliveryDateOrTime);
      }
    } else if (createdAt) {
      // Default prep SLA: 45 min from created time
      target = new Date(new Date(createdAt).getTime() + 45 * 60 * 1000);
    } else {
      target = new Date(now.getTime() + 60 * 60 * 1000);
    }

    const diffMs = target.getTime() - now.getTime();
    const diffMinutes = Math.round(diffMs / 60000);

    const hoursStr = String(target.getHours()).padStart(2, '0');
    const minsStr = String(target.getMinutes()).padStart(2, '0');
    const timeDisplay = `${hoursStr}:${minsStr}`;

    // Color Rules:
    // Verde: No prazo (mais de 2 horas)
    // Amarelo: Entrega em menos de 2 horas (31 a 120 minutos)
    // Vermelho: Atrasado ou entrega iminente em menos de 30 minutos (<= 30 minutos)
    if (diffMinutes < 0) {
      const overdue = Math.abs(diffMinutes);
      const overdueText = overdue >= 60 ? `${Math.floor(overdue / 60)}h ${overdue % 60}m` : `${overdue} min`;
      return {
        timeDisplay,
        diffMinutes,
        color: 'red' as const,
        label: `Atrasado há ${overdueText}`,
        tag: 'ATRASADO'
      };
    } else if (diffMinutes <= 30) {
      return {
        timeDisplay,
        diffMinutes,
        color: 'red' as const,
        label: `Entrega em ${diffMinutes} min`,
        tag: 'CRÍTICO (< 30 min)'
      };
    } else if (diffMinutes <= 120) {
      const h = Math.floor(diffMinutes / 60);
      const m = diffMinutes % 60;
      const tStr = h > 0 ? `${h}h ${m}m` : `${m} min`;
      return {
        timeDisplay,
        diffMinutes,
        color: 'yellow' as const,
        label: `Entrega em ${tStr}`,
        tag: 'ATENÇÃO (< 2h)'
      };
    } else {
      const h = Math.floor(diffMinutes / 60);
      const m = diffMinutes % 60;
      return {
        timeDisplay,
        diffMinutes,
        color: 'green' as const,
        label: `No prazo (em ${h}h ${m}m)`,
        tag: 'NO PRAZO (> 2h)'
      };
    }
  };

  // Filter Active Orders
  const filteredOrders = useMemo(() => {
    return (orders || []).filter(order => {
      if (!order) return false;
      const isActive = order.status !== 'entregue' && order.status !== 'cancelado';
      if (!isActive) return false;

      // Filter by Status Tab
      if (activeFilter !== 'all' && order.status !== activeFilter) {
        return false;
      }

      // Filter by Channel
      if (channelFilter !== 'all' && order.channel !== channelFilter) {
        return false;
      }

      // Filter by Category: Must contain at least one item of selectedCategory
      if (selectedCategory !== 'all') {
        const hasMatchingItem = (order.items || []).some(item => {
          const itemCat = resolveCategory(item.productName, item.sku);
          return itemCat === selectedCategory;
        });
        if (!hasMatchingItem) return false;
      }

      // Filter by Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = (order.code || '').toLowerCase().includes(q);
        const matchesCustomer = (order.customerName || '').toLowerCase().includes(q);
        const matchesProduct = (order.items || []).some(item => 
          (item.productName || '').toLowerCase().includes(q) ||
          (item.sku || '').toLowerCase().includes(q)
        );
        if (!matchesCode && !matchesCustomer && !matchesProduct) return false;
      }

      return true;
    });
  }, [orders, activeFilter, channelFilter, selectedCategory, searchQuery]);

  // Filter Active Daily Productions (Fornadas da Bancada)
  const filteredBatches = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return (dailyProductions || []).filter(batch => {
      if (!batch) return false;
      
      // Exclude concluded/archived
      if (batch.status === 'finalizada' || batch.status === 'concluida' || batch.status === 'concluída') {
        if (activeFilter !== 'pronto') return false;
      }

      // Match status
      if (activeFilter !== 'all') {
        if (activeFilter === 'pendente') {
          const isPending = batch.status === 'pendente' || batch.status === 'planejada' || batch.status === 'disponivel';
          if (!isPending) return false;
        } else if (activeFilter === 'em_producao') {
          const isInPrep = batch.status === 'em_producao' || batch.status === 'no_forno';
          if (!isInPrep) return false;
        } else if (activeFilter === 'pronto') {
          const isReady = batch.status === 'pronto' || batch.status === 'concluida' || batch.status === 'concluída';
          if (!isReady) return false;
        }
      }

      // Match Category
      if (selectedCategory !== 'all') {
        const cat = resolveCategory(batch.productName, batch.sku, batch.category);
        if (cat !== selectedCategory) return false;
      }

      // Match Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (batch.productName || '').toLowerCase().includes(q);
        const matchesSku = (batch.sku || '').toLowerCase().includes(q);
        const matchesBaker = (batch.bakerName || '').toLowerCase().includes(q);
        const matchesBatch = (batch.batchNumber || '').toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesBaker && !matchesBatch) return false;
      }

      return true;
    });
  }, [dailyProductions, activeFilter, selectedCategory, searchQuery]);

  // Aggregate items from all active orders for the Kitchen Master Batch view
  const aggregatedItems = useMemo(() => {
    const map = new Map<string, { name: string; sku: string; category: string; totalQty: number; pendingQty: number; inPrepQty: number }>();
    
    (orders || [])
      .filter(o => o.status !== 'entregue' && o.status !== 'cancelado')
      .forEach(order => {
        (order.items || []).forEach(item => {
          const key = item.productName || 'Item';
          const cat = resolveCategory(item.productName, item.sku);

          if (selectedCategory !== 'all' && cat !== selectedCategory) {
            return;
          }

          const existing = map.get(key) || {
            name: key,
            sku: item.sku || '',
            category: cat,
            totalQty: 0,
            pendingQty: 0,
            inPrepQty: 0
          };
          existing.totalQty += item.quantity || 1;
          if (order.status === 'pendente') {
            existing.pendingQty += item.quantity || 1;
          } else if (order.status === 'em_producao') {
            existing.inPrepQty += item.quantity || 1;
          }
          map.set(key, existing);
        });
      });

    return Array.from(map.values()).sort((a, b) => b.totalQty - a.totalQty);
  }, [orders, selectedCategory]);

  // Toggle item checklist
  const toggleItemCheck = (orderId: string, itemIdx: number) => {
    const key = `${orderId}_${itemIdx}`;
    setCheckedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // 1-TOUCH STATUS UPDATE FOR ORDERS: 'Pendente' -> 'No Forno' -> 'Pronto / Concluído'
  const handleAdvanceOrderStatus = async (order: Order) => {
    setActionInProgressId(order.id);
    try {
      if (order.status === 'pendente') {
        if (order.channel === 'ifood') {
          const res = await executeIfoodAction(order.id, 'confirm');
          if (res.message) setKdsFeedback({ type: res.success ? 'success' : 'error', message: res.message });
        }
        await updateOrderStatus(order.id, 'em_producao');
        setKdsFeedback({ type: 'success', message: `Pedido ${order.code} movido para: No Forno / Em Preparo!` });
      } else if (order.status === 'em_producao') {
        if (order.channel === 'ifood') {
          const res = await executeIfoodAction(order.id, 'readyToPickup');
          if (res.message) setKdsFeedback({ type: res.success ? 'success' : 'error', message: res.message });
        }
        await updateOrderStatus(order.id, 'pronto');
        setKdsFeedback({ type: 'success', message: `Pedido ${order.code} marcado como: Pronto / Concluído!` });
      } else if (order.status === 'pronto') {
        if (order.channel === 'ifood') {
          const res = await executeIfoodAction(order.id, 'conclude');
          if (res.message) setKdsFeedback({ type: res.success ? 'success' : 'error', message: res.message });
        }
        await updateOrderStatus(order.id, 'entregue');
        setKdsFeedback({ type: 'success', message: `Pedido ${order.code} finalizado e entregue!` });
      }
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleRevertOrderStatus = (order: Order) => {
    if (order.status === 'pronto') {
      updateOrderStatus(order.id, 'em_producao');
      setKdsFeedback({ type: 'info', message: `Pedido ${order.code} retornado para No Forno / Preparo.` });
    } else if (order.status === 'em_producao') {
      updateOrderStatus(order.id, 'pendente');
      setKdsFeedback({ type: 'info', message: `Pedido ${order.code} retornado para Pendente.` });
    }
  };

  // 1-TOUCH STATUS UPDATE FOR BATCHES (FORNADAS): 'Pendente' -> 'No Forno' -> 'Pronto / Concluído'
  const handleAdvanceBatchStatus = (batch: DailyProduction) => {
    setActionInProgressId(batch.id);
    try {
      const current = batch.status || 'pendente';
      let nextStatus = 'em_producao';
      let msg = `Fornada ${batch.productName} colocada No Forno!`;
      
      if (current === 'pendente' || current === 'planejada' || current === 'disponivel') {
        nextStatus = 'em_producao';
        msg = `Fornada ${batch.productName} está No Forno / Em Preparo!`;
      } else if (current === 'em_producao' || current === 'no_forno') {
        nextStatus = 'pronto';
        msg = `Fornada ${batch.productName} marcada como Pronta / Concluída!`;
      } else if (current === 'pronto' || current === 'concluida' || current === 'concluída') {
        nextStatus = 'finalizada';
        msg = `Fornada ${batch.productName} arquivada e concluída!`;
      }
      
      updateDailyProduction(batch.id, { 
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });
      setKdsFeedback({ type: 'success', message: msg });
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleRevertBatchStatus = (batch: DailyProduction) => {
    const current = batch.status;
    let prevStatus = 'pendente';
    if (current === 'finalizada' || current === 'pronto' || current === 'concluida' || current === 'concluída') {
      prevStatus = 'em_producao';
    } else if (current === 'em_producao' || current === 'no_forno') {
      prevStatus = 'pendente';
    }
    updateDailyProduction(batch.id, { status: prevStatus, updatedAt: new Date().toISOString() });
    setKdsFeedback({ type: 'info', message: `Fornada ${batch.productName} retornou ao status anterior.` });
  };

  // Auto clear feedback after 4 seconds
  useEffect(() => {
    if (kdsFeedback) {
      const timer = setTimeout(() => setKdsFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [kdsFeedback]);

  // Overall counts for category filtering badges
  const activeOrdersAll = (orders || []).filter(o => o && o.status !== 'entregue' && o.status !== 'cancelado');
  const activeBatchesAll = (dailyProductions || []).filter(b => b && b.status !== 'finalizada');

  const countBreadTasks = useMemo(() => {
    const ordCount = activeOrdersAll.filter(o => (o.items || []).some(i => resolveCategory(i.productName, i.sku) === 'Panificação')).length;
    const batCount = activeBatchesAll.filter(b => resolveCategory(b.productName, b.sku, b.category) === 'Panificação').length;
    return ordCount + batCount;
  }, [activeOrdersAll, activeBatchesAll]);

  const countPastryTasks = useMemo(() => {
    const ordCount = activeOrdersAll.filter(o => (o.items || []).some(i => resolveCategory(i.productName, i.sku) === 'Confeitaria')).length;
    const batCount = activeBatchesAll.filter(b => resolveCategory(b.productName, b.sku, b.category) === 'Confeitaria').length;
    return ordCount + batCount;
  }, [activeOrdersAll, activeBatchesAll]);

  const countSavoryTasks = useMemo(() => {
    const ordCount = activeOrdersAll.filter(o => (o.items || []).some(i => resolveCategory(i.productName, i.sku) === 'Salgados')).length;
    const batCount = activeBatchesAll.filter(b => resolveCategory(b.productName, b.sku, b.category) === 'Salgados').length;
    return ordCount + batCount;
  }, [activeOrdersAll, activeBatchesAll]);

  const totalActiveTasks = activeOrdersAll.length + activeBatchesAll.length;

  return (
    <div className="space-y-4">
      
      {/* KDS Control Header - Optimized for Touch & Bancada de Produção */}
      <div className="bg-white dark:bg-[#2B2D31] p-4 rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] shadow-xs flex flex-col gap-3.5">
        
        {/* Top Row: Title, Category Badges & Key Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#B86B77]/15 border border-[#B86B77]/30 text-[#B86B77] flex items-center justify-center shrink-0">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif-brand text-lg sm:text-xl font-bold text-[#352527] dark:text-[#FFFFFF]">
                  Modo Cozinha (KDS) & Bancada
                </h2>
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Tempo Real
                </span>
              </div>
              <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1]">
                Controle em tempo real de pedidos e fornadas pendentes com atualização em 1 toque
              </p>
            </div>
          </div>

          {/* Action Tools: Fullscreen, Sound Chime, Consolidado, Auto-Accept */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* FULLSCREEN BUTTON */}
            <button
              onClick={toggleFullscreen}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-xs ${
                isFullscreen
                  ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-700 shadow-purple-500/20'
                  : 'bg-[#352527] dark:bg-white text-white dark:text-[#1E1F22] border-[#352527] dark:border-white hover:bg-[#4a3437]'
              }`}
              title={isFullscreen ? 'Sair da Tela Cheia' : 'Entrar em Ecrã Inteiro (Full Screen)'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span>Sair Ecrã Inteiro</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-amber-300" />
                  <span>Ecrã Inteiro (Full Screen)</span>
                </>
              )}
            </button>

            {/* Consolidado da Bancada */}
            <button
              onClick={() => setShowItemAggregation(!showItemAggregation)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                showItemAggregation
                  ? 'bg-[#B86B77] text-white border-[#B86B77]'
                  : 'bg-[#FAF7F2] dark:bg-[#1E1F22] text-[#352527] dark:text-[#FFFFFF] border-[#E5DACF] dark:border-[#3F4147] hover:bg-[#EAE0D5]'
              }`}
              title="Consolidar totais de cada item para assar em lote"
            >
              <Package className="w-4 h-4 text-[#B86B77]" />
              <span className="hidden sm:inline">Consolidado em Lote</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#B86B77]/20 text-[#B86B77] dark:text-white">
                {aggregatedItems.length}
              </span>
            </button>

            {/* Sound Notification Alert Toggle */}
            <button
              onClick={toggleSound}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                  : 'bg-[#FAF7F2] dark:bg-[#1E1F22] text-stone-500 dark:text-stone-400 border-[#E5DACF] dark:border-[#3F4147]'
              }`}
              title={soundEnabled ? 'Sino de novos pedidos ATIVADO' : 'Sino SILENCIADO'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-600" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden md:inline">{soundEnabled ? 'Sino Ativo' : 'Mudo'}</span>
            </button>

            {/* Density Selector */}
            <div className="hidden sm:flex items-center bg-[#FAF7F2] dark:bg-[#1E1F22] p-1 rounded-xl border border-[#E5DACF] dark:border-[#3F4147]">
              <button
                onClick={() => setCardDensity('large')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  cardDensity === 'large' ? 'bg-[#B86B77] text-white shadow-xs' : 'text-[#7A6466] dark:text-[#B5BAC1]'
                }`}
              >
                Cartões Grandes
              </button>
              <button
                onClick={() => setCardDensity('standard')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  cardDensity === 'standard' ? 'bg-[#B86B77] text-white shadow-xs' : 'text-[#7A6466] dark:text-[#B5BAC1]'
                }`}
              >
                Padrão
              </button>
            </div>

          </div>

        </div>

        {/* FEEDBACK ALERT */}
        {kdsFeedback && (
          <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs transition-all ${
            kdsFeedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-900 dark:text-emerald-200'
              : kdsFeedback.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 text-rose-900 dark:text-rose-200'
              : 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 text-blue-900 dark:text-blue-200'
          }`}>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#B86B77]" />
              <span className="font-bold text-sm">{kdsFeedback.message}</span>
            </div>
            <button onClick={() => setKdsFeedback(null)} className="text-sm font-bold px-2 py-0.5 cursor-pointer">✕</button>
          </div>
        )}

        {/* CATEGORY ISOLATION BAR (Panificação, Confeitaria, Salgados) */}
        <div className="p-2.5 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#E5DACF] dark:border-[#3F4147] flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#B86B77]" />
            <span className="text-xs font-black uppercase tracking-wider text-[#352527] dark:text-[#FFFFFF]">
              Isolar por Bancada:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'all'
                  ? 'bg-[#352527] dark:bg-white text-white dark:text-[#1E1F22] shadow-xs'
                  : 'bg-white dark:bg-[#2B2D31] text-[#7A6466] dark:text-[#B5BAC1] border border-[#E5DACF] dark:border-[#3F4147] hover:bg-[#EAE0D5]'
              }`}
            >
              <span>Todas as Bancadas</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedCategory === 'all' ? 'bg-[#B86B77] text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
              }`}>
                {totalActiveTasks}
              </span>
            </button>

            <button
              onClick={() => setSelectedCategory('Panificação')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'Panificação'
                  ? 'bg-amber-700 text-white shadow-xs ring-2 ring-amber-400'
                  : 'bg-white dark:bg-[#2B2D31] text-amber-900 dark:text-amber-200 border border-amber-300/70 hover:bg-amber-50'
              }`}
            >
              <Croissant className="w-4 h-4" />
              <span>Panificação</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedCategory === 'Panificação' ? 'bg-amber-900 text-white' : 'bg-amber-200 dark:bg-amber-950 text-amber-900 dark:text-amber-200'
              }`}>
                {countBreadTasks}
              </span>
            </button>

            <button
              onClick={() => setSelectedCategory('Confeitaria')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'Confeitaria'
                  ? 'bg-pink-700 text-white shadow-xs ring-2 ring-pink-400'
                  : 'bg-white dark:bg-[#2B2D31] text-pink-900 dark:text-pink-200 border border-pink-300/70 hover:bg-pink-50'
              }`}
            >
              <Cookie className="w-4 h-4" />
              <span>Confeitaria</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedCategory === 'Confeitaria' ? 'bg-pink-900 text-white' : 'bg-pink-200 dark:bg-pink-950 text-pink-900 dark:text-pink-200'
              }`}>
                {countPastryTasks}
              </span>
            </button>

            <button
              onClick={() => setSelectedCategory('Salgados')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'Salgados'
                  ? 'bg-orange-700 text-white shadow-xs ring-2 ring-orange-400'
                  : 'bg-white dark:bg-[#2B2D31] text-orange-900 dark:text-orange-200 border border-orange-300/70 hover:bg-orange-50'
              }`}
            >
              <Utensils className="w-4 h-4" />
              <span>Salgados</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedCategory === 'Salgados' ? 'bg-orange-900 text-white' : 'bg-orange-200 dark:bg-orange-950 text-orange-900 dark:text-orange-200'
              }`}>
                {countSavoryTasks}
              </span>
            </button>
          </div>
        </div>

        {/* TIME LEGEND BAR (Verde: no prazo, Amarelo: < 2h, Vermelho: < 30min / atrasado) */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-stone-50 dark:bg-[#232428] rounded-xl text-[11px] font-semibold border border-stone-200 dark:border-stone-800">
          <span className="text-stone-500 dark:text-stone-400">Legenda de Prazos de Entrega:</span>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Verde: No Prazo (&gt; 2h)
            </span>
            <span className="flex items-center gap-1 text-amber-700 dark:text-amber-300 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              Amarelo: Em menos de 2 horas
            </span>
            <span className="flex items-center gap-1 text-rose-700 dark:text-rose-300 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
              Vermelho: Crítico (&lt; 30 min) ou Atrasado
            </span>
          </div>
        </div>

        {/* Batch Breakdown Drawer (Total across active orders) */}
        {showItemAggregation && (
          <div className="bg-[#FAF7F2] dark:bg-[#1E1F22] p-4 rounded-xl border border-[#E5DACF] dark:border-[#3F4147] animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#B86B77]" />
                <h3 className="text-xs font-bold text-[#352527] dark:text-[#FFFFFF] uppercase tracking-wider">
                  Total de Unidades a Preparar na Cozinha (Consolidado)
                </h3>
              </div>
              <span className="text-[11px] text-[#7A6466] dark:text-[#B5BAC1]">
                {aggregatedItems.reduce((acc, i) => acc + i.totalQty, 0)} unidades no total da fila
              </span>
            </div>

            {aggregatedItems.length === 0 ? (
              <p className="text-xs text-stone-500 py-2">Nenhum item na fila de preparo para a bancada selecionada.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {aggregatedItems.map((agg, idx) => (
                  <div 
                    key={idx} 
                    className="p-3 bg-white dark:bg-[#2B2D31] rounded-xl border border-[#E8DFD5] dark:border-[#3F4147] flex flex-col justify-between shadow-xs"
                  >
                    <div>
                      <span className="text-[9.5px] font-bold uppercase text-[#B86B77] block">
                        {agg.category}
                      </span>
                      <div className="font-bold text-xs text-[#352527] dark:text-[#FFFFFF] line-clamp-2 mt-0.5">
                        {agg.name}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-stone-100 dark:border-stone-800">
                      <span className="text-lg font-black text-[#B86B77]">
                        {agg.totalQty} <span className="text-[10px] font-normal text-[#7A6466] dark:text-[#B5BAC1]">un</span>
                      </span>
                      <div className="flex gap-1 text-[10px]">
                        {agg.pendingQty > 0 && (
                          <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-md font-bold" title="Aguardando início">
                            {agg.pendingQty} pend
                          </span>
                        )}
                        {agg.inPrepQty > 0 && (
                          <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 rounded-md font-bold" title="No forno/preparo">
                            {agg.inPrepQty} forno
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Task Type Tabs, Status Filters & Search */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1 border-t border-stone-100 dark:border-stone-800">
          
          {/* Status Tabs with Touch Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            
            {/* View Type Toggle (Todos / Pedidos / Fornadas) */}
            <div className="flex items-center bg-[#FAF7F2] dark:bg-[#1E1F22] p-1 rounded-xl border border-[#E5DACF] dark:border-[#3F4147] mr-1">
              <button
                onClick={() => setTaskViewType('all')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  taskViewType === 'all' ? 'bg-[#B86B77] text-white shadow-xs' : 'text-[#7A6466] dark:text-[#B5BAC1]'
                }`}
              >
                Todos ({filteredOrders.length + filteredBatches.length})
              </button>
              <button
                onClick={() => setTaskViewType('orders')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  taskViewType === 'orders' ? 'bg-[#B86B77] text-white shadow-xs' : 'text-[#7A6466] dark:text-[#B5BAC1]'
                }`}
              >
                📦 Pedidos ({filteredOrders.length})
              </button>
              <button
                onClick={() => setTaskViewType('batches')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  taskViewType === 'batches' ? 'bg-[#B86B77] text-white shadow-xs' : 'text-[#7A6466] dark:text-[#B5BAC1]'
                }`}
              >
                🥖 Fornadas ({filteredBatches.length})
              </button>
            </div>

            {/* Status pills */}
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[42px] ${
                activeFilter === 'all'
                  ? 'bg-[#352527] dark:bg-white text-white dark:text-[#1E1F22] shadow-xs'
                  : 'bg-[#FAF7F2] dark:bg-[#1E1F22] text-[#7A6466] dark:text-[#B5BAC1] hover:bg-[#EAE0D5]'
              }`}
            >
              <span>Todos Status</span>
            </button>

            <button
              onClick={() => setActiveFilter('pendente')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[42px] ${
                activeFilter === 'pendente'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40 hover:bg-amber-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>1. Pendente</span>
            </button>

            <button
              onClick={() => setActiveFilter('em_producao')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[42px] ${
                activeFilter === 'em_producao'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40 hover:bg-blue-100'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>2. No Forno / Preparo</span>
            </button>

            <button
              onClick={() => setActiveFilter('pronto')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[42px] ${
                activeFilter === 'pronto'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>3. Pronto / Concluído</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar item, receita, lote..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-2 bg-[#FAF7F2] dark:bg-[#1E1F22] border border-[#E5DACF] dark:border-[#3F4147] rounded-xl text-xs text-[#352527] dark:text-[#FFFFFF] focus:outline-none focus:ring-1 focus:ring-[#B86B77]"
              />
            </div>
          </div>

        </div>

      </div>

      {/* EMPTY STATE */}
      {filteredOrders.length === 0 && filteredBatches.length === 0 ? (
        <div className="bg-white dark:bg-[#2B2D31] p-12 rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] text-center shadow-xs">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="font-serif-brand text-xl font-bold text-[#352527] dark:text-[#FFFFFF]">
            Bancada em Dia! Nenhuma Produção Pendente
          </h3>
          <p className="text-xs sm:text-sm text-[#7A6466] dark:text-[#B5BAC1] max-w-md mx-auto mt-1">
            {searchQuery || selectedCategory !== 'all' || activeFilter !== 'all'
              ? 'Nenhum pedido ou fornada encontrado para os filtros selecionados.'
              : 'Todos os pedidos e fornadas foram preparados e concluídos. Novos itens sincronizados aparecerão aqui automaticamente.'}
          </p>
        </div>
      ) : (
        /* KDS ACTIVE CARDS GRID - LARGE, CLEAN, HIGH VISIBILITY */
        <div className={`grid gap-4.5 ${
          cardDensity === 'large'
            ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`}>
          
          {/* RENDER FORNADAS (BATCHES) DA BANCADA */}
          {(taskViewType === 'all' || taskViewType === 'batches') && filteredBatches.map((batch) => {
            const timing = getTimingMarker(batch.productionTime, batch.createdAt, true);
            const category = resolveCategory(batch.productName, batch.sku, batch.category);
            const isActionBusy = actionInProgressId === batch.id;
            
            const isPending = batch.status === 'pendente' || batch.status === 'planejada' || batch.status === 'disponivel';
            const isInOven = batch.status === 'em_producao' || batch.status === 'no_forno';
            const isReady = batch.status === 'pronto' || batch.status === 'concluida' || batch.status === 'concluída';

            return (
              <div 
                key={`batch_${batch.id}`}
                className={`bg-white dark:bg-[#2B2D31] rounded-2xl border-2 flex flex-col justify-between shadow-sm transition-all duration-300 ${
                  timing.color === 'red'
                    ? 'border-rose-400 dark:border-rose-800/80 shadow-rose-500/10'
                    : timing.color === 'yellow'
                    ? 'border-amber-400 dark:border-amber-800/80 shadow-amber-500/10'
                    : 'border-emerald-400 dark:border-emerald-800/80 shadow-emerald-500/10'
                }`}
              >
                {/* Card Top: Lote, Categoria & Marcador de Tempo Colorido */}
                <div className={`p-4 border-b border-stone-100 dark:border-stone-800 ${
                  timing.color === 'red' ? 'bg-rose-50/50 dark:bg-rose-950/20' :
                  timing.color === 'yellow' ? 'bg-amber-50/50 dark:bg-amber-950/20' :
                  'bg-emerald-50/50 dark:bg-emerald-950/20'
                }`}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-[#352527] text-white tracking-wider flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        FORNADA DA BANCADA
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                        {category}
                      </span>
                    </div>

                    {/* MARCADOR DE TEMPO COLORIDO (Verde, Amarelo, Vermelho) */}
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black tracking-wide shadow-xs ${
                      timing.color === 'red'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : timing.color === 'yellow'
                        ? 'bg-amber-500 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}>
                      <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{timing.tag}</span>
                    </div>
                  </div>

                  {/* Hora Prevista de Produção */}
                  <div className="flex items-center justify-between text-xs mt-1 text-[#7A6466] dark:text-[#B5BAC1]">
                    <span className="font-semibold">
                      Lote: <strong className="text-[#352527] dark:text-white">{batch.batchNumber || 'LOTE DO DIA'}</strong>
                    </span>
                    <span className="font-bold text-[#352527] dark:text-white flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#B86B77]" />
                      Hora Prevista: <span className="text-sm underline">{timing.timeDisplay}</span> ({timing.label})
                    </span>
                  </div>
                </div>

                {/* Card Body: Destaque do nome do item, quantidade exata e observações em texto amplo */}
                <div className="p-4 space-y-3.5 flex-1">
                  
                  {/* Nome do Item e Quantidade Exata a Produzir */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="text-xl sm:text-2xl font-black text-[#352527] dark:text-[#FFFFFF] leading-tight">
                        {batch.productName}
                      </h3>
                      {batch.sku && (
                        <span className="text-xs font-mono text-[#8C7678] dark:text-[#B5BAC1] mt-0.5 block">
                          SKU: {batch.sku}
                        </span>
                      )}
                    </div>

                    {/* QUANTIDADE EXATA A PRODUZIR (DESTAQUE GRANDE) */}
                    <div className="px-4 py-2 bg-[#B86B77] text-white rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-sm min-w-[85px]">
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-90">Produzir</span>
                      <span className="text-2xl sm:text-3xl font-black leading-none my-0.5">
                        {batch.quantityProduced}
                      </span>
                      <span className="text-[10px] font-bold opacity-90">unidades</span>
                    </div>
                  </div>

                  {/* Padeiro Responsável */}
                  <div className="text-xs text-[#7A6466] dark:text-[#B5BAC1] flex items-center gap-1.5">
                    <ChefHat className="w-3.5 h-3.5 text-[#B86B77]" />
                    <span>Padeiro Responsável: <strong className="text-[#352527] dark:text-white">{batch.bakerName || 'Bancada'}</strong></span>
                  </div>

                  {/* OBSERVAÇÕES ESPECÍFICAS DA RECEITA EM TEXTO AMPLO */}
                  {batch.notes ? (
                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        Observações Específicas da Receita:
                      </div>
                      <p className="text-sm sm:text-base font-semibold leading-snug">
                        {batch.notes}
                      </p>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 text-stone-500 text-xs">
                      Padrão da ficha técnica: sem observações extraordinárias.
                    </div>
                  )}

                </div>

                {/* Card Footer: 1-TOUCH STATUS UPDATE ('Pendente' -> 'No Forno' -> 'Pronto / Concluído') */}
                <div className="p-3.5 bg-stone-50 dark:bg-[#232428] rounded-b-2xl border-t border-stone-100 dark:border-stone-800 space-y-2.5">
                  
                  {/* Current Status Pill */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                      Estado da Fornada:
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg font-black text-xs ${
                      isPending
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                        : isInOven
                        ? 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {isPending ? '⏳ 1. Pendente (A Fazer)' : isInOven ? '🔥 2. No Forno / Em Preparo' : '✅ 3. Pronto / Concluído'}
                    </span>
                  </div>

                  {/* 1-Touch Action Buttons */}
                  <div className="flex items-center gap-2">
                    
                    {/* Revert status if not pending */}
                    {!isPending && (
                      <button
                        onClick={() => handleRevertBatchStatus(batch)}
                        disabled={isActionBusy}
                        className="p-3.5 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-xl hover:bg-stone-100 transition-all cursor-pointer shrink-0 min-h-[50px] min-w-[50px] flex items-center justify-center"
                        title="Voltar ao status anterior"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>
                    )}

                    {/* BIG 1-TOUCH BUTTON */}
                    <button
                      onClick={() => handleAdvanceBatchStatus(batch)}
                      disabled={isActionBusy}
                      className={`flex-1 min-h-[50px] px-4 py-3 rounded-xl font-black text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-md select-none ${
                        isPending
                          ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20 active:scale-[0.98]'
                          : isInOven
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 active:scale-[0.98]'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-[0.98]'
                      } ${isActionBusy ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      {isActionBusy ? (
                        <span>Atualizando bancada...</span>
                      ) : isPending ? (
                        <>
                          <Flame className="w-5 h-5 text-amber-200" />
                          <span>1-Toque: Colocar No Forno</span>
                        </>
                      ) : isInOven ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                          <span>1-Toque: Marcar Pronto</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5 stroke-[3]" />
                          <span>1-Toque: Finalizar Fornada</span>
                        </>
                      )}
                    </button>

                  </div>

                </div>

              </div>
            );
          })}

          {/* RENDER PEDIDOS ATIVOS */}
          {(taskViewType === 'all' || taskViewType === 'orders') && filteredOrders.map((order) => {
            const timing = getTimingMarker(order.deliveryDate, order.createdAt, false);
            const isIfood = order.channel === 'ifood';
            const is99 = order.channel === '99food';
            const itemsCount = (order.items || []).length;
            const checkedCount = (order.items || []).filter((_, idx) => checkedItems[`${order.id}_${idx}`]).length;
            const isActionBusy = actionInProgressId === order.id;
            const isRecentlyUpdated = recentlyUpdatedOrderIds.has(order.id);

            const isPending = order.status === 'pendente';
            const isInPrep = order.status === 'em_producao';
            const isReady = order.status === 'pronto';

            return (
              <div 
                key={`order_${order.id}`}
                className={`bg-white dark:bg-[#2B2D31] rounded-2xl border-2 flex flex-col justify-between shadow-sm transition-all duration-300 ${
                  isRecentlyUpdated 
                    ? 'ring-4 ring-[#B86B77] shadow-xl shadow-[#B86B77]/20 border-[#B86B77] scale-[1.01]' 
                    : timing.color === 'red'
                    ? 'border-rose-400 dark:border-rose-800/80 shadow-rose-500/10'
                    : timing.color === 'yellow'
                    ? 'border-amber-400 dark:border-amber-800/80 shadow-amber-500/10'
                    : 'border-emerald-400 dark:border-emerald-800/80 shadow-emerald-500/10'
                }`}
              >
                {/* Card Top: Order Code, Channel & Marcador de Tempo Colorido */}
                <div className={`p-4 border-b border-stone-100 dark:border-stone-800 ${
                  timing.color === 'red' ? 'bg-rose-50/50 dark:bg-rose-950/20' :
                  timing.color === 'yellow' ? 'bg-amber-50/50 dark:bg-amber-950/20' :
                  'bg-emerald-50/50 dark:bg-emerald-950/20'
                }`}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    
                    {/* Order Code & Channel */}
                    <div className="flex items-center gap-2">
                      <span className="text-xl sm:text-2xl font-black tracking-tight text-[#352527] dark:text-[#FFFFFF]">
                        {order.code}
                      </span>

                      {isIfood && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-[#EA1D2C] text-white tracking-wider">
                          iFood
                        </span>
                      )}
                      {is99 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-[#E65300] text-white tracking-wider">
                          99Food
                        </span>
                      )}
                      {!isIfood && !is99 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-[#352527] text-white uppercase tracking-wider">
                          {order.channel}
                        </span>
                      )}
                    </div>

                    {/* MARCADOR DE TEMPO COLORIDO (Verde, Amarelo, Vermelho) */}
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black tracking-wide shadow-xs ${
                      timing.color === 'red'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : timing.color === 'yellow'
                        ? 'bg-amber-500 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}>
                      <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{timing.tag}</span>
                    </div>

                  </div>

                  {/* Customer, Delivery Type & Target Delivery Time */}
                  <div className="flex items-center justify-between text-xs text-[#7A6466] dark:text-[#B5BAC1]">
                    <span className="font-bold truncate max-w-[170px] text-[#352527] dark:text-[#FFFFFF]">
                      {order.customerName || 'Cliente'}
                    </span>
                    <span className="font-bold text-[#352527] dark:text-white flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#B86B77]" />
                      Hora Prevista: <span className="text-sm underline">{timing.timeDisplay}</span> ({timing.label})
                    </span>
                  </div>

                  {/* Checklist progress */}
                  {itemsCount > 1 && (
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="flex-1 bg-stone-200 dark:bg-stone-700 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full transition-all duration-300"
                          style={{ width: `${(checkedCount / itemsCount) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] font-black text-stone-600 dark:text-stone-300">
                        {checkedCount}/{itemsCount} itens
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Body: Interactive Item Checklist (Large readable typography for Kitchen) */}
                <div className="p-4 space-y-3 flex-1 max-h-[360px] overflow-y-auto">
                  {(order.items || []).map((item, idx) => {
                    const isChecked = !!checkedItems[`${order.id}_${idx}`];
                    const itemCat = resolveCategory(item.productName, item.sku);
                    const isHighlightedCategory = selectedCategory !== 'all' && itemCat === selectedCategory;

                    return (
                      <div 
                        key={idx}
                        onClick={() => toggleItemCheck(order.id, idx)}
                        className={`p-3 rounded-2xl border-2 transition-all cursor-pointer select-none flex items-start gap-3 ${
                          isChecked
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 opacity-80'
                            : isHighlightedCategory
                            ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-400 dark:border-amber-700 ring-2 ring-amber-300/60'
                            : 'bg-[#FAF7F2]/70 dark:bg-[#1E1F22]/70 border-stone-200 dark:border-stone-800 hover:border-[#B86B77]'
                        }`}
                      >
                        {/* Checkbox Icon */}
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                          isChecked 
                            ? 'bg-emerald-600 border-emerald-600 text-white' 
                            : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800'
                        }`}>
                          {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-black uppercase text-[#B86B77] block">
                                {itemCat}
                              </span>
                              <span className={`text-base sm:text-lg font-black leading-snug ${
                                isChecked 
                                  ? 'line-through text-stone-400 dark:text-stone-500' 
                                  : 'text-[#352527] dark:text-[#FFFFFF]'
                              }`}>
                                {item.productName}
                              </span>
                            </div>

                            {/* QUANTIDADE EXATA DO ITEM */}
                            <span className="px-3 py-1 bg-[#B86B77] text-white rounded-xl font-black text-sm sm:text-base shrink-0 shadow-xs">
                              {item.quantity}x
                            </span>
                          </div>

                          {/* Options */}
                          {item.options && item.options.length > 0 && (
                            <div className="mt-1.5 space-y-0.5">
                              {item.options.map((opt, optIdx) => (
                                <div key={optIdx} className="text-xs text-[#7A6466] dark:text-[#B5BAC1] font-semibold flex items-center gap-1">
                                  <span>+ {opt.name}</span>
                                  {opt.quantity && opt.quantity > 1 && <span>(x{opt.quantity})</span>}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Item Custom Notes (EM TEXTO AMPLO) */}
                          {item.notes && (
                            <div className="mt-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-200 flex items-start gap-1.5">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <span>Obs Item: {item.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* General Order Notes Alert (TEXTO AMPLO) */}
                  {order.notes && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-xs sm:text-sm text-amber-950 dark:text-amber-100 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        Observação Geral do Pedido:
                      </div>
                      <p className="font-semibold text-sm leading-snug">
                        {order.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Footer: 1-TOUCH STATUS UPDATE ('Pendente' -> 'No Forno' -> 'Pronto / Concluído') */}
                <div className="p-3.5 bg-stone-50 dark:bg-[#232428] rounded-b-2xl border-t border-stone-100 dark:border-stone-800 space-y-2.5">
                  
                  {/* Status Indicator */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                      Estado do Pedido:
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg font-black text-xs ${
                      isPending
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                        : isInPrep
                        ? 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {isPending ? '⏳ 1. Pendente' : isInPrep ? '🔥 2. No Forno / Em Preparo' : '✅ 3. Pronto para Retirada'}
                    </span>
                  </div>

                  {/* 1-Touch Controls */}
                  <div className="flex items-center gap-2">
                    
                    {/* Revert button */}
                    {!isPending && (
                      <button
                        onClick={() => handleRevertOrderStatus(order)}
                        disabled={isActionBusy}
                        className="p-3.5 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-xl hover:bg-stone-100 transition-all cursor-pointer shrink-0 min-h-[50px] min-w-[50px] flex items-center justify-center"
                        title="Voltar ao status anterior"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>
                    )}

                    {/* Print ticket button */}
                    {onOpenReceiptModal && (
                      <button
                        onClick={() => onOpenReceiptModal(order)}
                        className="p-3.5 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-xl hover:bg-stone-100 transition-all cursor-pointer shrink-0 min-h-[50px] min-w-[50px] flex items-center justify-center"
                        title="Imprimir comanda da cozinha"
                      >
                        <Printer className="w-5 h-5" />
                      </button>
                    )}

                    {/* BIG 1-TOUCH BUTTON */}
                    <button
                      onClick={() => handleAdvanceOrderStatus(order)}
                      disabled={isActionBusy}
                      className={`flex-1 min-h-[50px] px-4 py-3 rounded-xl font-black text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-md select-none ${
                        isPending
                          ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20 active:scale-[0.98]'
                          : isInPrep
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 active:scale-[0.98]'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-[0.98]'
                      } ${isActionBusy ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      {isActionBusy ? (
                        <span>Atualizando...</span>
                      ) : isPending ? (
                        <>
                          <Flame className="w-5 h-5 text-amber-200" />
                          <span>1-Toque: Colocar No Forno</span>
                        </>
                      ) : isInPrep ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                          <span>1-Toque: Marcar Pronto</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5 stroke-[3]" />
                          <span>1-Toque: Finalizar / Despachar</span>
                        </>
                      )}
                    </button>

                  </div>

                </div>

              </div>
            );
          })}

        </div>
      )}

      {/* Supabase Realtime Setup & SQL Instructions Modal */}
      {showSupabaseGuide && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-stone-200 dark:border-[#3F4147] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            
            <div className="p-5 border-b border-[#E8DFD5] dark:border-[#3F4147] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif-brand text-lg font-bold text-[#352527] dark:text-[#FFFFFF]">
                    Configuração do Supabase Realtime (KDS & Pedidos)
                  </h3>
                  <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1]">
                    Instruções para sincronização instantânea na bancada
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSupabaseGuide(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs text-[#352527] dark:text-[#FFFFFF]">
              <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-200 text-sm">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">1</span>
                  Tabela de Pedidos e Fornadas Sincronizadas
                </div>
                <p className="text-stone-600 dark:text-stone-300">
                  O canal <code>sabore_orders_live</code> recebe notificações em tempo real sempre que pedidos forem criados ou alterados no balcão ou delivery.
                </p>
              </div>
            </div>

            <div className="p-4 bg-stone-50 dark:bg-[#1E1F22] border-t border-[#E8DFD5] dark:border-[#3F4147] flex items-center justify-between">
              <div className="flex items-center gap-2 text-stone-500 text-[11px]">
                <Info className="w-4 h-4 text-emerald-600" />
                <span>Canal ativo: <code>sabore_orders_live</code></span>
              </div>
              <button
                onClick={() => setShowSupabaseGuide(false)}
                className="px-5 py-2 bg-[#B86B77] text-white rounded-xl text-xs font-bold hover:bg-[#A35965] transition-colors cursor-pointer"
              >
                Entendi, Fechar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
