import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, ArrowLeft, X, 
  FileVideo, Music, Film, ExternalLink, Download, RefreshCw, AlertCircle, Maximize2
} from 'lucide-react';
import { Storage } from '../utils/storage';
import { VideoTutorialConfig } from '../types';

interface VideoExplicativoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VideoExplicativoModal: React.FC<VideoExplicativoModalProps> = ({
  isOpen,
  onClose
}) => {
  const [videoConfig, setVideoConfig] = useState<VideoTutorialConfig>({
    youtubeUrl: '',
    customVideoUrl: '/uploads/videos/V_deo_Aplicativo_do_App__1792379432220_bkd3.mp4',
    videoTitle: 'Vídeo Explicativo do App - Agenda Fácil',
    useInteractivePlayer: false,
    fileType: 'video',
    fileName: 'Vídeo Aplicativo do App .mp4',
    fileSize: '25.7 MB'
  });

  // Playback states
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoReloadKey, setVideoReloadKey] = useState(0);

  // Audio player state
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Load configuration from local storage & server sync
  useEffect(() => {
    if (!isOpen) {
      if (videoPlayerRef.current) {
        try { videoPlayerRef.current.pause(); } catch {}
      }
      if (audioPlayerRef.current) {
        try { audioPlayerRef.current.pause(); } catch {}
      }
      setIsVideoPlaying(false);
      setIsAudioPlaying(false);
      setVideoError(null);
      return;
    }

    const loadConfig = () => {
      const adminPayment = Storage.getAdminPaymentConfig();
      const cfg = adminPayment.videoTutorialConfig || {
        youtubeUrl: '',
        customVideoUrl: '/uploads/videos/V_deo_Aplicativo_do_App__1792379432220_bkd3.mp4',
        videoTitle: 'Vídeo Explicativo do App - Agenda Fácil',
        useInteractivePlayer: false,
        fileType: 'video',
        fileName: 'Vídeo Aplicativo do App .mp4',
        fileSize: '25.7 MB'
      };
      setVideoConfig(cfg);
    };

    loadConfig();

    // Fetch latest sync state from server to guarantee freshest video on all phones/notebooks
    fetch('/api/sync/state')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.state?.adminPaymentConfig?.videoTutorialConfig) {
          const remoteCfg = data.state.adminPaymentConfig.videoTutorialConfig;
          if (remoteCfg.customVideoUrl || remoteCfg.youtubeUrl) {
            setVideoConfig(remoteCfg);
          }
        }
      })
      .catch(() => {
        // network silent fallback to cached state
      });

    const handleSync = () => loadConfig();
    window.addEventListener('salao_sync_data', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('salao_sync_data', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && videoPlayerRef.current) {
      try {
        videoPlayerRef.current.load();
      } catch {}
    }
  }, [isOpen, videoConfig.customVideoUrl, videoReloadKey]);

  if (!isOpen) return null;

  const isAudioFile = videoConfig.fileType === 'audio' || 
    (videoConfig.customVideoUrl && (videoConfig.customVideoUrl.match(/\.(mp3|wav|ogg|m4a)(\?.*)?$/i) || videoConfig.customVideoUrl.startsWith('data:audio/')));

  const formatSeconds = (sec: number) => {
    if (!sec || isNaN(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleTogglePlayVideo = () => {
    if (!videoPlayerRef.current) return;
    if (videoPlayerRef.current.paused) {
      videoPlayerRef.current.play().then(() => {
        setIsVideoPlaying(true);
        setVideoError(null);
      }).catch((err) => {
        console.warn('Playback error on user interaction:', err);
        setVideoError('Toque no player ou utilize a opção "Abrir Vídeo em Nova Aba".');
      });
    } else {
      videoPlayerRef.current.pause();
      setIsVideoPlaying(false);
    }
  };

  const handleReloadVideo = () => {
    setVideoError(null);
    setVideoReloadKey(k => k + 1);
    if (videoPlayerRef.current) {
      try {
        videoPlayerRef.current.load();
        videoPlayerRef.current.play().catch(() => {});
      } catch {}
    }
  };

  const handleOpenFullscreen = () => {
    if (!videoPlayerRef.current) return;
    const v = videoPlayerRef.current as any;
    try {
      if (v.requestFullscreen) {
        v.requestFullscreen().catch(() => {});
      } else if (v.webkitEnterFullscreen) {
        v.webkitEnterFullscreen();
      } else if (v.webkitRequestFullscreen) {
        v.webkitRequestFullscreen();
      } else if (v.msRequestFullscreen) {
        v.msRequestFullscreen();
      }
    } catch {}
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#0b1222] border border-slate-700/80 rounded-3xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header Bar - Assista como Visitante */}
        <div className="px-5 py-4 border-b border-slate-800 bg-[#0e172a] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-red-950/40 shrink-0">
              {isAudioFile ? <Music className="w-5 h-5" /> : <Film className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-red-500/20 text-red-400 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-red-500/30 uppercase tracking-wider">
                  Assista como Visitante
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {videoConfig.videoTitle || 'Vídeo Explicativo do App'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct Return Button to the Original Screen */}
            <button
              type="button"
              onClick={onClose}
              className="bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-500/50 font-extrabold py-1.5 px-3 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Voltar para a página anterior"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">Voltar para a página anterior</span>
              <span className="sm:hidden">Voltar</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-rose-500 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body / Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Media Player Container */}
          {videoConfig.customVideoUrl ? (
            isAudioFile ? (
              /* Audio Player (MP3 / Audio) */
              <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center space-y-5 shadow-inner">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-red-600 via-rose-600 to-amber-500 flex items-center justify-center text-white shadow-2xl shadow-red-950/60 animate-pulse">
                  <Music className="w-10 h-10" />
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-red-400 font-black uppercase tracking-wider">
                    Áudio Explicativo
                  </span>
                  <h3 className="text-lg font-black text-white">
                    {videoConfig.videoTitle || 'Áudio Explicativo do Agenda Fácil'}
                  </h3>
                  {videoConfig.fileName && (
                    <p className="text-xs text-slate-400 font-mono">
                      Arquivo: {videoConfig.fileName} {videoConfig.fileSize ? `(${videoConfig.fileSize})` : ''}
                    </p>
                  )}
                </div>

                <audio
                  ref={audioPlayerRef}
                  preload="metadata"
                  onTimeUpdate={() => {
                    if (audioPlayerRef.current) {
                      setAudioCurrentTime(audioPlayerRef.current.currentTime);
                      setAudioDuration(audioPlayerRef.current.duration || 0);
                    }
                  }}
                  onEnded={() => setIsAudioPlaying(false)}
                  onPlay={() => setIsAudioPlaying(true)}
                  onPause={() => setIsAudioPlaying(false)}
                  className="hidden"
                >
                  <source src={videoConfig.customVideoUrl} type="audio/mpeg" />
                </audio>

                <div className="space-y-2 max-w-md mx-auto">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>{formatSeconds(audioCurrentTime)}</span>
                    <span>{formatSeconds(audioDuration)}</span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={audioDuration || 100}
                    value={audioCurrentTime}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setAudioCurrentTime(val);
                      if (audioPlayerRef.current) {
                        audioPlayerRef.current.currentTime = val;
                      }
                    }}
                    className="w-full accent-red-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />

                  <div className="flex items-center justify-center gap-4 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (audioPlayerRef.current) {
                          audioPlayerRef.current.currentTime = Math.max(0, audioPlayerRef.current.currentTime - 10);
                        }
                      }}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                      title="Voltar 10 segundos"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (audioPlayerRef.current) {
                          if (isAudioPlaying) {
                            audioPlayerRef.current.pause();
                          } else {
                            audioPlayerRef.current.play().catch(() => {});
                          }
                        }
                      }}
                      className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white flex items-center justify-center shadow-lg shadow-red-950/50 transition-all active:scale-95 cursor-pointer"
                    >
                      {isAudioPlaying ? (
                        <Pause className="w-6 h-6 fill-white" />
                      ) : (
                        <Play className="w-6 h-6 fill-white ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <a
                    href={videoConfig.customVideoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-all border border-slate-700"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir em Nova Aba</span>
                  </a>
                  <a
                    href={videoConfig.customVideoUrl}
                    download={videoConfig.fileName || 'audio_explicativo.mp3'}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-all border border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar Áudio MP3</span>
                  </a>
                </div>
              </div>
            ) : (
              /* Universal High-Compatibility Video Player (MP4 / WebM / iOS / Android / Notebooks) */
              <div className="bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative group">
                <div className="relative w-full bg-black flex items-center justify-center min-h-[240px]">
                  <video
                    key={`${videoConfig.customVideoUrl}_${videoReloadKey}`}
                    ref={videoPlayerRef}
                    src={videoConfig.customVideoUrl}
                    controls
                    playsInline
                    webkit-playsinline="true"
                    x5-playsinline="true"
                    preload="metadata"
                    className="w-full max-h-[480px] object-contain mx-auto bg-black"
                    onPlay={() => {
                      setIsVideoPlaying(true);
                      setVideoError(null);
                    }}
                    onPause={() => setIsVideoPlaying(false)}
                    onError={() => {
                      setVideoError('Caso o player não carregue no seu navegador, utilize os botões abaixo para assistir em tela cheia.');
                    }}
                  >
                    <source src={videoConfig.customVideoUrl} type="video/mp4" />
                    <source src="/uploads/videos/video_explicativo_app.mp4" type="video/mp4" />
                    Seu dispositivo não suporta o formato padrão de vídeo HTML5.
                  </video>

                  {/* Touch/Click Overlay when paused for instant iOS/Android start */}
                  {!isVideoPlaying && !videoError && (
                    <button
                      type="button"
                      onClick={handleTogglePlayVideo}
                      className="absolute inset-0 m-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600/90 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl shadow-red-950/80 transition-all hover:scale-105 active:scale-95 cursor-pointer z-10 border-2 border-white/30 backdrop-blur-sm"
                      title="Clique para assistir"
                    >
                      <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-white ml-1" />
                    </button>
                  )}
                </div>

                {videoError && (
                  <div className="p-3 bg-amber-950/40 border-t border-amber-800/60 flex items-center justify-between text-xs text-amber-200">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{videoError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleReloadVideo}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-1 px-2.5 rounded-lg text-[11px] flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Recarregar</span>
                    </button>
                  </div>
                )}

                {/* Footer Bar with Title, File Info and Direct Fallback Links for 100% device compatibility */}
                <div className="p-3 bg-slate-900/95 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                    <span className="font-bold truncate">{videoConfig.videoTitle || 'Vídeo Explicativo do App'}</span>
                    {videoConfig.fileSize && (
                      <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                        ({videoConfig.fileSize})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleReloadVideo}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                      title="Recarregar vídeo"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenFullscreen}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all border border-slate-700 cursor-pointer"
                      title="Abrir em tela cheia no player do celular ou computador"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Tela Cheia</span>
                    </button>
                    <a
                      href={videoConfig.customVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all border border-slate-700"
                      title="Abrir vídeo em nova aba do navegador"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Nova Aba</span>
                    </a>
                    <a
                      href={videoConfig.customVideoUrl}
                      download={videoConfig.fileName || 'video_explicativo.mp4'}
                      className="px-2.5 py-1 bg-emerald-800/80 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all border border-emerald-600/50"
                      title="Baixar vídeo para o dispositivo"
                    >
                      <Download className="w-3 h-3" />
                      <span className="hidden sm:inline">Baixar MP4</span>
                    </a>
                  </div>
                </div>
              </div>
            )
          ) : videoConfig.youtubeUrl ? (
            /* YouTube Embed Player */
            <div className="bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl aspect-video">
              <iframe
                src={
                  videoConfig.youtubeUrl.includes('watch?v=')
                    ? videoConfig.youtubeUrl.replace('watch?v=', 'embed/')
                    : videoConfig.youtubeUrl.includes('youtu.be/')
                    ? videoConfig.youtubeUrl.replace('youtu.be/', 'www.youtube.com/embed/')
                    : videoConfig.youtubeUrl
                }
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Vídeo Explicativo"
              />
            </div>
          ) : (
            /* Clean Empty state */
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-slate-800 flex items-center justify-center text-red-400 mx-auto border border-slate-700">
                <FileVideo className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-base font-black text-white">
                  Vídeo Explicativo do App
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  O vídeo explicativo oficial está sendo preparado pelo administrador e estará disponível aqui em breve!
                </p>
              </div>
            </div>
          )}

          {/* Informative Explanation Cards for Clients & Salons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="bg-[#0e172a] border border-slate-800 p-3.5 rounded-xl space-y-1">
              <div className="text-xs font-black text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Para Salões & Proprietários</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Controle de agenda em tempo real, cálculo de comissões sem erro, caixa diário e link na bio do Instagram para clientes agendarem 24h.
              </p>
            </div>

            <div className="bg-[#0e172a] border border-slate-800 p-3.5 rounded-xl space-y-1">
              <div className="text-xs font-black text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span>Retorno à Tela Inicial</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Após assistir ao vídeo explicativo, clique no botão verde abaixo para retornar à página inicial e entrar como Salão ou Administrador.
              </p>
            </div>
          </div>

          {/* Return to Original Screen - Prominent CTA */}
          <div className="pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold py-3 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all active:scale-98 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
              <span>Voltar para a página anterior (Entrar como Salão / Administrador)</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
