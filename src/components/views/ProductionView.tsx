import React, { useState } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { supabase } from '../../lib/supabase';
import { formatQuantity } from '../../utils/units';
import { 
  Flame, 
  Plus, 
  Search, 
  Filter, 
  PackageCheck, 
  Truck, 
  AlertTriangle, 
  Clock, 
  ChefHat, 
  Boxes, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  Calendar, 
  ArrowRightLeft,
  X,
  Wheat,
  Layers,
  FileText,
  Printer,
  BarChart3,
  Hourglass,
  CalendarDays,
  TrendingUp,
  Award,
  Tablet,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { DailyProduction, Order } from '../../types';
import { KitchenDisplaySystem } from '../production/KitchenDisplaySystem';

interface ProductionViewProps {
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

export const ProductionView: React.FC<ProductionViewProps> = ({
  isFullScreen = false,
  onToggleFullScreen
}) => {
  const { 
    dailyProductions = [], 
    productionDeductionLogs = [], 
    technicalSheets = [], 
    orders = [],
    currentUser, 
    addDailyProduction, 
    updateDailyProduction, 
    deleteDailyProduction,
    processBatchCompletion
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

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper for date calculations
  const getDaysDiff = (dateStr: string) => {
    if (!dateStr) return 999;
    const target = new Date(dateStr + 'T00:00:00');
    const today = new Date(todayStr + 'T00:00:00');
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // View Filter states
  const [activeSubTab, setActiveSubTab] = useState<'kds' | 'inventory' | 'logs' | 'reports'>('kds');
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'disponivel' | 'estoque_baixo' | 'esgotado'>('todos');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Reports Period Filter state
  const [reportPeriod, setReportPeriod] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('week');
  const [reportStartDate, setReportStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [reportEndDate, setReportEndDate] = useState<string>(todayStr);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduction, setEditingProduction] = useState<DailyProduction | null>(null);

  // Form State
  const [formProductId, setFormProductId] = useState('');
  const [formProductName, setFormProductName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState('Viennoiserie');
  const [formQtyProduced, setFormQtyProduced] = useState<number>(30);
  const [formUnitPrice, setFormUnitPrice] = useState<number>(0);
  const [formBakerName, setFormBakerName] = useState(currentUser?.name || 'Mestre Padeiro');
  const [formProductionTime, setFormProductionTime] = useState('07:00');
  const [formBatchNumber, setFormBatchNumber] = useState('');
  const [formDate, setFormDate] = useState(todayStr);
  const [formExpirationDate, setFormExpirationDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [formNotes, setFormNotes] = useState('');
  const [formConsumeIngredients, setFormConsumeIngredients] = useState(true);

  // Open modal for new
  const handleOpenNewModal = () => {
    setEditingProduction(null);
    
    // Auto preset first technical sheet if exists
    if (technicalSheets.length > 0) {
      const firstSheet = technicalSheets[0];
      setFormProductId(firstSheet.id);
      setFormProductName(firstSheet.name);
      setFormSku(firstSheet.sku);
      setFormCategory(firstSheet.category || 'Panificação Artesanal');
      setFormUnitPrice(firstSheet.basePrice || 0);
      setFormQtyProduced(firstSheet.yieldAmount || 20);
    } else {
      setFormProductId('');
      setFormProductName('');
      setFormSku('');
      setFormCategory('Viennoiserie');
      setFormUnitPrice(0);
      setFormQtyProduced(20);
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setFormProductionTime(timeStr);
    setFormBatchNumber(`LOT-${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(100 + Math.random()*900)}`);
    setFormDate(todayStr);

    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 2);
    setFormExpirationDate(expDate.toISOString().split('T')[0]);

    setFormBakerName(currentUser?.name || 'Mestre Padeiro');
    setFormNotes('');
    setFormConsumeIngredients(true);
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (prod: DailyProduction) => {
    setEditingProduction(prod);
    setFormProductId(prod.productId);
    setFormProductName(prod.productName);
    setFormSku(prod.sku);
    setFormCategory(prod.category || 'Panificação Artesanal');
    setFormQtyProduced(prod.quantityProduced);
    setFormUnitPrice(prod.unitPrice || 0);
    setFormBakerName(prod.bakerName);
    setFormProductionTime(prod.productionTime);
    setFormBatchNumber(prod.batchNumber || '');
    setFormDate(prod.date);
    
    if (prod.expirationDate) {
      setFormExpirationDate(prod.expirationDate);
    } else {
      const d = new Date(prod.date);
      d.setDate(d.getDate() + 2);
      setFormExpirationDate(d.toISOString().split('T')[0]);
    }

    setFormNotes(prod.notes || '');
    setFormConsumeIngredients(false); // don't re-consume ingredients on edit
    setIsModalOpen(true);
  };

  // Select sheet change in form
  const handleSelectTechnicalSheet = (sheetId: string) => {
    const sheet = technicalSheets.find(s => s.id === sheetId);
    if (sheet) {
      setFormProductId(sheet.id);
      setFormProductName(sheet.name);
      setFormSku(sheet.sku);
      setFormCategory(sheet.category || 'Panificação Artesanal');
      setFormUnitPrice(sheet.basePrice || 0);
      setFormQtyProduced(sheet.yieldAmount || 20);
    }
  };

  // Submit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingProduction) {
      updateDailyProduction(editingProduction.id, {
        productId: formProductId,
        productName: formProductName,
        sku: formSku,
        category: formCategory,
        quantityProduced: formQtyProduced,
        unitPrice: formUnitPrice,
        bakerName: formBakerName,
        productionTime: formProductionTime,
        batchNumber: formBatchNumber,
        date: formDate,
        expirationDate: formExpirationDate,
        notes: formNotes
      });
    } else {
      addDailyProduction({
        productId: formProductId || `custom-${Date.now()}`,
        productName: formProductName,
        sku: formSku || 'SKU-PROD',
        category: formCategory,
        quantityProduced: formQtyProduced,
        unitPrice: formUnitPrice,
        bakerName: formBakerName,
        productionTime: formProductionTime,
        batchNumber: formBatchNumber,
        date: formDate,
        expirationDate: formExpirationDate,
        notes: formNotes
      });

      processBatchCompletion(
        formProductName,
        formProductId,
        formSku,
        formQtyProduced,
        formBatchNumber || `lote-${Date.now()}`
      );
    }

    setIsModalOpen(false);
  };

  // Filtering calculations for Inventory
  const filteredProductions = (dailyProductions || []).filter(prod => {
    if (!prod) return false;
    const matchesSearch = 
      (prod.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (prod.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (prod.bakerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (prod.batchNumber && prod.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'todos' || prod.status === statusFilter;
    const matchesDate = !selectedDate || prod.date === selectedDate;

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Calculate Metrics for selected date in Inventory
  const todayProds = (dailyProductions || []).filter(p => p && p.date === (selectedDate || todayStr));
  const totalProducedToday = todayProds.reduce((acc, p) => acc + (p?.quantityProduced || 0), 0);
  const totalRemainingToday = todayProds.reduce((acc, p) => acc + (p?.quantityRemaining || 0), 0);
  const totalDispatchedToday = todayProds.reduce((acc, p) => acc + (p?.quantityDispatched || 0), 0);
  const lowOrOutStockCount = todayProds.filter(p => p && (p.status === 'estoque_baixo' || p.status === 'esgotado')).length;

  // --- REPORT GENERATION LOGIC ---
  const getReportFilterDates = () => {
    let start = todayStr;
    let end = todayStr;

    if (reportPeriod === 'today') {
      start = todayStr;
      end = todayStr;
    } else if (reportPeriod === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      start = d.toISOString().split('T')[0];
      end = start;
    } else if (reportPeriod === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      start = d.toISOString().split('T')[0];
      end = todayStr;
    } else if (reportPeriod === 'month') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      start = d.toISOString().split('T')[0];
      end = todayStr;
    } else if (reportPeriod === 'custom') {
      start = reportStartDate;
      end = reportEndDate;
    }

    return { start, end };
  };

  const { start: rStart, end: rEnd } = getReportFilterDates();

  const reportProds = dailyProductions.filter(p => p.date >= rStart && p.date <= rEnd);
  
  // Report Calculations
  const rTotalBatches = reportProds.length;
  const rTotalProduced = reportProds.reduce((acc, p) => acc + p.quantityProduced, 0);
  const rTotalDispatched = reportProds.reduce((acc, p) => acc + p.quantityDispatched, 0);
  const rTotalRemaining = reportProds.reduce((acc, p) => acc + p.quantityRemaining, 0);
  const rTotalValueProduced = reportProds.reduce((acc, p) => acc + (p.quantityProduced * (p.unitPrice || 0)), 0);
  const rDispatchedRate = rTotalProduced > 0 ? Math.round((rTotalDispatched / rTotalProduced) * 100) : 0;

  // Product Ranking in Report
  const productRankingMap = new Map<string, { productName: string; sku: string; category: string; totalProduced: number; totalDispatched: number; totalValue: number }>();
  reportProds.forEach(p => {
    const key = p.productName;
    const existing = productRankingMap.get(key) || {
      productName: p.productName,
      sku: p.sku,
      category: p.category || 'Geral',
      totalProduced: 0,
      totalDispatched: 0,
      totalValue: 0
    };
    existing.totalProduced += p.quantityProduced;
    existing.totalDispatched += p.quantityDispatched;
    existing.totalValue += p.quantityProduced * (p.unitPrice || 0);
    productRankingMap.set(key, existing);
  });
  const topProductsReport = Array.from(productRankingMap.values()).sort((a, b) => b.totalProduced - a.totalProduced);

  // Baker Breakdown in Report
  const bakerMap = new Map<string, { bakerName: string; batchCount: number; unitsProduced: number }>();
  reportProds.forEach(p => {
    const baker = p.bakerName || 'Mestre Padeiro';
    const existing = bakerMap.get(baker) || { bakerName: baker, batchCount: 0, unitsProduced: 0 };
    existing.batchCount += 1;
    existing.unitsProduced += p.quantityProduced;
    bakerMap.set(baker, existing);
  });
  const bakerReport = Array.from(bakerMap.values()).sort((a, b) => b.unitsProduced - a.unitsProduced);

  const activeOrdersCount = (orders || []).filter(o => o && o.status !== 'entregue' && o.status !== 'cancelado').length;

  return (
    <div className="space-y-6">
      
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#2B2D31] p-5 rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-[#B86B77]/10 text-[#B86B77] rounded-lg">
              <Flame className="w-5 h-5" />
            </span>
            <h1 className="font-serif-brand text-2xl font-bold text-[#352527] dark:text-[#FFFFFF]">
              Produção & KDS Cozinha
            </h1>
          </div>
          <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1]">
            Painel KDS para tablets da cozinha, controle de fornadas, estoque de pronta entrega e relatórios analíticos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onToggleFullScreen && (
            <button
              onClick={onToggleFullScreen}
              className="p-2.5 rounded-xl bg-white dark:bg-[#1E1F22] text-[#7A6466] dark:text-[#B5BAC1] border border-[#E8DFD5] dark:border-[#3F4147] hover:bg-[#FAF7F2] dark:hover:bg-[#35373C] transition-colors shadow-xs cursor-pointer flex items-center justify-center"
              title={isFullScreen ? "Sair da Tela Cheia" : "Modo Tela Cheia"}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={() => setActiveSubTab('kds')}
            className={`flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
              activeSubTab === 'kds'
                ? 'bg-[#B86B77] text-white border-[#B86B77] shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800 hover:bg-amber-100'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span>Modo Cozinha (KDS)</span>
            {activeOrdersCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeSubTab === 'kds' ? 'bg-white text-[#B86B77]' : 'bg-[#B86B77] text-white animate-pulse'
              }`}>
                {activeOrdersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('reports')}
            className={`flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
              activeSubTab === 'reports'
                ? 'bg-[#352527] dark:bg-white text-white dark:text-[#1E1F22] border-[#352527] dark:border-white'
                : 'bg-[#FAF7F2] dark:bg-[#1E1F22] text-[#352527] dark:text-[#FFFFFF] border-[#E5DACF] dark:border-[#3F4147] hover:bg-[#EAE0D5] dark:hover:bg-[#35373C]'
            }`}
          >
            <FileText className="w-4 h-4 text-[#B86B77]" />
            <span>Relatórios</span>
          </button>

          <button
            onClick={() => handleOpenNewModal()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#B86B77] text-white text-xs font-bold rounded-xl hover:bg-[#A35965] transition-all cursor-pointer shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Fornada</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Pedidos Ativos na Cozinha */}
        <div 
          onClick={() => setActiveSubTab('kds')}
          className="bg-white dark:bg-[#2B2D31] p-4 rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] shadow-xs flex items-center justify-between gap-3.5 cursor-pointer hover:border-[#B86B77]/50 transition-all"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#B86B77]/15 border border-[#B86B77]/30 text-[#B86B77] flex items-center justify-center shrink-0">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#8C7678] dark:text-[#B5BAC1] uppercase tracking-wider block">
                Fila Modo Cozinha (KDS)
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-bold text-[#B86B77]">
                  {activeOrdersCount}
                </span>
                <span className="text-xs text-[#7A6466] dark:text-[#B5BAC1]">aguardando preparo</span>
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold text-[#B86B77] bg-[#B86B77]/10 px-2 py-1 rounded-lg">
            Ver KDS →
          </span>
        </div>

        {/* Card 2: Total Produzido */}
        <div className="bg-white dark:bg-[#2B2D31] p-4 rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-[#8C7678] dark:text-[#B5BAC1] uppercase tracking-wider block">
              Total Produzido Hoje
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold text-[#352527] dark:text-[#FFFFFF]">
                {totalProducedToday}
              </span>
              <span className="text-xs text-[#7A6466] dark:text-[#B5BAC1]">unidades</span>
            </div>
          </div>
        </div>

        {/* Card 3: Estoque Pronta Entrega */}
        <div className="bg-white dark:bg-[#2B2D31] p-4 rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-[#8C7678] dark:text-[#B5BAC1] uppercase tracking-wider block">
              Disponível em Estoque
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold text-emerald-800 dark:text-emerald-300">
                {totalRemainingToday}
              </span>
              <span className="text-xs text-[#7A6466] dark:text-[#B5BAC1]">unidades ativas</span>
            </div>
          </div>
        </div>

        {/* Card 4: Saídas por Pedidos */}
        <div className="bg-white dark:bg-[#2B2D31] p-4 rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-[#8C7678] dark:text-[#B5BAC1] uppercase tracking-wider block">
              Despachados / Baixas
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold text-blue-900 dark:text-blue-300">
                {totalDispatchedToday}
              </span>
              <span className="text-xs text-[#7A6466] dark:text-[#B5BAC1]">unidades saíram</span>
            </div>
          </div>
        </div>

      </div>

      {/* Navigation Sub-Tabs - Scrollable and more compact on mobile */}
      <div className="flex border-b border-[#E8DFD5] dark:border-[#3F4147] gap-3 sm:gap-4 overflow-x-auto scrollbar-none pb-px">
        
        {/* TAB 0: KDS Cozinha (Tablet View) */}
        <button
          onClick={() => setActiveSubTab('kds')}
          className={`pb-3 text-[11px] sm:text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'kds'
              ? 'border-[#B86B77] text-[#B86B77]'
              : 'border-transparent text-[#7A6466] dark:text-[#B5BAC1] hover:text-[#352527] dark:hover:text-[#FFFFFF]'
          }`}
        >
          <Tablet className="w-3.5 h-3.5 sm:w-4 h-4" />
          <span>Modo Cozinha (KDS)</span>
          {activeOrdersCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-bold bg-[#B86B77] text-white">
              {activeOrdersCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('inventory')}
          className={`pb-3 text-[11px] sm:text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'inventory'
              ? 'border-[#B86B77] text-[#B86B77]'
              : 'border-transparent text-[#7A6466] dark:text-[#B5BAC1] hover:text-[#352527] dark:hover:text-[#FFFFFF]'
          }`}
        >
          <Layers className="w-3.5 h-3.5 sm:w-4 h-4" />
          <span>Fornadas do Dia ({dailyProductions.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('logs')}
          className={`pb-3 text-[11px] sm:text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'logs'
              ? 'border-[#B86B77] text-[#B86B77]'
              : 'border-transparent text-[#7A6466] dark:text-[#B5BAC1] hover:text-[#352527] dark:hover:text-[#FFFFFF]'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5 sm:w-4 h-4" />
          <span>Baixas ({productionDeductionLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('reports')}
          className={`pb-3 text-[11px] sm:text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'reports'
              ? 'border-[#B86B77] text-[#B86B77]'
              : 'border-transparent text-[#7A6466] dark:text-[#B5BAC1] hover:text-[#352527] dark:hover:text-[#FFFFFF]'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 sm:w-4 h-4" />
          <span>Relatórios</span>
        </button>
      </div>

      {/* TAB 0: KDS Cozinha & Tablet Display */}
      {activeSubTab === 'kds' && (
        <KitchenDisplaySystem onOpenReceiptModal={setReceiptOrder} />
      )}

      {/* TAB 1: Inventory List */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-4">
          
          {/* Controls Bar: Search, Date & Status filter */}
          <div className="bg-white dark:bg-[#2B2D31] p-3.5 rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            
            {/* Search input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C7678]" />
                <input
                  type="text"
                  placeholder="Buscar por produto, SKU, lote ou padeiro..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#FAF7F2] dark:bg-[#1E1F22] border border-[#E5DACF] dark:border-[#3F4147] rounded-xl text-xs text-[#352527] dark:text-[#FFFFFF] focus:outline-none focus:ring-1 focus:ring-[#B86B77]"
                />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              
              {/* Date Filter */}
              <div className="flex items-center gap-1.5 bg-[#FAF7F2] dark:bg-[#1E1F22] px-3 py-1.5 rounded-xl border border-[#E5DACF] dark:border-[#3F4147]">
                <Calendar className="w-3.5 h-3.5 text-[#8C7678]" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs text-[#352527] dark:text-[#FFFFFF] focus:outline-none"
                />
                {selectedDate !== todayStr && (
                  <button
                    onClick={() => setSelectedDate(todayStr)}
                    className="text-[10px] text-[#B86B77] underline font-semibold ml-1 cursor-pointer"
                  >
                    Hoje
                  </button>
                )}
              </div>

              {/* Status Pills */}
              <div className="flex items-center gap-1 bg-[#FAF7F2] dark:bg-[#1E1F22] p-1 rounded-xl border border-[#E5DACF] dark:border-[#3F4147]">
                {(['todos', 'disponivel', 'estoque_baixo', 'esgotado'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors capitalize cursor-pointer ${
                      statusFilter === st
                        ? 'bg-[#B86B77] text-white'
                        : 'text-[#7A6466] dark:text-[#B5BAC1] hover:text-[#352527] dark:hover:text-[#FFFFFF] dark:text-[#FFFFFF]'
                    }`}
                  >
                    {st === 'todos' ? 'Todos' : st === 'disponivel' ? 'Disponível' : st === 'estoque_baixo' ? 'Baixo' : 'Esgotado'}
                  </button>
                ))}
              </div>

            </div>

          </div>

          {/* Table of Daily Productions */}
          <div className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] shadow-xs overflow-hidden">
            {filteredProductions.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto mb-3">
                  <Flame className="w-6 h-6" />
                </div>
                <h3 className="font-serif-brand text-lg font-bold text-[#352527] dark:text-[#FFFFFF] mb-1">
                  Nenhuma fornada cadastrada para este filtro
                </h3>
                <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1] max-w-md mx-auto mb-4">
                  Registre a produção da cozinha hoje para acompanhar o estoque de pronta entrega em tempo real, ver a baixa automática dos pedidos e a validade dos lotes.
                </p>
                <button
                  onClick={handleOpenNewModal}
                  className="px-4 py-2 bg-[#B86B77] text-white text-xs font-semibold rounded-xl hover:bg-[#A35965] transition-colors cursor-pointer"
                >
                  Cadastrar Primeira Fornada
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#EBE1D7] dark:border-[#3F4147] bg-[#F9F6F0] dark:bg-[#1E1F22] text-[11px] font-bold text-[#7A6466] dark:text-[#B5BAC1] uppercase tracking-wider">
                      <th className="py-3 px-4">Produto / SKU</th>
                      <th className="py-3 px-4">Horário & Lote</th>
                      <th className="py-3 px-4">Vencimento do Lote</th>
                      <th className="py-3 px-4">Produzido</th>
                      <th className="py-3 px-4">Despachado</th>
                      <th className="py-3 px-4">Estoque Disponível</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2EAE1] dark:divide-[#382B2E] text-xs text-[#352527] dark:text-[#FFFFFF]">
                    {(filteredProductions || []).map((prod) => {
                      if (!prod) return null;
                      const percentRemaining = Math.max(0, Math.min(100, Math.round(((prod.quantityRemaining || 0) / Math.max(1, prod.quantityProduced || 0)) * 100)));
                      
                      // Expiration logic
                      const daysToExp = prod.expirationDate ? getDaysDiff(prod.expirationDate) : 999;

                      const item = prod;
                      const fornada = prod;

                      return (
                        <tr key={prod.id} className="hover:bg-[#FAF7F2]/60 dark:hover:bg-[#35373C]/60 transition-colors">
                          
                          {/* Produto & SKU */}
                          <td className="py-3.5 px-4">
                            <div>
                              <div className="font-bold text-[#352527] dark:text-[#FFFFFF] flex items-center gap-2">
                                <span>{prod.productName}</span>
                                {prod.category && (
                                  <span className="text-[10px] font-semibold bg-[#F4ECE3] dark:bg-[#1E1F22] text-[#7A6466] dark:text-[#B5BAC1] px-2 py-0.5 rounded-full border border-[#E5DACF] dark:border-[#3F4147]">
                                    {prod.category}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#8C7678] dark:text-[#B5BAC1] mt-0.5 flex items-center gap-2">
                                <span>SKU: {prod.sku}</span>
                                {prod.unitPrice ? (
                                  <span>• Preço Balcão: R$ {(Number(prod.unitPrice) || 0).toFixed(2)}</span>
                                ) : null}
                              </div>
                            </div>
                          </td>

                          {/* Horário & Lote */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 text-[#503E40] dark:text-[#FFFFFF] font-medium">
                                <Clock className="w-3.5 h-3.5 text-[#8C7678]" />
                                <span>{prod.productionTime} ({prod.date === todayStr ? 'Hoje' : prod.date})</span>
                              </div>
                              {prod.batchNumber && (
                                <span className="text-[10px] text-[#8C7678] dark:text-[#B5BAC1] font-mono bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded">
                                  {prod.batchNumber}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Vencimento do Lote */}
                          <td className="py-3.5 px-4">
                            {prod.expirationDate ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 font-semibold text-[#352527] dark:text-[#FFFFFF]">
                                  <Hourglass className="w-3.5 h-3.5 text-[#B86B77]" />
                                  <span>{prod.expirationDate.split('-').reverse().join('/')}</span>
                                </div>

                                {daysToExp < 0 ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400 rounded-full">
                                    <AlertTriangle className="w-3 h-3" /> VENCIDO
                                  </span>
                                ) : daysToExp === 0 ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 rounded-full animate-pulse">
                                    <AlertTriangle className="w-3 h-3" /> VENCE HOJE
                                  </span>
                                ) : daysToExp === 1 ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 rounded-full">
                                    Vence Amanhã
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                                    Válido por +{daysToExp} dias
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-[#8C7678] dark:text-[#B5BAC1] italic">Não informado</span>
                            )}
                          </td>

                          {/* Produzido */}
                          <td className="py-3.5 px-4 font-semibold text-[#352527] dark:text-[#FFFFFF]">
                            {prod.quantityProduced} un
                          </td>

                          {/* Despachado */}
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-1 rounded-lg border border-blue-100 dark:border-blue-800/40">
                              -{prod.quantityDispatched} un
                            </span>
                          </td>

                          {/* Estoque Disponível & Barra de Progresso */}
                          <td className="py-3.5 px-4 min-w-[160px]">
                            <div>
                              <div className="flex items-center justify-between font-bold text-[#352527] dark:text-[#FFFFFF] mb-1">
                                <span className={prod.quantityRemaining === 0 ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-800 dark:text-emerald-400'}>
                                  {prod.quantityRemaining} un
                                </span>
                                <span className="text-[10px] text-[#8C7678] dark:text-[#B5BAC1]">
                                  {percentRemaining}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-300 ${
                                    prod.quantityRemaining === 0 
                                      ? 'bg-rose-500' 
                                      : prod.quantityRemaining <= 5 
                                      ? 'bg-amber-500' 
                                      : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${percentRemaining}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4">
                            {prod.status === 'disponivel' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 font-bold text-[10px] rounded-full uppercase tracking-wider">
                                <CheckCircle2 className="w-3 h-3" /> Disponível
                              </span>
                            )}
                            {prod.status === 'estoque_baixo' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 font-bold text-[10px] rounded-full uppercase tracking-wider">
                                <AlertTriangle className="w-3 h-3" /> Estoque Baixo
                              </span>
                            )}
                            {prod.status === 'esgotado' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400 font-bold text-[10px] rounded-full uppercase tracking-wider">
                                <X className="w-3 h-3" /> Esgotado
                              </span>
                            )}
                          </td>

                          {/* Ações */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              
                              <button
                                onClick={() => handleOpenEditModal(prod)}
                                className="p-1.5 text-[#7A6466] dark:text-[#B5BAC1] hover:text-[#352527] dark:hover:text-[#FFFFFF] hover:bg-[#FAF7F2] dark:hover:bg-[#35373C] rounded-lg transition-colors cursor-pointer"
                                title="Editar fornada"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  // Captura o ID sob qualquer propriedade disponível no objeto
                                  const itemToDelete = prod || item;
                                  const targetId = itemToDelete.id || (itemToDelete as any).batchId || (itemToDelete as any).code;
                                  
                                  if (targetId && window.confirm('Deseja realmente apagar esta fornada da lista?')) {
                                    deleteDailyProduction(targetId);
                                  }
                                }}
                                className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                title="Excluir fornada"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>

                            </div>
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

      {/* TAB 2: Deductions & Order Interactions Logs */}
      {activeSubTab === 'logs' && (
        <div className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8DFD5] dark:border-[#3F4147]">
            <div>
              <h3 className="font-serif-brand text-lg font-bold text-[#352527] dark:text-[#FFFFFF] flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-[#B86B77]" />
                <span>Histórico de Baixas Automáticas do Estoque</span>
              </h3>
              <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1]">
                Sempre que um pedido muda para status "Saiu para Entrega" ou "Entregue", os itens são descontados da produção do dia automaticamente.
              </p>
            </div>
          </div>

          {productionDeductionLogs.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-[#E5DACF] dark:border-[#3F4147] rounded-2xl bg-[#FAF7F2] dark:bg-[#1E1F22] shadow-inner">
              <Truck className="w-10 h-10 text-[#8C7678] mx-auto mb-2 opacity-60" />
              <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1] font-semibold">
                Nenhum pedido despachado ainda.
              </p>
              <p className="text-[11px] text-[#8C7678] dark:text-[#B5BAC1] mt-1 max-w-sm mx-auto">
                Assim que você alterar o status de um pedido na aba "Pedidos & Encomendas" para "Saiu para Entrega", o registro aparecerá aqui.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EBE1D7] dark:border-[#3F4147] bg-[#F9F6F0] dark:bg-[#1E1F22] text-[11px] font-bold text-[#7A6466] dark:text-[#B5BAC1] uppercase tracking-wider">
                    <th className="py-3 px-4">Data & Horário</th>
                    <th className="py-3 px-4">Código do Pedido</th>
                    <th className="py-3 px-4">Canal</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Produto Descontado</th>
                    <th className="py-3 px-4 text-center">Quantidade Retirada</th>
                    <th className="py-3 px-4 text-right">Status do Estoque</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2EAE1] dark:divide-[#382B2E] text-xs text-[#352527] dark:text-[#FFFFFF]">
                  {productionDeductionLogs.map((log) => {
                    if (!log) return null;
                    const timeFormatted = safeFormatDate(log.timestamp, { hour: '2-digit', minute: '2-digit' });
                    const dateFormatted = safeFormatDate(log.timestamp, { day: '2-digit', month: '2-digit', year: 'numeric' });

                    return (
                      <tr key={log.id} className="hover:bg-[#FAF7F2]/60 dark:hover:bg-[#35373C]/60 transition-colors">
                        <td className="py-3 px-4 text-[#7A6466] dark:text-[#B5BAC1] font-medium">
                          {dateFormatted} às {timeFormatted}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#352527] dark:text-[#FFFFFF]">
                          {log.orderCode}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            log.channel === 'ifood' ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40' :
                            log.channel === '99food' ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40' :
                            log.channel === 'whatsapp' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40' :
                            'bg-stone-100 dark:bg-[#383A40] text-stone-700 dark:text-[#F2F3F5]'
                          }`}>
                            {log.channel || 'balcao'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#352527] dark:text-[#FFFFFF]">
                          {log.customerName || 'Cliente Balcão'}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#352527] dark:text-[#FFFFFF]">
                          {log.productName}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-lg">
                          -{log.quantityDeducted} un
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800/40">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Baixa Efetuada
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Production Reports (Dia / Semana / Período) */}
      {activeSubTab === 'reports' && (
        <div className="space-y-6">
          
          {/* Report Filter Header Bar */}
          <div className="bg-white dark:bg-[#2B2D31] p-5 rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-5 h-5 text-[#B86B77]" />
                <h2 className="font-serif-brand text-xl font-bold text-[#352527] dark:text-[#FFFFFF]">
                  Relatório Analítico de Produção
                </h2>
              </div>
              <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1]">
                Exibindo dados de produção do período: <strong className="text-[#352527] dark:text-[#FFFFFF]">{rStart.split('-').reverse().join('/')} até {rEnd.split('-').reverse().join('/')}</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              
              {/* Preset Period Buttons */}
              <div className="flex items-center gap-1 bg-[#FAF7F2] dark:bg-[#1E1F22] p-1 rounded-xl border border-[#E5DACF] dark:border-[#3F4147]">
                <button
                  onClick={() => setReportPeriod('today')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    reportPeriod === 'today' ? 'bg-[#B86B77] text-white shadow-xs' : 'text-[#7A6466] dark:text-[#B5BAC1]'
                  }`}
                >
                  Hoje
                </button>
                <button
                  onClick={() => setReportPeriod('yesterday')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    reportPeriod === 'yesterday' ? 'bg-[#B86B77] text-white shadow-xs' : 'text-[#7A6466] dark:text-[#B5BAC1]'
                  }`}
                >
                  Ontem
                </button>
                <button
                  onClick={() => setReportPeriod('week')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    reportPeriod === 'week' ? 'bg-[#B86B77] text-white shadow-xs' : 'text-[#7A6466] dark:text-[#B5BAC1]'
                  }`}
                >
                  Últimos 7 Dias (Semana)
                </button>
                <button
                  onClick={() => setReportPeriod('month')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    reportPeriod === 'month' ? 'bg-[#B86B77] text-white shadow-xs' : 'text-[#7A6466] dark:text-[#B5BAC1]'
                  }`}
                >
                  30 Dias
                </button>
                <button
                  onClick={() => setReportPeriod('custom')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    reportPeriod === 'custom' ? 'bg-[#B86B77] text-white shadow-xs' : 'text-[#7A6466] dark:text-[#B5BAC1]'
                  }`}
                >
                  Personalizado
                </button>
              </div>

              {/* Custom Date Selector */}
              {reportPeriod === 'custom' && (
                <div className="flex items-center gap-1.5 bg-[#FAF7F2] dark:bg-[#1E1F22] px-3 py-1.5 rounded-xl border border-[#E5DACF] dark:border-[#3F4147] text-xs">
                  <input
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="bg-transparent text-[#352527] dark:text-[#FFFFFF]"
                  />
                  <span className="text-[#8C7678]">até</span>
                  <input
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="bg-transparent text-[#352527] dark:text-[#FFFFFF]"
                  />
                </div>
              )}

              {/* Print / Export Report Button */}
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#352527] dark:bg-[#383A40] text-white dark:text-[#FFFFFF] text-xs font-bold rounded-xl hover:opacity-90 cursor-pointer shadow-xs ml-auto"
                title="Imprimir Relatório de Produção"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir / Exportar PDF</span>
              </button>

            </div>
          </div>

          {/* Report KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            <div className="bg-white dark:bg-[#2B2D31] p-4 rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] shadow-xs">
              <span className="text-[11px] font-semibold text-[#8C7678] dark:text-[#B5BAC1] uppercase tracking-wider block">
                Fornadas no Período
              </span>
              <span className="text-2xl font-bold text-[#352527] dark:text-[#FFFFFF] mt-1 block">
                {rTotalBatches} <span className="text-xs font-normal text-[#7A6466]">lotes</span>
              </span>
            </div>

            <div className="bg-white dark:bg-[#2B2D31] p-4 rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] shadow-xs">
              <span className="text-[11px] font-semibold text-[#8C7678] dark:text-[#B5BAC1] uppercase tracking-wider block">
                Total Produzido
              </span>
              <span className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1 block">
                {rTotalProduced} <span className="text-xs font-normal text-[#7A6466]">unidades</span>
              </span>
            </div>

            <div className="bg-white dark:bg-[#2B2D31] p-4 rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] shadow-xs">
              <span className="text-[11px] font-semibold text-[#8C7678] dark:text-[#B5BAC1] uppercase tracking-wider block">
                Total Vendido / Despachado
              </span>
              <span className="text-2xl font-bold text-blue-900 dark:text-blue-300 mt-1 block">
                {rTotalDispatched} <span className="text-xs font-normal text-[#7A6466]">unidades</span>
              </span>
            </div>

            <div className="bg-white dark:bg-[#2B2D31] p-4 rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] shadow-xs">
              <span className="text-[11px] font-semibold text-[#8C7678] dark:text-[#B5BAC1] uppercase tracking-wider block">
                Taxa de Saída (Giro)
              </span>
              <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-400 mt-1 block">
                {rDispatchedRate}%
              </span>
            </div>

            <div className="bg-white dark:bg-[#2B2D31] p-4 rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] shadow-xs">
              <span className="text-[11px] font-semibold text-[#8C7678] dark:text-[#B5BAC1] uppercase tracking-wider block">
                Valor Total de Venda
              </span>
              <span className="text-2xl font-bold text-[#B86B77] mt-1 block">
                R$ {rTotalValueProduced.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

          </div>

          {/* Detailed Report Visual Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Columns: Top Products Produced */}
            <div className="lg:col-span-2 bg-white dark:bg-[#2B2D31] p-5 rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8DFD5] dark:border-[#3F4147]">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#B86B77]" />
                  <h3 className="font-serif-brand text-lg font-bold text-[#352527] dark:text-[#FFFFFF]">
                    Ranking dos Produtos Mais Produzidos
                  </h3>
                </div>
                <span className="text-xs text-[#7A6466] dark:text-[#B5BAC1]">
                  {topProductsReport.length} produtos diferentes
                </span>
              </div>

              {topProductsReport.length === 0 ? (
                <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1] py-8 text-center italic">
                  Nenhum registro de produção encontrado no período selecionado.
                </p>
              ) : (
                <div className="space-y-3">
                  {topProductsReport.map((prod, idx) => {
                    const percentOfTotal = rTotalProduced > 0 ? Math.round((prod.totalProduced / rTotalProduced) * 100) : 0;
                    const salesPercent = prod.totalProduced > 0 ? Math.round((prod.totalDispatched / prod.totalProduced) * 100) : 0;

                    return (
                      <div key={prod.productName} className="p-3.5 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#E5DACF] dark:border-[#3F4147] space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-[#B86B77] text-white font-bold text-xs flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <div>
                              <div className="font-bold text-xs text-[#352527] dark:text-[#FFFFFF]">{prod.productName}</div>
                              <div className="text-[10px] text-[#8C7678] dark:text-[#B5BAC1]">SKU: {prod.sku} • {prod.category}</div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-bold text-sm text-[#352527] dark:text-[#FFFFFF]">{prod.totalProduced} un</span>
                            <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                              R$ {(Number(prod.totalValue) || 0).toFixed(2)}
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar & Stats */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-[#7A6466] dark:text-[#B5BAC1]">
                            <span>{percentOfTotal}% da produção total do período</span>
                            <span>{prod.totalDispatched} un vendidas ({salesPercent}% de saída)</span>
                          </div>
                          <div className="w-full h-1.5 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                            <div className="h-full bg-[#B86B77]" style={{ width: `${percentOfTotal}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Baker Efficiency & Performance */}
            <div className="bg-white dark:bg-[#2B2D31] p-5 rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[#E8DFD5] dark:border-[#3F4147]">
                <Award className="w-5 h-5 text-[#B86B77]" />
                <h3 className="font-serif-brand text-lg font-bold text-[#352527] dark:text-[#FFFFFF]">
                  Desempenho por Mestre / Chef
                </h3>
              </div>

              {bakerReport.length === 0 ? (
                <p className="text-xs text-[#7A6466] py-8 text-center italic">
                  Sem dados para o período.
                </p>
              ) : (
                <div className="space-y-3">
                  {bakerReport.map((baker) => (
                    <div key={baker.bakerName} className="p-3 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#E5DACF] dark:border-[#3F4147] flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold flex items-center justify-center shrink-0">
                          <ChefHat className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-[#352527] dark:text-[#FFFFFF]">{baker.bakerName}</div>
                          <div className="text-[10px] text-[#8C7678] dark:text-[#B5BAC1]">{baker.batchCount} fornadas realizadas</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-xs text-[#352527] dark:text-[#FFFFFF]">{formatQuantity(baker.unitsProduced, 'un')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Report Full Analytical Table */}
          <div className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] shadow-xs p-5 space-y-4">
            <h3 className="font-serif-brand text-lg font-bold text-[#352527] dark:text-[#FFFFFF]">
              Tabela Analítica Completa de Fornadas
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EBE1D7] dark:border-[#3F4147] bg-[#F9F6F0] dark:bg-[#1E1F22] text-[11px] font-bold text-[#7A6466] dark:text-[#B5BAC1] uppercase tracking-wider">
                    <th className="py-3 px-4">Data & Horário</th>
                    <th className="py-3 px-4">Lote</th>
                    <th className="py-3 px-4">Produto</th>
                    <th className="py-3 px-4">Responsável</th>
                    <th className="py-3 px-4">Produzido</th>
                    <th className="py-3 px-4">Despachado</th>
                    <th className="py-3 px-4">Restante</th>
                    <th className="py-3 px-4">Vencimento Lote</th>
                    <th className="py-3 px-4 text-right">Valor Estimado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2EAE1] dark:divide-[#382B2E] text-xs text-[#352527] dark:text-[#FFFFFF]">
                  {reportProds.map((prod) => {
                    const totalVal = prod.quantityProduced * (prod.unitPrice || 0);
                    return (
                      <tr key={prod.id} className="hover:bg-[#FAF7F2]/60 dark:hover:bg-[#35373C]/60">
                        <td className="py-3 px-4 font-medium">{prod.date} às {prod.productionTime}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#8C7678] dark:text-[#B5BAC1]">{prod.batchNumber || '-'}</td>
                        <td className="py-3 px-4 font-bold">{prod.productName}</td>
                        <td className="py-3 px-4">{prod.bakerName}</td>
                        <td className="py-3 px-4 font-bold">{formatQuantity(prod.quantityProduced, 'un')}</td>
                        <td className="py-3 px-4 text-blue-800 dark:text-blue-300 font-bold">-{formatQuantity(prod.quantityDispatched, 'un')}</td>
                        <td className="py-3 px-4 text-emerald-800 dark:text-emerald-400 font-bold">{formatQuantity(prod.quantityRemaining, 'un')}</td>
                        <td className="py-3 px-4 font-medium">{prod.expirationDate ? prod.expirationDate.split('-').reverse().join('/') : '-'}</td>
                        <td className="py-3 px-4 text-right font-bold text-[#B86B77]">R$ {(Number(totalVal) || 0).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Modal 1: Register or Edit Daily Production */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-2xl border border-[#E5DACF] dark:border-[#3F4147] shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col my-auto overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#EBE1D7] dark:border-[#3F4147] flex items-center justify-between bg-[#F4EFEA] dark:bg-[#1E1F22]">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-[#B86B77]/10 text-[#B86B77] rounded-lg">
                  <Flame className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-serif-brand text-lg font-bold text-[#382628] dark:text-[#FFFFFF]">
                    {editingProduction ? 'Editar Fornada' : 'Cadastrar Produção do Dia'}
                  </h3>
                  <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1]">
                    Registre as unidades fornadas para estoque de pronta entrega e defina a validade do lote.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-[#7A6466] dark:text-[#B5BAC1] hover:bg-[#EAE0D5] dark:hover:bg-[#35373C] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              
              {/* Preset Select from Technical Sheets */}
              {technicalSheets.length > 0 && !editingProduction && (
                <div className="p-3 bg-[#F4ECE3] dark:bg-[#1E1F22] rounded-xl border border-[#E8DEC0] dark:border-[#3F4147] mb-2">
                  <label className="block text-[11px] font-bold uppercase text-[#8C7678] dark:text-[#B5BAC1] mb-1 flex items-center gap-1.5">
                    <Wheat className="w-3.5 h-3.5 text-[#B86B77]" />
                    <span>Selecionar de Ficha Técnica Existente:</span>
                  </label>
                  <select
                    value={formProductId}
                    onChange={(e) => handleSelectTechnicalSheet(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#1E1F22] border border-[#E5DACF] dark:border-[#3F4147] rounded-xl text-xs font-semibold text-[#352527] dark:text-[#FFFFFF] focus:outline-none focus:ring-1 focus:ring-[#B86B77]"
                  >
                    {technicalSheets.map((sheet) => (
                      <option key={sheet.id} value={sheet.id}>
                        {sheet.name} (SKU: {sheet.sku}) — Rendimento Padrão: {sheet.yieldAmount} un
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Product Name & SKU */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-[#6E5558] dark:text-[#B5BAC1] mb-1">
                    Nome do Produto *
                  </label>
                  <input
                    type="text"
                    required
                    value={formProductName}
                    onChange={(e) => setFormProductName(e.target.value)}
                    placeholder="Ex: Croissant Francês Tradicional"
                    className="w-full px-3 py-2 bg-white dark:bg-[#1E1F22] border border-[#E5DACF] dark:border-[#3F4147] rounded-xl text-xs text-[#352527] dark:text-[#FFFFFF] focus:outline-none focus:ring-1 focus:ring-[#B86B77]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#6E5558] dark:text-[#B5BAC1] mb-1">
                    Código / SKU
                  </label>
                  <input
                    type="text"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="Ex: CRO-001"
                    className="w-full px-3 py-2 bg-white dark:bg-[#1E1F22] border border-[#E5DACF] dark:border-[#3F4147] rounded-xl text-xs text-[#352527] dark:text-[#FFFFFF] focus:outline-none focus:ring-1 focus:ring-[#B86B77]"
                  />
                </div>
              </div>

              {/* Category, Quantity & Unit Price */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#6E5558] dark:text-[#B5BAC1] mb-1">
                    Categoria
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#1E1F22] border border-[#E5DACF] dark:border-[#3F4147] rounded-xl text-xs text-[#352527] dark:text-[#FFFFFF] focus:outline-none focus:ring-1 focus:ring-[#B86B77]"
                  >
                    <option value="Panificação Artesanal">Panificação Artesanal</option>
                    <option value="Confeitaria Fina">Confeitaria Fina</option>
                    <option value="Viennoiserie">Viennoiserie</option>
                    <option value="Sobremesas & Tortas">Sobremesas & Tortas</option>
                    <option value="Salgados Artesanais">Salgados Artesanais</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#6E5558] dark:text-[#B5BAC1] mb-1">
                    Qtd Produzida (Unidades) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formQtyProduced}
                    onChange={(e) => setFormQtyProduced(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#1E1F22] border border-[#E5DACF] dark:border-[#3F4147] rounded-xl text-xs font-bold text-[#352527] dark:text-[#FFFFFF] focus:outline-none focus:ring-1 focus:ring-[#B86B77]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#6E5558] dark:text-[#B5BAC1] mb-1">
                    Preço de Venda (Balcão)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formUnitPrice}
                    onChange={(e) => setFormUnitPrice(parseFloat(e.target.value) || 0)}
                    placeholder="R$ 0,00"
                    className="w-full px-3 py-2 bg-white dark:bg-[#1E1F22] border border-[#E5DACF] dark:border-[#3F4147] rounded-xl text-xs text-[#352527] dark:text-[#FFFFFF] focus:outline-none focus:ring-1 focus:ring-[#B86B77]"
                  />
                </div>
              </div>

              {/* Date, Time & Batch Expiration Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#6E5558] dark:text-[#B5BAC1] mb-1">
                    Data da Fornada
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#1E1F22] border border-[#E5DACF] dark:border-[#3F4147] rounded-xl text-xs text-[#352527] dark:text-[#FFFFFF]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#6E5558] dark:text-[#B5BAC1] mb-1">
                    Horário da Fornada
                  </label>
                  <input
                    type="time"
                    value={formProductionTime}
                    onChange={(e) => setFormProductionTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#1E1F22] border border-[#E5DACF] dark:border-[#3F4147] rounded-xl text-xs text-[#352527] dark:text-[#FFFFFF]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#B86B77] mb-1 flex items-center gap-1">
                    <Hourglass className="w-3.5 h-3.5" /> Vencimento do Lote *
                  </label>
                  <input
                    type="date"
                    required
                    value={formExpirationDate}
                    onChange={(e) => setFormExpirationDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#1E1F22] border border-[#B86B77]/60 rounded-xl text-xs font-bold text-[#352527] dark:text-[#FFFFFF] focus:ring-1 focus:ring-[#B86B77]"
                  />
                </div>
              </div>

              {/* Baker & Batch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#6E5558] dark:text-[#B5BAC1] mb-1">
                    Mestre Padeiro / Chef Responsável
                  </label>
                  <input
                    type="text"
                    value={formBakerName}
                    onChange={(e) => setFormBakerName(e.target.value)}
                    placeholder="Ex: Mestre Jean Luc"
                    className="w-full px-3 py-2 bg-white dark:bg-[#1E1F22] border border-[#E5DACF] dark:border-[#3F4147] rounded-xl text-xs text-[#352527] dark:text-[#FFFFFF]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#6E5558] dark:text-[#B5BAC1] mb-1">
                    Número do Lote
                  </label>
                  <input
                    type="text"
                    value={formBatchNumber}
                    onChange={(e) => setFormBatchNumber(e.target.value)}
                    placeholder="LOT-2026-001"
                    className="w-full px-3 py-2 bg-white dark:bg-[#1E1F22] border border-[#E5DACF] dark:border-[#3F4147] rounded-xl text-xs font-mono text-[#352527] dark:text-[#FFFFFF]"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-[#6E5558] dark:text-[#B5BAC1] mb-1">
                  Observações de Forno ou Qualidade
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ex: Forno Convector turbo a 180°C - Colocar brilho de gema"
                  className="w-full px-3 py-2 bg-white dark:bg-[#1E1F22] border border-[#E5DACF] dark:border-[#3F4147] rounded-xl text-xs text-[#352527] dark:text-[#FFFFFF]"
                />
              </div>

              {/* Checkbox: Consume raw materials automatically */}
              {!editingProduction && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 rounded-xl flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="consumeRawMaterials"
                    checked={formConsumeIngredients}
                    onChange={(e) => setFormConsumeIngredients(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="consumeRawMaterials" className="text-xs text-emerald-900 dark:text-emerald-300 cursor-pointer">
                    <span className="font-bold block">Dar baixa automática nos insumos do estoque de matéria-prima</span>
                    <span>Consome a farinha, manteiga e açúcar cadastrados na Ficha Técnica proporcionalmente à quantidade produzida.</span>
                  </label>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#EBE1D7] dark:border-[#3F4147]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#7A6466] dark:text-[#B5BAC1] hover:bg-[#EAE0D5] dark:hover:bg-[#35373C] rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#B86B77] text-white text-xs font-bold rounded-xl hover:bg-[#A35965] transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingProduction ? 'Salvar Alterações' : 'Confirmar & Registrar Fornada'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Printable Comanda / Order Receipt Modal from KDS */}
      {receiptOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-stone-200 dark:border-[#3F4147] shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8DFD5] dark:border-[#3F4147] pb-3">
              <div>
                <h3 className="font-serif-brand text-lg font-bold text-[#352527] dark:text-[#FFFFFF]">
                  Comanda de Produção & Cozinha
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

            {/* Receipt body */}
            <div className="bg-[#FAF8F5] dark:bg-[#1E1F22] p-4 rounded-xl border border-dashed border-[#DACDC0] dark:border-[#3F4147] font-mono text-xs space-y-2 text-[#352527] dark:text-[#FFFFFF]">
              <div className="text-center pb-2 border-b border-[#E0D5C7] dark:border-[#3F4147]">
                <div className="font-bold text-sm">SABORÊ ARTESANAL</div>
                <div className="text-[10px] text-stone-500 dark:text-[#B5BAC1]">KDS COZINHA & PRODUÇÃO</div>
                <div className="text-[11px] font-bold mt-1 text-[#B86B77]">{receiptOrder.code}</div>
              </div>

              <div className="text-[11px] space-y-0.5">
                <div><strong>Cliente:</strong> {receiptOrder.customerName}</div>
                <div><strong>Telefone:</strong> {receiptOrder.customerPhone}</div>
                {receiptOrder.pickupCode && (
                  <div><strong>PIN/Código de Coleta:</strong> <span className="font-bold underline">{receiptOrder.pickupCode}</span></div>
                )}
                {receiptOrder.customerAddress && (
                  <div><strong>Endereço:</strong> {receiptOrder.customerAddress}</div>
                )}
                <div><strong>Canal:</strong> {receiptOrder.channel.toUpperCase()}</div>
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

              <div className="border-t border-[#E0D5C7] dark:border-[#3F4147] pt-2 text-right">
                <div className="font-bold">Total: R$ {(Number(receiptOrder.total) || 0).toFixed(2)}</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setReceiptOrder(null)}
                className="px-4 py-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold hover:bg-stone-200 transition-colors cursor-pointer"
              >
                Fechar
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-[#B86B77] text-white rounded-xl text-xs font-bold hover:bg-[#A35965] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Comanda</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
