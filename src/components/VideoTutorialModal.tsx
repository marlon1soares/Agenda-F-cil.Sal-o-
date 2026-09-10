import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, CheckCircle2, 
  Smartphone, Scissors, Users, Calendar, DollarSign, Link2, 
  ShieldCheck, ArrowRight, ArrowLeft, X, ExternalLink, Award, Clock,
  ChevronRight, Laptop, HelpCircle, Check, Star, Video, Youtube, Settings,
  Download, FileText, Image as ImageIcon, Share2, Camera, Film, MonitorPlay,
  Heart, ThumbsUp, Radio, CheckSquare, MessageCircle, AlertCircle, Loader2
} from 'lucide-react';
import { Storage } from '../utils/storage';
import { VideoTutorialConfig, VideoTutorialChapterConfig } from '../types';

// Real and Disney Pixar generated assets
import pixarFemaleHostImg from '../assets/images/pixar_female_host_1788749082734.jpg';
import realSalonPeopleImg from '../assets/images/real_salon_people_1788749097357.jpg';
import realBarberClientImg from '../assets/images/real_barber_client_1788749113025.jpg';

interface VideoTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  salonName?: string;
  ownerName?: string;
  onOpenAdminVideoConfig?: () => void;
  isAdmin?: boolean;
}

export interface Chapter {
  id: number;
  title: string;
  shortTitle: string;
  duration: number; // in seconds (total ~360s = 6 minutos)
  icon: React.ElementType;
  badge: string;
  headline: string;
  narration: string;
  points: string[];
  mockupType: 'importance' | 'login' | 'clientlink' | 'services' | 'team' | 'agenda' | 'caixa' | 'install';
  focusButtonName: string;
  buttonLocation: string;
}

