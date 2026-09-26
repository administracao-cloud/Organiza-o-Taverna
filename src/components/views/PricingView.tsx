import React, { useState } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { PricingConfig } from '../../types';
import { formatQuantity } from '../../utils/units';
import { IntegrationsModal } from '../modals/IntegrationsModal';
import { PricingMarginSimulator } from '../pricing/PricingMarginSimulator';
import { BreakEvenModal } from '../pricing/BreakEvenModal';
import { 
  Percent, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  ShieldCheck, 
  DollarSign,
  Sparkles,
  Edit2,
  Zap,
  Check,
  Sliders,
  Store,
  Scale,
  Calculator,
  ChevronDown,
  ChevronUp,
  HelpCircle
} from 'lucide-react';

export const PricingView: React.FC = () => {
  const { 
    pricingConfigs, 
    technicalSheets,
    updatePricingConfig, 
    applySuggestedPrice,
    deliverySettings,
    syncCatalogToIfood,
    ifoodConnected, 
    nineNineFoodConnected 
  } = useBakery();

  const [search, setSearch] = useState('');
  const [syncedSuccess, setSyncedSuccess] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isIntegrationsModalOpen, setIsIntegrationsModalOpen] = useState(false);

  // Break-Even Modal State
  const [breakEvenConfig, setBreakEvenConfig] = useState<PricingConfig | null>(null);
  const [isBreakEvenOpen, setIsBreakEvenOpen] = useState(false);

  // Simulator Visibility
  const [showSimulator, setShowSimulator] = useState(true);

  // Edit Modal State
  const [editingConfig, setEditingConfig] = useState<PricingConfig | null>(null);
  const [targetMargin, setTargetMargin] = useState<number>(35);
  const [markupMultiplier, setMarkupMultiplier] = useState<number>(2.5);
  const [fixedCost, setFixedCost] = useState<number>(15);
  const [pkgCost, setPkgCost] = useState<number>(2.50);
  const [priceDirect, setPriceDirect] = useState<number>(0);
  const [priceIfood, setPriceIfood] = useState<number>(0);
  const [price99, setPrice99] = useState<number>(0);

  const filteredPricing = pricingConfigs.filter(p => 
    p.productName.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handleApplySuggested = (config: PricingConfig, channel: 'direct' | 'ifood' | '99food') => {
    applySuggestedPrice(config.productId, channel);
  };

  const handleApplyAllSuggestedForProduct = (config: PricingConfig) => {
    updatePricingConfig(config.productId, {
      currentPriceDirect: config.suggestedPriceDirect,
      currentPriceIfood: config.suggestedPriceIfood,
      currentPrice99Food: config.suggestedPrice99Food
    });
  };

  const handleApplyAllSuggestedEntireCatalog = () => {
    pricingConfigs.forEach(cfg => {
      updatePricingConfig(cfg.productId, {
        currentPriceDirect: cfg.suggestedPriceDirect,
        currentPriceIfood: cfg.suggestedPriceIfood,
        currentPrice99Food: cfg.suggestedPrice99Food
      });
    });
  };

  const handleOpenEdit = (cfg: PricingConfig) => {
    setEditingConfig(cfg);
    const tm = cfg.targetMarginPercent || 35;
    const fc = cfg.fixedCostPercent || 15;
    const pkg = cfg.packagingCost || 0;
    setTargetMargin(tm);
    setFixedCost(fc);
    setPkgCost(pkg);
    setPriceDirect(cfg.currentPriceDirect || 0);
    setPriceIfood(cfg.currentPriceIfood || 0);
    setPrice99(cfg.currentPrice99Food || 0);

    const baseCost = cfg.cmvInsumos + pkg;
    const divisor = 1 - ((tm + fc + (deliverySettings.direct.cardFeePercent || 2.5)) / 100);
    if (baseCost > 0 && divisor > 0) {
      setMarkupMultiplier(Number(((baseCost / divisor) / baseCost).toFixed(2)));
    } else {
      setMarkupMultiplier(2.5);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConfig) return;

    // Recalculate suggested prices with current delivery commissions
    const ifoodFee = (deliverySettings.ifood.commissionPercent || 23) + (deliverySettings.ifood.paymentFeePercent || 0) + (deliverySettings.ifood.anticipationFeePercent || 0);
    const food99Fee = (deliverySettings.food99.commissionPercent || 20) + (deliverySettings.food99.paymentFeePercent || 0);
    const directFee = deliverySettings.direct.cardFeePercent || 2.5;

    const totalCost = editingConfig.cmvInsumos + Number(pkgCost);
    const directDivisor = 1 - ((Number(targetMargin) + Number(fixedCost) + directFee) / 100);
    const ifoodDivisor = 1 - ((Number(targetMargin) + Number(fixedCost) + ifoodFee) / 100);
    const nineNineDivisor = 1 - ((Number(targetMargin) + Number(fixedCost) + food99Fee) / 100);

    const sugDirect = directDivisor > 0 ? Number((totalCost / directDivisor).toFixed(2)) : 0;
    const sugIfood = ifoodDivisor > 0 ? Number((totalCost / ifoodDivisor).toFixed(2)) : 0;
    const sug99 = nineNineDivisor > 0 ? Number((totalCost / nineNineDivisor).toFixed(2)) : 0;

    updatePricingConfig(editingConfig.productId, {
      targetMarginPercent: Number(targetMargin),
      fixedCostPercent: Number(fixedCost),
      packagingCost: Number(pkgCost),
      ifoodFeePercent: ifoodFee,
      nineNineFoodFeePercent: food99Fee,
      directCardFeePercent: directFee,
      suggestedPriceDirect: sugDirect,
      suggestedPriceIfood: sugIfood,
      suggestedPrice99Food: sug99,
      currentPriceDirect: Number(priceDirect),
      currentPriceIfood: Number(priceIfood),
      currentPrice99Food: Number(price99)
    });

    setEditingConfig(null);
  };

  const handleSyncDeliveryPlatforms = async () => {
    setIsSyncing(true);
    const result = await syncCatalogToIfood();
    setIsSyncing(false);
    setSyncedSuccess(result.message);
    setTimeout(() => setSyncedSuccess(null), 4500);
  };

  const handleOpenBreakEven = (config: PricingConfig) => {
    setBreakEvenConfig(config);
    setIsBreakEvenOpen(true);
  };

  const totalIfoodFee = (deliverySettings.ifood.commissionPercent + deliverySettings.ifood.paymentFeePercent + (deliverySettings.ifood.anticipationFeePercent || 0)).toFixed(1);
  const totalFood99Fee = (deliverySettings.food99.commissionPercent + deliverySettings.food99.paymentFeePercent).toFixed(1);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E8DFD5] dark:border-[#3F4147]">
        <div>
          <h2 className="font-serif-brand text-2xl font-bold text-[#352527] dark:text-[#FFFFFF] flex items-center gap-2">
            <Percent className="w-6 h-6 text-[#B86B77]" />
            <span>Precificação Dinâmica & Margens de Delivery</span>
          </h2>
          <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1]">
            Calculadora automática de margem de lucro sugerida, simulador de markup e ponto de equilíbrio (break-even) integrados ao estoque
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowSimulator(prev => !prev)}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#2B2D31] border border-[#D5C5B5] dark:border-[#3F4147] hover:bg-[#F4ECE3] dark:hover:bg-[#35373C] text-[#553E41] dark:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Calculator className="w-4 h-4 text-[#B86B77]" />
            <span>{showSimulator ? 'Ocultar Calculadora' : 'Abrir Calculadora de Margem'}</span>
            {showSimulator ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setIsIntegrationsModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#FAF0F2] dark:bg-[#352527] border border-[#F2D7DA] dark:border-[#543E40] hover:bg-[#F4E1E5] text-[#B86B77] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-[#B86B77]" />
            <span>Ajustar Comissões</span>
          </button>
          
          <button
            onClick={handleApplyAllSuggestedEntireCatalog}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#2B2D31] border border-[#D5C5B5] dark:border-[#3F4147] hover:bg-[#F4ECE3] dark:hover:bg-[#35373C] text-[#553E41] dark:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Zap className="w-4 h-4 text-emerald-600" />
            <span>Aplicar Todos Sugeridos</span>
          </button>
          
          <button
            onClick={handleSyncDeliveryPlatforms}
            disabled={isSyncing}
            className="px-4 py-2 rounded-xl bg-[#594446] hover:bg-[#453335] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Publicar nos Apps (iFood & 99Food)'}</span>
          </button>
        </div>
      </div>

      {/* Sync Banner */}
      {syncedSuccess && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncedSuccess}</span>
        </div>
      )}

      {/* 1. Interactive Suggested Profit Margin & Markup Simulator Tool */}
      {showSimulator && (
        <PricingMarginSimulator
          pricingConfigs={pricingConfigs}
          technicalSheets={technicalSheets}
          deliverySettings={deliverySettings}
          onApplyPricing={(productId, updated) => updatePricingConfig(productId, updated)}
          onOpenBreakEven={cfg => handleOpenBreakEven(cfg)}
        />
      )}

      {/* Trigger Live Banner */}
      <div className="p-4 rounded-xl bg-[#FAF0F2] dark:bg-[#1E1F22] border border-[#F2D7DA] dark:border-[#3F4147] text-xs text-[#352527] dark:text-[#FFFFFF] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#B86B77] text-white rounded-lg">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <strong className="text-[#352527] dark:text-[#FFFFFF] text-sm">Gatilho de Precificação Automática & Break-Even Ativos:</strong>
            <p className="text-[#6E595B] dark:text-[#B5BAC1] text-[11px] mt-0.5">
              Sempre que uma nota de insumo for lançada ou as comissões de delivery forem alteradas, o CMV da receita, a Margem de Contribuição e o Ponto de Equilíbrio (Break-Even) são recalculados em tempo real!
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-[10px] uppercase font-mono font-bold text-[#B86B77] bg-white dark:bg-[#1E1F22] px-2.5 py-1 rounded-md border border-[#F2D7DA] dark:border-[#3F4147] block">
            Status: Conectado ao Estoque
          </span>
        </div>
      </div>

      {/* Products Table with Break-Even Column */}
      <div className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] overflow-hidden shadow-2xs">
        <div className="p-4 bg-[#FAF7F2] dark:bg-[#1E1F22] border-b border-[#E8DFD5] dark:border-[#3F4147] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Buscar por produto ou SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-xs px-3 py-1.5 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
            />
          </div>
          <span className="text-xs text-[#7A6466] dark:text-[#B5BAC1]">
            Mostrando <strong>{filteredPricing.length}</strong> produtos com Margem e Break-Even calculados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] dark:bg-[#1E1F22] border-b border-[#E8DFD5] dark:border-[#3F4147] text-[#7A6466] dark:text-[#B5BAC1] font-semibold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Produto / SKU</th>
                <th className="p-3.5 text-right">CMV Insumos + Emb.</th>
                <th className="p-3.5 text-center">Balcão ({deliverySettings.direct.cardFeePercent}%)</th>
                <th className="p-3.5 text-center bg-[#FFF5F5]/60 dark:bg-rose-950/20">iFood ({totalIfoodFee}%)</th>
                <th className="p-3.5 text-center bg-[#FFF8F2]/60 dark:bg-amber-950/20">99Food ({totalFood99Fee}%)</th>
                <th className="p-3.5 text-center">Ponto de Equilíbrio</th>
                <th className="p-3.5 text-center w-36">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E8DF] dark:divide-[#3F4147]">
              {filteredPricing.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs text-[#8C7678] dark:text-[#B5BAC1]">
                    Nenhum produto cadastrado na precificação. Cadastre fichas técnicas para gerar a precificação automática nos canais.
                  </td>
                </tr>
              ) : (
                filteredPricing.map(cfg => {
                  const totalCost = cfg.cmvInsumos + (cfg.packagingCost || 0);
                  
                  // Margin alert check on ifood
                  const ifoodMarginAlert = cfg.currentPriceIfood < cfg.suggestedPriceIfood;
                  const nineMarginAlert = cfg.currentPrice99Food < cfg.suggestedPrice99Food;

                  // Break-Even Metrics for Balcão
                  const directPrice = cfg.currentPriceDirect || cfg.suggestedPriceDirect || 1;
                  const directFee = (directPrice * (deliverySettings.direct.cardFeePercent || 2.5)) / 100;
                  const directMCU = Math.max(0, directPrice - totalCost - directFee);
                  const directBreakEvenUnits = directMCU > 0 ? Math.ceil(1200 / directMCU) : 0;
                  const mcuRatio = directPrice > 0 ? (directMCU / directPrice) * 100 : 0;

                  return (
                    <tr key={cfg.productId} className="hover:bg-[#FCFAF7] dark:hover:bg-[#35373C] transition-colors">
                      
                      {/* Product name & SKU */}
                      <td className="p-3.5 max-w-xs">
                        <div className="font-mono text-[10px] font-bold text-[#7A5A40] dark:text-[#D5A0A8]">{cfg.sku}</div>
                        <div className="font-bold text-sm text-[#352527] dark:text-[#FFFFFF] mt-0.5">{cfg.productName}</div>
                        <div className="text-[10px] text-[#8C7678] dark:text-[#B5BAC1] mt-0.5">
                          Margem Alvo: {cfg.targetMarginPercent}% • Custos Fixos: {cfg.fixedCostPercent}%
                        </div>
                      </td>

                      {/* Cost of production */}
                      <td className="p-3.5 text-right">
                        <div className="font-mono font-bold text-sm text-[#9E5460]">
                          R$ {(totalCost || 0).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-[#8C7678] dark:text-[#B5BAC1]">
                          Insumo: R$ {(cfg.cmvInsumos || 0).toFixed(2)} | Emb: R$ {(cfg.packagingCost || 0).toFixed(2)}
                        </div>
                      </td>

                      {/* Balcão */}
                      <td className="p-3.5 text-center">
                        <div className="font-mono font-bold text-sm text-[#352527] dark:text-[#FFFFFF]">
                          R$ {(cfg.currentPriceDirect || 0).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-[#7A6466] dark:text-[#B5BAC1] mt-0.5">
                          Sugerido: <span className="font-semibold text-emerald-800 dark:text-emerald-400">R$ {(cfg.suggestedPriceDirect || 0).toFixed(2)}</span>
                        </div>
                        {cfg.currentPriceDirect !== cfg.suggestedPriceDirect && (
                          <button
                            onClick={() => handleApplySuggested(cfg, 'direct')}
                            className="mt-1 text-[9px] font-bold text-[#B86B77] hover:underline cursor-pointer block mx-auto"
                          >
                            Aplicar Sugerido
                          </button>
                        )}
                      </td>

                      {/* iFood */}
                      <td className="p-3.5 text-center bg-[#FFF5F5]/30 dark:bg-rose-950/10">
                        <div className="font-mono font-bold text-sm text-[#EA1D2C]">
                          R$ {(cfg.currentPriceIfood || 0).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-[#7A6466] dark:text-[#B5BAC1] mt-0.5">
                          Sugerido: <span className="font-semibold text-emerald-800 dark:text-emerald-400">R$ {(cfg.suggestedPriceIfood || 0).toFixed(2)}</span>
                        </div>
                        {ifoodMarginAlert && (
                          <div className="text-[9px] text-red-600 font-bold mt-0.5 flex items-center justify-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>Margem Comprimida</span>
                          </div>
                        )}
                        {cfg.currentPriceIfood !== cfg.suggestedPriceIfood && (
                          <button
                            onClick={() => handleApplySuggested(cfg, 'ifood')}
                            className="mt-1 text-[9px] font-bold text-[#EA1D2C] hover:underline block mx-auto cursor-pointer"
                          >
                            Aplicar Sugerido
                          </button>
                        )}
                      </td>

                      {/* 99Food */}
                      <td className="p-3.5 text-center bg-[#FFF8F2]/30 dark:bg-amber-950/10">
                        <div className="font-mono font-bold text-sm text-[#E65300]">
                          R$ {(cfg.currentPrice99Food || 0).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-[#7A6466] dark:text-[#B5BAC1] mt-0.5">
                          Sugerido: <span className="font-semibold text-emerald-800 dark:text-emerald-400">R$ {(cfg.suggestedPrice99Food || 0).toFixed(2)}</span>
                        </div>
                        {nineMarginAlert && (
                          <div className="text-[9px] text-amber-700 font-bold mt-0.5 flex items-center justify-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>Ajustar Taxa</span>
                          </div>
                        )}
                        {cfg.currentPrice99Food !== cfg.suggestedPrice99Food && (
                          <button
                            onClick={() => handleApplySuggested(cfg, '99food')}
                            className="mt-1 text-[9px] font-bold text-[#E65300] hover:underline block mx-auto cursor-pointer"
                          >
                            Aplicar Sugerido
                          </button>
                        )}
                      </td>

                      {/* Break-Even Column */}
                      <td className="p-3.5 text-center">
                        <div className="font-mono font-bold text-xs text-[#352527] dark:text-white">
                          {formatQuantity(directBreakEvenUnits, 'un')} / mês
                        </div>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                          MCU: R$ {directMCU.toFixed(2)} ({mcuRatio.toFixed(0)}%)
                        </div>
                        <button
                          onClick={() => handleOpenBreakEven(cfg)}
                          className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-[#B86B77] hover:underline cursor-pointer"
                        >
                          <Scale className="w-3 h-3" />
                          <span>Ver Gráfico</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center">
                        <div className="space-y-1">
                          <button
                            onClick={() => handleApplyAllSuggestedForProduct(cfg)}
                            className="w-full px-2 py-1 rounded-lg bg-[#FAF0F2] dark:bg-[#352527] text-[#B86B77] hover:bg-[#B86B77] hover:text-white font-bold text-[10px] transition-colors cursor-pointer"
                          >
                            Aplicar Sugerido
                          </button>
                          
                          <div className="grid grid-cols-2 gap-1">
                            <button
                              onClick={() => handleOpenBreakEven(cfg)}
                              title="Visualizar Break-Even deste produto"
                              className="px-1.5 py-1 rounded-lg bg-white dark:bg-[#1E1F22] border border-[#E0D3C5] dark:border-[#3F4147] text-[#553E41] dark:text-white hover:bg-[#F2EAE0] dark:hover:bg-[#35373C] font-semibold text-[10px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Scale className="w-3 h-3 text-[#B86B77]" />
                              <span>Equilíbrio</span>
                            </button>

                            <button
                              onClick={() => handleOpenEdit(cfg)}
                              title="Editar custos e margens"
                              className="px-1.5 py-1 rounded-lg bg-white dark:bg-[#1E1F22] border border-[#E0D3C5] dark:border-[#3F4147] text-[#553E41] dark:text-white hover:bg-[#F2EAE0] dark:hover:bg-[#35373C] font-semibold text-[10px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Editar</span>
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
      </div>

      {/* Edit Config Modal */}
      {editingConfig && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-2xl border border-[#E5DACF] dark:border-[#3F4147] shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EBE1D7] dark:border-[#3F4147] flex items-center justify-between bg-[#F4EFEA] dark:bg-[#2B2D31]">
              <div>
                <h3 className="font-serif-brand text-base font-bold text-[#352527] dark:text-[#FFFFFF]">
                  Ajustar Margens & Markup de Precificação
                </h3>
                <span className="text-[11px] text-[#7A6466] dark:text-[#B5BAC1] font-mono">{editingConfig.productName}</span>
              </div>
              <button
                onClick={() => setEditingConfig(null)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="p-6 space-y-3.5 text-xs">
              <div className="p-3 bg-[#EFE5DA] dark:bg-[#35373C] rounded-xl border border-[#DACDC0] dark:border-[#3F4147] flex justify-between items-center shadow-inner">
                <div>
                  <span className="text-[11px] text-[#7A6466] dark:text-[#B5BAC1] block">CMV Atual Insumos</span>
                  <span className="font-mono font-bold text-sm text-[#9E5460]">
                    R$ {editingConfig.cmvInsumos.toFixed(2)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-[#7A6466] dark:text-[#B5BAC1] block">Markup Estimado</span>
                  <span className="font-mono font-bold text-sm text-indigo-700 dark:text-indigo-400">
                    {markupMultiplier.toFixed(2)}x
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#543E40] dark:text-[#B5BAC1] mb-1">Margem Lucro Alvo (%)</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="90"
                    required
                    value={targetMargin}
                    onChange={e => {
                      const tm = parseFloat(e.target.value) || 0;
                      setTargetMargin(tm);
                      const baseCost = editingConfig.cmvInsumos + pkgCost;
                      const div = 1 - ((tm + fixedCost + (deliverySettings.direct.cardFeePercent || 2.5)) / 100);
                      if (baseCost > 0 && div > 0) {
                        setMarkupMultiplier(Number(((baseCost / div) / baseCost).toFixed(2)));
                      }
                    }}
                    className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#543E40] dark:text-[#B5BAC1] mb-1">Custos Fixos (%)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="50"
                    required
                    value={fixedCost}
                    onChange={e => setFixedCost(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#543E40] dark:text-[#B5BAC1] mb-1">Custo de Embalagem Extra (R$)</label>
                <input
                  type="number"
                  step="0.10"
                  min="0"
                  value={pkgCost}
                  onChange={e => {
                    const pkg = parseFloat(e.target.value) || 0;
                    setPkgCost(pkg);
                    const baseCost = editingConfig.cmvInsumos + pkg;
                    const div = 1 - ((targetMargin + fixedCost + (deliverySettings.direct.cardFeePercent || 2.5)) / 100);
                    if (baseCost > 0 && div > 0) {
                      setMarkupMultiplier(Number(((baseCost / div) / baseCost).toFixed(2)));
                    }
                  }}
                  className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-[#E8DFD5] dark:border-[#3F4147]">
                <span className="block text-[11px] font-bold text-[#352527] dark:text-[#FFFFFF]">Preços Praticados Atual:</span>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-[#7A6466] dark:text-[#B5BAC1] mb-0.5">Balcão (R$)</label>
                    <input
                      type="number"
                      step="0.50"
                      value={priceDirect}
                      onChange={e => setPriceDirect(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs px-2 py-1 bg-white dark:bg-[#2B2D31] rounded-md border border-[#DACDC0] dark:border-[#3F4147] font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#EA1D2C] mb-0.5">iFood (R$)</label>
                    <input
                      type="number"
                      step="0.50"
                      value={priceIfood}
                      onChange={e => setPriceIfood(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs px-2 py-1 bg-white dark:bg-[#2B2D31] rounded-md border border-[#DACDC0] dark:border-[#3F4147] font-mono font-bold text-[#EA1D2C]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#E65300] mb-0.5">99Food (R$)</label>
                    <input
                      type="number"
                      step="0.50"
                      value={price99}
                      onChange={e => setPrice99(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs px-2 py-1 bg-white dark:bg-[#2B2D31] rounded-md border border-[#DACDC0] dark:border-[#3F4147] font-mono font-bold text-[#E65300]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E8DFD5] dark:border-[#3F4147]">
                <button
                  type="button"
                  onClick={() => setEditingConfig(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#DACDC0] dark:border-[#3F4147] bg-white dark:bg-[#2B2D31] text-[#352527] dark:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#B86B77] hover:bg-[#9E5460] text-white cursor-pointer"
                >
                  Recalcular & Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Break-Even Modal */}
      <BreakEvenModal
        isOpen={isBreakEvenOpen}
        onClose={() => {
          setIsBreakEvenOpen(false);
          setBreakEvenConfig(null);
        }}
        config={breakEvenConfig}
        deliverySettings={deliverySettings}
      />

      {/* Global Delivery Commissions & API Modal */}
      <IntegrationsModal
        isOpen={isIntegrationsModalOpen}
        onClose={() => setIsIntegrationsModalOpen(false)}
      />

    </div>
  );
};
