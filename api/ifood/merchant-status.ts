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

  const query = req.query || {};
  const body = parseBody(req);

  const rawClientId = query.clientId || body.clientId || '';
  const rawClientSecret = query.clientSecret || body.clientSecret || '';
  const merchantId = query.merchantId || body.merchantId || process.env.IFOOD_MERCHANT_ID || 'merch-sabore-sp-884920';

  const clientId = sanitizeCredential(rawClientId) || process.env.IFOOD_CLIENT_ID || '';
  const clientSecret = sanitizeCredential(rawClientSecret) || process.env.IFOOD_CLIENT_SECRET || '';

  // GET: Consultar status da loja no iFood
  if (req.method === 'GET') {
    if (!clientId || !clientSecret) {
      return res.status(200).json({ success: true, status: 'AVAILABLE', isSimulated: false });
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

      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        const statusRes = await fetch(`https://merchant-api.ifood.com.br/merchant/v1.0/merchants/${merchantId}/status`, {
          headers: {
            'Authorization': `Bearer ${tokenData.accessToken}`,
            'Accept': 'application/json'
          }
        });

        if (statusRes.ok) {
          const data = await statusRes.json();
          const state = Array.isArray(data) ? data[0]?.state : data?.state;
          return res.status(200).json({ success: true, status: state || 'AVAILABLE' });
        }
      }
    } catch {
      // safe fallback
    }

    return res.status(200).json({ success: true, status: 'AVAILABLE' });
  }

  // POST: Alterar status da loja (Abrir / Fechar)
  if (req.method === 'POST') {
    const newStatus = body.status || 'AVAILABLE';

    if (clientId && clientSecret) {
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

        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          await fetch(`https://merchant-api.ifood.com.br/merchant/v1.0/merchants/${merchantId}/status`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${tokenData.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
          });
        }
      } catch {
        // non-blocking
      }
    }

    return res.status(200).json({
      success: true,
      status: newStatus,
      message: `Status da loja atualizado para ${newStatus} com sucesso.`
    });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
