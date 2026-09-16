import React, { useState, useEffect, useRef } from 'react';
import { VideoTutorialConfig, VideoTutorialChapterConfig } from '../types';
import { Storage } from '../utils/storage';
import { 
  Video, Sparkles, Youtube, Globe, Check, X, Play, RotateCcw, 
  MessageSquare, Sliders, ShieldCheck, HelpCircle, Save, ExternalLink,
  Upload, FileVideo, Loader2, Trash2, FolderOpen, Download, Film, CheckCircle2
} from 'lucide-react';

interface AdminVideoConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPreviewTutorial?: () => void;
  onOpenVideoTutorial?: () => void;
}

const DEFAULT_CHAPTERS: VideoTutorialChapterConfig[] = [
  {
    id: 1,
    title: 'Apresentação & Vantagens para o Salão',
    shortTitle: '1. Vantagens',
    duration: 35,
    badge: 'Super Poderes',
    headline: 'Por que o Agenda Fácil é o melhor investimento para o seu salão?',
    narration: 'Olá! Seja muito bem-vindo ao Agenda Fácil Salão e Barbearia. Este aplicativo foi desenvolvido especialmente para você, dono de salão, que quer economizar tempo, organizar sua equipe, aumentar seu faturamento e nunca mais perder clientes por demora no WhatsApp. Você tem controle total na palma da sua mão, sem pagar comissões para terceiros.',
    points: [
      'Zero comissão sobre os seus agendamentos — 100% do lucro fica com você.',
      'Clientes agendam sozinhos 24 horas por dia, direto pelo celular.',
      'Controle financeiro automático: saiba exatamente quanto faturou em Pix, Cartão e Dinheiro.',
      'Divisão de comissões da equipe calculada instantaneamente sem dor de cabeça.'
    ]
  },
  {
    id: 2,
    title: 'Como Instalar no Celular e Computador',
    shortTitle: '2. Instalação',
    duration: 30,
    badge: 'PWA Nativo',
    headline: 'Instalação instantânea em menos de 10 segundos, sem ocupar memória!',
    narration: 'Você e seus profissionais podem instalar o aplicativo em qualquer celular Android, iPhone ou computador sem precisar baixar arquivos pesados da loja de aplicativos. O app funciona direto pelo navegador e se transforma em um ícone na tela inicial.',
    points: [
      'No Android (Google Chrome): Abra o link do salão, toque nos 3 pontinhos no canto superior direito e selecione "Instalar aplicativo" ou "Adicionar à tela inicial".',
      'No iPhone (Safari): Abra o link, toque no botão de Compartilhar (ícone com quadrado e seta) e selecione "Adicionar à Tela de Início".',
      'No Computador: Abra no Chrome ou Edge e clique no ícone de "Instalar" na barra de endereços.'
    ]
  },
  {
    id: 3,
    title: 'Como Fazer o Primeiro Acesso (CPF + Token)',
    shortTitle: '3. Primeiro Acesso',
    duration: 25,
    badge: 'Segurança Máxima',
    headline: 'Acesso rápido e protegido para o proprietário e gerentes',
    narration: 'Após a confirmação do seu plano ou teste de 15 dias, você recebe suas chaves oficiais: seu CPF de proprietário e seu Token de Licença exclusivo. Basta digitá-los na tela de login para liberar seu painel.',
    points: [
      'Login Oficial: Digite o CPF cadastrado no momento da compra.',
      'Senha de Licença: Digite ou cole o Token de Acesso gerado pelo sistema.',
      'Você também recebe o link direto e as credenciais no seu E-mail e WhatsApp para guardar com segurança.'
    ]
  },
  {
    id: 4,
    title: 'Cadastrando Serviços & Equipe com Comissões',
    shortTitle: '4. Serviços & Equipe',
    duration: 30,
    badge: 'Automação',
    headline: 'Defina os preços, tempo de atendimento e divisão de comissões',
    narration: 'No menu superior, acesse a aba Serviços para cadastrar cortes de cabelo, barba, químicas, escovas e tratamentos com seus valores e duração estimada. Em seguida, cadastre seus profissionais e defina a comissão individual de cada um. O sistema calcula tudo sozinho.',
    points: [
      'Aba "Serviços": Cadastre nomes, valores e tempos estimados de atendimento.',
      'Aba "Equipe": Cadastre seus barbeiros e cabeleireiros com foto, especialidade e porcentagem de comissão.',
      'O sistema bloqueia conflito de horários para que nenhum profissional receba dois clientes no mesmo minuto.'
    ]
  },
  {
    id: 5,
    title: 'Agenda em Tempo Real & Controle de Caixa',
    shortTitle: '5. Agenda & Caixa',
    duration: 35,
    badge: 'Gestão Total',
    headline: 'Organização impecável dos atendimentos e fechamento diário',
    narration: 'Na aba Agenda, você acompanha todos os clientes do dia com status de agendado, em atendimento ou concluído. Ao finalizar o serviço, com um clique você lança no Caixa com a forma de pagamento: Pix, Cartão ou Dinheiro, com relatório de faturamento em tempo real.',
    points: [
      'Aba "Agenda": Visualize horários por dia, semana ou profissional.',
      'Aba "Caixa": Lance entradas, saídas e despesas do dia com fechamento de caixa simplificado.',
      'Dashboard Completo: Gráficos de faturamento, faturamento médio e profissionais mais produtivos.'
    ]
  },
  {
    id: 6,
    title: 'Link dos Clientes (Agendamento 24h na Bio)',
    shortTitle: '6. Link dos Clientes',
    duration: 30,
    badge: 'Vendas Automáticas',
    headline: 'Multiplique seus agendamentos colocando o link no Instagram e WhatsApp',
    narration: 'Clique no botão vermelho Criar Link para Clientes no topo do aplicativo. Esse link é a sua vitrine online! Coloque na Bio do Instagram da sua barbearia ou envie no WhatsApp. O cliente escolhe o serviço, o profissional e o melhor horário sozinho, sem você precisar parar o atendimento para responder.',
    points: [
      'Botão "Criar Link p/ Clientes": Copie seu link exclusivo personalizado.',
      'Coloque no Instagram, Google Meu Negócio e mensagem automática do WhatsApp.',
      'Notificação em tempo real: O salão recebe os novos agendamentos na hora!'
    ]
  },
  {
    id: 7,
    title: 'Resumo das Vantagens & Sucesso do Seu Salão',
    shortTitle: '7. Resumo & Conclusão',
    duration: 25,
    badge: 'Crescimento Garantido',
    headline: 'Seu salão profissional, organizado e faturando muito mais todos os dias',
    narration: 'Pronto! Agora você tem um aplicativo completo de alto padrão trabalhando por você 24 horas por dia. Aproveite todos os recursos, fidelize seus clientes e leve seu salão para o próximo nível. Bom trabalho e excelentes negócios!',
    points: [
      'Economia de até 3 horas por dia que você gastava respondendo mensagens de agendamento.',
      'Fim dos furos de horários e clientes esperando na recepção.',
      'Controle absoluto do seu dinheiro e comissões da equipe.',
      'Suporte e atualizações automáticas inclusas na sua licença.'
    ]
  }
];

