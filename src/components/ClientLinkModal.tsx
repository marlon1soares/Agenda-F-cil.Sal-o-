import React, { useState, useEffect } from 'react';
import { SalonApp, ClientRecord } from '../types';
import { getSalonSlug, Storage } from '../utils/storage';
import { getPublicAppUrl } from '../utils/url';
import { 
  X, Link2, Copy, Check, Share2, MessageSquare, ExternalLink, 
  Sparkles, UserCheck, ShieldCheck, Scissors, CheckCircle2,
  Phone, User, History, Smartphone, Repeat, Search
} from 'lucide-react';

interface ClientLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSalon: SalonApp;
  salons?: SalonApp[];
  onSelectSalon?: (salon: SalonApp) => void;
  onOpenClientView: (salon: SalonApp) => void;
}

interface SavedClientLink {
  id: string;
  name: string;
  phone: string;
  salonId: string;
  url: string;
  createdAt: string;
}

export const ClientLinkModal: React.FC<ClientLinkModalProps> = ({
  isOpen,
  onClose,
  activeSalon,
  onOpenClientView,
}) => {
  const [clientPhone, setClientPhone] = useState('');
  const [clientName, setClientName] = useState('');
  const [copied, setCopied] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [existingClients, setExistingClients] = useState<ClientRecord[]>([]);
  const [savedLinks, setSavedLinks] = useState<SavedClientLink[]>([]);
  const [copiedHistoryId, setCopiedHistoryId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setExistingClients(Storage.getClients());
      try {
        const stored = localStorage.getItem(`savedClientLinks_${activeSalon?.id || 'default'}`);
        if (stored) {
          setSavedLinks(JSON.parse(stored));
        }
      } catch {
        setSavedLinks([]);
      }
    }
  }, [isOpen, activeSalon?.id]);

  if (!isOpen) return null;

  // Format and clean phone number
  const cleanPhone = clientPhone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.length > 2
    ? `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 7)}${cleanPhone.length > 7 ? `-${cleanPhone.slice(7, 11)}` : ''}`
    : cleanPhone;

  // Build client link for this specific salon and client's phone
  const salonSlug = getSalonSlug(activeSalon.config.nomeSalao || activeSalon.name);
  const publicOrigin = getPublicAppUrl();
  
  let clientUrl = `${publicOrigin}?role=cliente&salon=${salonSlug}`;
  if (cleanPhone) {
    clientUrl += `&phone=${cleanPhone}`;
  }
  if (clientName.trim()) {
    clientUrl += `&name=${encodeURIComponent(clientName.trim())}`;
  }

  // Pre-configured WhatsApp message for client
  const defaultWhatsappMsg = `Olá${clientName.trim() ? `, *${clientName.trim()}*` : ''}! 💈✂️\n\n` +
    `Aqui está o seu *Link Exclusivo e Permanente* para agendar seus horários no *${activeSalon.config.nomeSalao}*:\n\n` +
    `👉 ${clientUrl}\n\n` +
    `💡 *Você pode salvar esse link no seu WhatsApp e usar quantas vezes quiser para marcar seus próximos horários!* Basta clicar, escolher o serviço e o horário disponível. ✨`;

  const handleCopyLink = (urlToCopy = clientUrl) => {
    navigator.clipboard.writeText(urlToCopy);
    setCopied(true);
    saveLinkToHistory(clientName.trim(), cleanPhone, urlToCopy);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSendWhatsapp = (targetPhone = cleanPhone, targetName = clientName) => {
    const textToSend = defaultWhatsappMsg;
    const encoded = encodeURIComponent(textToSend);
    saveLinkToHistory(targetName.trim(), targetPhone, clientUrl);

    if (targetPhone && targetPhone.length >= 10) {
      window.open(`https://api.whatsapp.com/send?phone=55${targetPhone}&text=${encoded}`, '_blank');
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    }
  };

  const saveLinkToHistory = (name: string, phone: string, url: string) => {
    if (!phone && !name) return;
    const newEntry: SavedClientLink = {
      id: `link-${Date.now()}`,
      name: name || 'Cliente sem nome',
      phone: phone || 'Geral',
      salonId: activeSalon.id,
      url,
      createdAt: new Date().toLocaleDateString('pt-BR')
    };

    const updated = [newEntry, ...savedLinks.filter(l => l.phone !== phone || !phone)].slice(0, 8);
    setSavedLinks(updated);
    try {
      localStorage.setItem(`savedClientLinks_${activeSalon?.id || 'default'}`, JSON.stringify(updated));
    } catch {}
  };

  const handleSelectExistingClient = (c: ClientRecord) => {
    setClientName(c.name);
    setClientPhone(c.phone);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 p-4 sm:p-5 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl border border-white/20 backdrop-blur-sm">
              <Link2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="bg-white/20 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider border border-white/20">
                  Link Vitalício por Celular
                </span>
                <span className="bg-emerald-500/80 text-white font-bold text-[9px] px-2 py-0.5 rounded-full">
                  Uso Ilimitado
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black mt-0.5 tracking-tight flex items-center gap-2">
                <span>Criar Link Exclusivo do Cliente</span>
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
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto custom-scrollbar text-slate-200 text-xs">
          
          {/* Key Rule Highlight Banner */}
          <div className="bg-gradient-to-r from-emerald-950/80 to-slate-950 border border-emerald-500/50 p-3.5 rounded-2xl text-left text-xs text-emerald-200 flex items-start gap-3 shadow-md">
            <Repeat className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-extrabold text-white block text-xs flex items-center gap-1.5">
                <span>Link Permanente & Atrelado ao Celular do Cliente:</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-2 py-0.5 rounded font-mono">1 Link = Infinitos Agendamentos</span>
              </span>
              <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                Ao atrelar o link ao número de WhatsApp do cliente, ele poderá <strong>utilizar este mesmo link várias e várias vezes</strong> ao longo dos meses para agendar no seu salão, sem nunca precisar que você gere um novo link!
              </p>
            </div>
          </div>

          {/* Active Salon Card */}
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-300 font-bold shrink-0">
                <Scissors className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block font-bold">Salão Proprietário:</span>
                <span className="font-black text-white text-xs block">{activeSalon.config.nomeSalao}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border border-rose-500/30">
                {activeSalon.appCode}
              </span>
            </div>
          </div>

          {/* Client Input Fields Form */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-purple-500/40 space-y-3 shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-[11px] font-black text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                <span>Dados do Cliente para Vincular o Link:</span>
              </span>
              <span className="text-[10px] text-slate-400">Preenchimento rápido</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-bold text-[11px] mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-400" />
                  <span>Celular / WhatsApp do Cliente:</span>
                  <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(11) 98888-7777"
                  className="w-full bg-slate-900 border border-emerald-500/50 rounded-xl px-3 py-2 text-white font-mono font-bold text-xs focus:outline-none focus:border-emerald-400 placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold text-[11px] mb-1 flex items-center gap-1">
                  <User className="w-3 h-3 text-purple-400" />
                  <span>Nome do Cliente (Opcional):</span>
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-400 placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Quick Pick from Salon's Registered Clients */}
            {existingClients.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-bold flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-amber-400" />
                    <span>Ou selecione um cliente já cadastrado no salão:</span>
                  </span>
                  <span>{existingClients.length} cadastrados</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                  {existingClients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectExistingClient(c)}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all border flex items-center gap-1 ${
                        clientPhone === c.phone
                          ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <span>{c.name}</span>
                      <span className="text-[9px] opacity-70 font-mono">({c.phone})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Generated Personalized Link Box */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-rose-500/50 space-y-2.5 shadow-inner">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Link Permanente Gerado para o Cliente:</span>
              </label>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                {cleanPhone ? `Atrelado a: ${formattedPhone}` : 'Link Geral do Salão'}
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
                type="button"
                onClick={() => handleCopyLink()}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all shadow-md active:scale-95 ${
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

          {/* Direct WhatsApp Share Box */}
          <div className="bg-emerald-950/40 border border-emerald-800/60 p-4 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-emerald-300 flex items-center gap-2 text-xs">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>Enviar Direto para o WhatsApp do Cliente</span>
              </h3>
              <span className="text-[10px] text-emerald-400/90 font-bold">1 Clique</span>
            </div>

            <p className="text-[11px] text-slate-300">
              {cleanPhone
                ? `Ao clicar, o WhatsApp abrirá diretamente na conversa com ${clientName ? clientName : formattedPhone} com o link permanente pronto.`
                : 'Informe o celular do cliente acima para abrir diretamente a conversa com ele no WhatsApp.'}
            </p>

            <button
              type="button"
              onClick={() => handleSendWhatsapp()}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 border border-emerald-400/30"
            >
              <Share2 className="w-4 h-4" />
              <span>
                {cleanPhone
                  ? `Enviar Link para ${clientName ? clientName : formattedPhone} no WhatsApp`
                  : 'Enviar Link pelo WhatsApp'}
              </span>
            </button>
          </div>

          {/* Recently Created Client Links History */}
          {savedLinks.length > 0 && (
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <History className="w-3 h-3 text-purple-400" />
                  <span>Links de Clientes Criados Recentemente:</span>
                </span>
                <span className="text-[9px] text-slate-500">Salvos no salão</span>
              </div>

              <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                {savedLinks.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px]">
                    <div className="truncate mr-2">
                      <span className="font-bold text-white block truncate">{item.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{item.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          handleCopyLink(item.url);
                          setCopiedHistoryId(item.id);
                          setTimeout(() => setCopiedHistoryId(null), 2000);
                        }}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1"
                      >
                        {copiedHistoryId === item.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>Copiar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendWhatsapp(item.phone.replace(/\D/g, ''), item.name)}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>Whats</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Test Client Page Button */}
          <div className="bg-purple-950/40 border border-purple-800/60 p-3.5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-purple-300 flex items-center gap-1.5 text-xs">
                <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Testar Visão Deste Cliente</span>
              </h3>
            </div>

            <button
              type="button"
              onClick={() => {
                if (cleanPhone) {
                  localStorage.setItem('salao_cliente_phone', cleanPhone);
                }
                if (clientName) {
                  localStorage.setItem('salao_cliente_name', clientName);
                }
                onClose();
                onOpenClientView(activeSalon);
              }}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 border border-purple-400/30"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir Portal do Cliente Agora</span>
            </button>
          </div>

          {/* How it works summary */}
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1.5 text-[10px] text-slate-300">
            <span className="font-bold text-slate-400 uppercase tracking-wider block">
              💡 Vantagens do Link Atrelado ao Celular:
            </span>
            <ul className="space-y-1 text-slate-300">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Sem necessidade de novos links:</strong> O cliente guarda no WhatsApp e usa para sempre.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Identificação Automática:</strong> O celular e nome já abrem preenchidos no formulário.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Sincronização Imediata:</strong> Todo agendamento entra direto no painel do seu salão em tempo real.</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex justify-end shrink-0">
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

