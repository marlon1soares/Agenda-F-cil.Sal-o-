import React, { useState, useEffect } from 'react';
import { X, Key, ShieldCheck, Scissors, User, ArrowRight, CheckCircle2, AlertCircle, Copy, Sparkles } from 'lucide-react';
import { SalonApp } from '../types';
import { Storage } from '../utils/storage';

interface SalonAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  salons: SalonApp[];
  onSuccess: (salon: SalonApp) => void;
  initialCpf?: string;
  initialToken?: string;
}

export const SalonAuthModal: React.FC<SalonAuthModalProps> = ({
  isOpen,
  onClose,
  salons: _salons,
  onSuccess,
  initialCpf = '',
  initialToken = '',
}) => {
  const [cpf, setCpf] = useState('');
  const [token, setToken] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedCpf, setCopiedCpf] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCpf(initialCpf || '');
      setToken(initialToken || '');
      setErrorMsg('');
      setSuccessMsg('');
      setCopiedCpf(false);
      setCopiedToken(false);
    }
  }, [isOpen, initialCpf, initialToken]);

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

  const handleCopyCpf = () => {
    const textToCopy = cpf || initialCpf;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedCpf(true);
      setTimeout(() => setCopiedCpf(false), 2000);
    }
  };

  const handleCopyToken = () => {
    const textToCopy = token || initialToken;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b1222] border border-slate-700/80 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
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

        {/* Form Body */}
        <form onSubmit={handleLogin} className="p-5 space-y-4 text-xs text-slate-200 overflow-y-auto">
          {/* Banner de Instruções e Passo a Passo */}
          <div className="bg-slate-900/90 border border-sky-500/50 p-3.5 rounded-2xl space-y-2 shadow-inner">
            <div className="flex items-center gap-2 text-amber-300">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h4 className="text-[11px] font-black uppercase tracking-wide">
                Passo a Passo de Acesso:
              </h4>
            </div>
            <ol className="text-[11px] text-sky-100 space-y-1 pl-4 list-decimal leading-relaxed font-medium">
              <li>Adicione o seu <strong>CPF</strong> cadastrado.</li>
              <li>Adicione o seu <strong>Token de Licença</strong> gerado no teste/compra.</li>
              <li>Clique em <strong>"Entrar no Painel do Salão"</strong> para liberar o sistema.</li>
            </ol>
          </div>

          {/* Destaque das Credenciais quando já preenchidas */}
          {(initialCpf || initialToken) && (
            <div className="bg-slate-950 p-3 rounded-2xl border border-emerald-500/50 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold text-emerald-300 uppercase">
                <span>Credenciais Geradas:</span>
                <span className="text-slate-400">Clique para copiar</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopyCpf}
                  className="bg-slate-900 hover:bg-slate-800 p-2 rounded-xl border border-slate-700 text-left transition-colors flex items-center justify-between"
                >
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold">CPF:</span>
                    <span className="text-xs font-mono font-bold text-sky-300 truncate block">{initialCpf || cpf}</span>
                  </div>
                  <Copy className="w-3 h-3 text-slate-400 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={handleCopyToken}
                  className="bg-slate-900 hover:bg-slate-800 p-2 rounded-xl border border-emerald-500/40 text-left transition-colors flex items-center justify-between"
                >
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold">TOKEN:</span>
                    <span className="text-xs font-mono font-bold text-emerald-400 truncate block">{initialToken || token}</span>
                  </div>
                  <Copy className="w-3 h-3 text-emerald-400 shrink-0" />
                </button>
              </div>
              {(copiedCpf || copiedToken) && (
                <p className="text-[10px] text-emerald-400 font-bold text-center">
                  ✓ {copiedCpf ? 'CPF copiado!' : 'Token copiado!'}
                </p>
              )}
            </div>
          )}

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

          {/* Input CPF */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-slate-300">
                CPF do Proprietário:
              </label>
              {cpf && (
                <button
                  type="button"
                  onClick={handleCopyCpf}
                  className="text-[10px] text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedCpf ? 'Copiado!' : 'Copiar CPF'}</span>
                </button>
              )}
            </div>
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

          {/* Input Token */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-slate-300">
                Token de Acesso / Licença:
              </label>
              {token && (
                <button
                  type="button"
                  onClick={handleCopyToken}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedToken ? 'Copiado!' : 'Copiar Token'}</span>
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="EX: TOK-SALAO-1234"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full bg-[#070b14] border border-slate-700/80 rounded-xl px-3.5 py-3 pl-10 text-white font-mono text-sm placeholder-slate-500 uppercase tracking-wider focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner font-bold text-emerald-300"
              />
              <Key className="w-4 h-4 text-amber-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          {/* Primary Big Green Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all active:scale-98 text-sm cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5 text-white" />
              <span>Entrar no Painel do Salão ➔</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};


