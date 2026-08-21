import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, CheckCircle2, 
  Smartphone, Scissors, Users, Calendar, DollarSign, Link2, 
  ShieldCheck, ArrowRight, ArrowLeft, X, ExternalLink, Award, Clock,
  ChevronRight, Laptop, HelpCircle, Check, Star, Video, Youtube, Settings
} from 'lucide-react';
import { Storage } from '../utils/storage';
import { VideoTutorialConfig, VideoTutorialChapterConfig } from '../types';

interface VideoTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  salonName?: string;
  ownerName?: string;
  onOpenAdminVideoConfig?: () => void;
  isAdmin?: boolean;
}

interface Chapter {
  id: number;
  title: string;
  shortTitle: string;
  duration: number; // in seconds
  icon: React.ElementType;
  badge: string;
  headline: string;
  narration: string;
  points: string[];
  mockupType: 'welcome' | 'install' | 'login' | 'services' | 'agenda' | 'caixa' | 'clientlink' | 'benefits';
}

const DEFAULT_CHAPTERS: Chapter[] = [
  {
    id: 1,
    title: 'Apresentação & Vantagens para o Salão',
    shortTitle: '1. Vantagens',
    duration: 35,
    icon: Star,
    badge: 'Super Poderes',
    headline: 'Por que o Agenda Fácil é o melhor investimento para o seu salão?',
    narration: 'Olá! Seja muito bem-vindo ao Agenda Fácil Salão e Barbearia. Este aplicativo foi desenvolvido especialmente para você, dono de salão, que quer economizar tempo, organizar sua equipe, aumentar seu faturamento e nunca mais perder clientes por demora no WhatsApp. Você tem controle total na palma da sua mão, sem pagar comissões para terceiros.',
    points: [
      'Zero comissão sobre os seus agendamentos — 100% do lucro fica com você.',
      'Clientes agendam sozinhos 24 horas por dia, direto pelo celular.',
      'Controle financeiro automático: saiba exatamente quanto faturou em Pix, Cartão e Dinheiro.',
      'Divisão de comissões da equipe calculada instantaneamente sem dor de cabeça.'
    ],
    mockupType: 'welcome'
  },
  {
    id: 2,
    title: 'Como Instalar no Celular e Computador',
    shortTitle: '2. Instalação',
    duration: 30,
    icon: Smartphone,
    badge: 'PWA Nativo',
    headline: 'Instalação instantânea em menos de 10 segundos, sem ocupar memória!',
    narration: 'Você e seus profissionais podem instalar o aplicativo em qualquer celular Android, iPhone ou computador sem precisar baixar arquivos pesados da loja de aplicativos. O app funciona direto pelo navegador e se transforma em um ícone na tela inicial.',
    points: [
      'No Android (Google Chrome): Abra o link do salão, toque nos 3 pontinhos no canto superior direito e selecione "Instalar aplicativo" ou "Adicionar à tela inicial".',
      'No iPhone (Safari): Abra o link, toque no botão de Compartilhar (ícone com quadrado e seta) e selecione "Adicionar à Tela de Início".',
      'No Computador: Abra no Chrome ou Edge e clique no ícone de "Instalar" na barra de endereços.'
    ],
    mockupType: 'install'
  },
  {
    id: 3,
    title: 'Como Fazer o Primeiro Acesso (CPF + Token)',
    shortTitle: '3. Primeiro Acesso',
    duration: 25,
    icon: ShieldCheck,
    badge: 'Segurança Máxima',
    headline: 'Acesso rápido e protegido para o proprietário e gerentes',
    narration: 'Após a confirmação do seu plano ou teste de 15 dias, você recebe suas chaves oficiais: seu CPF de proprietário e seu Token de Licença exclusivo. Basta digitá-los na tela de login para liberar seu painel.',
    points: [
      'Login Oficial: Digite o CPF cadastrado no momento da compra.',
      'Senha de Licença: Digite ou cole o Token de Acesso gerado pelo sistema.',
      'Você também recebe o link direto e as credenciais no seu E-mail e WhatsApp para guardar com segurança.'
    ],
    mockupType: 'login'
  },
  {
    id: 4,
    title: 'Cadastrando Serviços & Equipe com Comissões',
    shortTitle: '4. Serviços & Equipe',
    duration: 30,
    icon: Scissors,
    badge: 'Automação',
    headline: 'Defina os preços, tempo de atendimento e divisão de comissões',
    narration: 'No menu superior, acesse a aba Serviços para cadastrar cortes de cabelo, barba, químicas, escovas e tratamentos com seus valores e duração estimada. Em seguida, cadastre seus profissionais e defina a comissão individual de cada um. O sistema calcula tudo sozinho.',
    points: [
      'Aba "Serviços": Cadastre nomes, valores e tempos estimados de atendimento.',
      'Aba "Equipe": Cadastre seus barbeiros e cabeleireiros com foto, especialidade e porcentagem de comissão.',
      'O sistema bloqueia conflito de horários para que nenhum profissional receba dois clientes no mesmo minuto.'
    ],
    mockupType: 'services'
  },
  {
    id: 5,
    title: 'Agenda em Tempo Real & Controle de Caixa',
    shortTitle: '5. Agenda & Caixa',
    duration: 35,
    icon: Calendar,
    badge: 'Gestão Total',
    headline: 'Organização impecável dos atendimentos e fechamento diário',
    narration: 'Na aba Agenda, você acompanha todos os clientes do dia com status de agendado, em atendimento ou concluído. Ao finalizar o serviço, com um clique você lança no Caixa com a forma de pagamento: Pix, Cartão ou Dinheiro, com relatório de faturamento em tempo real.',
    points: [
      'Aba "Agenda": Visualize horários por dia, semana ou profissional.',
      'Aba "Caixa": Lance entradas, saídas e despesas do dia com fechamento de caixa simplificado.',
      'Dashboard Completo: Gráficos de faturamento, faturamento médio e profissionais mais produtivos.'
    ],
    mockupType: 'caixa'
  },
  {
    id: 6,
    title: 'Link dos Clientes (Agendamento 24h na Bio)',
    shortTitle: '6. Link dos Clientes',
    duration: 30,
    icon: Link2,
    badge: 'Vendas Automáticas',
    headline: 'Multiplique seus agendamentos colocando o link no Instagram e WhatsApp',
    narration: 'Clique no botão vermelho Criar Link para Clientes no topo do aplicativo. Esse link é a sua vitrine online! Coloque na Bio do Instagram da sua barbearia ou envie no WhatsApp. O cliente escolhe o serviço, o profissional e o melhor horário sozinho, sem você precisar parar o atendimento para responder.',
    points: [
      'Botão "Criar Link p/ Clientes": Copie seu link exclusivo personalizado.',
      'Coloque no Instagram, Google Meu Negócio e mensagem automática do WhatsApp.',
      'Notificação em tempo real: O salão recebe os novos agendamentos na hora!'
    ],
    mockupType: 'clientlink'
  },
  {
    id: 7,
    title: 'Resumo das Vantagens & Sucesso do Seu Salão',
    shortTitle: '7. Resumo & Conclusão',
    duration: 25,
    icon: Award,
    badge: 'Crescimento Garantido',
    headline: 'Seu salão profissional, organizado e faturando muito mais todos os dias',
    narration: 'Pronto! Agora você tem um aplicativo completo de alto padrão trabalhando por você 24 horas por dia. Aproveite todos os recursos, fidelize seus clientes e leve seu salão para o próximo nível. Bom trabalho e excelentes negócios!',
    points: [
      'Economia de até 3 horas por dia que você gastava respondendo mensagens de agendamento.',
      'Fim dos furos de horários e clientes esperando na recepção.',
      'Controle absoluto do seu dinheiro e comissões da equipe.',
      'Suporte e atualizações automáticas inclusas na sua licença.'
    ],
    mockupType: 'benefits'
  }
];

