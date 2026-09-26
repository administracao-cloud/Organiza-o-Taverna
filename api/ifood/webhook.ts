import crypto from 'crypto';

// Supabase credentials fallback
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

// Token cache for iFood API acknowledgment and operations
let tokenCache: { token: string; expiresAt: number } | null = null;

function sanitizeCredential(val: any): string {
  if (!val || typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (trimmed.startsWith('••••') || trimmed.includes('***')) return '';
  return trimmed;
}

async function getIfoodAccessToken(): Promise<string | null> {
  const clientId = sanitizeCredential(process.env.IFOOD_CLIENT_ID);
  const clientSecret = sanitizeCredential(process.env.IFOOD_CLIENT_SECRET);
  if (!clientId || !clientSecret) return null;

  const now = Date.now();
  if (tokenCache && tokenCache.token && tokenCache.expiresAt > now + 60000) {
    return tokenCache.token;
  }

  try {
    const params = new URLSearchParams();
    params.append('grantType', 'client_credentials');
    params.append('clientId', clientId.trim());
    params.append('clientSecret', clientSecret.trim());

    const tokenRes = await fetch('https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!tokenRes.ok) return null;
    const tokenData = await tokenRes.json();
    const expiresIn = tokenData.expiresIn || tokenData.expires_in || 21600;
    tokenCache = {
      token: tokenData.accessToken,
      expiresAt: now + expiresIn * 1000,
    };
    return tokenData.accessToken;
  } catch {
    return null;
  }
}

// Safely parse request body regardless of how Vercel delivered it
function parseBody(req: any): any {
  try {
    if (!req) return {};
    if (req.body) {
      if (typeof req.body === 'string') {
        try {
          return JSON.parse(req.body);
        } catch {
          return req.body;
        }
      }
      return req.body;
    }
  } catch (err) {
    console.error('[parseBody Error]:', err);
  }
  return {};
}

// Direct REST Logger to Supabase api_logs for observability
async function recordApiLog(entry: {
  event_type: string;
  status_code?: number;
  message: string;
  order_id?: string | null;
  payload?: any;
  error_details?: string | null;
}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  try {
    const timestamp = new Date().toISOString();
    await fetch(`${SUPABASE_URL}/rest/v1/api_logs`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        id: `apilog-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp,
        provider: 'ifood',
        endpoint: '/api/ifood/webhook',
        event_type: entry.event_type,
        status_code: entry.status_code || 200,
        order_id: entry.order_id || null,
        message: entry.message,
        payload: entry.payload ? (typeof entry.payload === 'object' ? entry.payload : { raw: entry.payload }) : null,
        error_details: entry.error_details || null,
        created_at: timestamp
      })
    });
  } catch {
    // Non-blocking
  }
}

// Translate iFood event codes to internal status and integration lifecycle status
function translateIfoodEventCode(fullCodeStr: string): {
  status: 'pendente' | 'em_producao' | 'pronto' | 'saiu_entrega' | 'entregue' | 'cancelado';
  ifoodIntegrationStatus:
    | 'pending_confirmation'
    | 'confirmed'
    | 'in_preparation'
    | 'ready'
    | 'dispatched'
    | 'concluded'
    | 'cancelled'
    | 'cancellation_requested'
    | 'scheduled';
  description: string;
  isCancellationRequest: boolean;
  isCancellationFailed: boolean;
  isPreparationStart: boolean;
} {
  const code = String(fullCodeStr || '').toUpperCase().replace(/^(ORDER_)?/, '');

  if (['PLACED', 'PLC', 'NEW', 'ORDER_PLACED'].includes(code)) {
    return {
      status: 'pendente',
      ifoodIntegrationStatus: 'pending_confirmation',
      description: 'Novo pedido recebido via iFood',
      isCancellationRequest: false,
      isCancellationFailed: false,
      isPreparationStart: false
    };
  }
  if (['CONFIRMED', 'CFM', 'INTEGRATED'].includes(code)) {
    return {
      status: 'em_producao',
      ifoodIntegrationStatus: 'confirmed',
      description: 'Pedido confirmado e enviado para produção',
      isCancellationRequest: false,
      isCancellationFailed: false,
      isPreparationStart: false
    };
  }
  if (['PRS', 'PREPARATION_STARTED', 'IN_PREPARATION'].includes(code)) {
    return {
      status: 'em_producao',
      ifoodIntegrationStatus: 'in_preparation',
      description: 'Preparo do pedido iniciado na cozinha',
      isCancellationRequest: false,
      isCancellationFailed: false,
      isPreparationStart: true
    };
  }
  if (['READY_TO_PICKUP', 'RTP', 'TAKEOUT_READY', 'READY', 'PACKAGED'].includes(code)) {
    return {
      status: 'pronto',
      ifoodIntegrationStatus: 'ready',
      description: 'Pedido pronto e embalado para retirada/despacho',
      isCancellationRequest: false,
      isCancellationFailed: false,
      isPreparationStart: false
    };
  }
  if (['DISPATCHED', 'DSP', 'GOING_TO_DELIVER', 'OUT_FOR_DELIVERY', 'DELIVERING', 'COLLECTED'].includes(code)) {
    return {
      status: 'saiu_entrega',
      ifoodIntegrationStatus: 'dispatched',
      description: 'Pedido saiu para entrega',
      isCancellationRequest: false,
      isCancellationFailed: false,
      isPreparationStart: false
    };
  }
  if (['CONCLUDED', 'CON', 'DELIVERED', 'COMPLETED', 'FINISHED'].includes(code)) {
    return {
      status: 'entregue',
      ifoodIntegrationStatus: 'concluded',
      description: 'Pedido entregue e concluído no iFood',
      isCancellationRequest: false,
      isCancellationFailed: false,
      isPreparationStart: false
    };
  }
  if (['CANCELLATION_REQUESTED', 'CRQ', 'CAR', 'CCR', 'CANCELLATION_REQUESTED_BY_CUSTOMER'].includes(code)) {
    return {
      status: 'cancelado',
      ifoodIntegrationStatus: 'cancelled',
      description: 'Solicitação de cancelamento recebida no iFood',
      isCancellationRequest: true,
      isCancellationFailed: false,
      isPreparationStart: false
    };
  }
  if (['CANCELLATION_REQUEST_FAILED', 'CRF'].includes(code)) {
    return {
      status: 'em_producao',
      ifoodIntegrationStatus: 'confirmed',
      description: 'Solicitação de cancelamento rejeitada/expirada no iFood',
      isCancellationRequest: false,
      isCancellationFailed: true,
      isPreparationStart: false
    };
  }
  if (['CANCELLED', 'CAN', 'ORDER_CANCELLED', 'CAC', 'CANCELLATION_ACCEPTED'].includes(code)) {
    return {
      status: 'cancelado',
      ifoodIntegrationStatus: 'cancelled',
      description: 'Pedido cancelado no iFood',
      isCancellationRequest: false,
      isCancellationFailed: false,
      isPreparationStart: false
    };
  }

  return {
    status: 'pendente',
    ifoodIntegrationStatus: 'pending_confirmation',
    description: `Evento iFood recebido (${fullCodeStr})`,
    isCancellationRequest: false,
    isCancellationFailed: false,
    isPreparationStart: false
  };
}

// Fetch complete order details from iFood Merchant API if only ID is provided in webhook
async function fetchOrderDetailsFromIfood(orderId: string): Promise<any | null> {
  const cleanId = String(orderId).replace(/^ifd-/, '').replace(/^#IFD-/, '').replace(/^#/, '').trim();
  if (!cleanId) return null;

  try {
    const token = await getIfoodAccessToken();
    if (!token) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`https://merchant-api.ifood.com.br/order/v1.0/orders/${cleanId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      return await res.json();
    }
  } catch (err: any) {
    console.warn(`[fetchOrderDetailsFromIfood Warning for ${cleanId}]:`, err?.message);
  }
  return null;
}

// Trigger iFood action endpoint (acceptCancellation, confirm, startPreparation, etc.)
async function callIfoodAction(orderId: string, actionName: string, actionBody: any = {}): Promise<boolean> {
  const cleanId = String(orderId).replace(/^ifd-/, '').replace(/^#IFD-/, '').replace(/^#/, '').trim();
  if (!cleanId) return false;

  try {
    const token = await getIfoodAccessToken();
    if (!token) return false;

    // Se a ação for aceitar cancelamento, utiliza a rota padrão /v1.0/orders/{orderId}/cancellation/accept com corpo vazio
    const isCancelAccept = actionName === 'acceptCancellation' || actionName === 'cancellation/accept';
    const endpoints = isCancelAccept
      ? [
          `https://merchant-api.ifood.com.br/v1.0/orders/${cleanId}/cancellation/accept`,
          `https://merchant-api.ifood.com.br/order/v1.0/orders/${cleanId}/cancellation/accept`,
          `https://merchant-api.ifood.com.br/order/v1.0/orders/${cleanId}/actions/acceptCancellation`,
          `https://merchant-api.ifood.com.br/order/v1.0/orders/${cleanId}/acceptCancellation`
        ]
      : [
          `https://merchant-api.ifood.com.br/order/v1.0/orders/${cleanId}/actions/${actionName}`,
          `https://merchant-api.ifood.com.br/order/v1.0/orders/${cleanId}/${actionName}`
        ];

    const bodyToSend = isCancelAccept ? '{}' : JSON.stringify(actionBody || {});

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: bodyToSend
        });

        if (res.ok || res.status === 200 || res.status === 202 || res.status === 204) {
          console.log(`[iFood Action Success]: ${actionName} para pedido ${cleanId} (HTTP ${res.status})`);
          return true;
        }

        // Se a API retornar erro HTTP 400 (Bad Request) ou 404/422
        if (res.status === 400 || res.status === 404 || res.status === 422) {
          const resText = await res.text();
          let resJson: any = null;
          try {
            resJson = JSON.parse(resText);
          } catch {}

          const errMessage = (resJson?.message || resJson?.error?.message || resJson?.details?.[0]?.message || resText || '').toLowerCase();

          // Verifica se o motivo do 400 é porque o pedido já foi cancelado, processado ou está em status consolidado
          const isAlreadyProcessed =
            errMessage.includes('already') ||
            errMessage.includes('cancel') ||
            errMessage.includes('processed') ||
            errMessage.includes('status') ||
            errMessage.includes('inválid') ||
            errMessage.includes('invalid') ||
            errMessage.includes('não permit');

          if (isAlreadyProcessed || res.status === 400) {
            console.log(`[iFood Action Notice]: Pedido ${cleanId} já processado/cancelado no iFood (HTTP ${res.status}: ${errMessage || 'Status consolidado'}). Atualizando banco Supabase...`);

            if (isCancelAccept && SUPABASE_URL && SUPABASE_KEY) {
              const now = new Date().toISOString();
              fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.ifd-${cleanId}`, {
                method: 'PATCH',
                headers: {
                  'apikey': SUPABASE_KEY,
                  'Authorization': `Bearer ${SUPABASE_KEY}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                  status: 'cancelado',
                  integration_status: 'cancelled',
                  ifoodIntegrationStatus: 'cancelled',
                  ifood_integration_status: 'cancelled',
                  updatedAt: now,
                  updated_at: now
                })
              }).catch(() => {});
            }

            return true;
          }
        }
      } catch (reqErr: any) {
        console.warn(`[callIfoodAction Warning for ${url}]:`, reqErr?.message);
      }
    }
  } catch (err: any) {
    console.warn(`[callIfoodAction Exception for ${cleanId} - ${actionName}]:`, err?.message);
  }
  return false;
}

