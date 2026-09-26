import { setCors, getBody } from './_shared.ts';
import { GoogleGenAI, Type } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || ''
    });
  }
  return geminiClient;
}

export default async function handler(req: any, res: any) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = getBody(req);
    const { action, topic, targetAudience, currentMonth, bakeryName } = body;

    const systemInstruction = `Você é um Especialista Sênior em Marketing Digital para Confeitarias e Padarias Artesanais no Brasil.
Seu papel é criar estratégias altamente rentáveis, posts persuasivos para Instagram/TikTok/WhatsApp, campanhas promocionais com cupons, e indicar os melhores horários de publicação baseados em hábitos de consumo de doces e pães.
Retorne SEMPRE a resposta em formato JSON estruturado respeitando o schema fornecido.
Nome da confeitaria: ${bakeryName || 'Confeitaria Artesanal'}`;

    const prompt = `Ação solicitada: ${action || 'sugestoes_completas'}.
Tópico/Foco: ${topic || 'Lançamento de produto de confeitaria ou promoção da semana'}.
Público Alvo: ${targetAudience || 'Clientes locais e público do delivery (iFood/WhatsApp)'}.
Mês/Época Atual: ${currentMonth || 'Geral'}.

Gere ideias criativas e acionáveis com legenda chamativa, hashtags estratégicas, sugestão de fotos/vídeos (Reels), melhores horários para postar (ex: 11:30 para almoço, 15:30 para café da tarde), sugestão de cupom de desconto e justificativa de marketing.`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Título descritivo da sugestão' },
            bestHours: { type: Type.STRING, description: 'Melhores horários sugeridos para publicar' },
            idealChannel: { type: Type.STRING, description: 'Canal ideal (Instagram, TikTok, WhatsApp, iFood)' },
            postCaption: { type: Type.STRING, description: 'Legenda completa do post pronta para copiar' },
            hashtags: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Hashtags sugeridas' },
            mediaIdea: { type: Type.STRING, description: 'Sugestão visual do Reels/Vídeo ou Foto' },
            campaignIdea: { type: Type.STRING, description: 'Ideia de campanha promocional' },
            suggestedCoupon: { type: Type.STRING, description: 'Sugestão de código de cupom' },
            discountPercentage: { type: Type.NUMBER, description: 'Desconto sugerido em %' },
            marketingInsight: { type: Type.STRING, description: 'Dica de psicologia de vendas' },
          },
          required: ['title', 'bestHours', 'idealChannel', 'postCaption', 'hashtags', 'mediaIdea', 'campaignIdea', 'suggestedCoupon']
        }
      }
    });

    const resultText = response.text || '{}';
    const data = JSON.parse(resultText);

    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('Erro na rota Gemini Marketing AI:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Falha ao gerar sugestões de marketing pela IA.'
    });
  }
}