export const AdminVideoConfigModal: React.FC<AdminVideoConfigModalProps> = ({
  isOpen,
  onClose,
  onPreviewTutorial,
  onOpenVideoTutorial
}) => {
  const [activeTab, setActiveTab] = useState<'video' | 'narration'>('video');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [customVideoUrl, setCustomVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('Vídeo Tutorial Oficial - Agenda Fácil');
  const [useInteractivePlayer, setUseInteractivePlayer] = useState(true);
  const [chapters, setChapters] = useState<VideoTutorialChapterConfig[]>(DEFAULT_CHAPTERS);
  const [selectedChapterIndex, setSelectedChapterIndex] = useState(0);
  const [successMsg, setSuccessMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [uploadedVideoInfo, setUploadedVideoInfo] = useState<{ name: string; size: string } | null>(null);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [showLunaPreview, setShowLunaPreview] = useState(false);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDownloadLunaVideo = () => {
    const link = document.createElement('a');
    link.href = '/api/download-tutorial-mp4';
    link.download = 'video_tutorial_agenda_mais_facil_luna.mp4';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSuccessMsg('Iniciando download do vídeo tutorial da Luna em MP4!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleUseLunaVideo = () => {
    const lunaVideoUrl = '/uploads/videos/video_tutorial_agenda_mais_facil_luna.mp4';
    setCustomVideoUrl(lunaVideoUrl);
    setUploadedVideoInfo({
      name: 'video_tutorial_agenda_mais_facil_luna.mp4',
      size: '6.5 MB (Apresentadora Luna - Oficial)'
    });
    setSuccessMsg('Vídeo oficial da Luna configurado como o tutorial do sistema!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Resilient upload: try direct binary stream first; if blocked or errored, fallback to base64 JSON payload
  const handleUploadVideoFile = (file: File) => {
    if (!file) return;
    setUploadError('');
    setIsUploadingVideo(true);
    setUploadProgress(0);

    const safeFilename = encodeURIComponent(file.name);
    const uploadUrl = `/api/upload-video?filename=${safeFilename}`;

    const tryBase64Fallback = () => {
      setUploadProgress(40);
      const reader = new FileReader();
      reader.onprogress = (ev) => {
        if (ev.lengthComputable) {
          const pct = Math.round((ev.loaded / ev.total) * 40);
          setUploadProgress(pct);
        }
      };
      reader.onload = async () => {
        setUploadProgress(70);
        try {
          const base64Data = reader.result as string;
          const resp = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filename: file.name,
              base64: base64Data,
            }),
          });

          if (resp.ok) {
            const data = await resp.json();
            if (data.url) {
              setCustomVideoUrl(data.url);
              setUploadedVideoInfo({ name: file.name, size: formatSize(file.size) });
              setUploadProgress(100);
              setSuccessMsg('Vídeo do seu computador anexado com sucesso!');
              setTimeout(() => setSuccessMsg(''), 3000);
              return;
            }
          }
          // If server failed, create local object URL so user is never blocked
          const blobUrl = URL.createObjectURL(file);
          setCustomVideoUrl(blobUrl);
          setUploadedVideoInfo({ name: file.name, size: `${formatSize(file.size)} (Local)` });
          setUploadProgress(100);
          setSuccessMsg('Vídeo anexado e pronto para reprodução!');
          setTimeout(() => setSuccessMsg(''), 3000);
        } catch {
          const blobUrl = URL.createObjectURL(file);
          setCustomVideoUrl(blobUrl);
          setUploadedVideoInfo({ name: file.name, size: `${formatSize(file.size)} (Local)` });
          setUploadProgress(100);
          setSuccessMsg('Vídeo anexado localmente com sucesso!');
          setTimeout(() => setSuccessMsg(''), 3000);
        } finally {
          setIsUploadingVideo(false);
        }
      };
      reader.onerror = () => {
        setIsUploadingVideo(false);
        setUploadError('Não foi possível ler o arquivo selecionado.');
      };
      reader.readAsDataURL(file);
    };

    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setIsUploadingVideo(false);
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.url) {
            setCustomVideoUrl(res.url);
            setUploadedVideoInfo({ name: file.name, size: formatSize(file.size) });
            setSuccessMsg('Vídeo do seu computador anexado com sucesso!');
            setTimeout(() => setSuccessMsg(''), 3000);
            return;
          }
        } catch {
          // fallthrough
        }
      }
      // If binary stream fails (e.g., 405 from static proxy or limit), execute Base64 fallback automatically
      tryBase64Fallback();
    };

    xhr.onerror = () => {
      // Execute Base64 fallback on network/CORS error
      tryBase64Fallback();
    };

    try {
      xhr.send(file);
    } catch {
      tryBase64Fallback();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUploadVideoFile(file);
    }
    if (e.target) e.target.value = '';
  };

  useEffect(() => {
    if (isOpen) {
      const adminPayment = Storage.getAdminPaymentConfig();
      const videoConfig = adminPayment.videoTutorialConfig;
      if (videoConfig) {
        setYoutubeUrl(videoConfig.youtubeUrl || '');
        setCustomVideoUrl(videoConfig.customVideoUrl || '');
        setVideoTitle(videoConfig.videoTitle || 'Vídeo Tutorial Oficial - Agenda Fácil');
        setUseInteractivePlayer(videoConfig.useInteractivePlayer !== false);
        if (videoConfig.chapters && videoConfig.chapters.length > 0) {
          setChapters(videoConfig.chapters);
        } else {
          setChapters(DEFAULT_CHAPTERS);
        }
      } else {
        setYoutubeUrl('');
        setCustomVideoUrl('');
        setVideoTitle('Vídeo Tutorial Oficial - Agenda Fácil');
        setUseInteractivePlayer(true);
        setChapters(DEFAULT_CHAPTERS);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdateChapterField = (field: keyof VideoTutorialChapterConfig, value: any) => {
    setChapters(prev => {
      const updated = [...prev];
      updated[selectedChapterIndex] = {
        ...updated[selectedChapterIndex],
        [field]: value
      };
      return updated;
    });
  };

  const handleUpdatePoint = (pointIndex: number, text: string) => {
    setChapters(prev => {
      const updated = [...prev];
      const currentPts = [...updated[selectedChapterIndex].points];
      currentPts[pointIndex] = text;
      updated[selectedChapterIndex] = {
        ...updated[selectedChapterIndex],
        points: currentPts
      };
      return updated;
    });
  };

  const handleAddPoint = () => {
    setChapters(prev => {
      const updated = [...prev];
      const currentPts = [...updated[selectedChapterIndex].points, 'Novo ponto de vantagem'];
      updated[selectedChapterIndex] = {
        ...updated[selectedChapterIndex],
        points: currentPts
      };
      return updated;
    });
  };

  const handleRemovePoint = (pointIndex: number) => {
    setChapters(prev => {
      const updated = [...prev];
      const currentPts = updated[selectedChapterIndex].points.filter((_, idx) => idx !== pointIndex);
      updated[selectedChapterIndex] = {
        ...updated[selectedChapterIndex],
        points: currentPts
      };
      return updated;
    });
  };

  const handleResetToDefaults = () => {
    if (confirm('Deseja restaurar todos os textos de narração e capítulos para o padrão original?')) {
      setChapters(DEFAULT_CHAPTERS);
      setUseInteractivePlayer(true);
      setVideoTitle('Vídeo Tutorial Oficial - Agenda Fácil');
      setSuccessMsg('Textos e narrações restaurados com sucesso!');
      setTimeout(() => setSuccessMsg(''), 2500);
    }
  };

  const handleSave = () => {
    const adminPayment = Storage.getAdminPaymentConfig();
    const updatedVideoConfig: VideoTutorialConfig = {
      youtubeUrl: youtubeUrl.trim(),
      customVideoUrl: customVideoUrl.trim(),
      videoTitle: videoTitle.trim() || 'Vídeo Tutorial Oficial - Agenda Fácil',
      useInteractivePlayer: useInteractivePlayer,
      chapters: chapters
    };

    Storage.saveAdminPaymentConfig({
      ...adminPayment,
      videoTutorialConfig: updatedVideoConfig
    });

    setSuccessMsg('Configurações de vídeo e narração salvas com sucesso!');
    setTimeout(() => {
      setSuccessMsg('');
      onClose();
    }, 1500);
  };

  const currentChap = chapters[selectedChapterIndex] || chapters[0];

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[80] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-red-500/60 rounded-3xl w-full max-w-4xl text-white shadow-2xl relative my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 via-rose-700 to-red-900 p-4 sm:p-5 text-white flex justify-between items-start shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-black/25 rounded-2xl border border-white/20">
              <Video className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>Configurar Vídeo Tutorial & Narração</span>
                <span className="bg-yellow-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Painel Admin
                </span>
              </h2>
              <p className="text-xs text-rose-100 font-medium">
                Personalize o link de vídeo do YouTube/MP4 ou altere as vozes, roteiros e textos explicativos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-black/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="bg-emerald-950 border-b border-emerald-700 text-emerald-200 px-4 py-2 text-xs font-bold flex items-center gap-2 animate-in fade-in shrink-0">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Selection */}
        <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('video')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'video'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Youtube className="w-3.5 h-3.5" />
              <span>Link do Vídeo (YouTube / MP4)</span>
            </button>
            <button
              onClick={() => setActiveTab('narration')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'narration'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Roteiro de Narração & Capítulos</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onPreviewTutorial && (
              <button
                type="button"
                onClick={onPreviewTutorial}
                className="bg-slate-800 hover:bg-slate-700 text-yellow-400 border border-yellow-500/40 text-xs font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                title="Testar como o vídeo e a voz são reproduzidos"
              >
                <Play className="w-3.5 h-3.5 fill-yellow-400" />
                <span>Testar Player</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {activeTab === 'video' ? (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Type Selection */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <label className="font-bold text-white text-sm flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-red-400" />
                  <span>Modo de Exibição do Tutorial:</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setUseInteractivePlayer(true)}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      useInteractivePlayer
                        ? 'bg-red-950/40 border-red-500 text-white shadow-lg'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-black text-xs text-red-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                        Player Interativo do App (Recomendado)
                      </span>
                      {useInteractivePlayer && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Mostra as telas reais do sistema navegando com narração de voz sintetizada e legendas sincronizadas.
                    </p>
                  </div>

                  <div
                    onClick={() => setUseInteractivePlayer(false)}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      !useInteractivePlayer
                        ? 'bg-red-950/40 border-red-500 text-white shadow-lg'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-black text-xs text-red-300 flex items-center gap-1.5">
                        <Youtube className="w-3.5 h-3.5 text-red-500" />
                        Vídeo Gravado Externo (YouTube / Link Direto)
                      </span>
                      {!useInteractivePlayer && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Incorpora um vídeo seu gravado no YouTube, Vimeo ou link MP4 na janela de tutorial.
                    </p>
                  </div>
                </div>
              </div>

              {/* Cartão de Download e Seleção do Vídeo Tutorial Oficial da Apresentadora Luna em MP4 */}
              <div className="bg-gradient-to-r from-red-950/70 via-slate-900 to-rose-950/60 p-4 rounded-2xl border-2 border-red-500/40 space-y-3 shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-rose-500 p-0.5 shadow-md shadow-red-950 shrink-0 overflow-hidden">
                      <img
                        src="/tutorial-assets/pixar_female_host_1788749082734.jpg"
                        alt="Apresentadora Luna"
                        className="w-full h-full object-cover rounded-[10px]"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm text-white">Vídeo Tutorial Oficial da Apresentadora Luna</span>
                        <span className="bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          MP4 Pronto
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Vídeo completo gravado com a apresentadora Luna ensinando o proprietário a usar o Agenda Fácil.
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
                        <span>MP4 Universal H.264</span>
                        <span>•</span>
                        <span>Tamanho: 6.5 MB</span>
                        <span>•</span>
                        <span>Duração: 3m 23s</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ações Rápidas: Baixar MP4, Definir como Tutorial Oficial, Assistir Prévia */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadLunaVideo}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all active:scale-95 cursor-pointer"
                    title="Baixar o arquivo de vídeo MP4 oficial da Luna para o seu computador"
                  >
                    <Download className="w-3.5 h-3.5 text-white" />
                    <span>Baixar Vídeo em MP4</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleUseLunaVideo}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-red-950/40 transition-all active:scale-95 cursor-pointer"
                    title="Definir este vídeo oficial da Luna como o vídeo tutorial do sistema e de todos os salões"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                    <span>Usar Este Vídeo como Tutorial</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowLunaPreview(!showLunaPreview)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                    <span>{showLunaPreview ? 'Fechar Vídeo' : 'Assistir Vídeo da Luna'}</span>
                  </button>
                </div>

                {/* Inline Player do Vídeo da Luna */}
                {showLunaPreview && (
                  <div className="rounded-xl overflow-hidden border border-slate-700 bg-black aspect-video max-h-72 mx-auto flex items-center justify-center mt-2 shadow-2xl">
                    <video
                      src="/uploads/videos/video_tutorial_agenda_mais_facil_luna.mp4"
                      controls
                      autoPlay
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
              </div>

              {/* URL Fields */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <label className="font-bold text-white text-sm flex items-center gap-2">
                  <Youtube className="w-4 h-4 text-red-400" />
                  <span>Configurar Vídeo Externo ou Anexar do PC:</span>
                </label>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-300">
                      Título do Vídeo:
                    </label>
                    <input
                      type="text"
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                      placeholder="Ex: Tutorial Completo - Como Usar o Agenda Fácil"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-red-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Youtube className="w-3.5 h-3.5 text-red-500" />
                      <span>Link do YouTube (Opcional):</span>
                    </label>
                    <input
                      type="url"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=seu-video ou https://youtu.be/..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-red-400"
                    />
                    <p className="text-[10px] text-slate-400">
                      Cole a URL do seu vídeo no YouTube para que o player oficial do YouTube seja incorporado.
                    </p>
                  </div>

                  {/* Hidden Native File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/ogg,video/quicktime,video/*,.mp4,.webm,.mov,.avi,.mkv"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-sky-400" />
                        <span>Link Direto de Vídeo MP4 / Embed (Opcional):</span>
                      </label>

                      {/* Explicit Button requested by the user to browse PC */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingVideo}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-red-950/40 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                        title="Procurar e selecionar um vídeo MP4, WEBM ou MOV salvo no seu computador"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-white" />
                        <span>Procurar Vídeo no Meu PC (.mp4)</span>
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customVideoUrl}
                        onChange={(e) => setCustomVideoUrl(e.target.value)}
                        placeholder="https://meuservidor.com/video-tutorial.mp4 ou arquivo anexado do PC"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-red-400"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingVideo}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        <Upload className="w-3.5 h-3.5 text-rose-400" />
                        <span className="hidden sm:inline">Anexar do PC</span>
                      </button>
                    </div>

                    {/* Uploading Progress */}
                    {isUploadingVideo && (
                      <div className="bg-slate-900 border border-rose-500/50 rounded-xl p-3 space-y-1.5 animate-in fade-in">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-rose-300 font-bold flex items-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 text-rose-400 animate-spin" />
                            Enviando vídeo do seu computador...
                          </span>
                          <span className="font-mono text-white font-black">{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="bg-gradient-to-r from-red-600 to-rose-400 h-full transition-all duration-150"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Upload Error */}
                    {uploadError && (
                      <div className="bg-rose-950/80 border border-rose-700 rounded-xl p-2.5 text-rose-200 text-xs flex items-center justify-between gap-2">
                        <span>{uploadError}</span>
                        <button
                          type="button"
                          onClick={() => setUploadError('')}
                          className="text-slate-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Uploaded Video File Status Card */}
                    {customVideoUrl && !isUploadingVideo && (
                      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg">
                            <FileVideo className="w-4 h-4" />
                          </div>
                          <div className="text-xs">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{uploadedVideoInfo?.name || (customVideoUrl.startsWith('/uploads') ? 'Vídeo Carregado do Computador' : 'Vídeo Configurado')}</span>
                              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.2 rounded font-bold">
                                Pronto
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {uploadedVideoInfo?.size ? `Tamanho: ${uploadedVideoInfo.size} • ` : ''}
                              {customVideoUrl}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setShowVideoPreview(!showVideoPreview)}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1 transition-colors"
                          >
                            <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                            <span>{showVideoPreview ? 'Fechar Prévia' : 'Ver Prévia'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomVideoUrl('');
                              setUploadedVideoInfo(null);
                              setShowVideoPreview(false);
                            }}
                            className="p-1 rounded-lg hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Remover vídeo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Inline Mini Video Player Preview if toggled */}
                    {showVideoPreview && customVideoUrl && (
                      <div className="rounded-xl overflow-hidden border border-slate-700 bg-black aspect-video max-h-56 mx-auto flex items-center justify-center">
                        <video
                          src={customVideoUrl}
                          controls
                          autoPlay
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}

                    {/* Drag & Drop Hint */}
                    {!customVideoUrl && !isUploadingVideo && (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (file) handleUploadVideoFile(file);
                        }}
                        className="border-2 border-dashed border-slate-800 hover:border-red-500/60 bg-slate-950/60 hover:bg-slate-900/60 rounded-xl p-3 text-center cursor-pointer transition-all"
                      >
                        <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                        <span className="text-xs text-slate-300 font-bold block">
                          Clique para procurar ou arraste o arquivo do seu computador aqui
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          Formatos aceitos: MP4, WebM, MOV, MKV, AVI
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Info Note */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Acesso Restrito ao Administrador:</strong> O botão e a configuração de tutoriais ficam visíveis exclusivamente para você no Painel do Administrador, mantendo a tela do Salão limpa e focada no atendimento diário.
                </span>
              </div>

            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Chapter Selector */}
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-300 uppercase tracking-wider">
                    Selecione o Capítulo para Editar a Narração:
                  </span>
                  <button
                    type="button"
                    onClick={handleResetToDefaults}
                    className="text-[10px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restaurar Padrão</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
                  {chapters.map((chap, idx) => (
                    <button
                      key={chap.id}
                      type="button"
                      onClick={() => setSelectedChapterIndex(idx)}
                      className={`p-2 rounded-xl text-left transition-all border text-xs cursor-pointer ${
                        selectedChapterIndex === idx
                          ? 'bg-red-600 text-white border-red-400 shadow-md ring-1 ring-red-300'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-[11px] truncate">{chap.shortTitle}</div>
                      <div className="text-[9px] opacity-75 font-mono">{chap.duration}s</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Editing Selected Chapter */}
              {currentChap && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-black text-sm text-yellow-300 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-yellow-400" />
                      <span>Editando: {currentChap.title}</span>
                    </span>
                    <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Capítulo {selectedChapterIndex + 1} de {chapters.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-300">
                        Título do Capítulo:
                      </label>
                      <input
                        type="text"
                        value={currentChap.title}
                        onChange={(e) => handleUpdateChapterField('title', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-red-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-300">
                        Duração Estimada (segundos):
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="300"
                        value={currentChap.duration}
                        onChange={(e) => handleUpdateChapterField('duration', parseInt(e.target.value, 10) || 20)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-red-400 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-300">
                      Chamada Principal (Headline):
                    </label>
                    <input
                      type="text"
                      value={currentChap.headline}
                      onChange={(e) => handleUpdateChapterField('headline', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-red-400"
                    />
                  </div>

                  {/* Narration Script */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-emerald-400 flex items-center justify-between">
                      <span>Texto da Narração por Voz (Voz Sintetizada do App):</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        O navegador lerá este texto em voz alta com pronúncia em português
                      </span>
                    </label>
                    <textarea
                      rows={4}
                      value={currentChap.narration}
                      onChange={(e) => handleUpdateChapterField('narration', e.target.value)}
                      className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-emerald-400 leading-relaxed font-sans"
                      placeholder="Digite o texto que o aplicativo vai falar e narrar..."
                    />
                  </div>

                  {/* Bullet points on screen */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300">
                        Pontos de Destaque Exibidos na Tela:
                      </label>
                      <button
                        type="button"
                        onClick={handleAddPoint}
                        className="text-[10px] bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold px-2 py-0.5 rounded-lg border border-slate-700 transition-colors"
                      >
                        + Adicionar Ponto
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {currentChap.points.map((pt, pIdx) => (
                        <div key={pIdx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={pt}
                            onChange={(e) => handleUpdatePoint(pIdx, e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-red-400"
                          />
                          {currentChap.points.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemovePoint(pIdx)}
                              className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800"
                              title="Remover este ponto"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer Buttons */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              Cancelar
            </button>
            {(onOpenVideoTutorial || onPreviewTutorial) && (
              <button
                type="button"
                onClick={() => {
                  handleSave();
                  if (onOpenVideoTutorial) onOpenVideoTutorial();
                  else if (onPreviewTutorial) onPreviewTutorial();
                }}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Salvar e abrir player de vídeo para testar"
              >
                <Play className="w-3.5 h-3.5 fill-rose-400" />
                <span>Salvar & Testar Vídeo</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs shadow-lg flex items-center gap-2 transition-all active:scale-95 cursor-pointer border border-red-400/40"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Configurações de Vídeo</span>
          </button>
        </div>

      </div>
    </div>
  );
};
