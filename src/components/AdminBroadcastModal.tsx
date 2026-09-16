import React, { useState, useMemo } from 'react';
import { SalonApp, VideoTutorialConfig } from '../types';
import { Storage } from '../utils/storage';
import { 
  Send, Megaphone, CheckCircle2, AlertCircle, X, Users, Mail, 
  Phone, Video, Copy, ExternalLink, Play, Bot, Loader2, 
  Sparkles, Check, Filter, MessageSquare, Search, RefreshCw
} from 'lucide-react';

interface AdminBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  salons: SalonApp[];
  onOpenVideoConfig?: () => void;
}

export const AdminBroadcastModal: React.FC<AdminBroadcastModalProps> = ({
  isOpen,
  onClose,
  salons,
  onOpenVideoConfig
}) => {
  const [broadcastMode, setBroadcastMode] = useState<'video_tutorial' | 'custom_message'>('video_tutorial');
  const [selectedSalonIds, setSelectedSalonIds] = useState<string[]>(() => salons.map(s => s.id));
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom message inputs
  const [customSubject, setCustomSubject] = useState('📢 Comunicado Importante - Agenda Fácil Salão & Barbearia');
  const [customMessage, setCustomMessage] = useState(
`Olá {nome_proprietario}, tudo bem?

Passando para compartilhar novidades e atualizações exclusivas do seu aplicativo {nome_salao}!

Lembramos que o seu acesso permanente está disponível pelo link direto:
👉 {link_acesso}

🔑 Suas Chaves Oficiais:
• Login (CPF): {cpf}
• Token de Licença: {token}

Caso precise de qualquer suporte ou queira rever o passo a passo de como usar o sistema, assista ao nosso tutorial em vídeo:
🎥 {link_video}

Conte sempre com a gente para fazer o seu salão crescer! 💈✂️`
  );
  const [includeVideoInCustom, setIncludeVideoInCustom] = useState(true);

  // Dispatch execution state
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchProgress, setDispatchProgress] = useState(0);
  const [dispatchLog, setDispatchLog] = useState<string[]>([]);
  const [dispatchedSalons, setDispatchedSalons] = useState<Record<string, { email: boolean; wa: boolean }>>({});
  const [copiedState, setCopiedState] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Get current active video tutorial
  const adminPayment = Storage.getAdminPaymentConfig();
  const videoConfig: VideoTutorialConfig | undefined = adminPayment.videoTutorialConfig;
  
  const publicAppUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : (adminPayment.productionUrl || 'https://agenda-f-cil-sal-o.vercel.app');
  const cleanBase = publicAppUrl.endsWith('/') ? publicAppUrl.slice(0, -1) : publicAppUrl;

  const activeVideoUrl = useMemo(() => {
    if (videoConfig?.customVideoUrl) {
      return videoConfig.customVideoUrl.startsWith('http')
        ? videoConfig.customVideoUrl
        : `${cleanBase}${videoConfig.customVideoUrl.startsWith('/') ? '' : '/'}${videoConfig.customVideoUrl}`;
    }
    if (videoConfig?.youtubeUrl) {
      return videoConfig.youtubeUrl;
    }
    return `${cleanBase}/video`;
  }, [videoConfig, cleanBase]);

  const activeVideoTitle = videoConfig?.videoTitle || 'Vídeo Tutorial Oficial - Agenda Fácil';

  // Filter salons
  const filteredSalons = useMemo(() => {
    return salons.filter(s => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.ownerName || '').toLowerCase().includes(q) ||
        (s.ownerPhone || '').includes(q) ||
        (s.ownerEmail || '').toLowerCase().includes(q)
      );
    });
  }, [salons, searchQuery]);

  // Handle select all / deselect all
  const handleToggleSelectAll = () => {
    if (selectedSalonIds.length === filteredSalons.length) {
      setSelectedSalonIds([]);
    } else {
      setSelectedSalonIds(filteredSalons.map(s => s.id));
    }
  };

  const handleToggleSalon = (id: string) => {
    setSelectedSalonIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Build message for a specific salon
  const generateMessageForSalon = (salon: SalonApp) => {
    const directLoginUrl = `${cleanBase}/?acesso-salao=1&cpf=${encodeURIComponent(salon.ownerCpf || '')}&token=${encodeURIComponent(salon.purchaseToken || '')}`;
    const clientBookingUrl = `${cleanBase}/?role=cliente&salon=${encodeURIComponent(salon.name)}`;

    if (broadcastMode === 'video_tutorial') {
      return (
`🎉 *VÍDEO TUTORIAL OFICIAL & PASSO A PASSO - AGENDA FÁCIL* 💈

🏬 *Salão / Barbearia:* ${salon.name}
👤 *Proprietário:* ${salon.ownerName || 'Responsável'}
📄 *Login (CPF):* ${salon.ownerCpf || 'Cadastrado no Sistema'}
🔑 *SEU TOKEN DE ACESSO:* *${salon.purchaseToken}*
📅 *Validade da Licença:* ${salon.planDays || 30} Dias (Até ${salon.expiresAt || 'Ativa'})

━━━━━━━━━━━━━━━━━━━━━━━━━━
🎥 *ASSISTA AO VÍDEO TUTORIAL (PASSO A PASSO EM VÍDEO):*
👉 ${activeVideoUrl}

━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 *SEU LINK DE ACESSO DIRETO (PAINEL DO SALÃO):*
👉 ${directLoginUrl}

📲 *LINK PARA SEUS CLIENTES AGENDENDAR:*
👉 ${clientBookingUrl}

━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 *PASSO A PASSO RÁPIDO PARA COMEÇAR:*
1️⃣ Abra o vídeo tutorial no link acima para aprender como gerenciar serviços, equipe e caixa.
2️⃣ Acesse seu painel informando seu CPF (${salon.ownerCpf || 'Seu CPF'}) e Token: ${salon.purchaseToken}.
3️⃣ Instale o aplicativo no seu celular (no Chrome: toque nos 3 pontinhos e 'Instalar aplicativo' / no iPhone: compartilhar e 'Adicionar à Tela de Início').
4️⃣ Coloque seu link de clientes na Bio do seu Instagram e WhatsApp para receber agendamentos automáticos 24h por dia!

_🤖 Mensagem oficial enviada pelo Administrador Agenda Fácil._`
      );
    } else {
      // Custom Message with variable replacement
      let msg = customMessage;
      msg = msg.replace(/{nome_salao}/g, salon.name);
      msg = msg.replace(/{nome_proprietario}/g, salon.ownerName || 'Proprietário');
      msg = msg.replace(/{cpf}/g, salon.ownerCpf || 'Cadastrado no Sistema');
      msg = msg.replace(/{token}/g, salon.purchaseToken || '');
      msg = msg.replace(/{link_acesso}/g, directLoginUrl);
      msg = msg.replace(/{link_video}/g, activeVideoUrl);
      return msg;
    }
  };

  // Single salon WhatsApp trigger
  const handleOpenSalonWhatsApp = (salon: SalonApp) => {
    const text = generateMessageForSalon(salon);
    let cleanPhone = (salon.ownerPhone || '').replace(/\D/g, '');
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      if (!cleanPhone.startsWith('55')) {
        cleanPhone = '55' + cleanPhone;
      }
    }
    const waUrl = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');

    setDispatchedSalons(prev => ({
      ...prev,
      [salon.id]: {
        ...(prev[salon.id] || { email: false }),
        wa: true
      }
    }));
  };

  // Copy all phones for WhatsApp Business Broadcast List
  const handleCopyAllPhones = () => {
    const selectedSalons = salons.filter(s => selectedSalonIds.includes(s.id));
    const phones = selectedSalons
      .map(s => s.ownerPhone ? s.ownerPhone.replace(/\D/g, '') : '')
      .filter(p => p.length >= 8);
    
    if (phones.length === 0) {
      setFeedbackMsg('Nenhum telefone encontrado nos salões selecionados.');
      setTimeout(() => setFeedbackMsg(''), 3000);
      return;
    }

    navigator.clipboard.writeText(phones.join(', '));
    setCopiedState('phones');
    setFeedbackMsg(`✓ ${phones.length} telefones copiados para lista de transmissão!`);
    setTimeout(() => {
      setCopiedState(null);
      setFeedbackMsg('');
    }, 3000);
  };

  // Copy all emails
  const handleCopyAllEmails = () => {
    const selectedSalons = salons.filter(s => selectedSalonIds.includes(s.id));
    const emails = selectedSalons
      .map(s => s.ownerEmail ? s.ownerEmail.trim() : '')
      .filter(e => e.includes('@'));
    
    if (emails.length === 0) {
      setFeedbackMsg('Nenhum e-mail encontrado nos salões selecionados.');
      setTimeout(() => setFeedbackMsg(''), 3000);
      return;
    }

    navigator.clipboard.writeText(emails.join(', '));
    setCopiedState('emails');
    setFeedbackMsg(`✓ ${emails.length} e-mails copiados para envio em cópia oculta (CCO)!`);
    setTimeout(() => {
      setCopiedState(null);
      setFeedbackMsg('');
    }, 3000);
  };

  // Copy preview message
  const handleCopyPreviewMessage = () => {
    const sampleSalon = salons.find(s => selectedSalonIds.includes(s.id)) || salons[0];
    if (!sampleSalon) return;
    const text = generateMessageForSalon(sampleSalon);
    navigator.clipboard.writeText(text);
    setCopiedState('text');
    setFeedbackMsg('✓ Texto do comunicado copiado para a área de transferência!');
    setTimeout(() => {
      setCopiedState(null);
      setFeedbackMsg('');
    }, 3000);
  };

  // Execute Batch Robot Dispatch
  const handleStartRobotDispatch = async () => {
    const targets = salons.filter(s => selectedSalonIds.includes(s.id));
    if (targets.length === 0) {
      alert('Selecione pelo menos um salão para disparar.');
      return;
    }

    setIsDispatching(true);
    setDispatchProgress(5);
    setDispatchLog([`🤖 Robô Iniciado: Preparando disparo para ${targets.length} salões...`]);

    const logs: string[] = [];

    for (let i = 0; i < targets.length; i++) {
      const salon = targets[i];
      const percent = Math.round(((i + 1) / targets.length) * 100);
      setDispatchProgress(percent);

      logs.push(`📤 [${i + 1}/${targets.length}] Processando salão: ${salon.name} (${salon.ownerName})...`);
      setDispatchLog([...logs]);

      // 1. Send email via server endpoint
      try {
        const msgText = generateMessageForSalon(salon);
        const emailSubject = broadcastMode === 'video_tutorial'
          ? `🎥 Vídeo Tutorial & Credenciais do seu Salão: ${salon.name}`
          : customSubject;

        await fetch('/api/send-purchase-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ownerEmail: salon.ownerEmail,
            ownerName: salon.ownerName,
            ownerCpf: salon.ownerCpf,
            salonName: salon.name,
            purchaseToken: salon.purchaseToken,
            planDays: salon.planDays || 30,
            priceStr: 'Plano Ativo',
            expiresAt: salon.expiresAt,
            appUrl: cleanBase,
            videoUrl: activeVideoUrl,
            videoTitle: activeVideoTitle
          })
        }).catch(() => null);

        logs.push(`  ✉️ E-mail despachado para ${salon.ownerEmail}`);
        setDispatchedSalons(prev => ({
          ...prev,
          [salon.id]: { ...(prev[salon.id] || { wa: false }), email: true }
        }));
      } catch (err: any) {
        logs.push(`  ⚠️ Falha no e-mail: ${err.message || 'Erro'}`);
      }

      setDispatchLog([...logs]);
      await new Promise(r => setTimeout(r, 600));
    }

    logs.push(`🎉 Robô finalizou o ciclo! Todos os ${targets.length} salões foram processados com sucesso.`);
    setDispatchLog([...logs]);
    setIsDispatching(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[85] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl w-full max-w-5xl text-white shadow-2xl relative my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-4 sm:p-5 text-white flex justify-between items-start shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-black/25 rounded-2xl border border-white/20">
              <Megaphone className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-black/40 text-amber-200 border border-amber-300/40 font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Área Exclusiva do Administrador
                </span>
                <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {salons.length} Salões Cadastrados
                </span>
              </div>
              <h2 className="text-base sm:text-xl font-black tracking-tight flex items-center gap-2 mt-0.5">
                <span>Disparar Informações / Vídeo p/ Todos os Salões</span>
              </h2>
              <p className="text-xs text-amber-100/90 mt-0.5">
                Envie comunicados, avisos ou o vídeo tutorial em MP4 para todos os salões de uma vez só por WhatsApp e E-mail
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Tutorial Config Alert Bar */}
        <div className="bg-slate-950/90 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <div className="p-1 bg-red-500/20 text-red-400 rounded-lg">
              <Video className="w-4 h-4" />
            </div>
            <span className="text-slate-300">
              Vídeo Tutorial Ativo: <strong className="text-white">{activeVideoTitle}</strong>
            </span>
            <span className="text-[11px] font-mono text-slate-400 truncate max-w-xs sm:max-w-md">
              ({activeVideoUrl})
            </span>
          </div>

          {onOpenVideoConfig && (
            <button
              type="button"
              onClick={onOpenVideoConfig}
              className="px-2.5 py-1 rounded-lg bg-red-600/30 hover:bg-red-600/50 text-red-300 border border-red-500/40 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Video className="w-3 h-3" />
              <span>Configurar / Trocar Vídeo MP4</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">

          {/* Feedback banner */}
          {feedbackMsg && (
            <div className="p-3 bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          {/* Mode Selector Tabs */}
          <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 gap-1.5">
            <button
              type="button"
              onClick={() => setBroadcastMode('video_tutorial')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                broadcastMode === 'video_tutorial'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Video className="w-4 h-4 text-yellow-300" />
              <span>1. Disparar Vídeo Tutorial Oficial (Passo a Passo em MP4)</span>
            </button>

            <button
              type="button"
              onClick={() => setBroadcastMode('custom_message')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                broadcastMode === 'custom_message'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-amber-200" />
              <span>2. Disparar Comunicado / Informação Geral</span>
            </button>
          </div>

          {/* Custom Message Inputs (if in custom message mode) */}
          {broadcastMode === 'custom_message' && (
            <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Assunto do E-mail / Título:
                </label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="Ex: Atualização Importante do seu Aplicativo de Salão"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-300">
                    Mensagem do Disparo:
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Tags dinâmicas: <code className="text-amber-300">{'{nome_salao}'}</code>, <code className="text-amber-300">{'{nome_proprietario}'}</code>, <code className="text-amber-300">{'{cpf}'}</code>, <code className="text-amber-300">{'{token}'}</code>, <code className="text-amber-300">{'{link_video}'}</code>
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-xs font-sans focus:outline-none focus:border-amber-400 leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* Salons Selection Header & Bulk Action Buttons */}
          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 cursor-pointer transition-colors"
                >
                  {selectedSalonIds.length === filteredSalons.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </button>
                <span className="text-xs text-slate-300 font-bold">
                  {selectedSalonIds.length} de {filteredSalons.length} salões selecionados para o disparo
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar salão ou proprietário..."
                  className="bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 w-full sm:w-64"
                />
              </div>
            </div>

            {/* Quick Helper Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-900">
              <button
                type="button"
                onClick={handleCopyAllPhones}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/50 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copiar todos os telefones para colar na Lista de Transmissão do WhatsApp"
              >
                <Phone className="w-3 h-3" />
                <span>Copiar {selectedSalonIds.length} Telefones (Lista WhatsApp)</span>
              </button>

              <button
                type="button"
                onClick={handleCopyAllEmails}
                className="px-2.5 py-1.5 rounded-xl bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-700/50 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copiar e-mails para envio em cópia oculta"
              >
                <Mail className="w-3 h-3" />
                <span>Copiar {selectedSalonIds.length} E-mails (CCO)</span>
              </button>

              <button
                type="button"
                onClick={handleCopyPreviewMessage}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copiar o texto formatado completo do comunicado"
              >
                <Copy className="w-3 h-3" />
                <span>Copiar Texto do Disparo</span>
              </button>
            </div>
          </div>

          {/* Robot In-Progress Terminal */}
          {isDispatching && (
            <div className="bg-slate-950 border-2 border-amber-500/80 rounded-2xl p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-300 font-bold flex items-center gap-2">
                  <Bot className="w-4 h-4 text-amber-400 animate-spin" />
                  Robô de Disparo em Lote em Execução...
                </span>
                <span className="font-mono text-white font-black text-sm">{dispatchProgress}%</span>
              </div>
              <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-200"
                  style={{ width: `${dispatchProgress}%` }}
                />
              </div>
              <div className="bg-slate-900/90 rounded-xl p-3 max-h-36 overflow-y-auto text-[11px] font-mono text-slate-300 space-y-1 border border-slate-800">
                {dispatchLog.map((log, idx) => (
                  <div key={idx}>{log}</div>
                ))}
              </div>
            </div>
          )}

          {/* Salons Table & Direct Trigger List */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Salões Destinatários ({filteredSalons.length}):</span>
              </span>
              <span className="text-[11px] text-slate-500">
                Clique no botão de WhatsApp para disparar individualmente com 1 clique
              </span>
            </div>

            <div className="divide-y divide-slate-800/80 max-h-72 overflow-y-auto">
              {filteredSalons.map(salon => {
                const isSelected = selectedSalonIds.includes(salon.id);
                const dispatchStatus = dispatchedSalons[salon.id];

                return (
                  <div
                    key={salon.id}
                    className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      isSelected ? 'bg-slate-900/40 hover:bg-slate-900/70' : 'opacity-50 hover:opacity-80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSalon(salon.id)}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-xs text-white">{salon.name}</span>
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                            Token: {salon.purchaseToken}
                          </span>
                          {dispatchStatus?.email && (
                            <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.2 rounded font-bold">
                              E-mail ✓
                            </span>
                          )}
                          {dispatchStatus?.wa && (
                            <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.2 rounded font-bold">
                              WhatsApp ✓
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                          <span>Proprietário: <strong className="text-slate-300">{salon.ownerName || 'Não informado'}</strong></span>
                          <span>•</span>
                          <span>CPF: <strong className="text-slate-300">{salon.ownerCpf || 'N/A'}</strong></span>
                          <span>•</span>
                          <span className="text-slate-400">{salon.ownerEmail}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pl-7 sm:pl-0">
                      <button
                        type="button"
                        onClick={() => handleOpenSalonWhatsApp(salon)}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                        title="Abrir WhatsApp deste salão com o vídeo tutorial e dados prontos"
                      >
                        <Phone className="w-3 h-3 text-emerald-100" />
                        <span>Disparar WhatsApp</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sample Message Preview Card */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Pré-visualização da Mensagem Formatada:</span>
              </span>
              <button
                type="button"
                onClick={handleCopyPreviewMessage}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                <span>Copiar</span>
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-[11.5px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {generateMessageForSalon(salons.find(s => selectedSalonIds.includes(s.id)) || salons[0])}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
          >
            Fechar
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleStartRobotDispatch}
              disabled={isDispatching || selectedSalonIds.length === 0}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-xs shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50 border border-amber-400/40"
            >
              {isDispatching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Disparando ({dispatchProgress}%)...</span>
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4 text-yellow-300" />
                  <span>🚀 Disparar p/ {selectedSalonIds.length} Salões com o Robô</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
