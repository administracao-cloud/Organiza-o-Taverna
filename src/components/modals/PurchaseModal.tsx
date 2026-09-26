import React, { useState, useEffect } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { Material, UnitOfMeasure, PurchaseItem, PurchaseRecord, Supplier } from '../../types';
import { X, Sparkles, AlertCircle, ShoppingBag, Plus, Trash2, Calendar, FileText, CheckCircle2, Truck, Edit2 } from 'lucide-react';
import { convertToBaseUnit } from '../../utils/units';
import { supabase } from '../../lib/supabase';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedMaterialId?: string;
  editingPurchase?: PurchaseRecord;
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({ 
  isOpen, 
  onClose,
  preselectedMaterialId,
  editingPurchase
}) => {
  const { 
    materials, 
    addPurchase, 
    updatePurchase, 
    addMaterial, 
    materialCategories,
    suppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier
  } = useBakery();

  // NF-e Common Header Fields
  const [supplier, setSupplier] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [integrateStock, setIntegrateStock] = useState(true); // Se os itens vão integrar o estoque

  const [showSupplierManager, setShowSupplierManager] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [localSuppliers, setLocalSuppliers] = useState<Supplier[]>([]);

  // 1) useEffect para buscar os fornecedores ativos no Supabase
  const fetchSuppliers = async () => {
    if (isOpen) {
      try {
        const { data, error } = await supabase
          .from('suppliers')
          .select('id, name')
          .order('name', { ascending: true });
        
        if (data && !error && data.length > 0) {
          // 2) Atualize o estado de fornecedores do modal
          const fetched = data as Supplier[];
          setLocalSuppliers(prev => {
            const map = new Map<string, Supplier>();
            suppliers.forEach(s => map.set(s.id, s));
            fetched.forEach(s => map.set(s.id, s));
            return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
          });

          // Se estamos editando, tenta encontrar o ID do fornecedor pelo nome
          if (editingPurchase && editingPurchase.supplier) {
            const found = fetched.find(s => s.name === editingPurchase.supplier);
            if (found) {
              setSupplier(found.id);
            }
          }
        } else if (suppliers.length > 0) {
          setLocalSuppliers(suppliers);
        }
      } catch (err) {
        console.warn('[PurchaseModal] Aviso ao buscar fornecedores:', err);
        if (suppliers.length > 0) {
          setLocalSuppliers(suppliers);
        }
      }
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [isOpen, editingPurchase]);

  useEffect(() => {
    if (suppliers.length > 0) {
      setLocalSuppliers(prev => {
        const map = new Map<string, Supplier>();
        suppliers.forEach(s => map.set(s.id, s));
        prev.forEach(s => {
          if (!map.has(s.id)) map.set(s.id, s);
        });
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
      });
    }
  }, [suppliers]);

  useEffect(() => {
    if (isOpen) {
      if (editingPurchase) {
        setSupplier(editingPurchase.supplier || '');
        setInvoiceNumber(editingPurchase.invoiceNumber || '');
        setPurchaseDate(editingPurchase.date || editingPurchase.purchaseDate || new Date().toISOString().split('T')[0]);
        setPaymentMethod(editingPurchase.paymentMethod || '');
        setNotes(editingPurchase.notes || '');
        setIntegrateStock(editingPurchase.integrateStock ?? true);
        setItems(editingPurchase.items || []);
      } else {
        // Reset for new registration
        setSupplier('Distribuidora Vale do Sol');
        setInvoiceNumber(`NFE-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`);
        setPurchaseDate(new Date().toISOString().split('T')[0]);
        setPaymentMethod('');
        setNotes('');
        setIntegrateStock(true);
        setItems([]);
        
        // Reset item form
        setSelectedMatId(preselectedMaterialId || '');
        setIsNewMaterial(false);
        setNewCode('');
        setNewName('');
        setPackQty(1);
        setUnitsPerPack(1);
        setItemUnitPrice(15.00);
        setUnitCost(15.00);
      }
    }
  }, [isOpen, editingPurchase, preselectedMaterialId]);

  // Multi-item list
  const [items, setItems] = useState<PurchaseItem[]>([]);

  // Item form input states
  const [isNewMaterial, setIsNewMaterial] = useState(false);
  const [selectedMatId, setSelectedMatId] = useState<string>(preselectedMaterialId || '');
  
  // New material fields if creating on the fly
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<string>(materialCategories?.[0] || 'Farinhas & Grãos');
  
  // Item specific fields (User types in quantity and unit)
  const [unit, setUnit] = useState<UnitOfMeasure>('kg');
  const [inputUnit, setInputUnit] = useState<string>('kg');
  const [unitCost, setUnitCost] = useState<number>(15.00); // This is TOTAL cost for the line item
  const [itemUnitPrice, setItemUnitPrice] = useState<number>(15.00); // Price per volume (pack/box/etc)
  const [hasExpiration, setHasExpiration] = useState(true); // Toggle de validade
  const [expirationDate, setExpirationDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d.toISOString().split('T')[0];
  });

  // Quantity x Size helper state
  const [packQty, setPackQty] = useState<number>(1);
  const [packUnit, setPackUnit] = useState<string>('un');
  const [unitsPerPack, setUnitsPerPack] = useState<number>(1);

  const handleToggleNewMaterial = () => {
    const nextState = !isNewMaterial;
    setIsNewMaterial(nextState);
    if (nextState && !newCode) {
      setNewCode(`INS-${Date.now().toString().slice(-6)}`);
    }
  };

  // Auto-calculate total cost when quantity or unit price changes
  useEffect(() => {
    const total = packQty * itemUnitPrice;
    setUnitCost(Number(total.toFixed(2)));
  }, [packQty, itemUnitPrice]);

  if (!isOpen) return null;

  const handleSelectMaterial = (matId: string) => {
    setSelectedMatId(matId);
    const m = materials.find(x => x.id === matId);
    if (m) {
      setUnit(m.unit);
      setInputUnit(m.unit);
      setPackUnit('un');
      // If it's a discrete unit or has a specific package size, show it
      setUnitsPerPack(m.packageSize || 1);
      
      // If material is in 'un' and we have a package size, the user might want to enter price per package
      // But we default to current cost per base unit * packageSize for convenience
      const baseCost = m.currentCostPerUnit || m.costPerUnit || 10;
      const pricePerPack = baseCost * (m.packageSize || 1);
      setItemUnitPrice(pricePerPack);
      // unitCost will be updated by useEffect
      
      setHasExpiration(m.hasExpiration ?? true);
    }
  };

  const handleAddItemToInvoice = () => {
    let matId = selectedMatId;
    let matName = '';
    let matCode = '';

    // Calculate total input quantity: Quantity x Size (all in inputUnit)
    const rawTotalInputQty = packQty * unitsPerPack;
    
    // Convert everything to the Material's base unit (g, ml, un, m)
    const totalInBaseUnit = convertToBaseUnit(rawTotalInputQty, inputUnit as UnitOfMeasure);
    
    // Total quantity in Material's specified unit (e.g. if material is in kg, how many kg)
    const materialBaseFactor = convertToBaseUnit(1, unit);
    const actualQty = totalInBaseUnit / materialBaseFactor;

    // Total cost for the entire line (User input)
    const totalItemCost = unitCost;
    
    // Unit cost relative to the material's SPECIFIED unit (e.g. cost per kg)
    let actualUnitCost = actualQty > 0 ? Number((totalItemCost / actualQty).toFixed(6)) : 0;

    if (isNewMaterial) {
      if (!newName.trim() || !newCode.trim()) {
        alert('Informe o código e nome do novo insumo.');
        return;
      }
      matCode = newCode.trim().toUpperCase();
      matName = newName.trim();
      matId = `mat-${Date.now()}`;

      // Create new material in catalog
      addMaterial({
        code: matCode,
        name: matName,
        category: newCategory,
        unit,
        defaultSupplier: supplier || 'Fornecedor Principal',
        supplier: supplier || 'Fornecedor Principal',
        currentCostPerUnit: actualUnitCost,
        costPerUnit: actualUnitCost,
        packageSize: unitsPerPack,
        currentStock: 0,
        minStock: 5,
        hasExpiration
      });
    } else {
      const existing = materials.find(m => m.id === selectedMatId);
      if (!existing) {
        alert('Selecione um insumo para a nota fiscal.');
        return;
      }
      matId = existing.id;
      matName = existing.name;
      matCode = existing.code;
    }

    const newItem: PurchaseItem = {
      id: `pitem-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      materialId: matId,
      materialName: matName,
      materialCode: matCode,
      category: isNewMaterial ? newCategory : (materials.find(m => m.id === matId)?.category || 'Farinhas & Grãos'),
      quantityPurchased: actualQty,
      quantity: actualQty,
      unit,
      unitCost: actualUnitCost,
      packagePrice: itemUnitPrice,
      packageQuantity: unitsPerPack,
      totalCost: Number(totalItemCost.toFixed(2)),
      expirationDate: hasExpiration ? (expirationDate || undefined) : undefined,
      hasExpiration,
      integrateStock
    };

    setItems([...items, newItem]);

    // Reset item form inputs
    setSelectedMatId('');
    setIsNewMaterial(false);
    setNewCode('');
    setNewName('');
    setPackQty(1);
    setUnitsPerPack(1);
    setItemUnitPrice(15.00);
    // unitCost will be updated by useEffect
  };

  const handleRemoveItemFromInvoice = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const totalInvoiceCost = items.reduce((acc, item) => acc + item.totalCost, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      alert('Adicione ao menos um insumo/produto à nota fiscal.');
      return;
    }

    if (!supplier.trim()) {
      alert('Informe o fornecedor da nota fiscal.');
      return;
    }

    const selectedSupplierObj = localSuppliers.find(s => s.id === supplier);
    const supplierName = selectedSupplierObj ? selectedSupplierObj.name : supplier;

    const purchaseData = {
      supplier: supplierName.trim(),
      date: purchaseDate,
      purchaseDate: purchaseDate,
      items: items.map(item => ({ ...item, integrateStock })),
      totalCost: totalInvoiceCost,
      invoiceNumber: invoiceNumber.trim() ? invoiceNumber.trim() : undefined,
      paymentMethod: paymentMethod.trim() ? paymentMethod.trim() : undefined,
      notes: notes.trim() ? notes.trim() : undefined,
      integrateStock
    };

    if (editingPurchase) {
      updatePurchase(editingPurchase.id, purchaseData);
    } else {
      addPurchase(purchaseData);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-[#FAF7F2] dark:bg-[#2B2D31] rounded-none sm:rounded-2xl border-none sm:border border-[#E5DACF] dark:border-[#3F4147] shadow-xl w-full max-w-4xl min-h-screen sm:min-h-0 sm:max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-4 border-b border-[#EBE1D7] dark:border-[#3F4147] flex items-center justify-between bg-[#F4EFEA] dark:bg-[#1E1F22] sticky top-0 z-20">
          <div>
            <h2 className="font-serif-brand text-lg sm:text-xl font-bold text-[#382628] dark:text-[#FFFFFF] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#B86B77]" />
              <span>{editingPurchase ? 'Editar Nota Fiscal / Recibo' : 'Registrar Nota (NF-e)'}</span>
            </h2>
            <p className="text-[10px] sm:text-xs text-[#7A6466] dark:text-[#B5BAC1]">Entrada de insumos e atualização de estoque</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[#EBE1D7] dark:hover:bg-[#35373C] rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-[#543E40] dark:text-[#B5BAC1]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 sm:space-y-8 bg-white/30 dark:bg-transparent">
          
          {/* Header Info: Invoice, Supplier, Date */}
          <div className="p-4 bg-white dark:bg-[#1E1F22] rounded-xl border border-[#E8DFD5] dark:border-[#3F4147] space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C7678] dark:text-[#B5BAC1] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#B86B77]" />
              <span>1. Dados da Nota Fiscal / Recibo</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#543E40] dark:text-[#FFFFFF] mb-1">Nº da Nota Fiscal (NF-e) *</label>
                <input
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  placeholder="Ex: NFE-90412"
                  className="w-full text-xs px-3 py-2 bg-[#FAF7F2] dark:bg-[#2B2D31] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white font-bold"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#543E40] dark:text-[#FFFFFF]">Fornecedor / Distribuidor *</label>
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
                  value={supplier}
                  onChange={e => setSupplier(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-[#FAF7F2] dark:bg-[#2B2D31] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white cursor-pointer"
                >
                  <option value="">Selecione um fornecedor</option>
                  {/* 3) Mapeamento correto exibindo cada option com id e name */}
                  {localSuppliers.map((sup) => (
                    <option key={sup.id} value={sup.id}>{sup.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#543E40] dark:text-[#FFFFFF] mb-1">Data de Emissão / Entrada *</label>
                <input
                  type="date"
                  required
                  value={purchaseDate}
                  onChange={e => setPurchaseDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-[#FAF7F2] dark:bg-[#2B2D31] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#543E40] dark:text-[#FFFFFF] mb-1">Forma de Pagamento</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-[#FAF7F2] dark:bg-[#2B2D31] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white font-bold cursor-pointer"
                >
                  <option value="">Selecione...</option>
                  <option value="Pix">Pix</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                  <option value="Boleto">Boleto</option>
                  <option value="Transferência">Transferência</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
            </div>

            {/* Stock Integration Choice */}
            <div className="pt-3 border-t border-[#F0E6DC] dark:border-[#3F4147]">
              <label className="block text-[11px] font-bold text-[#543E40] dark:text-[#FFFFFF] mb-2 uppercase tracking-wider">Destino dos Itens desta Nota Fiscal</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIntegrateStock(true)}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    integrateStock 
                      ? 'bg-amber-50 dark:bg-[#342D25] border-amber-500 text-[#382628] dark:text-amber-200 shadow-xs' 
                      : 'bg-[#FAF7F2] dark:bg-[#2B2D31] border-[#DACDC0] dark:border-[#3F4147] text-[#7A6466] dark:text-[#B5BAC1] hover:bg-[#F3EBE0]'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 ${integrateStock ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600' : 'bg-gray-100 dark:bg-[#1E1F22]'}`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">Integrar e Lançar no Estoque Físico</div>
                    <p className="text-[10px] mt-0.5 opacity-80 leading-normal">Soma as quantidades no estoque e cria lotes com data de validade.</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setIntegrateStock(false)}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    !integrateStock 
                      ? 'bg-amber-50 dark:bg-[#342D25] border-amber-500 text-[#382628] dark:text-amber-200 shadow-xs' 
                      : 'bg-[#FAF7F2] dark:bg-[#2B2D31] border-[#DACDC0] dark:border-[#3F4147] text-[#7A6466] dark:text-[#B5BAC1] hover:bg-[#F3EBE0]'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 ${!integrateStock ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600' : 'bg-gray-100 dark:bg-[#1E1F22]'}`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">Apenas Entrada Fiscal / Financeira</div>
                    <p className="text-[10px] mt-0.5 opacity-80 leading-normal">Registra apenas a nota fiscal e despesa, sem alterar o estoque físico.</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Item Add Control Section */}
          <div className="p-4 bg-[#F5EDE3] dark:bg-[#1E1F22] rounded-xl border border-[#E5DACF] dark:border-[#3F4147] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6E5558] dark:text-[#B5BAC1] flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-[#B86B77]" />
                <span>2. Adicionar Produtos Comprados na NF-e</span>
              </h3>

              <button
                type="button"
                onClick={handleToggleNewMaterial}
                className="text-xs font-bold text-[#B86B77] dark:text-[#E295A1] hover:underline cursor-pointer"
              >
                {isNewMaterial ? '← Escolher Insumo Existente' : '+ Novo Insumo no Catálogo'}
              </button>
            </div>

            {!isNewMaterial ? (
              <div>
                <label className="block text-[11px] font-semibold text-[#5E474A] dark:text-[#FFFFFF] mb-1">Selecione o Insumo do Catálogo *</label>
                <select
                  value={selectedMatId}
                  onChange={e => handleSelectMaterial(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#D5C6B8] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
                >
                  <option value="">Selecione o produto comprado...</option>
                  {materials.map((m, index) => (
                    <option key={m.id ? `pm-${m.id}` : `pm-idx-${index}`} value={m.id}>
                      [{m.code}] {m.name} ({m.category}) - Estoque: {m.currentStock}{m.unit}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-3 bg-white/80 dark:bg-[#2B2D31] rounded-xl border border-[#D8C7B8] dark:border-[#3F4147] space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-semibold text-[#5E474A] dark:text-[#FFFFFF] mb-1">Código / SKU *</label>
                    <input
                      type="text"
                      placeholder="Ex: INS-CHO-05"
                      value={newCode}
                      onChange={e => setNewCode(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-[#1E1F22] rounded-md border border-[#D5C6B8] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white font-bold"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <label className="block text-[10px] font-semibold text-[#5E474A] dark:text-[#FFFFFF] mb-1">Nome do Insumo *</label>
                    <input
                      type="text"
                      placeholder="Ex: Chocolate Em Gotas 70%"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-[#1E1F22] rounded-md border border-[#D5C6B8] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-semibold text-[#5E474A] dark:text-[#FFFFFF] mb-1">Categoria *</label>
                    <select
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value)}
                      className="w-full text-xs px-2 py-1.5 bg-white dark:bg-[#1E1F22] rounded-md border border-[#D5C6B8] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
                    >
                      {materialCategories.map((cat, index) => (
                        <option key={cat ? `pm-${cat}` : `pm-idx-${index}`} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Item Details: Quantity, Size, Unit and Cost */}
            <div className="p-4 bg-white dark:bg-[#1E1F22] rounded-xl border border-[#D5C6B8] dark:border-[#3F4147] space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold text-[#5E474A] dark:text-[#FFFFFF] mb-1 uppercase tracking-tight">Qtd Comprada (Volumes)</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      min="0.001"
                      step="any"
                      value={packQty}
                      onChange={e => setPackQty(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs px-2.5 py-2 bg-[#FAF7F2] dark:bg-[#2B2D31] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white font-bold"
                      placeholder="Ex: 2.5"
                    />
                    <select
                      value={packUnit}
                      onChange={e => setPackUnit(e.target.value)}
                      className="px-1.5 py-2 text-[10px] bg-[#FAF7F2] dark:bg-[#2B2D31] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white font-bold cursor-pointer"
                    >
                      <option value="un">un</option>
                      <option value="pct">pct</option>
                      <option value="cx">cx</option>
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="l">l</option>
                      <option value="ml">ml</option>
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold text-[#5E474A] dark:text-[#FFFFFF] mb-1 uppercase tracking-tight">Conteúdo p/ Volume</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      min="0.001"
                      step="any"
                      value={unitsPerPack}
                      onChange={e => setUnitsPerPack(parseFloat(e.target.value) || 1)}
                      className="w-full text-xs px-2.5 py-2 bg-[#FAF7F2] dark:bg-[#2B2D31] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white font-bold"
                      placeholder="Ex: 900"
                    />
                    <select
                      value={inputUnit}
                      onChange={e => setInputUnit(e.target.value)}
                      className="px-1.5 py-2 text-[10px] bg-[#FAF7F2] dark:bg-[#2B2D31] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white font-bold cursor-pointer"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="l">l</option>
                      <option value="ml">ml</option>
                      <option value="un">un</option>
                      <option value="pct">pct</option>
                      <option value="cx">cx</option>
                      <option value="m">m</option>
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-[#5E474A] dark:text-[#FFFFFF] mb-1 uppercase tracking-tight">Valor Unitário (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemUnitPrice}
                    onChange={e => setItemUnitPrice(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-2.5 py-2 bg-[#FAF7F2] dark:bg-[#2B2D31] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white font-bold"
                    placeholder="Ex: 50.00"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-[#5E474A] dark:text-[#FFFFFF] mb-1 uppercase tracking-tight">Preço Pago Total (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={unitCost}
                    onChange={e => setUnitCost(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-2.5 py-2 bg-white dark:bg-[#2B2D31] rounded-lg border border-emerald-200 dark:border-emerald-900/40 text-[#3D2C2E] dark:text-white font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                    <p className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Resumo:
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Total: <span className="font-bold">{(packQty * unitsPerPack).toFixed(2)} {inputUnit}</span>
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      Custo Unit.: <span className="font-bold">R$ {(unitsPerPack > 0 ? (unitCost / packQty) / unitsPerPack : 0).toFixed(2)}/{inputUnit}</span>
                    </p>
                  </div>
                </div>

                <div className="sm:col-span-12 bg-emerald-50 dark:bg-emerald-900/10 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/20">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[9px] font-bold text-emerald-800 dark:text-emerald-400 uppercase">Subtotal do Item na Nota</span>
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">R$ {unitCost.toFixed(2)}</span>
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-500 italic">
                    Integrando: {packQty} {packUnit} de {unitsPerPack} {inputUnit} cada ({packQty * unitsPerPack} {inputUnit} total) ao estoque
                  </div>
                </div>
              </div>
            </div>

            {/* Expiration date toggle and input */}
            <div className="p-3 bg-white dark:bg-[#2B2D31] rounded-xl border border-[#D5C6B8] dark:border-[#3F4147] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasExpirationCheckbox"
                  checked={hasExpiration}
                  onChange={e => setHasExpiration(e.target.checked)}
                  className="rounded border-[#D5C6B8] dark:border-[#3F4147] text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="hasExpirationCheckbox" className="text-xs font-bold text-[#5E474A] dark:text-[#FFFFFF] cursor-pointer flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  <span>Este produto possui data de validade / vencimento?</span>
                </label>
              </div>

              {hasExpiration ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-semibold text-[#5E474A] dark:text-[#FFFFFF]">Vencimento:</span>
                  <input
                    type="date"
                    required
                    value={expirationDate}
                    onChange={e => setExpirationDate(e.target.value)}
                    className="text-xs px-2.5 py-1.5 bg-white dark:bg-[#2B2D31] rounded-lg border border-amber-300 dark:border-amber-700/60 text-[#3D2C2E] dark:text-white font-medium"
                  />
                </div>
              ) : (
                <span className="text-xs text-stone-400 dark:text-[#949BA4] italic">Insumo não perecível</span>
              )}
            </div>

            <button
              type="button"
              onClick={handleAddItemToInvoice}
              className="w-full py-2 bg-[#594446] dark:bg-[#383A40] hover:bg-[#433234] dark:hover:bg-[#474A51] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 mt-2 shadow-xs"
            >
              <Plus className="w-4 h-4 text-amber-300" />
              <span>Incluir Produto na Nota Fiscal</span>
            </button>
          </div>

          {/* Table of Items in NF-e */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A6466] dark:text-[#B5BAC1]">
                3. Lista de Produtos Nesta Nota Fiscal ({items.length} itens)
              </h3>
              <span className="text-xs font-bold text-[#352527] dark:text-[#FFFFFF]">
                Total da Nota: <strong className="text-sm font-serif-brand text-[#9E5460] dark:text-emerald-400">R$ {totalInvoiceCost.toFixed(2)}</strong>
              </span>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-6 bg-white dark:bg-[#1E1F22] rounded-xl border border-dashed border-[#DACDC0] dark:border-[#3F4147] text-xs text-[#8C7577] dark:text-[#B5BAC1]">
                Nenhum produto incluído nesta Nota Fiscal ainda. Preencha o formulário acima e clique em "Incluir Produto".
              </div>
            ) : (
              <div className="overflow-hidden border border-[#E8DFD5] dark:border-[#3F4147] rounded-xl bg-white dark:bg-[#2B2D31] shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F4EDE5] dark:bg-[#1E1F22] text-[#594446] dark:text-[#FFFFFF] border-b border-[#E8DFD5] dark:border-[#3F4147] font-semibold text-[11px]">
                    <tr>
                      <th className="p-2.5">Código / Produto</th>
                      <th className="p-2.5 text-center">Quantidade</th>
                      <th className="p-2.5 text-right">Preço Embalagem</th>
                      <th className="p-2.5 text-right">Custo Unit.</th>
                      <th className="p-2.5 text-right">Subtotal</th>
                      <th className="p-2.5 text-center">Validade</th>
                      <th className="p-2.5 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0E6DC] dark:divide-[#3F4147]">
                    {items.map((item, idx) => (
                      <tr key={item.id ? `pm-${item.id}` : `pm-idx-${idx}`} className="hover:bg-[#FAF7F2] dark:hover:bg-[#35373C] transition-colors">
                        <td className="p-2.5 font-medium text-[#352527] dark:text-[#FFFFFF]">
                          <span className="text-[10px] bg-stone-100 dark:bg-[#383A40] text-stone-600 dark:text-[#B5BAC1] px-1.5 py-0.5 rounded font-mono mr-1.5">
                            {item.materialCode}
                          </span>
                          {item.materialName}
                        </td>
                        <td className="p-2.5 text-center font-bold text-[#594446] dark:text-[#FFFFFF]">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="p-2.5 text-right text-[#7A6466] dark:text-[#B5BAC1]">
                          {item.packagePrice ? `R$ ${item.packagePrice.toFixed(2)}` : '-'}
                        </td>
                        <td className="p-2.5 text-right text-[#7A6466] dark:text-[#B5BAC1]">
                          R$ {item.unitCost.toFixed(2)}
                        </td>
                        <td className="p-2.5 text-right font-bold text-[#352527] dark:text-[#FFFFFF]">
                          R$ {item.totalCost.toFixed(2)}
                        </td>
                        <td className="p-2.5 text-center">
                          {item.expirationDate ? (
                            <span className="text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800/40 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                              {new Date(item.expirationDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </span>
                          ) : (
                            <span className="text-stone-400 dark:text-[#949BA4] text-[10px]">Sem validade</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemFromInvoice(idx)}
                            className="p-1 text-stone-400 dark:text-[#B5BAC1] hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#543E40] dark:text-[#FFFFFF] mb-1">Observações da Nota Fiscal</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Entrega realizada pelo motorista Marcos, pagamento via boleto 30 dias"
              className="w-full text-xs px-3 py-2 bg-white dark:bg-[#1E1F22] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
            />
          </div>

          {/* Footer - Sticky on mobile */}
          <div className="sticky bottom-0 -mx-5 -mb-5 sm:mx-0 sm:mb-0 px-5 py-4 sm:px-0 sm:py-3 bg-[#FAF7F2] dark:bg-[#2B2D31] sm:bg-transparent border-t border-[#E8DFD5] dark:border-[#3F4147] sm:border-t-0 flex items-center justify-end gap-3 z-10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 py-3 sm:py-2 text-sm sm:text-xs font-semibold rounded-xl border border-[#D5C5B5] dark:border-[#3F4147] bg-white dark:bg-[#1E1F22] text-[#553F41] dark:text-[#FFFFFF] hover:bg-[#F3ECE2] dark:hover:bg-[#35373C] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-none px-6 py-3 sm:py-2 text-sm sm:text-xs font-bold rounded-xl bg-[#B86B77] hover:bg-[#9E5460] text-white shadow-md sm:shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Registrar NF-e</span>
            </button>
          </div>

        </form>

      </div>

      {showSupplierManager && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-60 overflow-y-auto">
          <div className="bg-[#FAF7F2] dark:bg-[#2B2D31] rounded-2xl border border-[#E5DACF] dark:border-[#3F4147] shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EBE1D7] dark:border-[#3F4147] flex items-center justify-between bg-[#F4EFEA] dark:bg-[#1E1F22]">
              <h3 className="font-serif-brand text-base font-bold text-[#352527] dark:text-[#FFFFFF] flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#B86B77]" />
                <span>Gerenciar Fornecedores</span>
              </h3>
              <button
                type="button"
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
                    id="newModalSupplierInput"
                    placeholder="Ex: Distribuidora Central Ltda"
                    value={newSupplierName}
                    onChange={e => setNewSupplierName(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 bg-white dark:bg-[#1E1F22] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white font-bold"
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newSupplierName.trim()) {
                          const created = await addSupplier({ name: newSupplierName.trim() });
                          setNewSupplierName('');
                          await fetchSuppliers(); // Atualiza lista local
                          if (created?.id) {
                            setSupplier(created.id);
                          }
                          setShowSupplierManager(false);
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (newSupplierName.trim()) {
                        const created = await addSupplier({ name: newSupplierName.trim() });
                        setNewSupplierName('');
                        await fetchSuppliers(); // Atualiza lista local
                        if (created?.id) {
                          setSupplier(created.id);
                        }
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
                      onUpdate={async (newName) => {
                        await updateSupplier(sup.id, { name: newName });
                        await fetchSuppliers();
                      }}
                      onDelete={async () => {
                        if (confirm(`Tem certeza que deseja remover o fornecedor "${sup.name}" da lista de seleção rápida?`)) {
                          await deleteSupplier(sup.id);
                          await fetchSuppliers();
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

