import { setCors, getBody, recordApiLog } from '../../_shared.ts';

export default async function handler(req: any, res: any) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const startTime = Date.now();
  const body = getBody(req);
  const clientSecretGiven = body.webhookSecret || req.headers['x-webhook-secret'];
  const expectedSecret = process.env.IFOOD_WEBHOOK_SECRET;

  let isSecured = false;
  if (expectedSecret && clientSecretGiven) {
    isSecured = clientSecretGiven === expectedSecret;
  } else if (!expectedSecret) {
    isSecured = true;
  }

  await recordApiLog({
    event_type: 'WEBHOOK_PING',
    status_code: 200,
    endpoint: '/api/ifood/webhook/ping',
    message: 'PING recebido e respondido pelo receptor Webhook do Saborê.'
  });

  return res.status(200).json({
    success: true,
    status: 'OK',
    httpStatus: 200,
    service: 'Saborê Confeitaria & Panificação - iFood Webhook Receiver',
    secured: isSecured,
    latencyMs: Math.max(1, Date.now() - startTime),
    message: 'PING recebido com sucesso! O receptor Webhook do Saborê está ONLINE e pronto para receber notificações do iFood.',
    timestamp: new Date().toISOString()
  });
}
