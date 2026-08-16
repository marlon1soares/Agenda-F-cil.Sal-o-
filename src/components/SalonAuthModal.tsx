import React, { useState, useEffect } from 'react';
import { X, Key, ShieldCheck, Scissors, User, ArrowRight, Sparkles, CheckCircle2, AlertCircle, Copy, Check, Share2, Link2 } from 'lucide-react';
import { SalonApp } from '../types';
import { Storage } from '../utils/storage';
import { buildAppUrl } from '../utils/url';

interface SalonAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  salons: SalonApp[];
  onSuccess: (salon: SalonApp) => void;
}

export const SalonAuthModal: React.FC<SalonAuthModalProps> = ({
  isOpen,
  onClose,
  salons,
  onSuccess,
}) => {
  const [cpf, setCpf] = useState('');
  const [token, setToken] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const salonAccessUrl = buildAppUrl({ action: 'acesso-salao' });

  useEffect(() => {
    if (isOpen) {
      setCpf('');
      setToken('');
      setErrorMsg('');
      setSuccessMsg('');
      setCopiedLink(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Format CPF as user types: 000.000.000-00
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 11) val = val.slice(0, 11);

    if (val.length > 9) {
      val = val.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    } else if (val.length > 6) {
      val = val.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (val.length > 3) {
      val = val.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    }
    setCpf(val);
    setErrorMsg('');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanCpf = cpf.replace(/\D/g, '').trim();
    const cleanToken = token.trim().toUpperCase();

    if (!cleanCpf && !cleanToken) {
      setErrorMsg('Por favor, informe o CPF do proprietário e o Token de Licença.');
      return;
    }

    const currentSalons = Storage.getSalons();

    // Match salon by CPF and Token, OR by Token alone
    const matchedSalon = currentSalons.find((s) => {
      const salonCpfClean = (s.ownerCpf || '').replace(/\D/g, '').trim();
      const salonToken = (s.purchaseToken || '').trim().toUpperCase();
      const salonCode = (s.appCode || '').trim().toUpperCase();

      // Exact match on CPF + Token
      const matchesCpfAndToken = cleanCpf && salonCpfClean === cleanCpf && (salonToken === cleanToken || salonCode === cleanToken);
      // Or Token match alone if CPF is blank
      const matchesTokenOnly = !cleanCpf && (salonToken === cleanToken || salonCode === cleanToken);
      // Or Master demo credentials
      const matchesDemo = (cleanCpf === '12345678900' || !cleanCpf) && (cleanToken === 'TOK-PARCAS-2026' || cleanToken === 'DEMO' || cleanToken === '123456');

      return matchesCpfAndToken || matchesTokenOnly || (matchesDemo && s.id === currentSalons[0]?.id);
    });

    if (matchedSalon) {
      if (matchedSalon.status === 'blocked') {
        setErrorMsg('Este salão está com o acesso bloqueado pelo Administrador da plataforma.');
        return;
      }

      setSuccessMsg(`Autenticado com sucesso! Entrando no sistema de ${matchedSalon.config.nomeSalao || matchedSalon.name}...`);
      setTimeout(() => {
        onSuccess(matchedSalon);
      }, 600);
    } else {
      setErrorMsg('CPF ou Token de Licença não encontrados. Verifique os dados gerados na compra ou teste do aplicativo.');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(salonAccessUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsapp = () => {
    const text = `💈 *Link de Acesso ao Sistema do Salão:*\n👉 ${salonAccessUrl}\n\n🔑 Digite seu *CPF* e o *Token de Licença* para entrar no painel do seu salão!`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Helper to fill demo credentials
  const handleFillDemo = () => {
    const firstSalon = salons[0];
    if (firstSalon) {
      setCpf(firstSalon.ownerCpf || '123.456.789-00');
      setToken(firstSalon.purchaseToken || 'TOK-PARCAS-2026');
      setErrorMsg('');
    } else {
      setCpf('123.456.789-00');
      setToken('TOK-PARCAS-2026');
      setErrorMsg('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b1222] border border-slate-700/80 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header matching Image 2 */}
        <div className="p-5 text-white flex items-center justify-between border-b border-slate-800/80 bg-[#0b1222]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600/25 rounded-2xl border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-inner">
              <Scissors className="w-6 h-6" />
            </div>
            <div>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-emerald-500/30">
                ACESSO DO PROPRIETÁRIO
              </span>
              <h2 className="text-xl font-black mt-0.5 tracking-tight text-white flex items-center gap-1.5">
                <span>Acessar Painel do Salão</span>
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body matching Image 2 */}
        <form onSubmit={handleLogin} className="p-5 space-y-4 text-xs text-slate-200">
          <div className="bg-emerald-950/40 border border-emerald-800/60 p-3.5 rounded-2xl flex items-start gap-2.5 text-emerald-200 shadow-inner">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Digite o <strong className="text-white">CPF do Proprietário</strong> e o <strong className="text-white">Token de Licença</strong> gerado no momento da compra do aplicativo para entrar no seu sistema de gestão.
            </p>
          </div>

          {errorMsg && (
            <div className="bg-rose-950/80 border border-rose-700 p-3 rounded-2xl flex items-start gap-2 text-rose-200 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="text-xs leading-relaxed font-semibold">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-950/80 border border-emerald-600 p-3 rounded-2xl flex items-center gap-2 text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-bold">{successMsg}</span>
            </div>
          )}

          {/* Input CPF matching Image 2 */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              CPF do Proprietário:
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={handleCpfChange}
                maxLength={14}
                className="w-full bg-[#070b14] border border-slate-700/80 rounded-xl px-3.5 py-3 pl-10 text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          {/* Input Token matching Image 2 */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Token de Acesso / Licença:
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="EX:  TOK-PARCAS-2026"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full bg-[#070b14] border border-slate-700/80 rounded-xl px-3.5 py-3 pl-10 text-white font-mono text-sm placeholder-slate-500 uppercase tracking-wider focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner"
              />
              <Key className="w-4 h-4 text-amber-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          {/* Primary Big Green Action Button matching Image 2 */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-2xl shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all active:scale-98 text-sm cursor-pointer"
            >
              <span>Entrar no Painel do Salão</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Link Sharing / Copy bar */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 space-y-2 mt-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-400 flex items-center gap-1">
                <Link2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Link Direto de Acesso (Salão)</span>
              </span>
              {copiedLink && (
                <span className="text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
                  <Check className="w-3 h-3" /> Copiado!
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={salonAccessUrl}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-300 font-mono select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white font-bold text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 transition-all shrink-0 flex items-center gap-1 cursor-pointer"
                title="Copiar Link de Acesso"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
              </button>
              <button
                type="button"
                onClick={handleShareWhatsapp}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg transition-all shrink-0 flex items-center gap-1 cursor-pointer"
                title="Enviar no WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Demo Helper Button */}
          <button
            type="button"
            onClick={handleFillDemo}
            className="w-full bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-medium py-1.5 rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-colors border border-slate-800 cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Preencher Credenciais de Teste</span>
          </button>
        </form>

      </div>
    </div>
  );
};

