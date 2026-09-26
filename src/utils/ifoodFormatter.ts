import { Order, OrderItem, OrderItemOption, OrderPaymentDetails, OrderDeliveryAddressDetails } from '../types';

/**
 * Universal Formatter for iFood Merchant API v1.0 Orders
 * Converts raw or partial iFood order JSON payloads into the complete Saborê Order schema,
 * preserving 100% of customer, delivery, timing, items, toppings, and payment details.
 */
export function formatIfoodOrderToAppOrder(raw: any, commissionPercent: number = 23): Order {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Payload do pedido iFood inválido');
  }

  // Raw or already assigned ID
  const rawId = String(raw.id || raw.rawIfoodId || raw.orderId || `ifd-${Date.now()}`);
  const cleanId = rawId.replace(/^ifd-/, '').replace(/^#IFD-/, '').replace(/^#/, '').trim();
  const id = rawId.startsWith('ifd-') ? rawId : `ifd-${cleanId}`;

  // Display Code: iFood displayId (e.g. #4821) is what appears on the merchant terminal/bag
  const displayId = raw.displayId || raw.code?.replace(/^#/, '') || cleanId.slice(-4).toUpperCase();
  const code = displayId.startsWith('#') ? displayId : `#${displayId}`;

  // Customer Information
  const customerObj = raw.customer || {};
  const customerName = String(customerObj.name || raw.customerName || 'Cliente iFood').trim();
  
  let customerPhone = '(Não informado)';
  if (customerObj.phone) {
    if (typeof customerObj.phone === 'object') {
      const num = customerObj.phone.number || customerObj.phone.phone || '';
      customerPhone = num ? String(num) : customerPhone;
    } else {
      customerPhone = String(customerObj.phone);
    }
  } else if (raw.customerPhone) {
    customerPhone = String(raw.customerPhone);
  }

  const customerDocument = customerObj.documentNumber ? String(customerObj.documentNumber).trim() : raw.customerDocument;
  const customerOrdersCount = typeof customerObj.ordersCountOnMerchant === 'number' ? customerObj.ordersCountOnMerchant : raw.customerOrdersCount;

  // Logistics & Timing
  const orderTimingRaw = String(raw.orderTiming || '').toUpperCase();
  const scheduleObj = raw.schedule || {};
  const deliveryObj = raw.delivery || {};
  const takeoutObj = raw.takeout || {};

  const isScheduled = orderTimingRaw === 'SCHEDULED' || !!scheduleObj.deliveryDateTimeStart || !!scheduleObj.deliveryDateTimeEnd;
  const orderTiming: 'IMMEDIATE' | 'SCHEDULED' = isScheduled ? 'SCHEDULED' : 'IMMEDIATE';

  const orderTypeRaw = String(raw.orderType || raw.type || '').toUpperCase();
  const deliveryType: 'DELIVERY' | 'TAKEOUT' | 'INDOOR' = 
    orderTypeRaw.includes('TAKEOUT') || orderTypeRaw.includes('RETIRADA') ? 'TAKEOUT' :
    orderTypeRaw.includes('INDOOR') || orderTypeRaw.includes('MESA') ? 'INDOOR' : 'DELIVERY';

  const deliveredByRaw = String(deliveryObj.deliveredBy || raw.deliveredBy || '').toUpperCase();
  const deliveredBy: 'MERCHANT' | 'IFOOD' = deliveredByRaw === 'IFOOD' ? 'IFOOD' : 'MERCHANT';

  const pickupCode = deliveryObj.pickupCode || takeoutObj.pickupCode || raw.pickupCode || undefined;
  const scheduleStart = scheduleObj.deliveryDateTimeStart || deliveryObj.deliveryDateTime || raw.scheduleStart || undefined;
  const scheduleEnd = scheduleObj.deliveryDateTimeEnd || raw.scheduleEnd || undefined;
  const preparationStartDateTime = raw.preparationStartDateTime || undefined;

  // Address Parsing
  const addr = deliveryObj.deliveryAddress || raw.deliveryAddressDetails || {};
  const streetName = addr.streetName || addr.street || '';
  const streetNumber = addr.streetNumber || addr.number || '';
  const complement = addr.complement || '';
  const neighborhood = addr.neighborhood || addr.district || '';
  const city = addr.city || '';
  const state = addr.state || '';
  const postalCode = addr.postalCode || addr.zipCode || '';
  const reference = addr.reference || addr.landmark || '';
  const formattedAddress = addr.formattedAddress || '';

  const deliveryAddressDetails: OrderDeliveryAddressDetails = {
    streetName: streetName || undefined,
    streetNumber: streetNumber || undefined,
    complement: complement || undefined,
    neighborhood: neighborhood || undefined,
    city: city || undefined,
    state: state || undefined,
    postalCode: postalCode || undefined,
    reference: reference || undefined,
    formattedAddress: formattedAddress || undefined,
    coordinates: addr.coordinates || undefined
  };

  let customerAddress = raw.customerAddress || '';
  if (deliveryType === 'TAKEOUT') {
    customerAddress = 'Retirada no Balcão da Loja';
  } else if (formattedAddress) {
    let full = formattedAddress;
    if (complement && !full.includes(complement)) full += ` (${complement})`;
    if (reference && !full.includes(reference)) full += ` - Ref: ${reference}`;
    customerAddress = full;
  } else if (streetName) {
    const parts: string[] = [];
    parts.push(`${streetName}${streetNumber ? ', ' + streetNumber : ', S/N'}`);
    if (complement) parts.push(complement);
    if (neighborhood) parts.push(neighborhood);
    if (city) parts.push(`${city}${state ? '/' + state : ''}`);
    if (postalCode) parts.push(`CEP ${postalCode}`);
    if (reference) parts.push(`Ponto de Ref: ${reference}`);
    customerAddress = parts.join(' - ');
  } else if (!customerAddress) {
    customerAddress = 'Entrega iFood (Endereço não informado)';
  }

  // Status mapping
  let status: Order['status'] = raw.status || 'pendente';
  let ifoodIntegrationStatus: Order['ifoodIntegrationStatus'] = raw.ifoodIntegrationStatus;
  const rawStatus = String(raw.status || raw.fullCode || raw.code || '').toUpperCase();

  if (['CONFIRMED', 'CFM', 'PRS', 'PREPARATION_STARTED', 'IN_PREPARATION', 'INTEGRATED'].includes(rawStatus)) {
    status = 'em_producao';
    ifoodIntegrationStatus = 'confirmed';
  } else if (['READY_TO_PICKUP', 'RTP', 'TAKEOUT_READY', 'READY', 'PACKAGED'].includes(rawStatus)) {
    status = 'pronto';
    ifoodIntegrationStatus = 'ready';
  } else if (['DISPATCHED', 'DSP', 'GOING_TO_DELIVER', 'OUT_FOR_DELIVERY', 'DELIVERING', 'COLLECTED'].includes(rawStatus)) {
    status = 'saiu_entrega';
    ifoodIntegrationStatus = 'dispatched';
  } else if (['CONCLUDED', 'CON', 'DELIVERED', 'COMPLETED', 'FINISHED'].includes(rawStatus)) {
    status = 'entregue';
    ifoodIntegrationStatus = 'concluded';
  } else if (['CANCELLED', 'CAN', 'CANCELLATION_REQUESTED', 'ORDER_CANCELLED', 'CRQ'].includes(rawStatus)) {
    status = 'cancelado';
    ifoodIntegrationStatus = 'cancelled';
  } else if (['PLACED', 'PLC', 'NEW'].includes(rawStatus)) {
    status = 'pendente';
    ifoodIntegrationStatus = orderTiming === 'SCHEDULED' ? 'scheduled' : 'pending_confirmation';
  }

  if (!ifoodIntegrationStatus) {
    ifoodIntegrationStatus = orderTiming === 'SCHEDULED' ? 'scheduled' : 'pending_confirmation';
  }

  // Items Parsing (with options, subItems, and observations)
  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  const items: OrderItem[] = rawItems.map((it: any, idx: number) => {
    const qty = Number(it.quantity ?? it.qty ?? 1) || 1;
    const unitPrice = Number(it.unitPrice ?? it.price ?? 0) || 0;
    const totalPrice = Number(it.totalPrice ?? (unitPrice * qty)) || (unitPrice * qty);
    
    // Parse subItems and options (complements, toppings, sauces, extras)
    const optionsRaw = Array.isArray(it.options) ? it.options : (Array.isArray(it.subItems) ? it.subItems : []);
    const options: OrderItemOption[] = optionsRaw.map((opt: any) => {
      const optQty = Number(opt.quantity || 1);
      const optPrice = Number(opt.unitPrice ?? opt.price ?? 0);
      const optTotal = Number(opt.totalPrice ?? (optPrice * optQty));
      return {
        id: opt.id ? String(opt.id) : undefined,
        name: String(opt.name || opt.title || 'Complemento'),
        quantity: optQty,
        unitPrice: optPrice,
        price: optPrice,
        totalPrice: optTotal,
        externalCode: opt.externalCode ? String(opt.externalCode) : undefined
      };
    });

    const observations = String(it.observations || it.notes || it.comment || '').trim();

    return {
      productId: String(it.externalCode || it.id || `prod-ifd-${idx}`),
      productName: String(it.name || it.productName || 'Item do Cardápio'),
      sku: String(it.externalCode || `IFD-${idx + 1}`),
      quantity: qty,
      unitPrice,
      totalPrice,
      notes: observations || undefined,
      options: options.length > 0 ? options : undefined,
      subItems: options.length > 0 ? options : undefined
    };
  });

  // Totals & Financial Calculation
  const totalObj = raw.total || {};
  const itemsSubtotal = items.reduce((acc, it) => acc + (it.totalPrice || (it.unitPrice * it.quantity)), 0);
  const subtotal = Number(totalObj.subTotal ?? raw.subtotal ?? itemsSubtotal) || itemsSubtotal;
  const deliveryFee = Number(totalObj.deliveryFee ?? raw.deliveryFee ?? 0) || 0;
  const discount = Number(totalObj.benefits ?? raw.discount ?? 0) || 0;
  
  let total = Number(totalObj.orderAmount ?? raw.total ?? (subtotal + deliveryFee - discount));
  if (isNaN(total) || total <= 0) {
    total = Math.max(0, subtotal + deliveryFee - discount);
  }

  const effectiveCommission = Number(raw.platformFeePercent || commissionPercent || 23);
  const platformFeeAmount = Number((total * (effectiveCommission / 100)).toFixed(2));
  const netAmount = Number((total - platformFeeAmount).toFixed(2));

  // Payment Methods
  const paymentsObj = raw.payments || {};
  const paymentMethodsList = Array.isArray(paymentsObj.methods) ? paymentsObj.methods : [];
  const paymentDetails: OrderPaymentDetails[] = paymentMethodsList.map((m: any) => {
    const isOnline = String(m.type || '').toUpperCase() === 'ONLINE' || m.prepaid === true;
    return {
      method: String(m.method || m.name || 'OUTRO').toUpperCase(),
      brand: m.card?.brand ? String(m.card.brand).toUpperCase() : undefined,
      type: isOnline ? 'ONLINE' : 'OFFLINE',
      value: Number(m.value || 0),
      changeFor: m.changeFor ? Number(m.changeFor) : undefined,
      prepaid: m.prepaid ?? isOnline,
      currency: m.currency || 'BRL'
    };
  });

  // Descriptive Payment String
  let paymentDescription = 'iFood (Plataforma)';
  if (paymentDetails.length > 0) {
    const p = paymentDetails[0];
    const typeLabel = p.type === 'ONLINE' ? 'Pago Online no App' : 'Pagar na Entrega';
    const methodMap: Record<string, string> = {
      CREDIT: 'Cartão de Crédito',
      DEBIT: 'Cartão de Débito',
      CASH: 'Dinheiro',
      PIX: 'PIX',
      MEAL_VOUCHER: 'Vale Refeição',
      FOOD_VOUCHER: 'Vale Alimentação',
      DIGITAL_WALLET: 'Carteira Digital'
    };
    const methodStr = methodMap[p.method || ''] || p.method || 'Plataforma';
    const brandStr = p.brand ? ` (${p.brand})` : '';
    const changeStr = p.changeFor !== undefined && p.changeFor !== null && !isNaN(Number(p.changeFor)) ? ` - Troco p/ R$ ${(Number(p.changeFor) || 0).toFixed(2)}` : '';
    paymentDescription = `${typeLabel}: ${methodStr}${brandStr}${changeStr}`;
  } else if (raw.paymentDescription) {
    paymentDescription = raw.paymentDescription;
  }

  // Observations
  const generalNotes = String(raw.notes || raw.observations || '').trim();
  const notesParts: string[] = [];
  if (generalNotes) notesParts.push(generalNotes);
  if (customerDocument && !generalNotes.includes(customerDocument)) {
    notesParts.push(`CPF na Nota: ${customerDocument}`);
  }
  if (customerOrdersCount && customerOrdersCount > 1) {
    notesParts.push(`Cliente Fidelidade (${customerOrdersCount}º pedido)`);
  }
  if (pickupCode) {
    notesParts.push(`PIN/Código de Coleta: ${pickupCode}`);
  }
  const finalNotes = notesParts.join(' | ') || undefined;

  return {
    id,
    code,
    customerName,
    customerPhone,
    customerAddress,
    customerDocument,
    customerOrdersCount,
    channel: 'ifood',
    type: orderTiming === 'SCHEDULED' ? 'encomenda' : 'pronta_entrega',
    status,
    createdAt: raw.createdAt || new Date().toISOString(),
    deliveryDate: scheduleStart || deliveryObj.deliveryDateTime || raw.deliveryDate || new Date(Date.now() + 45 * 60000).toISOString(),
    items: items.length > 0 ? items : [{
      productId: 'prod-ifd-gen',
      productName: 'Pedido iFood',
      sku: 'IFD-01',
      quantity: 1,
      unitPrice: total,
      totalPrice: total
    }],
    subtotal: isNaN(subtotal) ? total : subtotal,
    deliveryFee: isNaN(deliveryFee) ? 0 : deliveryFee,
    discount: isNaN(discount) ? 0 : discount,
    total: isNaN(total) ? 0 : total,
    platformFeePercent: effectiveCommission,
    platformFeeAmount: isNaN(platformFeeAmount) ? 0 : platformFeeAmount,
    netAmount: isNaN(netAmount) ? total : netAmount,
    paymentMethod: 'plataforma',
    paymentDescription,
    paymentDetails: paymentDetails.length > 0 ? paymentDetails : undefined,
    notes: finalNotes,
    rawIfoodId: cleanId,
    deliveryType,
    deliveryAddressDetails,
    pickupCode,
    orderTiming,
    deliveredBy,
    scheduleStart,
    scheduleEnd,
    preparationStartDateTime,
    ifoodIntegrationStatus,
    cancellationReason: raw.cancellationReason || undefined,
    cancellationCode: raw.cancellationCode || undefined,
    rawIfoodOrder: raw // Preserves the full payload!
  };
}