// Sync order to Supabase orders table with aligned camelCase and snake_case columns
async function syncOrderToSupabase(payload: any): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_KEY || !payload) return false;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Supabase Upsert Warning HTTP ${res.status}]:`, errText);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('[Supabase Upsert Exception]:', err);
    return false;
  }
}

// Send Acknowledgment back to iFood API
async function sendIfoodAcknowledgment(eventIds: string[]): Promise<boolean> {
  if (!eventIds || eventIds.length === 0) return true;
  const realIds = eventIds.filter(id => id && !String(id).startsWith('evt_sim_'));
  if (realIds.length === 0) return true;

  try {
    const token = await getIfoodAccessToken();
    if (!token) return false;

    const payload = realIds.map(id => ({ id }));
    const ackRes = await fetch('https://merchant-api.ifood.com.br/order/v1.0/events/acknowledgment', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    return ackRes.ok;
  } catch (err: any) {
    console.error('[sendIfoodAcknowledgment Error]:', err);
    return false;
  }
}

/**
 * iFood Webhook Handler for Vercel Serverless Functions
 * Follows all required iFood resilience and business flow rules:
 * 1. Responds IMMEDIATELY with HTTP 202 (or 200) {"received": true} to avoid timeout (5-second limit)
 * 2. Fully compliant Cancelation Flow ('CANCELLATION_REQUESTED', 'CANCELLED', 'CANCELLATION_REQUEST_FAILED')
 * 3. Complete Preparation & Scheduling Flow ('PLACED', 'CONFIRMED', 'IN_PREPARATION', 'READY_TO_PICKUP', 'DISPATCHED', 'DELIVERED')
 * 4. Mapped columns for Supabase (including camelCase and snake_case versions)
 * 5. Robust Try/Catch with detailed console.error(error) for Vercel logs and Supabase api_logs
 */
export default async function handler(req: any, res: any) {
  // Configura CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-ifood-signature, x-signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Healthcheck / Handshake do Portal iFood (requisições GET)
  if (req.method === 'GET') {
    return res.status(200).json({
      received: true,
      status: 'ONLINE',
      service: 'Saborê Confeitaria - iFood Webhook Receiver',
      mode: 'Vercel Serverless Function',
      supportedEvents: [
        'PLACED',
        'CONFIRMED',
        'IN_PREPARATION',
        'READY_TO_PICKUP',
        'DISPATCHED',
        'DELIVERED',
        'CONCLUDED',
        'CANCELLATION_REQUESTED',
        'CANCELLATION_REQUEST_FAILED',
        'CANCELLED'
      ],
      timestamp: new Date().toISOString()
    });
  }

  try {
    // =========================================================================
    // REGRA 1: RESPOSTA IMEDIATA AO IFOOD (HTTP 202 {"received": true})
    // Enviamos a resposta antes do processamento para garantir retorno em < 50ms
    // e evitar que o iFood encerre a conexão por Timeout (5 segundos).
    // =========================================================================
    if (!res.headersSent) {
      res.status(202).json({ received: true });
    }

    // =========================================================================
    // PROCESSAMENTO DOS DADOS DO PEDIDO
    // =========================================================================
    const rawPayload = parseBody(req);

    // Verificação de PING / Handshake
    const isPing =
      !rawPayload ||
      (typeof rawPayload === 'object' && Object.keys(rawPayload).length === 0) ||
      rawPayload.type === 'HANDSHAKE' ||
      rawPayload.code === 'HANDSHAKE' ||
      rawPayload.code === 'MOCK_PRESENCE' ||
      rawPayload.type === 'PING' ||
      rawPayload.event === 'PING' ||
      rawPayload.ping === true;

    if (isPing) {
      recordApiLog({
        event_type: 'WEBHOOK_PING',
        status_code: 202,
        message: 'Ping / Handshake de presença validado com sucesso',
        payload: rawPayload
      }).catch(() => {});
      return;
    }

    // Normalizar eventos em array
    const rawEvents = Array.isArray(rawPayload)
      ? rawPayload
      : rawPayload.events && Array.isArray(rawPayload.events)
      ? rawPayload.events
      : [rawPayload];

    const eventIdsToAck: string[] = [];

    for (const evt of rawEvents) {
      if (!evt || typeof evt !== 'object') continue;

      const eventId = evt.id || evt.eventId || `evt_${Date.now()}`;
      const fullCode = String(evt.fullCode || evt.code || evt.event || 'UNKNOWN').toUpperCase();
      const rawOrderId = evt.orderId || evt.order_id || evt.idOrder || evt.order?.id;
      const cleanOrderId = rawOrderId
        ? String(rawOrderId).replace(/^ifd-/, '').replace(/^#IFD-/, '').replace(/^#/, '').trim()
        : null;

      if (eventId) eventIdsToAck.push(eventId);

      const {
        status,
        ifoodIntegrationStatus,
        description,
        isCancellationRequest,
        isPreparationStart
      } = translateIfoodEventCode(fullCode);

      // =======================================================================
      // 1. FLUXO DE CANCELAMENTO
      // Se for CANCELLATION_REQUESTED: extrai motivo e aciona acceptCancellation na API do iFood
      // =======================================================================
      const cancellationReason =
        evt.data?.reason ||
        evt.metadata?.reason ||
        evt.reason ||
        evt.cancellationReason ||
        evt.cancellation_reason ||
        evt.order?.cancellationReason ||
        (isCancellationRequest ? 'Solicitado pelo cliente via aplicativo iFood' : undefined);

      const cancellationCode =
        evt.data?.cancellationCode ||
        evt.data?.code ||
        evt.cancellationCode ||
        evt.cancellation_code ||
        evt.order?.cancellationCode ||
        (isCancellationRequest ? '501' : undefined);

      if (isCancellationRequest && cleanOrderId) {
        // Dispara aceitação de cancelamento para o iFood de forma não-bloqueante
        callIfoodAction(cleanOrderId, 'acceptCancellation', {
          reason: cancellationReason || 'Cancelamento aceito pelo restaurante',
          cancellationCode: cancellationCode || '501'
        }).catch(err => console.warn('[Auto-Accept Cancellation Notice]:', err?.message));
      }

      // Se payload contiver apenas o ID, tenta buscar detalhes completos na API do iFood
      let fetchedOrder: any = null;
      if (cleanOrderId && (!evt.order && !evt.items && !evt.customer)) {
        fetchedOrder = await fetchOrderDetailsFromIfood(cleanOrderId);
      }

      const srcOrder = fetchedOrder || evt.order || evt;
      const srcCustomer = srcOrder.customer || {};
      const srcDelivery = srcOrder.delivery || {};
      const srcSchedule = srcDelivery.schedule || srcOrder.schedule || {};

      // =======================================================================
      // 2. FLUXO DE PREPARO E AGENDAMENTO (PERSISTÊNCIA DE METADADOS CRÍTICOS)
      // =======================================================================
      const now = new Date().toISOString();
      const customerOrdersCount = Number(
        srcCustomer.ordersCountOnMerchant ??
        srcCustomer.ordersCount ??
        srcOrder.customerOrdersCount ??
        srcOrder.customer_orders_count ??
        0
      );

      const deliveryType = String(
        srcDelivery.deliveryType ||
        srcOrder.deliveryType ||
        srcOrder.delivery_type ||
        srcOrder.orderType ||
        (srcOrder.takeout ? 'TAKEOUT' : (srcOrder.indoor ? 'INDOOR' : 'DELIVERY'))
      ).toUpperCase();

      const deliveryAddressDetails = srcDelivery.deliveryAddress ? {
        formattedAddress: srcDelivery.deliveryAddress.formattedAddress || srcDelivery.deliveryAddress.address || '',
        streetName: srcDelivery.deliveryAddress.streetName || '',
        streetNumber: srcDelivery.deliveryAddress.streetNumber || '',
        neighborhood: srcDelivery.deliveryAddress.neighborhood || '',
        complement: srcDelivery.deliveryAddress.complement || '',
        postalCode: srcDelivery.deliveryAddress.postalCode || '',
        city: srcDelivery.deliveryAddress.city || '',
        state: srcDelivery.deliveryAddress.state || '',
        coordinates: srcDelivery.deliveryAddress.coordinates || null
      } : (srcOrder.deliveryAddressDetails || srcOrder.delivery_address_details || null);

      const customerName = srcCustomer.name || srcOrder.customerName || srcOrder.customer_name || 'Cliente iFood';
      const customerPhone = srcCustomer.phone?.number || srcCustomer.phone || srcOrder.customerPhone || srcOrder.customer_phone || '(Não informado)';
      const customerAddress = srcDelivery.deliveryAddress?.formattedAddress || srcOrder.customerAddress || srcOrder.customer_address || 'Entrega via iFood';
      const customerDocument = srcCustomer.documentNumber || srcCustomer.document || srcOrder.customerDocument || srcOrder.customer_document || null;

      const subtotal = Number(srcOrder.subtotal || srcOrder.total?.subTotal || srcOrder.orderAmount || 0);
      const deliveryFee = Number(srcOrder.deliveryFee || srcOrder.total?.deliveryFee || 0);
      const discount = Number(srcOrder.discount || srcOrder.total?.benefits || 0);
      const total = Number(srcOrder.total?.orderAmount || srcOrder.total || subtotal + deliveryFee - discount);
      const platformFeePercent = 23;
      const platformFeeAmount = Number((total * 0.23).toFixed(2));
      const netAmount = Number((total - platformFeeAmount).toFixed(2));

      const rawItems = Array.isArray(srcOrder.items) ? srcOrder.items : [];
      const items = rawItems.length > 0 ? rawItems.map((it: any, idx: number) => {
        const qty = Number(it.quantity ?? it.qty ?? 1) || 1;
        const unitPrice = Number(it.unitPrice ?? it.price ?? 0) || 0;
        const totalPrice = Number(it.totalPrice ?? (unitPrice * qty)) || (unitPrice * qty);
        const optionsRaw = Array.isArray(it.options) ? it.options : (Array.isArray(it.subItems) ? it.subItems : []);
        const options = optionsRaw.map((opt: any) => ({
          name: String(opt.name || opt.title || 'Complemento'),
          quantity: Number(opt.quantity || 1),
          unitPrice: Number(opt.unitPrice ?? opt.price ?? 0),
          totalPrice: Number(opt.totalPrice ?? ((opt.unitPrice ?? opt.price ?? 0) * (opt.quantity || 1)))
        }));

        return {
          productId: it.id || it.productId || it.externalCode || `prod-ifd-${idx}`,
          productName: it.name || it.productName || 'Item do Cardápio iFood',
          quantity: qty,
          unitPrice,
          totalPrice,
          notes: it.notes || it.observations || null,
          options: options.length > 0 ? options : undefined,
          subItems: options.length > 0 ? options : undefined
        };
      }) : [
        {
          productId: 'prod-ifd-auto',
          productName: srcOrder.itemName || 'Item do Cardápio iFood',
          quantity: 1,
          unitPrice: total > 0 ? total : 35.00,
          totalPrice: total > 0 ? total : 35.00
        }
      ];

      const pickupCode = srcOrder.pickupCode || srcOrder.pickup_code || srcDelivery.pickupCode || null;
      const orderTiming = String(srcOrder.orderTiming || srcOrder.order_timing || (srcSchedule.deliveryDateTimeStart ? 'SCHEDULED' : 'IMMEDIATE')).toUpperCase();
      const deliveredBy = String(srcDelivery.deliveredBy || srcOrder.deliveredBy || 'IFOOD').toUpperCase();
      const scheduleStart = srcSchedule.deliveryDateTimeStart || srcOrder.scheduleStart || srcOrder.schedule_start || null;
      const scheduleEnd = srcSchedule.deliveryDateTimeEnd || srcOrder.scheduleEnd || srcOrder.schedule_end || null;
      const preparationStartDateTime = isPreparationStart
        ? now
        : (srcOrder.preparationStartDateTime || srcOrder.preparation_start_date_time || (status === 'em_producao' ? now : null));

      const paymentMethod = srcOrder.paymentMethod || srcOrder.payment_method || 'plataforma';
      const paymentStatus = status === 'entregue' ? 'completed' : (srcOrder.paymentStatus || srcOrder.payment_status || 'pending');
      const paymentDescription = srcOrder.payments?.methods?.[0]?.method || srcOrder.paymentDescription || 'Pagamento Online via iFood';

      const finalOrderId = `ifd-${cleanOrderId || Date.now()}`;
      const displayCode = `#IFD-${(cleanOrderId || '0000').slice(-4).toUpperCase()}`;

      // =======================================================================
      // REGRA 3: PAYLOAD ALINHADO (camelCase E snake_case PARA O SUPABASE)
      // =======================================================================
      const supabasePayload: Record<string, any> = {
        id: finalOrderId,
        code: displayCode,
        // Cliente
        customerName,
        customer_name: customerName,
        customerPhone,
        customer_phone: customerPhone,
        customerAddress,
        customer_address: customerAddress,
        customerDocument,
        customer_document: customerDocument,
        customerOrdersCount,
        customer_orders_count: customerOrdersCount,

        // Logística & Entrega
        deliveryType,
        delivery_type: deliveryType,
        deliveryAddressDetails,
        delivery_address_details: deliveryAddressDetails,
        deliveredBy,
        delivered_by: deliveredBy,
        orderTiming,
        order_timing: orderTiming,
        pickupCode,
        pickup_code: pickupCode,
        scheduleStart,
        schedule_start: scheduleStart,
        scheduleEnd,
        schedule_end: scheduleEnd,
        preparationStartDateTime,
        preparation_start_date_time: preparationStartDateTime,
        deliveryDate: scheduleStart || srcOrder.deliveryDate || srcOrder.delivery_date || now,
        delivery_date: scheduleStart || srcOrder.deliveryDate || srcOrder.delivery_date || now,

        // Itens e Valores Financeiros
        items,
        subtotal,
        deliveryFee,
        delivery_fee: deliveryFee,
        discount,
        total,
        platformFeePercent,
        platformFeeAmount,
        netAmount,

        // Status e Canal
        channel: 'ifood',
        type: orderTiming === 'SCHEDULED' ? 'encomenda' : 'pronta_entrega',
        status,
        ifoodIntegrationStatus,
        ifood_integration_status: ifoodIntegrationStatus,
        notes: srcOrder.notes || `Atualizado via Webhook (${fullCode}: ${description})`,
        rawIfoodId: cleanOrderId,
        raw_ifood_id: cleanOrderId,

        // Cancelamento (quando aplicável)
        cancellationReason: cancellationReason || null,
        cancellation_reason: cancellationReason || null,
        cancellationCode: cancellationCode || null,
        cancellation_code: cancellationCode || null,

        // Pagamento
        paymentMethod,
        payment_method: paymentMethod,
        paymentStatus,
        payment_status: paymentStatus,
        paymentDescription,
        payment_description: paymentDescription,

        // Metadados
        createdAt: srcOrder.createdAt || srcOrder.created_at || now,
        created_at: srcOrder.createdAt || srcOrder.created_at || now,
        updatedAt: now,
        updated_at: now
      };

      // Sincroniza pedido no Supabase
      const synced = await syncOrderToSupabase(supabasePayload);

      console.log(`[iFood Webhook] Pedido ${displayCode} (${fullCode} -> status: ${status}, ifoodStatus: ${ifoodIntegrationStatus}) sincronizado no Supabase: ${synced}`);
    }

    // Confirmação (ACK) para a API do iFood
    if (eventIdsToAck.length > 0) {
      sendIfoodAcknowledgment(eventIdsToAck).catch(ackErr => {
        console.error('[iFood Webhook ACK Error]:', ackErr);
      });
    }

    recordApiLog({
      event_type: 'WEBHOOK_PROCESSED_SUCCESS',
      status_code: 200,
      message: `${rawEvents.length} evento(s) iFood processados com sucesso.`,
      payload: { count: rawEvents.length }
    }).catch(() => {});

  } catch (error: any) {
    // =========================================================================
    // REGRA 4: CONSOLE.ERROR DETALHADO NO CATCH PARA LOGS DA VERCEL
    // =========================================================================
    console.error('[iFood Webhook Exception]:', error);
    if (error?.stack) {
      console.error('[iFood Webhook Stack Trace]:\n', error.stack);
    }
    console.error('[iFood Webhook Request Info]:', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      bodyPreview: typeof req.body === 'string' ? req.body.slice(0, 300) : req.body
    });

    // Registra log de erro na tabela api_logs do Supabase para auditoria
    recordApiLog({
      event_type: 'WEBHOOK_INTERNAL_EXCEPTION',
      status_code: 500,
      message: error?.message || 'Erro interno no processamento do webhook',
      error_details: error?.stack || String(error)
    }).catch(() => {});

    // GARANTE que nunca retorne 500 para o iFood se os headers ainda não foram enviados
    if (!res.headersSent) {
      res.status(202).json({ received: true });
    }
  }
}
