import React, { useState } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { TechnicalSheet } from '../../types';
import { formatQuantity } from '../../utils/units';
import { 
  Plus, 
  Search, 
  ChefHat, 
  Clock, 
  Wrench, 
  Layers, 
  Printer, 
  Copy, 
  Edit3, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  CheckCircle2,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface TechnicalSheetsViewProps {
  onOpenNewSheet: () => void;
  onEditSheet: (sheet: TechnicalSheet) => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

export const TechnicalSheetsView: React.FC<TechnicalSheetsViewProps> = ({ 
  onOpenNewSheet, 
  onEditSheet,
  isFullScreen = false,
  onToggleFullScreen
}) => {
  const { technicalSheets, deleteTechnicalSheet, duplicateTechnicalSheet, isInitialLoading } = useBakery();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedSheetId, setExpandedSheetId] = useState<string | null>(technicalSheets[0]?.id || null);
  const [printableSheet, setPrintableSheet] = useState<TechnicalSheet | null>(null);
  const [isCheckingPrint, setIsCheckingPrint] = useState(false);

  const handleOpenPrintSheet = (sheet: TechnicalSheet) => {
    if (isInitialLoading) {
      alert('Aviso: Os dados da receita ainda estão carregando. Por favor, aguarde um momento antes de imprimir.');
      return;
    }
    if (!sheet || !sheet.ingredients || sheet.ingredients.length === 0) {
      alert('Aviso: Os dados desta ficha técnica estão incompletos ou ainda não foram totalmente carregados.');
      return;
    }
    setIsCheckingPrint(true);
    setTimeout(() => {
      setIsCheckingPrint(false);
      setPrintableSheet(sheet);
    }, 250);
  };

  const categories = [
    'all',
    'Panificação Artesanal',
    'Confeitaria Fina',
    'Sobremesas & Tortas',
    'Viennoiserie',
    'Salgados Artesanais'
  ];

  const filteredSheets = technicalSheets.filter(sheet => {
    const matchesSearch = 
      sheet.name.toLowerCase().includes(search.toLowerCase()) ||
      sheet.sku.toLowerCase().includes(search.toLowerCase()) ||
      sheet.responsible.toLowerCase().includes(search.toLowerCase()) ||
      sheet.description.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || sheet.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir a ficha técnica de "${name}"?`)) {
      deleteTechnicalSheet(id);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-0">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E8DFD5] dark:border-[#3F4147]">
        <div>
          <h2 className="font-serif-brand text-xl sm:text-2xl font-bold text-[#352527] dark:text-[#FFFFFF] flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-[#B86B77]" />
            <span>Fichas Técnicas & Receituário</span>
          </h2>
          <p className="text-[10px] sm:text-xs text-[#7A6466]">
            Padronização culinária, controle de CMV e rastreabilidade técnica
          </p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {onToggleFullScreen && (
            <button
              onClick={onToggleFullScreen}
              className="p-2 rounded-xl bg-white dark:bg-[#2B2D31] text-[#7A6466] dark:text-[#B5BAC1] border border-[#E8DFD5] dark:border-[#3F4147] hover:bg-[#FAF7F2] dark:hover:bg-[#35373C] transition-colors shadow-xs cursor-pointer flex items-center justify-center shrink-0"
              title={isFullScreen ? "Sair da Tela Cheia" : "Modo Tela Cheia"}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={onOpenNewSheet}
            className="px-3 sm:px-4 py-2 rounded-xl bg-[#B86B77] hover:bg-[#9E5460] text-white text-[10px] sm:text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Ficha</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#FAF7F2] dark:bg-[#1E1F22] p-3 rounded-xl border border-[#E8DFD5] dark:border-[#3F4147]">
        
        {/* Search */}
        <div className="w-full sm:w-80 relative">
          <Search className="w-4 h-4 text-[#9E898B] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nome, SKU ou responsável..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white focus:outline-[#B86B77]"
          />
        </div>

        {/* Category Tabs */}
        <div className="w-full flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#594446] text-white'
                  : 'bg-white dark:bg-[#1E1F22] text-[#5E484B] dark:text-[#B5BAC1] border border-[#E0D3C5] dark:border-[#3F4147] hover:bg-[#F2EAE0] dark:hover:bg-[#35373C]'
              }`}
            >
              {cat === 'all' ? 'Todas as Categorias' : cat}
            </button>
          ))}
        </div>

      </div>

      {/* Sheets List */}
      <div className="space-y-4">
        {filteredSheets.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] text-xs text-[#8C7678] dark:text-[#B5BAC1]">
            Nenhuma ficha técnica cadastrada nesta categoria.
          </div>
        ) : (
          filteredSheets.map(sheet => {
            const isExpanded = expandedSheetId === sheet.id;
            return (
              <div 
                key={sheet.id}
                className="bg-white rounded-2xl border border-[#E8DFD5] shadow-2xs overflow-hidden transition-all"
              >
                {/* Summary Header (always visible) */}
                <div 
                  onClick={() => setExpandedSheetId(isExpanded ? null : sheet.id)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-[#FCFAF7] dark:hover:bg-[#35373C] transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-[#F4EBE3] dark:bg-[#1E1F22] text-[#7A5A40] dark:text-stone-300 border border-[#E8DCDB] dark:border-[#3F4147]">
                        {sheet.sku}
                      </span>
                      <span className="text-[11px] font-semibold text-[#8C7678] dark:text-[#B5BAC1] bg-[#FAF7F2] dark:bg-[#1E1F22] px-2 py-0.5 rounded-md border border-[#EFE5DB] dark:border-[#3F4147]">
                        {sheet.category}
                      </span>
                      <span className="text-[11px] font-bold text-[#B86B77]">
                        {sheet.version}
                      </span>
                      <span className="text-[11px] text-[#8C7678]">
                        • Atualizado em {sheet.date}
                      </span>
                    </div>

                    <h3 className="font-serif-brand text-xl font-bold text-[#352527] dark:text-[#FFFFFF]">
                      {sheet.name}
                    </h3>

                    <p className="text-xs text-[#6E595B] line-clamp-1 max-w-2xl">
                      {sheet.description}
                    </p>
                  </div>

                  {/* Right metrics and actions */}
                  <div className="flex items-center justify-between md:justify-end gap-5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#F2ECE4]">
                    <div className="text-left md:text-right">
                      <div className="text-[10px] uppercase font-bold text-[#8C7678]">CMV Insumos</div>
                      <div className="font-serif-brand text-base font-bold text-[#9E5460]">
                        R$ {(Number(sheet.costPerYieldUnit) || 0).toFixed(2)} <span className="text-xs font-normal text-[#7A6466]">/ {sheet.yieldUnit}</span>
                      </div>
                      <div className="text-[10px] text-[#6E595B]">
                        Preço Balcão: <strong>R$ {(Number(sheet.basePrice) || 0).toFixed(2)}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenPrintSheet(sheet)}
                        title="Visualizar ficha de produção para bancada / imprimir"
                        className="p-2 text-[#7A6466] hover:text-[#352527] dark:hover:text-[#FFFFFF] dark:text-[#FFFFFF] hover:bg-[#F2EAE0] rounded-lg transition-colors flex items-center gap-1"
                      >
                        {isCheckingPrint ? <span className="text-[10px] animate-pulse">Carregando...</span> : <Printer className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => duplicateTechnicalSheet(sheet.id)}
                        title="Duplicar ficha técnica para variação"
                        className="p-2 text-[#7A6466] hover:text-[#352527] dark:hover:text-[#FFFFFF] dark:text-[#FFFFFF] hover:bg-[#F2EAE0] rounded-lg transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEditSheet(sheet)}
                        title="Editar ficha técnica"
                        className="p-2 text-[#7A6466] hover:text-[#B86B77] hover:bg-[#FAF0F2] rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(sheet.id, sheet.name)}
                        title="Excluir ficha"
                        className="p-2 text-[#7A6466] hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="w-px h-5 bg-[#E8DFD5] mx-1"></div>
                      <div className="text-[#8C7678]">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-5 border-t border-[#EFE6DC] bg-[#FAF8F5] space-y-6 text-xs">
                    
                    {/* Meta info strip */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 bg-white dark:bg-[#2B2D31] rounded-xl border border-[#E8DFD5] dark:border-[#3F4147]">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#8C7678] block">Responsável Técnico</span>
                        <strong className="text-[#352527] dark:text-[#FFFFFF]">{sheet.responsible}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#8C7678] block">Rendimento do Lote</span>
                        <strong className="text-[#352527] dark:text-[#FFFFFF]">{sheet.yieldAmount} {sheet.yieldUnit}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#8C7678] block">Cocção & Peso Assado</span>
                        <strong className="text-[#8C5820] dark:text-amber-300 font-mono text-xs flex items-center gap-1 mt-0.5">
                          <span>{sheet.cookingLossPercent ? `Perda: ${sheet.cookingLossPercent}% (IC ${(1 - sheet.cookingLossPercent / 100).toFixed(2)})` : 'Perda padrão 12%'}</span>
                          {sheet.bakedWeight ? <span className="text-stone-500 font-normal">| {sheet.bakedWeight >= 1000 ? `${(sheet.bakedWeight/1000).toFixed(2)} kg` : `${sheet.bakedWeight} g`} assado</span> : null}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#8C7678] block">Tempo Total Estimado</span>
                        <strong className="text-[#352527] dark:text-[#FFFFFF] flex items-center gap-1 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-[#B86B77]" />
                          <span>
                            {Math.floor((sheet.estimatedTime?.totalMinutes || 0) / 60)}h {(sheet.estimatedTime?.totalMinutes || 0) % 60}min
                          </span>
                        </strong>
                      </div>
                    </div>

                    {/* Time Breakdown & Equipment */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      {/* Times */}
                      <div className="p-3.5 bg-white dark:bg-[#2B2D31] rounded-xl border border-[#E8DFD5] dark:border-[#3F4147] space-y-2">
                        <h4 className="font-bold text-[#352527] dark:text-[#FFFFFF] flex items-center gap-1.5 text-xs">
                          <Clock className="w-3.5 h-3.5 text-[#B86B77]" />
                          <span>Distribuição do Tempo de Produção</span>
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-lg border border-[#EFE5DB] dark:border-[#3F4147]">
                            <span className="text-[#8C7678] dark:text-[#B5BAC1] block">Preparo / Batimento:</span>
                            <strong className="text-[#352527] dark:text-[#FFFFFF]">{sheet.estimatedTime.prepMinutes} min</strong>
                          </div>
                          <div className="p-2 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-lg border border-[#EFE5DB] dark:border-[#3F4147]">
                            <span className="text-[#8C7678] dark:text-[#B5BAC1] block">Fermentação / Frio:</span>
                            <strong className="text-[#352527] dark:text-[#FFFFFF]">{sheet.estimatedTime.fermentationMinutes} min</strong>
                          </div>
                          <div className="p-2 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-lg border border-[#EFE5DB] dark:border-[#3F4147]">
                            <span className="text-[#8C7678] dark:text-[#B5BAC1] block">Forno / Cozimento:</span>
                            <strong className="text-[#352527] dark:text-[#FFFFFF]">{sheet.estimatedTime.bakingMinutes} min</strong>
                          </div>
                          <div className="p-2 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-lg border border-[#EFE5DB] dark:border-[#3F4147]">
                            <span className="text-[#8C7678] dark:text-[#B5BAC1] block">Finalização / Embalagem:</span>
                            <strong className="text-[#352527] dark:text-[#FFFFFF]">{sheet.estimatedTime.finishingMinutes} min</strong>
                          </div>
                        </div>
                      </div>

                      {/* Equipment */}
                      <div className="p-3.5 bg-white dark:bg-[#2B2D31] rounded-xl border border-[#E8DFD5] dark:border-[#3F4147] space-y-2">
                        <h4 className="font-bold text-[#352527] dark:text-[#FFFFFF] flex items-center gap-1.5 text-xs">
                          <Wrench className="w-3.5 h-3.5 text-[#B86B77]" />
                          <span>Equipamentos e Utensílios Necessários</span>
                        </h4>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {sheet.requiredEquipment.map((eq, idx) => (
                            <span 
                              key={idx}
                              className="px-2.5 py-1 rounded-md bg-[#FAF7F2] dark:bg-[#1E1F22] text-[#553E41] dark:text-[#FFFFFF] border border-[#EAE0D5] dark:border-[#3F4147] text-[11px] font-medium"
                            >
                              {eq}
                            </span>
                          ))}
                        </div>
                      </div>

                    </div>

                    {/* Ingredients with exact cost per gram */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-[#352527] dark:text-[#FFFFFF] flex items-center gap-1.5 text-xs">
                          <Layers className="w-3.5 h-3.5 text-[#B86B77]" />
                          <span>Composição de Insumos & Custos por Grama</span>
                        </h4>
                        <span className="text-[11px] text-[#7A6466]">
                          Custo total dos insumos: <strong>R$ {(Number(sheet.totalIngredientsCost) || 0).toFixed(2)}</strong>
                        </span>
                      </div>

                      <div className="border border-[#E8DFD5] dark:border-[#3F4147] rounded-xl overflow-hidden bg-white dark:bg-[#2B2D31] shadow-2xs overflow-x-auto">
                        <table className="w-full text-left text-xs min-w-[550px] sm:min-w-0">
                          <thead className="bg-[#FAF7F2] dark:bg-[#1E1F22] border-b border-[#E8DFD5] dark:border-[#3F4147] text-[#7A6466] dark:text-[#B5BAC1] font-semibold text-[11px]">
                            <tr>
                              <th className="p-2.5">Insumo / Matéria-prima</th>
                              <th className="p-2.5 text-center">Peso Líquido (PL)</th>
                              <th className="p-2.5 text-center">Fator Corr. (FC)</th>
                              <th className="p-2.5 text-center">Peso Bruto (PB)</th>
                              <th className="p-2.5 text-right hidden sm:table-cell">Custo/Un</th>
                              <th className="p-2.5 text-right">Subtotal Real</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F0E8DF] dark:divide-[#3F4147]">
                            {sheet.ingredients.map((ing, idx) => {
                              const fc = ing.correctionFactor ?? 1.0;
                              const grossQty = ing.grossQuantity ?? (ing.quantityUsed * fc);
                              return (
                                <tr key={idx} className="hover:bg-[#FCFAF7] dark:hover:bg-[#35373C]">
                                  <td className="p-2.5 font-medium text-[#352527] dark:text-[#FFFFFF]">{ing.materialName}</td>
                                  <td className="p-2.5 text-center font-mono">{formatQuantity(ing.quantityUsed, ing.unit)}</td>
                                  <td className="p-2.5 text-center">
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                                      fc > 1.0 
                                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200' 
                                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                                    }`}>
                                      FC {fc.toFixed(2)}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-center font-mono font-semibold text-[#543E40] dark:text-[#E0D8D0]">
                                    {formatQuantity(grossQty, ing.unit)}
                                  </td>
                                  <td className="p-2.5 text-right font-mono text-[#7A6466] hidden sm:table-cell">
                                    R$ {(Number(ing.costPerGram) || 0).toFixed(2)}/{ing.unit}
                                  </td>
                                  <td className="p-2.5 text-right font-bold text-[#352527] dark:text-[#FFFFFF]">
                                    R$ {(Number(ing.subtotalCost) || 0).toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Step-by-Step Production Procedure */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-[#352527] dark:text-[#FFFFFF] text-xs uppercase tracking-wider">
                        Passo a Passo Detalhado da Produção
                      </h4>
                      <div className="space-y-2">
                        {sheet.productionSteps.map(step => (
                          <div key={step.stepNumber} className="p-3 bg-white dark:bg-[#2B2D31] rounded-xl border border-[#E8DFD5] dark:border-[#3F4147] flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-[#594446] dark:bg-[#1E1F22] text-white font-bold flex items-center justify-center shrink-0 text-xs border dark:border-[#3F4147]">
                              {step.stepNumber}
                            </span>
                            <div>
                              <h5 className="font-bold text-[#352527] dark:text-[#FFFFFF]">{step.title}</h5>
                              <p className="text-[#553E41] dark:text-[#B5BAC1] mt-0.5 leading-relaxed text-[11px]">{step.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shelf Life & Storage Conditions Display */}
                    {sheet.shelfLife && (
                      <div className="p-3.5 bg-white dark:bg-[#2B2D31] rounded-xl border border-[#E8DFD5] dark:border-[#3F4147] space-y-2">
                        <h4 className="font-bold text-[#352527] dark:text-[#FFFFFF] flex items-center gap-1.5 text-xs">
                          <Clock className="w-3.5 h-3.5 text-[#B86B77]" />
                          <span>Validade do Produto Pronto conforme Armazenamento</span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                          <div className="p-2.5 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-lg border border-[#EFE5DB] dark:border-[#3F4147]">
                            <span className="text-[#8C7678] dark:text-[#B5BAC1] font-semibold block">Ambiente:</span>
                            <strong className="text-[#352527] dark:text-[#FFFFFF]">{sheet.shelfLife.ambient || 'Não especificado'}</strong>
                          </div>
                          <div className="p-2.5 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-lg border border-[#EFE5DB] dark:border-[#3F4147]">
                            <span className="text-[#8C7678] dark:text-[#B5BAC1] font-semibold block">Refrigerado (2°C - 6°C):</span>
                            <strong className="text-[#352527] dark:text-[#FFFFFF]">{sheet.shelfLife.refrigerated || 'Não especificado'}</strong>
                          </div>
                          <div className="p-2.5 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-lg border border-[#EFE5DB] dark:border-[#3F4147]">
                            <span className="text-[#8C7678] dark:text-[#B5BAC1] font-semibold block">Congelado (-18°C):</span>
                            <strong className="text-[#352527] dark:text-[#FFFFFF]">{sheet.shelfLife.frozen || 'Não especificado'}</strong>
                          </div>
                        </div>
                        {sheet.shelfLife.notes && (
                          <p className="text-[11px] text-[#6E595B] dark:text-[#B5BAC1] italic bg-[#F8F3EC] dark:bg-[#1E1F22] p-2 rounded-lg border border-[#EADBCE] dark:border-[#3F4147]">
                            <strong>Obs:</strong> {sheet.shelfLife.notes}
                          </p>
                        )}
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Printable Sheet Modal */}
      {printableSheet && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto print:absolute print:inset-0 print:bg-white print:p-0 print:overflow-visible print:block">
          <div className="bg-white dark:bg-[#1E1F22] rounded-2xl border border-stone-200 dark:border-[#3F4147] shadow-xl w-full max-w-2xl p-6 space-y-4 my-auto print:shadow-none print:border-none print:max-w-full print:m-0 print:p-0 print:w-full print:block">
            
            <div className="flex items-center justify-between border-b dark:border-[#3F4147] pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#8C7678] dark:text-[#B5BAC1]">Ficha de Produção para Bancada</span>
                <h3 className="font-serif-brand text-2xl font-bold text-[#352527] dark:text-[#FFFFFF]">{printableSheet.name}</h3>
                <span className="text-xs text-stone-500 dark:text-[#B5BAC1] font-mono">SKU: {printableSheet.sku} • {printableSheet.version}</span>
              </div>
              <button onClick={() => setPrintableSheet(null)} className="text-stone-400 hover:text-stone-700 dark:hover:text-white text-lg font-bold print:hidden">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-stone-50 dark:bg-[#2B2D31] rounded-xl border border-stone-200 dark:border-[#3F4147] grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-[10px] text-stone-500 dark:text-[#B5BAC1] block">Rendimento:</span>
                  <strong className="dark:text-white">{printableSheet.yieldAmount} {printableSheet.yieldUnit}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 dark:text-[#B5BAC1] block">Responsável:</span>
                  <strong className="dark:text-white">{printableSheet.responsible}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 dark:text-[#B5BAC1] block">Tempo Total:</span>
                  <strong className="dark:text-white">{Math.floor(printableSheet.estimatedTime.totalMinutes / 60)}h {printableSheet.estimatedTime.totalMinutes % 60}m</strong>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 dark:text-[#B5BAC1] block">Data:</span>
                  <strong className="dark:text-white">{printableSheet.date}</strong>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-xs mb-1 uppercase text-stone-700 dark:text-[#B5BAC1]">Ingredientes Pesados</h4>
                <div className="border border-stone-200 dark:border-[#3F4147] rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-100 dark:bg-[#2B2D31] text-stone-600 dark:text-[#B5BAC1] font-bold">
                      <tr>
                        <th className="p-2">Item</th>
                        <th className="p-2 text-center">Qtd Exata</th>
                        <th className="p-2 text-right">Custo / g</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-[#3F4147]">
                      {printableSheet.ingredients.map((ing, i) => (
                        <tr key={i} className="dark:text-white">
                          <td className="p-2">{ing.materialName}</td>
                          <td className="p-2 text-center font-bold font-mono">{ing.quantityUsed} {ing.unit}</td>
                          <td className="p-2 text-right font-mono text-stone-500 dark:text-[#B5BAC1]">R$ {(Number(ing.costPerGram) || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-xs mb-1 uppercase text-stone-700 dark:text-[#B5BAC1]">Procedimento de Produção</h4>
                <div className="space-y-1.5">
                  {printableSheet.productionSteps.map(st => (
                    <div key={st.stepNumber} className="p-2 bg-stone-50 dark:bg-[#2B2D31] rounded border border-stone-100 dark:border-[#3F4147]">
                      <strong className="dark:text-white">{st.stepNumber}. {st.title}: </strong>
                      <span className="text-stone-700 dark:text-[#B5BAC1]">{st.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t dark:border-[#3F4147] print:hidden">
              <button
                onClick={() => setPrintableSheet(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border dark:border-[#3F4147] dark:text-white"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  if (isInitialLoading) {
                    alert('Os dados ainda estão sendo carregados. Aguarde um instante.');
                    return;
                  }
                  window.print();
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#B86B77] text-white flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Receituário</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
