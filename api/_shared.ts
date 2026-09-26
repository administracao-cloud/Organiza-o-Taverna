import crypto from 'crypto';

// Supabase Configuration
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://dxvxqkqqrqgcoaeeazzh.supabase.co').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_cGDWUhw-Mae1vr_kFVlR-g_gCptL1AY').trim();

// Enable CORS for Vercel Serverless Functions
export function setCors(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Ifood-Signature, X-Signature, X-Webhook-Secret');
}

// Safely extract request body in Vercel Serverless
export function getBody(req: any): any {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return req.body;
    }
  }
  return {};
}

// Sanitize credentials to ignore masked UI placeholders
export function sanitizeCredential(val?: any): string {
  if (!val) return '';
  const trimmed = String(val).trim();
  if (
    trimmed.startsWith('🔐') || 
    trimmed.includes('•') || 
    trimmed.startsWith('***') || 
    trimmed.includes('[SALVO')
  ) {
    return '';
  }
  return trimmed;
}

// Memory Cache for iFood OAuth Token
let tokenCache: { accessToken: string; expiresAt: number } | null = null;

// Get or Refresh iFood OAuth2 Token
export async function getIfoodAccessToken(
  customClientId?: string,
  customClientSecret?: string,
  forceRefresh: boolean = false
): Promise<{ token: string; expiresIn: number }> {
  const cleanClientId = sanitizeCredential(customClientId) || process.env.IFOOD_CLIENT_ID || '';
  const cleanClientSecret = sanitizeCredential(customClientSecret) || process.env.IFOOD_CLIENT_SECRET || '';

  if (!cleanClientId || !cleanClientSecret) {
    throw new Error('Credenciais do iFood (Client ID ou Client Secret) não informadas.');
  }

  const now = Date.now();
  if (!forceRefresh && tokenCache && tokenCache.expiresAt > now + 60000) {
    return {
      token: tokenCache.accessToken,
      expiresIn: Math.round((tokenCache.expiresAt - now) / 1000),
    };
  }

  const params = new URLSearchParams();
  params.append('grantType', 'client_credentials');
  params.append('clientId', cleanClientId.trim());
  params.append('clientSecret', cleanClientSecret.trim());

  const tokenController = new AbortController();
  const tokenTimeout = setTimeout(() => tokenController.abort(), 5000);

  let tokenRes: any;
  try {
    tokenRes = await fetch('https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'Sabore-Bakery-App/2.0'
      },
      body: params.toString(),
      signal: tokenController.signal
    });
    clearTimeout(tokenTimeout);
  } catch (netErr: any) {
    clearTimeout(tokenTimeout);
    throw new Error(`iFood OAuth timeout/erro de rede: ${netErr?.message}`);
  }

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`iFood OAuth falhou (HTTP ${tokenRes.status}): ${errText}`);
  }

  const tokenData = await tokenRes.json();
  const expiresIn = tokenData.expiresIn || tokenData.expires_in || 21600;

  tokenCache = {
    accessToken: tokenData.accessToken,
    expiresAt: now + expiresIn * 1000,
  };

  return {
    token: tokenData.accessToken,
    expiresIn,
  };
}

