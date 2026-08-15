import React, { useState, useEffect } from 'react';
import { AdminPaymentConfig } from '../types';
import { Storage } from '../utils/storage';
import { formatBRL, getCalculatedLicensePlans } from '../utils/pricing';
import { 
  X, Link2, Copy, Check, Share2, MessageSquare, ExternalLink, 
  Sparkles, Building2, ShieldCheck, CheckCircle2, ShoppingCart,
  Phone, User, History, Smartphone, Repeat, Search, ArrowRight,
  DollarSign, Clock, QrCode, CreditCard, Send, Settings
} from 'lucide-react';

interface SalonLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBuyApp: () => void;
  onOpenAdminPaymentConfig?: () => void;
}

interface SavedSalonLink {
  id: string;
  salonName: string;
  ownerName: string;
  phone: string;
  planDays: number;
  url: string;
  createdAt: string;
}

export const SalonLinkModal: React.FC<SalonLinkModalProps> = ({
  isOpen,
  onClose,
  onOpenBuyApp,
  onOpenAdminPaymentConfig,
}) => {
  const [targetSalonName, setTargetSalonName] = useState('');
  const [targetOwnerName, setTargetOwnerName] = useState('');
  const [targetPhone, setTargetPhone] = useState('');
  const [selectedPlanDays, setSelectedPlanDays] = useState<number>(30);
  const [copied, setCopied] = useState(false);
  const [savedLinks, setSavedLinks] = useState<SavedSalonLink[]>([]);
  const [copiedHistoryId, setCopiedHistoryId] = useState<string | null>(null);

  const paymentConfig = Storage.getAdminPaymentConfig();
  const plans = getCalculatedLicensePlans(paymentConfig);

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('savedSalonPurchaseLinks');
      if (stored) {
        try {
          setSavedLinks(JSON.parse(stored));
        } catch {
          setSavedLinks([]);
        }
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Clean and format phone number
  const cleanPhone = targetPhone.replace(/\D/g, '');

  // Build the public link for the salon to purchase license
  const publicOrigin = (window.location.origin + window.location.pathname).replace('ais-dev-', 'ais-pre-');
  
  let salonPurchaseUrl = `${publicOrigin}?action=comprar-licenca`;
  if (selectedPlanDays && selectedPlanDays !== 30) {
    salonPurchaseUrl += `&plano=${selectedPlanDays}`;
  }
  if (targetSalonName.trim()) {
    salonPurchaseUrl += `&salao=${encodeURIComponent(targetSalonName.trim())}`;
  }
  if (targetOwnerName.trim()) {
    salonPurchaseUrl += `&nome=${encodeURIComponent(targetOwnerName.trim())}`;
  }
  if (cleanPhone) {
    salonPurchaseUrl += `&phone=${cleanPhone}`;
  }

  // Pre-configured WhatsApp message for salon owner
  const defaultWhatsappMsg = `Olá${targetOwnerName.trim() ? `, *${targetOwnerName.trim()}*` : ''}! 💈✂️\n\n` +
    `Aqui está o seu link exclusivo para adquirir e ativar a licença do seu sistema de gestão e agendamentos *Agenda+Fácil.Salão*${targetSalonName.trim() ? ` para o *${targetSalonName.trim()}*` : ''}:\n\n` +
    `👉 ${salonPurchaseUrl}\n\n` +
    `Ao clicar no link, você acessará diretamente a tela de contratação da licença:\n` +
    `✅ *Passo 1/2:* Escolha o plano (30 dias, 3 meses, 6 meses ou 1 ano) e preencha os dados do seu salão\n` +
    `✅ *Passo 2/2:* Pagamento rápido via Pix com liberação imediata e envio do seu token de acesso por e-mail!\n\n` +
    `Qualquer dúvida estamos à disposição! ✨`;

  const handleCopyLink = (urlToCopy = salonPurchaseUrl) => {
    navigator.clipboard.writeText(urlToCopy);
    setCopied(true);
    saveLinkToHistory(targetSalonName.trim(), targetOwnerName.trim(), cleanPhone, selectedPlanDays, urlToCopy);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSendWhatsapp = (targetP = cleanPhone, targetN = targetOwnerName, targetS = targetSalonName, url = salonPurchaseUrl) => {
    const textToSend = defaultWhatsappMsg;
    const encoded = encodeURIComponent(textToSend);
    saveLinkToHistory(targetS.trim(), targetN.trim(), targetP, selectedPlanDays, url);

    if (targetP && targetP.length >= 10) {
      window.open(`https://api.whatsapp.com/send?phone=55${targetP}&text=${encoded}`, '_blank');
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    }
  };

  const saveLinkToHistory = (sName: string, oName: string, phone: string, plan: number, url: string) => {
    const newEntry: SavedSalonLink = {
      id: `salon-link-${Date.now()}`,
      salonName: sName || 'Link Geral para Salões',
      ownerName: oName || 'Proprietário',
      phone: phone || '',
      planDays: plan,
      url,
      createdAt: new Date().toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    const updated = [newEntry, ...savedLinks.filter(l => l.url !== url)].slice(0, 8);
    setSavedLinks(updated);
    localStorage.setItem('savedSalonPurchaseLinks', JSON.stringify(updated));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-violet-500/40 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-800 p-4 sm:p-5 text-white flex items-center justify-between shadow-md shrink-0 border-b border-violet-500/30">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/15 rounded-2xl border border-white/25 backdrop-blur-sm shadow-inner">
              <Link2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-400/25 text-amber-300 font-extrabold text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-amber-300/40 flex items-center gap-1">
                  👑 Painel do Administrador
                </span>
                <span className="bg-emerald-500/80 text-white font-bold text-[9px] px-2 py-0.5 rounded-full">
                  Link Direto de Venda
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black mt-0.5 tracking-tight flex items-center gap-2">
                <span>Enviar Link de Compra p/ Salão</span>
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
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar text-slate-200 text-xs">
          
          {/* Main Info Banner */}
          <div className="bg-gradient-to-r from-violet-950/70 via-indigo-950/50 to-slate-950 border border-violet-500/40 p-4 rounded-2xl text-left text-xs text-violet-200 flex items-start gap-3.5 shadow-lg">
            <ShoppingCart className="w-6 h-6 text-violet-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-extrabold text-white text-sm flex items-center gap-2">
                <span>Como funciona o Link de Compra para o Salão:</span>
              </h4>
              <p className="text-slate-300 leading-relaxed">
                Envie este link para qualquer proprietário de salão de cabeleireiro ou barbearia. Ao clicar, ele acessará diretamente a tela oficial de <strong>Comprar Licença do Aplicativo</strong> com todas as informações, escolha de prazos e preenchimento dos dados (Passo 1/2) e pagamento seguro via Pix com geração do Token e liberação imediata (Passo 2/2).
              </p>
            </div>
          </div>

          {/* Generated Link Display & Direct Actions */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-inner">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-violet-400" />
                <span>Link de Compra Gerado (Pronto para Envio):</span>
              </label>
              {copied && (
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 animate-pulse">
                  <Check className="w-3.5 h-3.5" /> Link copiado!
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={salonPurchaseUrl}
                className="w-full bg-slate-900 border border-slate-700 focus:border-violet-500 rounded-xl px-3 py-2.5 text-xs text-white font-mono select-all transition-colors"
              />
              <button
                type="button"
                onClick={() => handleCopyLink()}
                className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all shrink-0 shadow-md active:scale-95 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-violet-600 hover:bg-violet-500 text-white'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copiado!' : 'Copiar Link'}</span>
              </button>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleSendWhatsapp()}
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

          {/* Optional Pre-fill / Customization Settings */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Personalizar Link (Opcional):</span>
              </h4>
              <span className="text-[10px] text-slate-400">Preenche automaticamente os campos para o cliente</span>
            </div>

            {/* Plan selection selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300">
                Destacar Plano Inicial no Link:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {plans.map((p) => {
                  const isSel = selectedPlanDays === p.days;
                  return (
                    <button
                      key={p.days}
                      type="button"
                      onClick={() => setSelectedPlanDays(p.days)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSel
                          ? 'bg-violet-600/30 border-violet-400 text-white shadow-md'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-extrabold text-xs">{p.shortLabel}</div>
                      <div className="font-black text-emerald-400 text-xs mt-0.5">{p.priceStr}</div>
                      <div className="text-[9px] text-slate-400">{p.monthlyEquivalentStr}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom buyer info fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Nome do Salão (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ex: Studio Bella Donna"
                  value={targetSalonName}
                  onChange={(e) => setTargetSalonName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Nome do Proprietário (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ex: Carlos Eduardo"
                  value={targetOwnerName}
                  onChange={(e) => setTargetOwnerName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  WhatsApp do Salão (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ex: (11) 98765-4321"
                  value={targetPhone}
                  onChange={(e) => setTargetPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Pricing & License Terms Overview */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Tabela de Preços Vigente das Licenças:</span>
              </h4>
              {onOpenAdminPaymentConfig && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAdminPaymentConfig();
                  }}
                  className="text-amber-400 hover:text-amber-300 font-bold text-[11px] flex items-center gap-1 hover:underline"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Ajustar Valores / Chave Pix</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {plans.map((p) => (
                <div key={p.days} className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">{p.label}</span>
                  <div className="text-sm font-black text-white">{p.priceStr}</div>
                  <div className="text-[10px] text-emerald-400 font-bold">{p.monthlyEquivalentStr}</div>
                  <div className="text-[9px] text-slate-500">{p.badge || p.tag || 'Plano Padrão'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Saved History */}
          {savedLinks.length > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-slate-400" />
                <span>Links Enviados Recentemente:</span>
              </h4>
              <div className="space-y-2">
                {savedLinks.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-white truncate">{item.salonName}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2">
                        <span>👤 {item.ownerName}</span>
                        {item.phone && <span>• 📞 {item.phone}</span>}
                        <span>• 📅 {item.createdAt}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(item.url);
                          setCopiedHistoryId(item.id);
                          setTimeout(() => setCopiedHistoryId(null), 2500);
                        }}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors"
                      >
                        {copiedHistoryId === item.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedHistoryId === item.id ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                      <button
                        onClick={() => {
                          const encoded = encodeURIComponent(
                            `Olá, ${item.ownerName}! 💈✂️ Segue o link para contratação da licença do Agenda+Fácil.Salão:\n\n👉 ${item.url}`
                          );
                          if (item.phone && item.phone.length >= 10) {
                            window.open(`https://api.whatsapp.com/send?phone=55${item.phone}&text=${encoded}`, '_blank');
                          } else {
                            window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
                          }
                        }}
                        className="bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 p-1.5 rounded-lg transition-colors"
                        title="Reenviar pelo WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Link seguro com ativação em 2 passos</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2 rounded-xl text-xs transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
