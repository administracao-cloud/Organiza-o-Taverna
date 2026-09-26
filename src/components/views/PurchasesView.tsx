import React, { useState } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { Material, MaterialCategory, UnitOfMeasure, PurchaseRecord, Supplier } from '../../types';
import { 
  Plus, 
  Search, 
  Wheat, 
  Receipt, 
  Layers, 
  AlertCircle, 
  Truck, 
  Sparkles, 
  Edit2,
  Trash2,
  Calendar,
  ChevronDown,
  ChevronRight,
  FileText
} from 'lucide-react';

interface PurchasesViewProps {
  onOpenNewPurchase: () => void;
  onEditPurchase: (p: PurchaseRecord) => void;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({ onOpenNewPurchase, onEditPurchase }) => {
  const { 
    materials, 
    purchases, 
    addMaterial, 
    updateMaterial, 
    deleteMaterial, 
    updatePurchase, 
    deletePurchase,
    materialCategories,
    addMaterialCategory,
    updateMaterialCategory,
    deleteMaterialCategory,
    suppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    refreshData
  } = useBakery();

  const [activeTab, setActiveTab] = useState<'materials' | 'history'>('materials');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Material Modal State
  const [showNewMaterialModal, setShowNewMaterialModal] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showSupplierManager, setShowSupplierManager] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  // Effect to refresh suppliers when modals are opened
  React.useEffect(() => {
    if (showNewMaterialModal || showSupplierManager) {
      refreshData();
    }
  }, [showNewMaterialModal, showSupplierManager, refreshData]);

  const [calcPackPrice, setCalcPackPrice] = useState<number>(0);
  const [calcPackQty, setCalcPackQty] = useState<number>(1);

  const handleCalcCost = () => {
    if (calcPackQty > 0) {
      const unitCost = calcPackPrice / calcPackQty;
      setMatCostPerUnit(Number(unitCost.toFixed(2)));
      setMatSize(calcPackQty);
      setMatLastPackagePrice(calcPackPrice);
    }
  };

  const [matCode, setMatCode] = useState('');
  const [matName, setMatName] = useState('');
  const [matCategory, setMatCategory] = useState<string>('Farinhas & Grãos');
  const [matUnit, setMatUnit] = useState<UnitOfMeasure>('kg');
  const [matSupplier, setMatSupplier] = useState('');
  const [matSupplierContact, setMatSupplierContact] = useState('');
  const [matSize, setMatSize] = useState<number | ''>(1);
  const [matLastPackagePrice, setMatLastPackagePrice] = useState<number | ''>(0);
  const [matSizeUnit, setMatSizeUnit] = useState<UnitOfMeasure>('kg');
  const [matCostPerUnit, setMatCostPerUnit] = useState<number | ''>(10);
  const [matCurrentStock, setMatCurrentStock] = useState<number | ''>(10);
  const [matMinStock, setMatMinStock] = useState<number | ''>(2);

  // Delete Confirm Modal State
  const [deletingMatId, setDeletingMatId] = useState<string | null>(null);
  const [deletingPurId, setDeletingPurId] = useState<string | null>(null);

  const categories = ['all', ...materialCategories];

  // Material Handlers
  const filteredMaterials = materials.filter(m => {
    const supplierStr = m?.supplier || m?.defaultSupplier || '';
    const matchesSearch = 
      (m?.name?.toLowerCase()?.includes(search.toLowerCase()) || false) ||
      (m?.code?.toLowerCase()?.includes(search.toLowerCase()) || false) ||
      (supplierStr.toLowerCase().includes(search.toLowerCase()) || false);
    const matchesCat = selectedCategory === 'all' || m.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleOpenNewMat = () => {
    setEditingMaterial(null);
    setMatCode(`INS-${Date.now().toString().slice(-6)}`);
    setMatName('');
    setMatCategory(materialCategories?.[0] || 'Farinhas & Grãos');
    setMatUnit('kg');
    setMatSupplier('Moinho Paulista');
    setMatSupplierContact('(11) 98000-1122');
    setMatSize(1);
    setMatSizeUnit('kg');
    setMatCostPerUnit(15.00);
    setMatCurrentStock(10);
    setMatMinStock(3);
    setShowNewMaterialModal(true);
  };

  const handleEditMat = (m: Material) => {
    setEditingMaterial(m);
    setMatCode(m.code);
    setMatName(m.name);
    setMatCategory(m.category);
    setMatUnit(m.unit);
    setMatSupplier(m.supplier || m.defaultSupplier || '');
    setMatSupplierContact(m.supplierContact || '');
    setMatSize(m.size || m.packageSize || 1);
    setMatLastPackagePrice(m.lastPackagePrice || 0);
    setMatSizeUnit(m.sizeUnit || m.unit);
    setMatCostPerUnit((m.currentCostPerUnit ?? m.costPerUnit ?? 0) * (m.packageSize || 1));
    setMatCurrentStock(m.currentStock ?? 0);
    setMatMinStock(m.minStock ?? 0);
    setShowNewMaterialModal(true);
  };

  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matName.trim() || !matCode.trim()) return;

    const sizeValue = Number(matSize) || 1;
    const rawCost = Number(matCostPerUnit) || 0;
    const pkgPrice = Number(matLastPackagePrice) || 0;
    const curStock = Number(matCurrentStock) || 0;
    const minStock = Number(matMinStock) || 0;

    // Calculate packageSize factor based on units
    let factor = 1;
    if (matSizeUnit === 'kg' && matUnit === 'g') factor = 1000;
    if (matSizeUnit === 'g' && matUnit === 'kg') factor = 0.001;
    if (matSizeUnit === 'l' && matUnit === 'ml') factor = 1000;
    if (matSizeUnit === 'ml' && matUnit === 'l') factor = 0.001;
    
    const pkgSize = sizeValue * factor;

    // Normalize cost to be per base unit (currentCostPerUnit)
    const normalizedCost = pkgSize > 0 ? rawCost / pkgSize : rawCost;

    let divisor = 1;
    if (matUnit === 'kg' || matUnit === 'l') divisor = 1000;
    const costPerGram = normalizedCost / divisor;

    const data = {
      code: matCode,
      name: matName,
      category: matCategory,
      unit: matUnit,
      size: sizeValue,
      sizeUnit: matSizeUnit,
      packageSize: pkgSize,
      lastPackagePrice: pkgPrice,
      currentCostPerUnit: Number(normalizedCost.toFixed(2)),
      costPerUnit: Number(normalizedCost.toFixed(2)),
      costPerGram: Number(costPerGram.toFixed(6)),
      currentStock: curStock,
      minStock: minStock,
      defaultSupplier: matSupplier,
      supplier: matSupplier,
      supplierContact: matSupplierContact,
      lastUpdated: new Date().toISOString().split('T')[0]
    };

    if (editingMaterial) {
      updateMaterial(editingMaterial.id, data);
    } else {
      addMaterial(data);
    }

    setShowNewMaterialModal(false);
  };