// Direct REST Logger to Supabase public.api_logs
export async function recordApiLog(entry: {
  event_type: string;
  status_code?: number;
  provider?: string;
  endpoint?: string;
  order_id?: string | null;
  payload?: any;
  message: string;
  error_details?: string | null;
}) {
  const timestamp = new Date().toISOString();
  const statusCode = entry.status_code ?? 200;
  const statusIcon = statusCode >= 400 ? '❌' : statusCode >= 300 ? '⚠️' : '✅';
  console.log(`[API LOG ${statusIcon}] [${entry.provider || 'IFOOD'}] [${entry.event_type}] ${entry.message}`);

  if (!SUPABASE_URL || !SUPABASE_KEY) return;

  try {
    const payloadBody = {
      id: `apilog-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp,
      provider: entry.provider || 'ifood',
      endpoint: entry.endpoint || '/api/ifood/webhook',
      event_type: entry.event_type,
      status_code: statusCode,
      order_id: entry.order_id || null,
      payload: entry.payload ? (typeof entry.payload === 'object' ? entry.payload : { raw: entry.payload }) : null,
      message: entry.message,
      error_details: entry.error_details || null,
      created_at: timestamp
    };

    fetch(`${SUPABASE_URL}/rest/v1/api_logs`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payloadBody)
    }).catch(() => {});
  } catch {
    // non-blocking
  }
}

// Sync an order into Supabase public.orders table
export async function syncOrderToSupabase(order: any): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_KEY || !order) return false;

  try {
    const customerOrdersCount = Number(order.customerOrdersCount ?? order.customer_orders_count ?? 0);
    const deliveryType = String(order.deliveryType || order.delivery_type || 'DELIVERY').toUpperCase();
    const deliveryAddressDetails = order.deliveryAddressDetails || order.delivery_address_details || null;
    const now = new Date().toISOString();

    const enriched = {
      ...order,
      // Ensure camelCase and snake_case versions
      customerOrdersCount,
      customer_orders_count: customerOrdersCount,
      deliveryType,
      delivery_type: deliveryType,
      deliveryAddressDetails,
      delivery_address_details: deliveryAddressDetails,
      customerName: order.customerName || order.customer_name || 'Cliente iFood',
      customer_name: order.customerName || order.customer_name || 'Cliente iFood',
      customerPhone: order.customerPhone || order.customer_phone || '(Não informado)',
      customer_phone: order.customerPhone || order.customer_phone || '(Não informado)',
      customerAddress: order.customerAddress || order.customer_address || 'Entrega iFood',
      customer_address: order.customerAddress || order.customer_address || 'Entrega iFood',
      paymentStatus: order.paymentStatus || order.payment_status || (order.status === 'entregue' ? 'completed' : 'pending'),
      payment_status: order.paymentStatus || order.payment_status || (order.status === 'entregue' ? 'completed' : 'pending'),
      paymentMethod: order.paymentMethod || order.payment_method || 'plataforma',
      payment_method: order.paymentMethod || order.payment_method || 'plataforma',
      deliveryFee: Number(order.deliveryFee ?? order.delivery_fee ?? 0),
      delivery_fee: Number(order.deliveryFee ?? order.delivery_fee ?? 0),
      orderTiming: String(order.orderTiming || order.order_timing || 'IMMEDIATE').toUpperCase(),
      order_timing: String(order.orderTiming || order.order_timing || 'IMMEDIATE').toUpperCase(),
      deliveredBy: String(order.deliveredBy || order.delivered_by || 'IFOOD').toUpperCase(),
      delivered_by: String(order.deliveredBy || order.delivered_by || 'IFOOD').toUpperCase(),
      pickupCode: order.pickupCode || order.pickup_code || null,
      pickup_code: order.pickupCode || order.pickup_code || null,
      preparationStartDateTime: order.preparationStartDateTime || order.preparation_start_date_time || null,
      preparation_start_date_time: order.preparationStartDateTime || order.preparation_start_date_time || null,
      scheduleStart: order.scheduleStart || order.schedule_start || null,
      schedule_start: order.scheduleStart || order.schedule_start || null,
      scheduleEnd: order.scheduleEnd || order.schedule_end || null,
      schedule_end: order.scheduleEnd || order.schedule_end || null,
      cancellationReason: order.cancellationReason || order.cancellation_reason || null,
      cancellation_reason: order.cancellationReason || order.cancellation_reason || null,
      cancellationCode: order.cancellationCode || order.cancellation_code || null,
      cancellation_code: order.cancellationCode || order.cancellation_code || null,
      createdAt: order.createdAt || order.created_at || now,
      created_at: order.createdAt || order.created_at || now,
      updatedAt: now,
      updated_at: now,
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify(enriched)
    });
    return res.ok;
  } catch (err) {
    console.warn('[syncOrderToSupabase Warning]:', err);
    return false;
  }
}

// Validate HMAC SHA256 Webhook Signature
export function validateIfoodWebhookSignature(
  headers: Record<string, any>,
  rawBody: any,
  secret?: string
): boolean {
  const webhookSecret = secret || process.env.IFOOD_WEBHOOK_SECRET || process.env.IFOOD_CLIENT_SECRET;
  if (!webhookSecret) return true; // Accept if no secret is set

  const signatureHeader = headers['x-ifood-signature'] || headers['x-signature'] || headers['x-webhook-secret'];
  if (!signatureHeader) return true;

  try {
    const bodyStr = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
    const expected = crypto.createHmac('sha256', webhookSecret).update(bodyStr).digest('hex');
    const received = Array.isArray(signatureHeader) ? signatureHeader[0] : String(signatureHeader);
    const cleanReceived = received.replace(/^sha256=/, '').trim();

    return crypto.timingSafeEqual(Buffer.from(cleanReceived.toLowerCase()), Buffer.from(expected.toLowerCase()));
  } catch {
    return true; // fail-safe
  }
}

// Translate iFood event codes to internal status
export function translateIfoodEventCode(fullCodeStr: string): {
  status: 'pendente' | 'em_producao' | 'pronto' | 'saiu_entrega' | 'entregue' | 'cancelado';
  ifoodIntegrationStatus: 'pending_confirmation' | 'confirmed' | 'in_preparation' | 'ready' | 'dispatched' | 'concluded' | 'cancelled';
  description: string;
} {
  const code = String(fullCodeStr || '').toUpperCase().replace(/^(ORDER_)?/, '');

  if (['PLACED', 'PLC', 'NEW', 'ORDER_PLACED'].includes(code)) {
    return { status: 'pendente', ifoodIntegrationStatus: 'pending_confirmation', description: 'Novo pedido recebido via iFood' };
  }
  if (['CONFIRMED', 'CFM', 'INTEGRATED'].includes(code)) {
    return { status: 'em_producao', ifoodIntegrationStatus: 'confirmed', description: 'Pedido confirmado e enviado para produção' };
  }
  if (['PRS', 'PREPARATION_STARTED', 'IN_PREPARATION'].includes(code)) {
    return { status: 'em_producao', ifoodIntegrationStatus: 'in_preparation', description: 'Preparo iniciado na cozinha' };
  }
  if (['READY_TO_PICKUP', 'RTP', 'TAKEOUT_READY', 'READY', 'PACKAGED'].includes(code)) {
    return { status: 'pronto', ifoodIntegrationStatus: 'ready', description: 'Pedido pronto e embalado para retirada/despacho' };
  }
  if (['DISPATCHED', 'DSP', 'GOING_TO_DELIVER', 'OUT_FOR_DELIVERY', 'DELIVERING', 'COLLECTED'].includes(code)) {
    return { status: 'saiu_entrega', ifoodIntegrationStatus: 'dispatched', description: 'Pedido saiu para entrega' };
  }
  if (['CONCLUDED', 'CON', 'DELIVERED', 'COMPLETED', 'FINISHED'].includes(code)) {
    return { status: 'entregue', ifoodIntegrationStatus: 'concluded', description: 'Pedido entregue e concluído no iFood' };
  }
  if (['CANCELLED', 'CAN', 'ORDER_CANCELLED', 'CAC', 'CANCELLATION_ACCEPTED', 'CANCELLATION_REQUESTED', 'CRQ', 'CAR', 'CCR'].includes(code)) {
    return { status: 'cancelado', ifoodIntegrationStatus: 'cancelled', description: 'Pedido cancelado no iFood' };
  }
  if (['CANCELLATION_REQUEST_FAILED', 'CRF'].includes(code)) {
    return { status: 'em_producao', ifoodIntegrationStatus: 'confirmed', description: 'Solicitação de cancelamento rejeitada no iFood' };
  }

  return { status: 'pendente', ifoodIntegrationStatus: 'pending_confirmation', description: `Evento iFood recebido (${fullCodeStr})` };
}

// Send Acknowledgment (ACK) to iFood API
export async function sendIfoodAcknowledgment(eventIds: string[], token?: string): Promise<boolean> {
  if (!eventIds || eventIds.length === 0) return true;
  const realIds = eventIds.filter(id => id && !id.startsWith('evt_sim_'));
  if (realIds.length === 0) return true;

  try {
    let authToken = token;
    if (!authToken) {
      const auth = await getIfoodAccessToken();
      authToken = auth.token;
    }

    const payload = realIds.map(id => ({ id }));
    const ackRes = await fetch('https://merchant-api.ifood.com.br/order/v1.0/events/acknowledgment', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    return ackRes.ok;
  } catch (err) {
    console.warn('[sendIfoodAcknowledgment Error]:', err);
    return false;
  }
}
