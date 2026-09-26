import React, { useState, useEffect } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { TechnicalSheet, TechnicalSheetIngredient, UnitOfMeasure } from '../../types';
import { X, Plus, Trash2, Clock, Wrench, ChefHat, Sparkles, Layers, FileSpreadsheet } from 'lucide-react';
import { convertToBaseUnit, formatQuantity } from '../../utils/units';

interface TechnicalSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheetToEdit?: TechnicalSheet | null;
}

export const TechnicalSheetModal: React.FC<TechnicalSheetModalProps> = ({
  isOpen,
  onClose,
  sheetToEdit
}) => {
  const { materials, addTechnicalSheet, updateTechnicalSheet, isInitialLoading } = useBakery();

  // Basic Info
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<TechnicalSheet['category']>('Panificação Artesanal');
  const [version, setVersion] = useState('v1.0');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [responsible, setResponsible] = useState('Chef Mariana Duval');
  const [description, setDescription] = useState('');
  
  // Yield & Packaging
  const [yieldAmount, setYieldAmount] = useState<number>(1);
  const [yieldUnit, setYieldUnit] = useState('unidades');
  const [cookingLossPercent, setCookingLossPercent] = useState<number>(12); // Perda no Forno / Cocção (%)
  const [packagingMaterialCost, setPackagingMaterialCost] = useState<number>(3.50);
  const [basePrice, setBasePrice] = useState<number>(25.00);

  // Times
  const [prepMinutes, setPrepMinutes] = useState<number>(30);
  const [fermentationMinutes, setFermentationMinutes] = useState<number>(120);
  const [bakingMinutes, setBakingMinutes] = useState<number>(35);
  const [finishingMinutes, setFinishingMinutes] = useState<number>(15);

  // Equipment
  const [equipmentList, setEquipmentList] = useState<string[]>([
    'Forno de lastro com vapor',
    'Batedeira planetária'
  ]);
  const [newEquipmentInput, setNewEquipmentInput] = useState('');

  // Ingredients
  const [ingredients, setIngredients] = useState<TechnicalSheetIngredient[]>([]);
  const [selectedMatId, setSelectedMatId] = useState('');
  const [ingQuantity, setIngQuantity] = useState<number>(100);
  const [ingCorrectionFactor, setIngCorrectionFactor] = useState<number>(1.0); // FC = Peso Bruto / Peso Líquido (padrão 1.0)
  const [ingUnit, setIngUnit] = useState<UnitOfMeasure>('g');

  // Steps
  const [steps, setSteps] = useState<{ stepNumber: number; title: string; description: string }[]>([
    { stepNumber: 1, title: 'Mise en place & Peneiramento', description: 'Separar todos os ingredientes pesados com precisão e climatizados.' }
  ]);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepDesc, setNewStepDesc] = useState('');

  // Shelf Life (Validade dos Produtos Prontos conforme Armazenamento)
  const [shelfLifeAmbient, setShelfLifeAmbient] = useState('3 dias (Local fresco, seco e arejado)');
  const [shelfLifeRefrigerated, setShelfLifeRefrigerated] = useState('7 dias (Sob refrigeração de 2°C a 6°C)');
  const [shelfLifeFrozen, setShelfLifeFrozen] = useState('60 dias (Congelador a -18°C)');
  const [shelfLifeNotes, setShelfLifeNotes] = useState('Embalar bem para evitar absorção de umidade e odores.');

  useEffect(() => {
    if (sheetToEdit) {
      setSku(sheetToEdit.sku);
      setName(sheetToEdit.name);
      setCategory(sheetToEdit.category);
      setVersion(sheetToEdit.version);
      setDate(sheetToEdit.date);
      setResponsible(sheetToEdit.responsible);
      setDescription(sheetToEdit.description);
      setYieldAmount(sheetToEdit.yieldAmount);
      setYieldUnit(sheetToEdit.yieldUnit);
      setCookingLossPercent(sheetToEdit.cookingLossPercent ?? 12);
      setPackagingMaterialCost(sheetToEdit.packagingMaterialCost || 0);
      setBasePrice(sheetToEdit.basePrice || 0);
      setPrepMinutes(sheetToEdit.estimatedTime.prepMinutes);
      setFermentationMinutes(sheetToEdit.estimatedTime.fermentationMinutes);
      setBakingMinutes(sheetToEdit.estimatedTime.bakingMinutes);
      setFinishingMinutes(sheetToEdit.estimatedTime.finishingMinutes);
      setEquipmentList(sheetToEdit.requiredEquipment || []);
      setIngredients(sheetToEdit.ingredients || []);
      setSteps(sheetToEdit.productionSteps || []);
      setShelfLifeAmbient(sheetToEdit.shelfLife?.ambient || '3 dias (Local fresco e seco)');
      setShelfLifeRefrigerated(sheetToEdit.shelfLife?.refrigerated || '7 dias (2°C a 6°C)');
      setShelfLifeFrozen(sheetToEdit.shelfLife?.frozen || '60 dias (-18°C)');
      setShelfLifeNotes(sheetToEdit.shelfLife?.notes || '');
    } else {
      setSku(`SAB-ART-0${Math.floor(10 + Math.random() * 90)}`);
      setName('');
      setCategory('Panificação Artesanal');
      setVersion('v1.0');
      setDate(new Date().toISOString().split('T')[0]);
      setResponsible('Chef Pâtissière Mariana Duval');
      setDescription('');
      setYieldAmount(1);
      setYieldUnit('unidades');
      setCookingLossPercent(12);
      setPackagingMaterialCost(3.50);
      setBasePrice(35.00);
      setPrepMinutes(30);
      setFermentationMinutes(120);
      setBakingMinutes(35);
      setFinishingMinutes(15);
      setEquipmentList(['Forno de lastro com vapor', 'Batedeira planetária']);
      setIngredients([]);
      setSteps([
        { stepNumber: 1, title: 'Mise en place', description: 'Pesar e ambientar todos os ingredientes com rigor técnico.' }
      ]);
      setShelfLifeAmbient('3 dias (Local fresco, seco e arejado)');
      setShelfLifeRefrigerated('7 dias (Sob refrigeração de 2°C a 6°C)');
      setShelfLifeFrozen('60 dias (Congelador a -18°C)');
      setShelfLifeNotes('Embalar bem para manter a qualidade sensorial.');
    }
  }, [sheetToEdit, isOpen]);

  if (!isOpen) return null;

  const handleAddIngredient = () => {
    if (!selectedMatId) return;
    const mat = materials.find(m => m.id === selectedMatId);
    if (!mat) return;

    // Calculate cost per base unit (g, ml, un, m)
    const costPerBaseUnit = mat.costPerGram || (mat.currentCostPerUnit ? mat.currentCostPerUnit / convertToBaseUnit(1, mat.unit) : 0);
    
    // Fator de Correção (FC = Peso Bruto / Peso Líquido)
    const fc = Math.max(1.0, Number(ingCorrectionFactor) || 1.0);
    const grossQty = Number((ingQuantity * fc).toFixed(3));
    const wastePercent = Number(((fc - 1) * 100).toFixed(1));

    // Convert gross quantity to base unit (abate o custo da matéria-prima bruta incluindo aparas/cascas)
    const grossQuantityInBaseUnit = convertToBaseUnit(grossQty, ingUnit);
    const subtotal = grossQuantityInBaseUnit * costPerBaseUnit;

    const newIng: TechnicalSheetIngredient = {
      materialId: mat.id,
      materialName: mat.name,
      unit: ingUnit,
      quantityUsed: ingQuantity,
      grossQuantity: grossQty,
      correctionFactor: fc,
      wastePercent: wastePercent,
      costPerGram: Number(costPerBaseUnit.toFixed(6)),
      subtotalCost: Number(subtotal.toFixed(4))
    };

    setIngredients([...ingredients, newIng]);
    setSelectedMatId('');
    setIngQuantity(100);
    setIngCorrectionFactor(1.0);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, idx) => idx !== index));
  };

  const handleAddEquipment = () => {
    if (newEquipmentInput.trim() && !equipmentList.includes(newEquipmentInput.trim())) {
      setEquipmentList([...equipmentList, newEquipmentInput.trim()]);
      setNewEquipmentInput('');
    }
  };

  const handleRemoveEquipment = (index: number) => {
    setEquipmentList(equipmentList.filter((_, idx) => idx !== index));
  };

  const handleAddStep = () => {
    if (!newStepTitle.trim() || !newStepDesc.trim()) return;
    const newStep = {
      stepNumber: steps.length + 1,
      title: newStepTitle.trim(),
      description: newStepDesc.trim()
    };
    setSteps([...steps, newStep]);
    setNewStepTitle('');
    setNewStepDesc('');
  };

  const handleRemoveStep = (index: number) => {
    const updated = steps.filter((_, idx) => idx !== index).map((s, idx) => ({
      ...s,
      stepNumber: idx + 1
    }));
    setSteps(updated);
  };

  // Total raw batch weight in grams
  const rawBatchWeightGrams = (ingredients || []).reduce((acc, it) => {
    if (!it) return acc;
    if (it.unit === 'g') return acc + it.quantityUsed;
    if (it.unit === 'kg') return acc + (it.quantityUsed * 1000);
    if (it.unit === 'ml') return acc + it.quantityUsed;
    if (it.unit === 'l') return acc + (it.quantityUsed * 1000);
    return acc;
  }, 0);

  // Oven / Cooking loss: Peso Assado = Peso Cru * (1 - perda / 100)
  const cookingLoss = Math.min(99, Math.max(0, Number(cookingLossPercent) || 0));
  const cookingIndex = 1 - (cookingLoss / 100);
  const bakedWeightGrams = rawBatchWeightGrams > 0 ? rawBatchWeightGrams * cookingIndex : 0;
  const unitBakedWeightGrams = yieldAmount > 0 && bakedWeightGrams > 0 ? (bakedWeightGrams / yieldAmount) : 0;

  const totalIngredientsCost = (ingredients || []).reduce((acc, it) => acc + (it?.subtotalCost || 0), 0);
  const totalRecipeCost = totalIngredientsCost + Number(packagingMaterialCost || 0);
  const costPerYieldUnit = yieldAmount > 0 ? totalRecipeCost / yieldAmount : 0;
  const totalMinutes = prepMinutes + fermentationMinutes + bakingMinutes + finishingMinutes;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim()) {
      alert('Preencha o nome e SKU da ficha técnica.');
      return;
    }

    let finalIngredients = [...ingredients];
    if (selectedMatId && confirm('Você tem um insumo selecionado que ainda não foi adicionado à lista. Deseja incluí-lo automaticamente agora e salvar?')) {
      const mat = materials.find(m => m.id === selectedMatId);
      if (mat) {
        const costPerBaseUnit = mat.costPerGram || (mat.currentCostPerUnit ? mat.currentCostPerUnit / convertToBaseUnit(1, mat.unit) : 0);
        const fc = Math.max(1.0, Number(ingCorrectionFactor) || 1.0);
        const grossQty = Number((ingQuantity * fc).toFixed(3));
        const wastePercent = Number(((fc - 1) * 100).toFixed(1));
        const quantityInBaseUnit = convertToBaseUnit(grossQty, ingUnit);
        const subtotal = quantityInBaseUnit * costPerBaseUnit;

        const newIng: TechnicalSheetIngredient = {
          materialId: mat.id,
          materialName: mat.name,
          unit: ingUnit,
          quantityUsed: ingQuantity,
          grossQuantity: grossQty,
          correctionFactor: fc,
          wastePercent,
          costPerGram: Number(costPerBaseUnit.toFixed(6)),
          subtotalCost: Number(subtotal.toFixed(4))
        };
        finalIngredients.push(newIng);
      }
    }

    if (finalIngredients.length === 0) {
      alert('Adicione pelo menos um ingrediente à ficha técnica.');
      return;
    }

    const sheetData = {
      sku,
      name,
      category,
      version,
      date,
      responsible,
      description,
      yieldAmount: Number(yieldAmount),
      yieldUnit,
      cookingLossPercent: Number(cookingLoss.toFixed(1)),
      bakedWeight: Number(bakedWeightGrams.toFixed(1)),
      cookingIndex: Number(cookingIndex.toFixed(3)),
      rawBatchWeight: Number(rawBatchWeightGrams.toFixed(1)),
      estimatedTime: {
        prepMinutes: Number(prepMinutes),
        fermentationMinutes: Number(fermentationMinutes),
        bakingMinutes: Number(bakingMinutes),
        finishingMinutes: Number(finishingMinutes),
        totalMinutes
      },
      requiredEquipment: equipmentList,
      ingredients: finalIngredients,
      productionSteps: steps,
      shelfLife: {
        ambient: shelfLifeAmbient,
        refrigerated: shelfLifeRefrigerated,
        frozen: shelfLifeFrozen,
        notes: shelfLifeNotes
      },
      packagingMaterialCost: Number(packagingMaterialCost),
      totalIngredientsCost: Number(totalIngredientsCost.toFixed(2)),
      costPerYieldUnit: Number(costPerYieldUnit.toFixed(2)),
      suggestedMarkup: 3.0,
      basePrice: Number(basePrice)
    };

    if (sheetToEdit) {
      updateTechnicalSheet(sheetToEdit.id, sheetData);
    } else {
      addTechnicalSheet(sheetData);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto print:static print:bg-transparent print:p-0 print:overflow-visible print:block">
      <div className="bg-[#FAF7F2] dark:bg-[#2B2D31] rounded-none sm:rounded-2xl border-none sm:border border-[#E5DACF] dark:border-[#3F4147] shadow-xl w-full max-w-4xl min-h-screen sm:min-h-0 sm:max-h-[92vh] flex flex-col overflow-hidden print:bg-white print:border-none print:shadow-none print:max-w-full print:max-h-none print:rounded-none print:overflow-visible print:block">
        
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-4 border-b border-[#EBE1D7] dark:border-[#3F4147] flex items-center justify-between bg-[#F4EFEA] dark:bg-[#1E1F22] sticky top-0 z-20 print:bg-white print:border-b-2 print:border-black">
          <div>
            <h2 className="font-serif-brand text-lg sm:text-xl font-bold text-[#382628] dark:text-white flex items-center gap-2 print:text-black print:text-2xl">
              <ChefHat className="w-5 h-5 text-[#B86B77] print:text-black" />
              <span>{sheetToEdit ? `Ficha: ${sheetToEdit.name}` : 'Nova Ficha Técnica'}</span>
            </h2>
            <p className="text-[10px] sm:text-xs text-[#7A6466] dark:text-[#B5BAC1] print:text-gray-600">
              Especificações rigorosas de insumos e rendimento
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button 
              type="button"
              onClick={() => {
                if (isInitialLoading) {
                  alert('Os dados da receita ainda estão sendo carregados. Aguarde um instante.');
                  return;
                }
                window.print();
              }}
              className="p-2 sm:px-3 sm:py-1.5 text-xs font-bold text-[#352527] dark:text-white border border-[#D5C5B5] dark:border-[#3F4147] rounded-lg bg-white dark:bg-[#2B2D31] hover:bg-[#F3ECE2] dark:hover:bg-[#35373C] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button onClick={onClose} className="p-2 hover:bg-[#EBE1D7] dark:hover:bg-[#35373C] rounded-full transition-colors cursor-pointer">
              <X className="w-5 h-5 text-[#543E40] dark:text-[#B5BAC1]" />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 sm:space-y-8 bg-white/30 dark:bg-transparent print:overflow-visible print:p-0 print:pt-4 print:block">
          
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#543E40] mb-1">Nome do Produto Artesanal *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Torta Entremet Chocolat 70%"
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white focus:outline-[#B86B77]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#543E40] mb-1">Código / SKU *</label>
              <input
                type="text"
                required
                value={sku}
                onChange={e => setSku(e.target.value)}
                placeholder="SAB-PAN-01"
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white font-mono focus:outline-[#B86B77]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#543E40] mb-1">Categoria</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white focus:outline-[#B86B77]"
              >
                <option value="Panificação Artesanal">Panificação Artesanal</option>
                <option value="Confeitaria Fina">Confeitaria Fina</option>
                <option value="Sobremesas & Tortas">Sobremesas & Tortas</option>
                <option value="Viennoiserie">Viennoiserie</option>
                <option value="Salgados Artesanais">Salgados Artesanais</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#543E40] mb-1">Versão da Receita *</label>
              <input
                type="text"
                required
                value={version}
                onChange={e => setVersion(e.target.value)}
                placeholder="v1.0"
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#543E40] mb-1">Data da Ficha *</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#543E40] mb-1">Responsável Técnico / Chef *</label>
              <input
                type="text"
                required
                value={responsible}
                onChange={e => setResponsible(e.target.value)}
                placeholder="Chef Padeiro Marcelo Ramos"
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#543E40] mb-1">Descrição Exata do Item *</label>
            <textarea
              rows={2}
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descreva as características sensoriais, textura, acabamento e embalagem do produto artesanal."
              className="w-full text-xs p-2.5 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white focus:outline-[#B86B77]"
            />
          </div>

          {/* Ingredients with Cost per Gram */}
          <div className="border-t border-[#E8DFD5] pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A6466] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#B86B77]" />
                <span>Ingredientes & Custo por Grama</span>
              </h3>
              <span className="text-[11px] text-[#8C7678]">
                Custos vinculados dinamicamente ao módulo de compras
              </span>
            </div>

            {/* Insumo selector */}
            <div className="p-3.5 bg-[#F5EDE3] dark:bg-[#1E1F22] rounded-xl border border-[#E5DACF] dark:border-[#3F4147] mb-3 print:hidden">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-[#5E474A] dark:text-[#E0D8D0] mb-1">
                    Insumo do Catálogo *
                  </label>
                  <select
                    value={selectedMatId}
                    onChange={e => {
                      setSelectedMatId(e.target.value);
                      const m = materials.find(x => x.id === e.target.value);
                      if (m) {
                        setIngUnit(m.unit === 'kg' ? 'g' : m.unit === 'l' ? 'ml' : m.unit);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (selectedMatId) handleAddIngredient();
                      }
                    }}
                    className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#D5C6B8] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white focus:outline-[#B86B77]"
                  >
                    <option value="">Selecione o insumo...</option>
                    {materials.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} (R$ {m.costPerGram.toFixed(2)}/{m.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-[#5E474A] dark:text-[#E0D8D0] mb-1">
                    Qtd Líquida (PL) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    value={ingQuantity}
                    onChange={e => setIngQuantity(parseFloat(e.target.value) || 0)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (selectedMatId) handleAddIngredient();
                      }
                    }}
                    className="w-full text-sm sm:text-xs px-2.5 py-1.5 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#D5C6B8] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-[#5E474A] dark:text-[#E0D8D0] mb-1">
                    Unidade
                  </label>
                  <select
                    value={ingUnit}
                    onChange={e => setIngUnit(e.target.value as UnitOfMeasure)}
                    className="w-full text-sm sm:text-xs px-2.5 py-1.5 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#D5C6B8] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
                  >
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="l">l</option>
                    <option value="un">un</option>
                    <option value="pct">pct</option>
                    <option value="cx">cx</option>
                    <option value="m">m</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-[#5E474A] dark:text-[#E0D8D0]">
                      FC / Aparas (%)
                    </label>
                    <span className="text-[10px] text-[#8C7678] dark:text-[#A09890] font-mono">
                      {ingCorrectionFactor > 1.0 
                        ? `+${((ingCorrectionFactor - 1) * 100).toFixed(0)}% aparas` 
                        : 'Sem perda (1.0)'}
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.05"
                    min="1.0"
                    value={ingCorrectionFactor}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      setIngCorrectionFactor(isNaN(val) || val < 1.0 ? 1.0 : val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (selectedMatId) handleAddIngredient();
                      }
                    }}
                    placeholder="1.00"
                    title="Fator de Correção (FC = Peso Bruto / Peso Líquido). Ex: 1.20 para 20% de casca/apara"
                    className="w-full text-sm sm:text-xs px-2.5 py-1.5 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#D5C6B8] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white font-mono"
                  />
                  <p className="text-[9px] text-[#7A6466] dark:text-[#B5BAC1] mt-0.5 truncate">
                    PB: {(ingQuantity * (ingCorrectionFactor || 1.0)).toFixed(1)} {ingUnit} bruto
                  </p>
                </div>

                <div className="sm:col-span-1 flex items-end">
                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    disabled={!selectedMatId}
                    className="w-full py-2.5 sm:py-2 bg-[#B86B77] hover:bg-[#9E5460] disabled:bg-stone-300 dark:disabled:bg-stone-700 text-white text-base sm:text-xs font-bold rounded-lg transition-colors flex items-center justify-center cursor-pointer shadow-xs"
                    title="Adicionar ingrediente à ficha técnica"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Ingredients table - scrollable on mobile */}
            {ingredients.length === 0 ? (
              <div className="text-center py-4 bg-white/60 dark:bg-[#1E1F22]/50 rounded-xl border border-dashed border-[#DACDC0] dark:border-[#3F4147] text-xs text-[#8C7577] dark:text-[#B5BAC1]">
                Nenhum ingrediente adicionado à ficha técnica ainda.
              </div>
            ) : (
              <div className="border border-[#E8DFD5] dark:border-[#3F4147] rounded-xl overflow-hidden bg-white dark:bg-[#2B2D31] shadow-2xs print:overflow-visible overflow-x-auto">
                <table className="min-w-[620px] sm:min-w-0 w-full text-left text-xs">
                  <thead className="bg-[#F8F4EE] dark:bg-[#1E1F22] border-b border-[#E8DFD5] dark:border-[#3F4147] text-[#7A6466] dark:text-[#B5BAC1] font-semibold text-[11px]">
                    <tr>
                      <th className="p-3">Insumo</th>
                      <th className="p-3 text-center">Peso Líquido (PL)</th>
                      <th className="p-3 text-center">Fator Corr. (FC)</th>
                      <th className="p-3 text-center">Peso Bruto (PB)</th>
                      <th className="p-3 text-right hidden sm:table-cell">Custo/Un</th>
                      <th className="p-3 text-right">Subtotal Real</th>
                      <th className="p-3 text-center w-10 print:hidden"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0E8DF] dark:divide-[#3F4147]">
                    {ingredients.map((ing, idx) => {
                      const fc = ing.correctionFactor ?? 1.0;
                      const grossQty = ing.grossQuantity ?? (ing.quantityUsed * fc);
                      const wastePct = ing.wastePercent ?? ((fc - 1) * 100);
                      return (
                        <tr key={idx} className="hover:bg-[#FAF7F2] dark:hover:bg-[#35373C]">
                          <td className="p-3 font-medium text-[#3D2C2E] dark:text-white">
                            <div className="line-clamp-1">{ing.materialName}</div>
                          </td>
                          <td className="p-3 text-center font-mono whitespace-nowrap">
                            {formatQuantity(ing.quantityUsed, ing.unit)}
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                              fc > 1.0 
                                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200' 
                                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                            }`}>
                              FC {fc.toFixed(2)} {fc > 1.0 ? `(+${wastePct.toFixed(0)}%)` : ''}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono font-semibold text-[#543E40] dark:text-[#E0D8D0] whitespace-nowrap">
                            {formatQuantity(grossQty, ing.unit)}
                          </td>
                          <td className="p-3 text-right font-mono text-[#7A6466] dark:text-[#B5BAC1] whitespace-nowrap hidden sm:table-cell">
                            R$ {ing.costPerGram >= 1 ? ing.costPerGram.toFixed(2) : ing.costPerGram.toFixed(4)}/{ing.unit}
                          </td>
                          <td className="p-3 text-right font-bold text-[#352527] dark:text-[#FFFFFF] whitespace-nowrap">
                            R$ {(ing.subtotalCost || 0).toFixed(2)}
                          </td>
                          <td className="p-3 text-center print:hidden">
                            <button
                              type="button"
                              onClick={() => handleRemoveIngredient(idx)}
                              className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                              title="Remover ingrediente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Yield, Baking Loss (IC) and Base Price */}
          <div className="space-y-3 bg-[#F5EDE3] dark:bg-[#1E1F22] p-4 rounded-xl border border-[#E5DACF] dark:border-[#3F4147]">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#5E474A] dark:text-[#E0D8D0] mb-1">
                  Rendimento (Qtd) *
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  required
                  value={yieldAmount}
                  onChange={e => setYieldAmount(parseFloat(e.target.value) || 1)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#D5C6B8] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#5E474A] dark:text-[#E0D8D0] mb-1">
                  Unidade Rendimento *
                </label>
                <input
                  type="text"
                  required
                  value={yieldUnit}
                  onChange={e => setYieldUnit(e.target.value)}
                  placeholder="Ex: unidades (85g), filões"
                  className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#D5C6B8] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#5E474A] dark:text-[#E0D8D0] mb-1">
                  Perda no Forno / Cocção (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="80"
                    value={cookingLossPercent}
                    onChange={e => setCookingLossPercent(parseFloat(e.target.value) || 0)}
                    placeholder="12.0"
                    className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#D5C6B8] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white font-mono"
                  />
                  <span className="absolute right-2.5 top-1.5 text-xs text-stone-400 font-bold pointer-events-none">%</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#5E474A] dark:text-[#E0D8D0] mb-1">
                  Custo Embalagens (R$)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={packagingMaterialCost}
                  onChange={e => setPackagingMaterialCost(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#D5C6B8] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#5E474A] dark:text-[#E0D8D0] mb-1">
                  Preço Venda Balcão (R$)
                </label>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  value={basePrice}
                  onChange={e => setBasePrice(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#D5C6B8] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white font-bold"
                />
              </div>
            </div>

            {/* Live Cocção & Peso Assado Indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#E5DACF] dark:border-[#3F4147] text-[11px]">
              <div className="p-2 bg-white/70 dark:bg-[#2B2D31] rounded-lg border border-[#DACDC0] dark:border-[#3F4147]">
                <span className="text-[10px] text-[#7A6466] dark:text-[#B5BAC1] uppercase font-bold block">Peso Cru da Massa</span>
                <strong className="text-[#352527] dark:text-white font-mono text-xs">
                  {rawBatchWeightGrams >= 1000 ? `${(rawBatchWeightGrams / 1000).toFixed(2)} kg` : `${rawBatchWeightGrams.toFixed(0)} g`}
                </strong>
              </div>

              <div className="p-2 bg-white/70 dark:bg-[#2B2D31] rounded-lg border border-[#DACDC0] dark:border-[#3F4147]">
                <span className="text-[10px] text-[#7A6466] dark:text-[#B5BAC1] uppercase font-bold block">Índice Cocção (IC)</span>
                <strong className="text-[#8C5820] dark:text-amber-300 font-mono text-xs flex items-center gap-1">
                  <span>IC: {cookingIndex.toFixed(2)}</span>
                  <span className="text-[9px] text-[#8C7678] font-normal">(-{cookingLoss.toFixed(1)}%)</span>
                </strong>
              </div>

              <div className="p-2 bg-white/70 dark:bg-[#2B2D31] rounded-lg border border-[#DACDC0] dark:border-[#3F4147]">
                <span className="text-[10px] text-[#7A6466] dark:text-[#B5BAC1] uppercase font-bold block">Peso Líquido Assado</span>
                <strong className="text-[#352527] dark:text-white font-mono text-xs">
                  {bakedWeightGrams >= 1000 ? `${(bakedWeightGrams / 1000).toFixed(2)} kg` : `${bakedWeightGrams.toFixed(0)} g`}
                </strong>
              </div>

              <div className="p-2 bg-white/70 dark:bg-[#2B2D31] rounded-lg border border-[#DACDC0] dark:border-[#3F4147]">
                <span className="text-[10px] text-[#7A6466] dark:text-[#B5BAC1] uppercase font-bold block">Peso Assado / Unidade</span>
                <strong className="text-[#9E5460] dark:text-[#F39C9B] font-mono text-xs">
                  {unitBakedWeightGrams > 0 ? `~${unitBakedWeightGrams.toFixed(0)} g / un` : `${yieldAmount} ${yieldUnit}`}
                </strong>
              </div>
            </div>
          </div>

          {/* Summary of Costs */}
          <div className="p-3 bg-[#EFE5DA] rounded-xl border border-[#DBCDC0] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[#695456]">Custo Insumos Receita: </span>
              <strong className="text-[#352527] dark:text-[#FFFFFF]">R$ {(totalIngredientsCost || 0).toFixed(2)}</strong>
            </div>
            <div>
              <span className="text-[#695456]">Custo Total c/ Embalagem: </span>
              <strong className="text-[#352527] dark:text-[#FFFFFF]">R$ {(totalRecipeCost || 0).toFixed(2)}</strong>
            </div>
            <div className="bg-[#FAF7F2] px-3 py-1.5 rounded-lg border border-[#DACBC0]">
              <span className="text-[#8A686D] font-medium">CMV Unitário Produzido: </span>
              <strong className="font-serif-brand text-base text-[#9E5460]">
                R$ {(costPerYieldUnit || 0).toFixed(2)} / {yieldUnit}
              </strong>
            </div>
          </div>

          {/* Production Times */}
          <div className="border-t border-[#E8DFD5] pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A6466] mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#B86B77]" />
              <span>Tempos Estimados de Produção (Minutos)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] text-[#695456] mb-1">Preparo / Batimento</label>
                <input
                  type="number"
                  value={prepMinutes}
                  onChange={e => setPrepMinutes(parseInt(e.target.value) || 0)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white rounded-lg border border-[#DACDC0]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#695456] mb-1">Fermentação / Frio</label>
                <input
                  type="number"
                  value={fermentationMinutes}
                  onChange={e => setFermentationMinutes(parseInt(e.target.value) || 0)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white rounded-lg border border-[#DACDC0]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#695456] mb-1">Forno / Cocção</label>
                <input
                  type="number"
                  value={bakingMinutes}
                  onChange={e => setBakingMinutes(parseInt(e.target.value) || 0)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white rounded-lg border border-[#DACDC0]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#695456] mb-1">Montagem / Embalagem</label>
                <input
                  type="number"
                  value={finishingMinutes}
                  onChange={e => setFinishingMinutes(parseInt(e.target.value) || 0)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white rounded-lg border border-[#DACDC0]"
                />
              </div>
              <div className="col-span-2 sm:col-span-1 bg-[#FAF7F2] p-2 rounded-lg border border-[#DACDC0] flex flex-col justify-center text-center">
                <span className="text-[10px] uppercase font-bold text-[#8C7678]">Tempo Total</span>
                <span className="font-serif-brand text-sm font-bold text-[#352527] dark:text-[#FFFFFF]">
                  {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
                </span>
              </div>
            </div>
          </div>

          {/* Required Equipment */}
          <div className="border-t border-[#E8DFD5] pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A6466] mb-2 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-[#B86B77]" />
              <span>Equipamentos Necessários</span>
            </h3>

            <div className="flex items-center gap-2 mb-2 print:hidden">
              <input
                type="text"
                placeholder="Ex: Forno convector turbo, Balança de precisão 0.1g, Silpat..."
                value={newEquipmentInput}
                onChange={e => setNewEquipmentInput(e.target.value)}
                className="w-full text-xs px-3 py-1.5 bg-white rounded-lg border border-[#DACDC0]"
              />
              <button
                type="button"
                onClick={handleAddEquipment}
                className="px-3 py-1.5 bg-[#594446] text-white text-xs font-semibold rounded-lg shrink-0"
              >
                + Adicionar
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {equipmentList.map((eq, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F2EAE0] text-[#4A3739] text-xs border border-[#E0D3C5]"
                >
                  <span>{eq}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveEquipment(idx)}
                    className="text-[#8C7678] hover:text-red-700 font-bold print:hidden"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Detailed Step-by-Step Production Procedure */}
          <div className="border-t border-[#E8DFD5] pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A6466] mb-2">
              Passo a Passo Detalhado da Produção
            </h3>

            {/* Add new step */}
            <div className="p-3 bg-[#F5EDE3] rounded-xl border border-[#E5DACF] mb-3 space-y-2 print:hidden">
              <input
                type="text"
                placeholder={`Título da Etapa ${steps.length + 1} (Ex: 'Autólise e Repouso')`}
                value={newStepTitle}
                onChange={e => setNewStepTitle(e.target.value)}
                className="w-full text-xs px-3 py-1.5 bg-white rounded-lg border border-[#D5C6B8]"
              />
              <textarea
                rows={2}
                placeholder="Instruções técnicas minuciosas para a equipe de confeitaria/panificação..."
                value={newStepDesc}
                onChange={e => setNewStepDesc(e.target.value)}
                className="w-full text-xs p-2.5 bg-white rounded-lg border border-[#D5C6B8]"
              />
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleAddStep}
                  className="px-3 py-1.5 bg-[#B86B77] hover:bg-[#9E5460] text-white text-xs font-bold rounded-lg transition-colors"
                >
                  + Inserir Etapa
                </button>
              </div>
            </div>

            {/* Steps list */}
            <div className="space-y-2">
              {steps.map((st, idx) => (
                <div key={idx} className="p-3 bg-white rounded-xl border border-[#E8DFD5] flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#B86B77] text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                      {st.stepNumber}
                    </span>
                    <div>
                      <h4 className="font-bold text-[#352527] dark:text-[#FFFFFF]">{st.title}</h4>
                      <p className="text-[#634E51] mt-0.5 leading-relaxed">{st.description}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(idx)}
                    className="p-1 text-stone-400 hover:text-red-600 transition-colors shrink-0 print:hidden"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Shelf Life & Storage Conditions */}
          <div className="border-t border-[#E8DFD5] pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A6466] mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#B86B77]" />
              <span>Validade do Produto Pronto por Forma de Armazenamento</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#523F41] mb-1">
                  Ambiente (Local seco/fresco)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 3 dias (em embalagem lacrada)"
                  value={shelfLifeAmbient}
                  onChange={e => setShelfLifeAmbient(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 bg-white rounded-lg border border-[#DACDC0]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#523F41] mb-1">
                  Refrigerado (2°C a 6°C)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 7 dias (sob refrigeração)"
                  value={shelfLifeRefrigerated}
                  onChange={e => setShelfLifeRefrigerated(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 bg-white rounded-lg border border-[#DACDC0]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#523F41] mb-1">
                  Congelado (-18°C)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 60 dias (congelador)"
                  value={shelfLifeFrozen}
                  onChange={e => setShelfLifeFrozen(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 bg-white rounded-lg border border-[#DACDC0]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#523F41] mb-1">
                Instruções & Observações de Armazenamento
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Manter em pote hermético para preservar a crocância da casca..."
                value={shelfLifeNotes}
                onChange={e => setShelfLifeNotes(e.target.value)}
                className="w-full text-xs p-2.5 bg-white rounded-lg border border-[#DACDC0]"
              />
            </div>
          </div>

          {/* Footer actions - Sticky on mobile */}
          <div className="sticky bottom-0 -mx-5 -mb-5 sm:mx-0 sm:mb-0 px-5 py-4 sm:px-0 sm:py-3 bg-[#FAF7F2] dark:bg-[#2B2D31] sm:bg-transparent border-t border-[#E8DFD5] dark:border-[#3F4147] sm:border-t-0 flex items-center justify-end gap-3 print:hidden z-10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 py-3 sm:py-2 text-sm sm:text-xs font-semibold rounded-xl border border-[#D5C5B5] bg-white text-[#553F41] hover:bg-[#F3ECE2] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-none px-6 py-3 sm:py-2 text-sm sm:text-xs font-bold rounded-xl bg-[#B86B77] hover:bg-[#9E5460] text-white shadow-md sm:shadow-xs transition-colors"
            >
              {sheetToEdit ? 'Salvar Ficha' : 'Criar Ficha'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
