import { setCors, getIfoodAccessToken, sanitizeCredential, recordApiLog, syncOrderToSupabase } from '../_shared';

const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://dxvxqkqqrqgcoaeeazzh.supabase.co'
).trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

const SUPABASE_KEY = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_cGDWUhw-Mae1vr_kFVlR-g_gCptL1AY'
).trim();

// Formatter to convert raw iFood order payload into application Order model
function formatIfoodOrder(raw: any): any {
  if (!raw || typeof raw !== 'object') return null;

  const rawId = String(raw.id || raw.rawIfoodId || raw.orderId || `ifd-${Date.now()}`);
  const cleanId = rawId.replace(/^ifd-/, '').replace(/^#IFD-/, '').replace(/^#/, '').trim();
  const id = rawId.startsWith('ifd-') ? rawId : `ifd-${cleanId}`;

  const displayId = raw.displayId || raw.code?.replace(/^#/, '') || cleanId.slice(-4).toUpperCase();
  const code = displayId.startsWith('#') ? displayId : `#${displayId}`;

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

  const customerOrdersCount = typeof customerObj.ordersCountOnMerchant === 'number' 
    ? customerObj.ordersCountOnMerchant 
    : (raw.customerOrdersCount ?? 0);

  const orderTimingRaw = String(raw.orderTiming || '').toUpperCase();
  const scheduleObj = raw.schedule || {};
  const deliveryObj = raw.delivery || {};
  const takeoutObj = raw.takeout || {};

  const isScheduled = orderTimingRaw === 'SCHEDULED' || !!scheduleObj.deliveryDateTimeStart || !!scheduleObj.deliveryDateTimeEnd;
  const orderTiming = isScheduled ? 'SCHEDULED' : 'IMMEDIATE';

  const orderTypeRaw = String(raw.orderType || raw.type || '').toUpperCase();
  const deliveryType = 
    orderTypeRaw.includes('TAKEOUT') || orderTypeRaw.includes('RETIRADA') ? 'TAKEOUT' :
    orderTypeRaw.includes('INDOOR') || orderTypeRaw.includes('MESA') ? 'INDOOR' : 'DELIVERY';

  const deliveredByRaw = String(deliveryObj.deliveredBy || raw.deliveredBy || '').toUpperCase();
  const deliveredBy = deliveredByRaw === 'IFOOD' ? 'IFOOD' : 'MERCHANT';

  const pickupCode = deliveryObj.pickupCode || takeoutObj.pickupCode || raw.pickupCode || undefined;
  const scheduleStart = scheduleObj.deliveryDateTimeStart || deliveryObj.deliveryDateTime || raw.scheduleStart || undefined;
  const scheduleEnd = scheduleObj.deliveryDateTimeEnd || raw.scheduleEnd || undefined;
  const preparationStartDateTime = raw.preparationStartDateTime || undefined;

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

  const deliveryAddressDetails = {
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
    customerAddress = parts.join(' - ');
  } else {
    customerAddress = 'Entrega iFood (endereço detalhado no app)';
  }

  const paymentsObj = raw.payments || {};
  const methods = paymentsObj.methods || paymentsObj.list || [];
  let paymentMethod = 'plataforma';
  let paymentStatus = 'pending';
  let paymentDetailsList: any[] = [];

  if (methods.length > 0) {
    const firstMethod = methods[0];
    const isOnline = firstMethod.type === 'ONLINE' || firstMethod.method === 'ONLINE' || firstMethod.prepaid === true;
    paymentMethod = isOnline ? 'plataforma' : (firstMethod.method?.toLowerCase() || 'dinheiro');
    paymentStatus = isOnline ? 'completed' : 'pending';

    paymentDetailsList = methods.map((m: any, idx: number) => ({
      id: `pay-${cleanId}-${idx}`,
      method: m.method || m.type || 'ONLINE',
      type: m.type || (m.prepaid ? 'ONLINE' : 'OFFLINE'),
      value: Number(m.value || m.amount || 0),
      prepaid: Boolean(m.prepaid || m.type === 'ONLINE'),
      brand: m.brand || m.cardBrand || undefined
    }));
  }

  const rawTotal = raw.total || {};
  const subtotal = Number(rawTotal.subTotal || rawTotal.itemsPrice || raw.subtotal || 0);
  const deliveryFee = Number(rawTotal.deliveryFee || raw.deliveryFee || 0);
  const additionalFees = Number(rawTotal.additionalFees || raw.additionalFees || 0);
  const total = Number(rawTotal.orderAmount || rawTotal.total || raw.total || (subtotal + deliveryFee + additionalFees));

  const items = (raw.items || []).map((item: any, idx: number) => {
    const itemOpts = (item.options || item.subItems || []).map((opt: any, optIdx: number) => ({
      id: `opt-${cleanId}-${idx}-${optIdx}`,
      name: opt.name || opt.description || 'Opcional',
      quantity: Number(opt.quantity || 1),
      price: Number(opt.unitPrice || opt.price || 0),
      additionId: opt.id || opt.externalCode || undefined
    }));

    return {
      productId: item.externalCode || item.id || `prod-${idx}`,
      productName: item.name || 'Item iFood',
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.unitPrice || item.price || 0),
      notes: item.observations || item.notes || undefined,
      options: itemOpts.length > 0 ? itemOpts : undefined
    };
  });

  return {
    id,
    rawIfoodId: cleanId,
    code,
    channel: 'ifood',
    customerName,
    customerPhone,
    customerAddress,
    customerOrdersCount,
    deliveryType,
    deliveredBy,
    deliveryAddressDetails,
    pickupCode,
    orderTiming,
    scheduleStart,
    scheduleEnd,
    preparationStartDateTime,
    items,
    subtotal,
    deliveryFee,
    additionalFees,
    total,
    paymentMethod,
    paymentStatus,
    paymentDetails: paymentDetailsList.length > 0 ? paymentDetailsList : undefined,
    status: 'em_producao',
    ifoodIntegrationStatus: 'confirmed',
    notes: raw.extraInfo || raw.observations || undefined,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export default async function handler(req: any, res: any) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const startTime = Date.now();
  const query = req.query || {};
  const orderId = query.orderId || query.id;
  const clientId = sanitizeCredential(query.clientId) || process.env.IFOOD_CLIENT_ID;
  const clientSecret = sanitizeCredential(query.clientSecret) || process.env.IFOOD_CLIENT_SECRET;

  if (!orderId) {
    return res.status(400).json({ success: false, message: 'Parâmetro orderId não fornecido.' });
  }

  const rawId = String(orderId).replace(/^ifd-/, '').replace(/^#IFD-/, '').replace(/^#/, '').trim();

  try {
    let auth: { token: string; expiresIn: number } | null = null;
    try {
      auth = await getIfoodAccessToken(clientId, clientSecret);
    } catch (authErr: any) {
      console.warn('[order-details] Token OAuth não obtido:', authErr?.message);
    }

    if (auth?.token) {
      const ifoodRes = await fetch(`https://merchant-api.ifood.com.br/order/v1.0/orders/${rawId}`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Accept': 'application/json'
        }
      });

      if (ifoodRes.ok) {
        const orderData = await ifoodRes.json();
        const formatted = formatIfoodOrder(orderData);

        // Sincroniza pedido enriquecido com o Supabase
        if (formatted) {
          syncOrderToSupabase(formatted).catch(() => {});
        }

        recordApiLog({
          event_type: 'FETCH_ORDER_DETAILS',
          status_code: ifoodRes.status,
          order_id: `ifd-${rawId}`,
          message: `Detalhes do pedido ${rawId} obtidos com sucesso na API iFood. Modalidade: ${formatted?.deliveredBy} (${formatted?.deliveryType}).`,
          payload: { orderId: rawId, deliveredBy: formatted?.deliveredBy, deliveryType: formatted?.deliveryType, pickupCode: formatted?.pickupCode }
        });

        return res.status(200).json({
          success: true,
          order: formatted,
          raw: orderData,
          deliveredBy: formatted?.deliveredBy,
          deliveryType: formatted?.deliveryType,
          pickupCode: formatted?.pickupCode,
          durationMs: Date.now() - startTime
        });
      }
    }

    // Fallback: Se a chamada direta falhar ou se for pedido local/simulado, busca os dados gravados no Supabase
    if (SUPABASE_URL && SUPABASE_KEY) {
      const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.ifd-${rawId}`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Accept': 'application/json'
        }
      });

      if (dbRes.ok) {
        const rows = await dbRes.json();
        if (rows && rows.length > 0) {
          const dbOrder = rows[0];
          const deliveredBy = dbOrder.deliveredBy || dbOrder.delivered_by || 'IFOOD';
          const deliveryType = dbOrder.deliveryType || dbOrder.delivery_type || 'DELIVERY';

          return res.status(200).json({
            success: true,
            order: dbOrder,
            deliveredBy,
            deliveryType,
            pickupCode: dbOrder.pickupCode || dbOrder.pickup_code,
            message: `Modalidade obtida do registro local/Supabase: ${deliveredBy} (${deliveryType}).`
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      order: {
        id: `ifd-${rawId}`,
        rawIfoodId: rawId,
        deliveredBy: 'IFOOD',
        deliveryType: 'DELIVERY'
      },
      deliveredBy: 'IFOOD',
      deliveryType: 'DELIVERY',
      message: 'Modalidade padrão iFood atribuída (IFOOD - DELIVERY).'
    });

  } catch (error: any) {
    console.error('[order-details error]:', error);
    return res.status(200).json({
      success: true,
      order: {
        id: `ifd-${rawId}`,
        rawIfoodId: rawId,
        deliveredBy: 'IFOOD',
        deliveryType: 'DELIVERY'
      },
      deliveredBy: 'IFOOD',
      deliveryType: 'DELIVERY',
      message: 'Modalidade padrão iFood atribuída (Fallback).'
    });
  }
}
