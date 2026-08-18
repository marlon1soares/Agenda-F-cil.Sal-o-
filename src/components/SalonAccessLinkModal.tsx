import React, { useState } from 'react';
import { buildAppUrl } from '../utils/url';
import { SalonApp } from '../types';
import { X, Link2, Copy, Check, Share2, Key, Scissors, ExternalLink, ShieldCheck, Building2 } from 'lucide-react';

interface SalonAccessLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSalonAuth: () => void;
  salons?: SalonApp[];
  activeSalonId?: string;
}

export const SalonAccessLinkModal: React.FC<SalonAccessLinkModalProps> = ({
  isOpen,
  onClose,
  onOpenSalonAuth,
  salons = [],
  activeSalonId,
}) => {
  const [selectedSalonId, setSelectedSalonId] = useState<string>('all');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const selectedSalon = selectedSalonId !== 'all' ? salons.find(s => s.id === selectedSalonId) : null;

  // The canonical direct access/login link for salon owners
  const salonAccessUrl = buildAppUrl({
    action: 'acesso-salao',
    ...(selectedSalon ? { salon: selectedSalon.code || selectedSalon.id } : {})
  });

  const salonTitle = selectedSalon ? (selectedSalon.config?.nomeSalao || selectedSalon.name) : 'Salão / Barbearia';

  const defaultWhatsappMsg = `Olá! 💈✂️\n\n` +
    `Aqui está o seu *Link de Acesso ao Painel do Salão* (${salonTitle}) no sistema *Agenda+Fácil.Salão*:\n\n` +
    `👉 ${salonAccessUrl}\n\n` +
    `🔑 Ao abrir o link, basta digitar o seu *CPF* cadastrado e o seu *Token de Licença* para entrar diretamente no gerenciamento do seu salão!\n\n` +
    `Qualquer dúvida estamos à disposição! ✨`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(salonAccessUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSendWhatsapp = () => {
    const encoded = encodeURIComponent(defaultWhatsappMsg);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-teal-500/40 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-teal-700 via-emerald-700 to-cyan-800 p-4 sm:p-5 text-white flex items-center justify-between shadow-md shrink-0 border-b border-teal-500/30">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/15 rounded-2xl border border-white/25 backdrop-blur-sm shadow-inner">
              <Link2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-400/25 text-amber-300 font-extrabold text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-amber-300/40 flex items-center gap-1">
                  👑 PAINEL DO ADMINISTRADOR
                </span>
                <span className="bg-emerald-500/80 text-white font-bold text-[9px] px-2 py-0.5 rounded-full">
                  Link Direto de Acesso
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black mt-0.5 tracking-tight flex items-center gap-2">
                <span>Criar link de acesso/Salão</span>
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 text-slate-200 text-xs">
          
          {salons && salons.length > 1 && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Salão de Destino (Opcional):</span>
              </label>
              <select
                value={selectedSalonId}
                onChange={(e) => setSelectedSalonId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:border-teal-500 transition-colors"
              >
                <option value="all">🔗 Link Universal (Qualquer Salão com CPF + Token)</option>
                {salons.map(s => (
                  <option key={s.id} value={s.id}>
                    💈 {s.config?.nomeSalao || s.name} ({s.ownerName || 'Proprietário'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-inner">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-teal-400" />
                <span>LINK DE ACESSO GERADO (PRONTO PARA ENVIO):</span>
              </label>
              {copied && (
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 animate-pulse">
                  <Check className="w-3.5 h-3.5" /> Link copiado!
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                readOnly
                value={salonAccessUrl}
                className="w-full bg-slate-900 border border-slate-700 focus:border-teal-500 rounded-xl px-3 py-2.5 text-xs text-white font-mono select-all transition-colors"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-5 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all shrink-0 shadow-md active:scale-95 cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copiado!' : 'Copiar Link'}</span>
              </button>
            </div>

            {/* Action Buttons: WhatsApp and Test/Open Auth Screen */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleSendWhatsapp}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all active:scale-95 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Enviar pelo WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSalonAuth();
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white border border-slate-700 font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Testar / Abrir Tela de Acesso</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