// 8 Faithful, Detailed Chapters (Total: 360 segundos = exatamente 6 minutos, entre 5 e 7 minutos)
export const OFFICIAL_TUTORIAL_CHAPTERS: Chapter[] = [
  {
    id: 1,
    title: 'A Importância de Ter o Agenda Mais Fácil no Seu Salão',
    shortTitle: '1. Importância & Lucro',
    duration: 45,
    icon: Star,
    badge: 'Super Vantagens',
    headline: 'Por que o seu salão precisa do Agenda Mais Fácil para lucrar mais todos os dias?',
    narration: 'Olá, todas e todos. Meu nome é Luna! E hoje eu vou te mostrar por que o Agenda Mais Fácil é a ferramenta mais importante para o sucesso do seu salão de beleza ou barbearia. Se você perde horas respondendo mensagens no WhatsApp enquanto corta cabelo, sofre com clientes furando horários ou se perde na hora de calcular comissões da equipe, esse aplicativo foi feito sob medida para você. Aqui, cem por cento do lucro dos agendamentos fica no seu bolso, sem taxas por atendimento!',
    points: [
      'Zero comissão sobre os seus agendamentos: 100% do dinheiro fica no salão.',
      'Fim da perda de tempo: clientes agendam sozinhos 24 horas por dia no celular.',
      'Visual moderno e profissional que valoriza a sua marca nas redes sociais.',
      'Controle absoluto do caixa, comissões da equipe e histórico dos clientes.'
    ],
    mockupType: 'importance',
    focusButtonName: 'Painel Geral do Proprietário',
    buttonLocation: 'Visão Geral & Automação 24h'
  },
  {
    id: 2,
    title: 'Como Acessar o Aplicativo (Login com CPF + Token de Licença)',
    shortTitle: '2. Como Acessar',
    duration: 45,
    icon: ShieldCheck,
    badge: 'Acesso Seguro',
    headline: 'Entrando no painel com o seu CPF de Proprietário e Token de Licença',
    narration: 'Para acessar o seu aplicativo, é muito simples e rápido. Na tela inicial, clique no botão Entrada Salão / Administrador. Você verá dois campos: no primeiro campo, digite o CPF do Proprietário cadastrado. No segundo campo, digite ou cole o seu Token de Licença exclusivo. Em seguida, clique em Entrar como Salão. O sistema valida sua licença na hora e libera o painel completo de gestão com total privacidade.',
    points: [
      'Botão "Entrada Salão / Administrador": Ponto oficial de login.',
      'Campo "CPF do Proprietário": Digite apenas os números do seu CPF.',
      'Campo "Senha / Token de Acesso": Digite a senha cadastrada ou o Token.',
      'O robô de despacho envia seus dados com segurança no seu WhatsApp e E-mail.'
    ],
    mockupType: 'login',
    focusButtonName: 'Entrada Salão / Administrador',
    buttonLocation: 'Tela de Login Inicial'
  },
  {
    id: 3,
    title: 'O Botão Mais Importante: "Criar Link p/ Clientes" (Bio e WhatsApp)',
    shortTitle: '3. Link dos Clientes',
    duration: 50,
    icon: Link2,
    badge: 'Vendas 24 Horas',
    headline: 'Multiplique seus agendamentos colocando seu link no Instagram e WhatsApp',
    narration: 'Preste muita atenção neste botão! No topo do aplicativo, você encontra o botão vermelho Criar Link para Clientes. Esse botão gera a sua vitrine online oficial! Ao clicar nele, você copia o link exclusivo do seu salão. Coloque esse link na Bio do perfil do seu Instagram, no seu perfil do Google Meu Negócio e na mensagem automática do WhatsApp. O seu cliente abre no celular, escolhe o corte ou barba, escolhe o profissional e o melhor horário sozinho!',
    points: [
      'Botão "Criar Link p/ Clientes": Botão de destaque em vermelho no topo.',
      'Copie o link com 1 clique e coloque no link da bio do Instagram (@seusalao).',
      'Configure nas respostas automáticas do WhatsApp Business para agendamento 24h.',
      'O salão recebe notificações em tempo real sem você precisar digitar nada.'
    ],
    mockupType: 'clientlink',
    focusButtonName: 'Criar Link p/ Clientes',
    buttonLocation: 'Barra Superior (Botão Vermelho de Destaque)'
  },
  {
    id: 4,
    title: 'Cadastrando Serviços & Preços (Aba Serviços)',
    shortTitle: '4. Serviços & Preços',
    duration: 45,
    icon: Scissors,
    badge: 'Cardápio de Serviços',
    headline: 'Cadastre cortes, barbas, químicas e tempos estimados de atendimento',
    narration: 'Agora vamos configurar o seu menu de atendimento. Clique na aba Serviços no menu superior. Para adicionar um novo atendimento, clique no botão azul Novo Serviço. Digite o nome, como Corte Degradê Masculino ou Barba Terapia, coloque o valor em reais e o tempo estimado de duração, por exemplo, trinta minutos. O aplicativo usa esse tempo para calcular os horários livres e impedir qualquer choque de horário entre clientes.',
    points: [
      'Aba "Serviços": Exibe todos os procedimentos oferecidos pelo seu salão.',
      'Botão "+ Novo Serviço": Cadastre nomes, categorias e valores.',
      'Duração em minutos: O sistema calcula a duração exata para evitar atrasos.',
      'Bloqueio automático de conflito: Nenhum cliente agendará em horário ocupado.'
    ],
    mockupType: 'services',
    focusButtonName: 'Aba Serviços & Botão "+ Novo Serviço"',
    buttonLocation: 'Menu de Abas > Botão Azul de Novo Serviço'
  },
  {
    id: 5,
    title: 'Cadastrando a Equipe & Comissões Automáticas (Aba Equipe)',
    shortTitle: '5. Equipe & Comissões',
    duration: 45,
    icon: Users,
    badge: 'Gestão da Equipe',
    headline: 'Cadastre barbeiros e cabeleireiros com comissões calculadas na hora',
    narration: 'Na aba Equipe, você organiza todos os profissionais que trabalham com você. Clique em Novo Profissional, adicione a foto ou avatar, nome do barbeiro ou cabeleireira e defina a porcentagem de comissão individual, como cinquenta, sessenta ou setenta por cento. O Agenda Mais Fácil calcula automaticamente a comissão de cada atendimento concluído. Fim das contas manuais em papel e das discussões no final do mês!',
    points: [
      'Aba "Equipe": Lista de todos os seus barbeiros e cabeleireiros.',
      'Botão "+ Novo Profissional": Cadastre com nome, foto e especialidade.',
      'Porcentagem de comissão automática: Defina 50%, 60%, 70% por membro.',
      'Relatório individual de produtividade e ganhos de cada colaborador.'
    ],
    mockupType: 'team',
    focusButtonName: 'Aba Equipe & Botão "+ Novo Profissional"',
    buttonLocation: 'Menu de Abas > Botão Verde de Equipe'
  },
  {
    id: 6,
    title: 'Agenda em Tempo Real & Status de Atendimento (Aba Agenda)',
    shortTitle: '6. Agenda em Tempo Real',
    duration: 45,
    icon: Calendar,
    badge: 'Controle Diário',
    headline: 'Acompanhe o fluxo do salão: Agendados, Em Atendimento e Concluídos',
    narration: 'A aba Agenda é o coração do seu dia a dia. Aqui você vê todos os horários do dia ou da semana, podendo filtrar por profissional. Cada agendamento tem um status visual em cores: amarelo para Agendado, azul para Em Atendimento e verde para Concluído. Quando o cliente chega, basta clicar para iniciar o atendimento. Ao terminar, com um único clique você finaliza o corte e envia direto para o Caixa.',
    points: [
      'Aba "Agenda": Grade diária e semanal com visualização limpa e organizada.',
      'Filtro por Profissional: Veja a agenda individual de cada cadeira do salão.',
      'Status em 3 Etapas: Agendado ➔ Em Atendimento ➔ Concluído.',
      'Botão "Concluir Atendimento": Lança o valor automaticamente no Caixa.'
    ],
    mockupType: 'agenda',
    focusButtonName: 'Aba Agenda & Botões de Status',
    buttonLocation: 'Menu de Abas > Grade de Horários'
  },
  {
    id: 7,
    title: 'Controle de Caixa & Fechamento Financeiro (Aba Caixa & Dashboard)',
    shortTitle: '7. Caixa & Fechamento',
    duration: 45,
    icon: DollarSign,
    badge: 'Financeiro 100%',
    headline: 'Saiba exatamente quanto faturou em Pix, Cartão e Dinheiro sem erros',
    narration: 'Na aba Caixa, você tem o fechamento financeiro completo do seu negócio. Ao receber do cliente, selecione a forma de pagamento: Pix, Cartão de Crédito, Débito ou Dinheiro em espécie. Você também pode registrar sangrias e compras de produtos. No final do dia, o sistema te dá o relatório pronto: faturamento bruto, total de comissões pagas para a equipe e o lucro líquido que fica no caixa do salão.',
    points: [
      'Aba "Caixa": Registro de todas as entradas, saídas e formas de pagamento.',
      'Separação por forma de pagamento: Saiba quanto entrou em Pix, Cartão e Dinheiro.',
      'Fechamento diário instantâneo: Sem perder horas conferindo comprovantes.',
      'Aba "Dashboard": Gráficos de crescimento, faturamento mensal e ticket médio.'
    ],
    mockupType: 'caixa',
    focusButtonName: 'Aba Caixa & Dashboard Financeiro',
    buttonLocation: 'Menu de Abas > Módulo de Caixa'
  },
  {
    id: 8,
    title: 'Robô de Despacho Automático & Instalação no Celular',
    shortTitle: '8. Robô & Instalação',
    duration: 40,
    icon: Smartphone,
    badge: 'PWA & Suporte',
    headline: 'Despacho automático no WhatsApp e instalação em menos de 10 segundos',
    narration: 'E para fechar com chave de ouro: o Agenda Mais Fácil possui um Robô de Despacho Automático que envia tokens e links de acesso direto no WhatsApp e E-mail cadastrados. Além disso, o aplicativo pode ser instalado em qualquer celular Android ou iPhone sem precisar baixar arquivos pesados da loja de aplicativos. Basta abrir no navegador, tocar nos três pontinhos ou compartilhar e selecionar Adicionar à Tela de Início. Pronto! Seu salão agora está no topo do mercado!',
    points: [
      'Robô de Despacho: Envio instantâneo de credenciais via WhatsApp e E-mail.',
      'Instalação no Android: Google Chrome > 3 pontinhos > "Instalar Aplicativo".',
      'Instalação no iPhone: Safari > Botão Compartilhar > "Adicionar à Tela de Início".',
      'Suporte técnico e atualizações automáticas inclusas na sua licença.'
    ],
    mockupType: 'install',
    focusButtonName: 'Robô de Despacho & PWA no Celular',
    buttonLocation: 'Automação em Segundo Plano'
  }
];

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

  // Video recording / download states
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportMessage, setExportMessage] = useState('');
  const [downloadReadyUrl, setDownloadReadyUrl] = useState<string | null>(null);

  const [videoConfig, setVideoConfig] = useState<VideoTutorialConfig | undefined>(undefined);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load config on open
  useEffect(() => {
    if (isOpen) {
      const adminPayment = Storage.getAdminPaymentConfig();
      setVideoConfig(adminPayment.videoTutorialConfig);
      setIsPlaying(true);
      setProgress(0);
    } else {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current = null;
        } catch {
          // ignore
        }
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
    }
  }, [isOpen]);

  const chapters: Chapter[] = OFFICIAL_TUTORIAL_CHAPTERS;
  const currentChapter = chapters[currentChapterIndex] || chapters[0];

  // Calculate elapsed & total video time (total = 360 seconds = 6m 00s)
  const totalVideoDuration = chapters.reduce((acc, c) => acc + c.duration, 0); // 360s
  const elapsedSecondsBeforeCurrent = chapters.slice(0, currentChapterIndex).reduce((acc, c) => acc + c.duration, 0);
  const currentChapterElapsed = (progress / 100) * currentChapter.duration;
  const totalElapsedSeconds = Math.min(totalVideoDuration, Math.floor(elapsedSecondsBeforeCurrent + currentChapterElapsed));

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Voice narration: plays studio MP3 audio with SpeechSynthesis fallback
  useEffect(() => {
    if (!isOpen) return;

    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current = null;
      } catch {
        // ignore
      }
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (isVoiceEnabled && isPlaying && currentChapter) {
      const audioUrl = `/tutorial_audio/chapter_${currentChapter.id}.mp3`;
      const audio = new Audio(audioUrl);
      audio.playbackRate = playbackSpeed;
      audioRef.current = audio;

      const fallbackToSynth = () => {
        if (!('speechSynthesis' in window)) return;
        const textToSpeak = `${currentChapter.headline}. ${currentChapter.narration}`;
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'pt-BR';
        utterance.rate = playbackSpeed === 1.5 ? 1.25 : playbackSpeed === 1.25 ? 1.1 : 0.95;
        utterance.pitch = 1.05;

        const voices = window.speechSynthesis.getVoices();
        const ptVoices = voices.filter(v => v.lang.includes('pt-BR') || v.lang.includes('pt'));
        const femalePtVoice = ptVoices.find(v => 
          v.name.toLowerCase().includes('maria') ||
          v.name.toLowerCase().includes('luciana') ||
          v.name.toLowerCase().includes('francisca') ||
          v.name.toLowerCase().includes('leticia') ||
          v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('google português')
        ) || ptVoices[0];

        if (femalePtVoice) {
          utterance.voice = femalePtVoice;
        }

        speechRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      };

      audio.onerror = () => {
        fallbackToSynth();
      };

      audio.play().catch(() => {
        fallbackToSynth();
      });
    }

    return () => {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current = null;
        } catch {
          // ignore
        }
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentChapterIndex, isVoiceEnabled, isPlaying, isOpen, playbackSpeed, currentChapter]);

  // Progress timer for video simulation
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    const intervalTime = 100; // ms
    const durationSec = currentChapter ? currentChapter.duration : 45;
    const step = (100 / (durationSec * 10)) * playbackSpeed;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
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
  }, [isOpen, isPlaying, currentChapterIndex, playbackSpeed, currentChapter, chapters.length]);

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

  // Helper: Download Full Portuguese Social Media Script (.txt)
  const handleDownloadFullScript = () => {
    const header = `🎬 ROTEIRO OFICIAL DO VÍDEO TUTORIAL - AGENDA MAIS FÁCIL SALÃO & BARBEARIA\n`;
    const subheader = `Personagem: Luna (Apresentadora 3D Disney Pixar - Especialista em Salões)\n` +
      `Duração Total: 06:00 (6 Minutos)\n` +
      `Público-Alvo: Donos de Salão de Beleza, Barbearias, Cabeleireiros e Estética\n` +
      `------------------------------------------------------------------------\n\n`;

    const body = OFFICIAL_TUTORIAL_CHAPTERS.map(ch => {
      return `========================================================================\n` +
        `[CAPÍTULO ${ch.id}]: ${ch.title.toUpperCase()}\n` +
        `Tempo: ${ch.duration} segundos | Destaque: ${ch.badge}\n` +
        `Botão Explicado: ${ch.focusButtonName} (${ch.buttonLocation})\n` +
        `------------------------------------------------------------------------\n` +
        `FALA DE LUNA (NARRADORA):\n"${ch.narration}"\n\n` +
        `PONTOS-CHAVE NA TELA:\n` +
        ch.points.map(p => ` • ${p}`).join('\n') + `\n\n`;
    }).join('\n');

    const socialMediaCopy = `\n========================================================================\n` +
      `📱 SUGESTÃO DE LEGENDA PARA INSTAGRAM REELS, TIKTOK, YOUTUBE & WHATSAPP:\n` +
      `------------------------------------------------------------------------\n` +
      `💈 Cansado de perder tempo respondendo WhatsApp e calculando comissão no papel?\n\n` +
      `Descubra o Agenda Mais Fácil: o aplicativo completo para o seu salão e barbearia!\n` +
      `✓ Seus clientes agendam sozinhos 24 horas por dia direto pelo link na bio.\n` +
      `✓ Divisão de comissões calculada na hora sem dor de cabeça.\n` +
      `✓ Controle total de caixa (Pix, Cartão e Dinheiro).\n` +
      `✓ 100% do lucro é seu, sem taxas por agendamento!\n\n` +
      `Assista ao vídeo passo a passo completo e leve seu salão para outro nível. 🚀\n\n` +
      `#salaodebeleza #barbearia #gestaodesalao #cabeleireiro #barbeiro #agendamentoonline #agendamaisfacil #salao2026\n`;

    const fullContent = header + subheader + body + socialMediaCopy;
    const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `roteiro-video-tutorial-agenda-mais-facil-salao.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Helper: Download High-Res Images & Covers for Social Media
  const handleDownloadCoverImages = () => {
    const link = document.createElement('a');
    link.href = pixarFemaleHostImg;
    link.download = 'luna-celular-agenda-mais-facil.jpg';
    link.click();

    setTimeout(() => {
      const link2 = document.createElement('a');
      link2.href = realSalonPeopleImg;
      link2.download = 'foto-real-salao-cabeleireira-cliente.jpg';
      link2.click();
    }, 400);

    setTimeout(() => {
      const link3 = document.createElement('a');
      link3.href = realBarberClientImg;
      link3.download = 'foto-real-barbeiro-cliente-barbearia.jpg';
      link3.click();
    }, 800);
  };

  // Canvas Video Exporter: Records and generates downloadable video file (.webm / .mp4)
  const handleRecordAndDownloadVideo = async () => {
    if (isExportingVideo) return;
    setIsExportingVideo(true);
    setExportProgress(0);
    setExportMessage('Inicializando o motor de gravação de vídeo em alta definição...');

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Não foi possível inicializar o canvas 2D.');

      // Pre-load images for drawing
      const loadImg = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${src}`));
          img.src = src;
        });
      };

      const [hostImg, salonImg, barberImg] = await Promise.all([
        loadImg(pixarFemaleHostImg).catch(() => null),
        loadImg(realSalonPeopleImg).catch(() => null),
        loadImg(realBarberClientImg).catch(() => null),
      ]);

      setExportMessage('Configurando codec de vídeo compatível com redes sociais...');

      // Setup MediaRecorder
      const stream = canvas.captureStream(25); // 25 FPS
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = '';
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.start(100);

      // Fast-forward rendering loop of all 8 chapters (e.g. 50 frames per chapter = 400 frames)
      const totalFrames = 400;
      let frame = 0;

      const renderFrame = (chapterIdx: number, frameInChapter: number, maxFramesInChapter: number) => {
        const ch = OFFICIAL_TUTORIAL_CHAPTERS[chapterIdx];

        // Background dark luxury salon gradient
        const bgGrad = ctx.createLinearGradient(0, 0, 1280, 720);
        bgGrad.addColorStop(0, '#060a14');
        bgGrad.addColorStop(0.5, '#0b162c');
        bgGrad.addColorStop(1, '#050811');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 1280, 720);

        // Header Top Bar
        ctx.fillStyle = '#0b1b36';
        ctx.fillRect(0, 0, 1280, 70);
        ctx.fillStyle = '#e11d48';
        ctx.fillRect(0, 68, 1280, 3);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
        ctx.fillText('💈 AGENDA FÁCIL SALÃO & BARBEARIA', 40, 44);

        ctx.fillStyle = '#f43f5e';
        ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
        ctx.fillText(`CAPÍTULO ${ch.id}/8: ${ch.shortTitle.toUpperCase()}`, 700, 44);

        // Left Box: Luna (Disney Pixar 3D Presenter)
        ctx.fillStyle = '#0e172a';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(40, 90, 400, 440, 20);
        ctx.fill();
        ctx.stroke();

        if (hostImg) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(40, 90, 400, 380, [20, 20, 0, 0]);
          ctx.clip();
          ctx.drawImage(hostImg, 40, 90, 400, 380);
          ctx.restore();
        }

        // Hostess Badge
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.roundRect(60, 410, 360, 45, 12);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
        ctx.fillText('✨ Apresentadora Luna • Disney Pixar 3D', 80, 438);

        // Right Box: Real Salon Photos & UI Buttons
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(470, 90, 770, 440, 20);
        ctx.fill();
        ctx.stroke();

        // Right top: Real People Photo (Stylist or Barber)
        const realImgToDraw = (chapterIdx % 2 === 0) ? salonImg : barberImg;
        if (realImgToDraw) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(490, 110, 360, 220, 16);
          ctx.clip();
          ctx.drawImage(realImgToDraw, 490, 110, 360, 220);
          ctx.restore();

          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.beginPath();
          ctx.roundRect(500, 285, 340, 35, 8);
          ctx.fill();
          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
          ctx.fillText('✓ Imagens Reais: Profissionais & Clientes no Salão', 510, 308);
        }

        // Right top side: Button Highlight Panel
        ctx.fillStyle = '#082f49';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(870, 110, 350, 220, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f43f5e';
        ctx.font = '900 14px system-ui, -apple-system, sans-serif';
        ctx.fillText('BOTÃO EM DESTAQUE:', 890, 145);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
        ctx.fillText(ch.focusButtonName, 890, 180);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px system-ui, -apple-system, sans-serif';
        ctx.fillText(`Localização: ${ch.buttonLocation}`, 890, 215);

        // Animated Click Indicator
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.roundRect(890, 245, 300, 45, 12);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
        ctx.fillText('👉 Clique Aqui para Acessar', 910, 273);

        // Right bottom: Headline and Key Points
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
        ctx.fillText(ch.headline, 490, 370);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '14px system-ui, -apple-system, sans-serif';
        ch.points.slice(0, 2).forEach((p, idx) => {
          ctx.fillText(`• ${p}`, 490, 410 + (idx * 28));
        });

        // Bottom Subtitles Area (Large subtitles in Portuguese)
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 545, 1280, 155);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
        ctx.fillText('LUNA (DISNEY PIXAR):', 40, 580);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'italic 17px system-ui, -apple-system, sans-serif';
        // Wrap narration line
        const narrationSnippet = ch.narration.slice(0, 160) + '...';
        ctx.fillText(`"${narrationSnippet}"`, 40, 615);

        // Progress Bar on bottom edge
        const overallProgress = (frame / totalFrames);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 710, 1280, 10);
        ctx.fillStyle = '#10b981';
        ctx.fillRect(0, 710, 1280 * overallProgress, 10);
      };

      const framesPerChapter = Math.floor(totalFrames / chapters.length);

      const interval = setInterval(() => {
        if (frame >= totalFrames) {
          clearInterval(interval);
          setExportMessage('Finalizando codificação do arquivo de vídeo...');
          setExportProgress(100);

          setTimeout(() => {
            recorder.stop();
            recorder.onstop = async () => {
              const rawBlob = new Blob(chunks, { type: mimeType || 'video/webm' });
              setExportMessage('Convertendo vídeo para MP4 (H.264 universal)...');

              // If browser natively produced mp4
              if (mimeType && mimeType.includes('mp4')) {
                const videoUrl = URL.createObjectURL(rawBlob);
                setDownloadReadyUrl(videoUrl);
                const dl = document.createElement('a');
                dl.href = videoUrl;
                dl.download = `video_tutorial_agende_mais_facil_luna.mp4`;
                dl.click();
                setIsExportingVideo(false);
                setExportMessage('');
                return;
              }

              // Otherwise convert via backend ffmpeg to MP4
              try {
                const resp = await fetch('/api/convert-to-mp4', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/octet-stream' },
                  body: rawBlob
                });
                if (resp.ok) {
                  const mp4Blob = await resp.blob();
                  const videoUrl = URL.createObjectURL(mp4Blob);
                  setDownloadReadyUrl(videoUrl);
                  const dl = document.createElement('a');
                  dl.href = videoUrl;
                  dl.download = `video_tutorial_agende_mais_facil_luna.mp4`;
                  dl.click();
                } else {
                  // Fallback: direct download official MP4
                  window.location.href = '/api/download-tutorial-mp4';
                }
              } catch {
                window.location.href = '/api/download-tutorial-mp4';
              } finally {
                setIsExportingVideo(false);
                setExportMessage('');
              }
            };
          }, 600);
          return;
        }

        const chapterIdx = Math.min(Math.floor(frame / framesPerChapter), chapters.length - 1);
        const frameInChapter = frame % framesPerChapter;
        renderFrame(chapterIdx, frameInChapter, framesPerChapter);

        frame++;
        setExportProgress(Math.round((frame / totalFrames) * 100));
        setExportMessage(`Gravando Capítulo ${chapterIdx + 1} de 8: "${chapters[chapterIdx].shortTitle}" (${Math.round((frame / totalFrames) * 100)}%)`);
      }, 40); // 40ms per frame = high-speed rendering (~16 seconds total)

    } catch (err: any) {
      console.error('Erro ao gravar vídeo:', err);
      setIsExportingVideo(false);
      alert('Não foi possível gerar a gravação automática no seu navegador: ' + (err?.message || err));
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[90] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-rose-500/60 rounded-3xl w-full max-w-5xl text-white shadow-2xl relative my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[96vh]">
        
        {/* Top Header Bar of the Video Studio */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-rose-600 to-pink-600 rounded-xl text-white shadow-md shadow-rose-600/30 flex items-center justify-center shrink-0">
              <Film className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-rose-400">
                  Estúdio de Vídeo Oficial • Passo a Passo do Proprietário
                </span>
                <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-yellow-400" />
                  6 Minutos (5 a 7 min)
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5 mt-0.5">
                <span>Agenda Mais Fácil Salão &amp; Barbearia</span>
                <span className="text-slate-400 font-normal text-xs hidden sm:inline">• Apresentadora Luna (Disney Pixar) + Pessoas Reais</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Open Standalone Dedicated Video Player */}
            <a
              href="/video.html"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Abrir Player Externo dedicado (Tela Cheia, Gravação MP4 e Narração com Luna)"
            >
              <ExternalLink className="w-3.5 h-3.5 text-purple-300" />
              <span className="hidden sm:inline">Player Externo</span>
            </a>

            {/* Quick Action: Direct Official MP4 Download */}
            <a
              href="/api/download-tutorial-mp4"
              download="video_tutorial_agenda_mais_facil_luna.mp4"
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-950/50 transition-all active:scale-95 cursor-pointer"
              title="Baixar o Vídeo Oficial Completo em formato MP4 (H.264) para WhatsApp, Instagram e TikTok"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">Baixar Vídeo (.mp4)</span>
              <span className="sm:hidden">MP4</span>
            </a>

            {/* Quick Action: Download Full Portuguese Script */}
            <button
              type="button"
              onClick={handleDownloadFullScript}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Baixar Roteiro Completo com Falas e Legendas em Português para Redes Sociais (.txt)"
            >
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden md:inline">Roteiro (.txt)</span>
            </button>

            {/* Quick Action: Download High-Res Photos */}
            <button
              type="button"
              onClick={handleDownloadCoverImages}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Baixar Fotos em Alta Resolução (Apresentadora Disney Pixar e Fotos Reais do Salão)"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden lg:inline">Fotos HD</span>
            </button>

            <button
              onClick={() => setShowChaptersMenu(!showChaptersMenu)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <span>Capítulos ({currentChapterIndex + 1}/{chapters.length})</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
              title="Fechar Vídeo"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Rendering Progress Banner if active */}
        {isExportingVideo && (
          <div className="bg-emerald-950 border-b border-emerald-500/50 p-3 flex items-center justify-between gap-4 animate-in slide-in-from-top duration-150 shrink-0">
            <div className="flex items-center gap-2.5">
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin shrink-0" />
              <div>
                <span className="text-xs font-black text-emerald-300 block">
                  Gravando e Exportando Vídeo para as suas Redes Sociais...
                </span>
                <span className="text-[11px] text-slate-300">
                  {exportMessage}
                </span>
              </div>
            </div>
            <div className="w-32 bg-slate-900 h-2 rounded-full overflow-hidden border border-emerald-800 shrink-0">
              <div 
                className="bg-emerald-400 h-full transition-all duration-150"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Chapters Dropdown Drawer */}
        {showChaptersMenu && (
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
                      ? 'bg-rose-600/20 border-rose-400 text-white font-bold'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-xs truncate">
                    <span className="block font-semibold text-[10px] text-slate-400 uppercase">Capítulo {ch.id} ({ch.duration}s)</span>
                    <span className="truncate block">{ch.title}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Main Stage: Disney Pixar Character + Real People Photos + High-Fidelity UI Buttons */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col gap-4">
          
          {/* Studio Canvas / Split Presentation Screen */}
          <div className="w-full bg-slate-950 rounded-3xl border-2 border-rose-500/40 shadow-2xl overflow-hidden flex flex-col">
            
            {/* Top Stage Header */}
            <div className="bg-[#0b1b36] border-b border-sky-900/60 p-2 sm:p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="bg-rose-600/30 border border-rose-500/50 text-rose-300 text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5" />
                  <span>💈 {salonName}</span>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Vídeo Passo a Passo Fidedigno</span>
                </div>
              </div>

              {/* Real Buttons Mockup Strip */}
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] font-bold">
                <div className={`px-3 py-1.5 rounded-xl flex items-center gap-1 shadow transition-all ${
                  currentChapter.mockupType === 'clientlink'
                    ? 'bg-rose-600 text-white ring-4 ring-rose-500/50 scale-105 animate-pulse'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}>
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Criar Link p/ Clientes</span>
                </div>
                <div className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-all ${
                  currentChapter.mockupType === 'login'
                    ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-400/50 font-black'
                    : 'bg-amber-600/30 border border-amber-500/40 text-amber-300'
                }`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Entrada Salão (Login)</span>
                </div>
                <div className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl flex items-center gap-1 shadow">
                  <span>Licença Ativa</span>
                </div>
              </div>
            </div>

            {/* Split Screen View or Custom/Uploaded Video Player */}
            {videoConfig?.useInteractivePlayer === false && videoConfig?.customVideoUrl ? (
              <div className="w-full bg-black min-h-[420px] flex flex-col items-center justify-center p-2 relative">
                <video
                  src={videoConfig.customVideoUrl}
                  controls
                  autoPlay
                  className="w-full max-h-[500px] object-contain rounded-2xl border border-slate-800"
                />
                <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Reproduzindo vídeo anexado do seu computador / link direto</span>
                </div>
              </div>
            ) : videoConfig?.useInteractivePlayer === false && videoConfig?.youtubeUrl ? (
              <div className="w-full bg-black min-h-[420px] flex items-center justify-center relative">
                <iframe
                  src={
                    videoConfig.youtubeUrl.includes('watch?v=')
                      ? videoConfig.youtubeUrl.replace('watch?v=', 'embed/')
                      : videoConfig.youtubeUrl.includes('youtu.be/')
                      ? videoConfig.youtubeUrl.replace('youtu.be/', 'www.youtube.com/embed/')
                      : videoConfig.youtubeUrl
                  }
                  className="w-full h-[450px] border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Tutorial Oficial"
                />
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 min-h-[360px] bg-slate-900/90 border-b border-slate-800">
              
              {/* LEFT: Luna (Disney Pixar 3D Animated Female Presenter) */}
              <div className="md:col-span-5 p-4 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between bg-gradient-to-b from-slate-900 to-slate-950 relative overflow-hidden">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="bg-rose-600/30 text-rose-300 border border-rose-500/50 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-yellow-300" />
                      Apresentadora Luna • Disney Pixar
                    </span>
                    {isPlaying && isVoiceEnabled && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>Falando em Português</span>
                      </span>
                    )}
                  </div>

                  {/* Pixar Presenter Image Box with Talking Glow */}
                  <div className={`relative rounded-2xl overflow-hidden border-2 transition-all shadow-xl aspect-[4/3] bg-black ${
                    isPlaying && isVoiceEnabled 
                      ? 'border-rose-500 ring-4 ring-rose-500/20 shadow-rose-950/50' 
                      : 'border-slate-800'
                  }`}>
                    <img 
                      src={pixarFemaleHostImg} 
                      alt="Luna - Apresentadora 3D Disney Pixar" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />

                    {/* Animated Microphone / Soundwave Pill */}
                    <div className="absolute bottom-2 left-2 right-2 bg-slate-950/80 backdrop-blur-md border border-white/20 p-2 rounded-xl flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${isPlaying && isVoiceEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                        <span className="font-bold text-white">Luna (Especialista em Salões)</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {isPlaying && isVoiceEnabled ? 'Áudio Ativo • pt-BR' : 'Pausado'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Chapter Context Under Luna */}
                <div className="mt-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                    <span>CAPÍTULO ATUAL:</span>
                    <span className="text-rose-400">{currentChapter.id} de {chapters.length}</span>
                  </div>
                  <strong className="text-white block text-xs truncate">{currentChapter.title}</strong>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    {currentChapter.points[0]}
                  </p>
                </div>
              </div>

              {/* RIGHT: Real People Photos & Authentic Button Mockups */}
              <div className="md:col-span-7 p-4 sm:p-5 flex flex-col justify-between space-y-4">
                
                {/* Real People Photo & Button Highlight Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Real Photo Box */}
                  <div className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 relative group shadow-md">
                    <img 
                      src={currentChapter.id % 2 === 0 ? realBarberClientImg : realSalonPeopleImg} 
                      alt="Profissionais Reais em Ação no Salão e Barbearia" 
                      className="w-full h-32 sm:h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent flex items-end p-2.5">
                      <span className="text-[10px] font-bold text-emerald-300 bg-slate-950/80 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                        ✓ Pessoas Reais: {currentChapter.id % 2 === 0 ? 'Barbeiro & Cliente' : 'Cabeleireira & Cliente'}
                      </span>
                    </div>
                  </div>

                  {/* Focused Button Card */}
                  <div className="bg-slate-950 p-3.5 rounded-2xl border-2 border-sky-500/40 flex flex-col justify-between space-y-2">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 block">
                        Botão em Foco no Vídeo:
                      </span>
                      <h4 className="text-sm font-black text-white mt-0.5">
                        {currentChapter.focusButtonName}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        📍 Onde encontrar: <strong>{currentChapter.buttonLocation}</strong>
                      </p>
                    </div>

                    <div className="pt-1">
                      <div className="bg-sky-950/80 border border-sky-500/40 text-sky-200 text-[11px] font-bold p-2 rounded-xl flex items-center gap-1.5 shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Ação fidedigna gravada no vídeo</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simulated Tab View corresponding to chapter */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                      <currentChapter.icon className="w-3.5 h-3.5" />
                      <span>{currentChapter.badge}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      Passo a Passo em Alta Resolução
                    </span>
                  </div>

                  {/* Chapter-specific dynamic mockups */}
                  {currentChapter.mockupType === 'importance' && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/30">
                        <span className="font-black text-emerald-400 text-sm">100% SEU LUCRO</span>
                        <p className="text-[10px] text-slate-300 mt-0.5">Sem cobrança de porcentagem por corte ou barba.</p>
                      </div>
                      <div className="bg-blue-950/40 p-2.5 rounded-xl border border-blue-500/30">
                        <span className="font-black text-blue-400 text-sm">24H ONLINE</span>
                        <p className="text-[10px] text-slate-300 mt-0.5">Seus clientes agendam sozinhos a qualquer hora.</p>
                      </div>
                    </div>
                  )}

                  {currentChapter.mockupType === 'login' && (
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">1. CPF do Proprietário:</span>
                        <strong className="text-white font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">123.456.789-00</strong>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">2. Senha / Token de Licença:</span>
                        <strong className="text-emerald-400 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">TOK-SALAO-2026</strong>
                      </div>
                      <div className="bg-emerald-950/60 text-emerald-300 text-[10px] p-1.5 rounded text-center font-bold">
                        ✓ Botão "Entrar como Salão" libera o painel na hora!
                      </div>
                    </div>
                  )}

                  {currentChapter.mockupType === 'clientlink' && (
                    <div className="bg-slate-900 p-3 rounded-xl border-2 border-rose-500/50 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-rose-300 font-mono text-[11px] bg-slate-950 p-2 rounded-lg border border-slate-800">
                        <span className="truncate">https://agenda-f-cil-sal-o.vercel.app/?action=cliente</span>
                        <span className="bg-rose-600 text-white font-bold px-2 py-0.5 rounded text-[10px] shrink-0 ml-2">Copiar</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        📲 <strong>Instrução da Luna:</strong> Cole esse link no perfil do Instagram e envie no WhatsApp para seus clientes.
                      </p>
                    </div>
                  )}

                  {currentChapter.mockupType === 'services' && (
                    <div className="space-y-1.5 text-xs">
                      <div className="bg-slate-900 p-2 rounded-xl flex items-center justify-between">
                        <span className="font-bold text-white">✂️ Corte Degradê Masculino</span>
                        <span className="text-emerald-400 font-bold">R$ 35,00 • 30 min</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-xl flex items-center justify-between">
                        <span className="font-bold text-white">💈 Barba Terapia Completa</span>
                        <span className="text-emerald-400 font-bold">R$ 25,00 • 20 min</span>
                      </div>
                    </div>
                  )}

                  {currentChapter.mockupType === 'team' && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-900 p-2 rounded-xl">
                        <span className="font-bold text-white block">👨‍🦱 Michael (Barbeiro)</span>
                        <span className="text-sky-400 font-black text-[11px]">70% Comissão</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-xl">
                        <span className="font-bold text-white block">🧔 Marlon (Especialista)</span>
                        <span className="text-sky-400 font-black text-[11px]">60% Comissão</span>
                      </div>
                    </div>
                  )}

                  {currentChapter.mockupType === 'agenda' && (
                    <div className="space-y-1.5 text-xs">
                      <div className="bg-slate-900 p-2 rounded-xl flex items-center justify-between">
                        <span className="text-slate-300">10:00 - Carlos Silva (Corte)</span>
                        <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded">Agendado</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-xl flex items-center justify-between">
                        <span className="text-slate-300">10:30 - Rafael Souza (Barba)</span>
                        <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded">Em Atendimento</span>
                      </div>
                    </div>
                  )}

                  {currentChapter.mockupType === 'caixa' && (
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-emerald-950/40 p-2 rounded-xl border border-emerald-500/30">
                        <span className="text-[10px] text-slate-400 block">Pix</span>
                        <strong className="text-emerald-400 font-bold">R$ 480,00</strong>
                      </div>
                      <div className="bg-blue-950/40 p-2 rounded-xl border border-blue-500/30">
                        <span className="text-[10px] text-slate-400 block">Cartão</span>
                        <strong className="text-blue-400 font-bold">R$ 260,00</strong>
                      </div>
                      <div className="bg-amber-950/40 p-2 rounded-xl border border-amber-500/30">
                        <span className="text-[10px] text-slate-400 block">Dinheiro</span>
                        <strong className="text-amber-400 font-bold">R$ 100,00</strong>
                      </div>
                    </div>
                  )}

                  {currentChapter.mockupType === 'install' && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-900 p-2 rounded-xl">
                        <span className="font-bold text-emerald-400 block">🤖 No Android:</span>
                        <p className="text-[10px] text-slate-300 mt-0.5">Chrome ➔ 3 pontinhos ➔ Instalar app.</p>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-xl">
                        <span className="font-bold text-sky-400 block">🍎 No iPhone:</span>
                        <p className="text-[10px] text-slate-300 mt-0.5">Safari ➔ Compartilhar ➔ Tela de Início.</p>
                      </div>
                    </div>
                  )}

                </div>

              </div>

            </div>
            )}

          </div>

          {/* Spoken Portuguese Narration & High-Contrast Subtitles */}
          <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-4 space-y-3 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="bg-rose-600 text-white text-xs font-black px-2.5 py-1 rounded-xl shadow-sm">
                  {currentChapter.badge}
                </span>
                <h4 className="font-extrabold text-sm sm:text-base text-white">
                  {currentChapter.headline}
                </h4>
              </div>

              <div className="flex items-center gap-2">
                {/* Voice Narration Toggle */}
                <button
                  onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                  className={`p-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                    isVoiceEnabled
                      ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                  title={isVoiceEnabled ? 'Desativar Fala em Português' : 'Ativar Fala em Português'}
                >
                  {isVoiceEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                  <span className="hidden sm:inline">{isVoiceEnabled ? 'Voz Luna Ligada' : 'Voz Desligada'}</span>
                </button>

                {/* Playback Speed */}
                <div className="flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700 text-xs font-bold">
                  {[1, 1.25, 1.5].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => setPlaybackSpeed(speed)}
                      className={`px-2 py-1 rounded-lg transition-all ${
                        playbackSpeed === speed ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Subtitle Box in Portuguese */}
            <div className="bg-slate-900/90 border border-rose-500/30 p-3.5 rounded-xl flex items-start gap-2.5 shadow-inner">
              <div className="p-1 bg-rose-500/20 text-rose-300 rounded-lg shrink-0 mt-0.5">
                <Volume2 className="w-4 h-4 animate-pulse text-rose-400" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                  FALA DE LUNA (EM PORTUGUÊS):
                </span>
                <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed italic">
                  "{currentChapter.narration}"
                </p>
              </div>
            </div>

            {/* Bullet Points */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {currentChapter.points.map((point, pIdx) => (
                <div key={pIdx} className="flex items-start gap-2 text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{point}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Video Player Timeline & Controls Bar */}
        <div className="bg-slate-950 px-4 py-3 border-t border-slate-800 flex flex-col gap-2 shrink-0">
          
          {/* Progress Timeline */}
          <div 
            className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden relative cursor-pointer group"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const newProgress = (clickX / rect.width) * 100;
              setProgress(Math.max(0, Math.min(100, newProgress)));
            }}
          >
            <div 
              className="bg-gradient-to-r from-rose-500 via-pink-500 to-emerald-400 h-full rounded-full transition-all duration-100"
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
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition-all active:scale-95 cursor-pointer"
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
                title="Reiniciar Vídeo"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Time / Chapter info */}
            <div className="text-xs text-slate-400 font-semibold flex items-center gap-2">
              <span className="hidden sm:inline">Capítulo {currentChapterIndex + 1} de {chapters.length}:</span>
              <strong className="text-white">{currentChapter.shortTitle}</strong>
              <span className="bg-slate-800 px-2 py-0.5 rounded font-mono text-[11px] text-emerald-400 border border-slate-700">
                {formatTime(totalElapsedSeconds)} / {formatTime(totalVideoDuration)}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
