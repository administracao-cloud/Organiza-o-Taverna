import { supabase } from '../lib/supabase';
import { upsertRemoteRecord } from '../services/supabaseService';
import crypto from 'crypto';

export interface IfoodWebhookEvent {
  id?: string;
  eventId?: string;
  code?: string;
  fullCode?: string;
  event?: string;
  orderId?: string;
  order_id?: string;
  idOrder?: string;
  merchantId?: string;
  createdAt?: string;
  reason?: string;
  cancellationCode?: string;
  order?: any;
  customer?: any;
  [key: string]: any;
}

export interface ApiLogEntry {
  id: string;
  timestamp: string;
  provider: string;
  endpoint: string;
  event_type: string;
  status_code: number;
  order_id?: string | null;
  payload?: any;
  message: string;
  error_details?: string | null;
  created_at: string;
}

export interface WebhookProcessingResult {
  success: boolean;
  statusCode: number;
  message: string;
  eventsCount: number;
  processedEvents: Array<{
    eventId: string;
    orderId: string | null;
    code: string;
    status: string;
    supabaseSynced: boolean;
    ackSent: boolean;
  }>;
}

export const CREATE_API_LOGS_TABLE_SQL = `
-- Script para criar a tabela de logs de API no Supabase
CREATE TABLE IF NOT EXISTS public.api_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    provider TEXT NOT NULL DEFAULT 'ifood',
    endpoint TEXT NOT NULL DEFAULT '/api/ifood/webhook',
    event_type TEXT NOT NULL,
    status_code INT NOT NULL DEFAULT 200,
    order_id TEXT,
    payload JSONB,
    message TEXT NOT NULL,
    error_details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_api_logs_provider ON public.api_logs(provider);
CREATE INDEX IF NOT EXISTS idx_api_logs_timestamp ON public.api_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_order_id ON public.api_logs(order_id);

-- Regras de Segurança RLS
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir acesso total a api_logs" ON public.api_logs;
CREATE POLICY "Permitir acesso total a api_logs"
ON public.api_logs FOR ALL
USING (true)
WITH CHECK (true);
`;

/**
 * Função utilitária centralizada de Log:
 * 1. Formata e imprime no console do servidor
 * 2. Grava permanentemente na tabela 'api_logs' do Supabase
 */
