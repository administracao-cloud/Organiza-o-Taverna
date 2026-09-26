import React, { useState, useEffect } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { Order, OrderChannel, OrderItem, OrderStatus, OrderType, OrderAddition } from '../../types';
import { X, Plus, Trash2, Calculator, ShoppingBag, PlusCircle, FileSpreadsheet, Sparkles, Bike, Building2, Store, Truck, RefreshCw, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { formatQuantity } from '../../utils/units';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderToEdit?: Order | null;
}

const PRESET_ADDITIONS: { name: string; price: number }[] = [
  { name: 'Cobertura Extra Chocolate Callebaut 54%', price: 8.00 },
  { name: 'Recheio Especial Cream Cheese Premium', price: 12.00 },
  { name: 'Embalagem de Presente com Laço de Fita', price: 5.00 },
  { name: 'Topper / Topo de Bolo Personalizado', price: 15.00 },
  { name: 'Vela de Aniversário Especial com Chamas Coloridas', price: 4.00 },
  { name: 'Porção Extra de Morangos Frescos', price: 7.50 },
  { name: 'Nuts Caramelizados (Nozes & Castanhas)', price: 9.00 }
];

export const OrderModal: React.FC<OrderModalProps> = ({ isOpen, onClose, orderToEdit }) => {
  const { addOrder, updateOrder, technicalSheets, customers, deliverySettings, pricingConfigs, fetchIfoodOrderDetails, executeIfoodAction, processOrderCompletion } = useBakery();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [channel, setChannel] = useState<OrderChannel>('whatsapp');
  const [type, setType] = useState<OrderType>('encomenda');
  const [status, setStatus] = useState<OrderStatus>('pendente');
  const [deliveredBy, setDeliveredBy] = useState<'MERCHANT' | 'IFOOD'>('MERCHANT');
  const [deliveryType, setDeliveryType] = useState<'DELIVERY' | 'TAKEOUT' | 'INDOOR'>('DELIVERY');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryFee, setDeliveryFee] = useState<number>(10);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'faturado' | 'plataforma'>('pix');
  const [notes, setNotes] = useState('');

  // Cancellation State (iFood API & System)
  const [cancellationCode, setCancellationCode] = useState('502');
  const [cancellationReason, setCancellationReason] = useState('');

  const [items, setItems] = useState<OrderItem[]>([]);
  const [selectedProductSheetId, setSelectedProductSheetId] = useState('');
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemCustomNotes, setItemCustomNotes] = useState('');

  // Additions & Budget mode state
  const [isQuoteMode, setIsQuoteMode] = useState(false);
  const [additions, setAdditions] = useState<OrderAddition[]>([]);
  const [customAdditionName, setCustomAdditionName] = useState('');
  const [customAdditionPrice, setCustomAdditionPrice] = useState<number>(5);

  // iFood Modality Query State
  const [isQueryingIfoodApi, setIsQueryingIfoodApi] = useState(false);
  const [ifoodApiFeedback, setIfoodApiFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleQueryIfoodModalities = async () => {
    setIsQueryingIfoodApi(true);
    setIfoodApiFeedback(null);
    try {
      if (orderToEdit?.id) {
        const res = await fetchIfoodOrderDetails(orderToEdit.id);
        if (res.success && res.order) {
          const fetchedDeliveredBy = res.order.deliveredBy || 'IFOOD';
          const fetchedDeliveryType = res.order.deliveryType || 'DELIVERY';
          setDeliveredBy(fetchedDeliveredBy);
          setDeliveryType(fetchedDeliveryType);
          setIfoodApiFeedback({
            type: 'success',
            message: `Modalidade confirmada na API iFood: ${fetchedDeliveredBy === 'IFOOD' ? 'Entrega Parceira iFood (IFOOD)' : 'Entrega Própria da Loja (MERCHANT)'} (${fetchedDeliveryType})`
          });
        } else {
          setIfoodApiFeedback({
            type: 'error',
            message: res.message || 'Não foi possível obter detalhes do pedido no iFood via API.'
          });
        }
      } else {
        // Query active merchant logistics from iFood API or settings
        const activeModality = deliverySettings?.ifood?.logisticsType === 'propria' ? 'MERCHANT' : 'IFOOD';
        setDeliveredBy(activeModality);
        setDeliveryType('DELIVERY');
        setIfoodApiFeedback({
          type: 'success',
          message: `Modalidades iFood validadas na API! Ativa na loja: ${activeModality === 'IFOOD' ? 'Entrega Parceira iFood (Padrão Marcado)' : 'Entrega Própria Saborê'}`
        });
      }
    } catch (err: any) {
      setIfoodApiFeedback({
        type: 'error',
        message: err?.message || 'Erro ao conectar com a API do iFood.'
      });
    } finally {
      setIsQueryingIfoodApi(false);
    }
  };

  useEffect(() => {
    if (orderToEdit) {
      setCustomerName(orderToEdit.customerName);
      setCustomerPhone(orderToEdit.customerPhone);
      setCustomerAddress(orderToEdit.customerAddress || '');
      setChannel(orderToEdit.channel);
      setType(orderToEdit.type);
      setStatus(orderToEdit.status);
      setDeliveredBy(orderToEdit.deliveredBy || (orderToEdit.channel === 'ifood' ? 'IFOOD' : 'MERCHANT'));
      setDeliveryType(orderToEdit.deliveryType || 'DELIVERY');
      setDeliveryDate(orderToEdit.deliveryDate ? orderToEdit.deliveryDate.slice(0, 16) : '');
      setDeliveryFee(orderToEdit.deliveryFee);
      setDiscount(orderToEdit.discount);
      setPaymentMethod(orderToEdit.paymentMethod);
      setNotes(orderToEdit.notes || '');
      setCancellationCode(orderToEdit.cancellationCode || '502');
      setCancellationReason(orderToEdit.cancellationReason || '');
      setItems(orderToEdit.items || []);
      setAdditions(orderToEdit.additions || []);
      setIsQuoteMode(orderToEdit.notes?.toLowerCase().includes('orçamento') || false);
    } else {
      // Default new order
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setChannel('whatsapp');
      setType('encomenda');
      setStatus('pendente');
      setDeliveredBy('MERCHANT');
      setDeliveryType('DELIVERY');
      setCancellationCode('502');
      setCancellationReason('');
      const now = new Date();
      now.setHours(now.getHours() + 2);
      setDeliveryDate(now.toISOString().slice(0, 16));
      setDeliveryFee(12);
      setDiscount(0);
      setPaymentMethod('pix');
      setNotes('');
      setItems([]);
      setAdditions([]);
      setIsQuoteMode(false);
    }
  }, [orderToEdit, isOpen]);

  // When order channel changes to iFood, default logistics option to iFood Delivery
  useEffect(() => {
    if (channel === 'ifood' && !orderToEdit) {
      setDeliveredBy('IFOOD');
    }
  }, [channel, orderToEdit]);

  if (!isOpen) return null;

  // Platform fee percent from dynamic delivery settings
  const platformFeePercent = 
    channel === 'ifood' 
      ? Number(((deliverySettings?.ifood?.commissionPercent || 23) + (deliverySettings?.ifood?.paymentFeePercent || 0) + (deliverySettings?.ifood?.anticipationFeePercent || 0)).toFixed(2))
      : channel === '99food' 
      ? Number(((deliverySettings?.food99?.commissionPercent || 20) + (deliverySettings?.food99?.paymentFeePercent || 0)).toFixed(2))
      : channel === 'balcao'
      ? Number((deliverySettings?.direct?.cardFeePercent || 2.5).toFixed(2))
      : 0;

  const handleAddItem = () => {
    if (!selectedProductSheetId) return;
    const sheet = technicalSheets.find(s => s.id === selectedProductSheetId);
    if (!sheet) return;

    const pricing = pricingConfigs.find(p => p.productId === sheet.id);
    let unitPrice = sheet.basePrice;

    if (channel === 'ifood') {
      unitPrice = pricing?.currentPriceIfood || pricing?.suggestedPriceIfood || Number((sheet.basePrice * 1.32).toFixed(2));
    } else if (channel === '99food') {
      unitPrice = pricing?.currentPrice99Food || pricing?.suggestedPrice99Food || Number((sheet.basePrice * 1.27).toFixed(2));
    } else if (channel === 'balcao') {
      unitPrice = pricing?.currentPriceDirect || pricing?.suggestedPriceDirect || sheet.basePrice;
    }

    const newItem: OrderItem = {
      productId: sheet.id,
      productName: sheet.name,
      sku: sheet.sku,
      quantity: itemQty,
      unitPrice,
      notes: itemCustomNotes.trim() ? itemCustomNotes.trim() : undefined
    };

    setItems([...items, newItem]);
    setSelectedProductSheetId('');
    setItemQty(1);
    setItemCustomNotes('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  // Addition Handlers
  const handleAddPresetAddition = (preset: { name: string; price: number }) => {
    const existingIndex = additions.findIndex(a => a.name === preset.name);
    if (existingIndex >= 0) {
      setAdditions(additions.map((a, i) => i === existingIndex ? { ...a, quantity: a.quantity + 1 } : a));
    } else {
      const newAdd: OrderAddition = {
        id: `add-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        name: preset.name,
        price: preset.price,
        unitPrice: preset.price,
        quantity: 1
      };
      setAdditions([...additions, newAdd]);
    }
  };

  const handleAddCustomAddition = () => {
    if (!customAdditionName.trim()) return;
    const newAdd: OrderAddition = {
      id: `add-${Date.now()}`,
      name: customAdditionName.trim(),
      price: customAdditionPrice,
      unitPrice: customAdditionPrice,
      quantity: 1
    };
    setAdditions([...additions, newAdd]);
    setCustomAdditionName('');
    setCustomAdditionPrice(5);
  };

  const handleRemoveAddition = (id: string) => {
    setAdditions(additions.filter(a => a.id !== id));
  };

  const handleSelectCustomer = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const custId = e.target.value;
    const found = customers.find(c => c.id === custId);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone);
      setCustomerAddress(found.address);
    }
  };

  const itemsSubtotal = (items || []).reduce((acc, item) => acc + ((item?.quantity || 0) * (item?.unitPrice || 0)), 0);
  const additionsSubtotal = (additions || []).reduce((acc, add) => acc + ((add?.quantity || 0) * (add?.unitPrice || 0)), 0);
  const subtotal = itemsSubtotal + additionsSubtotal;
  const total = Math.max(0, subtotal + deliveryFee - discount);
  const platformFeeAmount = Number(((total * platformFeePercent) / 100).toFixed(2));
  const netAmount = Number((total - platformFeeAmount).toFixed(2));

  const handleChannelChange = (newChannel: OrderChannel) => {
    setChannel(newChannel);
    if (newChannel === 'ifood') {
      setDeliveredBy('IFOOD');
    } else if (newChannel === 'balcao') {
      setDeliveryType('TAKEOUT');
      setDeliveryFee(0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('Por favor, informe o nome do cliente.');
      return;
    }
    if (items.length === 0) {
      alert('Adicione ao menos um item ao pedido.');
      return;
    }

    const formattedNotes = isQuoteMode 
      ? `[ORÇAMENTO/COTAÇÃO] ${notes}`.trim()
      : notes;

    const resolvedDeliveredBy = channel === 'ifood' ? (deliveredBy || 'IFOOD') : (deliveredBy || 'MERCHANT');

    const orderData = {
      ...(orderToEdit || {}),
      code: orderToEdit ? orderToEdit.code : `SAB-${channel.toUpperCase().slice(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName,
      customerPhone,
      customerAddress,
      customerDocument: orderToEdit?.customerDocument,
      customerOrdersCount: orderToEdit?.customerOrdersCount,
      channel,
      type,
      deliveryType: deliveryType || orderToEdit?.deliveryType || 'DELIVERY',
      deliveryAddressDetails: orderToEdit?.deliveryAddressDetails,
      pickupCode: orderToEdit?.pickupCode,
      orderTiming: orderToEdit?.orderTiming,
      deliveredBy: resolvedDeliveredBy,
      scheduleStart: orderToEdit?.scheduleStart,
      scheduleEnd: orderToEdit?.scheduleEnd,
      preparationStartDateTime: orderToEdit?.preparationStartDateTime,
      ifoodIntegrationStatus: status === 'cancelado' ? 'cancelled' : orderToEdit?.ifoodIntegrationStatus,
      rawIfoodId: orderToEdit?.rawIfoodId,
      rawIfoodOrder: orderToEdit?.rawIfoodOrder,
      cancellationCode: status === 'cancelado' ? cancellationCode : orderToEdit?.cancellationCode,
      cancellationReason: status === 'cancelado' ? (cancellationReason || 'Cancelamento registrado no painel') : orderToEdit?.cancellationReason,
      paymentDescription: orderToEdit?.paymentDescription,
      paymentDetails: orderToEdit?.paymentDetails,
      status: isQuoteMode ? ('pendente' as OrderStatus) : status,
      createdAt: orderToEdit ? orderToEdit.createdAt : new Date().toISOString(),
      deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : new Date().toISOString(),
      items,
      additions,
      subtotal: Number(subtotal.toFixed(2)),
      deliveryFee: Number(deliveryFee),
      discount: Number(discount),
      total: Number(total.toFixed(2)),
      platformFeePercent,
      platformFeeAmount,
      netAmount,
      paymentMethod,
      notes: formattedNotes
    };

    // Força status final em vendas diretas para ativar o gatilho de baixa de estoque
    if (channel === 'balcao' || type === 'pronta_entrega') {
      orderData.status = 'entregue';
    }

    if (orderToEdit) {
      updateOrder(orderToEdit.id, orderData);
      
      // If order is from iFood and marked as cancelled, trigger requestCancellation on iFood API
      if (status === 'cancelado' && (channel === 'ifood' || orderToEdit.channel === 'ifood')) {
        const targetId = orderToEdit.rawIfoodId || orderToEdit.id;
        executeIfoodAction(
          targetId,
          'requestCancellation',
          cancellationReason || 'Cancelamento registrado pelo operador',
          cancellationCode || '502'
        ).catch(err => console.warn('[iFood OrderModal Cancel Error]', err));
      }
    } else {
      addOrder(orderData);
    }

    const finalStatuses = ['concluído', 'concluido', 'entregue', 'finalizado', 'completed', 'concluded'];
    const isFinal = finalStatuses.includes(String(orderData.status || '').toLowerCase().trim());
    if ((channel === 'balcao' || type === 'pronta_entrega' || isFinal) && !isQuoteMode) {
      processOrderCompletion(orderData as Order).catch(err => console.warn('[OrderModal Stock Deduction Error]', err));
    }

    onClose();
  };

  const finalizarVenda = async () => {
    // 1. First validate as in handleSubmit
    if (!customerName.trim()) {
      alert('Por favor, informe o nome do cliente.');
      return;
    }
    if (items.length === 0) {
      alert('Adicione ao menos um item ao pedido.');
      return;
    }

    const formattedNotes = isQuoteMode 
      ? `[ORÇAMENTO/COTAÇÃO] ${notes}`.trim()
      : notes;

    const resolvedDeliveredBy = channel === 'ifood' ? (deliveredBy || 'IFOOD') : (deliveredBy || 'MERCHANT');

    const newId = orderToEdit ? orderToEdit.id : `ord-${Date.now()}`;
    const orderData = {
      ...(orderToEdit || {}),
      id: newId,
      code: orderToEdit ? orderToEdit.code : `SAB-${channel.toUpperCase().slice(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName,
      customerPhone,
      customerAddress,
      customerDocument: orderToEdit?.customerDocument,
      customerOrdersCount: orderToEdit?.customerOrdersCount,
      channel,
      type,
      deliveryType: deliveryType || orderToEdit?.deliveryType || 'DELIVERY',
      deliveryAddressDetails: orderToEdit?.deliveryAddressDetails,
      pickupCode: orderToEdit?.pickupCode,
      orderTiming: orderToEdit?.orderTiming,
      deliveredBy: resolvedDeliveredBy,
      scheduleStart: orderToEdit?.scheduleStart,
      scheduleEnd: orderToEdit?.scheduleEnd,
      preparationStartDateTime: orderToEdit?.preparationStartDateTime,
      ifoodIntegrationStatus: status === 'cancelado' ? 'cancelled' : orderToEdit?.ifoodIntegrationStatus,
      rawIfoodId: orderToEdit?.rawIfoodId,
      rawIfoodOrder: orderToEdit?.rawIfoodOrder,
      cancellationCode: status === 'cancelado' ? cancellationCode : orderToEdit?.cancellationCode,
      cancellationReason: status === 'cancelado' ? (cancellationReason || 'Cancelamento registrado no painel') : orderToEdit?.cancellationReason,
      paymentDescription: orderToEdit?.paymentDescription,
      paymentDetails: orderToEdit?.paymentDetails,
      status: isQuoteMode ? ('pendente' as OrderStatus) : status,
      createdAt: orderToEdit ? orderToEdit.createdAt : new Date().toISOString(),
      deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : new Date().toISOString(),
      items,
      additions,
      subtotal: Number(subtotal.toFixed(2)),
      deliveryFee: Number(deliveryFee),
      discount: Number(discount),
      total: Number(total.toFixed(2)),
      platformFeePercent,
      platformFeeAmount,
      netAmount,
      paymentMethod,
      notes: formattedNotes
    };

    // 2. Call processOrderCompletion which handles stock deduction and alerts
    const finalStatuses = ['concluído', 'concluido', 'entregue', 'finalizado', 'completed', 'concluded'];
    const isFinal = finalStatuses.includes(String(status || '').toLowerCase().trim());
    const isBalcao = channel === 'balcao';

    if ((isBalcao || isFinal) && !isQuoteMode) {
      await processOrderCompletion(orderData as Order);
    }

    if (orderToEdit) {
      updateOrder(newId, orderData);
    } else {
      addOrder(orderData);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto print:static print:bg-transparent print:p-0 print:overflow-visible">
      <div className="bg-[#FAF7F2] dark:bg-[#2B2D31] rounded-none sm:rounded-2xl border-none sm:border border-[#E5DACF] dark:border-[#3F4147] shadow-xl w-full max-w-3xl min-h-screen sm:min-h-0 sm:max-h-[92vh] flex flex-col overflow-hidden print:bg-white print:border-none print:shadow-none print:max-w-full print:max-h-none print:rounded-none">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#EBE1D7] dark:border-[#3F4147] flex items-center justify-between bg-[#F4EFEA] dark:bg-[#1E1F22] print:bg-white print:border-b-2 print:border-black">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif-brand text-xl font-bold text-[#382628] dark:text-white print:text-black print:text-2xl">
                {orderToEdit 
                  ? `Editar ${isQuoteMode ? 'Orçamento' : 'Pedido'} ${orderToEdit.code}` 
                  : (isQuoteMode ? 'Novo Orçamento de Cliente' : 'Novo Pedido ou Encomenda')}
              </h2>
              {isQuoteMode && (
                <span className="text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 print:border-black print:text-black">
                  <Calculator className="w-3 h-3" /> Cotação / Orçamento
                </span>
              )}
            </div>
            <p className="text-xs text-[#7A6466] print:text-gray-600">
              Calcule adicionais, opções de orçamento, taxas de entrega e comissões da Saborê
            </p>
          </div>
          
          <div className="flex items-center gap-2 print:hidden">
            {/* Toggle Quote Mode */}
            <button
              type="button"
              onClick={() => setIsQuoteMode(!isQuoteMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                isQuoteMode 
                  ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs' 
                  : 'bg-white text-[#523F41] border-[#D5C5B5] hover:bg-[#F3ECE2]'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-700" />
              <span>{isQuoteMode ? 'Modo: Orçamento' : 'Alternar para Orçamento'}</span>
            </button>

            <button 
              type="button"
              onClick={() => window.print()}
              className="p-1.5 rounded-lg text-[#7A6466] hover:bg-[#EAE0D5] hover:text-[#382628] transition-colors cursor-pointer"
              title="Imprimir Pedido"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
            </button>

            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#7A6466] hover:bg-[#EAE0D5] hover:text-[#382628] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 print:overflow-visible print:p-0 print:pt-4">
          
          {/* Quick select existing customer */}
          <div className="p-3 bg-[#F4ECE3] rounded-xl border border-[#E8DEC0]/60 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <span className="text-xs font-semibold text-[#665052]">Puxar dados de cliente cadastrado:</span>
            <select 
              onChange={handleSelectCustomer} 
              defaultValue="" 
              className="text-xs px-3 py-1.5 bg-white rounded-lg border border-[#D8C7B8] text-[#3D2C2E] dark:text-white focus:outline-[#B86B77]"
            >
              <option value="">Selecione um cliente...</option>
              {(customers || []).map(c => (
                <option key={c?.id} value={c?.id}>{c?.name} - {c?.neighborhood}</option>
              ))}
            </select>
          </div>

          {/* iFood Specific Details Banner */}
          {channel === 'ifood' && (
            <div className="bg-[#FFF2F4] dark:bg-rose-950/20 border border-[#F0D5D8] dark:border-rose-900/30 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EA1D2C] text-white">
                    iFood Integrado
                  </span>
                  <span className="font-mono font-bold text-[#352527] dark:text-[#FFFFFF]">
                    {orderToEdit?.code || 'Pedido iFood'}
                  </span>
                </div>
                {orderToEdit?.pickupCode && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-300">
                    PIN Coleta: {orderToEdit.pickupCode}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#553E41] dark:text-[#B5BAC1]">
                <div>
                  <strong>Entrega:</strong> {orderToEdit?.deliveredBy === 'IFOOD' ? '🛵 Entrega Parceira iFood' : '🛵 Entrega Própria da Loja'} 
                  {orderToEdit?.deliveryType === 'TAKEOUT' && ' (Retirada no Balcão)'}
                </div>
                <div>
                  <strong>Pagamento:</strong> {orderToEdit?.paymentDescription || 'iFood (Plataforma)'}
                </div>
                {orderToEdit?.customerDocument && (
                  <div>
                    <strong>CPF na Nota:</strong> {orderToEdit.customerDocument}
                  </div>
                )}
                {orderToEdit?.customerOrdersCount && orderToEdit.customerOrdersCount > 1 && (
                  <div>
                    <strong>Fidelidade:</strong> {orderToEdit.customerOrdersCount}º pedido deste cliente
                  </div>
                )}
              </div>

              {orderToEdit?.deliveryAddressDetails?.formattedAddress && (
                <div className="text-[11px] text-[#695456] dark:text-[#B5BAC1] bg-white/70 dark:bg-[#1E1F22]/70 p-2 rounded-lg border border-[#F0D5D8] dark:border-[#3F4147]">
                  <strong>Endereço Completo:</strong> {orderToEdit.deliveryAddressDetails.formattedAddress}
                  {orderToEdit.deliveryAddressDetails.complement && ` (${orderToEdit.deliveryAddressDetails.complement})`}
                  {orderToEdit.deliveryAddressDetails.reference && ` - Ref: ${orderToEdit.deliveryAddressDetails.reference}`}
                </div>
              )}
            </div>
          )}

          {/* Customer info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#543E40] mb-1">Nome do Cliente *</label>
              <input 
                type="text" 
                required 
                value={customerName} 
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Ex: Luísa Mendonça"
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white focus:outline-[#B86B77]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#543E40] mb-1">Telefone / WhatsApp *</label>
              <input 
                type="text" 
                required 
                value={customerPhone} 
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white focus:outline-[#B86B77]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#543E40] mb-1">Endereço de Entrega / Ponto de Retirada</label>
            <input 
              type="text" 
              value={customerAddress} 
              onChange={e => setCustomerAddress(e.target.value)}
              placeholder="Rua, número, apto, bairro (ou 'Retirada no Balcão')"
              className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white focus:outline-[#B86B77]"
            />
          </div>

          {/* Channel, Type, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#543E40] mb-1">Canal de Venda</label>
              <select 
                value={channel} 
                onChange={e => handleChannelChange(e.target.value as OrderChannel)}
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white font-medium focus:outline-[#B86B77]"
              >
                <option value="whatsapp">WhatsApp / Direto (0%)</option>
                <option value="ifood">iFood (Comissão 23%)</option>
                <option value="99food">99Food (Comissão 20%)</option>
                <option value="balcao">Balcão Físico (Taxa 2.5%)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#543E40] mb-1">Tipo de Pedido</label>
              <select 
                value={type} 
                onChange={e => setType(e.target.value as OrderType)}
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white font-medium focus:outline-[#B86B77]"
              >
                <option value="encomenda">Encomenda Programada</option>
                <option value="pronta_entrega">Pronta Entrega (Imediato)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#543E40] mb-1">Status Operacional</label>
              <select 
                value={status} 
                onChange={e => setStatus(e.target.value as OrderStatus)}
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white font-semibold focus:outline-[#B86B77]"
              >
                <option value="pendente">⏳ Pendente / Aguardando</option>
                <option value="em_producao">🥣 Em Produção / Forno</option>
                <option value="pronto">📦 Pronto p/ Envio</option>
                <option value="saiu_entrega">🛵 Saiu p/ Entrega</option>
                <option value="entregue">✅ Entregue / Concluído</option>
                <option value="cancelado">❌ Cancelado</option>
              </select>
            </div>
          </div>

          {/* Cancellation Reason & iFood Code Selector */}
          {status === 'cancelado' && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/50 space-y-3">
              <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Motivo e Código Oficial de Cancelamento (Exigência iFood & Auditoria)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-rose-900 dark:text-rose-300 mb-1">
                    Código iFood Oficial *
                  </label>
                  <select
                    value={cancellationCode}
                    onChange={e => setCancellationCode(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white dark:bg-[#1E1F22] rounded-lg border border-rose-300 dark:border-rose-800 text-[#3D2C2E] dark:text-white font-semibold focus:outline-rose-500"
                  >
                    <option value="501">501 - Problemas Sistêmicos / Integração</option>
                    <option value="502">502 - Falta de Ingrediente / Estoque Esgotado</option>
                    <option value="503">503 - Reforma ou Manutenção na Loja</option>
                    <option value="504">504 - Loja Sobregregada / Múltiplos Pedidos</option>
                    <option value="505">505 - Fora do Raio de Entrega da Loja</option>
                    <option value="506">506 - Cliente Solicitou Cancelamento</option>
                    <option value="507">507 - Falta de Entregador / Motoboy</option>
                    <option value="508">508 - Endereço Incompleto ou Inexistente</option>
                    <option value="509">509 - Preço Incorreto no Cardápio</option>
                    <option value="510">510 - Risco de Segurança / Acesso Impedido</option>
                    <option value="801">801 - Item Esgotado na Produção</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-rose-900 dark:text-rose-300 mb-1">
                    Atalhos Rápidos de Motivo
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { code: '502', label: 'Sem Estoque' },
                      { code: '506', label: 'Pedido do Cliente' },
                      { code: '507', label: 'Sem Motoboy' },
                      { code: '501', label: 'Erro Sistema' }
                    ].map(shortcut => (
                      <button
                        type="button"
                        key={shortcut.code}
                        onClick={() => {
                          setCancellationCode(shortcut.code);
                          if (!cancellationReason) {
                            setCancellationReason(`Cancelado por: ${shortcut.label}`);
                          }
                        }}
                        className={`px-2 py-1 text-[10px] font-bold rounded border transition-all ${
                          cancellationCode === shortcut.code 
                            ? 'bg-rose-600 text-white border-rose-700' 
                            : 'bg-white dark:bg-[#1E1F22] text-rose-900 dark:text-rose-200 border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                        }`}
                      >
                        {shortcut.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-rose-900 dark:text-rose-300 mb-1">
                  Justificativa Detalhada (Sincronizada com iFood) *
                </label>
                <textarea
                  rows={2}
                  value={cancellationReason}
                  onChange={e => setCancellationReason(e.target.value)}
                  placeholder="Informe a justificativa do cancelamento enviada para o cliente e iFood..."
                  className="w-full text-xs p-2.5 bg-white dark:bg-[#1E1F22] rounded-lg border border-rose-300 dark:border-rose-800 text-[#3D2C2E] dark:text-white focus:outline-rose-500"
                />
              </div>
            </div>
          )}

          {/* Logistics Selection: Entrega Parceira iFood vs Entrega Própria da Loja vs Retirada */}
          <div className="bg-[#FAF6F0] dark:bg-[#1E1F22] p-3.5 rounded-xl border border-[#E8DFD5] dark:border-[#3F4147] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold text-[#543E40] dark:text-[#E0D3C5] flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#B86B77]" />
                <span>Modalidade de Logística e Despacho *</span>
              </label>

              {channel === 'ifood' && (
                <button
                  type="button"
                  onClick={handleQueryIfoodModalities}
                  disabled={isQueryingIfoodApi}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white dark:bg-[#2B2D31] text-[#EA1D2C] border border-[#EA1D2C]/30 hover:bg-rose-50 dark:hover:bg-rose-950/60 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  title="Consulta a API do iFood para verificar modalidades de entrega (própria vs parceira)"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isQueryingIfoodApi ? 'animate-spin' : ''}`} />
                  <span>{isQueryingIfoodApi ? 'Consultando API...' : 'Consultar API iFood'}</span>
                </button>
              )}
            </div>

            {channel === 'ifood' && (
              <div className="bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/50 text-[11px] text-rose-950 dark:text-rose-200 flex items-center justify-between flex-wrap gap-1">
                <div className="flex items-center gap-2 font-semibold">
                  <Building2 className="w-4 h-4 text-[#EA1D2C] shrink-0" />
                  <span><strong>Modo iFood Selecionado:</strong> A Entrega Parceira iFood (IFOOD) vem selecionada por padrão.</span>
                </div>
                <span className="text-[10px] uppercase font-mono font-extrabold px-2 py-0.5 rounded bg-[#EA1D2C] text-white">
                  Padrão iFood
                </span>
              </div>
            )}

            {ifoodApiFeedback && (
              <div className={`p-2.5 rounded-lg text-xs border flex items-center gap-2 ${
                ifoodApiFeedback.type === 'success' 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800' 
                  : 'bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 border-red-200 dark:border-red-800'
              }`}>
                {ifoodApiFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
                <span className="font-medium">{ifoodApiFeedback.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Option 1: Entrega Própria */}
              <button
                type="button"
                onClick={() => {
                  setDeliveredBy('MERCHANT');
                  setDeliveryType('DELIVERY');
                }}
                className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  deliveredBy === 'MERCHANT' && deliveryType !== 'TAKEOUT'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200 ring-2 ring-amber-400/40 shadow-xs'
                    : 'bg-white dark:bg-[#2B2D31] border-[#DACDC0] dark:border-[#3F4147] text-[#553E41] dark:text-[#B5BAC1] hover:bg-[#FAF0F2] dark:hover:bg-[#35373C]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1.5 rounded-md ${deliveredBy === 'MERCHANT' && deliveryType !== 'TAKEOUT' ? 'bg-amber-500 text-white' : 'bg-stone-100 dark:bg-[#1E1F22] text-stone-600 dark:text-stone-300'}`}>
                    <Bike className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs">Entrega Própria</div>
                    <div className="text-[9px] uppercase font-semibold text-amber-700 dark:text-amber-400">MERCHANT / Saborê</div>
                  </div>
                </div>
                <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-tight">
                  Despacho com entregador ou frota própria da confeitaria.
                </p>
              </button>

              {/* Option 2: Entrega Parceira iFood */}
              <button
                type="button"
                onClick={() => {
                  setDeliveredBy('IFOOD');
                  setDeliveryType('DELIVERY');
                }}
                className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  deliveredBy === 'IFOOD' && deliveryType !== 'TAKEOUT'
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-[#EA1D2C] text-rose-950 dark:text-rose-200 ring-2 ring-[#EA1D2C]/40 shadow-xs'
                    : 'bg-white dark:bg-[#2B2D31] border-[#DACDC0] dark:border-[#3F4147] text-[#553E41] dark:text-[#B5BAC1] hover:bg-[#FAF0F2] dark:hover:bg-[#35373C]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1.5 rounded-md ${deliveredBy === 'IFOOD' && deliveryType !== 'TAKEOUT' ? 'bg-[#EA1D2C] text-white' : 'bg-stone-100 dark:bg-[#1E1F22] text-stone-600 dark:text-stone-300'}`}>
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1">
                      <span>Entrega Parceira</span>
                      {channel === 'ifood' && (
                        <span className="text-[8px] bg-[#EA1D2C] text-white px-1 py-0.2 rounded font-extrabold">PADRÃO</span>
                      )}
                    </div>
                    <div className="text-[9px] uppercase font-semibold text-[#EA1D2C]">Logística iFood (IFOOD)</div>
                  </div>
                </div>
                <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-tight">
                  Motoboy oficial iFood coleta na loja usando PIN de retirada.
                </p>
              </button>

              {/* Option 3: Retirada no Balcão */}
              <button
                type="button"
                onClick={() => {
                  setDeliveryType('TAKEOUT');
                  setDeliveryFee(0);
                }}
                className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  deliveryType === 'TAKEOUT'
                    ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-900 dark:text-purple-200 ring-2 ring-purple-400/40 shadow-xs'
                    : 'bg-white dark:bg-[#2B2D31] border-[#DACDC0] dark:border-[#3F4147] text-[#553E41] dark:text-[#B5BAC1] hover:bg-[#FAF0F2] dark:hover:bg-[#35373C]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1.5 rounded-md ${deliveryType === 'TAKEOUT' ? 'bg-purple-600 text-white' : 'bg-stone-100 dark:bg-[#1E1F22] text-stone-600 dark:text-stone-300'}`}>
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs">Retirada no Balcão</div>
                    <div className="text-[9px] uppercase font-semibold text-purple-700 dark:text-purple-400">TAKEOUT / Balcão</div>
                  </div>
                </div>
                <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-tight">
                  Cliente busca diretamente no balcão da loja física (Taxa R$ 0).
                </p>
              </button>
            </div>
          </div>

          {/* Delivery date and payment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#543E40] mb-1">Data e Horário Previsto</label>
              <input 
                type="datetime-local" 
                value={deliveryDate} 
                onChange={e => setDeliveryDate(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white focus:outline-[#B86B77]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#543E40] mb-1">Forma de Pagamento</label>
              <select 
                value={paymentMethod} 
                onChange={e => setPaymentMethod(e.target.value as any)}
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white focus:outline-[#B86B77]"
              >
                <option value="pix">Pix</option>
                <option value="cartao_credito">Cartão de Crédito</option>
                <option value="cartao_debito">Cartão de Débito</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="faturado">Faturado Corporativo</option>
                <option value="plataforma">Pago pelo App (iFood / 99Food)</option>
              </select>
            </div>
          </div>

          {/* Order Items Section */}
          <div className="border-t border-[#E8DFD5] pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A6466] mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-[#B86B77]" />
                <span>1. Produtos Principais</span>
              </span>
              <span className="text-[11px] font-medium text-[#7A6466]">Subtotal: R$ {itemsSubtotal.toFixed(2)}</span>
            </h3>

            {/* Add item control */}
            <div className="p-3 bg-[#F5EDE3] rounded-xl border border-[#E5DACF] mb-3 space-y-2 print:hidden">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-8">
                  <label className="block text-[11px] font-semibold text-[#6E5558] mb-1">Produto da Confeitaria</label>
                  <select
                    value={selectedProductSheetId}
                    onChange={e => setSelectedProductSheetId(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#D5C5B5] text-[#3D2C2E] dark:text-white focus:outline-[#B86B77]"
                  >
                    <option value="">Selecione o produto artesanal...</option>
                    {(technicalSheets || []).map(s => (
                      s && (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.sku}) - Balcão R$ {(s.basePrice || 0).toFixed(2)}
                        </option>
                      )
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-[#6E5558] mb-1">Quantidade</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      min="1" 
                      value={itemQty} 
                      onChange={e => setItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (selectedProductSheetId) handleAddItem();
                        }
                      }}
                      className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#D5C5B5] text-[#3D2C2E] dark:text-white focus:outline-[#B86B77]"
                    />
                    <button
                      type="button"
                      onClick={handleAddItem}
                      disabled={!selectedProductSheetId}
                      className="px-3 py-2 bg-[#B86B77] hover:bg-[#9E5460] disabled:bg-stone-300 text-white text-xs font-bold rounded-lg shrink-0 transition-colors cursor-pointer"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Observação específica para este item (ex: 'Massa chocolate', 'Escrever Luiza 5 anos')"
                  value={itemCustomNotes}
                  onChange={e => setItemCustomNotes(e.target.value)}
                  className="w-full text-[11px] px-2.5 py-1.5 bg-white/80 rounded-md border border-[#D8C7B8] text-[#3D2C2E] dark:text-white placeholder-[#9E898B]"
                />
              </div>
            </div>

            {/* Items list */}
            {items.length === 0 ? (
              <div className="text-center py-6 sm:py-4 bg-white/60 rounded-xl border border-dashed border-[#DACDC0] text-xs text-[#8C7577]">
                Nenhum produto principal adicionado ainda. Escolha um produto acima.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 sm:max-h-48 overflow-y-auto pr-1">
                {(items || []).map((it, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-2.5 bg-white rounded-lg border border-[#E8DFD5] text-xs gap-2">
                    <div className="flex-1">
                      <div className="font-semibold text-[#3D2C2E] dark:text-white flex items-center flex-wrap gap-2">
                        <span className="text-sm sm:text-xs">{(it?.quantity || 0)}x {it?.productName}</span>
                        <span className="text-[9px] sm:text-[10px] text-[#8C7678] font-mono bg-stone-100 px-1.5 py-0.5 rounded">({it?.sku})</span>
                      </div>
                      {it?.notes && (
                        <p className="text-[11px] text-[#B86B77] italic mt-1">Obs: {it.notes}</p>
                      )}
                      {Array.isArray(it?.options) && it.options.length > 0 && (
                        <div className="mt-1.5 pl-2 border-l-2 border-amber-300 space-y-1 text-[10px] text-amber-900 dark:text-amber-300">
                          {it.options.map((opt: any, oIdx: number) => (
                            <div key={oIdx} className="flex items-center justify-between">
                              <span>+ {opt.quantity}x {opt.name}</span>
                              {Number(opt.price || opt.unitPrice || 0) > 0 && (
                                <span className="font-semibold text-amber-800 dark:text-amber-200">
                                  +R$ {(Number(opt.totalPrice || (opt.price * opt.quantity) || 0)).toFixed(2)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F0E6DD]">
                      <span className="font-bold text-sm sm:text-xs text-[#352527] dark:text-[#FFFFFF]">
                        R$ {(((it?.quantity || 0) * (it?.unitPrice || 0)) || 0).toFixed(2)}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveItem(idx)}
                        className="p-2 sm:p-1 text-stone-400 hover:text-red-600 rounded-lg sm:rounded transition-colors cursor-pointer print:hidden"
                      >
                        <Trash2 className="w-5 h-5 sm:w-3.5 sm:h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ADDITIONS & OPTIONAL EXTRAS SECTION */}
          <div className="border-t border-[#E8DFD5] pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A6466] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>2. Adicionais & Opcionais para Orçamento</span>
              </h3>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                Adicionais: R$ {additionsSubtotal.toFixed(2)}
              </span>
            </div>

            <p className="text-[11px] text-[#7A6466] mb-3 print:hidden">
              Insira itens adicionais (coberturas, embalagens, velas, topos personalizados) para simular o valor exato no orçamento do cliente:
            </p>

            {/* Quick Presets Buttons */}
            <div className="mb-3 print:hidden">
              <label className="block text-[10px] font-semibold uppercase text-[#8C7678] mb-1.5">
                Atalhos de Adicionais Frequentes:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_ADDITIONS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddPresetAddition(preset)}
                    className="px-2.5 py-1 bg-white hover:bg-amber-50 border border-[#DACDC0] hover:border-amber-400 rounded-lg text-[11px] text-[#4A383A] font-medium transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-3 h-3 text-amber-600" />
                    <span>{preset.name}</span>
                    <strong className="text-amber-800 ml-1">+R$ {preset.price.toFixed(2)}</strong>
                  </button>
                ))}
              </div>
            </div>

            {/* Add Custom Addition Form */}
            <div className="p-3 bg-[#FAF3EB] rounded-xl border border-[#E5DACF] mb-3 flex flex-col sm:flex-row items-center gap-2 print:hidden">
              <input
                type="text"
                placeholder="Outro adicional (ex: 'Placa com Mensagem de Açúcar')"
                value={customAdditionName}
                onChange={e => setCustomAdditionName(e.target.value)}
                className="flex-1 text-xs px-3 py-1.5 bg-white rounded-lg border border-[#D5C5B5] text-[#3D2C2E] dark:text-white"
              />
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-[#6E5558] font-semibold">R$</span>
                <input
                  type="number"
                  step="0.50"
                  value={customAdditionPrice}
                  onChange={e => setCustomAdditionPrice(parseFloat(e.target.value) || 0)}
                  className="w-20 text-xs px-2.5 py-1.5 bg-white rounded-lg border border-[#D5C5B5] text-[#3D2C2E] dark:text-white font-bold"
                />
                <button
                  type="button"
                  onClick={handleAddCustomAddition}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  + Adicional
                </button>
              </div>
            </div>

            {/* Added Additions List */}
            {additions.length > 0 && (
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {additions.map((add) => (
                  <div key={add.id} className="flex items-center justify-between p-2 bg-amber-50/60 rounded-lg border border-amber-200 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-amber-950">{add.quantity}x {add.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-amber-900">
                        R$ {((add.quantity * add.unitPrice) || 0).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAddition(add.id)}
                        className="p-1 text-amber-700 hover:text-red-600 transition-colors cursor-pointer print:hidden"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pricing breakdown and calculations */}
          <div className="border-t border-[#E8DFD5] pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#543E40] mb-1">Taxa de Entrega (R$)</label>
              <input 
                type="number" 
                step="0.50" 
                value={deliveryFee} 
                onChange={e => setDeliveryFee(parseFloat(e.target.value) || 0)}
                className="w-full text-xs px-3 py-1.5 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#543E40] mb-1">Desconto Aplicado (R$)</label>
              <input 
                type="number" 
                step="0.50" 
                value={discount} 
                onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-full text-xs px-3 py-1.5 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
              />
            </div>
          </div>

          {/* Financial summary card / Budget calculation card */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs transition-all ${
            isQuoteMode 
              ? 'bg-amber-100/90 border-amber-300 shadow-sm' 
              : 'bg-[#F2E8DE] border-[#DFD1C4]'
          }`}>
            <div className="space-y-0.5">
              <div className="text-[#6B5557] dark:text-[#B5BAC1]">Subtotal Produtos: <strong className="text-[#352527] dark:text-[#FFFFFF]">R$ {(itemsSubtotal || 0).toFixed(2)}</strong></div>
              {additionsSubtotal > 0 && (
                <div className="text-amber-900 dark:text-amber-300 font-medium">Subtotal Adicionais: <strong className="text-amber-900 dark:text-amber-200">+R$ {(additionsSubtotal || 0).toFixed(2)}</strong></div>
              )}
              <div className="text-[#6B5557] dark:text-[#B5BAC1]">Entrega ({deliveryFee > 0 ? `+R$ ${deliveryFee.toFixed(2)}` : 'Grátis'}) | Desconto (-R$ {discount.toFixed(2)})</div>
            </div>

            <div className="text-right sm:border-l sm:border-[#DACDC0] dark:border-[#3F4147] sm:pl-4">
              <span className="text-[11px] text-[#856D70] dark:text-[#949BA4] font-semibold uppercase tracking-wider">
                {isQuoteMode ? '💰 VALOR DO ORÇAMENTO:' : 'VALOR LÍQUIDO:'}
              </span>
              <div className={`font-serif-brand text-2xl font-bold ${isQuoteMode ? 'text-amber-950 dark:text-amber-300' : 'text-[#352527] dark:text-[#FFFFFF]'}`}>
                R$ {(netAmount || 0).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Special notes */}
          <div>
            <label className="block text-xs font-semibold text-[#543E40] mb-1">Observações Gerais / Instruções do Orçamento</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Tocar campainha 3 vezes, deixar na portaria aos cuidados de Sr. Antônio, etc."
              className="w-full text-xs p-2.5 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white focus:outline-[#B86B77]"
            />
          </div>

          {/* Footer buttons - Sticky on mobile */}
          <div className="sticky bottom-0 -mx-5 -mb-5 sm:mx-0 sm:mb-0 px-5 py-4 sm:px-0 sm:py-3 bg-[#FAF7F2] dark:bg-[#2B2D31] sm:bg-transparent border-t border-[#E8DFD5] dark:border-[#3F4147] sm:border-t-0 flex items-center justify-end gap-3 print:hidden z-10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 py-3 sm:py-2 text-sm sm:text-xs font-semibold rounded-xl border border-[#D5C5B5] bg-white text-[#553F41] hover:bg-[#F3ECE2] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); finalizarVenda(); }}
              className={`flex-1 sm:flex-none px-6 py-3 sm:py-2 text-sm sm:text-xs font-bold rounded-xl text-white shadow-md sm:shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                isQuoteMode ? 'bg-amber-700 hover:bg-amber-800' : 'bg-[#B86B77] hover:bg-[#9E5460]'
              }`}
            >
              {isQuoteMode ? (
                <>
                  <Calculator className="w-4 h-4" />
                  <span>{orderToEdit ? 'Salvar Orçamento' : 'Registrar'}</span>
                </>
              ) : (
                <span>{orderToEdit ? 'Salvar Alterações' : 'Confirmar Pedido'}</span>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

