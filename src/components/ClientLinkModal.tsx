import React, { useState } from 'react';
import { SalonApp } from '../types';
import { 
  X, Link2, Copy, Check, Share2, MessageSquare, ExternalLink, 
  Sparkles, Building2, UserCheck, ShieldCheck, Heart, Scissors, CheckCircle2
} from 'lucide-react';

interface ClientLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSalon: SalonApp;
  salons: SalonApp[];
  onSelectSalon: (salon: SalonApp) => void;
  onOpenClientView: (salon: SalonApp) => void;
}

export const ClientLinkModal: React.FC<ClientLinkModalProps> = ({
  isOpen,
  onClose,
  activeSalon,
  salons,
  onSelectSalon,
  onOpenClientView,
}) => {
  const [copied, setCopied] = useState(false);
  const [customMsg, setCustomMsg] = useState('');

  if (!isOpen) return null;

  // Build client link for this specific salon
  // Convert -dev- to -pre- if present so external devices (Android/iOS) can access without AI Studio authentication
  const publicOrigin = (window.location.origin + window.location.pathname).replace('ais-dev-', 'ais-pre-');
  const clientUrl = `${publicOrigin}?role=cliente&salon=${activeSalon.id}`;

  const defaultWhatsappMsg = `Olá! 💈 Agende seu horário no *${activeSalon.config.nomeSalao}* de forma simples e rápida!\n\n` +
    `Acesse o nosso portal de agendamentos online pelo link abaixo:\n` +
    `👉 ${clientUrl}\n\n` +
    `Escolha o serviço, o profissional e o melhor horário para você em segundos! ✂️✨`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(clientUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSendWhatsapp = () => {
    const textToSend = customMsg.trim() || defaultWhatsappMsg;
    const encoded = encodeURIComponent(textToSend);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 p-5 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl border border-white/20 backdrop-blur-sm">
              <Link2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="bg-white/20 text-white font-black text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-white/20">
                Acesso para Clientes
              </span>
              <h2 className="text-xl font-black mt-0.5 tracking-tight flex items-center gap-2">
                <span>Criar Link do Cliente</span>
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar text-slate-200 text-xs">
          
          {/* Mobile Compatibility Banner */}
          <div className="bg-sky-950/70 border border-sky-700/80 p-3.5 rounded-2xl text-left text-xs text-sky-200 flex items-start gap-2.5 shadow-sm">
            <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-extrabold text-white block text-xs">
                📲 Acesso 100% Liberado para Celulares (Android e Apple / iOS):
              </span>
              <p className="text-[11px] text-sky-200/90 leading-relaxed">
                Este link utiliza o endereço público oficial (URL sem restrição de conta). Qualquer pessoa pode clicar pelo WhatsApp no celular Android ou iPhone e agendar horários sem precisar fazer login ou dar erro de acesso!
              </p>
            </div>
          </div>

          {/* Active Salon Selector */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-300 font-bold shrink-0">
                <Scissors className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold">Salão Selecionado:</span>
                <span className="font-extrabold text-white text-sm block">{activeSalon.config.nomeSalao}</span>
              </div>
            </div>

            {salons.length > 1 && (
              <select
                value={activeSalon.id}
                onChange={(e) => {
                  const found = salons.find(s => s.id === e.target.value);
                  if (found) onSelectSalon(found);
                }}
                className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-2.5 py-1.5 font-bold focus:outline-none focus:border-rose-500"
              >
                {salons.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.config.nomeSalao} ({s.appCode})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Generated Link Field */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-rose-500/40 space-y-2.5 shadow-inner">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Link Exclusivo de Agendamento do Salão:</span>
              </label>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                Pronto para Enviar ✓
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={clientUrl}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono text-xs focus:outline-none select-all"
              />
              <button
                onClick={handleCopyLink}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all shadow-md ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* WhatsApp Direct Share Box */}
          <div className="bg-emerald-950/40 border border-emerald-800/60 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-emerald-300 flex items-center gap-2 text-xs">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>Enviar Convite pelo WhatsApp</span>
              </h3>
              <span className="text-[10px] text-emerald-400/80 font-bold">WhatsApp Web & App</span>
            </div>

            <p className="text-[11px] text-slate-300">
              Clique no botão abaixo para abrir seu WhatsApp com a mensagem personalizada pronta para enviar aos seus clientes ou grupos.
            </p>

            <button
              onClick={handleSendWhatsapp}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 border border-emerald-400/30"
            >
              <Share2 className="w-4 h-4" />
              <span>Enviar Convite do Salão no WhatsApp</span>
            </button>
          </div>

          {/* Test Client Page Button */}
          <div className="bg-purple-950/40 border border-purple-800/60 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-purple-300 flex items-center gap-2 text-xs">
                <UserCheck className="w-4 h-4 text-purple-400" />
                <span>Testar / Visualizar Área do Cliente</span>
              </h3>
            </div>

            <p className="text-[11px] text-slate-300">
              Deseja testar como a página de agendamento online aparece para o seu cliente? Clique abaixo para abrir o portal de agendamentos deste salão.
            </p>

            <button
              onClick={() => {
                onClose();
                onOpenClientView(activeSalon);
              }}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 border border-purple-400/30"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Abrir Página do Cliente Agora</span>
            </button>
          </div>

          {/* How it works summary */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              💡 Como Funciona o Acesso do Cliente:
            </span>
            <ul className="space-y-1.5 text-[11px] text-slate-300">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>O cliente clica no link e a página abre direto no <strong>{activeSalon.config.nomeSalao}</strong>.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>O cliente escolhe o serviço, profissional, data e horário vago.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Informa Nome e WhatsApp e o agendamento entra automaticamente na sua Agenda e lista de Clientes!</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-5 py-2 rounded-xl text-xs transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