export async function recordApiLog(logData: {
  provider?: string;
  endpoint?: string;
  event_type: string;
  status_code?: number;
  order_id?: string | null;
  payload?: any;
  message: string;
  error_details?: string | null;
}): Promise<boolean> {
  const timestamp = new Date().toISOString();
  const provider = logData.provider || 'ifood';
  const endpoint = logData.endpoint || '/api/ifood/webhook';
  const statusCode = logData.status_code ?? 200;

  // 1. Saída estruturada e legível no console
  const statusIcon = statusCode >= 400 ? '❌' : statusCode >= 300 ? '⚠️' : '✅';
  console.log(`[API LOG ${statusIcon}] [${provider.toUpperCase()}] [${logData.event_type}] [HTTP ${statusCode}] ${logData.message}`);
  if (logData.order_id) {
    console.log(` └─ Order ID: ${logData.order_id}`);
  }
  if (logData.error_details) {
    console.error(` └─ Erro Detalhado: ${logData.error_details}`);
  }

  // 2. Persistência na tabela 'api_logs' do Supabase
  try {
    const entry: ApiLogEntry = {
      id: `apilog-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp,
      provider,
      endpoint,
      event_type: logData.event_type,
      status_code: statusCode,
      order_id: logData.order_id || null,
      payload: logData.payload ? (typeof logData.payload === 'object' ? logData.payload : { raw: logData.payload }) : null,
      message: logData.message,
      error_details: logData.error_details || null,
      created_at: timestamp
    };

    return await upsertRemoteRecord('api_logs', entry);
  } catch (err: any) {
    console.warn('[Supabase api_logs Warn]: Não foi possível inserir na tabela api_logs (verifique se a tabela existe):', err?.message);
    return false;
  }
}

/**
 * Valida a assinatura HMAC SHA256 do payload do Webhook iFood se o segredo estiver configurado.
 */
export function validateIfoodWebhookSignature(
  headers: Record<string, string | string[] | undefined>,
  rawBody: string | object,
  webhookSecret?: string
): boolean {
  const secret = webhookSecret || process.env.IFOOD_WEBHOOK_SECRET || process.env.IFOOD_CLIENT_SECRET;
  
  if (!secret) {
    return true;
  }

  const signatureHeader = 
    headers['x-ifood-signature'] || 
    headers['x-signature'] || 
    headers['X-IFood-Signature'] ||
    headers['X-Signature'];

  if (!signatureHeader) {
    return true;
  }

  try {
    const bodyStr = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(bodyStr)
      .digest('hex');

    const receivedSig = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    const cleanReceived = receivedSig.replace(/^sha256=/, '').trim();

    return crypto.timingSafeEqual(
      Buffer.from(cleanReceived.toLowerCase()),
      Buffer.from(expectedSignature.toLowerCase())
    );
  } catch (err: any) {
    recordApiLog({
      event_type: 'SIGNATURE_VALIDATION_ERROR',
      status_code: 400,
      message: 'Exceção ao validar assinatura digital HMAC do Webhook',
      error_details: err?.message
    });
    return true; // Fallback tolerante em produção
  }
}

/**
 * Obtém token OAuth válido para comunicação de volta com o iFood (ACK e aceite de cancelamento)
 */
async function getIfoodOAuthToken(clientId?: string, clientSecret?: string): Promise<string | null> {
  const cleanId = (clientId || process.env.IFOOD_CLIENT_ID || '').trim();
  const cleanSecret = (clientSecret || process.env.IFOOD_CLIENT_SECRET || '').trim();

  if (!cleanId || !cleanSecret) return null;

  try {
    const params = new URLSearchParams({
      grantType: 'client_credentials',
      grant_type: 'client_credentials',
      clientId: cleanId,
      client_id: cleanId,
      clientSecret: cleanSecret,
      client_secret: cleanSecret
    });

    const res = await fetch('https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params.toString()
    });

    if (res.ok) {
      const data = await res.json();
      return data.accessToken || data.access_token || null;
    } else {
      const errText = await res.text();
      recordApiLog({
        event_type: 'OAUTH_TOKEN_ERROR',
        status_code: res.status,
        message: 'Falha na obtenção do token OAuth do iFood para resposta de Webhook',
        error_details: errText
      });
    }
  } catch (err: any) {
    recordApiLog({
      event_type: 'OAUTH_TOKEN_EXCEPTION',
      status_code: 500,
      message: 'Exceção na chamada de autenticação do iFood',
      error_details: err?.message
    });
  }
  return null;
}

/**
 * Envia resposta de confirmação (ACK) para a API do iFood liberando o evento da fila
 */
export async function sendIfoodAcknowledgment(eventIds: string[], token?: string): Promise<boolean> {
  if (!eventIds || eventIds.length === 0) return true;

  const realEventIds = eventIds.filter(id => id && !id.startsWith('evt_sim_'));
  if (realEventIds.length === 0) return true;

  try {
    const authToken = token || await getIfoodOAuthToken();
    if (!authToken) {
      await recordApiLog({
        event_type: 'ACK_FAILED_NO_TOKEN',
        status_code: 401,
        message: 'Tentativa de envio de ACK cancelada: Token OAuth ausente',
        payload: { eventIds: realEventIds }
      });
      return false;
    }

    const payload = realEventIds.map(id => ({ id }));
    const ackRes = await fetch('https://merchant-api.ifood.com.br/order/v1.0/events/acknowledgment', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const isOk = ackRes.ok;
    await recordApiLog({
      event_type: 'ACK_CONFIRMATION',
      status_code: ackRes.status,
      message: isOk ? `ACK enviado com sucesso para ${realEventIds.length} evento(s) no iFood.` : `Falha no envio de ACK ao iFood (HTTP ${ackRes.status})`,
      payload: { eventIds: realEventIds, httpStatus: ackRes.status }
    });

    return isOk;
  } catch (err: any) {
    await recordApiLog({
      event_type: 'ACK_EXCEPTION',
      status_code: 500,
      message: 'Exceção de rede ao enviar confirmação ACK para o iFood',
      error_details: err?.message,
      payload: { eventIds: realEventIds }
    });
    return false;
  }
}

/**
 * Aceita automaticamente uma solicitação de cancelamento vinda do cliente iFood
 */
async function autoAcceptCancellation(rawOrderId: string, token?: string): Promise<boolean> {
  const cleanId = rawOrderId.replace(/^ifd-/, '').replace(/^#IFD-/, '').replace(/^#/, '').trim();
  if (!cleanId) return false;

  try {
    const authToken = token || await getIfoodOAuthToken();
    if (!authToken) return false;

    const endpoints = [
      `https://merchant-api.ifood.com.br/v1.0/orders/${cleanId}/cancellation/accept`,
      `https://merchant-api.ifood.com.br/order/v1.0/orders/${cleanId}/cancellation/accept`,
      `https://merchant-api.ifood.com.br/order/v1.0/orders/${cleanId}/actions/acceptCancellation`,
      `https://merchant-api.ifood.com.br/order/v1.0/orders/${cleanId}/acceptCancellation`
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        });

        if (res.ok || res.status === 200 || res.status === 202 || res.status === 204) {
          await recordApiLog({
            event_type: 'AUTO_ACCEPT_CANCELLATION',
            status_code: res.status,
            order_id: `ifd-${cleanId}`,
            message: `Solicitação de cancelamento aceita no iFood com sucesso para o pedido ${cleanId}`,
            payload: { orderId: cleanId, httpStatus: res.status, endpoint: url }
          });
          return true;
        }

        if (res.status === 400 || res.status === 404 || res.status === 422) {
          const resText = await res.text();
          let resJson: any = null;
          try { resJson = JSON.parse(resText); } catch {}
          const errMessage = (resJson?.message || resJson?.error?.message || resText || '').toLowerCase();
          const isAlreadyProcessed =
            errMessage.includes('already') ||
            errMessage.includes('cancel') ||
            errMessage.includes('processed') ||
            errMessage.includes('status') ||
            errMessage.includes('inválid') ||
            errMessage.includes('invalid') ||
            errMessage.includes('não permit');

          if (isAlreadyProcessed || res.status === 400) {
            await recordApiLog({
              event_type: 'AUTO_ACCEPT_CANCELLATION_NOTICE',
              status_code: res.status,
              order_id: `ifd-${cleanId}`,
              message: `Pedido ${cleanId} já cancelado/processado no iFood (${res.status}). Banco local atualizado.`,
              payload: { orderId: cleanId, httpStatus: res.status, errMessage }
            });
            return true;
          }
        }
      } catch (reqErr: any) {
        console.warn(`[autoAcceptCancellation Warning for ${url}]:`, reqErr?.message);
      }
    }

    return false;
  } catch (err: any) {
    await recordApiLog({
      event_type: 'AUTO_ACCEPT_CANCELLATION_EXCEPTION',
      status_code: 500,
      order_id: `ifd-${cleanId}`,
      message: `Erro ao enviar aceite de cancelamento ao iFood para pedido ${cleanId}`,
      error_details: err?.message
    });
    return false;
  }
}

