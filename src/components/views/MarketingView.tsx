import React, { useState } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { MarketingCampaign, SocialPost } from '../../types';
import { 
  Megaphone, 
  Plus, 
  TrendingUp, 
  Tag, 
  Calendar, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  Sparkles,
  Award,
  Zap,
  Share2,
  Clock,
  Copy,
  Check,
  Bot,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { CampaignModal } from '../modals/CampaignModal';
import { SocialPostModal } from '../modals/SocialPostModal';

export const MarketingView: React.FC = () => {
  const { 
    campaigns, 
    marketingCampaigns, 
    deleteCampaign, 
    socialPosts = [], 
    deleteSocialPost
  } = useBakery();
  
  const campaignList = campaigns || marketingCampaigns || [];

  const [activeTab, setActiveTab] = useState<'campaigns' | 'social_posts' | 'ai_assistant'>('social_posts');
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [campaignToEdit, setCampaignToEdit] = useState<MarketingCampaign | null>(null);

  const [isSocialModalOpen, setIsSocialModalOpen] = useState(false);
  const [postToEdit, setPostToEdit] = useState<SocialPost | null>(null);
  const [initialPostData, setInitialPostData] = useState<Partial<SocialPost> | null>(null);

  // AI Assistant States
  const [aiTopic, setAiTopic] = useState('Bolo de Aniversário Especial e Combos para Fim de Semana');
  const [aiFocus, setAiFocus] = useState<'posts' | 'hours' | 'campaigns' | 'coupons'>('posts');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [copiedCaption, setCopiedCaption] = useState(false);

  const totalBudget = campaignList.reduce((a, b) => a + (b.budget || 0), 0);
  const totalRevenue = campaignList.reduce((a, b) => a + (b.revenueGenerated || 0), 0);
  const totalOrders = campaignList.reduce((a, b) => a + (b.ordersCount || 0), 0);
  const overallRoi = totalBudget > 0 ? (((totalRevenue - totalBudget) / totalBudget) * 100).toFixed(1) : '0';

  const handleOpenNewCampaign = () => {
    setCampaignToEdit(null);
    setIsCampaignModalOpen(true);
  };

  const handleEditCampaign = (c: MarketingCampaign) => {
    setCampaignToEdit(c);
    setIsCampaignModalOpen(true);
  };

  const handleDeleteCampaign = (id: string, title: string) => {
    if (confirm(`Excluir campanha "${title}"?`)) {
      deleteCampaign(id);
    }
  };

  const handleOpenNewPost = () => {
    setPostToEdit(null);
    setInitialPostData(null);
    setIsSocialModalOpen(true);
  };

  const handleEditPost = (p: SocialPost) => {
    setPostToEdit(p);
    setInitialPostData(null);
    setIsSocialModalOpen(true);
  };

  const handleDeletePost = (id: string, title: string) => {
    if (confirm(`Excluir post "${title}"?`)) {
      deleteSocialPost(id);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  // Trigger Gemini API Server-Side Request
  const handleGenerateAi = async (overrideTopic?: string) => {
    setIsAiLoading(true);
    setAiResult(null);

    const topicToUse = overrideTopic || aiTopic;

    try {
      const res = await fetch('/api/marketing-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: aiFocus,
          topic: topicToUse,
          bakeryName: 'Saborê Confeitaria & Panificação Artesanal'
        })
      });

      const json = await res.json();
      if (json.success) {
        setAiResult(json.data);
      } else {
        alert(json.error || 'Erro ao gerar sugestões com a IA.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Falha na comunicação com o assistente de IA.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleUseAiInPost = () => {
    if (!aiResult) return;
    setPostToEdit(null);
    setInitialPostData({
      title: aiResult.title || 'Post Sugerido pela IA',
      caption: aiResult.postCaption || '',
      platforms: ['instagram', 'whatsapp'],
      scheduledTime: aiResult.bestHours ? aiResult.bestHours.split(' ')[0] : '15:00',
      suggestedHashtags: aiResult.hashtags || [],
      promotionalCoupon: aiResult.suggestedCoupon || '',
      mediaNotes: aiResult.mediaIdea || ''
    });
    setIsSocialModalOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E8DFD5]">
        <div>
          <h2 className="font-serif-brand text-2xl font-bold text-[#352527] dark:text-[#FFFFFF] flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-[#B86B77]" />
            <span>Controle de Marketing & Redes Sociais</span>
          </h2>
          <p className="text-xs text-[#7A6466]">
            Gestão de posts para redes sociais, campanhas no iFood/Instagram e Assistente Inteligente de Conteúdo
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'social_posts' ? (
            <button
              onClick={handleOpenNewPost}
              className="px-4 py-2 rounded-xl bg-[#B86B77] hover:bg-[#9E5460] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Agendar Post</span>
            </button>
          ) : (
            <button
              onClick={handleOpenNewCampaign}
              className="px-4 py-2 rounded-xl bg-[#B86B77] hover:bg-[#9E5460] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Campanha</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E0D5C8] space-x-6 text-sm font-semibold text-[#6B5557]">
        <button
          onClick={() => setActiveTab('social_posts')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'social_posts'
              ? 'border-[#B86B77] text-[#B86B77]'
              : 'border-transparent text-[#7A6466] hover:text-[#352527] dark:hover:text-[#FFFFFF] dark:text-[#FFFFFF]'
          }`}
        >
          <Share2 className="w-4 h-4" />
          <span>Posts em Redes Sociais ({socialPosts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ai_assistant')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer relative ${
            activeTab === 'ai_assistant'
              ? 'border-[#B86B77] text-[#B86B77]'
              : 'border-transparent text-[#7A6466] hover:text-[#352527] dark:hover:text-[#FFFFFF] dark:text-[#FFFFFF]'
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#B86B77]" />
          <span>Assistente de IA & Ideias</span>
          <span className="px-1.5 py-0.2 bg-[#B86B77] text-white rounded-full text-[10px] font-bold">
            Gemini
          </span>
        </button>

        <button
          onClick={() => setActiveTab('campaigns')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'campaigns'
              ? 'border-[#B86B77] text-[#B86B77]'
              : 'border-transparent text-[#7A6466] hover:text-[#352527] dark:hover:text-[#FFFFFF] dark:text-[#FFFFFF]'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Campanhas e Cupons ({campaignList.length})</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Social Posts */}
        <div className="p-4 bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#EBE1D7] dark:border-[#3F4147] shadow-2xs space-y-1">
          <div className="text-xs font-semibold text-[#7A6466] dark:text-[#B5BAC1]">Posts Programados</div>
          <div className="font-serif-brand text-2xl font-bold text-[#352527] dark:text-[#FFFFFF]">
            {socialPosts.filter(p => p.status === 'agendado').length} posts
          </div>
          <div className="text-[11px] text-[#7A6466] dark:text-[#B5BAC1]">Instagram, TikTok e WhatsApp</div>
        </div>

        {/* Total Budget */}
        <div className="p-4 bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#EBE1D7] dark:border-[#3F4147] shadow-2xs space-y-1">
          <div className="text-xs font-semibold text-[#7A6466] dark:text-[#B5BAC1]">Orçamento em Campanhas</div>
          <div className="font-serif-brand text-2xl font-bold text-[#352527] dark:text-[#FFFFFF]">
            R$ {(totalBudget || 0).toFixed(2)}
          </div>
          <div className="text-[11px] text-[#7A6466] dark:text-[#B5BAC1]">Investido em mídia e cupons</div>
        </div>

        {/* Generated Revenue */}
        <div className="p-4 bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#EBE1D7] dark:border-[#3F4147] shadow-2xs space-y-1">
          <div className="text-xs font-semibold text-[#7A6466] dark:text-[#B5BAC1]">Receita de Vendas</div>
          <div className="font-serif-brand text-2xl font-bold text-emerald-800 dark:text-emerald-500">
            R$ {(totalRevenue || 0).toFixed(2)}
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
            Atribuída por cupons/redes sociais
          </div>
        </div>

        {/* ROI */}
        <div className="p-4 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-2xl border border-[#DBCDC0] dark:border-[#3F4147] shadow-2xs space-y-1">
          <div className="text-xs font-semibold text-[#553E41] dark:text-[#B5BAC1] flex items-center justify-between">
            <span>ROI Geral de Marketing</span>
            <TrendingUp className="w-4 h-4 text-[#B86B77]" />
          </div>
          <div className="font-serif-brand text-2xl font-bold text-[#B86B77]">
            {overallRoi}%
          </div>
          <div className="text-[11px] text-[#7A6466] dark:text-[#B5BAC1]">Retorno direto sobre investido</div>
        </div>

      </div>

      {/* TAB 1: SOCIAL POSTS CONTROL */}
      {activeTab === 'social_posts' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF7F2] dark:bg-[#1E1F22] p-4 rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147]">
            <div className="space-y-0.5">
              <h3 className="font-serif-brand text-base font-bold text-[#352527] dark:text-[#FFFFFF]">
                Calendário e Controle de Publicações
              </h3>
              <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1]">
                Planeje e acompanhe os conteúdos das suas redes sociais para atrair mais clientes para a confeitaria
              </p>
            </div>
            <button
              onClick={handleOpenNewPost}
              className="px-4 py-2 bg-[#B86B77] hover:bg-[#9E5460] text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Anotar / Agendar Novo Post</span>
            </button>
          </div>

          {socialPosts.length === 0 ? (
            <div className="bg-white dark:bg-[#2B2D31] p-8 rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] text-center space-y-3">
              <Share2 className="w-8 h-8 text-[#B86B77] mx-auto" />
              <h3 className="font-serif-brand text-base font-bold text-[#352527] dark:text-[#FFFFFF]">Nenhum Post Anotado</h3>
              <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1] max-w-md mx-auto">
                Clique no botão acima ou use o Assistente de IA para sugerir posts com fotos, legendas e hashtags prontas para postar.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {socialPosts.map(post => {
                const isPublished = post.status === 'publicado';
                const isScheduled = post.status === 'agendado';

                return (
                  <div key={post.id} className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] shadow-2xs overflow-hidden flex flex-col justify-between p-4 space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {post.platforms.map(plat => (
                            <span key={plat} className="px-2 py-0.5 bg-stone-100 dark:bg-[#1E1F22] text-stone-700 dark:text-[#B5BAC1] rounded-md text-[10px] font-bold capitalize">
                              {plat === 'instagram' ? '📷 Instagram' :
                               plat === 'tiktok' ? '🎵 TikTok' :
                               plat === 'whatsapp' ? '💬 WhatsApp' : '👥 Facebook'}
                            </span>
                          ))}
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isPublished ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' :
                          isScheduled ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400' :
                          'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                        }`}>
                          {post.status.toUpperCase()}
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-[#352527] dark:text-[#FFFFFF] leading-snug">{post.title}</h4>

                      <div className="flex items-center gap-3 text-[11px] text-[#7A6466] dark:text-[#B5BAC1]">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-[#B86B77]" />
                          {new Date(post.scheduledDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-[#B86B77]" />
                          {post.scheduledTime}
                        </span>
                      </div>

                      <div className="bg-[#FAF7F2] dark:bg-[#1E1F22] p-3 rounded-xl border border-[#E8DFD5] dark:border-[#3F4147] text-xs text-[#553E41] dark:text-[#FFFFFF] leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {post.caption}
                      </div>

                      {post.mediaNotes && (
                        <div className="text-[11px] text-[#8C7678] dark:text-[#B5BAC1] italic bg-stone-50 dark:bg-[#2B2D31] p-2 rounded-lg border border-stone-200 dark:border-[#3F4147]">
                          💡 Vídeo/Foto: {post.mediaNotes}
                        </div>
                      )}

                      {post.promotionalCoupon && (
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-[#7A6466] dark:text-[#B5BAC1]">Cupom:</span>
                          <span className="font-mono font-bold text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/50 text-[11px]">
                            {post.promotionalCoupon}
                          </span>
                        </div>
                      )}

                      {post.suggestedHashtags && post.suggestedHashtags.length > 0 && (
                        <div className="text-[10px] text-[#B86B77] font-mono leading-normal">
                          {post.suggestedHashtags.join(' ')}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[#F0E8DF] dark:border-[#3F4147] flex items-center justify-between">
                      <button
                        onClick={() => handleCopyText(`${post.caption}\n\n${(post.suggestedHashtags || []).join(' ')}`)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-[#B86B77] bg-[#FAF0F2] dark:bg-[#1E1F22] hover:bg-[#B86B77] hover:text-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copiar Legenda</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditPost(post)}
                          className="p-1.5 text-stone-400 dark:text-[#B5BAC1] hover:text-[#B86B77] hover:bg-[#FAF0F2] dark:hover:bg-[#382B2E] rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id, post.title)}
                          className="p-1.5 text-stone-400 dark:text-[#B5BAC1] hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GEMINI AI MARKETING ASSISTANT */}
      {activeTab === 'ai_assistant' && (
        <div className="space-y-6">
          
          {/* AI Generator Box */}
          <div className="bg-gradient-to-br from-[#FAF5F0] via-white to-[#FAF0F2] dark:from-[#2B2D31] dark:via-[#2B2D31] dark:to-[#1E1F22] rounded-2xl border border-[#E8D5D8] dark:border-[#3F4147] p-5 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#B86B77]/10 dark:bg-white/10 text-[#B86B77] dark:text-stone-300 rounded-full text-xs font-bold">
                  <Bot className="w-4 h-4" />
                  <span>Assistente Virtual Especialista em Confeitaria (Gemini AI)</span>
                </div>
                <h3 className="font-serif-brand text-xl font-bold text-[#352527] dark:text-[#FFFFFF]">
                  Gerador de Sugestões de Marketing & Vendas
                </h3>
                <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1]">
                  A IA analisa seu produto e cria legendas prontas, sugere os melhores horários de publicação, ideias de vídeos (Reels/TikTok) e estratégias de cupons.
                </p>
              </div>
            </div>

            {/* Form controls */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="font-bold text-xs text-[#352527] dark:text-[#FFFFFF] block mb-1">Qual produto, promoção ou tema deseja divulgar?</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={e => setAiTopic(e.target.value)}
                    placeholder="Ex: Bolo Vulcão Ninho com Nutella, Festival de Croissants..."
                    className="flex-1 p-2.5 rounded-xl border border-[#DACDC0] bg-white text-xs font-medium text-[#352527] dark:text-[#FFFFFF]"
                  />
                  <button
                    onClick={() => handleGenerateAi()}
                    disabled={isAiLoading}
                    className="px-5 py-2.5 rounded-xl bg-[#B86B77] hover:bg-[#9E5460] text-white font-bold text-xs shadow-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isAiLoading ? 'Gerando com IA...' : 'Gerar com IA'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Prompt Ideas */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[#8C7678] font-bold text-[11px]">Sugestões rápidas:</span>
                {[
                  'Bolo Vulcão Ninho com Nutella',
                  'Combo Café + Croissant para Fim de Tarde',
                  'Cupom de Boas-Vindas no WhatsApp',
                  'Pães de Fermentação Natural para Sábado'
                ].map(idea => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => {
                      setAiTopic(idea);
                      handleGenerateAi(idea);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white border border-[#E0D5C8] text-[#553E41] text-[11px] font-medium hover:border-[#B86B77] hover:text-[#B86B77] transition-colors cursor-pointer"
                  >
                    💡 {idea}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* AI Result Card */}
          {aiResult && (
            <div className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] shadow-md p-6 space-y-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8DFD5] dark:border-[#3F4147]">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#B86B77]">
                    Sugestão Estratégica
                  </span>
                  <h3 className="font-serif-brand text-lg font-bold text-[#352527] dark:text-[#FFFFFF]">
                    {aiResult.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleUseAiInPost}
                    className="px-4 py-2 bg-[#B86B77] hover:bg-[#9E5460] text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Usar no Gerenciador de Posts</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Post Caption Box */}
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-xs text-[#352527] dark:text-[#FFFFFF]">Legenda Pronta para Copiar</label>
                    <button
                      onClick={() => handleCopyText(`${aiResult.postCaption}\n\n${(aiResult.hashtags || []).join(' ')}`)}
                      className="text-xs text-[#B86B77] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      {copiedCaption ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCaption ? 'Copiado!' : 'Copiar Texto'}</span>
                    </button>
                  </div>

                  <div className="p-4 bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-xl border border-[#E8DFD5] dark:border-[#3F4147] text-xs text-[#352527] dark:text-[#FFFFFF] leading-relaxed whitespace-pre-wrap font-sans">
                    {aiResult.postCaption}
                  </div>

                  {aiResult.hashtags && (
                    <div className="text-xs text-[#B86B77] font-mono leading-normal pt-1">
                      {aiResult.hashtags.join(' ')}
                    </div>
                  )}
                </div>

                {/* Additional Insights */}
                <div className="space-y-3">
                  
                  {/* Best Posting Hours */}
                  <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 space-y-1">
                    <div className="font-bold text-xs flex items-center gap-1 text-amber-800 dark:text-amber-400">
                      <Clock className="w-4 h-4" />
                      <span>Melhores Horários</span>
                    </div>
                    <div className="text-xs font-semibold">{aiResult.bestHours}</div>
                  </div>

                  {/* Media Idea */}
                  <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800/40 text-blue-900 dark:text-blue-200 space-y-1">
                    <div className="font-bold text-xs flex items-center gap-1 text-blue-800 dark:text-blue-400">
                      <Lightbulb className="w-4 h-4" />
                      <span>Sugestão Visual / Reels</span>
                    </div>
                    <div className="text-xs">{aiResult.mediaIdea}</div>
                  </div>

                  {/* Coupon & Campaign */}
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200 space-y-1">
                    <div className="font-bold text-xs flex items-center gap-1 text-emerald-800 dark:text-emerald-400">
                      <Tag className="w-4 h-4" />
                      <span>Sugestão de Cupom</span>
                    </div>
                    <div className="font-mono font-bold text-sm text-emerald-900 dark:text-emerald-300">
                      {aiResult.suggestedCoupon}
                    </div>
                    <div className="text-[11px] text-emerald-800 dark:text-emerald-300/80">{aiResult.campaignIdea}</div>
                  </div>

                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 3: CAMPAIGNS & COUPONS */}
      {activeTab === 'campaigns' && (
        <div className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] overflow-hidden shadow-2xs">
          <div className="p-4 bg-[#FAF7F2] dark:bg-[#1E1F22] border-b border-[#E8DFD5] dark:border-[#3F4147] flex items-center justify-between">
            <h3 className="font-bold text-xs text-[#352527] dark:text-[#FFFFFF] uppercase tracking-wider">
              Campanhas e Ações Promocionais
            </h3>
            <span className="text-xs text-[#7A6466] dark:text-[#B5BAC1]">Total: {marketingCampaigns.length} ações</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] dark:bg-[#1E1F22] border-b border-[#E8DFD5] dark:border-[#3F4147] text-[#7A6466] dark:text-[#B5BAC1] font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Campanha / Canal</th>
                  <th className="p-3.5">Período</th>
                  <th className="p-3.5 text-center">Cupom Ativo</th>
                  <th className="p-3.5 text-right">Orçamento</th>
                  <th className="p-3.5 text-right">Receita Gerada</th>
                  <th className="p-3.5 text-center">ROI</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center w-20">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E8DF] dark:divide-[#3F4147]">
                {campaignList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-xs text-[#8C7678] dark:text-[#B5BAC1]">
                      Nenhuma campanha de marketing cadastrada. Crie campanhas para acompanhar orçamento, cupons e retorno sobre investimento (ROI).
                    </td>
                  </tr>
                ) : (
                  campaignList.map(c => {
                    const roi = c.budget > 0 ? (((c.revenueGenerated - c.budget) / c.budget) * 100).toFixed(0) : '0';

                    return (
                      <tr key={c.id} className="hover:bg-[#FAF7F2] dark:hover:bg-[#35373C]">
                        <td className="p-3.5">
                          <div className="font-bold text-sm text-[#352527] dark:text-[#FFFFFF]">{c.title}</div>
                          <div className="text-[11px] text-[#7A6466] dark:text-[#B5BAC1] flex items-center gap-1 mt-0.5">
                            <span className="font-semibold text-[#B86B77]">{c.channel}</span>
                            {c.ordersCount > 0 && <span>• {c.ordersCount} pedidos</span>}
                          </div>
                        </td>

                        <td className="p-3.5 text-[#553E41] dark:text-[#B5BAC1]">
                          <div>{new Date(c.startDate + 'T00:00:00').toLocaleDateString('pt-BR')} até</div>
                          <div className="text-[11px] text-[#8C7678] dark:text-[#B5BAC1]">{new Date(c.endDate + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                        </td>

                        <td className="p-3.5 text-center">
                          {c.discountCoupon ? (
                            <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[11px] bg-[#FAF0F2] dark:bg-[#382B2E] text-[#B86B77] border border-[#F2D7DA] dark:border-[#3F4147]">
                              {c.discountCoupon}
                            </span>
                          ) : (
                            <span className="text-stone-400 text-[11px]">-</span>
                          )}
                        </td>

                        <td className="p-3.5 text-right font-mono font-semibold text-[#352527] dark:text-[#FFFFFF]">
                          R$ {(c.budget ?? 0).toFixed(2)}
                        </td>

                        <td className="p-3.5 text-right font-mono font-bold text-emerald-800 dark:text-emerald-500">
                          R$ {(c.revenueGenerated ?? 0).toFixed(2)}
                        </td>

                        <td className="p-3.5 text-center font-bold">
                          <span className={Number(roi) >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>
                            {roi}%
                          </span>
                        </td>

                        <td className="p-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === 'ativa' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' :
                            c.status === 'planejada' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400' :
                            c.status === 'pausada' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' :
                            'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                          }`}>
                            {c.status.toUpperCase()}
                          </span>
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEditCampaign(c)}
                              className="p-1.5 text-stone-400 dark:text-[#B5BAC1] hover:text-[#B86B77] hover:bg-[#FAF0F2] dark:hover:bg-[#382B2E] rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCampaign(c.id, c.title)}
                              className="p-1.5 text-stone-400 dark:text-[#B5BAC1] hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <CampaignModal
        isOpen={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
        campaignToEdit={campaignToEdit}
      />

      <SocialPostModal
        isOpen={isSocialModalOpen}
        onClose={() => setIsSocialModalOpen(false)}
        postToEdit={postToEdit}
        initialData={initialPostData}
      />

    </div>
  );
};

