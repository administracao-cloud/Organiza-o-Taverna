import React, { useState, useEffect } from 'react';
import { PricingConfig, DeliverySettings, TechnicalSheet } from '../../types';
import { 
  Calculator, 
  Sparkles, 
  TrendingUp, 
  Sliders, 
  DollarSign, 
  Percent, 
  Store, 
  Check, 
  ArrowRight, 
  Scale, 
  AlertCircle,
  HelpCircle,
  Zap,
  RotateCcw
} from 'lucide-react';

interface PricingMarginSimulatorProps {
  pricingConfigs: PricingConfig[];
  technicalSheets: TechnicalSheet[];
  deliverySettings: DeliverySettings;
  onApplyPricing: (productId: string, updated: Partial<PricingConfig>) => void;
  onOpenBreakEven: (config: PricingConfig) => void;
}

export const PricingMarginSimulator: React.FC<PricingMarginSimulatorProps> = ({
  pricingConfigs,
  technicalSheets,
  deliverySettings,
  onApplyPricing,
  onOpenBreakEven
}) => {
  // Selected Product (empty string = custom simulation)
  const [selectedProductId, setSelectedProductId] = useState<string>(
    pricingConfigs.length > 0 ? pricingConfigs[0].productId : ''
  );

  // Editable Costs & Rates
  const [cmvCost, setCmvCost] = useState<number>(12.50);
  const [packagingCost, setPackagingCost] = useState<number>(2.00);
  const [fixedCostPercent, setFixedCostPercent] = useState<number>(18);
  const [extraLaborCost, setExtraLaborCost] = useState<number>(0);

  // Markup and Target Margin
  const [targetMarginPercent, setTargetMarginPercent] = useState<number>(35);
  const [markupMultiplier, setMarkupMultiplier] = useState<number>(2.5);
  const [calculationMode, setCalculationMode] = useState<'margin_divisor' | 'markup_multiplier'>('margin_divisor');

  // Channel Rates from settings
  const directCardFee = deliverySettings.direct.cardFeePercent || 2.5;
  const totalIfoodFee = (deliverySettings.ifood.commissionPercent || 23) + (deliverySettings.ifood.paymentFeePercent || 3.2) + (deliverySettings.ifood.anticipationFeePercent || 0);
  const totalFood99Fee = (deliverySettings.food99.commissionPercent || 20) + (deliverySettings.food99.paymentFeePercent || 2.0);

  // Success applied banner state
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  // Load product data when selection changes
  useEffect(() => {
    if (selectedProductId) {
      const selected = pricingConfigs.find(p => p.productId === selectedProductId);
      if (selected) {
        setCmvCost(selected.cmvInsumos || 0);
        setPackagingCost(selected.packagingCost || 0);
        setFixedCostPercent(selected.fixedCostPercent || 18);
        setTargetMarginPercent(selected.targetMarginPercent || 35);
        
        // Compute corresponding initial markup
        const baseCost = (selected.cmvInsumos || 0) + (selected.packagingCost || 0);
        const divisor = 1 - (((selected.targetMarginPercent || 35) + (selected.fixedCostPercent || 18) + directCardFee) / 100);
        if (baseCost > 0 && divisor > 0) {
          const sugPrice = baseCost / divisor;
          setMarkupMultiplier(Number((sugPrice / baseCost).toFixed(2)));
        }
      }
    }
  }, [selectedProductId, pricingConfigs]);

  // When Target Margin changes in margin_divisor mode, update equivalent markup
  const handleMarginChange = (newMargin: number) => {
    setTargetMarginPercent(newMargin);
    const totalCost = cmvCost + packagingCost + extraLaborCost;
    const directDivisor = 1 - ((newMargin + fixedCostPercent + directCardFee) / 100);
    if (totalCost > 0 && directDivisor > 0) {
      const directPrice = totalCost / directDivisor;
      setMarkupMultiplier(Number((directPrice / totalCost).toFixed(2)));
    }
  };

  // When Markup Multiplier changes in markup_multiplier mode, update equivalent net margin
  const handleMarkupChange = (newMarkup: number) => {
    setMarkupMultiplier(newMarkup);
    const totalCost = cmvCost + packagingCost + extraLaborCost;
    if (totalCost > 0 && newMarkup > 0) {
      const directPrice = totalCost * newMarkup;
      const cardFeeAmount = (directPrice * directCardFee) / 100;
      const fixedCostAmount = (directPrice * fixedCostPercent) / 100;
      const netProfit = directPrice - totalCost - cardFeeAmount - fixedCostAmount;
      const computedMargin = Math.max(0, Math.min(85, (netProfit / directPrice) * 100));
      setTargetMarginPercent(Number(computedMargin.toFixed(1)));
    }
  };

  // Calculate suggested prices across all 3 channels
  const totalItemCost = cmvCost + packagingCost + extraLaborCost;

  // 1. Direct Balcão
  const directDivisor = 1 - ((targetMarginPercent + fixedCostPercent + directCardFee) / 100);
  const suggestedPriceDirect = directDivisor > 0 
    ? Number((totalItemCost / directDivisor).toFixed(2)) 
    : Number((totalItemCost * markupMultiplier).toFixed(2));
  
  const directFeeAmount = (suggestedPriceDirect * directCardFee) / 100;
  const directFixedCostAmount = (suggestedPriceDirect * fixedCostPercent) / 100;
  const directNetProfit = suggestedPriceDirect - totalItemCost - directFeeAmount - directFixedCostAmount;
  const directRealMargin = suggestedPriceDirect > 0 ? (directNetProfit / suggestedPriceDirect) * 100 : 0;

  // 2. iFood Delivery
  const ifoodDivisor = 1 - ((targetMarginPercent + fixedCostPercent + totalIfoodFee) / 100);
  const suggestedPriceIfood = ifoodDivisor > 0 
    ? Number((totalItemCost / ifoodDivisor).toFixed(2)) 
    : Number((suggestedPriceDirect * 1.3).toFixed(2));
  
  const ifoodFeeAmount = (suggestedPriceIfood * totalIfoodFee) / 100;
  const ifoodFixedCostAmount = (suggestedPriceIfood * fixedCostPercent) / 100;
  const ifoodNetProfit = suggestedPriceIfood - totalItemCost - ifoodFeeAmount - ifoodFixedCostAmount;
  const ifoodRealMargin = suggestedPriceIfood > 0 ? (ifoodNetProfit / suggestedPriceIfood) * 100 : 0;

  // 3. 99Food Delivery
  const nineNineDivisor = 1 - ((targetMarginPercent + fixedCostPercent + totalFood99Fee) / 100);
  const suggestedPrice99Food = nineNineDivisor > 0 
    ? Number((totalItemCost / nineNineDivisor).toFixed(2)) 
    : Number((suggestedPriceDirect * 1.25).toFixed(2));
  
  const food99FeeAmount = (suggestedPrice99Food * totalFood99Fee) / 100;
  const food99FixedCostAmount = (suggestedPrice99Food * fixedCostPercent) / 100;
  const food99NetProfit = suggestedPrice99Food - totalItemCost - food99FeeAmount - food99FixedCostAmount;
  const food99RealMargin = suggestedPrice99Food > 0 ? (food99NetProfit / suggestedPrice99Food) * 100 : 0;

  // Find currently selected config object
  const currentSelectedConfig = pricingConfigs.find(p => p.productId === selectedProductId);

  const handleApplyToSelected = () => {
    if (!selectedProductId) return;
    
    onApplyPricing(selectedProductId, {
      cmvInsumos: cmvCost,
      packagingCost: packagingCost,
      fixedCostPercent: fixedCostPercent,
      targetMarginPercent: targetMarginPercent,
      suggestedPriceDirect: suggestedPriceDirect,
      suggestedPriceIfood: suggestedPriceIfood,
      suggestedPrice99Food: suggestedPrice99Food,
      currentPriceDirect: suggestedPriceDirect,
      currentPriceIfood: suggestedPriceIfood,
      currentPrice99Food: suggestedPrice99Food,
      currentMarginDirect: Number(directRealMargin.toFixed(1)),
      currentMarginIfood: Number(ifoodRealMargin.toFixed(1)),
      currentMargin99Food: Number(food99RealMargin.toFixed(1)),
      lastCostRecalculation: new Date().toISOString().split('T')[0]
    });

    setSavedFeedback(`Margens e preços sugeridos aplicados com sucesso ao produto!`);
    setTimeout(() => setSavedFeedback(null), 4000);
  };

  return (
    <div className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] p-5 shadow-2xs space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8DFD5] dark:border-[#3F4147]">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-[#FAF0F2] dark:bg-[#352527] text-[#B86B77] border border-[#F2D7DA] dark:border-[#543E40]">
            <Calculator className="w-5 h-5 text-[#B86B77]" />
          </div>
          <div>
            <h3 className="font-serif-brand text-lg font-bold text-[#352527] dark:text-[#FFFFFF] flex items-center gap-2">
              <span>Calculadora de Margem de Lucro Sugerida & Simulador de Markup</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#FAF0F2] text-[#B86B77] font-sans font-extrabold uppercase">
                Gatilho Automático
              </span>
            </h3>
            <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1]">
              Ajuste custos e markup para simular a margem ideal e proteger o lucro contra as comissões do iFood e 99Food
            </p>
          </div>
        </div>

        {/* Product Selection Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-[#543E40] dark:text-[#B5BAC1] shrink-0">Item:</label>
          <select
            value={selectedProductId}
            onChange={e => setSelectedProductId(e.target.value)}
            className="text-xs font-bold px-3 py-1.5 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#DACDC0] dark:border-[#3F4147] text-[#352527] dark:text-white cursor-pointer"
          >
            <option value="">Simulação Livre (Item Personalizado)</option>
            {pricingConfigs.map(cfg => (
              <option key={cfg.productId} value={cfg.productId}>
                {cfg.productName} ({cfg.sku})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Success alert */}
      {savedFeedback && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{savedFeedback}</span>
        </div>
      )}

      {/* Main Grid: Inputs (Left) vs Results (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Cost and Markup Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Total Cost Group */}
          <div className="p-4 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#E8DFD5] dark:border-[#3F4147] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#352527] dark:text-[#FFFFFF] uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-[#B86B77]" />
                <span>1. Estrutura de Custo Total Unitário</span>
              </span>
              <span className="text-xs font-mono font-bold text-[#9E5460] bg-white dark:bg-[#2B2D31] px-2.5 py-0.5 rounded-lg border border-[#E8DFD5] dark:border-[#3F4147]">
                Total: R$ {totalItemCost.toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#543E40] dark:text-[#B5BAC1] mb-1">
                  Insumos (CMV Ficha)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-xs text-[#8C7678] font-mono">R$</span>
                  <input
                    type="number"
                    step="0.10"
                    min="0"
                    value={cmvCost}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      setCmvCost(val);
                      handleMarginChange(targetMarginPercent);
                    }}
                    className="w-full text-xs pl-8 pr-2.5 py-1.5 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#543E40] dark:text-[#B5BAC1] mb-1">
                  Embalagem & Caixas
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-xs text-[#8C7678] font-mono">R$</span>
                  <input
                    type="number"
                    step="0.10"
                    min="0"
                    value={packagingCost}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      setPackagingCost(val);
                      handleMarginChange(targetMarginPercent);
                    }}
                    className="w-full text-xs pl-8 pr-2.5 py-1.5 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#543E40] dark:text-[#B5BAC1] mb-1">
                  Custos Fixos / Mão de Obra (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="50"
                    value={fixedCostPercent}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      setFixedCostPercent(val);
                      handleMarginChange(targetMarginPercent);
                    }}
                    className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white font-mono font-bold"
                  />
                  <span className="absolute right-2.5 top-1.5 text-xs text-[#8C7678] font-mono">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Markup & Target Margin Interactive Sliders */}
          <div className="p-4 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#E8DFD5] dark:border-[#3F4147] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#352527] dark:text-[#FFFFFF] uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-[#B86B77]" />
                <span>2. Controle de Markup & Margem de Lucro Alvo</span>
              </span>
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setCalculationMode('margin_divisor')}
                  className={`px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                    calculationMode === 'margin_divisor'
                      ? 'bg-[#B86B77] text-white'
                      : 'bg-white dark:bg-[#2B2D31] text-[#7A6466] dark:text-[#B5BAC1]'
                  }`}
                >
                  Divisor de Margem
                </button>
                <button
                  type="button"
                  onClick={() => setCalculationMode('markup_multiplier')}
                  className={`px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                    calculationMode === 'markup_multiplier'
                      ? 'bg-[#B86B77] text-white'
                      : 'bg-white dark:bg-[#2B2D31] text-[#7A6466] dark:text-[#B5BAC1]'
                  }`}
                >
                  Multiplicador (Markup)
                </button>
              </div>
            </div>

            {/* Target Margin Slider */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-[#543E40] dark:text-[#B5BAC1] mb-1">
                <span>Margem de Lucro Líquido Alvo:</span>
                <span className="font-mono font-extrabold text-sm text-[#B86B77] dark:text-[#E89FA9]">
                  {targetMarginPercent}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="65"
                step="1"
                value={targetMarginPercent}
                onChange={e => handleMarginChange(parseFloat(e.target.value) || 0)}
                className="w-full accent-[#B86B77] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#8C7678] mt-0.5">
                <span>10% (Baixa)</span>
                <span>35% (Ideal Confeitaria)</span>
                <span>65% (Alta)</span>
              </div>
            </div>

            {/* Markup Multiplier Slider */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-[#543E40] dark:text-[#B5BAC1] mb-1">
                <span>Multiplicador de Markup sobre Custo Total:</span>
                <span className="font-mono font-extrabold text-sm text-indigo-700 dark:text-indigo-400">
                  {markupMultiplier.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min="1.4"
                max="5.0"
                step="0.05"
                value={markupMultiplier}
                onChange={e => handleMarkupChange(parseFloat(e.target.value) || 0)}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              
              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 pt-1.5">
                <span className="text-[10px] text-[#7A6466] dark:text-[#B5BAC1]">Atalhos rápidos:</span>
                {[1.8, 2.0, 2.2, 2.5, 3.0, 3.5, 4.0].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleMarkupChange(val)}
                    className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md transition-colors cursor-pointer ${
                      Math.abs(markupMultiplier - val) < 0.05
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-[#2B2D31] text-[#553E41] dark:text-[#B5BAC1] border border-[#E0D3C5] dark:border-[#3F4147] hover:bg-[#F2EAE0] dark:hover:bg-[#35373C]'
                    }`}
                  >
                    {val.toFixed(1)}x
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* Right Column: Calculated Channel Prices & Margins (5 cols) */}
        <div className="lg:col-span-5 space-y-3 flex flex-col justify-between">
          
          <div className="space-y-3">
            <span className="text-xs font-bold text-[#352527] dark:text-[#FFFFFF] uppercase tracking-wider block">
              3. Preços Sugeridos com Proteção de Margem
            </span>

            {/* Balcão Card */}
            <div className="p-3.5 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#E8DFD5] dark:border-[#3F4147] space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-[#352527] dark:text-white" />
                  <strong className="text-xs text-[#352527] dark:text-white">Loja / Balcão</strong>
                </div>
                <span className="text-[10px] text-[#7A6466] dark:text-[#B5BAC1]">Taxa Cartão: {directCardFee}%</span>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-xl font-bold font-mono text-[#352527] dark:text-white">
                  R$ {suggestedPriceDirect.toFixed(2)}
                </span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  +{directRealMargin.toFixed(1)}% líquido (R$ {directNetProfit.toFixed(2)})
                </span>
              </div>
            </div>

            {/* iFood Card */}
            <div className="p-3.5 bg-[#FFF5F5] dark:bg-rose-950/20 rounded-xl border border-[#FCDADF] dark:border-rose-900/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#EA1D2C]"></span>
                  <strong className="text-xs text-[#EA1D2C]">iFood Delivery</strong>
                </div>
                <span className="text-[10px] text-[#8C4A51] dark:text-rose-300">Comissão: {totalIfoodFee.toFixed(1)}%</span>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-xl font-bold font-mono text-[#EA1D2C]">
                  R$ {suggestedPriceIfood.toFixed(2)}
                </span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  +{ifoodRealMargin.toFixed(1)}% líquido (R$ {ifoodNetProfit.toFixed(2)})
                </span>
              </div>
              <p className="text-[10px] text-[#8C4A51] dark:text-rose-300">
                Garante que a taxa do iFood não coma o seu lucro líquido unitário.
              </p>
            </div>

            {/* 99Food Card */}
            <div className="p-3.5 bg-[#FFF8F2] dark:bg-amber-950/20 rounded-xl border border-[#FFE2CC] dark:border-amber-900/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#E65300]"></span>
                  <strong className="text-xs text-[#E65300]">99Food Store</strong>
                </div>
                <span className="text-[10px] text-[#9E5728] dark:text-amber-300">Comissão: {totalFood99Fee.toFixed(1)}%</span>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-xl font-bold font-mono text-[#E65300]">
                  R$ {suggestedPrice99Food.toFixed(2)}
                </span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  +{food99RealMargin.toFixed(1)}% líquido (R$ {food99NetProfit.toFixed(2)})
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            {selectedProductId ? (
              <button
                type="button"
                onClick={handleApplyToSelected}
                className="w-full py-2.5 px-4 rounded-xl bg-[#B86B77] hover:bg-[#9E5460] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>Aplicar Sugeridos ao Produto ({currentSelectedConfig?.productName || 'Selecionado'})</span>
              </button>
            ) : (
              <div className="text-[11px] text-[#7A6466] dark:text-[#B5BAC1] text-center p-2 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#E8DFD5] dark:border-[#3F4147]">
                Selecione um produto no topo para aplicar os preços calculados diretamente ao catálogo.
              </div>
            )}

            {currentSelectedConfig && (
              <button
                type="button"
                onClick={() => onOpenBreakEven(currentSelectedConfig)}
                className="w-full py-2 px-4 rounded-xl bg-white dark:bg-[#1E1F22] border border-[#D5C5B5] dark:border-[#3F4147] hover:bg-[#F4ECE3] dark:hover:bg-[#35373C] text-[#553E41] dark:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Scale className="w-4 h-4 text-[#B86B77]" />
                <span>Ver Ponto de Equilíbrio (Break-Even) Completo</span>
              </button>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
