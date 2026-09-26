import { setCors } from './_shared.ts';

export default async function handler(req: any, res: any) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    success: true,
    status: 'ONLINE',
    service: 'Saborê Confeitaria & Panificação - Serverless API Gateway',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/ifood/webhook',
      '/api/ifood/webhook/ping',
      '/api/ifood/test-connection',
      '/api/ifood/config',
      '/api/ifood/order-status',
      '/api/ifood/merchant-status',
      '/api/ifood/orders',
      '/api/marketing-ai'
    ]
  });
}
