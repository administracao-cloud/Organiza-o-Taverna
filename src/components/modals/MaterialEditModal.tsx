import React, { useState, useEffect } from 'react';
import { X, Save, Box, Info, Sparkles } from 'lucide-react';
import { Material, UnitOfMeasure } from '../../types';
import { useBakery } from '../../context/BakeryContext';
import { convertToBaseUnit } from '../../utils/units';

interface MaterialEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: Material | null;
}

export const MaterialEditModal: React.FC<MaterialEditModalProps> = ({ isOpen, onClose, material }) => {
  const { updateMaterial, addMaterial, materialCategories, suppliers } = useBakery();
  
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState<UnitOfMeasure>('kg');
  const [currentCostPerUnit, setCurrentCostPerUnit] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(0);
  const [packageSize, setPackageSize] = useState<number>(1);
  const [lastPackagePrice, setLastPackagePrice] = useState<number>(0);
  const [defaultSupplier, setDefaultSupplier] = useState('');
  const [calcPackPrice, setCalcPackPrice] = useState<number>(0);
  const [calcPackQty, setCalcPackQty] = useState<number>(1);

  const isNew = material?.id === 'new';

  useEffect(() => {
    if (material && !isNew) {
      setName(material.name);
      setCode(material.code);
      setCategory(material.category);
      setUnit(material.unit);
      setCurrentCostPerUnit(material.currentCostPerUnit ?? material.costPerUnit ?? 0);
      setMinStock(material.minStock ?? 0);
      setPackageSize(material.packageSize ?? 1);
      setLastPackagePrice(material.lastPackagePrice ?? 0);
      setDefaultSupplier(material.defaultSupplier || material.supplier || '');
      setCalcPackQty(material.packageSize ?? 1);
    } else if (isNew) {
      setName('');
      setCode(`INS-${Date.now().toString().slice(-6)}`);
      setCategory(materialCategories[0] || 'Outros');
      setUnit('kg');
      setCurrentCostPerUnit(0);
      setMinStock(0);
      setPackageSize(1);
      setLastPackagePrice(0);
      setDefaultSupplier('');
      setCalcPackQty(1);
      setCalcPackPrice(0);
    }
  }, [material, isOpen, materialCategories, isNew]);

  if (!isOpen || !material) return null;

  const handleCalcCost = () => {
    if (calcPackQty > 0) {
      const unitCost = calcPackPrice / calcPackQty;
      // High precision as requested (6 decimal places)
      setCurrentCostPerUnit(Number(unitCost.toFixed(2)));
      setPackageSize(calcPackQty);
      setLastPackagePrice(calcPackPrice);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Recalculate cost per gram/base unit
    const baseQtyPerUnit = convertToBaseUnit(1, unit);
    const costPerGram = baseQtyPerUnit > 0 ? currentCostPerUnit / baseQtyPerUnit : currentCostPerUnit;

    const materialData = {
      name,
      code,
      category,
      unit,
      currentCostPerUnit,
      costPerUnit: currentCostPerUnit,
      costPerGram: Number(costPerGram.toFixed(6)),
      minStock,
      packageSize,
      lastPackagePrice,
      size: packageSize, // Aligning with PurchasesView structure
      sizeUnit: unit,
      defaultSupplier,
      supplier: defaultSupplier,
      currentStock: isNew ? 0 : material.currentStock
    };

    if (isNew) {
      addMaterial(materialData);
    } else {
      updateMaterial(material.id, materialData);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-2xl border border-[#E5DACF] dark:border-[#3F4147] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-[#EBE1D7] dark:border-[#3F4147] flex items-center justify-between bg-[#F4EFEA] dark:bg-[#2B2D31]">
          <div className="flex items-center gap-2">
            <Box className="w-5 h-5 text-[#B86B77]" />
            <h3 className="font-serif-brand text-lg font-bold text-[#352527] dark:text-[#FFFFFF]">
              {isNew ? 'Novo Insumo' : 'Editar Insumo'}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-[#5E474A] dark:text-[#FFFFFF] mb-1 uppercase tracking-wider">Nome do Insumo</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full text-sm px-3 py-2 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#D5C6B8] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white focus:ring-2 focus:ring-[#B86B77] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#5E474A] dark:text-[#FFFFFF] mb-1 uppercase tracking-wider">Código / SKU</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full text-sm px-3 py-2 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#D5C6B8] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#5E474A] dark:text-[#FFFFFF] mb-1 uppercase tracking-wider">Categoria</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full text-sm px-3 py-2 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#D5C6B8] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
              >
                {materialCategories.map((cat, index) => (
                  <option key={cat ? `pm-${cat}` : `pm-idx-${index}`} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#5E474A] dark:text-[#FFFFFF] mb-1 uppercase tracking-wider">Unidade Base</label>
              <select
                value={unit}
                onChange={e => setUnit(e.target.value as UnitOfMeasure)}
                className="w-full text-sm px-3 py-2 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#D5C6B8] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white font-bold"
              >
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="l">l</option>
                <option value="ml">ml</option>
                <option value="un">un</option>
                <option value="pct">pct</option>
                <option value="cx">cx</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#5E474A] dark:text-[#FFFFFF] mb-1 uppercase tracking-wider">Custo por {unit}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={currentCostPerUnit}
                  onChange={e => setCurrentCostPerUnit(parseFloat(e.target.value) || 0)}
                  className="w-full text-sm pl-9 pr-3 py-2 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#D5C6B8] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#5E474A] dark:text-[#FFFFFF] mb-1 uppercase tracking-wider">Estoque Mínimo</label>
              <input
                type="number"
                value={minStock}
                onChange={e => setMinStock(parseFloat(e.target.value) || 0)}
                className="w-full text-sm px-3 py-2 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#D5C6B8] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#5E474A] dark:text-[#FFFFFF] mb-1 uppercase tracking-wider">Fornecedor Principal</label>
              <select
                value={defaultSupplier}
                onChange={e => setDefaultSupplier(e.target.value)}
                className="w-full text-sm px-3 py-2 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#D5C6B8] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
              >
                <option value="">Selecione um fornecedor</option>
                {suppliers.map((sup, index) => (
                  <option key={sup.id ? `pm-${sup.id}` : `pm-idx-${index}`} value={sup.name}>{sup.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#5E474A] dark:text-[#FFFFFF] mb-1 uppercase tracking-wider text-amber-700 dark:text-amber-400">Tamanho da Embalagem</label>
              <input
                type="number"
                value={packageSize}
                onChange={e => setPackageSize(parseFloat(e.target.value) || 1)}
                className="w-full text-sm px-3 py-2 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-900/30 text-[#3D2C2E] dark:text-white font-bold"
              />
              <p className="text-[10px] text-amber-600 mt-1">Ex: 30 p/ bandeja de ovos</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#5E474A] dark:text-[#FFFFFF] mb-1 uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Último Preço Embalagem (Ref)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 text-sm">R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={lastPackagePrice}
                  onChange={e => setLastPackagePrice(parseFloat(e.target.value) || 0)}
                  className="w-full text-sm pl-9 pr-3 py-2 bg-emerald-50 dark:bg-emerald-950/10 rounded-lg border border-emerald-200 dark:border-emerald-800/30 text-[#3D2C2E] dark:text-white font-bold"
                />
              </div>
            </div>
          </div>

          {/* New Price Calculator Section */}
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
            <h4 className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Calculadora de Custo por Embalagem
            </h4>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-300 mb-1">Unidade de Medida da Embalagem</label>
                <select
                  value={unit}
                  onChange={e => setUnit(e.target.value as UnitOfMeasure)}
                  className="w-full text-xs px-2 py-1.5 bg-white dark:bg-[#1E1F22] rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  <option value="kg">kg (Quilograma)</option>
                  <option value="g">g (Grama)</option>
                  <option value="l">l (Litro)</option>
                  <option value="ml">ml (Mililitro)</option>
                  <option value="un">un (Unidade)</option>
                  <option value="pct">pct (Pacote)</option>
                  <option value="cx">cx (Caixa)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-300 mb-1">Preço Pago na Embalagem</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600 text-[10px]">R$</span>
                  <input
                    type="number"
                    value={calcPackPrice}
                    onChange={e => setCalcPackPrice(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs pl-7 pr-2 py-1.5 bg-white dark:bg-[#1E1F22] rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 focus:ring-1 focus:ring-emerald-500 outline-none"
                    placeholder="Ex: 30,00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-300 mb-1">Qtd na Embalagem</label>
                <input
                  type="number"
                  value={calcPackQty}
                  onChange={e => setCalcPackQty(parseFloat(e.target.value) || 1)}
                  className="w-full text-xs px-2 py-1.5 bg-white dark:bg-[#1E1F22] rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 focus:ring-1 focus:ring-emerald-500 outline-none"
                  placeholder="Ex: 30"
                />
              </div>
              <button
                type="button"
                onClick={handleCalcCost}
                className="col-span-2 py-2 text-[10px] font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                Calcular e Aplicar Custo Unitário
              </button>
            </div>
            {calcPackPrice > 0 && calcPackQty > 0 && (
              <p className="mt-2 text-[10px] text-emerald-600 dark:text-emerald-400 text-center italic">
                Resultado: R$ {(calcPackPrice / calcPackQty).toFixed(2)} por {unit}
              </p>
            )}
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30 flex gap-3">
            <Info className="w-5 h-5 text-blue-500 shrink-0" />
            <div className="text-[11px] text-blue-700 dark:text-blue-300 space-y-1">
              <p>Ao editar o custo, o sistema atualizará o cálculo de todas as fichas técnicas vinculadas.</p>
              <p className="font-bold">Custo calculado por grama/unidade: R$ {(currentCostPerUnit / convertToBaseUnit(1, unit)).toFixed(2)}</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-bold text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-[#2B2D31] rounded-xl hover:bg-stone-200 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-[2] py-2.5 text-sm font-bold text-white bg-[#B86B77] rounded-xl hover:bg-[#A35D68] shadow-md shadow-[#B86B77]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {isNew ? 'Cadastrar Insumo' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const MaterialModal = MaterialEditModal;
export default MaterialEditModal;
