import React, { useState } from 'react';
import { buildAppUrl, getPublicAppUrl } from '../utils/url';
import { Storage } from '../utils/storage';
import { getCalculatedLicensePlans } from '../utils/pricing';
import { X, Link2, Copy, Check, Share2, ExternalLink, Sparkles } from 'lucide-react';

interface SalonLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBuyApp: () => void;
}

export const SalonLinkModal: React.FC<SalonLinkModalProps> = ({
  isOpen,
  onClose,
  onOpenBuyApp,
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedPlanDays, setSelectedPlanDays] = useState<number | null>(null);
  const [linkMode, setLinkMode] = useState<'live' | 'vercel'>('live');

  if (!isOpen) return null;

  const adminConfig = Storage.getAdminPaymentConfig();
  const plans = getCalculatedLicensePlans(adminConfig, true);

  const targetBaseUrl = linkMode === 'live'
    ? (typeof window !== 'undefined' ? `${window.location.origin}/` : getPublicAppUrl())
    : 'https://agenda-f-cil-sal-o.vercel.app/';

  // The canonical purchase link for the salon owner
  const salonPurchaseUrl = buildAppUrl({
    action: 'comprar-licenca',
    ...(selectedPlanDays ? { plano: selectedPlanDays } : {})
  }, targetBaseUrl);

  const planObj = selectedPlanDays ? plans.find(p => p.days === selectedPlanDays) : null;
  const planName = planObj ? `${planObj.label} (${planObj.priceStr})` : 'Todos os Planos / Tabela Geral';

  const defaultWhatsappMsg = `Olá! 💈✂️\n\n` +
    `Aqui está o link exclusivo para adquirir e ativar a licença do seu sistema de gestão e agendamentos *Agenda+Fácil.Salão*:\n\n` +
    `👉 ${salonPurchaseUrl}\n\n` +
    `Plano selecionado: *${planName}*\n\n` +
    `Ao clicar no link, você acessará diretamente a contratação com preenchimento rápido e liberação imediata!\n\n` +
    `Qualquer dúvida estamos à disposição! ✨`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(salonPurchaseUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSendWhatsapp = () => {
    const encoded = encodeURIComponent(defaultWhatsappMsg);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-violet-500/40 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-800 p-4 sm:p-5 text-white flex items-center justify-between shadow-md shrink-0 border-b border-violet-500/30">
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
                  Link Direto de Venda
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black mt-0.5 tracking-tight flex items-center gap-2">
                <span>Criar link de compra/Salão</span>
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
        <div className="p-4 sm:p-6 space-y-4 text-slate-200 text-xs">
          
          {/* Plan filter shortcuts */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span>Personalizar Link para um Plano Específico (Opcional):</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedPlanDays(null)}
                className={`px-2.5 py-1.5 rounded-xl font-black text-[11px] border transition-all ${
                  selectedPlanDays === null
                    ? 'bg-violet-600 text-white border-violet-400 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                Geral (Todos os Planos)
              </button>
              {plans.map((p) => (
                <button
                  key={`${p.days}-${p.numVal}`}
                  type="button"
                  onClick={() => setSelectedPlanDays(p.days)}
                  className={`px-2.5 py-1.5 rounded-xl font-black text-[11px] border transition-all ${
                    selectedPlanDays === p.days
                      ? p.numVal === 0
                        ? 'bg-sky-600 text-white border-sky-400 shadow-sm'
                        : 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {p.label} {p.numVal > 0 ? `(${p.priceStr})` : '(Grátis)'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-violet-400" />
                <span>LINK DE COMPRA GERADO (PRONTO PARA ENVIO):</span>
              </label>

              {/* Destination Mode Selector */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setLinkMode('live')}
                  className={`text-[10px] font-black px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                    linkMode === 'live'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping"></span>
                  <span>⚡ Ao Vivo (Celular ↔ PC)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLinkMode('vercel')}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                    linkMode === 'vercel'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>🌐 Vercel Oficial</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                readOnly
                value={salonPurchaseUrl}
                className="w-full bg-slate-900 border border-slate-700 focus:border-violet-500 rounded-xl px-3 py-2.5 text-xs text-white font-mono select-all transition-colors"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-5 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all shrink-0 shadow-md active:scale-95 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copiado!' : 'Copiar Link'}</span>
              </button>
            </div>

            {/* Action Buttons: WhatsApp and Test/Open Buy Screen */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleSendWhatsapp}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>Enviar pelo WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBuyApp();
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-violet-300 hover:text-white border border-slate-700 font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Testar / Abrir Tela de Compra</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
