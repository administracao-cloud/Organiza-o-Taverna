import React, { useState } from 'react';
import { PricingConfig, DeliverySettings } from '../../types';
import { 
  Scale, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders, 
  HelpCircle, 
  Store, 
  DollarSign, 
  Package, 
  Percent, 
  Calculator,
  X
} from 'lucide-react';

interface BreakEvenModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: PricingConfig | null;
  deliverySettings: DeliverySettings;
}

export const BreakEvenModal: React.FC<BreakEvenModalProps> = ({
  isOpen,
  onClose,
  config,
  deliverySettings
}) => {
  if (!isOpen || !config) return null;

  // Selected Channel for Break-Even simulation
  const [selectedChannel, setSelectedChannel] = useState<'direct' | 'ifood' | '99food'>('direct');
  
  // Allocated fixed cost for this product line (e.g. R$ 1,200/month)
  const [allocatedFixedCost, setAllocatedFixedCost] = useState<number>(1200);
  
  // Simulated monthly sales volume in units
  const [simulatedVolume, setSimulatedVolume] = useState<number>(150);

  // Selling Price based on selected channel
  const price = selectedChannel === 'direct' 
    ? (config.currentPriceDirect || config.suggestedPriceDirect || 10)
    : selectedChannel === 'ifood'
    ? (config.currentPriceIfood || config.suggestedPriceIfood || 15)
    : (config.currentPrice99Food || config.suggestedPrice99Food || 14);

  // Channel fee rate
  const channelFeePercent = selectedChannel === 'direct'
    ? (deliverySettings.direct.cardFeePercent || 2.5)
    : selectedChannel === 'ifood'
    ? ((deliverySettings.ifood.commissionPercent || 23) + (deliverySettings.ifood.paymentFeePercent || 3.2) + (deliverySettings.ifood.anticipationFeePercent || 0))
    : ((deliverySettings.food99.commissionPercent || 20) + (deliverySettings.food99.paymentFeePercent || 2.0));

  // Variable Costs per unit
  const cmvCost = config.cmvInsumos || 0;
  const pkgCost = config.packagingCost || 0;
  const channelFeeAmount = (price * channelFeePercent) / 100;
  const totalVariableCostUnit = cmvCost + pkgCost + channelFeeAmount;

  // Unit Contribution Margin (MCU)
  const contributionMarginUnit = Math.max(0, price - totalVariableCostUnit);
  const contributionMarginRatio = price > 0 ? (contributionMarginUnit / price) * 100 : 0;

  // Break-Even Point (Quantity & Revenue)
  const breakEvenUnits = contributionMarginUnit > 0 
    ? Math.ceil(allocatedFixedCost / contributionMarginUnit) 
    : 0;
  const breakEvenRevenue = breakEvenUnits * price;
  const dailyBreakEvenUnits = Math.ceil(breakEvenUnits / 26); // assuming 26 working days

  // Simulation calculations
  const totalRevenue = simulatedVolume * price;
  const totalVariableCost = simulatedVolume * totalVariableCostUnit;
  const totalContribution = simulatedVolume * contributionMarginUnit;
  const netProfit = totalContribution - allocatedFixedCost;
  const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const breakEvenPercentage = breakEvenUnits > 0 ? Math.min(200, (simulatedVolume / breakEvenUnits) * 100) : 0;

  // Percent Breakdown of 1 sold item
  const cmvPercent = price > 0 ? (cmvCost / price) * 100 : 0;
  const pkgPercent = price > 0 ? (pkgCost / price) * 100 : 0;
  const feePercent = price > 0 ? (channelFeeAmount / price) * 100 : 0;
  const fixedCostUnitEstimated = (price * (config.fixedCostPercent || 15)) / 100;
  const fixedPercent = price > 0 ? (fixedCostUnitEstimated / price) * 100 : 0;
  const estimatedProfitUnit = price - totalVariableCostUnit - fixedCostUnitEstimated;
  const profitPercent = price > 0 ? (estimatedProfitUnit / price) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-2xl border border-[#E5DACF] dark:border-[#3F4147] shadow-2xl w-full max-w-3xl overflow-hidden my-6">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#EBE1D7] dark:border-[#3F4147] flex items-center justify-between bg-[#F4EFEA] dark:bg-[#2B2D31]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#B86B77] text-white">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-brand text-lg font-bold text-[#352527] dark:text-[#FFFFFF] flex items-center gap-2">
                <span>Análise de Break-Even (Ponto de Equilíbrio)</span>
              </h3>
              <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1]">
                <strong className="text-[#352527] dark:text-[#FFFFFF]">{config.productName}</strong> • SKU: <span className="font-mono">{config.sku}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-white hover:bg-[#EAE0D5] dark:hover:bg-[#35373C] transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Channel Selector Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-[#2B2D31] rounded-xl border border-[#E8DFD5] dark:border-[#3F4147]">
            <span className="text-xs font-bold text-[#352527] dark:text-[#FFFFFF] flex items-center gap-1.5">
              <Store className="w-4 h-4 text-[#B86B77]" />
              <span>Canal de Venda Analisado:</span>
            </span>
            <div className="flex items-center gap-1.5 bg-[#FAF7F2] dark:bg-[#1E1F22] p-1 rounded-lg border border-[#E5DACF] dark:border-[#3F4147]">
              <button
                onClick={() => setSelectedChannel('direct')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  selectedChannel === 'direct'
                    ? 'bg-white dark:bg-[#35373C] text-[#352527] dark:text-white shadow-xs'
                    : 'text-[#7A6466] dark:text-[#B5BAC1] hover:text-[#352527] dark:hover:text-white'
                }`}
              >
                Loja / Balcão ({deliverySettings.direct.cardFeePercent}%)
              </button>
              <button
                onClick={() => setSelectedChannel('ifood')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  selectedChannel === 'ifood'
                    ? 'bg-[#EA1D2C] text-white shadow-xs'
                    : 'text-[#EA1D2C] hover:bg-[#EA1D2C]/10 dark:hover:bg-[#EA1D2C]/20'
                }`}
              >
                iFood ({(deliverySettings.ifood.commissionPercent + deliverySettings.ifood.paymentFeePercent + (deliverySettings.ifood.anticipationFeePercent || 0)).toFixed(1)}%)
              </button>
              <button
                onClick={() => setSelectedChannel('99food')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  selectedChannel === '99food'
                    ? 'bg-[#E65300] text-white shadow-xs'
                    : 'text-[#E65300] hover:bg-[#E65300]/10 dark:hover:bg-[#E65300]/20'
                }`}
              >
                99Food ({(deliverySettings.food99.commissionPercent + deliverySettings.food99.paymentFeePercent).toFixed(1)}%)
              </button>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white dark:bg-[#2B2D31] rounded-xl border border-[#E8DFD5] dark:border-[#3F4147]">
              <span className="text-[11px] font-semibold text-[#7A6466] dark:text-[#B5BAC1] block">Preço de Venda Praticado</span>
              <span className="text-lg font-bold font-mono text-[#352527] dark:text-[#FFFFFF] mt-0.5 block">
                R$ {price.toFixed(2)}
              </span>
              <span className="text-[10px] text-[#8C7678] dark:text-[#949BA4]">por unidade</span>
            </div>

            <div className="p-3.5 bg-white dark:bg-[#2B2D31] rounded-xl border border-[#E8DFD5] dark:border-[#3F4147]">
              <span className="text-[11px] font-semibold text-[#7A6466] dark:text-[#B5BAC1] block">Custo Variável Unitário</span>
              <span className="text-lg font-bold font-mono text-[#9E5460] mt-0.5 block">
                R$ {totalVariableCostUnit.toFixed(2)}
              </span>
              <span className="text-[10px] text-[#8C7678] dark:text-[#949BA4]">
                Insumos: R$ {cmvCost.toFixed(2)} | Emb: R$ {pkgCost.toFixed(2)}
              </span>
            </div>

            <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
              <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 block">Margem de Contribuição (MCU)</span>
              <span className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                R$ {contributionMarginUnit.toFixed(2)}
              </span>
              <span className="text-[10px] font-bold text-emerald-800/80 dark:text-emerald-400/80">
                {contributionMarginRatio.toFixed(1)}% do Preço de Venda
              </span>
            </div>

            <div className="p-3.5 bg-[#FAF0F2] dark:bg-[#352527]/50 rounded-xl border border-[#F2D7DA] dark:border-[#543E40]">
              <span className="text-[11px] font-semibold text-[#8A5059] dark:text-[#D5A0A8] block">Ponto de Equilíbrio (Qtd)</span>
              <span className="text-lg font-black font-mono text-[#B86B77] dark:text-[#E89FA9] mt-0.5 block">
                {breakEvenUnits} un / mês
              </span>
              <span className="text-[10px] text-[#8A5059] dark:text-[#D5A0A8]">
                aprox. {dailyBreakEvenUnits} un / dia (26 dias)
              </span>
            </div>
          </div>

          {/* Visual Price Breakdown Bar */}
          <div className="bg-white dark:bg-[#2B2D31] p-4 rounded-xl border border-[#E8DFD5] dark:border-[#3F4147] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#352527] dark:text-[#FFFFFF] flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-[#B86B77]" />
                <span>Decomposição Percentual de R$ 100,00 Vendidos</span>
              </span>
              <span className="text-[11px] font-bold text-[#7A6466] dark:text-[#B5BAC1]">
                {estimatedProfitUnit >= 0 ? '🟢 Margem Positiva' : '🔴 Margem Negativa'}
              </span>
            </div>

            {/* Progress segment bar */}
            <div className="h-5 w-full bg-[#EAE0D5] dark:bg-[#1E1F22] rounded-full overflow-hidden flex shadow-inner">
              <div 
                style={{ width: `${Math.max(2, cmvPercent)}%` }} 
                className="bg-rose-500 transition-all duration-300 relative group"
                title={`Insumos (CMV): ${cmvPercent.toFixed(1)}% (R$ ${cmvCost.toFixed(2)})`}
              />
              <div 
                style={{ width: `${Math.max(2, pkgPercent)}%` }} 
                className="bg-amber-400 transition-all duration-300 relative group"
                title={`Embalagem: ${pkgPercent.toFixed(1)}% (R$ ${pkgCost.toFixed(2)})`}
              />
              <div 
                style={{ width: `${Math.max(2, feePercent)}%` }} 
                className="bg-orange-500 transition-all duration-300 relative group"
                title={`Taxas de Canal: ${feePercent.toFixed(1)}% (R$ ${channelFeeAmount.toFixed(2)})`}
              />
              <div 
                style={{ width: `${Math.max(2, fixedPercent)}%` }} 
                className="bg-indigo-400 transition-all duration-300 relative group"
                title={`Custos Fixos Rateados: ${fixedPercent.toFixed(1)}% (R$ ${fixedCostUnitEstimated.toFixed(2)})`}
              />
              <div 
                style={{ width: `${Math.max(2, Math.max(0, profitPercent))}%` }} 
                className="bg-emerald-500 transition-all duration-300 relative group"
                title={`Lucro Líquido Real: ${profitPercent.toFixed(1)}% (R$ ${Math.max(0, estimatedProfitUnit).toFixed(2)})`}
              />
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#634E51] dark:text-[#B5BAC1] pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span>Insumos: <strong>{cmvPercent.toFixed(1)}%</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <span>Embalagem: <strong>{pkgPercent.toFixed(1)}%</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                <span>Taxa Canal: <strong>{feePercent.toFixed(1)}%</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
                <span>Custo Fixo: <strong>{fixedPercent.toFixed(1)}%</strong></span>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Lucro Líquido: <strong>{profitPercent.toFixed(1)}%</strong> (R$ {Math.max(0, estimatedProfitUnit).toFixed(2)}/un)</span>
              </div>
            </div>
          </div>

          {/* Interactive Sales Volume Simulator */}
          <div className="bg-white dark:bg-[#2B2D31] p-5 rounded-xl border border-[#E8DFD5] dark:border-[#3F4147] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="font-serif-brand text-sm font-bold text-[#352527] dark:text-[#FFFFFF] flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#B86B77]" />
                <span>Simulador de Volume de Vendas vs Lucro Projetado</span>
              </h4>
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${
                netProfit >= 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                  : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
              }`}>
                {netProfit >= 0 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                <span>{netProfit >= 0 ? 'Operação Lucrativa' : 'Abaixo do Ponto de Equilíbrio'}</span>
              </span>
            </div>

            {/* Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-[#543E40] dark:text-[#B5BAC1] mb-1">
                  <span>Custo Fixo Rateado Alocado:</span>
                  <span className="font-mono font-bold text-[#352527] dark:text-white">R$ {allocatedFixedCost.toFixed(2)} / mês</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="5000"
                  step="50"
                  value={allocatedFixedCost}
                  onChange={e => setAllocatedFixedCost(parseFloat(e.target.value) || 0)}
                  className="w-full accent-[#B86B77] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#8C7678]">
                  <span>R$ 200</span>
                  <span>R$ 2.500</span>
                  <span>R$ 5.000</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-[#543E40] dark:text-[#B5BAC1] mb-1">
                  <span>Vendas Estimadas / Mês:</span>
                  <span className="font-mono font-bold text-[#B86B77] dark:text-[#E89FA9]">{simulatedVolume} unidades</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max={Math.max(300, breakEvenUnits * 2)}
                  step="5"
                  value={simulatedVolume}
                  onChange={e => setSimulatedVolume(parseInt(e.target.value) || 0)}
                  className="w-full accent-[#B86B77] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#8C7678]">
                  <span>10 un</span>
                  <span>Break-Even: {breakEvenUnits} un</span>
                  <span>{Math.max(300, breakEvenUnits * 2)} un</span>
                </div>
              </div>
            </div>

            {/* Break-Even Progress Scale */}
            <div className="p-3.5 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#E8DFD5] dark:border-[#3F4147] space-y-2">
              <div className="flex justify-between text-xs font-bold text-[#352527] dark:text-[#FFFFFF]">
                <span>Progresso até o Ponto de Equilíbrio:</span>
                <span className={simulatedVolume >= breakEvenUnits ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-rose-600 dark:text-rose-400 font-extrabold'}>
                  {breakEvenPercentage.toFixed(0)}% ({simulatedVolume} / {breakEvenUnits} un)
                </span>
              </div>
              <div className="h-3 w-full bg-[#E5DACF] dark:bg-[#35373C] rounded-full overflow-hidden">
                <div 
                  style={{ width: `${Math.min(100, breakEvenPercentage)}%` }}
                  className={`h-full transition-all duration-300 ${
                    simulatedVolume >= breakEvenUnits ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
              </div>
              <p className="text-[11px] text-[#7A6466] dark:text-[#B5BAC1]">
                {simulatedVolume >= breakEvenUnits ? (
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                    ✓ Parabéns! Cada unidade vendida acima de {breakEvenUnits} gera R$ {contributionMarginUnit.toFixed(2)} de puro lucro líquido.
                  </span>
                ) : (
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">
                    ⚠ Faltam {breakEvenUnits - simulatedVolume} unidades para cobrir os custos fixos mensais deste item.
                  </span>
                )}
              </p>
            </div>

            {/* Projected Financial Results Table */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#E8DFD5] dark:border-[#3F4147]">
                <span className="text-[11px] text-[#7A6466] dark:text-[#B5BAC1] block">Faturamento Projetado:</span>
                <span className="font-mono font-bold text-sm text-[#352527] dark:text-white">
                  R$ {totalRevenue.toFixed(2)}
                </span>
              </div>

              <div className="p-3 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#E8DFD5] dark:border-[#3F4147]">
                <span className="text-[11px] text-[#7A6466] dark:text-[#B5BAC1] block">Margem de Contribuição Total:</span>
                <span className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-400">
                  R$ {totalContribution.toFixed(2)}
                </span>
              </div>

              <div className={`p-3 rounded-xl border ${
                netProfit >= 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
              }`}>
                <span className="text-[11px] font-semibold block">Lucro Operacional Líquido:</span>
                <span className="font-mono font-extrabold text-base">
                  R$ {netProfit.toFixed(2)} ({netProfitMargin.toFixed(1)}%)
                </span>
              </div>
            </div>

          </div>

          {/* Comparison across all 3 Channels */}
          <div className="bg-white dark:bg-[#2B2D31] p-4 rounded-xl border border-[#E8DFD5] dark:border-[#3F4147] space-y-2">
            <h4 className="font-serif-brand text-xs font-bold text-[#352527] dark:text-[#FFFFFF] uppercase tracking-wider">
              Comparativo de Break-Even nos Canais de Venda (Custo Fixo: R$ {allocatedFixedCost.toFixed(2)})
            </h4>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] dark:bg-[#1E1F22] border-b border-[#E8DFD5] dark:border-[#3F4147] text-[#7A6466] dark:text-[#B5BAC1] text-[10px] uppercase">
                  <tr>
                    <th className="p-2.5">Canal</th>
                    <th className="p-2.5 text-right">Preço</th>
                    <th className="p-2.5 text-right">Taxa Canal</th>
                    <th className="p-2.5 text-right">Margem Contr. (MCU)</th>
                    <th className="p-2.5 text-center font-bold">Break-Even (Qtd)</th>
                    <th className="p-2.5 text-right">Faturamento Mínimo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0E8DF] dark:divide-[#3F4147]">
                  {/* Direct */}
                  {(() => {
                    const pDir = config.currentPriceDirect || config.suggestedPriceDirect || 10;
                    const feeDir = (pDir * (deliverySettings.direct.cardFeePercent || 2.5)) / 100;
                    const mcuDir = Math.max(0, pDir - cmvCost - pkgCost - feeDir);
                    const beDir = mcuDir > 0 ? Math.ceil(allocatedFixedCost / mcuDir) : 0;
                    return (
                      <tr className="hover:bg-[#FAF7F2] dark:hover:bg-[#1E1F22]">
                        <td className="p-2.5 font-bold text-[#352527] dark:text-white">Loja / Balcão</td>
                        <td className="p-2.5 text-right font-mono">R$ {pDir.toFixed(2)}</td>
                        <td className="p-2.5 text-right font-mono text-[#7A6466]">{deliverySettings.direct.cardFeePercent}% (R$ {feeDir.toFixed(2)})</td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">R$ {mcuDir.toFixed(2)}</td>
                        <td className="p-2.5 text-center font-mono font-black text-[#B86B77] dark:text-[#E89FA9]">{beDir} un/mês</td>
                        <td className="p-2.5 text-right font-mono">R$ {(beDir * pDir).toFixed(2)}</td>
                      </tr>
                    );
                  })()}

                  {/* iFood */}
                  {(() => {
                    const pIfood = config.currentPriceIfood || config.suggestedPriceIfood || 15;
                    const feeRate = (deliverySettings.ifood.commissionPercent || 23) + (deliverySettings.ifood.paymentFeePercent || 3.2) + (deliverySettings.ifood.anticipationFeePercent || 0);
                    const feeIfood = (pIfood * feeRate) / 100;
                    const mcuIfood = Math.max(0, pIfood - cmvCost - pkgCost - feeIfood);
                    const beIfood = mcuIfood > 0 ? Math.ceil(allocatedFixedCost / mcuIfood) : 0;
                    return (
                      <tr className="hover:bg-[#FAF7F2] dark:hover:bg-[#1E1F22] bg-[#FFF5F5]/40 dark:bg-rose-950/20">
                        <td className="p-2.5 font-bold text-[#EA1D2C]">iFood Delivery</td>
                        <td className="p-2.5 text-right font-mono text-[#EA1D2C]">R$ {pIfood.toFixed(2)}</td>
                        <td className="p-2.5 text-right font-mono text-rose-700">{feeRate.toFixed(1)}% (R$ {feeIfood.toFixed(2)})</td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">R$ {mcuIfood.toFixed(2)}</td>
                        <td className="p-2.5 text-center font-mono font-black text-[#EA1D2C]">{beIfood} un/mês</td>
                        <td className="p-2.5 text-right font-mono">R$ {(beIfood * pIfood).toFixed(2)}</td>
                      </tr>
                    );
                  })()}

                  {/* 99Food */}
                  {(() => {
                    const p99 = config.currentPrice99Food || config.suggestedPrice99Food || 14;
                    const feeRate99 = (deliverySettings.food99.commissionPercent || 20) + (deliverySettings.food99.paymentFeePercent || 2.0);
                    const fee99 = (p99 * feeRate99) / 100;
                    const mcu99 = Math.max(0, p99 - cmvCost - pkgCost - fee99);
                    const be99 = mcu99 > 0 ? Math.ceil(allocatedFixedCost / mcu99) : 0;
                    return (
                      <tr className="hover:bg-[#FAF7F2] dark:hover:bg-[#1E1F22] bg-[#FFF8F2]/40 dark:bg-amber-950/20">
                        <td className="p-2.5 font-bold text-[#E65300]">99Food Store</td>
                        <td className="p-2.5 text-right font-mono text-[#E65300]">R$ {p99.toFixed(2)}</td>
                        <td className="p-2.5 text-right font-mono text-amber-700">{feeRate99.toFixed(1)}% (R$ {fee99.toFixed(2)})</td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">R$ {mcu99.toFixed(2)}</td>
                        <td className="p-2.5 text-center font-mono font-black text-[#E65300]">{be99} un/mês</td>
                        <td className="p-2.5 text-right font-mono">R$ {(be99 * p99).toFixed(2)}</td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[#EBE1D7] dark:border-[#3F4147] bg-[#F4EFEA] dark:bg-[#2B2D31] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-[#594446] hover:bg-[#453335] text-white transition-colors cursor-pointer"
          >
            Fechar Análise
          </button>
        </div>

      </div>
    </div>
  );
};