  const handleConfirmDeleteMat = (id: string) => {
    deleteMaterial(id);
    setDeletingMatId(null);
  };

  // Purchase Handlers
  const handleConfirmDeletePurchase = (id: string) => {
    deletePurchase(id);
    setDeletingPurId(null);
  };

  // Group Purchases by Month
  const formatMonthLabel = (dateStr: string) => {
    if (!dateStr) return 'Outros Lançamentos';
    // Match YYYY-MM or parse Date
    try {
      let d: Date;
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else {
        d = new Date(dateStr);
      }
      if (isNaN(d.getTime())) return 'Outros Lançamentos';

      const monthName = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      return monthName.charAt(0).toUpperCase() + monthName.slice(1);
    } catch {
      return 'Outros Lançamentos';
    }
  };

  const getMonthSortKey = (dateStr: string) => {
    if (!dateStr) return '0000-00';
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      return `${parts[2]}-${parts[1].padStart(2, '0')}`;
    }
    return dateStr.substring(0, 7);
  };

  // Grouping map
  const groupedPurchasesMap: { [key: string]: { label: string; records: PurchaseRecord[]; total: number } } = {};

  (purchases || []).forEach(p => {
    const dateVal = p.date || p.purchaseDate || '';
    const sortKey = getMonthSortKey(dateVal);
    const label = formatMonthLabel(dateVal);

    if (!groupedPurchasesMap[sortKey]) {
      groupedPurchasesMap[sortKey] = { label, records: [], total: 0 };
    }
    const cost = p.totalCost ?? p.totalAmount ?? 0;
    groupedPurchasesMap[sortKey].records.push(p);
    groupedPurchasesMap[sortKey].total += cost;
  });

  const sortedMonthKeys = Object.keys(groupedPurchasesMap).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E8DFD5] dark:border-[#3F4147]">
        <div>
          <h2 className="font-serif-brand text-2xl font-bold text-[#352527] dark:text-[#FFFFFF] flex items-center gap-2">
            <Wheat className="w-6 h-6 text-[#B86B77]" />
            <span>Controle de Compras & Catálogo de Insumos</span>
          </h2>
          <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1]">
            Cadastro detalhado com código, unidade de medida, fornecedor e recálculo automático de custo por grama
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenNewMat}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#2B2D31] border border-[#D5C5B5] dark:border-[#3F4147] hover:bg-[#F4ECE3] dark:hover:bg-[#35373C] text-[#553E41] dark:text-[#FFFFFF] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Insumo</span>
          </button>
          <button
            onClick={onOpenNewPurchase}
            className="px-4 py-2 rounded-xl bg-[#B86B77] hover:bg-[#9E5460] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Receipt className="w-4 h-4" />
            <span>Registrar Compra (NF)</span>
          </button>
        </div>
      </div>

      {/* Auto-Recalculation Info Banner */}
      <div className="p-4 rounded-xl bg-[#F5EDE3] dark:bg-[#1E1F22] border border-[#E5DACF] dark:border-[#3F4147] text-xs text-[#553E41] dark:text-[#B5BAC1] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-[#B86B77] shrink-0" />
          <div>
            <strong className="text-[#352527] dark:text-[#FFFFFF]">Recálculo Automático em Cadeia Conectado ao Supabase:</strong>{' '}
            <span>Ao alterar ou lançar uma nova compra com preço atualizado, o custo do insumo, das Fichas Técnicas e os Valores Sugeridos de todos os produtos são recalculados e sincronizados!</span>
          </div>
        </div>
        <span className="text-[11px] font-bold text-[#B86B77] dark:text-[#FFFFFF] shrink-0 bg-white dark:bg-[#2B2D31] px-2.5 py-1 rounded-md border border-[#DCCDC0] dark:border-[#3F4147]">
          Total de Compras: {purchases.length} NFs
        </span>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E8DFD5] dark:border-[#3F4147] pb-2">
        <button
          onClick={() => setActiveTab('materials')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'materials'
              ? 'bg-[#594446] dark:bg-[#383A40] text-white'
              : 'bg-white dark:bg-[#2B2D31] text-[#5E484B] dark:text-[#B5BAC1] border border-[#E0D3C5] dark:border-[#3F4147] hover:bg-[#F2EAE0] dark:hover:bg-[#35373C]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Catálogo de Materiais ({materials.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'history'
              ? 'bg-[#594446] dark:bg-[#383A40] text-white'
              : 'bg-white dark:bg-[#2B2D31] text-[#5E484B] dark:text-[#B5BAC1] border border-[#E0D3C5] dark:border-[#3F4147] hover:bg-[#F2EAE0] dark:hover:bg-[#35373C]'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Histórico de Notas & Compras ({purchases.length})</span>
        </button>
      </div>

      {/* Tab 1: Materials Catalog */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          
          {/* Filter and Search */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#FAF7F2] dark:bg-[#1E1F22] p-3 rounded-xl border border-[#E8DFD5] dark:border-[#3F4147]">
            <div className="w-full sm:w-80 relative">
              <Search className="w-4 h-4 text-[#9E898B] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por código (INS-...), nome ou fornecedor..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
              />
            </div>

            <div className="w-full flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#B86B77] text-white'
                      : 'bg-white dark:bg-[#2B2D31] text-[#5E484B] dark:text-[#B5BAC1] border border-[#E0D3C5] dark:border-[#3F4147] hover:bg-[#F2EAE0] dark:hover:bg-[#35373C]'
                  }`}
                >
                  {cat === 'all' ? 'Todas as Categorias' : cat}
                </button>
              ))}
              
              <button
                type="button"
                onClick={() => setShowCategoryManager(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap bg-white dark:bg-[#2B2D31] text-[#B86B77] dark:text-[#E295A1] border border-dashed border-[#B86B77] hover:bg-[#B86B77]/10 transition-colors cursor-pointer flex items-center gap-1.5 ml-auto"
                title="Criar, editar e excluir categorias do catálogo"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>⚙️ Categorias</span>
              </button>
            </div>
          </div>

          {/* Materials Table */}
          <div className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] dark:bg-[#1E1F22] border-b border-[#E8DFD5] dark:border-[#3F4147] text-[#7A6466] dark:text-[#B5BAC1] font-semibold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Código / Insumo</th>
                    <th className="p-3.5">Categoria</th>
                    <th className="p-3.5">Tamanho Embalagem</th>
                    <th className="p-3.5">Fornecedor Principal</th>
                    <th className="p-3.5 text-right">Último Preço Pago</th>
                    <th className="p-3.5 text-right">Custo Unitário</th>
                    <th className="p-3.5 text-center">Estoque Atual</th>
                    <th className="p-3.5 text-center w-24">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0E8DF] dark:divide-[#3F4147]">
                  {filteredMaterials.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-xs text-[#8C7678] dark:text-[#B5BAC1]">
                        Nenhum insumo encontrado no catálogo. Cadastre insumos ou lance compras para alimentar a lista.
                      </td>
                    </tr>
                  ) : (
                    filteredMaterials.map(m => (
                      <tr key={m.id} className="hover:bg-[#FAF7F2] dark:hover:bg-[#35373C] transition-colors">
                        <td className="p-3.5">
                          <div className="font-mono font-bold text-xs text-[#7A5A40] dark:text-[#B5BAC1]">{m.code}</div>
                          <div className="font-bold text-sm text-[#352527] dark:text-[#FFFFFF] mt-0.5">{m.name}</div>
                        </td>

                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-md bg-[#FAF0F2] dark:bg-[#383A40] text-[#B86B77] dark:text-[#F2F3F5] border border-[#F2D7DA] dark:border-[#3F4147] text-[10px] font-semibold">
                            {m.category}
                          </span>
                        </td>

                      <td className="p-3.5">
                        <span className="font-medium text-[#3D2C2E] dark:text-white">
                          {m.packageSize || m.size || 1} {m.sizeUnit || m.unit}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="font-medium text-[#3D2C2E] dark:text-white flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5 text-stone-400" />
                          <span>{m.supplier || m.defaultSupplier || 'Fornecedor Cadastrado'}</span>
                        </div>
                        {m.supplierContact && (
                          <div className="text-[10px] text-[#8C7678] dark:text-[#949BA4] mt-0.5">
                            {m.supplierContact}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 text-right font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                        {m.lastPackagePrice ? `R$ ${m.lastPackagePrice.toFixed(2)}` : '-'}
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-mono font-bold text-[#9E5460] dark:text-emerald-400 text-sm">
                            R$ {(((m.currentCostPerUnit ?? m.costPerUnit ?? 0) * (m.packageSize || 1)) / (m.size || 1)).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-[#8C7678] dark:text-[#949BA4] font-normal uppercase tracking-tighter">
                            por {m.sizeUnit || m.unit}
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5 text-center">
                        <div className={`font-mono font-bold text-xs ${m.currentStock <= m.minStock ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 py-0.5 px-2 rounded-md border border-red-200 dark:border-red-800/40' : 'text-[#352527] dark:text-[#FFFFFF]'}`}>
                          {m.currentStock} {m.unit}
                        </div>
                        {m.currentStock <= m.minStock && (
                          <div className="text-[9px] text-red-600 dark:text-red-400 font-semibold mt-0.5">Abaixo do Mín.</div>
                        )}
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEditMat(m)}
                            className="p-1.5 text-stone-500 dark:text-[#B5BAC1] hover:text-[#B86B77] dark:hover:text-white hover:bg-[#FAF0F2] dark:hover:bg-[#35373C] rounded-lg transition-colors cursor-pointer"
                            title="Editar insumo"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingMatId(m.id)}
                            className="p-1.5 text-stone-400 dark:text-[#B5BAC1] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Excluir insumo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Purchases History (Grouped by Months) */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="p-4 bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-serif-brand text-base font-bold text-[#352527] dark:text-[#FFFFFF] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#B86B77]" />
                <span>Histórico de Notas Fiscais Agrupado por Mês</span>
              </h3>
              <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1]">
                Visualize seus investimentos em compras organizados mês a mês com opção de edição e exclusão.
              </p>
            </div>
            <div className="bg-[#FAF7F2] dark:bg-[#1E1F22] border border-[#E8DFD5] dark:border-[#3F4147] px-4 py-2 rounded-xl text-xs font-bold text-[#352527] dark:text-[#FFFFFF]">
              Total Geral Acumulado: <span className="text-[#9E5460] dark:text-emerald-400 font-mono">R$ {(purchases || []).reduce((a, b) => a + (b?.totalCost ?? b?.totalAmount ?? 0), 0).toFixed(2)}</span>
            </div>
          </div>

          {sortedMonthKeys.length === 0 ? (
            <div className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] p-8 text-center text-stone-500 dark:text-[#B5BAC1] text-xs">
              Nenhuma compra registrada até o momento.
            </div>
          ) : (
            sortedMonthKeys.map(monthKey => {
              const group = groupedPurchasesMap[monthKey];
              return (
                <div key={monthKey} className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] overflow-hidden shadow-2xs">
                  
                  {/* Month Group Header */}
                  <div className="p-4 bg-[#FAF7F2] dark:bg-[#1E1F22] border-b border-[#E8DFD5] dark:border-[#3F4147] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-[#FAF0F2] dark:bg-[#383A40] text-[#B86B77] dark:text-[#F2F3F5] rounded-xl border border-[#F2D7DA] dark:border-[#3F4147]">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-serif-brand font-bold text-sm text-[#352527] dark:text-[#FFFFFF]">
                          {group.label}
                        </h4>
                        <span className="text-[11px] text-[#7A6466] dark:text-[#B5BAC1]">
                          {group.records.length} {group.records.length === 1 ? 'nota lançada' : 'notas lançadas'} neste mês
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-[#7A6466] dark:text-[#B5BAC1] block">Total do Mês</span>
                      <span className="font-mono font-bold text-sm text-[#B86B77] dark:text-emerald-400">
                        R$ {group.total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Purchases Table for Month */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FCFAF7] dark:bg-[#1E1F22] border-b border-[#E8DFD5] dark:border-[#3F4147] text-[#7A6466] dark:text-[#B5BAC1] font-semibold text-[11px] uppercase tracking-wider">
                        <tr>
                          <th className="p-3.5">Data / NF</th>
                          <th className="p-3.5">Fornecedor</th>
                          <th className="p-3.5">Insumo Comprado</th>
                          <th className="p-3.5 text-center">Qtd Entregue</th>
                          <th className="p-3.5 text-right">Preço Embalagem</th>
                          <th className="p-3.5 text-right">Custo / Unid.</th>
                          <th className="p-3.5 text-right">Valor Total</th>
                          <th className="p-3.5 text-center">Pagamento</th>
                          <th className="p-3.5 text-center">Status</th>
                          <th className="p-3.5 text-center w-24">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0E8DF] dark:divide-[#3F4147]">
                        {group.records.map(p => (
                          <tr key={p.id} className="hover:bg-[#FAF7F2] dark:hover:bg-[#35373C] transition-colors">
                            <td className="p-3.5">
                              <div className="font-semibold text-[#352527] dark:text-[#FFFFFF]">{p.date || p.purchaseDate}</div>
                              <div className="font-mono text-[10px] text-[#7A6466] dark:text-[#949BA4]">NF #{p.invoiceNumber || 'S/N'}</div>
                            </td>

                            <td className="p-3.5 font-medium text-[#3D2C2E] dark:text-white">
                              {p.supplier}
                            </td>

                            <td className="p-3.5">
                              {p.items && p.items.length > 0 ? (
                                <div className="space-y-1">
                                  <div className="font-bold text-[#352527] dark:text-[#FFFFFF]">
                                    {p.items.length} {p.items.length === 1 ? 'Item' : 'Itens'} na Nota
                                  </div>
                                  <div className="text-[10px] text-[#7A6466] dark:text-[#B5BAC1] truncate max-w-[150px]">
                                    {p.items.map(i => i.materialName).join(', ')}
                                  </div>
                                </div>
                              ) : (
                                <div className="font-bold text-[#352527] dark:text-[#FFFFFF]">{p.materialName}</div>
                              )}
                              {p.notes && <div className="text-[10px] text-[#8C7678] dark:text-[#949BA4] italic">{p.notes}</div>}
                            </td>

                            <td className="p-3.5 text-center font-mono font-semibold text-[#352527] dark:text-[#FFFFFF]">
                              {p.items && p.items.length > 0 ? (
                                <span className="text-[10px] text-stone-400 italic">Variado</span>
                              ) : (
                                <>{p.quantity ?? p.quantityPurchased ?? 0} {p.unit}</>
                              )}
                            </td>

                            <td className="p-3.5 text-right font-mono text-[#7A6466] dark:text-[#B5BAC1]">
                              {p.items && p.items.length > 0 ? (
                                <span className="text-[10px] text-stone-400 italic">-</span>
                              ) : (
                                <>
                                  {p.packagePrice ? `R$ ${p.packagePrice.toFixed(2)}` : '-'}
                                  {p.packageQuantity && <span className="text-[10px] block">({p.packageQuantity} {p.unit})</span>}
                                </>
                              )}
                            </td>
                            <td className="p-3.5 text-right font-mono font-semibold text-[#9E5460] dark:text-emerald-400">
                              {p.items && p.items.length > 0 ? (
                                <span className="text-[10px] text-stone-400 italic">-</span>
                              ) : (
                                <>R$ {(p.unitCostCalculated ?? p.unitCost ?? 0).toFixed(2)} /{p.unit}</>
                              )}
                            </td>
                            <td className="p-3.5 text-right font-mono font-bold text-[#352527] dark:text-[#FFFFFF]">
                              R$ {(p.totalCost ?? p.totalAmount ?? 0).toFixed(2)}
                            </td>

                            <td className="p-3.5 text-center">
                              <span className="text-[10px] font-bold text-[#543E40] dark:text-[#B5BAC1]">
                                {p.paymentMethod || '-'}
                              </span>
                            </td>

                            <td className="p-3.5 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                                {p.status === 'pendente' ? 'Pendente' : 'Entregue no Estoque'}
                              </span>
                            </td>

                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => onEditPurchase(p)}
                                  className="p-1.5 text-stone-500 dark:text-[#B5BAC1] hover:text-[#B86B77] dark:hover:text-white hover:bg-[#FAF0F2] dark:hover:bg-[#35373C] rounded-lg transition-colors cursor-pointer"
                                  title="Editar nota de compra"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeletingPurId(p.id)}
                                  className="p-1.5 text-stone-400 dark:text-[#B5BAC1] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                  title="Excluir nota de compra"
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
            })
          )}
        </div>
      )}

      {/* New / Edit Material Modal */}
      {showNewMaterialModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#FAF7F2] dark:bg-[#2B2D31] rounded-2xl border border-[#E5DACF] dark:border-[#3F4147] shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EBE1D7] dark:border-[#3F4147] flex items-center justify-between bg-[#F4EFEA] dark:bg-[#1E1F22]">
              <h3 className="font-serif-brand text-lg font-bold text-[#352527] dark:text-[#FFFFFF]">
                {editingMaterial ? 'Editar Insumo do Catálogo' : 'Novo Insumo no Catálogo'}
              </h3>
              <button
                onClick={() => setShowNewMaterialModal(false)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMaterial} className="p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#543E40] dark:text-[#FFFFFF] mb-1">Código / SKU *</label>
                  <input
                    type="text"
                    required
                    value={matCode}
                    onChange={e => setMatCode(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-[#1E1F22] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] font-mono text-[#3D2C2E] dark:text-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-[#543E40] dark:text-[#FFFFFF] mb-1">Nome do Insumo *</label>
                  <input
                    type="text"
                    required
                    value={matName}
                    onChange={e => setMatName(e.target.value)}
                    placeholder="Ex: Farinha de Trigo Tipo 00 Italiana"
                    className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-[#1E1F22] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-[#543E40] dark:text-[#FFFFFF]">Categoria *</label>
                    <button
                      type="button"
                      onClick={() => setShowCategoryManager(true)}
                      className="text-[10px] font-bold text-[#B86B77] hover:underline cursor-pointer"
                    >
                      + Gerenciar
                    </button>
                  </div>
                  <select
                    value={matCategory}
                    onChange={e => setMatCategory(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-[#1E1F22] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white cursor-pointer"
                  >
                    {materialCategories.map((c, index) => (
                      <option key={c ? `pm-${c}` : `pm-idx-${index}`} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#543E40] dark:text-[#FFFFFF] mb-1">Unidade de Estoque *</label>
                  <select
                    value={matUnit}
                    onChange={e => setMatUnit(e.target.value as UnitOfMeasure)}
                    className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-[#1E1F22] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
                  >
                    <option key="kg" value="kg">kg (Quilograma)</option>
                    <option key="g" value="g">g (Grama)</option>
                    <option key="l" value="l">l (Litro)</option>
                    <option key="ml" value="ml">ml (Mililitro)</option>
                    <option key="un" value="un">un (Unidade)</option>
                    <option key="pct" value="pct">pct (Pacote)</option>
                    <option key="cx" value="cx">cx (Caixa)</option>
                    <option key="m" value="m">m (Metro)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-[#543E40] dark:text-[#FFFFFF]">Fornecedor Principal *</label>
                    <button
                      type="button"
                      onClick={() => setShowSupplierManager(true)}
                      className="text-[10px] font-bold text-[#B86B77] hover:underline cursor-pointer"
                    >
                      + Gerenciar
                    </button>
                  </div>
                  <select
                    required
                    value={matSupplier}
                    onChange={e => setMatSupplier(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-[#1E1F22] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white cursor-pointer"
                  >
                    <option key="placeholder" value="">Selecione um fornecedor</option>
                    {suppliers && suppliers.map((s, index) => (
                      <option key={s.id ? `pm-${s.id}` : `pm-idx-${index}`} value={s.name || ''}>
                        {s.name || 'Sem nome'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#543E40] dark:text-[#FFFFFF] mb-1">Contato do Fornecedor</label>
                  <input
                    type="text"
                    value={matSupplierContact}
                    onChange={e => setMatSupplierContact(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-[#1E1F22] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
                  />
                </div>
              </div>

              <div className="bg-[#EFE5DA] dark:bg-[#1E1F22] p-3 rounded-xl border border-[#DACDC0] dark:border-[#3F4147]">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#543E40] dark:text-[#FFFFFF] mb-1">Tamanho do Produto *</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="any"
                        min="0.0001"
                        required
                        value={matSize}
                        onChange={e => setMatSize(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className="flex-1 text-xs px-2.5 py-1.5 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
                      />
                      <select
                        value={matSizeUnit}
                        onChange={e => setMatSizeUnit(e.target.value as UnitOfMeasure)}
                        className="w-20 text-xs px-2 py-1.5 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white cursor-pointer"
                      >
                        <option key="kg" value="kg">kg</option>
                        <option key="g" value="g">g</option>
                        <option key="l" value="l">l</option>
                        <option key="ml" value="ml">ml</option>
                        <option key="un" value="un">un</option>
                        <option key="pct" value="pct">pct</option>
                        <option key="cx" value="cx">cx</option>
                        <option key="m" value="m">m</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#543E40] dark:text-[#FFFFFF] mb-1">Custo do Produto (R$) *</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={matCostPerUnit}
                      onChange={e => setMatCostPerUnit(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white font-bold"
                    />
                  </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#543E40] dark:text-[#FFFFFF] mb-1 text-emerald-700 dark:text-emerald-400">Último Preço Pago (Ref)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={matLastPackagePrice}
                      onChange={e => setMatLastPackagePrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full text-xs px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800 text-[#3D2C2E] dark:text-white font-bold"
                    />
                  </div>
                </div>

                {/* Pack Price Calculator */}
                <div className="mt-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                  <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase mb-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Calculadora de Custo por Embalagem
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[9px] font-bold text-emerald-700 dark:text-emerald-300 mb-0.5">Unidade de Medida</label>
                      <select
                        value={matUnit}
                        onChange={e => {
                          const val = e.target.value as UnitOfMeasure;
                          setMatUnit(val);
                          setMatSizeUnit(val);
                        }}
                        className="w-full text-[10px] px-2 py-1 bg-white dark:bg-[#1E1F22] rounded border border-emerald-200 dark:border-emerald-800"
                      >
                        <option key="kg" value="kg">kg (Quilograma)</option>
                        <option key="g" value="g">g (Grama)</option>
                        <option key="l" value="l">l (Litro)</option>
                        <option key="ml" value="ml">ml (Mililitro)</option>
                        <option key="un" value="un">un (Unidade)</option>
                        <option key="pct" value="pct">pct (Pacote)</option>
                        <option key="cx" value="cx">cx (Caixa)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-emerald-700 dark:text-emerald-300 mb-0.5">Preço Embalagem</label>
                      <input
                        type="number"
                        value={calcPackPrice}
                        onChange={e => setCalcPackPrice(parseFloat(e.target.value) || 0)}
                        className="w-full text-[10px] px-2 py-1 bg-white dark:bg-[#1E1F22] rounded border border-emerald-200 dark:border-emerald-800"
                        placeholder="Ex: 30.00"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-emerald-700 dark:text-emerald-300 mb-0.5">Qtd na Embalagem</label>
                      <input
                        type="number"
                        value={calcPackQty}
                        onChange={e => setCalcPackQty(parseFloat(e.target.value) || 1)}
                        className="w-full text-[10px] px-2 py-1 bg-white dark:bg-[#1E1F22] rounded border border-emerald-200 dark:border-emerald-800"
                        placeholder="Ex: 30"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCalcCost}
                      className="col-span-2 py-1.5 text-[10px] font-bold text-white bg-emerald-600 rounded hover:bg-emerald-700 transition-colors"
                    >
                      Calcular e Aplicar Custo
                    </button>
                  </div>
                </div>

                {matSize && matSizeUnit !== matUnit && (
                  <p className="text-[10px] text-[#7A6466] dark:text-[#B5BAC1] italic">
                    Conversão: Este tamanho equivale a {((Number(matSize) || 1) * (matSizeUnit === 'kg' && matUnit === 'g' ? 1000 : matSizeUnit === 'g' && matUnit === 'kg' ? 0.001 : matSizeUnit === 'l' && matUnit === 'ml' ? 1000 : matSizeUnit === 'ml' && matUnit === 'l' ? 0.001 : 1)).toFixed(2)} {matUnit} no estoque.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#543E40] dark:text-[#FFFFFF] mb-1">Estoque Físico Atual</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={matCurrentStock}
                    onChange={e => setMatCurrentStock(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                    className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-[#1E1F22] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#543E40] dark:text-[#FFFFFF] mb-1">Estoque Mínimo de Alerta</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={matMinStock}
                    onChange={e => setMatMinStock(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                    className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-[#1E1F22] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-[#E8DFD5] dark:border-[#3F4147]">
                <div>
                  {editingMaterial && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Tem certeza que deseja excluir o insumo "${editingMaterial.name}"?`)) {
                          handleConfirmDeleteMat(editingMaterial.id);
                          setShowNewMaterialModal(false);
                        }
                      }}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-700 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir Insumo
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewMaterialModal(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#DACDC0] dark:border-[#3F4147] bg-white dark:bg-[#1E1F22] text-[#352527] dark:text-[#FFFFFF] hover:bg-[#F4ECE3] dark:hover:bg-[#35373C] transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-[#B86B77] hover:bg-[#9E5460] text-white cursor-pointer"
                  >
                    {editingMaterial ? 'Salvar Alterações' : 'Cadastrar Insumo'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirm Delete Material */}
      {deletingMatId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] p-6 max-w-sm w-full space-y-4 text-xs shadow-xl">
            <h3 className="font-bold text-sm text-[#352527] dark:text-[#FFFFFF]">Excluir Insumo do Catálogo?</h3>
            <p className="text-[#6E595B] dark:text-[#B5BAC1]">
              Esta ação removerá o insumo do banco de dados do Supabase. Fichas técnicas associadas precisarão de atenção.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingMatId(null)}
                className="px-3 py-1.5 rounded-xl border border-[#DACDC0] dark:border-[#3F4147] bg-white dark:bg-[#1E1F22] text-[#352527] dark:text-[#FFFFFF] hover:bg-[#F4ECE3] dark:hover:bg-[#35373C] font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleConfirmDeleteMat(deletingMatId)}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirm Delete Purchase */}
      {deletingPurId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] p-6 max-w-sm w-full space-y-4 text-xs shadow-xl">
            <h3 className="font-bold text-sm text-[#352527] dark:text-[#FFFFFF]">Excluir Nota Fiscal de Compra?</h3>
            <p className="text-[#6E595B] dark:text-[#B5BAC1]">
              Esta ação removerá o registro da compra do histórico e do Supabase.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingPurId(null)}
                className="px-3 py-1.5 rounded-xl border border-[#DACDC0] dark:border-[#3F4147] bg-white dark:bg-[#1E1F22] text-[#352527] dark:text-[#FFFFFF] hover:bg-[#F4ECE3] dark:hover:bg-[#35373C] font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleConfirmDeletePurchase(deletingPurId)}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {showCategoryManager && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#FAF7F2] dark:bg-[#2B2D31] rounded-2xl border border-[#E5DACF] dark:border-[#3F4147] shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EBE1D7] dark:border-[#3F4147] flex items-center justify-between bg-[#F4EFEA] dark:bg-[#1E1F22]">
              <h3 className="font-serif-brand text-base font-bold text-[#352527] dark:text-[#FFFFFF] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#B86B77]" />
                <span>Gerenciar Categorias de Insumos</span>
              </h3>
              <button
                onClick={() => setShowCategoryManager(false)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Form to Add New Category */}
              <div className="space-y-1.5">
                <label className="block font-bold text-[#543E40] dark:text-[#FFFFFF]">Nova Categoria</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="newCategoryInput"
                    placeholder="Ex: Essências & Corantes"
                    className="flex-1 text-xs px-3 py-2 bg-white dark:bg-[#1E1F22] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white font-bold"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = (e.target as HTMLInputElement).value;
                        if (val.trim()) {
                          addMaterialCategory(val.trim());
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('newCategoryInput') as HTMLInputElement;
                      if (input && input.value.trim()) {
                        addMaterialCategory(input.value.trim());
                        input.value = '';
                      }
                    }}
                    className="px-4 py-2 bg-[#B86B77] hover:bg-[#9E5460] text-white font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              {/* List of Existing Categories */}
              <div className="space-y-2">
                <label className="block font-bold text-[#543E40] dark:text-[#FFFFFF]">Categorias Cadastradas</label>
                <div className="max-h-60 overflow-y-auto border border-[#DACDC0] dark:border-[#3F4147] rounded-lg bg-white dark:bg-[#1E1F22] divide-y divide-[#F0E6DC] dark:divide-[#3F4147]">
                  {materialCategories.map((cat, index) => (
                    <CategoryRow
                      key={cat ? `pm-${cat}` : `pm-idx-${index}`}
                      category={cat}
                      onUpdate={(newName) => updateMaterialCategory(cat, newName)}
                      onDelete={() => {
                        if (confirm(`Tem certeza que deseja excluir a categoria "${cat}"? Insumos nessa categoria serão movidos para "Outros".`)) {
                          deleteMaterialCategory(cat);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-[#E8DFD5] dark:border-[#3F4147]">
                <button
                  type="button"
                  onClick={() => setShowCategoryManager(false)}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#594446] text-white cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Manager Modal */}
      {showSupplierManager && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#FAF7F2] dark:bg-[#2B2D31] rounded-2xl border border-[#E5DACF] dark:border-[#3F4147] shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EBE1D7] dark:border-[#3F4147] flex items-center justify-between bg-[#F4EFEA] dark:bg-[#1E1F22]">
              <h3 className="font-serif-brand text-base font-bold text-[#352527] dark:text-[#FFFFFF] flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#B86B77]" />
                <span>Gerenciar Fornecedores</span>
              </h3>
              <button
                onClick={() => setShowSupplierManager(false)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Form to Add New Supplier */}
              <div className="space-y-1.5">
                <label className="block font-bold text-[#543E40] dark:text-[#FFFFFF]">Novo Fornecedor</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="newSupplierInput"
                    placeholder="Ex: Distribuidora Central Ltda"
                    value={newSupplierName}
                    onChange={e => setNewSupplierName(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 bg-white dark:bg-[#1E1F22] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white font-bold"
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newSupplierName.trim()) {
                          await addSupplier({ name: newSupplierName.trim() });
                          setNewSupplierName('');
                          setShowSupplierManager(false);
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (newSupplierName.trim()) {
                        await addSupplier({ name: newSupplierName.trim() });
                        setNewSupplierName('');
                        setShowSupplierManager(false);
                      }
                    }}
                    className="px-4 py-2 bg-[#B86B77] hover:bg-[#9E5460] text-white font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              {/* List of Existing Suppliers */}
              <div className="space-y-2">
                <label className="block font-bold text-[#543E40] dark:text-[#FFFFFF]">Fornecedores Cadastrados</label>
                <div className="max-h-60 overflow-y-auto border border-[#DACDC0] dark:border-[#3F4147] rounded-lg bg-white dark:bg-[#1E1F22] divide-y divide-[#F0E6DC] dark:divide-[#3F4147]">
                  {suppliers.map((sup, index) => (
                    <SupplierRow
                      key={sup.id ? `pm-${sup.id}` : `pm-idx-${index}`}
                      supplier={sup}
                      onUpdate={(newName) => updateSupplier(sup.id, { name: newName })}
                      onDelete={() => {
                        if (confirm(`Tem certeza que deseja remover o fornecedor "${sup.name}" da lista de seleção rápida?`)) {
                          deleteSupplier(sup.id);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-[#E8DFD5] dark:border-[#3F4147]">
                <button
                  type="button"
                  onClick={() => setShowSupplierManager(false)}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#594446] text-white cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const SupplierRow: React.FC<{
  supplier: Supplier;
  onUpdate: (newName: string) => void;
  onDelete: () => void;
}> = ({ supplier, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(supplier.name);

  return (
    <div className="flex items-center justify-between p-2.5 gap-2 hover:bg-[#FAF7F2] dark:hover:bg-[#2B2D31] transition-colors">
      {isEditing ? (
        <input
          type="text"
          value={editName}
          onChange={e => setEditName(e.target.value)}
          className="flex-1 text-xs px-2 py-1 bg-white dark:bg-[#2B2D31] rounded border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
          onKeyDown={e => {
            if (e.key === 'Enter') {
              if (editName.trim()) {
                onUpdate(editName.trim());
                setIsEditing(false);
              }
            }
          }}
          autoFocus
        />
      ) : (
        <span className="font-medium text-[#3D2C2E] dark:text-white">{supplier.name}</span>
      )}

      <div className="flex items-center gap-1.5 shrink-0">
        {isEditing ? (
          <>
            <button
              onClick={() => {
                if (editName.trim()) {
                  onUpdate(editName.trim());
                  setIsEditing(false);
                }
              }}
              className="px-2 py-1 text-[10px] font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer"
            >
              Salvar
            </button>
            <button
              onClick={() => {
                setEditName(supplier.name);
                setIsEditing(false);
              }}
              className="px-2 py-1 text-[10px] font-semibold bg-gray-300 dark:bg-[#3F4147] text-gray-700 dark:text-white rounded hover:bg-gray-400 cursor-pointer"
            >
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-[#8C7678] hover:text-[#B86B77] hover:bg-gray-100 dark:hover:bg-[#3F4147] rounded cursor-pointer"
              title="Editar Fornecedor"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1 text-[#8C7678] hover:text-red-600 hover:bg-gray-100 dark:hover:bg-[#3F4147] rounded cursor-pointer"
              title="Excluir Fornecedor"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const CategoryRow: React.FC<{
  category: string;
  onUpdate: (newName: string) => void;
  onDelete: () => void;
}> = ({ category, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(category);

  return (
    <div className="flex items-center justify-between p-2.5 gap-2 hover:bg-[#FAF7F2] dark:hover:bg-[#2B2D31] transition-colors">
      {isEditing ? (
        <input
          type="text"
          value={editName}
          onChange={e => setEditName(e.target.value)}
          className="flex-1 text-xs px-2 py-1 bg-white dark:bg-[#2B2D31] rounded border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
          onKeyDown={e => {
            if (e.key === 'Enter') {
              if (editName.trim()) {
                onUpdate(editName.trim());
                setIsEditing(false);
              }
            }
          }}
          autoFocus
        />
      ) : (
        <span className="font-medium text-[#3D2C2E] dark:text-white">{category}</span>
      )}

      <div className="flex items-center gap-1.5 shrink-0">
        {isEditing ? (
          <>
            <button
              onClick={() => {
                if (editName.trim()) {
                  onUpdate(editName.trim());
                  setIsEditing(false);
                }
              }}
              className="px-2 py-1 text-[10px] font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer"
            >
              Salvar
            </button>
            <button
              onClick={() => {
                setEditName(category);
                setIsEditing(false);
              }}
              className="px-2 py-1 text-[10px] font-semibold bg-gray-300 dark:bg-[#3F4147] text-gray-700 dark:text-white rounded hover:bg-gray-400 cursor-pointer"
            >
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-[#8C7678] hover:text-[#B86B77] hover:bg-gray-100 dark:hover:bg-[#3F4147] rounded cursor-pointer"
              title="Editar Categoria"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            {category !== 'Outros' && (
              <button
                onClick={onDelete}
                className="p-1 text-[#8C7678] hover:text-red-600 hover:bg-gray-100 dark:hover:bg-[#3F4147] rounded cursor-pointer"
                title="Excluir Categoria"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
