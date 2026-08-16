import React, { useState } from 'react';
import { buildAppUrl, getPublicAppUrl } from '../utils/url';
import { X, Link2, Copy, Check, Share2, ExternalLink } from 'lucide-react';

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

  if (!isOpen) return null;

  // The canonical purchase link for the salon owner
  const salonPurchaseUrl = buildAppUrl({
    action: 'comprar-licenca',
  });

  const defaultWhatsappMsg = `Olá! 💈✂️\n\n` +
    `Aqui está o link exclusivo para adquirir e ativar a licença do seu sistema de gestão e agendamentos *Agenda+Fácil.Salão*:\n\n` +
    `👉 ${salonPurchaseUrl}\n\n` +
    `Ao clicar no link, você acessará diretamente a tabela de preços para escolher o plano, preencher os dados do salão e realizar o pagamento com liberação imediata!\n\n` +
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
                <span>Criar Link p/ Salão</span>
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

        {/* Modal Body - Focused only on the requested link & action buttons */}
        <div className="p-4 sm:p-6 space-y-4 text-slate-200 text-xs">
          
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-inner">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-violet-400" />
                <span>LINK DE COMPRA GERADO (PRONTO PARA ENVIO):</span>
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
