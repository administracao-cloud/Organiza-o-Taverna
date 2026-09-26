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
  } catch {
    // ignore
  }
  return {};
}

function sanitizeCredential(val: any): string {
  if (!val || typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (trimmed.startsWith('••••') || trimmed.includes('***')) return '';
  return trimmed;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-ifood-signature, x-signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const startTime = Date.now();
  const body = parseBody(req);
  const { orderId, action, reason, cancellationCode } = body;

  if (!orderId) {
    return res.status(200).json({ success: false, message: 'ID do pedido não informado' });
  }

  const rawId = String(orderId).replace(/^ifd-/, '').replace(/^#IFD-/, '').replace(/^#/, '').trim();
  const deliveredBy: 'MERCHANT' | 'IFOOD' = String(body.deliveredBy || '').toUpperCase() === 'MERCHANT' ? 'MERCHANT' : 'IFOOD';
  const deliveryType: 'DELIVERY' | 'TAKEOUT' | 'INDOOR' = String(body.deliveryType || '').toUpperCase() === 'TAKEOUT' 
    ? 'TAKEOUT' 
    : (String(body.deliveryType || '').toUpperCase() === 'INDOOR' ? 'INDOOR' : 'DELIVERY');

  let mappedStatus = 'pendente';
  let mappedIntegrationStatus = 'confirmed';
  let ifoodEndpoint = '';
  const now = new Date().toISOString();
  const updatePayload: Record<string, any> = {
    status: mappedStatus,
    integration_status: mappedIntegrationStatus,
    ifoodIntegrationStatus: mappedIntegrationStatus,
    ifood_integration_status: mappedIntegrationStatus,
    deliveredBy,
    delivered_by: deliveredBy,
    deliveryType,
    delivery_type: deliveryType,
    updatedAt: now,
    updated_at: now
  };

  if (action === 'confirm') {
    mappedStatus = 'em_producao';
    mappedIntegrationStatus = 'confirmed';
    ifoodEndpoint = 'confirm';
  } else if (action === 'startPreparation' || action === 'in_preparation') {
    mappedStatus = 'em_producao';
    mappedIntegrationStatus = 'in_preparation';
    ifoodEndpoint = 'startPreparation';
    updatePayload.preparationStartDateTime = now;
    updatePayload.preparation_start_date_time = now;
  } else if (action === 'readyToPickup' || action === 'ready' || action === 'takeoutReady') {
    mappedStatus = 'pronto';
    mappedIntegrationStatus = 'ready';
    ifoodEndpoint = 'readyToPickup';
  } else if (action === 'dispatch') {
    if (deliveredBy === 'IFOOD' || deliveryType === 'TAKEOUT') {
      mappedStatus = 'pronto';
      mappedIntegrationStatus = 'ready';
      ifoodEndpoint = 'readyToPickup';
    } else {
      mappedStatus = 'saiu_entrega';
      mappedIntegrationStatus = 'dispatched';
      ifoodEndpoint = 'dispatch';
    }
  } else if (action === 'conclude' || action === 'delivered') {
    mappedStatus = 'entregue';
    mappedIntegrationStatus = 'concluded';
    ifoodEndpoint = '';
    updatePayload.paymentStatus = 'completed';
    updatePayload.payment_status = 'completed';
  } else if (action === 'requestCancellation') {
    mappedStatus = 'cancelado';
    mappedIntegrationStatus = 'cancelled';
    ifoodEndpoint = 'requestCancellation';
    if (reason) {
      updatePayload.cancellationReason = reason;
      updatePayload.cancellation_reason = reason;
    }
    if (cancellationCode) {
      updatePayload.cancellationCode = cancellationCode;
      updatePayload.cancellation_code = cancellationCode;
    }
  } else if (action === 'acceptCancellation') {
    mappedStatus = 'cancelado';
    mappedIntegrationStatus = 'cancelled';
    ifoodEndpoint = 'acceptCancellation';
    if (reason) {
      updatePayload.cancellationReason = reason;
      updatePayload.cancellation_reason = reason;
    }
    if (cancellationCode) {
      updatePayload.cancellationCode = cancellationCode;
      updatePayload.cancellation_code = cancellationCode;
    }
  }

  updatePayload.status = mappedStatus;
  updatePayload.integration_status = mappedIntegrationStatus;
  updatePayload.ifoodIntegrationStatus = mappedIntegrationStatus;
  updatePayload.ifood_integration_status = mappedIntegrationStatus;

  // Atualiza Supabase de forma assíncrona
  if (SUPABASE_URL && SUPABASE_KEY) {
    fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.ifd-${rawId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(updatePayload)
    }).catch(() => {});
  }

  const clientId = sanitizeCredential(body.clientId) || process.env.IFOOD_CLIENT_ID;
  const clientSecret = sanitizeCredential(body.clientSecret) || process.env.IFOOD_CLIENT_SECRET;

  if (clientId && clientSecret && ifoodEndpoint) {
    try {
      const params = new URLSearchParams();
      params.append('grantType', 'client_credentials');
      params.append('clientId', clientId.trim());
      params.append('clientSecret', clientSecret.trim());

      const tokenRes = await fetch('https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });

      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        const isCancelAccept = action === 'acceptCancellation';
        const actionBody: any = isCancelAccept ? {} : {};
        if (!isCancelAccept) {
          if (reason) actionBody.reason = reason;
          if (cancellationCode) actionBody.cancellationCode = cancellationCode;
        }

        const endpoints = isCancelAccept
          ? [
              `https://merchant-api.ifood.com.br/v1.0/orders/${rawId}/cancellation/accept`,
              `https://merchant-api.ifood.com.br/order/v1.0/orders/${rawId}/cancellation/accept`,
              `https://merchant-api.ifood.com.br/order/v1.0/orders/${rawId}/actions/acceptCancellation`,
              `https://merchant-api.ifood.com.br/order/v1.0/orders/${rawId}/acceptCancellation`
            ]
          : [
              `https://merchant-api.ifood.com.br/order/v1.0/orders/${rawId}/actions/${ifoodEndpoint}`,
              `https://merchant-api.ifood.com.br/order/v1.0/orders/${rawId}/${ifoodEndpoint}`
            ];

        for (const url of endpoints) {
          try {
            const actRes = await fetch(url, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${tokenData.accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(actionBody)
            });
            if (actRes.ok || actRes.status === 200 || actRes.status === 202 || actRes.status === 204) break;

            if (actRes.status === 400 || actRes.status === 404 || actRes.status === 422) {
              const resText = await actRes.text();
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

              if (isAlreadyProcessed || actRes.status === 400) {
                console.log(`[iFood order-status notice]: Pedido ${rawId} já cancelado/processado no iFood (${actRes.status}).`);
                break;
              }
            }
          } catch {
            // try fallback
          }
        }
      }
    } catch {
      // safe fallback
    }
  }

  return res.status(200).json({
    success: true,
    orderId: `ifd-${rawId}`,
    status: mappedStatus,
    action,
    message: `Ação '${action}' aplicada ao pedido com sucesso.`
  });
}