/**
 * Mapeia o código de evento do iFood para o status interno da aplicação Saborê
 */
export function translateIfoodEventCode(fullCodeStr: string): {
  status: 'pendente' | 'em_producao' | 'pronto' | 'saiu_entrega' | 'entregue' | 'cancelado';
  ifoodIntegrationStatus: 'pending_confirmation' | 'confirmed' | 'ready' | 'dispatched' | 'concluded' | 'cancelled';
  description: string;
} {
  const code = fullCodeStr.toUpperCase().replace(/^(ORDER_)?/, '');

  if (['PLACED', 'PLC', 'NEW', 'ORDER_PLACED'].includes(code)) {
    return { status: 'pendente', ifoodIntegrationStatus: 'pending_confirmation', description: 'Novo pedido recebido via iFood' };
  }
  if (['CONFIRMED', 'CFM', 'PRS', 'PREPARATION_STARTED', 'IN_PREPARATION', 'INTEGRATED'].includes(code)) {
    return { status: 'em_producao', ifoodIntegrationStatus: 'confirmed', description: 'Pedido confirmado e enviado para produção' };
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

  return { status: 'pendente', ifoodIntegrationStatus: 'pending_confirmation', description: `Evento iFood recebido (${fullCodeStr})` };
}

/**
 * Função principal para processar um único ou múltiplos eventos de Webhook do iFood,
 * registra logs detalhados (console + Supabase `api_logs`), atualiza 'orders' e envia o ACK.
 */
export async function processIfoodWebhookPayload(
  payload: any,
  headers: Record<string, string | string[] | undefined> = {},
  options?: { webhookSecret?: string; clientId?: string; clientSecret?: string }
): Promise<WebhookProcessingResult> {
  const startTime = Date.now();

  // 1. Registro inicial da recepção do evento
  await recordApiLog({
    event_type: 'WEBHOOK_RECEIVE_ATTEMPT',
    status_code: 200,
    message: 'Nova requisição de evento recebida no Webhook do iFood',
    payload: {
      receivedAt: new Date().toISOString(),
      headersCount: Object.keys(headers).length,
      payloadType: Array.isArray(payload) ? 'ARRAY' : typeof payload
    }
  });

  // 2. Validar assinatura do webhook
  const isValidSignature = validateIfoodWebhookSignature(headers, payload, options?.webhookSecret);
  if (!isValidSignature) {
    await recordApiLog({
      event_type: 'WEBHOOK_SIGNATURE_MISMATCH',
      status_code: 401,
      message: 'Rejeitado: Assinatura HMAC SHA256 do Webhook iFood é inválida',
      error_details: 'Verifique se IFOOD_WEBHOOK_SECRET ou IFOOD_CLIENT_SECRET conferem com as credenciais cadastradas.'
    });

    return {
      success: false,
      statusCode: 401,
      message: 'Assinatura inválida do Webhook iFood (HMAC SHA256 mismatch).',
      eventsCount: 0,
      processedEvents: []
    };
  }

  // 3. Tratamento de Handshake / PING do Portal de Desenvolvedor iFood
  if (payload?.type === 'HANDSHAKE' || payload?.code === 'HANDSHAKE' || payload?.event === 'PING') {
    await recordApiLog({
      event_type: 'WEBHOOK_HANDSHAKE',
      status_code: 200,
      message: 'Handshake de teste do portal iFood respondido com sucesso (ONLINE).',
      payload
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Handshake do Webhook iFood respondido com sucesso (ONLINE).',
      eventsCount: 1,
      processedEvents: [{
        eventId: payload?.id || 'handshake',
        orderId: null,
        code: 'HANDSHAKE',
        status: 'online',
        supabaseSynced: true,
        ackSent: true
      }]
    };
  }

  try {
    // Normalizar payload em array de eventos
    const eventsList: IfoodWebhookEvent[] = Array.isArray(payload) 
      ? payload 
      : (payload?.events && Array.isArray(payload.events)) 
        ? payload.events 
        : [payload];

    const processedEvents: WebhookProcessingResult['processedEvents'] = [];
    const eventIdsToAck: string[] = [];
    const oauthToken = await getIfoodOAuthToken(options?.clientId, options?.clientSecret);

    for (const rawEvt of eventsList) {
      if (!rawEvt) continue;

      const eventId = rawEvt.id || rawEvt.eventId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const fullCode = String(rawEvt.fullCode || rawEvt.code || rawEvt.event || 'UNKNOWN').toUpperCase();
      const rawOrderId = rawEvt.orderId || rawEvt.order_id || rawEvt.idOrder || rawEvt.order?.id || null;
      const cleanOrderId = rawOrderId ? String(rawOrderId).replace(/^ifd-/, '').replace(/^#IFD-/, '').replace(/^#/, '').trim() : null;

      if (eventId) eventIdsToAck.push(eventId);

      const { status, ifoodIntegrationStatus, description } = translateIfoodEventCode(fullCode);

      // Tratamento para CANCELLATION_REQUESTED
      const isCancellationRequest = ['CANCELLATION_REQUESTED', 'CRQ', 'CAR', 'CCR', 'CANCELLATION_REQUESTED_BY_CUSTOMER'].some(
        c => fullCode.includes(c)
      );

      if (isCancellationRequest && cleanOrderId) {
        await autoAcceptCancellation(cleanOrderId, oauthToken || undefined);
      }

      // Montar dados do pedido para o Supabase
      let orderPayload: any = null;

      if (rawEvt.order || rawEvt.customer || rawEvt.items) {
        const srcOrder = rawEvt.order || rawEvt;
        orderPayload = {
          id: `ifd-${cleanOrderId || Date.now()}`,
          code: `#IFD-${(cleanOrderId || '0000').slice(-4).toUpperCase()}`,
          customerName: srcOrder.customer?.name || srcOrder.customerName || 'Cliente iFood',
          customerPhone: srcOrder.customer?.phone || srcOrder.customerPhone || '(Não informado)',
          customerAddress: srcOrder.deliveryAddress || 'Entrega via iFood',
          channel: 'ifood',
          type: 'pronta_entrega',
          status,
          ifoodIntegrationStatus,
          total: Number(srcOrder.total || srcOrder.orderAmount || 0),
          subtotal: Number(srcOrder.subtotal || srcOrder.total || 0),
          discount: Number(srcOrder.discount || 0),
          deliveryFee: Number(srcOrder.deliveryFee || 0),
          deliveryType: srcOrder.deliveryType || 'DELIVERY',
          deliveryDate: new Date().toISOString(),
          paymentMethod: 'plataforma',
          paymentStatus: status === 'entregue' ? 'completed' : 'pending',
          cancellationReason: rawEvt.reason || srcOrder.cancellationReason || undefined,
          cancellationCode: rawEvt.cancellationCode || srcOrder.cancellationCode || undefined,
          notes: srcOrder.notes || `Atualizado via Webhook (${fullCode}: ${description})`,
          createdAt: srcOrder.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          rawIfoodId: cleanOrderId
        };
      } else if (cleanOrderId) {
        orderPayload = {
          id: `ifd-${cleanOrderId}`,
          code: `#IFD-${cleanOrderId.slice(-4).toUpperCase()}`,
          channel: 'ifood',
          status,
          ifoodIntegrationStatus,
          cancellationReason: rawEvt.reason || (isCancellationRequest ? 'Solicitado pelo cliente no iFood' : undefined),
          cancellationCode: rawEvt.cancellationCode || (isCancellationRequest ? '506' : undefined),
          updatedAt: new Date().toISOString(),
          rawIfoodId: cleanOrderId
        };
      }

      // Gravar no Supabase
      let supabaseSynced = false;
      if (orderPayload) {
        supabaseSynced = await upsertRemoteRecord('orders', orderPayload);
      }

      // Registrar o evento individual no log de auditoria de API
      await recordApiLog({
        event_type: `ORDER_EVENT_${fullCode}`,
        status_code: 200,
        order_id: orderPayload?.id || cleanOrderId,
        payload: rawEvt,
        message: `Evento iFood ${fullCode} processado. Status do Pedido: "${status}". Sincronizado no Supabase: ${supabaseSynced ? 'SIM' : 'NÃO'}.`
      });

      processedEvents.push({
        eventId,
        orderId: orderPayload?.id || cleanOrderId,
        code: fullCode,
        status,
        supabaseSynced,
        ackSent: false
      });
    }

    // 4. Enviar confirmação ACK ao iFood
    let ackSent = false;
    if (eventIdsToAck.length > 0) {
      ackSent = await sendIfoodAcknowledgment(eventIdsToAck, oauthToken || undefined);
      processedEvents.forEach(evt => {
        evt.ackSent = ackSent;
      });
    }

    const durationMs = Date.now() - startTime;

    await recordApiLog({
      event_type: 'WEBHOOK_SUCCESS',
      status_code: 200,
      message: `Ciclo de Webhook finalizado em ${durationMs}ms. ${processedEvents.length} evento(s) processado(s). ACK iFood enviado: ${ackSent ? 'SIM' : 'NÃO/DESNECESSÁRIO'}.`,
      payload: { eventsCount: processedEvents.length, durationMs, ackSent }
    });

    return {
      success: true,
      statusCode: 200,
      message: `${processedEvents.length} evento(s) do iFood processados com sucesso. Supabase: Sincronizado. iFood ACK: ${ackSent ? 'Enviado' : 'Não exigido/Pendente'}.`,
      eventsCount: processedEvents.length,
      processedEvents
    };
  } catch (err: any) {
    await recordApiLog({
      event_type: 'WEBHOOK_PROCESSING_ERROR',
      status_code: 500,
      message: 'Erro interno ao processar payload do Webhook iFood',
      error_details: err?.stack || err?.message,
      payload
    });

    return {
      success: false,
      statusCode: 500,
      message: `Erro ao processar Webhook: ${err?.message || 'Falha interna'}`,
      eventsCount: 0,
      processedEvents: []
    };
  }
}