const MOCKUP_ICONS: Record<number, React.ElementType> = {
  1: Star,
  2: Smartphone,
  3: ShieldCheck,
  4: Scissors,
  5: Calendar,
  6: Link2,
  7: Award
};

const MOCKUP_TYPES: ('welcome' | 'install' | 'login' | 'services' | 'agenda' | 'caixa' | 'clientlink' | 'benefits')[] = [
  'welcome', 'install', 'login', 'services', 'agenda', 'caixa', 'clientlink', 'benefits'
];

function extractYoutubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  try {
    if (url.includes('youtube.com/embed/')) return url;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}?autoplay=1&rel=0`;
    }
  } catch (e) {}
  return null;
}

export function VideoTutorialModal({ 
  isOpen, 
  onClose, 
  salonName = 'Salão dos Parças', 
  ownerName = 'Proprietário',
  onOpenAdminVideoConfig,
  isAdmin = false
}: VideoTutorialModalProps) {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0); // 0 to 100 within current chapter
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showChaptersMenu, setShowChaptersMenu] = useState(false);
  const [activeTabSubView, setActiveTabSubView] = useState<'dashboard' | 'caixa' | 'agenda' | 'servicos' | 'equipe'>('dashboard');

  const [videoConfig, setVideoConfig] = useState<VideoTutorialConfig | undefined>(undefined);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load config on open
  useEffect(() => {
    if (isOpen) {
      const adminPayment = Storage.getAdminPaymentConfig();
      setVideoConfig(adminPayment.videoTutorialConfig);
      setIsPlaying(true);
      setProgress(0);
    } else {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
    }
  }, [isOpen]);

  // Derive dynamic chapters list from Admin Config if available
  const chapters: Chapter[] = React.useMemo(() => {
    if (videoConfig && videoConfig.chapters && videoConfig.chapters.length > 0) {
      return videoConfig.chapters.map((cfg, idx) => ({
        id: cfg.id || idx + 1,
        title: cfg.title,
        shortTitle: cfg.shortTitle || `${idx + 1}. Capítulo`,
        duration: cfg.duration || 30,
        icon: MOCKUP_ICONS[cfg.id] || Sparkles,
        badge: cfg.badge || 'Destaque',
        headline: cfg.headline || cfg.title,
        narration: cfg.narration || '',
        points: cfg.points || [],
        mockupType: MOCKUP_TYPES[idx % MOCKUP_TYPES.length]
      }));
    }
    return DEFAULT_CHAPTERS;
  }, [videoConfig]);

  const currentChapter = chapters[currentChapterIndex] || chapters[0];

  const youtubeEmbedUrl = React.useMemo(() => {
    if (videoConfig && !videoConfig.useInteractivePlayer && videoConfig.youtubeUrl) {
      return extractYoutubeEmbedUrl(videoConfig.youtubeUrl);
    }
    return null;
  }, [videoConfig]);

  const customVideoDirectUrl = React.useMemo(() => {
    if (videoConfig && !videoConfig.useInteractivePlayer && videoConfig.customVideoUrl) {
      return videoConfig.customVideoUrl;
    }
    return null;
  }, [videoConfig]);

  // Voice narration using Web Speech API (Only when interactive player is active)
  useEffect(() => {
    if (!isOpen) return;

    if (youtubeEmbedUrl || customVideoDirectUrl) {
      // External video playing, do not speak
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      if (isVoiceEnabled && isPlaying && currentChapter && currentChapter.narration) {
        const textToSpeak = `${currentChapter.title}. ${currentChapter.narration}`;
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'pt-BR';
        utterance.rate = playbackSpeed === 1.5 ? 1.25 : playbackSpeed === 1.25 ? 1.1 : 0.95;
        utterance.pitch = 1.0;

        // Try to select Brazilian Portuguese voice if available
        const voices = window.speechSynthesis.getVoices();
        const ptVoice = voices.find(v => v.lang.includes('pt-BR') || v.lang.includes('pt'));
        if (ptVoice) {
          utterance.voice = ptVoice;
        }

        speechRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      }
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentChapterIndex, isVoiceEnabled, isPlaying, isOpen, playbackSpeed, currentChapter, youtubeEmbedUrl, customVideoDirectUrl]);

  // Progress timer for video simulation
  useEffect(() => {
    if (!isOpen || !isPlaying || youtubeEmbedUrl || customVideoDirectUrl) return;

    const intervalTime = 100; // ms
    const durationSec = currentChapter ? currentChapter.duration : 30;
    const step = (100 / (durationSec * 10)) * playbackSpeed;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          // Go to next chapter
          if (currentChapterIndex < chapters.length - 1) {
            setCurrentChapterIndex(c => c + 1);
            return 0;
          } else {
            setIsPlaying(false);
            return 100;
          }
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isOpen, isPlaying, currentChapterIndex, playbackSpeed, currentChapter, chapters.length, youtubeEmbedUrl, customVideoDirectUrl]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentChapterIndex < chapters.length - 1) {
      setCurrentChapterIndex(prev => prev + 1);
      setProgress(0);
    }
  };

  const handlePrev = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex(prev => prev - 1);
      setProgress(0);
    }
  };

  const handleSelectChapter = (index: number) => {
    setCurrentChapterIndex(index);
    setProgress(0);
    setIsPlaying(true);
    setShowChaptersMenu(false);
  };

  const togglePlay = () => {
    if (isPlaying) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setCurrentChapterIndex(0);
    setProgress(0);
    setIsPlaying(true);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[90] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-red-500/60 rounded-3xl w-full max-w-5xl text-white shadow-2xl relative my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[96vh]">
        
        {/* Top Header Bar of the Video Player */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-600 rounded-xl text-white shadow-md shadow-red-600/30 flex items-center justify-center shrink-0">
              <Play className="w-4 h-4 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-red-400">
                  {videoConfig?.videoTitle || 'Vídeo Tutorial Explicativo & Demonstração'}
                </span>
                <span className="bg-red-950 text-red-300 border border-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-yellow-400" />
                  HD 1080p
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5 mt-0.5">
                <span>Agenda Fácil Salão & Barbearia</span>
                <span className="text-slate-400 font-normal text-xs hidden sm:inline">• Passo a Passo Completo</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAdminVideoConfig && (
              <button
                type="button"
                onClick={onOpenAdminVideoConfig}
                className="px-2.5 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Configurar Link do Vídeo ou Editar Narrações e Roteiros"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Configurar Vídeo/Voz</span>
              </button>
            )}

            {!youtubeEmbedUrl && !customVideoDirectUrl && (
              <button
                onClick={() => setShowChaptersMenu(!showChaptersMenu)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <span>Capítulos ({currentChapterIndex + 1}/{chapters.length})</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
              title="Fechar Vídeo"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chapters Dropdown Drawer if active */}
        {showChaptersMenu && !youtubeEmbedUrl && !customVideoDirectUrl && (
          <div className="bg-slate-950 border-b border-slate-800 p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 animate-in slide-in-from-top duration-150 shrink-0">
            {chapters.map((ch, idx) => {
              const Icon = ch.icon;
              const isSelected = idx === currentChapterIndex;
              return (
                <button
                  key={ch.id}
                  onClick={() => handleSelectChapter(idx)}
                  className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                    isSelected
                      ? 'bg-sky-600/20 border-sky-400 text-white font-bold'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-xs truncate">
                    <span className="block font-semibold text-[10px] text-slate-400 uppercase">Capítulo {ch.id}</span>
                    <span className="truncate block">{ch.title}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Main Player Screen Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col gap-4">
          
          {/* External YouTube Embed View */}
          {youtubeEmbedUrl ? (
            <div className="w-full aspect-video rounded-2xl overflow-hidden border-2 border-red-500/50 shadow-2xl bg-black">
              <iframe
                src={youtubeEmbedUrl}
                title="Vídeo Tutorial YouTube"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : customVideoDirectUrl ? (
            /* External MP4 Direct Video View */
            <div className="w-full aspect-video rounded-2xl overflow-hidden border-2 border-red-500/50 shadow-2xl bg-black">
              <video
                src={customVideoDirectUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            /* Interactive Simulated Screen Player */
            <div className="w-full bg-slate-950 rounded-2xl border-2 border-sky-500/40 shadow-2xl overflow-hidden flex flex-col">
              
              {/* Top Bar of the simulated salon app */}
              <div className="bg-[#0b1b36] border-b border-sky-900/60 p-2 sm:p-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5" />
                    <span>💈 {salonName}</span>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Ao Vivo</span>
                  </div>
                </div>

                {/* Action Buttons in Simulated Navbar */}
                <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] font-bold">
                  <div className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-xl flex items-center gap-1 shadow">
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Criar Link p/ Clientes</span>
                  </div>
                  <div className="bg-amber-600/30 border border-amber-500/40 text-amber-300 px-2.5 py-1.5 rounded-xl hidden sm:flex items-center gap-1">
                    <span>👑 Administrador</span>
                  </div>
                  <div className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl flex items-center gap-1 shadow">
                    <span>Licença Ativa</span>
                  </div>
                </div>
              </div>

              {/* Simulated Banner & Title */}
              <div className="bg-gradient-to-r from-blue-700 via-sky-600 to-blue-700 py-3 px-4 text-center text-white border-b border-blue-500/30">
                <h3 className="text-base sm:text-xl font-black tracking-tight drop-shadow-md">
                  Controle {salonName}
                </h3>
                <div className="inline-flex items-center gap-1.5 bg-blue-950/60 px-3 py-0.5 rounded-full text-xs text-sky-200 mt-1 font-semibold border border-blue-400/20">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>💈 Painel do Salão • Atendimento & Agendamentos</span>
                </div>
              </div>

              {/* Simulated Tabs (Dashboard, Caixa, Agenda, Equipe, Serviços, Clientes) */}
              <div className="bg-[#0b1424] border-b border-slate-800 px-2 sm:px-4 py-2 flex items-center gap-1 sm:gap-2 overflow-x-auto text-xs font-bold">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: Sparkles },
                  { id: 'caixa', label: 'Caixa', icon: DollarSign },
                  { id: 'agenda', label: 'Agenda', icon: Calendar },
                  { id: 'equipe', label: 'Equipe', icon: Users },
                  { id: 'servicos', label: 'Serviços', icon: Scissors },
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTabSubView === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTabSubView(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Interactive Content based on Current Chapter */}
              <div className="p-4 sm:p-6 bg-slate-900/90 min-h-[260px] flex flex-col justify-center">
                
                {/* CHAPTER 1: Welcome & Benefits */}
                {currentChapter.mockupType === 'welcome' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-emerald-950/50 border border-emerald-500/40 p-3.5 rounded-2xl">
                        <span className="text-2xl font-black text-emerald-400">100%</span>
                        <h5 className="text-xs font-bold text-white mt-1">Lucro no Seu Bolso</h5>
                        <p className="text-[11px] text-slate-300 mt-0.5">Sem cobrança de porcentagem por corte ou barba.</p>
                      </div>
                      <div className="bg-sky-950/50 border border-sky-500/40 p-3.5 rounded-2xl">
                        <span className="text-2xl font-black text-sky-400">24 Horas</span>
                        <h5 className="text-xs font-bold text-white mt-1">Agendamento Online</h5>
                        <p className="text-[11px] text-slate-300 mt-0.5">Seus clientes agendam sozinhos a qualquer hora.</p>
                      </div>
                      <div className="bg-amber-950/50 border border-amber-500/40 p-3.5 rounded-2xl">
                        <span className="text-2xl font-black text-amber-400">R$ 0</span>
                        <h5 className="text-xs font-bold text-white mt-1">Sem Equipamentos Caros</h5>
                        <p className="text-[11px] text-slate-300 mt-0.5">Funciona direto no celular e computador.</p>
                      </div>
                      <div className="bg-purple-950/50 border border-purple-500/40 p-3.5 rounded-2xl">
                        <span className="text-2xl font-black text-purple-400">100%</span>
                        <h5 className="text-xs font-bold text-white mt-1">Gestão Completa</h5>
                        <p className="text-[11px] text-slate-300 mt-0.5">Agenda, Caixa, Comissões e Clientes integrados.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* CHAPTER 2: Installation Guide */}
                {currentChapter.mockupType === 'install' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <div className="bg-slate-950 p-4 rounded-2xl border border-emerald-500/50 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                        <Smartphone className="w-5 h-5" />
                        <span>No Android (Google Chrome):</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        1. Abra o link do salão no Google Chrome.<br />
                        2. Toque nos <strong>3 pontinhos</strong> no canto superior direito.<br />
                        3. Toque em <strong>"Instalar aplicativo"</strong> ou "Adicionar à tela inicial".
                      </p>
                      <div className="bg-emerald-950/60 text-emerald-300 text-[11px] p-2 rounded-xl border border-emerald-800/60 font-semibold">
                        ✓ O ícone do salão é criado na sua tela como um app nativo!
                      </div>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-2xl border border-sky-500/50 space-y-2">
                      <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                        <Smartphone className="w-5 h-5" />
                        <span>No iPhone / iOS (Safari):</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        1. Abra o link do salão no <strong>Safari</strong>.<br />
                        2. Toque no botão de <strong>Compartilhar</strong> (ícone com quadrado e seta para cima).<br />
                        3. Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.
                      </p>
                      <div className="bg-sky-950/60 text-sky-300 text-[11px] p-2 rounded-xl border border-sky-800/60 font-semibold">
                        ✓ Pronto! Funciona em tela cheia com alta velocidade.
                      </div>
                    </div>
                  </div>
                )}

                {/* CHAPTER 3: Login (CPF + Token) */}
                {currentChapter.mockupType === 'login' && (
                  <div className="max-w-md mx-auto w-full bg-slate-950 p-5 rounded-2xl border border-blue-500/40 space-y-3 animate-in fade-in duration-300">
                    <div className="text-center space-y-1">
                      <span className="text-xs font-black text-blue-400 uppercase tracking-wide">Área Restrita do Proprietário</span>
                      <h4 className="text-sm font-bold text-white">Login com CPF + Token de Licença</h4>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[11px] text-slate-400 font-medium">CPF do Proprietário:</label>
                        <div className="bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-xs font-mono text-white">
                          123.456.789-00
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 font-medium">Token de Acesso / Licença:</label>
                        <div className="bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-xs font-mono text-emerald-400 font-bold">
                          TOK-PARÇAS-2026
                        </div>
                      </div>
                    </div>
                    <div className="bg-blue-950/60 text-blue-300 text-[11px] p-2 rounded-xl border border-blue-800/60 text-center font-bold">
                      ✓ Acesso Liberado Instantaneamente
                    </div>
                  </div>
                )}

                {/* CHAPTER 4: Services & Team */}
                {currentChapter.mockupType === 'services' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-300">
                    <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                      <span className="text-xs font-black text-amber-400 uppercase">Serviços Cadastrados</span>
                      <div className="space-y-1.5">
                        <div className="bg-slate-900 p-2 rounded-xl flex items-center justify-between text-xs">
                          <span className="font-bold text-white">✂️ Corte Degradê Masculino</span>
                          <span className="text-emerald-400 font-bold">R$ 35,00 (30m)</span>
                        </div>
                        <div className="bg-slate-900 p-2 rounded-xl flex items-center justify-between text-xs">
                          <span className="font-bold text-white">💈 Barba Terapia Completa</span>
                          <span className="text-emerald-400 font-bold">R$ 25,00 (20m)</span>
                        </div>
                        <div className="bg-slate-900 p-2 rounded-xl flex items-center justify-between text-xs">
                          <span className="font-bold text-white">✨ Sobrancelha Navalhada</span>
                          <span className="text-emerald-400 font-bold">R$ 15,00 (15m)</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                      <span className="text-xs font-black text-sky-400 uppercase">Equipe & Comissões</span>
                      <div className="space-y-1.5">
                        <div className="bg-slate-900 p-2 rounded-xl flex items-center justify-between text-xs">
                          <span className="font-bold text-white">👨‍🦱 Michael (Barbeiro Master)</span>
                          <span className="bg-sky-950 text-sky-300 px-2 py-0.5 rounded-md font-bold text-[10px]">70% Comissão</span>
                        </div>
                        <div className="bg-slate-900 p-2 rounded-xl flex items-center justify-between text-xs">
                          <span className="font-bold text-white">🧔 Marlon (Especialista em Barba)</span>
                          <span className="bg-sky-950 text-sky-300 px-2 py-0.5 rounded-md font-bold text-[10px]">60% Comissão</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* CHAPTER 5: Agenda & Caixa */}
                {currentChapter.mockupType === 'caixa' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-300">
                    <div className="bg-slate-950 p-3.5 rounded-2xl border border-emerald-500/40 space-y-1">
                      <span className="text-[11px] font-bold text-slate-400">Faturamento do Dia</span>
                      <div className="text-2xl font-black text-emerald-400 font-mono">R$ 840,00</div>
                      <span className="text-[10px] text-emerald-300 font-bold">24 Atendimentos Realizados</span>
                    </div>

                    <div className="bg-slate-950 p-3.5 rounded-2xl border border-blue-500/40 space-y-1">
                      <span className="text-[11px] font-bold text-slate-400">Divisão de Pagamentos</span>
                      <div className="space-y-1 text-xs pt-1">
                        <div className="flex justify-between text-slate-300"><span>Pix:</span><strong className="text-white">R$ 480,00</strong></div>
                        <div className="flex justify-between text-slate-300"><span>Cartão:</span><strong className="text-white">R$ 260,00</strong></div>
                        <div className="flex justify-between text-slate-300"><span>Dinheiro:</span><strong className="text-white">R$ 100,00</strong></div>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-3.5 rounded-2xl border border-purple-500/40 space-y-1">
                      <span className="text-[11px] font-bold text-slate-400">Comissões da Equipe</span>
                      <div className="text-xl font-black text-purple-400 font-mono">R$ 540,00</div>
                      <span className="text-[10px] text-purple-300 font-bold">Líquido do Salão: R$ 300,00</span>
                    </div>
                  </div>
                )}

                {/* CHAPTER 6: Client Link */}
                {currentChapter.mockupType === 'clientlink' && (
                  <div className="max-w-xl mx-auto w-full bg-slate-950 p-4 rounded-2xl border-2 border-rose-500/50 space-y-3 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 text-rose-400 font-black text-sm">
                      <Link2 className="w-5 h-5" />
                      <span>Link Exclusivo de Agendamento do Seu Salão</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl flex items-center justify-between text-xs font-mono text-rose-300">
                      <span className="truncate">https://agenda-f-cil-sal-o.vercel.app/?action=cliente&id=salao-1</span>
                      <span className="bg-rose-600 text-white font-bold px-2 py-1 rounded-lg text-[10px] ml-2 shrink-0">Copiar Link</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      💡 <strong>Como usar:</strong> Coloque esse link no perfil do seu <strong>Instagram (@seu_salao)</strong>, envie no grupo do WhatsApp e no Google Meu Negócio.
                    </p>
                  </div>
                )}

                {/* CHAPTER 7: Benefits */}
                {currentChapter.mockupType === 'benefits' && (
                  <div className="bg-gradient-to-r from-emerald-950/80 via-slate-950 to-blue-950/80 p-5 rounded-2xl border-2 border-emerald-500/60 text-center space-y-3 animate-in fade-in duration-300">
                    <div className="w-12 h-12 bg-emerald-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-600/30">
                      <Award className="w-7 h-7 text-yellow-300" />
                    </div>
                    <div>
                      <h4 className="text-base sm:text-lg font-black text-white">Parabéns! Seu Salão Está Pronto Para Decolar</h4>
                      <p className="text-xs text-emerald-200 mt-1 max-w-md mx-auto">
                        Economize tempo, aumente seus lucros e garanta uma experiência 5 estrelas para todos os seus clientes.
                      </p>
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}

          {/* Narration Subtitle & Bullet Points Area */}
          {!youtubeEmbedUrl && !customVideoDirectUrl && currentChapter && (
            <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-4 space-y-3 shrink-0">
              
              {/* Headline & Voice Badge */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded-xl shadow-sm">
                    {currentChapter.badge}
                  </span>
                  <h4 className="font-extrabold text-sm sm:text-base text-white">
                    {currentChapter.headline}
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  {/* Voice Toggle */}
                  <button
                    onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                    className={`p-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                      isVoiceEnabled
                        ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                    title={isVoiceEnabled ? 'Desativar Narração por Voz' : 'Ativar Narração por Voz'}
                  >
                    {isVoiceEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                    <span className="hidden sm:inline">{isVoiceEnabled ? 'Voz Ligada' : 'Voz Desligada'}</span>
                  </button>

                  {/* Playback Speed */}
                  <div className="flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700 text-xs font-bold">
                    {[1, 1.25, 1.5].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => setPlaybackSpeed(speed)}
                        className={`px-2 py-1 rounded-lg transition-all ${
                          playbackSpeed === speed ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Spoken Narration Subtitle Box */}
              <div className="bg-slate-900/90 border border-sky-500/30 p-3 rounded-xl flex items-start gap-2.5">
                <div className="p-1 bg-sky-500/20 text-sky-300 rounded-lg shrink-0 mt-0.5">
                  <Volume2 className="w-4 h-4 animate-pulse" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">Narração em Áudio:</span>
                  <p className="text-xs text-slate-200 font-medium leading-relaxed italic">
                    "{currentChapter.narration}"
                  </p>
                </div>
              </div>

              {/* Key Bullet Points */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {currentChapter.points.map((point, pIdx) => (
                  <div key={pIdx} className="flex items-start gap-2 text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-snug">{point}</span>
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>

        {/* Video Player Bottom Controls & Timeline Bar */}
        {!youtubeEmbedUrl && !customVideoDirectUrl && (
          <div className="bg-slate-950 px-4 py-3 border-t border-slate-800 flex flex-col gap-2 shrink-0">
            
            {/* Progress Timeline */}
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden relative cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const newProgress = (clickX / rect.width) * 100;
                setProgress(Math.max(0, Math.min(100, newProgress)));
              }}
            >
              <div 
                className="bg-gradient-to-r from-sky-500 to-emerald-400 h-full rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              {/* Play/Pause/Prev/Next buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  disabled={currentChapterIndex === 0}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Capítulo Anterior"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={togglePlay}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-sky-600/30 transition-all active:scale-95 cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                  <span>{isPlaying ? 'Pausar' : 'Reproduzir'}</span>
                </button>

                <button
                  onClick={handleNext}
                  disabled={currentChapterIndex === chapters.length - 1}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Próximo Capítulo"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={handleRestart}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  title="Reiniciar Vídeo Tutorial"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Time / Chapter info */}
              <div className="text-xs text-slate-400 font-semibold flex items-center gap-2">
                <span className="hidden sm:inline">Capítulo {currentChapterIndex + 1} de {chapters.length}:</span>
                <strong className="text-white">{currentChapter.shortTitle}</strong>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
