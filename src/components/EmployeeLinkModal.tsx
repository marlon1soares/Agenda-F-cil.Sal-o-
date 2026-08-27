import React, { useState, useEffect } from 'react';
import { SalonApp, Professional } from '../types';
import { getSalonSlug, Storage } from '../utils/storage';
import { getPublicAppUrl, buildAppUrl } from '../utils/url';
import QRCode from 'qrcode';
import { 
  X, Link2, Copy, Check, Share2, MessageSquare, ExternalLink, 
  Sparkles, ShieldCheck, Scissors, CheckCircle2,
  Phone, User, Smartphone, Repeat, Users, Calendar, QrCode, Lock
} from 'lucide-react';

interface EmployeeLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSalon: SalonApp;
  salons?: SalonApp[];
  onOpenEmployeeView?: (salon: SalonApp, profName?: string) => void;
}

export const EmployeeLinkModal: React.FC<EmployeeLinkModalProps> = ({
  isOpen,
  onClose,
  activeSalon,
  onOpenEmployeeView,
}) => {
  const [selectedProf, setSelectedProf] = useState<string>('all');
  const [copied, setCopied] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [showQrCode, setShowQrCode] = useState(false);
  const [linkMode, setLinkMode] = useState<'live' | 'vercel'>('live');
  const [professionals, setProfessionals] = useState<Professional[]>([]);

  useEffect(() => {
    if (isOpen) {
      const profsList = Storage.getProfessionals();
      setProfessionals(profsList);
      setSelectedProf('all');
      setCopied(false);
      setShowQrCode(false);
    }
  }, [isOpen, activeSalon?.id]);

  if (!isOpen) return null;

  const salonSlug = getSalonSlug(activeSalon.config.nomeSalao || activeSalon.name);
  const targetBaseUrl = linkMode === 'live'
    ? (typeof window !== 'undefined' ? `${window.location.origin}/` : getPublicAppUrl())
    : 'https://agenda-f-cil-sal-o.vercel.app/';

  // Build employee link
  const employeeUrl = buildAppUrl({
    role: 'funcionario',
    salon: salonSlug,
    ...(selectedProf !== 'all' ? { prof: selectedProf } : {})
  }, targetBaseUrl);

  const selectedProfObj = professionals.find(p => p.nome === selectedProf);
  const profDisplay = selectedProf !== 'all' ? selectedProf : 'Equipe / Funcionários';

  // Pre-configured WhatsApp message for employee
  const defaultWhatsappMsg = `Olá, *${profDisplay}*! 💈✂️\n\n` +
    `Aqui está o seu *Link de Acesso ao Painel de Funcionário* do *${activeSalon.config.nomeSalao || activeSalon.name}*:\n\n` +
    `👉 ${employeeUrl}\n\n` +
    `Com este link você tem acesso direto e sincronizado em tempo real para:\n` +
    `📅 *Agenda* (Visualizar horários e agendamentos)\n` +
    `👥 *Equipe* (Lista de profissionais)\n` +
    `✂️ *Serviços* (Catálogo de cortes e procedimentos)\n` +
    `👤 *Clientes* (Histórico e dados dos clientes)\n\n` +
    `💡 *Dica:* Salve este link nos seus favoritos ou fixado no WhatsApp para acessar sempre que precisar! ✨`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(employeeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSendWhatsapp = () => {
    const encoded = encodeURIComponent(defaultWhatsappMsg);
    const profPhone = selectedProfObj?.phone ? selectedProfObj.phone.replace(/\D/g, '') : '';
    if (profPhone && profPhone.length >= 10) {
      window.open(`https://api.whatsapp.com/send?phone=55${profPhone}&text=${encoded}`, '_blank');
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    }
  };

  const handleToggleQrCode = async () => {
    if (!showQrCode) {
      try {
        const dataUrl = await QRCode.toDataURL(employeeUrl, {
          width: 320,
          margin: 2,
          color: {
            dark: '#042f2e',
            light: '#ffffff'
          }
        });
        setQrCodeDataUrl(dataUrl);
        setShowQrCode(true);
      } catch (err) {
        console.error('Error generating QR Code:', err);
      }
    } else {
      setShowQrCode(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b1222] border border-teal-500/40 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-teal-700 via-emerald-700 to-cyan-800 p-4 sm:p-5 text-white flex items-center justify-between shadow-md shrink-0 border-b border-teal-500/30">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/15 rounded-2xl border border-white/25 backdrop-blur-sm shadow-inner">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-teal-950/90 text-teal-300 font-extrabold text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-teal-400/40 flex items-center gap-1">
                  💈 SALÃO / ADMINISTRADOR
                </span>
                <span className="bg-emerald-500 text-white font-bold text-[9px] px-2 py-0.5 rounded-full">
                  Link Direto da Equipe
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black mt-0.5 tracking-tight flex items-center gap-2">
                <span>Enviar Link para Salão / Funcionário</span>
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
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto custom-scrollbar text-slate-200 text-xs">
          
          {/* Explanation Banner */}
          <div className="bg-slate-950 border border-teal-500/40 p-3.5 rounded-2xl text-left text-xs text-teal-200 flex items-start gap-3 shadow-md">
            <Sparkles className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-extrabold text-white block text-xs flex items-center gap-1.5">
                <span>Painel Integrado & Sincronizado em Tempo Real:</span>
                <span className="bg-teal-500/20 text-teal-300 text-[9px] px-2 py-0.5 rounded font-mono">100% Sincronizado</span>
              </span>
              <p className="text-[11px] text-teal-200/90 leading-relaxed">
                Ao abrir este link, o funcionário acessa instantaneamente o painel com <strong>Agenda</strong>, <strong>Equipe</strong>, <strong>Serviços</strong> e <strong>Clientes</strong> integrados diretamente ao banco de dados do salão.
              </p>
              <div className="pt-1 flex flex-wrap gap-2 text-[10px] text-slate-400 font-semibold">
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> Agenda & Horários
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> Catálogo de Serviços
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> Clientes & Atendimentos
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <Lock className="w-3 h-3" /> Dashboard & Caixa Protegidos
                </span>
              </div>
            </div>
          </div>

          {/* Active Salon Card */}
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 font-bold shrink-0">
                <Scissors className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block font-bold">Salão Selecionado:</span>
                <span className="font-black text-white text-xs block">{activeSalon.config.nomeSalao || activeSalon.name}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="bg-teal-500/20 text-teal-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border border-teal-500/30">
                {activeSalon.appCode}
              </span>
            </div>
          </div>

          {/* Target Professional Selection */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <label className="block text-slate-300 font-bold text-[11px] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-teal-400" />
                <span>Destinatário do Link:</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                {professionals.length} profissionais na equipe
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedProf('all')}
                className={`py-2 px-3 rounded-xl text-xs font-bold text-left transition-all border flex items-center justify-between ${
                  selectedProf === 'all'
                    ? 'bg-teal-900/60 border-teal-500 text-teal-300 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>👥 Link Geral (Toda a Equipe)</span>
                {selectedProf === 'all' && <Check className="w-3.5 h-3.5 text-teal-400" />}
              </button>

              {professionals.map((prof) => (
                <button
                  key={prof.id || prof.nome}
                  type="button"
                  onClick={() => setSelectedProf(prof.nome)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold text-left transition-all border flex items-center justify-between truncate ${
                    selectedProf === prof.nome
                      ? 'bg-teal-900/60 border-teal-500 text-teal-300 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="truncate">👤 {prof.nome}</span>
                  {selectedProf === prof.nome && <Check className="w-3.5 h-3.5 text-teal-400 shrink-0 ml-1" />}
                </button>
              ))}
            </div>
          </div>

          {/* Generated Link Display Box */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-teal-500/40 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Link de Acesso para Salão / Funcionário:</span>
              </span>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                Ativo & Pronto
              </span>
            </div>

            <div className="bg-[#050914] p-3 rounded-xl border border-slate-800 flex items-center gap-2 overflow-hidden">
              <input
                type="text"
                readOnly
                value={employeeUrl}
                className="w-full bg-transparent font-mono text-[11px] text-teal-300 focus:outline-none select-all"
              />
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-98 text-xs cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-white" />}
                <span>{copied ? 'Link Copiado!' : 'Copiar Link do Funcionário'}</span>
              </button>

              <button
                type="button"
                onClick={handleSendWhatsapp}
                className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-2.5 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-98 text-xs cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-white" />
                <span>Enviar pelo WhatsApp</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleToggleQrCode}
                className="w-full bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold py-2 px-3 rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all text-xs cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-teal-400" />
                <span>{showQrCode ? 'Ocultar QR Code' : 'Exibir QR Code p/ Celular'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenEmployeeView) {
                    onOpenEmployeeView(activeSalon, selectedProf !== 'all' ? selectedProf : undefined);
                    onClose();
                  } else {
                    window.open(employeeUrl, '_blank');
                  }
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 px-3 rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all text-xs cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-teal-400" />
                <span>Testar / Abrir Painel do Funcionário</span>
              </button>
            </div>

            {/* QR Code Container */}
            {showQrCode && qrCodeDataUrl && (
              <div className="mt-3 p-4 bg-white rounded-2xl flex flex-col items-center justify-center gap-2 border border-teal-500 animate-in fade-in zoom-in duration-150">
                <span className="text-slate-800 font-black text-xs">
                  Escaneie com a câmera do celular para abrir o painel do funcionário:
                </span>
                <img src={qrCodeDataUrl} alt="QR Code Funcionário" className="w-48 h-48 rounded-xl shadow-md" />
                <span className="text-[10px] text-slate-500 font-medium">
                  {activeSalon.config.nomeSalao} • {profDisplay}
                </span>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
