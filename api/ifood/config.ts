export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-ifood-signature, x-signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const clientId = process.env.IFOOD_CLIENT_ID || '';
  const clientSecret = process.env.IFOOD_CLIENT_SECRET || '';
  const merchantId = process.env.IFOOD_MERCHANT_ID || 'merch-sabore-sp-884920';
  const hasWebhookSecret = Boolean(process.env.IFOOD_WEBHOOK_SECRET);

  const hasConfiguredKeys = Boolean(clientId && clientSecret);

  return res.status(200).json({
    success: true,
    hasConfiguredKeys,
    clientId: clientId ? `${clientId.substring(0, 8)}...` : '',
    merchantId,
    maskedClientSecret: hasConfiguredKeys ? '••••••••••••••••••••' : '',
    hasWebhookSecret,
    webhookUrl: '/api/ifood/webhook',
    merchantName: 'Saborê Confeitaria & Panificação',
    status: hasConfiguredKeys ? 'ONLINE' : 'CONFIG_PENDING'
  });
}
