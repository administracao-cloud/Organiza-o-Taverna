import React, { useState } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { StockBatch, StockMovement, UnitOfMeasure, Material } from '../../types';
import { formatQuantity } from '../../utils/units';
import { 
  Boxes, 
  AlertTriangle, 
  History, 
  Plus, 
  Search, 
  Calendar, 
  FileText, 
  Clock, 
  AlertCircle,
  Edit2,
  Trash2,
  Flame,
  Printer,
  CheckCircle2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Settings,
  Zap
} from 'lucide-react';
import { StockMovementModal } from '../modals/StockMovementModal';
import { WasteRegistrationModal } from '../modals/WasteRegistrationModal';
import { MaterialEditModal } from '../modals/MaterialEditModal';

export const InventoryView: React.FC = () => {
  const { 
    materials = [], 
    stockMovements = [], 
    stockBatches = [],
    dailyProductions = [],
    updateStockBatch,
    deleteStockBatch,
    updateStockMovement,
    deleteStockMovement,
    dismissedCriticalWarnings,
    dismissCriticalWarning,
    updateMaterial
  } = useBakery();

  const [activeTab, setActiveTab] = useState<'materials' | 'expirations' | 'production_batches' | 'history'>('materials');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'critical' | 'healthy'>('all');
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isWasteModalOpen, setIsWasteModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [preselectedMaterialId, setPreselectedMaterialId] = useState<string | undefined>(undefined);

  // Bulk edit state
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [bulkEditAction, setBulkEditAction] = useState<'category' | 'percentage' | 'fixed'>('category');
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkPercentageValue, setBulkPercentageValue] = useState<number>(0);
  const [bulkPriceValue, setBulkPriceValue] = useState<number>(0);

  const existingCategories = Array.from(new Set(materials.map(m => m.category))).filter(Boolean);

  // Sorting state for Materials list
  const [sortField, setSortField] = useState<'code' | 'name' | 'category' | 'currentStock' | 'minStock' | 'totalVal' | 'status' | null>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'code' | 'name' | 'category' | 'currentStock' | 'minStock' | 'totalVal' | 'status') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Edit & Delete Batch State
  const [editingBatch, setEditingBatch] = useState<StockBatch | null>(null);
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);

  const [batchMatName, setBatchMatName] = useState('');
  const [batchInvoice, setBatchInvoice] = useState('');
  const [batchSupplier, setBatchSupplier] = useState('');
  const [batchQtyRemaining, setBatchQtyRemaining] = useState<number>(0);
  const [batchUnit, setBatchUnit] = useState<UnitOfMeasure>('kg');
  const [batchReceivedDate, setBatchReceivedDate] = useState('');
  const [batchExpirationDate, setBatchExpirationDate] = useState('');

  // Edit & Delete Movement State
  const [editingMovement, setEditingMovement] = useState<StockMovement | null>(null);
  const [deletingMovementId, setDeletingMovementId] = useState<string | null>(null);

  const [movType, setMovType] = useState<'entrada' | 'saida_producao' | 'ajuste' | 'perda_avaria'>('saida_producao');
  const [movQuantity, setMovQuantity] = useState<number>(1);
  const [movUnit, setMovUnit] = useState<UnitOfMeasure>('kg');
  const [movReason, setMovReason] = useState('');
  const [movResponsible, setMovResponsible] = useState('');
  const [movDate, setMovDate] = useState('');

  // Calculate total inventory value
  const totalInventoryValue = (materials || []).reduce((acc, m) => {
    const unitPrice = m?.currentCostPerUnit ?? m?.costPerUnit ?? 0;
    return acc + (((m?.currentStock ?? 0)) * unitPrice);
  }, 0);

  const criticalItems = (materials || []).filter(m => m && (m.currentStock ?? 0) <= (m.minStock ?? 0));
  const alertItems = criticalItems.filter(m => !dismissedCriticalWarnings.includes(m.id));

  // Expiration & FEFO calculations
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Mapeia o lote ativo prioritário (1º da fila FEFO: validade mais próxima) por insumo
  const fefoPriorityBatchMap = React.useMemo(() => {
    const map = new Map<string, string>(); // materialId -> batchId
    const activeBatches = (stockBatches || []).filter(b => (b.quantityRemaining || 0) > 0 && b.status !== 'esgotado');
    const grouped = new Map<string, StockBatch[]>();
    activeBatches.forEach(b => {
      const list = grouped.get(b.materialId) || [];
      list.push(b);
      grouped.set(b.materialId, list);
    });
    grouped.forEach((list, matId) => {
      list.sort((a, b) => {
        const timeA = new Date(a.expirationDate + 'T00:00:00').getTime();
        const timeB = new Date(b.expirationDate + 'T00:00:00').getTime();
        return (isNaN(timeA) ? 0 : timeA) - (isNaN(timeB) ? 0 : timeB);
      });
      if (list.length > 0) {
        map.set(matId, list[0].id);
      }
    });
    return map;
  }, [stockBatches]);

  const enrichedBatches = (stockBatches || []).map(batch => {
    if (!batch) return null;
    const expDate = new Date(batch.expirationDate + 'T00:00:00');
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isExhausted = (batch.quantityRemaining || 0) <= 0.0001 || batch.status === 'esgotado';
    
    let status: 'expired' | 'warning_5' | 'warning_15' | 'warning_30' | 'valid' | 'exhausted' = 'valid';
    if (isExhausted) {
      status = 'exhausted';
    } else if (diffDays < 0 || batch.status === 'vencido') {
      status = 'expired';
    } else if (diffDays <= 5 || batch.status === 'proximo_vencimento') {
      status = 'warning_5';
    } else if (diffDays <= 15) {
      status = 'warning_15';
    } else if (diffDays <= 30) {
      status = 'warning_30';
    }

    const isFefoNext = !isExhausted && fefoPriorityBatchMap.get(batch.materialId) === batch.id;

    return { ...batch, diffDays, status, isFefoNext };
  }).filter(Boolean) as any[];

  const expiredBatchesCount = enrichedBatches.filter(b => b && b.status === 'expired').length;
  const warning5BatchesCount = enrichedBatches.filter(b => b && b.status === 'warning_5').length;
  const warning15BatchesCount = enrichedBatches.filter(b => b && b.status === 'warning_15').length;
  const warning30BatchesCount = enrichedBatches.filter(b => b && b.status === 'warning_30').length;
  const activeBatchesCount = enrichedBatches.filter(b => b && b.status !== 'exhausted').length;

  const filteredMaterials = (materials || []).filter(m => {
    if (!m) return false;
    const matchesSearch = 
      (m.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.code || '').toLowerCase().includes(search.toLowerCase());
    
    if (filterType === 'critical') return matchesSearch && (m.currentStock || 0) <= (m.minStock || 0);
    if (filterType === 'healthy') return matchesSearch && (m.currentStock || 0) > (m.minStock || 0);
    return matchesSearch;
  });

  const sortedMaterials = [...filteredMaterials].sort((a, b) => {
    if (!sortField) return 0;

    let aValue: any;
    let bValue: any;

    if (sortField === 'code' || sortField === 'name') {
      // Sort code/name columns. Code sort falls back to name.
      if (sortField === 'code') {
        aValue = a.code || '';
        bValue = b.code || '';
      } else {
        aValue = a.name || '';
        bValue = b.name || '';
      }
    } else if (sortField === 'category') {
      aValue = a.category || '';
      bValue = b.category || '';
    } else if (sortField === 'currentStock') {
      aValue = a.currentStock || 0;
      bValue = b.currentStock || 0;
    } else if (sortField === 'minStock') {
      aValue = a.minStock || 0;
      bValue = b.minStock || 0;
    } else if (sortField === 'totalVal') {
      const aUnitPrice = a.currentCostPerUnit ?? a.costPerUnit ?? 0;
      aValue = (a.currentStock ?? 0) * aUnitPrice;

      const bUnitPrice = b.currentCostPerUnit ?? b.costPerUnit ?? 0;
      bValue = (b.currentStock ?? 0) * bUnitPrice;
    } else if (sortField === 'status') {
      const aCritical = (a.currentStock ?? 0) <= (a.minStock ?? 0) ? 1 : 0;
      const bCritical = (b.currentStock ?? 0) <= (b.minStock ?? 0) ? 1 : 0;
      aValue = aCritical;
      bValue = bCritical;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredBatches = enrichedBatches
    .filter(b => {
      const q = search.toLowerCase();
      return (b.materialName || '').toLowerCase().includes(q) ||
        (b.materialCode && b.materialCode.toLowerCase().includes(q)) ||
        (b.invoiceNumber && b.invoiceNumber.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      // FEFO Sort: lotes ativos primeiro, ordenados por expirationDate ascendente
      if (a.status === 'exhausted' && b.status !== 'exhausted') return 1;
      if (a.status !== 'exhausted' && b.status === 'exhausted') return -1;
      const dateA = new Date(a.expirationDate + 'T00:00:00').getTime();
      const dateB = new Date(b.expirationDate + 'T00:00:00').getTime();
      return (isNaN(dateA) ? 0 : dateA) - (isNaN(dateB) ? 0 : dateB);
    });

  const allVisibleIds = sortedMaterials.map(m => m.id);
  const isAllSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedMaterialIds.includes(id));

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedMaterialIds(prev => prev.filter(id => !allVisibleIds.includes(id)));
    } else {
      const set = new Set([...selectedMaterialIds, ...allVisibleIds]);
      setSelectedMaterialIds(Array.from(set));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedMaterialIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleApplyBulkEdit = () => {
    if (selectedMaterialIds.length === 0) return;

    selectedMaterialIds.forEach(id => {
      const mat = materials.find(m => m.id === id);
      if (!mat) return;

      if (bulkEditAction === 'category' && bulkCategory.trim()) {
        updateMaterial(id, { category: bulkCategory.trim() });
      } else if (bulkEditAction === 'percentage') {
        const currentCost = mat.currentCostPerUnit ?? mat.costPerUnit ?? 0;
        const multiplier = 1 + (bulkPercentageValue / 100);
        const newCost = Math.max(0, currentCost * multiplier);
        updateMaterial(id, { currentCostPerUnit: newCost, costPerUnit: newCost });
      } else if (bulkEditAction === 'fixed') {
        const newCost = Math.max(0, bulkPriceValue);
        updateMaterial(id, { currentCostPerUnit: newCost, costPerUnit: newCost });
      }
    });

    setIsBulkEditModalOpen(false);
    setSelectedMaterialIds([]);
    alert(`Edição em lote aplicada com sucesso a ${selectedMaterialIds.length} insumos!`);
  };

  const handleOpenMovement = (matId?: string) => {
    setPreselectedMaterialId(matId);
    setIsMovementModalOpen(true);
  };

  const handleOpenWaste = (matId?: string) => {
    setPreselectedMaterialId(matId);
    setIsWasteModalOpen(true);
  };

  // Handlers for Stock Batch Edit
  const handleOpenEditBatch = (batch: StockBatch) => {
    setEditingBatch(batch);
    setBatchMatName(batch.materialName || '');
    setBatchInvoice(batch.invoiceNumber || '');
    setBatchSupplier(batch.supplier || '');
    setBatchQtyRemaining(batch.quantityRemaining || 0);
    setBatchUnit(batch.unit || 'kg');
    setBatchReceivedDate(batch.purchaseDate || new Date().toISOString().split('T')[0]);
    setBatchExpirationDate(batch.expirationDate || new Date().toISOString().split('T')[0]);
  };

  const handleSaveBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;

    updateStockBatch(editingBatch.id, {
      materialName: batchMatName,
      invoiceNumber: batchInvoice,
      supplier: batchSupplier,
      quantityRemaining: Number(batchQtyRemaining),
      unit: batchUnit,
      purchaseDate: batchReceivedDate,
      expirationDate: batchExpirationDate
    });

    setEditingBatch(null);
  };

  // Handlers for Stock Movement Edit
  const handleOpenEditMovement = (mov: StockMovement) => {
    setEditingMovement(mov);
    setMovType(mov.type);
    setMovQuantity(mov.quantity || 1);
    setMovUnit(mov.unit || 'kg');
    setMovReason(mov.reason || '');
    setMovResponsible(mov.responsible || '');
    setMovDate(mov.date || new Date().toLocaleString('pt-BR'));
  };

  const handleSaveMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMovement) return;

    updateStockMovement(editingMovement.id, {
      type: movType,
      quantity: Number(movQuantity),
      unit: movUnit,
      reason: movReason,
      responsible: movResponsible,
      date: movDate
    });

    setEditingMovement(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-0">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E8DFD5] dark:border-[#3F4147]">
        <div>
          <h2 className="font-serif-brand text-xl sm:text-2xl font-bold text-[#352527] dark:text-[#FFFFFF] flex items-center gap-2">
            <Boxes className="w-6 h-6 text-[#B86B77]" />
            <span>Controle de Estoque & Validades (NF-e)</span>
          </h2>
          <p className="text-[10px] sm:text-xs text-[#7A6466]">
            Controle físico em tempo real, lotes de notas fiscais e alertas preventivos de vencimento
          </p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setIsWasteModalOpen(true)}
            className="px-3 sm:px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] sm:text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Perda</span>
          </button>

          <button
            onClick={() => handleOpenMovement()}
            className="px-3 sm:px-4 py-2 rounded-xl bg-[#B86B77] hover:bg-[#9E5460] text-white text-[10px] sm:text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Movimentar</span>
          </button>

          <button
            onClick={() => setEditingMaterial({ id: 'new' } as any)}
            className="px-3 sm:px-4 py-2 rounded-xl bg-white dark:bg-[#2B2D31] border border-[#B86B77] text-[#B86B77] text-[10px] sm:text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Insumo</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs - Scrollable on mobile */}
      <div className="flex border-b border-[#E0D5C8] space-x-4 sm:space-x-6 text-[11px] sm:text-sm font-semibold text-[#6B5557] overflow-x-auto scrollbar-none pb-px">
        <button
          onClick={() => setActiveTab('materials')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'materials'
              ? 'border-[#B86B77] text-[#B86B77]'
              : 'border-transparent text-[#7A6466] hover:text-[#352527] dark:hover:text-[#FFFFFF] dark:text-[#FFFFFF]'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Catálogo ({materials.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('expirations')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer relative whitespace-nowrap ${
            activeTab === 'expirations'
              ? 'border-[#B86B77] text-[#B86B77]'
              : 'border-transparent text-[#7A6466] hover:text-[#352527] dark:hover:text-[#FFFFFF] dark:text-[#FFFFFF]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Controle de Validades (Insumos NF-e)</span>
          {(expiredBatchesCount > 0 || warning15BatchesCount > 0 || warning30BatchesCount > 0) && (
            <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-bold">
              {expiredBatchesCount + warning15BatchesCount + warning30BatchesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('production_batches')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer relative ${
            activeTab === 'production_batches'
              ? 'border-[#B86B77] text-[#B86B77]'
              : 'border-transparent text-[#7A6466] hover:text-[#352527] dark:hover:text-[#FFFFFF] dark:text-[#FFFFFF]'
          }`}
        >
          <Flame className="w-4 h-4 text-[#B86B77]" />
          <span>Relatório de Estoque da Produção ({dailyProductions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'border-[#B86B77] text-[#B86B77]'
              : 'border-transparent text-[#7A6466] hover:text-[#352527] dark:hover:text-[#FFFFFF] dark:text-[#FFFFFF]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Histórico de Movimentações ({stockMovements.length})</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        
        {/* Total Valuation */}
        <div className="p-4 bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#EBE1D7] dark:border-[#3F4147] shadow-2xs space-y-1">
          <div className="text-xs font-semibold text-[#7A6466]">
            Imobilizado Insumos
          </div>
          <div className="font-serif-brand text-xl font-bold text-[#352527] dark:text-[#FFFFFF]">
            R$ {totalInventoryValue.toFixed(2)}
          </div>
          <div className="text-[11px] text-[#8C7678]">
            Total estocado
          </div>
        </div>

        {/* Critical items */}
        <div className="p-4 bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#EBE1D7] dark:border-[#3F4147] shadow-2xs space-y-1">
          <div className="text-xs font-semibold text-[#7A6466] dark:text-[#B5BAC1] flex items-center justify-between">
            <span>Estoque Crítico</span>
            <AlertTriangle className={`w-4 h-4 ${criticalItems.length > 0 ? 'text-amber-600' : 'text-stone-300'}`} />
          </div>
          <div className={`font-serif-brand text-xl font-bold ${criticalItems.length > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-[#352527] dark:text-[#FFFFFF]'}`}>
            {criticalItems.length} insumos
          </div>
          <div className="text-[11px] text-[#8C7678] dark:text-[#B5BAC1]">
            Abaixo do mínimo
          </div>
        </div>

        {/* Próximo Vencimento (≤ 5 dias) - Alerta Amarelo */}
        <div className="p-4 bg-yellow-50/90 dark:bg-yellow-950/40 rounded-2xl border border-yellow-400 dark:border-yellow-700/50 shadow-2xs space-y-1">
          <div className="text-xs font-semibold text-yellow-950 dark:text-yellow-200 flex items-center justify-between">
            <span>Próximo Vencimento</span>
            <AlertTriangle className={`w-4 h-4 ${warning5BatchesCount > 0 ? 'text-yellow-600' : 'text-stone-300'}`} />
          </div>
          <div className={`font-serif-brand text-xl font-bold ${warning5BatchesCount > 0 ? 'text-yellow-900 dark:text-yellow-300' : 'text-stone-400'}`}>
            {warning5BatchesCount} lotes
          </div>
          <div className="text-[11px] text-yellow-800 dark:text-yellow-300 font-bold">
            Vencem em até 5 dias (FEFO)
          </div>
        </div>

        {/* 15 a 30 Dias */}
        <div className="p-4 bg-amber-50/70 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800/40 shadow-2xs space-y-1">
          <div className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center justify-between">
            <span>Atenção 6-30 Dias</span>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="font-serif-brand text-xl font-bold text-amber-800 dark:text-amber-400">
            {warning15BatchesCount + warning30BatchesCount} lotes
          </div>
          <div className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
            Acompanhamento preventivo
          </div>
        </div>

        {/* Expired Batches - Alerta Vermelho */}
        <div className="p-4 bg-rose-50/90 dark:bg-rose-950/40 rounded-2xl border border-rose-300 dark:border-rose-800/40 shadow-2xs space-y-1">
          <div className="text-xs font-semibold text-rose-950 dark:text-rose-200 flex items-center justify-between">
            <span>Lotes Vencidos</span>
            <AlertCircle className={`w-4 h-4 ${expiredBatchesCount > 0 ? 'text-rose-600' : 'text-stone-300'}`} />
          </div>
          <div className={`font-serif-brand text-xl font-bold ${expiredBatchesCount > 0 ? 'text-rose-700' : 'text-stone-400'}`}>
            {expiredBatchesCount} lotes
          </div>
          <div className="text-[11px] text-rose-700 dark:text-rose-300 font-medium">
            Descarte imediato
          </div>
        </div>

      </div>

      {/* VIEW TAB 1: MATERIALS */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          {/* Critical alert banner if items are low */}
          {alertItems.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-300 text-xs shadow-2xs">
              <div className="font-bold flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Aviso: Você precisa conferir a reposição de insumos</span>
                </div>
                {alertItems.length > 1 && (
                  <button
                    onClick={() => {
                      alertItems.forEach(item => dismissCriticalWarning(item.id));
                    }}
                    className="px-2 py-1 bg-amber-200/50 hover:bg-amber-300/50 dark:bg-amber-800/50 dark:hover:bg-amber-700/50 rounded text-[10px] uppercase tracking-wider font-bold text-amber-800 dark:text-amber-300 transition-colors cursor-pointer"
                  >
                    Ocultar Todos
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {(alertItems || []).map(c => c && (
                  <div key={c.id} className="flex items-center justify-between bg-amber-100/50 dark:bg-amber-900/30 px-3 py-2 rounded-lg border border-amber-200/50 dark:border-amber-700/30">
                    <span className="text-amber-800 dark:text-amber-300/90">
                      <strong>{c.name}</strong> atingiu nível crítico ({c.currentStock} {c.unit} restantes - mín: {c.minStock} {c.unit})
                    </span>
                    <button
                      onClick={() => dismissCriticalWarning(c.id)}
                      title="Estou ciente"
                      className="p-1.5 hover:bg-amber-200/50 dark:hover:bg-amber-800/50 rounded-md text-amber-700 dark:text-amber-400 transition-colors cursor-pointer shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter and Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#FAF7F2] dark:bg-[#1E1F22] p-3 rounded-xl border border-[#E8DFD5] dark:border-[#3F4147]">
            <div className="w-full sm:w-80 relative">
              <Search className="w-4 h-4 text-[#9E898B] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filtrar por nome ou código..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-white dark:bg-[#1E1F22] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs w-full sm:w-auto overflow-x-auto scrollbar-none pb-0.5">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-[#594446] text-white'
                    : 'bg-white text-[#5E484B] border border-[#E0D3C5]'
                }`}
              >
                Todos ({materials.length})
              </button>
              <button
                onClick={() => setFilterType('critical')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  filterType === 'critical'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white dark:bg-[#1E1F22] text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                }`}
              >
                Atenção / Críticos ({criticalItems.length})
              </button>
              <button
                onClick={() => setFilterType('healthy')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  filterType === 'healthy'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-white dark:bg-[#1E1F22] text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                }`}
              >
                Saudáveis ({materials.length - criticalItems.length})
              </button>
            </div>
          </div>

          {/* Materials List View */}
          <div className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] overflow-hidden shadow-2xs">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
               <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] dark:bg-[#1E1F22] border-b border-[#E8DFD5] dark:border-[#3F4147] text-[#7A6466] dark:text-[#B5BAC1] font-semibold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5 w-10 text-center select-none">
                      <input 
                        type="checkbox" 
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        className="rounded border-stone-300 text-[#B86B77] focus:ring-[#B86B77] cursor-pointer"
                        title="Selecionar todos visíveis"
                      />
                    </th>
                    <th onClick={() => handleSort('name')} className="p-3.5 cursor-pointer hover:bg-[#F0E6D8] dark:hover:bg-[#25262B] transition-colors select-none">
                      <div className="flex items-center gap-1.5">
                        <span>Código / Material</span>
                        {sortField === 'name' && (sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#B86B77]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#B86B77]" />)}
                        {sortField !== 'name' && <ArrowUpDown className="w-3 h-3 text-[#9E898B]" />}
                      </div>
                    </th>
                    <th onClick={() => handleSort('category')} className="p-3.5 cursor-pointer hover:bg-[#F0E6D8] dark:hover:bg-[#25262B] transition-colors select-none">
                      <div className="flex items-center gap-1.5">
                        <span>Categoria</span>
                        {sortField === 'category' && (sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#B86B77]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#B86B77]" />)}
                        {sortField !== 'category' && <ArrowUpDown className="w-3 h-3 text-[#9E898B]" />}
                      </div>
                    </th>
                    <th onClick={() => handleSort('currentStock')} className="p-3.5 cursor-pointer hover:bg-[#F0E6D8] dark:hover:bg-[#25262B] transition-colors select-none text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Estoque Atual</span>
                        {sortField === 'currentStock' && (sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#B86B77]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#B86B77]" />)}
                        {sortField !== 'currentStock' && <ArrowUpDown className="w-3 h-3 text-[#9E898B]" />}
                      </div>
                    </th>
                    <th onClick={() => handleSort('minStock')} className="p-3.5 cursor-pointer hover:bg-[#F0E6D8] dark:hover:bg-[#25262B] transition-colors select-none text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Mínimo de Segurança</span>
                        {sortField === 'minStock' && (sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#B86B77]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#B86B77]" />)}
                        {sortField !== 'minStock' && <ArrowUpDown className="w-3 h-3 text-[#9E898B]" />}
                      </div>
                    </th>
                    <th onClick={() => handleSort('totalVal')} className="p-3.5 cursor-pointer hover:bg-[#F0E6D8] dark:hover:bg-[#25262B] transition-colors select-none text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Valor em Estoque</span>
                        {sortField === 'totalVal' && (sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#B86B77]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#B86B77]" />)}
                        {sortField !== 'totalVal' && <ArrowUpDown className="w-3 h-3 text-[#9E898B]" />}
                      </div>
                    </th>
                    <th onClick={() => handleSort('status')} className="p-3.5 cursor-pointer hover:bg-[#F0E6D8] dark:hover:bg-[#25262B] transition-colors select-none text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Status</span>
                        {sortField === 'status' && (sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#B86B77]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#B86B77]" />)}
                        {sortField !== 'status' && <ArrowUpDown className="w-3 h-3 text-[#9E898B]" />}
                      </div>
                    </th>
                    <th className="p-3.5 text-center w-28 select-none">Movimentar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0E8DF]">
                  {sortedMaterials.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-xs text-[#8C7678]">
                        Nenhum insumo ou material cadastrado no momento. Cadastre materiais ou importe notas fiscais para alimentar o estoque.
                      </td>
                    </tr>
                  ) : (
                    sortedMaterials.map(m => {
                      const isCritical = (m.currentStock ?? 0) <= (m.minStock ?? 0);
                      const unitCost = m.currentCostPerUnit ?? m.costPerUnit ?? 0;
                      const totalVal = (m.currentStock ?? 0) * unitCost;
                      const isSelected = selectedMaterialIds.includes(m.id);

                      // Calculate pack count if packageSize exists and is valid
                      const showPacks = m.packageSize && m.packageSize > 1 && (m.unit === 'ml' || m.unit === 'g' || m.unit === 'un');
                      const packCount = showPacks ? (m.currentStock / (m.packageSize || 1)).toFixed(1) : null;

                      return (
                        <tr key={m.id} className="hover:bg-[#FAF7F2] dark:hover:bg-[#35373C] transition-colors border-b border-[#F0E8DF] dark:border-[#3F4147]">
                          <td className="p-3.5 text-center" onClick={e => e.stopPropagation()}>
                            <input 
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(m.id)}
                              className="rounded border-stone-300 text-[#B86B77] focus:ring-[#B86B77] cursor-pointer"
                            />
                          </td>
                          <td className="p-3.5">
                            <span className="font-mono text-[10px] font-bold text-[#7A5A40] block">{m.code}</span>
                            <div className="flex items-center gap-2">
                              <strong className="text-[#352527] dark:text-[#FFFFFF] text-sm">{m.name}</strong>
                              {isCritical && (
                                <span title="Estoque abaixo do mínimo!">
                                  <AlertTriangle className="w-4 h-4 text-amber-600 animate-pulse" />
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-3.5 text-[#6E595B]">
                            {m.category}
                          </td>

                          <td className="p-3.5 text-center font-mono font-bold text-sm text-[#352527] dark:text-[#FFFFFF]">
                            <div>
                              {formatQuantity(m.currentStock || 0, m.unit)}
                            </div>
                            {showPacks && (
                              <div className="text-[10px] text-[#8C7678] font-normal mt-0.5">
                                ({packCount} un)
                              </div>
                            )}
                          </td>

                          <td className="p-3.5 text-center font-mono text-[#7A6466]">
                            {formatQuantity(m.minStock || 0, m.unit)}
                          </td>

                          <td className="p-3.5 text-right font-mono font-bold text-[#352527] dark:text-[#FFFFFF]">
                            R$ {(totalVal || 0).toFixed(2)}
                          </td>

                          <td className="p-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isCritical
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}>
                              {isCritical ? '⚠️ Estoque Crítico' : '✓ Nível Seguro'}
                            </span>
                          </td>

                          <td className="p-3.5 text-center">
                            <div className="flex flex-col gap-1 items-center">
                              <button
                                onClick={() => handleOpenMovement(m.id)}
                                className="w-full px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#FAF0F2] dark:bg-[#1E1F22] text-[#B86B77] dark:text-[#B5BAC1] hover:bg-[#B86B77] hover:text-white dark:hover:bg-[#B86B77] border border-[#DACDC0] dark:border-[#3F4147] transition-colors cursor-pointer whitespace-nowrap"
                              >
                                Lançar Saída
                              </button>
                              <div className="flex gap-1 w-full">
                                <button
                                  onClick={() => handleOpenWaste(m.id)}
                                  className="flex-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer whitespace-nowrap"
                                >
                                  Perda
                                </button>
                                <button
                                  onClick={() => setEditingMaterial(m)}
                                  className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 border border-stone-200 dark:border-stone-700 transition-colors cursor-pointer"
                                  title="Editar Insumo"
                                >
                                  <Settings className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden divide-y divide-stone-100 dark:divide-[#3F4147]">
              {sortedMaterials.length === 0 ? (
                <div className="p-8 text-center text-[#8C7678] text-xs">Nenhum insumo encontrado no catálogo.</div>
              ) : (
                sortedMaterials.map(m => {
                  const isCritical = (m.currentStock ?? 0) <= (m.minStock ?? 0);
                  const isSelected = selectedMaterialIds.includes(m.id);
                  const unitCost = m.currentCostPerUnit ?? m.costPerUnit ?? 0;
                  const totalVal = (m.currentStock ?? 0) * unitCost;
                  
                  return (
                    <div key={m.id} className="p-4 space-y-3 bg-white dark:bg-[#2B2D31]">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(m.id)}
                            className="mt-1 rounded border-stone-300 text-[#B86B77] focus:ring-[#B86B77] w-4 h-4"
                          />
                          <div>
                            <div className="text-[10px] font-mono text-[#7A6466] dark:text-[#B5BAC1] font-bold">{m.code}</div>
                            <h4 className="text-sm font-bold text-[#352527] dark:text-white leading-tight">{m.name}</h4>
                            <div className="text-[10px] text-stone-500">{m.category}</div>
                          </div>
                        </div>
                        {isCritical && <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="p-2 rounded-xl bg-[#FAF7F2] dark:bg-[#1E1F22] border border-[#E8DFD5] dark:border-[#3F4147]">
                          <div className="text-[9px] text-[#7A6466] uppercase font-bold tracking-tight">Estoque</div>
                          <div className="text-xs font-mono font-bold text-[#352527] dark:text-white">{formatQuantity(m.currentStock || 0, m.unit)}</div>
                        </div>
                        <div className="p-2 rounded-xl bg-[#FAF7F2] dark:bg-[#1E1F22] border border-[#E8DFD5] dark:border-[#3F4147]">
                          <div className="text-[9px] text-[#7A6466] uppercase font-bold tracking-tight">Valor Total</div>
                          <div className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">R$ {totalVal.toFixed(2)}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-50 dark:border-[#3F4147] mt-1">
                         <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          isCritical ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}>
                          {isCritical ? '⚠️ Crítico' : '✓ Seguro'}
                        </span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleOpenMovement(m.id)} 
                            className="px-3 py-1.5 bg-[#FAF0F2] text-[#B86B77] text-[10px] font-bold rounded-lg border border-[#DACDC0] active:scale-95 transition-transform"
                          >
                            Saída
                          </button>
                          <button 
                            onClick={() => handleOpenWaste(m.id)} 
                            className="px-3 py-1.5 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-lg border border-rose-200 active:scale-95 transition-transform"
                          >
                            Perda
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

          {/* Floating Action Bar for Bulk Edit */}
          {selectedMaterialIds.length > 0 && (
            <div className="sticky bottom-4 z-40 bg-[#352527] text-white p-3 rounded-2xl shadow-xl flex items-center justify-between max-w-xl mx-auto px-6 border border-[#B86B77]/40 animate-fadeIn">
              <div className="flex items-center gap-2 text-xs">
                <span className="bg-[#B86B77] text-white font-bold px-2 py-0.5 rounded-full">{selectedMaterialIds.length}</span>
                <span>insumos selecionados</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsBulkEditModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#B86B77] hover:bg-[#9E5460] text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Editar em Lote (Preço / Categoria)
                </button>
                <button
                  onClick={() => setSelectedMaterialIds([])}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs transition-colors cursor-pointer"
                >
                  Limpar
                </button>
              </div>
            </div>
          )}

          {/* Bulk Edit Modal */}
          {isBulkEditModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-stone-200 dark:border-[#3F4147] shadow-2xl w-full max-w-md p-6 space-y-5">
                <div className="flex items-center justify-between border-b dark:border-[#3F4147] pb-3">
                  <h3 className="font-serif-brand text-lg font-bold text-[#352527] dark:text-white">
                    Edição em Lote ({selectedMaterialIds.length} insumos)
                  </h3>
                  <button onClick={() => setIsBulkEditModalOpen(false)} className="text-stone-400 hover:text-stone-600 dark:hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[#7A6466] dark:text-[#B5BAC1] font-semibold mb-1">Ação de Atualização</label>
                    <select
                      value={bulkEditAction}
                      onChange={e => setBulkEditAction(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-[#3F4147] bg-[#FAF7F2] dark:bg-[#1E1F22] text-[#352527] dark:text-white font-medium"
                    >
                      <option value="category">Atualizar Categoria</option>
                      <option value="percentage">Ajustar Preço por Percentual (%)</option>
                      <option value="fixed">Definir Preço Custo Fixo (R$)</option>
                    </select>
                  </div>

                  {bulkEditAction === 'category' && (
                    <div className="space-y-2">
                      <label className="block text-[#7A6466] dark:text-[#B5BAC1] font-semibold">Nova Categoria</label>
                      <input
                        type="text"
                        placeholder="Ex: Farinhas, Laticínios, Embalagens..."
                        value={bulkCategory}
                        onChange={e => setBulkCategory(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-[#3F4147] bg-[#FAF7F2] dark:bg-[#1E1F22] text-[#352527] dark:text-white"
                      />
                      {existingCategories.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          <span className="text-[10px] text-stone-400 w-full">Categorias existentes:</span>
                          {existingCategories.map(cat => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setBulkCategory(cat)}
                              className="px-2 py-1 rounded bg-stone-100 dark:bg-[#1E1F22] dark:text-[#B5BAC1] text-[10px] hover:bg-[#B86B77] hover:text-white transition-colors"
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {bulkEditAction === 'percentage' && (
                    <div className="space-y-2">
                      <label className="block text-[#7A6466] dark:text-[#B5BAC1] font-semibold">Percentual de Ajuste (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Ex: 10 para +10% ou -5 para -5%"
                        value={bulkPercentageValue}
                        onChange={e => setBulkPercentageValue(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-[#3F4147] bg-[#FAF7F2] dark:bg-[#1E1F22] text-[#352527] dark:text-white font-mono"
                      />
                      <p className="text-[11px] text-stone-500">Valores positivos aumentam o custo (ex: 10 = +10%), valores negativos reduzem (ex: -5 = -5%).</p>
                    </div>
                  )}

                  {bulkEditAction === 'fixed' && (
                    <div className="space-y-2">
                      <label className="block text-[#7A6466] dark:text-[#B5BAC1] font-semibold">Novo Custo Unitário (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ex: 15.50"
                        value={bulkPriceValue}
                        onChange={e => setBulkPriceValue(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-[#3F4147] bg-[#FAF7F2] dark:bg-[#1E1F22] text-[#352527] dark:text-white font-mono"
                      />
                      <p className="text-[11px] text-stone-500">Define este custo exato para todos os insumos selecionados.</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t dark:border-[#3F4147]">
                  <button
                    onClick={() => setIsBulkEditModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl border dark:border-[#3F4147] text-stone-600 dark:text-stone-300 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleApplyBulkEdit}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-[#B86B77] text-white hover:bg-[#9E5460] cursor-pointer"
                  >
                    Aplicar Atualização
                  </button>
                </div>
              </div>
            </div>
          )}

      {/* VIEW TAB 2: EXPIRATIONS / LOTES DE NF-E */}
      {activeTab === 'expirations' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#FAF7F2] dark:bg-[#1E1F22] p-3 rounded-xl border border-[#E8DFD5] dark:border-[#3F4147]">
            <div className="w-full sm:w-80 relative">
              <Search className="w-4 h-4 text-[#9E898B] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por lote, produto ou NF-e..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-white dark:bg-[#1E1F22] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 px-3 py-1.5 rounded-lg">
              <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span><strong>Consumo Automático FEFO:</strong> O lote com vencimento mais próximo é consumido primeiro nas baixas de vendas e produção.</span>
            </div>
          </div>

          {filteredBatches.length === 0 ? (
          <div className="bg-white dark:bg-[#2B2D31] p-8 rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] text-center space-y-2">
              <Calendar className="w-8 h-8 text-[#B86B77] mx-auto" />
              <h3 className="font-serif-brand text-base font-bold text-[#352527] dark:text-[#FFFFFF]">Nenhum Lote de NF-e Registrado</h3>
              <p className="text-xs text-[#7A6466] max-w-md mx-auto">
                Ao registrar novas Compras via Nota Fiscal (NF-e), os lotes com datas de validade aparecerão nesta tela para acompanhamento preventivo.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF7F2] dark:bg-[#1E1F22] border-b border-[#E8DFD5] dark:border-[#3F4147] text-[#7A6466] dark:text-[#B5BAC1] font-semibold text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">Insumo / Lote NF-e</th>
                      <th className="p-3.5">Fornecedor</th>
                      <th className="p-3.5 text-center">Quantidade Atual</th>
                      <th className="p-3.5 text-center">Data Entrada</th>
                      <th className="p-3.5 text-center">Data Validade</th>
                      <th className="p-3.5 text-center">Situação / Prazo</th>
                      <th className="p-3.5 text-center w-24">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0E8DF]">
                    {filteredBatches.map(batch => (
                      <tr key={batch.id} className="hover:bg-[#FAF7F2] dark:hover:bg-[#35373C] transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-[#352527] dark:text-[#FFFFFF]">{batch.materialName}</div>
                          <div className="flex items-center gap-2 text-[11px] text-[#7A6466] dark:text-[#B5BAC1] mt-0.5">
                            {batch.materialCode && (
                              <span className="font-mono bg-stone-100 dark:bg-[#1E1F22] px-1.5 py-0.5 rounded text-[10px] text-stone-700 dark:text-stone-300 border dark:border-[#3F4147]">
                                {batch.materialCode}
                              </span>
                            )}
                            {batch.invoiceNumber && (
                              <span className="text-amber-800 dark:text-amber-300 font-semibold bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1">
                                <FileText className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                                {batch.invoiceNumber}
                              </span>
                            )}
                          </div>
                          {batch.isFefoNext && (
                            <div className="mt-1.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-xs inline-flex items-center gap-1">
                                <Zap className="w-3 h-3 fill-amber-200" /> 1º da Fila FEFO (Próximo a Sair)
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="p-3.5 text-[#594446] dark:text-[#B5BAC1]">
                          {batch.supplier || 'Distribuidor'}
                        </td>

                        <td className="p-3.5 text-center font-mono font-bold text-sm text-[#352527] dark:text-[#FFFFFF]">
                          {formatQuantity(batch.quantityRemaining, batch.unit)}
                        </td>

                        <td className="p-3.5 text-center text-[#7A6466]">
                          {batch.purchaseDate ? new Date(batch.purchaseDate + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                        </td>

                        <td className="p-3.5 text-center font-bold">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-mono inline-flex items-center gap-1 ${
                            batch.status === 'expired' ? 'bg-rose-100 text-rose-900 border border-rose-400 font-bold' :
                            batch.status === 'warning_5' ? 'bg-yellow-100 text-yellow-950 border border-yellow-400 font-bold' :
                            batch.status === 'warning_15' ? 'bg-orange-100 text-orange-900 border border-orange-300 font-bold' :
                            batch.status === 'warning_30' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                            batch.status === 'exhausted' ? 'bg-stone-100 text-stone-600 border border-stone-200' :
                            'bg-emerald-50 text-emerald-900 border border-emerald-200'
                          }`}>
                            <Calendar className="w-3.5 h-3.5" />
                            {batch.expirationDate ? new Date(batch.expirationDate + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                          </span>
                        </td>

                        <td className="p-3.5 text-center">
                          {batch.status === 'expired' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-400 dark:border-rose-700 inline-flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-rose-600" /> 🚨 Vencido há {Math.abs(batch.diffDays)} dia(s)
                            </span>
                          )}
                          {batch.status === 'warning_5' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-yellow-100 dark:bg-yellow-950/60 text-yellow-950 dark:text-yellow-200 border border-yellow-400 dark:border-yellow-600 inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-yellow-600" /> ⚠️ Vence em {batch.diffDays} dia(s) (Próximo Vencimento)
                            </span>
                          )}
                          {batch.status === 'warning_15' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-950/50 text-orange-950 dark:text-orange-200 border border-orange-300 dark:border-orange-700">
                              ⚡ Vence em {batch.diffDays} dia(s)
                            </span>
                          )}
                          {batch.status === 'warning_30' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                              ⚡ Vence em {batch.diffDays} dia(s)
                            </span>
                          )}
                          {batch.status === 'exhausted' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700">
                              ✓ Esgotado / Baixado
                            </span>
                          )}
                          {batch.status === 'valid' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              ✓ Válido ({batch.diffDays} dias restantes)
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditBatch(batch)}
                              className="p-1.5 text-stone-500 dark:text-[#B5BAC1] hover:text-[#B86B77] hover:bg-[#FAF0F2] dark:hover:bg-[#382B2E] rounded-lg transition-colors cursor-pointer"
                              title="Editar lote de validade"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingBatchId(batch.id)}
                              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Excluir lote"
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
          )}
        </div>
      )}

      {/* VIEW TAB 3: PRODUCTION BATCHES & EXPIRATION REPORT */}
      {activeTab === 'production_batches' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8DFD5]">
              <div>
                <h3 className="font-serif-brand text-lg font-bold text-[#352527] dark:text-[#FFFFFF] flex items-center gap-2">
                  <Flame className="w-5 h-5 text-[#B86B77]" />
                  <span>Relatório de Estoque da Produção do Dia (Pronta Entrega)</span>
                </h3>
                <p className="text-xs text-[#7A6466]">
                  Acompanhe em tempo real o horário das fornadas, número dos lotes e datas de validade salvas no banco de dados.
                </p>
              </div>

              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 bg-[#352527] text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Relatório</span>
              </button>
            </div>

            {dailyProductions.length === 0 ? (
              <div className="p-12 text-center">
                <Flame className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                <h4 className="font-bold text-[#352527] dark:text-[#FFFFFF] text-sm mb-1">Nenhuma fornada registrada ainda</h4>
                <p className="text-xs text-[#7A6466] max-w-sm mx-auto">
                  Cadastre as fornadas na aba "Produção do Dia" para visualizar o controle de lote e validade do estoque aqui.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#EBE1D7] dark:border-[#3F4147] bg-[#F9F6F0] dark:bg-[#1E1F22] text-[11px] font-bold text-[#7A6466] dark:text-[#B5BAC1] uppercase tracking-wider">
                      <th className="py-3 px-4">Produto & Categoria</th>
                      <th className="py-3 px-4">Horário da Fornada</th>
                      <th className="py-3 px-4">Número do Lote</th>
                      <th className="py-3 px-4">Data de Validade</th>
                      <th className="py-3 px-4 text-center">Produzido / Despachado</th>
                      <th className="py-3 px-4 text-center">Saldo em Estoque</th>
                      <th className="py-3 px-4">Responsável</th>
                      <th className="py-3 px-4 text-right">Status do Lote</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2EAE1] text-xs text-[#352527] dark:text-[#FFFFFF]">
                    {dailyProductions.map((prod) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const expDate = prod.expirationDate ? new Date(prod.expirationDate + 'T00:00:00') : null;
                      const diffTime = expDate ? expDate.getTime() - today.getTime() : 99999;
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                      const isExpired = expDate && diffDays < 0;
                      const isNearExp = expDate && diffDays >= 0 && diffDays <= 3;

                      return (
                      <tr key={prod.id} className="hover:bg-[#FAF7F2] dark:hover:bg-[#35373C] transition-colors border-b border-[#F2EAE1] dark:border-[#3F4147]">
                          <td className="py-3.5 px-4 font-bold text-[#352527] dark:text-[#FFFFFF]">
                            <div>{prod.productName}</div>
                            <div className="text-[10px] text-[#8C7678] font-normal">{prod.category || 'Panificação'} • SKU: {prod.sku || '-'}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-semibold text-[#8C7678]">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-[#B86B77]" />
                              <span>{prod.productionTime || '07:00'}</span>
                            </div>
                            <div className="text-[10px] text-[#A08E90]">{prod.date}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-[#352527] dark:text-[#FFFFFF] bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-lg">
                            {prod.batchNumber || '-'}
                          </td>
                          <td className="py-3.5 px-4 font-bold">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-mono inline-flex items-center gap-1 ${
                              isExpired ? 'bg-rose-100 text-rose-900 border border-rose-300' :
                              isNearExp ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                              'bg-emerald-50 text-emerald-900 border border-emerald-200'
                            }`}>
                              <Calendar className="w-3.5 h-3.5" />
                              {prod.expirationDate ? prod.expirationDate.split('-').reverse().join('/') : '-'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-medium">
                            <span className="font-bold text-[#352527] dark:text-[#FFFFFF]">{formatQuantity(prod.quantityProduced, 'un')}</span>
                            <span className="text-[10px] text-blue-700 block">(-{formatQuantity(prod.quantityDispatched, 'un')} despachados)</span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold font-mono text-sm">
                            <span className={`px-2 py-0.5 rounded-md ${
                              prod.quantityRemaining <= 0 ? 'bg-stone-100 text-stone-500 line-through' :
                              prod.quantityRemaining <= 5 ? 'bg-amber-100 text-amber-900' :
                              'bg-emerald-100 text-emerald-900'
                            }`}>
                              {formatQuantity(prod.quantityRemaining, 'un')}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-[#553E41]">
                            {prod.bakerName || 'Mestre Padeiro'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {isExpired ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                                🚨 Vencido
                              </span>
                            ) : isNearExp ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                ⚠️ Vence em {diffDays}d
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                ✓ Ok
                              </span>
                            )}
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

      {/* VIEW TAB 4: STOCK MOVEMENTS HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] overflow-hidden shadow-2xs space-y-3 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8DFD5]">
            <h3 className="font-serif-brand text-lg font-bold text-[#352527] dark:text-[#FFFFFF] flex items-center gap-2">
              <History className="w-5 h-5 text-[#B86B77]" />
              <span>Livro de Movimentações de Estoque</span>
            </h3>
            <span className="text-xs text-[#7A6466]">Auditoria, edições e justificativas de consumo</span>
          </div>

          <div className="space-y-2">
            {stockMovements.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8C7678]">
                Nenhuma movimentação de estoque registrada.
              </div>
            ) : (
              stockMovements.map(sm => {
                const isEntry = sm.type === 'entrada';
                const isLoss = sm.type === 'perda_avaria';

                return (
                    <div key={sm.id} className="p-3 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#EBE1D7] dark:border-[#3F4147] hover:bg-[#F3ECE2] dark:hover:bg-[#35373C] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          isEntry ? 'bg-emerald-100 text-emerald-800' :
                          isLoss ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {sm.type === 'entrada' ? '📥 Entrada' :
                           sm.type === 'perda_avaria' ? '⚠️ Perda / Avaria' :
                           sm.type === 'ajuste' ? '🔄 Ajuste' : '🥣 Saída Forno'}
                        </span>
                        <strong className="text-[#352527] dark:text-[#FFFFFF]">{sm.materialName}</strong>
                        <span className="font-mono font-bold text-[#352527] dark:text-[#FFFFFF]">
                          ({isEntry ? '+' : '-'}{sm.quantity} {sm.unit})
                        </span>
                      </div>
                      <div className="text-[#6E595B]">
                        Motivo: <span className="italic">{sm.reason}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-left sm:text-right text-[11px] text-[#8C7678] shrink-0">
                        <div>{sm.date}</div>
                        <div className="font-medium text-[#553E41]">Por: {sm.responsible}</div>
                      </div>

                      <div className="flex items-center gap-1 border-l border-[#E5DACF] pl-3 shrink-0">
                        <button
                          onClick={() => handleOpenEditMovement(sm)}
                          className="p-1.5 text-stone-500 hover:text-[#B86B77] hover:bg-[#FAF0F2] rounded-lg transition-colors cursor-pointer"
                          title="Editar movimentação"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingMovementId(sm.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Excluir registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Edit Batch Modal */}
      {editingBatch && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-2xl border border-[#E5DACF] dark:border-[#3F4147] shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EBE1D7] dark:border-[#3F4147] flex items-center justify-between bg-[#F4EFEA] dark:bg-[#2B2D31]">
              <div>
                <h3 className="font-serif-brand text-base font-bold text-[#352527] dark:text-[#FFFFFF]">
                  Editar Lote de Validade / NF-e
                </h3>
                <span className="text-[11px] text-[#7A6466] font-mono">{editingBatch.materialName}</span>
              </div>
              <button
                onClick={() => setEditingBatch(null)}
                className="text-stone-400 hover:text-stone-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBatch} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#543E40] mb-1">Insumo / Produto *</label>
                <input
                  type="text"
                  required
                  value={batchMatName}
                  onChange={e => setBatchMatName(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#543E40] mb-1">Nota Fiscal (NF-e)</label>
                  <input
                    type="text"
                    value={batchInvoice}
                    onChange={e => setBatchInvoice(e.target.value)}
                    placeholder="Ex: NF-1082"
                    className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#543E40] mb-1">Fornecedor</label>
                  <input
                    type="text"
                    value={batchSupplier}
                    onChange={e => setBatchSupplier(e.target.value)}
                    placeholder="Ex: Moinho Globo"
                    className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#543E40] mb-1">Qtd. Restante no Lote *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={batchQtyRemaining}
                    onChange={e => setBatchQtyRemaining(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#543E40] mb-1">Unidade de Medida</label>
                  <select
                    value={batchUnit}
                    onChange={e => setBatchUnit(e.target.value as UnitOfMeasure)}
                    className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="l">l</option>
                    <option value="ml">ml</option>
                    <option value="un">un</option>
                    <option value="m">m</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#543E40] mb-1">Data de Entrada *</label>
                  <input
                    type="date"
                    required
                    value={batchReceivedDate}
                    onChange={e => setBatchReceivedDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#543E40] mb-1">Data de Validade *</label>
                  <input
                    type="date"
                    required
                    value={batchExpirationDate}
                    onChange={e => setBatchExpirationDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white font-bold text-amber-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E8DFD5]">
                <button
                  type="button"
                  onClick={() => setEditingBatch(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#DACDC0] bg-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#B86B77] hover:bg-[#9E5460] text-white cursor-pointer"
                >
                  Salvar Lote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Batch Confirmation Modal */}
      {deletingBatchId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-[#E8DFD5] p-6 max-w-sm w-full space-y-4 text-xs shadow-xl">
            <h3 className="font-bold text-sm text-[#352527] dark:text-[#FFFFFF]">Excluir Lote de Validade?</h3>
            <p className="text-[#6E595B]">
              Esta ação removerá este lote do controle de validades e sincronizará com o banco de dados do Supabase.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingBatchId(null)}
                className="px-3 py-1.5 rounded-xl border border-[#DACDC0] bg-white font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteStockBatch(deletingBatchId);
                  setDeletingBatchId(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
              >
                Sim, Excluir Lote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Movement Modal */}
      {editingMovement && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#FAF7F2] rounded-2xl border border-[#E5DACF] shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EBE1D7] flex items-center justify-between bg-[#F4EFEA]">
              <div>
                <h3 className="font-serif-brand text-base font-bold text-[#352527] dark:text-[#FFFFFF]">
                  Editar Movimentação de Estoque
                </h3>
                <span className="text-[11px] text-[#7A6466] font-mono">{editingMovement.materialName}</span>
              </div>
              <button
                onClick={() => setEditingMovement(null)}
                className="text-stone-400 hover:text-stone-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMovement} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#543E40] mb-1">Tipo de Movimentação *</label>
                <select
                  value={movType}
                  onChange={e => setMovType(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white font-bold"
                >
                  <option value="saida_producao">🥣 Saída p/ Produção / Forno</option>
                  <option value="perda_avaria">⚠️ Perda / Avaria / Descarte</option>
                  <option value="entrada">📥 Entrada em Estoque</option>
                  <option value="ajuste">🔄 Ajuste Direto</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#543E40] mb-1">Quantidade *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={movQuantity}
                    onChange={e => setMovQuantity(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#543E40] mb-1">Unidade</label>
                  <select
                    value={movUnit}
                    onChange={e => setMovUnit(e.target.value as UnitOfMeasure)}
                    className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="l">l</option>
                    <option value="ml">ml</option>
                    <option value="un">un</option>
                    <option value="m">m</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#543E40] mb-1">Motivo / Justificativa *</label>
                <input
                  type="text"
                  required
                  value={movReason}
                  onChange={e => setMovReason(e.target.value)}
                  placeholder="Ex: Fornada de Pão de Queijo 50kg"
                  className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#543E40] mb-1">Responsável *</label>
                  <input
                    type="text"
                    required
                    value={movResponsible}
                    onChange={e => setMovResponsible(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#543E40] mb-1">Data / Hora *</label>
                  <input
                    type="text"
                    required
                    value={movDate}
                    onChange={e => setMovDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E8DFD5]">
                <button
                  type="button"
                  onClick={() => setEditingMovement(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#DACDC0] bg-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#B86B77] hover:bg-[#9E5460] text-white cursor-pointer"
                >
                  Salvar Alteração
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Movement Confirmation Modal */}
      {deletingMovementId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-[#E8DFD5] p-6 max-w-sm w-full space-y-4 text-xs shadow-xl">
            <h3 className="font-bold text-sm text-[#352527] dark:text-[#FFFFFF]">Excluir Registros de Movimentação?</h3>
            <p className="text-[#6E595B]">
              Esta ação removerá este lançamento do histórico de movimentações e sincronizará com o Supabase.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingMovementId(null)}
                className="px-3 py-1.5 rounded-xl border border-[#DACDC0] bg-white font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteStockMovement(deletingMovementId);
                  setDeletingMovementId(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
              >
                Sim, Excluir Registro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Movement Modals */}
      <StockMovementModal
        isOpen={isMovementModalOpen}
        onClose={() => {
          setIsMovementModalOpen(false);
          setPreselectedMaterialId(undefined);
        }}
        preselectedMaterialId={preselectedMaterialId}
      />

      <WasteRegistrationModal
        isOpen={isWasteModalOpen}
        onClose={() => {
          setIsWasteModalOpen(false);
          setPreselectedMaterialId(undefined);
        }}
        preselectedMaterialId={preselectedMaterialId}
      />

      <MaterialEditModal
        isOpen={!!editingMaterial}
        onClose={() => setEditingMaterial(null)}
        material={editingMaterial}
      />

    </div>
  );
};
