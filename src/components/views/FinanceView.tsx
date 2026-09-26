import React, { useState, useMemo } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { FinancialTransaction, Order } from '../../types';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Filter, 
  Receipt, 
  PieChart, 
  Layers, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldCheck,
  Calendar,
  Edit2,
  Trash2,
  Scale,
  Target,
  Percent,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  AlertTriangle,
  ShoppingBag,
  Building2,
  Sparkles,
  CheckCircle2,
  Info
} from 'lucide-react';

export const FinanceView: React.FC = () => {
  const { 
    transactions = [], 
    orders = [], 
    technicalSheets = [], 
    pricingConfigs = [],
    addTransaction, 
    updateTransaction, 
    deleteTransaction 
  } = useBakery();

  // Current system month as default (e.g. 2026-09)
  const currentMonthKey = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  // Filter States
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [filterType, setFilterType] = useState<'all' | 'receita' | 'despesa'>('all');
  const [showDreDetails, setShowDreDetails] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Edit Transaction State
  const [editingTr, setEditingTr] = useState<FinancialTransaction | null>(null);
  const [deletingTrId, setDeletingTrId] = useState<string | null>(null);

  // Transaction Form State
  const [desc, setDesc] = useState('');
  const [type, setType] = useState<'receita' | 'despesa'>('despesa');
  const [amount, setAmount] = useState<number>(100);
  const [category, setCategory] = useState('Custos Fixos (Água/Luz/Aluguel)');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Date Key Normalization Helpers
  const parseDateToMonthKey = (dateStr?: string): string => {
    if (!dateStr || typeof dateStr !== 'string') return '0000-00';
    if (dateStr.includes('T')) return dateStr.substring(0, 7);
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length >= 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}`;
      }
    }
    return dateStr.length >= 7 ? dateStr.substring(0, 7) : '0000-00';
  };

  const formatMonthLabel = (sortKey: string) => {
    if (!sortKey || sortKey === '0000-00') return 'Outros Períodos';
    if (sortKey === 'all') return 'Consolidado Geral (Todos os Períodos)';
    try {
      const [year, month] = sortKey.split('-');
      const d = new Date(parseInt(year), parseInt(month) - 1, 1);
      const monthName = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      return monthName.charAt(0).toUpperCase() + monthName.slice(1);
    } catch {
      return sortKey;
    }
  };

  // Compile unique months across orders, transactions, and current month
  const availableMonthKeys = useMemo(() => {
    const set = new Set<string>();
    set.add(currentMonthKey);
    (transactions || []).forEach(t => {
      if (t?.date) set.add(parseDateToMonthKey(t.date));
    });
    (orders || []).forEach(o => {
      if (o?.deliveryDate || o?.createdAt) {
        set.add(parseDateToMonthKey(o.deliveryDate || o.createdAt));
      }
    });
    return Array.from(set).filter(k => k !== '0000-00').sort((a, b) => b.localeCompare(a));
  }, [transactions, orders, currentMonthKey]);

  // Navigate between months
  const handleNavigateMonth = (direction: 'prev' | 'next') => {
    if (selectedMonth === 'all') {
      setSelectedMonth(currentMonthKey);
      return;
    }
    const idx = availableMonthKeys.indexOf(selectedMonth);
    if (direction === 'prev') {
      if (idx !== -1 && idx < availableMonthKeys.length - 1) {
        setSelectedMonth(availableMonthKeys[idx + 1]);
      } else {
        // Fallback: calculate previous calendar month
        const [y, m] = selectedMonth.split('-').map(Number);
        const prevDate = new Date(y, m - 2, 1);
        const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
        setSelectedMonth(prevKey);
      }
    } else {
      if (idx > 0) {
        setSelectedMonth(availableMonthKeys[idx - 1]);
      } else {
        // Fallback: calculate next calendar month
        const [y, m] = selectedMonth.split('-').map(Number);
        const nextDate = new Date(y, m, 1);
        const nextKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
        setSelectedMonth(nextKey);
      }
    }
  };

  // 1. Filter Orders by Selected Period
  const periodOrders = useMemo(() => {
    return (orders || []).filter(o => {
      if (!o) return false;
      // Filter by period
      if (selectedMonth !== 'all') {
        const orderKey = parseDateToMonthKey(o.deliveryDate || o.createdAt);
        if (orderKey !== selectedMonth) return false;
      }
      // Consider concluded/delivered or ready orders for DRE calculation
      const isConcluded = o.status === 'entregue' || o.status === 'pronto' || o.status === 'em_producao' || o.status === 'pendente';
      const isNotCancelled = o.status !== 'cancelado';
      return isConcluded && isNotCancelled;
    });
  }, [orders, selectedMonth]);

  // 2. Filter Transactions by Selected Period
  const monthFilteredTransactions = useMemo(() => {
    return (transactions || []).filter(t => {
      if (!t) return false;
      if (selectedMonth === 'all') return true;
      return parseDateToMonthKey(t.date || '') === selectedMonth;
    });
  }, [transactions, selectedMonth]);

  const finalFilteredTransactions = useMemo(() => {
    return monthFilteredTransactions.filter(t => {
      if (!t) return false;
      if (filterType === 'receita') return t.type === 'receita';
      if (filterType === 'despesa') return t.type === 'despesa';
      return true;
    });
  }, [monthFilteredTransactions, filterType]);

  // ==========================================
  // DRE GERENCIAL AUTOMÁTICO - APURAÇÃO EXATA
  // ==========================================

  // A. (+) RECEITA BRUTA DE VENDAS
  const dreGrossRevenue = useMemo(() => {
    let balcao = 0;
    let whatsapp = 0;
    let ifood = 0;
    let food99 = 0;

    periodOrders.forEach(o => {
      const val = Number(o.total || 0);
      if (o.channel === 'balcao') balcao += val;
      else if (o.channel === 'whatsapp') whatsapp += val;
      else if (o.channel === 'ifood') ifood += val;
      else if (o.channel === '99food') food99 += val;
      else balcao += val;
    });

    // Also include manually logged revenues in transactions that are not already from orders
    const manualRevenues = monthFilteredTransactions
      .filter(t => t.type === 'receita' && !t.relatedOrderId)
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalFromOrders = balcao + whatsapp + ifood + food99;
    const totalGross = totalFromOrders + manualRevenues;

    return {
      balcao,
      whatsapp,
      ifood,
      food99,
      manualRevenues,
      totalGross: totalGross > 0 ? totalGross : 0
    };
  }, [periodOrders, monthFilteredTransactions]);

  // B. (-) DEDUÇÕES DA RECEITA (TAXAS DE PLATAFORMAS & CARTÕES)
  const dreDeductions = useMemo(() => {
    let ifoodCommissions = 0;
    let food99Commissions = 0;
    let cardFees = 0;

    periodOrders.forEach(o => {
      const orderTotal = Number(o.total || 0);
      
      // Platform commissions
      if (o.channel === 'ifood') {
        const fee = Number(o.platformFeeAmount || 0);
        if (fee > 0) {
          ifoodCommissions += fee;
        } else {
          // Standard iFood fee (commission 23% + payment fee 3.2%)
          ifoodCommissions += orderTotal * 0.262;
        }
      } else if (o.channel === '99food') {
        const fee = Number(o.platformFeeAmount || 0);
        if (fee > 0) {
          food99Commissions += fee;
        } else {
          // Standard 99Food fee (commission 20% + payment fee 2.5%)
          food99Commissions += orderTotal * 0.225;
        }
      } else {
        // Balcão or WhatsApp: Card Machine fees (average 2.5% for credit/debit)
        if (o.paymentMethod === 'cartao_credito' || o.paymentMethod === 'cartao_debito') {
          const rate = o.paymentMethod === 'cartao_credito' ? 0.032 : 0.018;
          cardFees += orderTotal * rate;
        }
      }
    });

    // Add any manually registered platform fees or bank fees from transactions
    const manualFees = monthFilteredTransactions
      .filter(t => t.type === 'despesa' && (
        t.category.toLowerCase().includes('taxa') || 
        t.category.toLowerCase().includes('comissão') ||
        t.category.toLowerCase().includes('comissao')
      ))
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const platformFeesTotal = ifoodCommissions + food99Commissions + manualFees;
    const totalDeductions = platformFeesTotal + cardFees;

    return {
      ifoodCommissions,
      food99Commissions,
      cardFees,
      manualFees,
      platformFeesTotal,
      totalDeductions
    };
  }, [periodOrders, monthFilteredTransactions]);

  // C. (=) RECEITA LÍQUIDA (BASE 100% PARA ANÁLISE VERTICAL)
  const dreNetRevenue = useMemo(() => {
    return Math.max(0, dreGrossRevenue.totalGross - dreDeductions.totalDeductions);
  }, [dreGrossRevenue.totalGross, dreDeductions.totalDeductions]);

  // D. (-) CUSTO DAS MERCADORIAS VENDIDAS (CMV REAL DAS RECEITAS & INSUMOS)
  const dreCMV = useMemo(() => {
    let recipeIngredientsCost = 0;
    let packagingCost = 0;

    periodOrders.forEach(o => {
      (o.items || []).forEach(item => {
        const qty = Number(item.quantity || 1);
        
        // Match with technical sheet
        const sheet = technicalSheets.find(s => 
          (item.sku && s.sku === item.sku) ||
          (s.name && s.name.toLowerCase() === (item.productName || '').toLowerCase())
        );

        // Match with pricing config
        const pricing = pricingConfigs.find(p => 
          (item.sku && p.sku === item.sku) ||
          (p.productName && p.productName.toLowerCase() === (item.productName || '').toLowerCase())
        );

        let unitInsumo = 0;
        let unitPack = 0;

        if (sheet) {
          const yieldDiv = sheet.yieldAmount > 0 ? sheet.yieldAmount : 1;
          unitInsumo = sheet.costPerYieldUnit || (sheet.totalIngredientsCost / yieldDiv);
          unitPack = (sheet.packagingMaterialCost || 0) / yieldDiv;
        } else if (pricing) {
          unitInsumo = pricing.cmvInsumos || 0;
          unitPack = pricing.packagingCost || 0;
        } else {
          // Default artisanal bakery standard: 30% of sales price in ingredients, 3% packaging
          const price = Number(item.unitPrice || 0);
          unitInsumo = price * 0.30;
          unitPack = price * 0.03;
        }

        recipeIngredientsCost += unitInsumo * qty;
        packagingCost += unitPack * qty;
      });
    });

    // Waste / Spoilage registered in transactions
    const wasteCost = monthFilteredTransactions
      .filter(t => t.type === 'despesa' && (
        t.category.toLowerCase().includes('desperdício') ||
        t.category.toLowerCase().includes('desperdicio') ||
        t.category.toLowerCase().includes('perda')
      ))
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Direct ingredient purchases registered in transactions (if no orders or direct replenishment)
    const directMaterialPurchases = monthFilteredTransactions
      .filter(t => t.type === 'despesa' && (
        t.category.toLowerCase().includes('insumo') ||
        t.category.toLowerCase().includes('matéria-prima') ||
        t.category.toLowerCase().includes('materia-prima')
      ))
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Use whichever is higher between theoretical recipe CMV and direct material purchases
    const finalIngredientsCost = Math.max(recipeIngredientsCost, directMaterialPurchases);
    const totalCMV = finalIngredientsCost + packagingCost + wasteCost;

    return {
      recipeIngredientsCost: finalIngredientsCost,
      packagingCost,
      wasteCost,
      totalCMV
    };
  }, [periodOrders, technicalSheets, pricingConfigs, monthFilteredTransactions]);

  // E. (=) MARGEM DE CONTRIBUIÇÃO (RECEITA LÍQUIDA - CMV)
  const dreContributionMargin = useMemo(() => {
    const amount = dreNetRevenue - dreCMV.totalCMV;
    const percent = dreNetRevenue > 0 ? (amount / dreNetRevenue) * 100 : 0;
    return {
      amount,
      percent
    };
  }, [dreNetRevenue, dreCMV.totalCMV]);

  // F. (-) DESPESAS OPERACIONAIS E FIXAS
  const dreFixedExpenses = useMemo(() => {
    let rentAndUtilities = 0; // Aluguel, Água, Luz, Gás dos Fornos
    let personnel = 0; // Folha, Salários, Pró-labore
    let maintenance = 0; // Manutenção de fornos e maquinário
    let marketing = 0; // Tráfego, fotos, promoções
    let otherExpenses = 0; // Outras despesas administrativas

    monthFilteredTransactions
      .filter(t => t.type === 'despesa')
      .forEach(t => {
        const cat = (t.category || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const amt = Number(t.amount || 0);

        // Exclude direct CMV items (insumos, embalagens, taxas de delivery e perdas) already computed in CMV / Deductions
        if (
          cat.includes('insumo') || 
          cat.includes('matéria-prima') || 
          cat.includes('materia-prima') ||
          cat.includes('desperdício') || 
          cat.includes('desperdicio') ||
          cat.includes('perda') ||
          cat.includes('taxa') ||
          cat.includes('comissão') ||
          cat.includes('comissao')
        ) {
          return;
        }

        if (cat.includes('aluguel') || cat.includes('energia') || cat.includes('luz') || cat.includes('água') || cat.includes('agua') || cat.includes('gás') || cat.includes('gas') || cat.includes('fixo')) {
          rentAndUtilities += amt;
        } else if (cat.includes('equipe') || cat.includes('salário') || cat.includes('salario') || cat.includes('pró-labore') || cat.includes('pro-labore') || cat.includes('pessoal') || desc.includes('padeiro') || desc.includes('confeiteir')) {
          personnel += amt;
        } else if (cat.includes('manutenção') || cat.includes('manutencao') || cat.includes('equipamento') || cat.includes('máquina') || cat.includes('maquina')) {
          maintenance += amt;
        } else if (cat.includes('marketing') || cat.includes('promoção') || cat.includes('promocao') || cat.includes('anúncio') || cat.includes('anuncio') || cat.includes('social')) {
          marketing += amt;
        } else {
          otherExpenses += amt;
        }
      });

    const totalFixed = rentAndUtilities + personnel + maintenance + marketing + otherExpenses;

    return {
      rentAndUtilities,
      personnel,
      maintenance,
      marketing,
      otherExpenses,
      totalFixed
    };
  }, [monthFilteredTransactions]);

  // G. (=) LUCRO LÍQUIDO OPERACIONAL
  const dreNetProfit = useMemo(() => {
    const amount = dreContributionMargin.amount - dreFixedExpenses.totalFixed;
    const marginPercent = dreNetRevenue > 0 ? (amount / dreNetRevenue) * 100 : 0;
    const grossMarginPercent = dreGrossRevenue.totalGross > 0 ? (amount / dreGrossRevenue.totalGross) * 100 : 0;
    return {
      amount,
      marginPercent,
      grossMarginPercent,
      isProfitable: amount >= 0
    };
  }, [dreContributionMargin.amount, dreFixedExpenses.totalFixed, dreNetRevenue, dreGrossRevenue.totalGross]);

  // H. PONTO DE EQUILÍBRIO (BREAK-EVEN POINT EM R$)
  const breakEvenPoint = useMemo(() => {
    const marginRate = dreContributionMargin.percent / 100;
    if (marginRate <= 0.05) {
      return {
        amount: dreFixedExpenses.totalFixed > 0 ? dreFixedExpenses.totalFixed * 3 : 0,
        percentReached: 0,
        isAchieved: false,
        difference: 0
      };
    }
    const requiredRevenue = dreFixedExpenses.totalFixed / marginRate;
    const percentReached = requiredRevenue > 0 ? (dreNetRevenue / requiredRevenue) * 100 : 0;
    const isAchieved = dreNetRevenue >= requiredRevenue;
    const difference = dreNetRevenue - requiredRevenue;

    return {
      amount: requiredRevenue,
      percentReached,
      isAchieved,
      difference
    };
  }, [dreFixedExpenses.totalFixed, dreContributionMargin.percent, dreNetRevenue]);

  // Modal Handlers
  const handleOpenAddModal = () => {
    setEditingTr(null);
    setDesc('');
    setType('despesa');
    setAmount(100);
    setCategory('Custos Fixos (Água/Luz/Aluguel)');
    setPaymentMethod('pix');
    setDate(new Date().toISOString().split('T')[0]);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (t: FinancialTransaction) => {
    setEditingTr(t);
    setDesc(t.description);
    setType(t.type);
    setAmount(t.amount);
    setCategory(t.category);
    setPaymentMethod(t.paymentMethod || 'pix');
    setDate(t.date || new Date().toISOString().split('T')[0]);
    setShowAddModal(true);
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim() || amount <= 0) return;

    if (editingTr) {
      updateTransaction(editingTr.id, {
        description: desc,
        type,
        category,
        amount: Number(amount),
        date,
        paymentMethod,
        status: 'pago'
      });
    } else {
      addTransaction({
        description: desc,
        type,
        category,
        amount: Number(amount),
        date,
        paymentMethod,
        status: 'pago'
      });
    }

    setShowAddModal(false);
    setEditingTr(null);
  };

  const handleConfirmDelete = (id: string) => {
    deleteTransaction(id);
    setDeletingTrId(null);
  };

  // Helper for DRE Vertical Percentage
  const getPercentOfNet = (val: number) => {
    if (dreNetRevenue <= 0) return '0.0%';
    return `${((val / dreNetRevenue) * 100).toFixed(1)}%`;
  };

  const getPercentOfGross = (val: number) => {
    if (dreGrossRevenue.totalGross <= 0) return '0.0%';
    return `${((val / dreGrossRevenue.totalGross) * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8DFD5] dark:border-[#3F4147]">
        <div>
          <h2 className="font-serif-brand text-2xl font-bold text-[#352527] dark:text-[#FFFFFF] flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-[#B86B77]" />
            <span>Gestão Financeira & DRE Gerencial Automático</span>
          </h2>
          <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1]">
            Demonstrativo do Resultado do Exercício com apuração do lucro real, deduções de delivery, CMV das receitas e ponto de equilíbrio
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-xl bg-[#B86B77] hover:bg-[#9E5460] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* 2. Seletor de Período (Mês Atual / Filtro por Mês e Ano) */}
      <div className="p-4 bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left: Indicator & Quick Navigation */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#B86B77]/15 border border-[#B86B77]/30 text-[#B86B77] flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#7A6466] dark:text-[#B5BAC1]">
                Competência Ativa:
              </span>
              {selectedMonth === currentMonthKey && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300">
                  Mês Atual (Em Andamento)
                </span>
              )}
            </div>
            <h3 className="font-serif-brand text-lg font-bold text-[#352527] dark:text-[#FFFFFF] leading-tight">
              {formatMonthLabel(selectedMonth)}
            </h3>
          </div>
        </div>

        {/* Right: Period Dropdown, Month Switcher & Preset Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Preset 'Mês Atual' Button */}
          <button
            onClick={() => setSelectedMonth(currentMonthKey)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedMonth === currentMonthKey
                ? 'bg-[#352527] dark:bg-white text-white dark:text-[#1E1F22] shadow-xs'
                : 'bg-[#FAF7F2] dark:bg-[#1E1F22] text-[#7A6466] dark:text-[#B5BAC1] border border-[#E5DACF] dark:border-[#3F4147] hover:bg-[#EAE0D5]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Mês Atual</span>
          </button>

          {/* Month Step Navigation (< >) */}
          <div className="flex items-center bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#E5DACF] dark:border-[#3F4147] p-0.5">
            <button
              onClick={() => handleNavigateMonth('prev')}
              className="p-1.5 text-[#543E40] dark:text-stone-300 hover:text-[#B86B77] rounded-lg transition-colors cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-bold px-2 text-[#7A6466] dark:text-[#B5BAC1]">Navegar</span>
            <button
              onClick={() => handleNavigateMonth('next')}
              className="p-1.5 text-[#543E40] dark:text-stone-300 hover:text-[#B86B77] rounded-lg transition-colors cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Month Dropdown Selector */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="text-xs font-bold px-3.5 py-2 pr-8 rounded-xl bg-[#FAF7F2] dark:bg-[#1E1F22] border border-[#DACDC0] dark:border-[#3F4147] text-[#352527] dark:text-[#FFFFFF] shadow-2xs focus:ring-2 focus:ring-[#B86B77] outline-none cursor-pointer appearance-none"
            >
              <option value="all">Visão Consolidada (Todos os Anos e Meses)</option>
              {availableMonthKeys.map(mk => (
                <option key={mk} value={mk}>
                  {formatMonthLabel(mk)} {mk === currentMonthKey ? '★ (Atual)' : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
          </div>

        </div>

      </div>

      {/* 3. Cartões Resumo no Topo com as Métricas Mais Importantes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Lucro Real (R$) */}
        <div className={`p-4 rounded-2xl border-2 shadow-2xs space-y-1 transition-all ${
          dreNetProfit.isProfitable
            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
            : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
        }`}>
          <div className="text-xs font-semibold flex items-center justify-between">
            <span className={dreNetProfit.isProfitable ? 'text-emerald-900 dark:text-emerald-200' : 'text-rose-900 dark:text-rose-200'}>
              Lucro Real Operacional
            </span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              dreNetProfit.isProfitable ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}>
              {dreNetProfit.isProfitable ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div className={`font-serif-brand text-2xl sm:text-3xl font-black ${
            dreNetProfit.isProfitable ? 'text-emerald-800 dark:text-emerald-400' : 'text-rose-800 dark:text-rose-400'
          }`}>
            {dreNetProfit.isProfitable ? '+' : ''} R$ {dreNetProfit.amount.toFixed(2)}
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold pt-1">
            <span className={dreNetProfit.isProfitable ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}>
              {dreNetProfit.isProfitable ? 'Superávit Líquido' : 'Déficit Operacional'}
            </span>
            <span className="text-stone-500 dark:text-stone-400 font-mono">
              Margem: {dreNetProfit.marginPercent.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Card 2: Margem Líquida (%) */}
        <div className="p-4 bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#EBE1D7] dark:border-[#3F4147] shadow-2xs space-y-1">
          <div className="text-xs font-semibold text-[#7A6466] dark:text-[#B5BAC1] flex items-center justify-between">
            <span>Margem Líquida Real</span>
            <div className="w-7 h-7 rounded-lg bg-[#B86B77]/15 text-[#B86B77] flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif-brand text-2xl sm:text-3xl font-black text-[#352527] dark:text-[#FFFFFF]">
            {dreNetProfit.marginPercent.toFixed(1)}%
          </div>
          <div className="text-[11px] text-[#7A6466] dark:text-[#B5BAC1] flex items-center justify-between pt-1">
            <span>Sobre Receita Líquida</span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">Meta: 15% a 25%</span>
          </div>
        </div>

        {/* Card 3: Ponto de Equilíbrio (R$) */}
        <div className="p-4 bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#EBE1D7] dark:border-[#3F4147] shadow-2xs space-y-1">
          <div className="text-xs font-semibold text-[#7A6466] dark:text-[#B5BAC1] flex items-center justify-between">
            <span>Ponto de Equilíbrio (Breakeven)</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif-brand text-2xl sm:text-3xl font-black text-[#352527] dark:text-[#FFFFFF]">
            R$ {breakEvenPoint.amount.toFixed(2)}
          </div>
          <div className="text-[11px] pt-1">
            {breakEvenPoint.isAchieved ? (
              <span className="text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Superado (+R$ {breakEvenPoint.difference.toFixed(2)})
              </span>
            ) : (
              <span className="text-amber-700 dark:text-amber-300 font-semibold">
                Faltam R$ {Math.abs(breakEvenPoint.difference).toFixed(2)} ({breakEvenPoint.percentReached.toFixed(0)}%)
              </span>
            )}
          </div>
        </div>

        {/* Card 4: Margem de Contribuição Total */}
        <div className="p-4 bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#EBE1D7] dark:border-[#3F4147] shadow-2xs space-y-1">
          <div className="text-xs font-semibold text-[#7A6466] dark:text-[#B5BAC1] flex items-center justify-between">
            <span>Margem de Contribuição</span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif-brand text-2xl sm:text-3xl font-black text-blue-900 dark:text-blue-300">
            R$ {dreContributionMargin.amount.toFixed(2)}
          </div>
          <div className="text-[11px] text-[#7A6466] dark:text-[#B5BAC1] flex items-center justify-between pt-1">
            <span>{dreContributionMargin.percent.toFixed(1)}% da Rec. Líquida</span>
            <span className="font-mono text-stone-500">CMV: {getPercentOfNet(dreCMV.totalCMV)}</span>
          </div>
        </div>

      </div>

      {/* 4. DRE Gerencial Estruturado Hierarquicamente */}
      <div className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] overflow-hidden shadow-2xs">
        
        {/* DRE Header */}
        <div className="p-4 bg-[#FAF7F2] dark:bg-[#1E1F22] border-b border-[#E8DFD5] dark:border-[#3F4147] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-5 h-5 text-[#B86B77]" />
            <div>
              <h3 className="font-serif-brand text-lg font-bold text-[#352527] dark:text-[#FFFFFF]">
                DRE Gerencial Automático - {formatMonthLabel(selectedMonth)}
              </h3>
              <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1]">
                Demonstrativo contábil-gerencial apurado com base em {periodOrders.length} pedidos e lançamentos operacionais
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowDreDetails(!showDreDetails)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#2B2D31] border border-[#DACDC0] dark:border-[#3F4147] text-xs font-bold text-[#543E40] dark:text-stone-300 flex items-center gap-1.5 cursor-pointer hover:bg-stone-50"
          >
            {showDreDetails ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span>Ocultar Detalhamento</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>Expandir Detalhamento</span>
              </>
            )}
          </button>
        </div>

        {/* DRE Table / Hierarchical List */}
        <div className="divide-y divide-[#F0E8DF] dark:divide-[#3A3C42] text-xs">
          
          {/* 1. (+) RECEITA BRUTA DE VENDAS */}
          <div className="bg-[#FAF8F5] dark:bg-[#232428] p-3.5 px-5 flex items-center justify-between font-bold">
            <div className="flex items-center gap-2 text-sm text-[#352527] dark:text-[#FFFFFF]">
              <span className="text-emerald-700 font-mono text-base">(+)</span>
              <span>RECEITA BRUTA DE VENDAS</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-stone-500 dark:text-stone-400 text-xs hidden sm:inline">
                {getPercentOfGross(dreGrossRevenue.totalGross)}
              </span>
              <span className="font-mono text-base text-emerald-800 dark:text-emerald-400 font-black">
                R$ {dreGrossRevenue.totalGross.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Subitens da Receita Bruta por Canal */}
          {showDreDetails && (
            <div className="bg-white dark:bg-[#2B2D31] divide-y divide-[#F5EFE8] dark:divide-[#33353A] pl-8 pr-5 py-1">
              <div className="py-2 flex items-center justify-between text-[#6E595B] dark:text-[#B5BAC1]">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-stone-400"></span>
                  Vendas no Balcão (Loja Física)
                </span>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[11px] text-stone-400">{getPercentOfGross(dreGrossRevenue.balcao)}</span>
                  <span className="font-mono font-semibold text-stone-800 dark:text-stone-200">
                    R$ {dreGrossRevenue.balcao.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="py-2 flex items-center justify-between text-[#6E595B] dark:text-[#B5BAC1]">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Vendas via WhatsApp & Encomendas Diretas
                </span>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[11px] text-stone-400">{getPercentOfGross(dreGrossRevenue.whatsapp)}</span>
                  <span className="font-mono font-semibold text-stone-800 dark:text-stone-200">
                    R$ {dreGrossRevenue.whatsapp.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="py-2 flex items-center justify-between text-[#6E595B] dark:text-[#B5BAC1]">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  Vendas Delivery iFood
                </span>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[11px] text-stone-400">{getPercentOfGross(dreGrossRevenue.ifood)}</span>
                  <span className="font-mono font-semibold text-stone-800 dark:text-stone-200">
                    R$ {dreGrossRevenue.ifood.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="py-2 flex items-center justify-between text-[#6E595B] dark:text-[#B5BAC1]">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  Vendas Delivery 99Food
                </span>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[11px] text-stone-400">{getPercentOfGross(dreGrossRevenue.food99)}</span>
                  <span className="font-mono font-semibold text-stone-800 dark:text-stone-200">
                    R$ {dreGrossRevenue.food99.toFixed(2)}
                  </span>
                </div>
              </div>

              {dreGrossRevenue.manualRevenues > 0 && (
                <div className="py-2 flex items-center justify-between text-[#6E595B] dark:text-[#B5BAC1]">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Outras Entradas Avulsas no Caixa
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[11px] text-stone-400">{getPercentOfGross(dreGrossRevenue.manualRevenues)}</span>
                    <span className="font-mono font-semibold text-stone-800 dark:text-stone-200">
                      R$ {dreGrossRevenue.manualRevenues.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. (-) DEDUÇÕES DA RECEITA (TAXAS) */}
          <div className="bg-[#FAF8F5] dark:bg-[#232428] p-3.5 px-5 flex items-center justify-between font-bold">
            <div className="flex items-center gap-2 text-sm text-[#352527] dark:text-[#FFFFFF]">
              <span className="text-rose-600 font-mono text-base">(-)</span>
              <span>DEDUÇÕES DA RECEITA (COMISSÕES DE PLATAFORMAS & TAXAS DE CARTÃO)</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-stone-500 dark:text-stone-400 text-xs hidden sm:inline">
                - {getPercentOfGross(dreDeductions.totalDeductions)}
              </span>
              <span className="font-mono text-base text-rose-700 dark:text-rose-400 font-black">
                - R$ {dreDeductions.totalDeductions.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Subitens das Deduções */}
          {showDreDetails && (
            <div className="bg-white dark:bg-[#2B2D31] divide-y divide-[#F5EFE8] dark:divide-[#33353A] pl-8 pr-5 py-1">
              <div className="py-2 flex items-center justify-between text-[#6E595B] dark:text-[#B5BAC1]">
                <span>Comissões Retidas pelo iFood (Comissão % + Taxa de Pagamento)</span>
                <span className="font-mono font-semibold text-rose-600">
                  - R$ {dreDeductions.ifoodCommissions.toFixed(2)}
                </span>
              </div>

              <div className="py-2 flex items-center justify-between text-[#6E595B] dark:text-[#B5BAC1]">
                <span>Comissões Retidas pelo 99Food</span>
                <span className="font-mono font-semibold text-rose-600">
                  - R$ {dreDeductions.food99Commissions.toFixed(2)}
                </span>
              </div>

              <div className="py-2 flex items-center justify-between text-[#6E595B] dark:text-[#B5BAC1]">
                <span>Taxas de Operadoras de Cartão de Crédito e Débito (Balcão/WhatsApp)</span>
                <span className="font-mono font-semibold text-rose-600">
                  - R$ {dreDeductions.cardFees.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* 3. (=) RECEITA LÍQUIDA */}
          <div className="bg-[#F4ECE4] dark:bg-[#2F3136] p-4 px-5 flex items-center justify-between font-black border-y-2 border-[#E5DACF] dark:border-[#4E5058]">
            <div className="flex items-center gap-2 text-sm sm:text-base text-[#352527] dark:text-[#FFFFFF]">
              <span className="text-[#B86B77] font-mono text-lg">(=)</span>
              <span>RECEITA OPERACIONAL LÍQUIDA</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-stone-600 dark:text-stone-300 text-xs hidden sm:inline">
                100.0% Líquido
              </span>
              <span className="font-mono text-lg text-[#352527] dark:text-[#FFFFFF]">
                R$ {dreNetRevenue.toFixed(2)}
              </span>
            </div>
          </div>

          {/* 4. (-) CUSTO DAS MERCADORIAS VENDIDAS (CMV) */}
          <div className="bg-[#FAF8F5] dark:bg-[#232428] p-3.5 px-5 flex items-center justify-between font-bold">
            <div className="flex items-center gap-2 text-sm text-[#352527] dark:text-[#FFFFFF]">
              <span className="text-rose-600 font-mono text-base">(-)</span>
              <span>CUSTO DAS MERCADORIAS VENDIDAS (CMV REAL)</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-stone-500 dark:text-stone-400 text-xs hidden sm:inline">
                - {getPercentOfNet(dreCMV.totalCMV)}
              </span>
              <span className="font-mono text-base text-rose-700 dark:text-rose-400 font-black">
                - R$ {dreCMV.totalCMV.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Subitens do CMV */}
          {showDreDetails && (
            <div className="bg-white dark:bg-[#2B2D31] divide-y divide-[#F5EFE8] dark:divide-[#33353A] pl-8 pr-5 py-1">
              <div className="py-2 flex items-center justify-between text-[#6E595B] dark:text-[#B5BAC1]">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                  Insumos & Matérias-Primas das Receitas Consumidas
                </span>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[11px] text-stone-400">{getPercentOfNet(dreCMV.recipeIngredientsCost)}</span>
                  <span className="font-mono font-semibold text-rose-600">
                    - R$ {dreCMV.recipeIngredientsCost.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="py-2 flex items-center justify-between text-[#6E595B] dark:text-[#B5BAC1]">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  Embalagens, Caixas e Descartáveis
                </span>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[11px] text-stone-400">{getPercentOfNet(dreCMV.packagingCost)}</span>
                  <span className="font-mono font-semibold text-rose-600">
                    - R$ {dreCMV.packagingCost.toFixed(2)}
                  </span>
                </div>
              </div>

              {dreCMV.wasteCost > 0 && (
                <div className="py-2 flex items-center justify-between text-[#6E595B] dark:text-[#B5BAC1]">
                  <span className="flex items-center gap-2 text-rose-600">
                    <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                    Perdas, Avarias & Desperdício de Insumos
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[11px] text-stone-400">{getPercentOfNet(dreCMV.wasteCost)}</span>
                    <span className="font-mono font-semibold text-rose-600">
                      - R$ {dreCMV.wasteCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. (=) MARGEM DE CONTRIBUIÇÃO */}
          <div className="bg-[#EBF3FC] dark:bg-[#202836] p-4 px-5 flex items-center justify-between font-black border-y-2 border-blue-200 dark:border-blue-900">
            <div className="flex items-center gap-2 text-sm sm:text-base text-blue-950 dark:text-blue-200">
              <span className="text-blue-600 font-mono text-lg">(=)</span>
              <span>MARGEM DE CONTRIBUIÇÃO (LUCRO BRUTO DA PRODUÇÃO)</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-blue-800 dark:text-blue-300 text-xs hidden sm:inline font-bold">
                {dreContributionMargin.percent.toFixed(1)}% Margem
              </span>
              <span className="font-mono text-lg text-blue-950 dark:text-blue-300">
                R$ {dreContributionMargin.amount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* 6. (-) DESPESAS OPERACIONAIS E FIXAS */}
          <div className="bg-[#FAF8F5] dark:bg-[#232428] p-3.5 px-5 flex items-center justify-between font-bold">
            <div className="flex items-center gap-2 text-sm text-[#352527] dark:text-[#FFFFFF]">
              <span className="text-rose-600 font-mono text-base">(-)</span>
              <span>DESPESAS OPERACIONAIS E CUSTOS FIXOS</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-stone-500 dark:text-stone-400 text-xs hidden sm:inline">
                - {getPercentOfNet(dreFixedExpenses.totalFixed)}
              </span>
              <span className="font-mono text-base text-rose-700 dark:text-rose-400 font-black">
                - R$ {dreFixedExpenses.totalFixed.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Subitens das Despesas Fixas */}
          {showDreDetails && (
            <div className="bg-white dark:bg-[#2B2D31] divide-y divide-[#F5EFE8] dark:divide-[#33353A] pl-8 pr-5 py-1">
              <div className="py-2 flex items-center justify-between text-[#6E595B] dark:text-[#B5BAC1]">
                <span>Instalações & Utilidades (Aluguel, Energia dos Fornos, Água, Gás)</span>
                <span className="font-mono font-semibold text-rose-600">
                  - R$ {dreFixedExpenses.rentAndUtilities.toFixed(2)}
                </span>
              </div>

              <div className="py-2 flex items-center justify-between text-[#6E595B] dark:text-[#B5BAC1]">
                <span>Folha de Pessoal, Padeiros, Confeiteiros & Pró-labore</span>
                <span className="font-mono font-semibold text-rose-600">
                  - R$ {dreFixedExpenses.personnel.toFixed(2)}
                </span>
              </div>

              <div className="py-2 flex items-center justify-between text-[#6E595B] dark:text-[#B5BAC1]">
                <span>Manutenção Preventiva de Maquinário & Fornos</span>
                <span className="font-mono font-semibold text-rose-600">
                  - R$ {dreFixedExpenses.maintenance.toFixed(2)}
                </span>
              </div>

              <div className="py-2 flex items-center justify-between text-[#6E595B] dark:text-[#B5BAC1]">
                <span>Marketing, Fotos Profissionais & Softwares de Gestão</span>
                <span className="font-mono font-semibold text-rose-600">
                  - R$ {dreFixedExpenses.marketing.toFixed(2)}
                </span>
              </div>

              {dreFixedExpenses.otherExpenses > 0 && (
                <div className="py-2 flex items-center justify-between text-[#6E595B] dark:text-[#B5BAC1]">
                  <span>Outras Despesas Administrativas e Diversas</span>
                  <span className="font-mono font-semibold text-rose-600">
                    - R$ {dreFixedExpenses.otherExpenses.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 7. (=) LUCRO LÍQUIDO OPERACIONAL (DESTAQUE VISUAL VERDE / VERMELHO) */}
          <div className={`p-5 px-6 flex items-center justify-between font-black transition-all ${
            dreNetProfit.isProfitable
              ? 'bg-emerald-600 text-white shadow-inner'
              : 'bg-rose-700 text-white shadow-inner'
          }`}>
            <div>
              <div className="flex items-center gap-2.5 text-base sm:text-lg">
                <span className="font-mono text-xl">(=)</span>
                <span>LUCRO LÍQUIDO OPERACIONAL REAL</span>
              </div>
              <p className="text-xs opacity-90 font-normal mt-0.5">
                {dreNetProfit.isProfitable 
                  ? 'Operação lucrativa com cobertura integral de custos fixos e variáveis'
                  : 'Atenção: A operação encontra-se abaixo do ponto de equilíbrio no período selecionado'}
              </p>
            </div>

            <div className="text-right">
              <div className="text-xl sm:text-2xl font-black font-mono">
                {dreNetProfit.isProfitable ? '+' : ''} R$ {dreNetProfit.amount.toFixed(2)}
              </div>
              <div className="text-xs opacity-95 font-semibold">
                Margem Líquida: {dreNetProfit.marginPercent.toFixed(1)}%
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* 5. Extrato Geral de Lançamentos Financeiros */}
      <div className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] overflow-hidden shadow-2xs space-y-3">
        <div className="p-4 bg-[#FAF7F2] dark:bg-[#1E1F22] border-b border-[#E8DFD5] dark:border-[#3F4147] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <h3 className="font-bold text-[#352527] dark:text-[#FFFFFF] uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#B86B77]" />
              <span>Extrato de Lançamentos & Despesas Fixas ({finalFilteredTransactions.length})</span>
            </h3>
            <span className="text-[11px] text-[#7A6466] dark:text-[#B5BAC1]">
              {selectedMonth === 'all' ? 'Exibindo todos os períodos' : `Exibindo lançamentos de ${formatMonthLabel(selectedMonth)}`}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                filterType === 'all'
                  ? 'bg-[#594446] text-white'
                  : 'bg-white dark:bg-[#1E1F22] text-[#5E484B] dark:text-[#B5BAC1] border border-[#E0D3C5] dark:border-[#3F4147]'
              }`}
            >
              Todos ({monthFilteredTransactions.length})
            </button>
            <button
              onClick={() => setFilterType('receita')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                filterType === 'receita'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white dark:bg-[#1E1F22] text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-950'
              }`}
            >
              Receitas
            </button>
            <button
              onClick={() => setFilterType('despesa')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                filterType === 'despesa'
                  ? 'bg-red-700 text-white'
                  : 'bg-white dark:bg-[#1E1F22] text-red-800 dark:text-rose-400 border border-red-200 dark:border-rose-950'
              }`}
            >
              Despesas
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] dark:bg-[#1E1F22] border-b border-[#E8DFD5] dark:border-[#3F4147] text-[#7A6466] dark:text-[#B5BAC1] font-semibold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Data</th>
                <th className="p-3.5">Descrição</th>
                <th className="p-3.5">Categoria</th>
                <th className="p-3.5">Forma Pagamento</th>
                <th className="p-3.5 text-right">Valor</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E8DF] dark:divide-[#3F4147]">
              {finalFilteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs text-[#8C7678] dark:text-stone-400">
                    Nenhum lançamento financeiro registrado nesta competência. Use o botão "+ Novo Lançamento" acima para cadastrar contas fixas e variáveis.
                  </td>
                </tr>
              ) : (
                (finalFilteredTransactions || []).map(t => {
                  if (!t) return null;
                  const isIncome = t.type === 'receita';
                  return (
                    <tr key={t.id} className="hover:bg-[#FAF7F2] dark:hover:bg-[#35373C] transition-colors">
                      <td className="p-3.5 font-mono text-[#7A6466] dark:text-[#B5BAC1]">
                        {t.date}
                      </td>

                      <td className="p-3.5 font-bold text-[#352527] dark:text-[#FFFFFF]">
                        {t.description}
                      </td>

                      <td className="p-3.5 text-[#6E595B] dark:text-[#B5BAC1]">
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-[11px] font-medium">
                          {t.category}
                        </span>
                      </td>

                      <td className="p-3.5 font-medium uppercase text-[#553E41] dark:text-stone-300 text-[11px]">
                        {t.paymentMethod}
                      </td>

                      <td className="p-3.5 text-right font-mono font-bold text-sm">
                        <span className={isIncome ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-rose-400'}>
                          {isIncome ? '+' : '-'} R$ {(t.amount ?? 0).toFixed(2)}
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                          {t.status === 'pago' ? 'Liquidado' : 'Pendente'}
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(t)}
                            className="p-1.5 text-stone-500 hover:text-[#B86B77] hover:bg-[#FAF0F2] rounded-lg transition-colors cursor-pointer"
                            title="Editar lançamento"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingTrId(t.id)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Excluir lançamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* 6. Add/Edit Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-2xl border border-[#E5DACF] dark:border-[#3F4147] shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EBE1D7] dark:border-[#3F4147] flex items-center justify-between bg-[#F4EFEA] dark:bg-[#2B2D31]">
              <h3 className="font-serif-brand text-lg font-bold text-[#352527] dark:text-[#FFFFFF]">
                {editingTr ? 'Editar Lançamento Financeiro' : 'Novo Lançamento Financeiro'}
              </h3>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="text-stone-400 hover:text-stone-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#543E40] dark:text-stone-300 mb-1">Tipo de Transação</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('despesa')}
                    className={`py-2 rounded-lg font-bold border transition-colors cursor-pointer ${
                      type === 'despesa'
                        ? 'bg-red-700 text-white border-red-700'
                        : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-[#DACDC0] dark:border-stone-700'
                    }`}
                  >
                    Despesa / Saída
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('receita')}
                    className={`py-2 rounded-lg font-bold border transition-colors cursor-pointer ${
                      type === 'receita'
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-[#DACDC0] dark:border-stone-700'
                    }`}
                  >
                    Receita / Entrada
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#543E40] dark:text-stone-300 mb-1">Descrição *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aluguel da Loja, Conta de Luz dos Fornos, Água..."
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white outline-none focus:ring-1 focus:ring-[#B86B77]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#543E40] dark:text-stone-300 mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#543E40] dark:text-stone-300 mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.10"
                    min="0.01"
                    required
                    value={amount}
                    onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-3 py-2 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#543E40] dark:text-stone-300 mb-1">Forma de Pagamento</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
                  >
                    <option value="pix">Pix</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                    <option value="boleto">Boleto Bancário</option>
                    <option value="dinheiro">Dinheiro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#543E40] dark:text-stone-300 mb-1">Categoria de Custos</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white dark:bg-[#2B2D31] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
                  >
                    <option value="Custos Fixos (Água/Luz/Aluguel)">Custos Fixos (Água/Luz/Aluguel)</option>
                    <option value="Folha de Pagamento & Equipe">Folha de Pagamento & Equipe</option>
                    <option value="Manutenção & Equipamentos">Manutenção & Equipamentos</option>
                    <option value="Marketing & Promoções">Marketing & Promoções</option>
                    <option value="Compra Insumos">Compra Insumos (Matéria-prima)</option>
                    <option value="Embalagens">Embalagens</option>
                    <option value="Desperdício / Perda de Insumos">Desperdício / Perda de Insumos</option>
                    <option value="Outras Despesas Administrativas">Outras Despesas Administrativas</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E8DFD5] dark:border-[#3F4147]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#DACDC0] bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#B86B77] hover:bg-[#9E5460] text-white cursor-pointer"
                >
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Confirm Delete Modal */}
      {deletingTrId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] p-6 max-w-sm w-full space-y-4 text-xs shadow-xl">
            <h3 className="font-bold text-sm text-[#352527] dark:text-[#FFFFFF]">Excluir Lançamento Financeiro?</h3>
            <p className="text-[#6E595B] dark:text-[#B5BAC1]">
              Esta ação removerá a transação do extrato financeiro e atualizará automaticamente o DRE Gerencial.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingTrId(null)}
                className="px-3 py-1.5 rounded-xl border border-[#DACDC0] bg-white dark:bg-stone-800 font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleConfirmDelete(deletingTrId)}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
