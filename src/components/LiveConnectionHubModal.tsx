import React, { useState, useEffect, useRef } from 'react';
import { UserRole, ChatMessage, SystemBroadcastNotice, LivePresenceUser, SalonApp } from '../types';
import { Storage } from '../utils/storage';
import { syncEngine } from '../utils/syncEngine';
import { soundEffects } from '../utils/audio';
import { 
  Radio, MessageSquare, Bell, Users, Shield, Scissors, User, 
  Send, Sparkles, CheckCheck, RefreshCw, X, Megaphone, Phone, 
  Clock, AlertCircle, Wifi, CheckCircle2, ChevronRight, MessageCircle
} from 'lucide-react';

interface LiveConnectionHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: UserRole;
  activeSalon?: SalonApp;
  onSelectRole?: (role: UserRole) => void;
}

export const LiveConnectionHubModal: React.FC<LiveConnectionHubModalProps> = ({
  isOpen,
  onClose,
  userRole,
  activeSalon,
  onSelectRole
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'notices' | 'presence' | 'activity'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>(() => Storage.getMessages());
  const [notices, setNotices] = useState<SystemBroadcastNotice[]>(() => Storage.getNotices());
  const [onlineUsers, setOnlineUsers] = useState<LivePresenceUser[]>(() => Storage.getOnlineUsers());
  
  // Chat input
  const [newMsgText, setNewMsgText] = useState('');
  const [targetRecipient, setTargetRecipient] = useState<UserRole | 'todos'>(userRole === 'admin' ? 'todos' : (userRole === 'cliente' ? 'salao' : 'cliente'));
  const [senderName, setSenderName] = useState(() => {
    try {
      if (userRole === 'admin') return 'Administrador Central';
      if (userRole === 'salao') return activeSalon?.name || 'Recepção do Salão';
      return localStorage.getItem('salao_cliente_name') || 'Cliente';
    } catch {
      return 'Usuário';
    }
  });

  // Notice input (Admin only)
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeMsg, setNoticeMsg] = useState('');
  const [noticeTarget, setNoticeTarget] = useState<'todos' | 'saloes' | 'clientes'>('todos');
  const [noticeUrgent, setNoticeUrgent] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync listener
  useEffect(() => {
    const handleSync = () => {
      setMessages(Storage.getMessages());
      setNotices(Storage.getNotices());
      setOnlineUsers(Storage.getOnlineUsers());
    };

    window.addEventListener('salao_sync_data', handleSync);
    return () => window.removeEventListener('salao_sync_data', handleSync);
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeTab === 'chat' && isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab, isOpen]);

  if (!isOpen) return null;

  const currentSalonId = activeSalon?.id || 'salon-parcas';
  const currentSalonName = activeSalon?.name || 'Salão dos Parças';

  // Filter messages relevant to current salon / role
  const relevantMessages = messages.filter(m => {
    // 1. CLIENT: Only sees messages strictly between Client and Salon (or Salon booking alerts for this salon)
    // NEVER sees messages to/from admin
    if (userRole === 'cliente') {
      if (m.fromRole === 'admin' || m.toRole === 'admin') return false;
      if (m.salonId && m.salonId !== currentSalonId) return false;
      return (
        (m.fromRole === 'cliente' && m.toRole === 'salao') ||
        (m.fromRole === 'salao' && (m.toRole === 'cliente' || m.toRole === 'todos')) ||
        (m.fromRole === 'cliente' && m.toRole === 'todos')
      );
    }

    // 2. SALON: Can communicate with Admin AND with Clients of this salon
    if (userRole === 'salao') {
      if (m.salonId && m.salonId !== currentSalonId && m.fromRole !== 'admin') return false;
      return true;
    }

    // 3. ADMIN: Sees admin-to-salon communication and system broadcast messages
    if (userRole === 'admin') {
      // Admin monitors salons and communicates with salon owners
      return true;
    }

    return true;
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsgText.trim()) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toISOString().split('T')[0];

    let clientPhone = '';
    try {
      clientPhone = localStorage.getItem('salao_cliente_phone') || '';
    } catch {}

    // Force client to only send to salon
    const actualRecipient = userRole === 'cliente' ? 'salao' : targetRecipient;

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      salonId: currentSalonId,
      salonName: currentSalonName,
      fromRole: userRole,
      toRole: actualRecipient,
      senderName: senderName.trim() || (userRole === 'admin' ? 'Administrador' : (userRole === 'salao' ? 'Proprietário do Salão' : 'Cliente')),
      senderPhone: clientPhone,
      clientPhone: clientPhone,
      content: newMsgText.trim(),
      timestamp: timeStr,
      date: dateStr,
      createdAt: Date.now(),
      type: 'chat'
    };

    Storage.addMessage(newMsg);
    soundEffects.playMessagePing();
    setNewMsgText('');
  };

  const handlePublishNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeMsg.trim()) return;

    const notice: SystemBroadcastNotice = {
      id: `not_${Date.now()}`,
      title: noticeTitle.trim() || 'Comunicado Oficial',
      message: noticeMsg.trim(),
      fromRole: userRole,
      target: noticeTarget,
      createdAt: new Date().toLocaleDateString('pt-BR'),
      urgent: noticeUrgent
    };

    Storage.broadcastNotice(notice);
    soundEffects.playAlertBell();
    setNoticeTitle('');
    setNoticeMsg('');
    setActiveTab('notices');
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
            <Shield className="w-3 h-3 text-amber-400" /> Admin
          </span>
        );
      case 'salao':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
            <Scissors className="w-3 h-3 text-emerald-400" /> Salão
          </span>
        );
      case 'cliente':
        return (
          <span className="inline-flex items-center gap-1 bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
            <User className="w-3 h-3 text-sky-400" /> Cliente
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0f172a] border border-slate-700 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg">
                <Wifi className="w-5 h-5 animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900 animate-ping"></span>
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                  <span>
                    {userRole === 'cliente' 
                      ? `Chat com o Salão • ${currentSalonName}`
                      : userRole === 'admin'
                      ? 'Central de Gestão e Suporte aos Salões'
                      : `Central de Comunicação • ${currentSalonName}`}
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase px-2 py-0.5 rounded-md border border-emerald-500/30">
                    Ao Vivo
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span className="text-emerald-400 font-bold">● Status:</span>
                <span>
                  {userRole === 'cliente'
                    ? `Canal Direto com o Proprietário de ${currentSalonName}`
                    : userRole === 'admin'
                    ? 'Comunicação Oficial com Proprietários de Salões'
                    : 'Conectado com Clientes e com o Administrador'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Ecosystem Status Bar */}
        <div className={`bg-slate-950/80 px-5 py-2.5 border-b border-slate-800/80 grid ${userRole === 'cliente' ? 'grid-cols-2' : userRole === 'admin' ? 'grid-cols-2' : 'grid-cols-3'} gap-2 text-center text-xs`}>
          {userRole !== 'cliente' && (
            <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-2 flex items-center justify-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></div>
              <div className="text-left">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Administrador</div>
                <div className="font-extrabold text-amber-300 text-xs">Conectado Online</div>
              </div>
            </div>
          )}

          <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-2 flex items-center justify-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
            <div className="text-left">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Proprietário do Salão</div>
              <div className="font-extrabold text-emerald-300 text-xs">{currentSalonName}</div>
            </div>
          </div>

          {userRole !== 'admin' && (
            <div className="bg-slate-900/90 border border-sky-500/30 rounded-xl p-2 flex items-center justify-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse"></div>
              <div className="text-left">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Portal do Cliente</div>
                <div className="font-extrabold text-sky-300 text-xs">Atendimento Ativo</div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 px-5 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-slate-800 text-emerald-400 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>
              {userRole === 'cliente'
                ? 'Chat com o Salão'
                : userRole === 'admin'
                ? 'Chat com Salões'
                : 'Chat em Tempo Real'}
            </span>
            {relevantMessages.length > 0 && (
              <span className="bg-emerald-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {relevantMessages.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('notices')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer ${
              activeTab === 'notices'
                ? 'bg-slate-800 text-amber-400 border-amber-400'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>{userRole === 'cliente' ? 'Mural de Avisos' : 'Mural de Comunicados'}</span>
            {notices.length > 0 && (
              <span className="bg-amber-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {notices.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('presence')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer ${
              activeTab === 'presence'
                ? 'bg-slate-800 text-sky-400 border-sky-400'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Presença Online</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          
          {/* TAB 1: REAL-TIME CHAT */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-[52vh] sm:h-[55vh]">
              {/* Message List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                {relevantMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <MessageSquare className="w-12 h-12 text-slate-600 mb-2 animate-bounce" />
                    <p className="font-bold text-slate-300 text-sm">Nenhuma mensagem recente.</p>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      {userRole === 'cliente'
                        ? `Envie uma mensagem abaixo diretamente para o proprietário de ${currentSalonName}.`
                        : userRole === 'admin'
                        ? 'Envie mensagens e orientações diretas para os proprietários de salões.'
                        : 'Converse diretamente com seus clientes ou tire dúvidas com o administrador.'}
                    </p>
                  </div>
                ) : (
                  relevantMessages.map((msg) => {
                    const isMe = msg.fromRole === userRole;
                    const isSystemAlert = msg.type === 'admin_announcement' || msg.type === 'booking_alert';

                    if (isSystemAlert) {
                      return (
                        <div key={msg.id} className="my-2 bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/30 p-3 rounded-2xl text-center">
                          <div className="flex items-center justify-center gap-1.5 text-indigo-300 font-bold text-xs">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{msg.senderName}</span>
                            <span className="text-slate-500 text-[10px]">({msg.timestamp})</span>
                          </div>
                          <p className="text-xs text-slate-200 mt-1">{msg.content}</p>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          {getRoleBadge(msg.fromRole)}
                          <span className="text-xs font-bold text-slate-300">{msg.senderName}</span>
                          <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                        </div>

                        <div
                          className={`max-w-[85%] sm:max-w-[70%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-md ${
                            isMe
                              ? 'bg-emerald-600 text-white rounded-tr-none'
                              : msg.fromRole === 'admin'
                              ? 'bg-amber-950/80 border border-amber-500/40 text-amber-100 rounded-tl-none'
                              : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>

                          {msg.clientPhone && (
                            <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between text-[10px]">
                              <span className="opacity-80">WhatsApp: {msg.clientPhone}</span>
                              <a
                                href={`https://wa.me/55${msg.clientPhone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-2 py-0.5 rounded flex items-center gap-1"
                              >
                                <Phone className="w-2.5 h-2.5" /> Abrir Zap
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Form */}
              <form onSubmit={handleSendMessage} className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-400 font-bold text-[11px]">Enviando como:</span>
                  {getRoleBadge(userRole)}
                  
                  <span className="text-slate-400 font-bold text-[11px] ml-2">Destinatário:</span>
                  {userRole === 'cliente' ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-lg text-xs font-bold">
                      <Scissors className="w-3 h-3 text-emerald-400" />
                      <span>Proprietário de {currentSalonName}</span>
                    </span>
                  ) : userRole === 'salao' ? (
                    <select
                      value={targetRecipient}
                      onChange={(e) => setTargetRecipient(e.target.value as any)}
                      className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-emerald-400 outline-none font-medium cursor-pointer"
                    >
                      <option value="cliente">👤 Clientes do Salão</option>
                      <option value="admin">👑 Administrador Central</option>
                      <option value="todos">🌐 Todos (Salão + Clientes)</option>
                    </select>
                  ) : (
                    <select
                      value={targetRecipient}
                      onChange={(e) => setTargetRecipient(e.target.value as any)}
                      className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-emerald-400 outline-none font-medium cursor-pointer"
                    >
                      <option value="salao">💈 Proprietário do Salão ({currentSalonName})</option>
                      <option value="todos">🌐 Todos os Salões</option>
                    </select>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMsgText}
                    onChange={(e) => setNewMsgText(e.target.value)}
                    placeholder={
                      userRole === 'cliente'
                        ? `Escreva sua mensagem ou dúvida para o proprietário de ${currentSalonName}...`
                        : userRole === 'salao'
                        ? 'Responda aos clientes ou converse com o administrador...'
                        : 'Envie orientações diretas para o salão...'
                    }
                    className="flex-1 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                  />
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 shadow-lg transition-transform active:scale-95 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Enviar</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: BROADCAST NOTICES */}
          {activeTab === 'notices' && (
            <div className="space-y-4">
              {/* Admin Publish Box */}
              {userRole === 'admin' && (
                <form onSubmit={handlePublishNotice} className="bg-slate-950 p-4 rounded-2xl border border-amber-500/30 space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Megaphone className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-black text-amber-300 uppercase">Publicar Novo Comunicado Oficial</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Título do Comunicado:</label>
                      <input
                        type="text"
                        value={noticeTitle}
                        onChange={(e) => setNoticeTitle(e.target.value)}
                        placeholder="Ex: Horários de Feriado / Atualizações"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Público Alvo:</label>
                      <select
                        value={noticeTarget}
                        onChange={(e) => setNoticeTarget(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                      >
                        <option value="todos">Todos (Salões + Clientes)</option>
                        <option value="saloes">Apenas Proprietários dos Salões</option>
                        <option value="clientes">Apenas Clientes do Portal</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mensagem do Comunicado:</label>
                    <textarea
                      rows={2}
                      value={noticeMsg}
                      onChange={(e) => setNoticeMsg(e.target.value)}
                      placeholder="Digite a mensagem oficial para transmissão em tempo real..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={noticeUrgent}
                        onChange={(e) => setNoticeUrgent(e.target.checked)}
                        className="rounded accent-amber-500"
                      />
                      <span>Marcar como Destaque Urgente</span>
                    </label>

                    <button
                      type="submit"
                      className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg"
                    >
                      <Megaphone className="w-3.5 h-3.5" />
                      <span>Transmitir para Todos</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Notice List */}
              <div className="space-y-3">
                {notices.filter(n => {
                  if (userRole === 'cliente') {
                    return n.target === 'clientes' || n.target === 'todos';
                  }
                  if (userRole === 'salao') {
                    return n.target === 'saloes' || n.target === 'todos';
                  }
                  return true;
                }).length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    {userRole === 'cliente' ? 'Nenhum aviso do salão no momento.' : 'Nenhum comunicado oficial registrado no momento.'}
                  </div>
                ) : (
                  notices.filter(n => {
                    if (userRole === 'cliente') {
                      return n.target === 'clientes' || n.target === 'todos';
                    }
                    if (userRole === 'salao') {
                      return n.target === 'saloes' || n.target === 'todos';
                    }
                    return true;
                  }).map((n) => (
                    <div
                      key={n.id}
                      className={`p-4 rounded-2xl border ${
                        n.urgent
                          ? 'bg-rose-950/40 border-rose-500/50 text-rose-100'
                          : 'bg-slate-900/90 border-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-white">{n.title}</span>
                          {n.urgent && (
                            <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase animate-pulse">
                              Urgente
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">{n.createdAt}</span>
                      </div>
                      <p className="text-xs text-slate-300 whitespace-pre-wrap">{n.message}</p>
                      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Origem: {n.fromRole === 'admin' ? 'Comunicado Oficial' : '💈 Salão'}</span>
                        <span>Destino: {n.target === 'todos' ? '🌐 Todos' : n.target === 'saloes' ? '💈 Salões' : '👤 Clientes'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PRESENCE & CONNECTED DEVICES */}
          {activeTab === 'presence' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <h4 className="text-xs font-black text-white uppercase">Dispositivos & Usuários Ativos Agora</h4>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                    Sincronização Ativa via SSE
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-300">Você está conectado como:</span>
                      {getRoleBadge(userRole)}
                    </div>
                    <div className="text-xs text-slate-400 space-y-1">
                      <p>• Salão Ativo: <strong className="text-white">{currentSalonName}</strong></p>
                      <p>• Protocolo: <strong className="text-emerald-400">Tempo Real (Server-Sent Events)</strong></p>
                      <p>• Latência de sincronização: <strong className="text-sky-400">Instantânea (&lt; 100ms)</strong></p>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-300">Recursos de Conexão Tripla:</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <ul className="text-xs text-slate-400 space-y-1">
                      <li>✓ Agendamentos do Cliente entram no Salão na hora</li>
                      <li>✓ Salão atualiza status e Cliente vê imediatamente</li>
                      <li>✓ Admin monitora todos os salões e envia avisos</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Direct Quick WhatsApp Connect Card */}
              <div className="bg-gradient-to-r from-emerald-950/60 to-slate-900 p-4 rounded-2xl border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-white">Canal Direto no WhatsApp</h5>
                    <p className="text-[11px] text-slate-400">
                      Conecte-se também diretamente via WhatsApp com agendamentos e suporte.
                    </p>
                  </div>
                </div>

                <a
                  href={`https://wa.me/55${(activeSalon?.ownerPhone || '11999998888').replace(/\D/g, '')}?text=${encodeURIComponent(`Olá, estou no aplicativo Agenda Fácil do ${currentSalonName}!`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shrink-0"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Conversar no WhatsApp</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-5 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Canal Seguro & Sincronizado</span>
          </span>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-1.5 rounded-xl text-xs transition-colors"
          >
            Fechar Janela
          </button>
        </div>

      </div>
    </div>
  );
};
