import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, X, ArrowLeft, Upload, 
  FileVideo, Music, Film, CheckCircle2, ShieldCheck,
  FolderOpen, Globe, AlertCircle, Check, Loader2, Sparkles, ExternalLink
} from 'lucide-react';
import { Storage } from '../utils/storage';
import { VideoTutorialConfig, AdminPaymentConfig } from '../types';
import { syncEngine } from '../utils/syncEngine';

interface VideoExplicativoModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

export const VideoExplicativoModal: React.FC<VideoExplicativoModalProps> = ({
  isOpen,
  onClose,
  isAdmin = false
}) => {
  const [activeTab, setActiveTab] = useState<'assistir' | 'admin'>('assistir');
  const [videoConfig, setVideoConfig] = useState<VideoTutorialConfig>({
    youtubeUrl: '',
    customVideoUrl: '',
    videoTitle: 'Vídeo Explicativo do App - Agenda Fácil',
    useInteractivePlayer: false
  });

  // Media upload & editing state
  const [customVideoUrl, setCustomVideoUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [fileType, setFileType] = useState<'video' | 'audio'>('video');
  const [attachedFileName, setAttachedFileName] = useState('');
  const [attachedFileSize, setAttachedFileSize] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Audio player custom controls state
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Load configuration whenever modal opens
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
      setCustomVideoUrl(cfg.customVideoUrl || '');
      setYoutubeUrl(cfg.youtubeUrl || '');
      setVideoTitle(cfg.videoTitle || 'Vídeo Explicativo do App - Agenda Fácil');
      setFileType(cfg.fileType || (cfg.customVideoUrl?.match(/\.(mp3|wav|ogg|m4a)$/i) ? 'audio' : 'video'));
      setAttachedFileName(cfg.fileName || '');
      setAttachedFileSize(cfg.fileSize || '');
      setSaveSuccessMsg('');
      setUploadError('');

      // If user entered as administrator, show the admin tab directly; otherwise, always show pure watch view
      if (isAdmin) {
        setActiveTab('admin');
      } else {
        setActiveTab('assistir');
      }
    } else {
      // Pause playing media when modal closes
      if (videoPlayerRef.current) {
        try { videoPlayerRef.current.pause(); } catch {}
      }
      if (audioPlayerRef.current) {
        try { audioPlayerRef.current.pause(); } catch {}
      }
      setIsAudioPlaying(false);
    }
  }, [isOpen, isAdmin]);

  if (!isOpen) return null;

  const isAudioFile = fileType === 'audio' || 
    (customVideoUrl && (customVideoUrl.match(/\.(mp3|wav|ogg|m4a)(\?.*)?$/i) || customVideoUrl.startsWith('data:audio/')));

  const formatSeconds = (sec: number) => {
    if (!sec || isNaN(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 KB';
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
  };

  // Helper to immediately save to Storage and SyncEngine for all users
  const saveImmediately = (patch: Partial<VideoTutorialConfig>) => {
    const adminPayment = Storage.getAdminPaymentConfig();
    const updatedCfg: VideoTutorialConfig = {
      ...adminPayment.videoTutorialConfig,
      youtubeUrl: youtubeUrl.trim(),
      customVideoUrl: customVideoUrl.trim(),
      videoTitle: videoTitle.trim() || 'Vídeo Explicativo do App - Agenda Fácil',
      useInteractivePlayer: false,
      fileType: fileType,
      fileName: attachedFileName,
      fileSize: attachedFileSize,
      uploadedAt: new Date().toISOString(),
      ...patch
    };

    const updatedAdminPayment: AdminPaymentConfig = {
      ...adminPayment,
      videoTutorialConfig: updatedCfg
    };

    Storage.saveAdminPaymentConfig(updatedAdminPayment);
    syncEngine.pushUpdate({ adminPaymentConfig: updatedAdminPayment });
    setVideoConfig(updatedCfg);
    setSaveSuccessMsg('✅ Salvo imediatamente! Todas as pessoas que acessarem o aplicativo já têm acesso ao vídeo oficial.');
  };

  // Upload MP4 or MP3 file from PC and SAVE IMMEDIATELY
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const detectedType = file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|ogg|m4a)$/i) ? 'audio' : 'video';
    const formattedSize = formatFileSize(file.size);
    setFileType(detectedType);
    setAttachedFileName(file.name);
    setAttachedFileSize(formattedSize);
    setUploadError('');
    setIsUploading(true);
    setUploadProgress(10);

    // Primary: Attempt direct server upload to /api/upload-video
    const uploadUrl = `/api/upload-video?filename=${encodeURIComponent(file.name)}`;
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        const percent = Math.min(95, Math.round((evt.loaded / evt.total) * 95));
        setUploadProgress(percent);
      }
    };

    const tryBase64Fallback = () => {
      // Fallback: Read as Data URL so it is guaranteed to work in any environment
      const reader = new FileReader();
      reader.onload = (event) => {
        const resultUrl = event.target?.result as string;
        if (resultUrl) {
          setCustomVideoUrl(resultUrl);
          setUploadProgress(100);
          setIsUploading(false);

          // Salvar imediatamente conforme solicitado pelo usuário
          saveImmediately({
            customVideoUrl: resultUrl,
            fileName: file.name,
            fileSize: formattedSize,
            fileType: detectedType,
            videoTitle: videoTitle.trim() || 'Vídeo Explicativo do App - Agenda Fácil'
          });
        } else {
          setIsUploading(false);
          setUploadError('Não foi possível ler o arquivo do seu computador.');
        }
      };
      reader.onerror = () => {
        setIsUploading(false);
        setUploadError('Erro ao carregar o arquivo do seu computador.');
      };
      reader.readAsDataURL(file);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.url) {
            setCustomVideoUrl(res.url);
            setUploadProgress(100);
            setIsUploading(false);

            // Salvar imediatamente conforme solicitado pelo usuário
            saveImmediately({
              customVideoUrl: res.url,
              fileName: file.name,
              fileSize: formattedSize,
              fileType: detectedType,
              videoTitle: videoTitle.trim() || 'Vídeo Explicativo do App - Agenda Fácil'
            });
            return;
          }
        } catch {
          // fallback
        }
      }
      tryBase64Fallback();
    };

    xhr.onerror = () => {
      tryBase64Fallback();
    };

    try {
      xhr.send(file);
    } catch {
      tryBase64Fallback();
    }

    if (e.target) e.target.value = '';
  };

  // Save the video config permanently for all users, salons and clients
  const handleSaveVideoConfig = () => {
    saveImmediately({
      youtubeUrl: youtubeUrl.trim(),
      customVideoUrl: customVideoUrl.trim(),
      videoTitle: videoTitle.trim() || 'Vídeo Explicativo do App - Agenda Fácil',
      useInteractivePlayer: false,
      fileType: fileType,
      fileName: attachedFileName,
      fileSize: attachedFileSize
    });

    setTimeout(() => {
      setActiveTab('assistir');
    }, 1500);
  };

  // Remove attached video
  const handleRemoveAttached = () => {
    if (confirm('Deseja remover o vídeo ou áudio anexado?')) {
      setCustomVideoUrl('');
      setAttachedFileName('');
      setAttachedFileSize('');
      setYoutubeUrl('');
      saveImmediately({
        customVideoUrl: '',
        fileName: '',
        fileSize: '',
        youtubeUrl: ''
      });
      setSaveSuccessMsg('Vídeo removido com sucesso.');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#0b1222] border border-slate-700/80 rounded-3xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-slate-800 bg-[#0e172a] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-red-950/40 shrink-0">
              {isAudioFile ? <Music className="w-5 h-5" /> : <Film className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-red-500/20 text-red-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-red-500/30 uppercase tracking-wider">
                  Assista ao Vídeo Explicativo
                </span>
                {isAdmin && (
                  <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-500/40 uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-amber-400" />
                    <span>Administrador</span>
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {videoConfig.videoTitle || 'Assista ao Vídeo Explicativo'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct Return Button to the Original Screen */}
            <button
              type="button"
              onClick={onClose}
              className="bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-500/50 font-extrabold py-1.5 px-3 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Voltar para a página original (Entrar como Salão / Administrador)"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">Voltar para a Página Inicial</span>
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

        {/* Navigation Tabs - ONLY VISIBLE IF LOGGED IN AS ADMINISTRATOR */}
        {isAdmin && (
          <div className="px-5 pt-3 pb-0 bg-[#0e172a]/80 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-1.5 rounded-t-xl text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === 'admin'
                    ? 'bg-slate-800/90 text-white border-red-500'
                    : 'text-slate-400 hover:text-slate-200 border-transparent'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Anexar / Salvar Vídeo (Administrador)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('assistir')}
                className={`px-3 py-1.5 rounded-t-xl text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === 'assistir'
                    ? 'bg-slate-800/90 text-white border-red-500'
                    : 'text-slate-400 hover:text-slate-200 border-transparent'
                }`}
              >
                <Play className="w-3.5 h-3.5 text-red-400 fill-red-400" />
                <span>Assistir como Visitante</span>
              </button>
            </div>

            {videoConfig.customVideoUrl && (
              <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 py-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Vídeo Oficial Salvo</span>
              </span>
            )}
          </div>
        )}

        {/* Modal Body / Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* TAB 1: WATCH THE EXPLANATORY VIDEO (Default & Only View for Public/Salons without Admin login) */}
          {(activeTab === 'assistir' || !isAdmin) && (
            <div className="space-y-4">
              
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
                        Narração & Áudio Explicativo
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

                    {/* Audio element */}
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

                    {/* Custom Modern Audio Controls */}
                    <div className="space-y-2 max-w-md mx-auto">
                      <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                        <span>{formatSeconds(audioCurrentTime)}</span>
                        <span>{formatSeconds(audioDuration)}</span>
                      </div>

                      {/* Progress Scrubber */}
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

                      {/* Playback Action Buttons */}
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
                        <span className="font-bold">{videoConfig.videoTitle || 'Assista ao Vídeo Explicativo'}</span>
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
                /* Clean Empty state - No video attached yet */
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
                  <span>Voltar para a Página Inicial (Entrar como Salão / Administrador)</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: ADMIN CONFIGURATION & ATTACHMENT - ONLY ACCESSIBLE BY ADMINISTRATOR */}
          {isAdmin && activeTab === 'admin' && (
            <div className="space-y-4">
              
              <div className="space-y-4">
                
                {saveSuccessMsg && (
                  <div className="bg-emerald-950/90 border border-emerald-600 p-3 rounded-xl flex items-center gap-2 text-emerald-200 text-xs font-bold animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{saveSuccessMsg}</span>
                  </div>
                )}

                {uploadError && (
                  <div className="bg-rose-950/90 border border-rose-600 p-3 rounded-xl flex items-center gap-2 text-rose-200 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,audio/mpeg,audio/mp3,audio/wav,video/webm,video/quicktime,video/*,audio/*,.mp4,.mp3,.webm,.mov,.wav"
                  className="hidden"
                  onChange={handleFileSelected}
                />

                {/* Upload Box from Computer */}
                <div className="bg-[#0e172a] border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-red-400" />
                      <h4 className="text-xs font-black text-white">
                        Baixar e Anexar do Meu Computador (.MP4 ou .MP3)
                      </h4>
                    </div>
                    <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                      Formatos: MP4, MP3, WebM, WAV
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Selecione o arquivo no seu computador. Ao anexar, ele será <strong className="text-emerald-400">salvo imediatamente</strong> para todas as pessoas que acessarem o link oficial do aplicativo.
                  </p>

                  {/* Drag and drop / Trigger button */}
                  <div
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    className="border-2 border-dashed border-red-500/40 hover:border-red-400 bg-red-950/10 hover:bg-red-950/20 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2 group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center text-white mx-auto shadow-md group-hover:scale-105 transition-transform">
                      {isUploading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <Upload className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-white block">
                        Clique aqui para escolher arquivo no Computador (.mp4 ou .mp3)
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Salva imediatamente para todos os salões e visitantes
                      </span>
                    </div>
                  </div>

                  {/* Upload progress */}
                  {isUploading && (
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-xs font-bold text-red-300">
                        <span>Anexando e salvando imediatamente...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-red-600 to-rose-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Current Attached Media Indicator */}
                  {customVideoUrl && (
                    <div className="bg-slate-900 border border-emerald-500/40 p-3 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <span className="font-bold text-white block">
                            {attachedFileName || 'Arquivo de mídia anexado'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {fileType === 'audio' ? 'Áudio MP3' : 'Vídeo MP4'} {attachedFileSize ? `• ${attachedFileSize}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[11px] font-bold text-sky-400 hover:text-sky-300 underline cursor-pointer"
                        >
                          Trocar Arquivo
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveAttached}
                          className="text-[11px] font-bold text-rose-400 hover:text-rose-300 underline cursor-pointer ml-2"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Title and Direct URL (Alternative) */}
                <div className="bg-[#0e172a] border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-300">
                      Título Explicativo do Vídeo / Áudio:
                    </label>
                    <input
                      type="text"
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                      placeholder="Ex: Assista ao Vídeo Explicativo - Agenda Fácil"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-sky-400" />
                      <span>Link Direto do Vídeo ou YouTube:</span>
                    </label>
                    <input
                      type="text"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... ou link direto .mp4"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Save Video Action Buttons */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={handleSaveVideoConfig}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-3 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all active:scale-98 cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-white" />
                    <span>Salvar Imediatamente para Todas as Pessoas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('assistir')}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 px-3 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5 text-red-400" />
                    <span>Visualizar como Visitante / Assistir Vídeo</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold py-2.5 px-3 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Retornar para a Página Inicial (Entrar como Salão / Administrador)</span>
                  </button>
                </div>

              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
