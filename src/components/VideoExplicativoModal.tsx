import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, ArrowLeft, X, 
  FileVideo, Music, Film
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
    customVideoUrl: '',
    videoTitle: 'Vídeo Explicativo do App - Agenda Fácil',
    useInteractivePlayer: false
  });

  // Audio player state
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      const adminPayment = Storage.getAdminPaymentConfig();
      const cfg = adminPayment.videoTutorialConfig || {
        youtubeUrl: '',
        customVideoUrl: '',
        videoTitle: 'Vídeo Explicativo do App - Agenda Fácil',
        useInteractivePlayer: false
      };
      setVideoConfig(cfg);
    } else {
      if (videoPlayerRef.current) {
        try { videoPlayerRef.current.pause(); } catch {}
      }
      if (audioPlayerRef.current) {
        try { audioPlayerRef.current.pause(); } catch {}
      }
      setIsAudioPlaying(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isAudioFile = videoConfig.fileType === 'audio' || 
    (videoConfig.customVideoUrl && (videoConfig.customVideoUrl.match(/\.(mp3|wav|ogg|m4a)(\?.*)?$/i) || videoConfig.customVideoUrl.startsWith('data:audio/')));

  const formatSeconds = (sec: number) => {
    if (!sec || isNaN(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
                  src={videoConfig.customVideoUrl}
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
                />

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
                            audioPlayerRef.current.play();
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
              </div>
            ) : (
              /* Video Player (MP4 / WebM / Video) */
              <div className="bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
                <video
                  ref={videoPlayerRef}
                  src={videoConfig.customVideoUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full max-h-[460px] object-contain mx-auto bg-black"
                />
                <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="font-bold">{videoConfig.videoTitle || 'Vídeo Explicativo do App'}</span>
                  </div>
                  {videoConfig.fileName && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      {videoConfig.fileName} {videoConfig.fileSize ? `(${videoConfig.fileSize})` : ''}
                    </span>
                  )}
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
