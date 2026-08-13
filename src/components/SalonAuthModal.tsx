import React, { useState, useEffect } from 'react';
import { X, Lock, Key, ShieldCheck, Scissors, UserCheck, ArrowRight, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { SalonApp } from '../types';
import { Storage } from '../utils/storage';

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

  useEffect(() => {
    if (isOpen) {
      setCpf('');
      setToken('');
      setErrorMsg('');
      setSuccessMsg('');
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
      setErrorMsg('Por favor, informe o CPF do proprietário e o Token de Acesso.');
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

      setSuccessMsg(`Autenticado com sucesso! Entrando na gestão de ${matchedSalon.config.nomeSalao || matchedSalon.name}...`);
      setTimeout(() => {
        onSuccess(matchedSalon);
      }, 600);
    } else {
      setErrorMsg('CPF ou Token de Licença não encontrados. Verifique os dados recebidos no seu e-mail/comprovante de compra.');
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 p-5 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/30 rounded-2xl border border-emerald-400/40 text-emerald-300">
              <Scissors className="w-6 h-6" />
            </div>
            <div>
              <span className="bg-emerald-500/30 text-emerald-200 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-emerald-400/30">
                Acesso do Proprietário
              </span>
              <h2 className="text-lg font-black mt-0.5 tracking-tight text-white flex items-center gap-1.5">
                <span>Acessar Painel do Salão</span>
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

        {/* Form Body */}
        <form onSubmit={handleLogin} className="p-5 space-y-4 text-xs text-slate-200">
          <div className="bg-emerald-950/60 border border-emerald-800/80 p-3 rounded-2xl flex items-start gap-2.5 text-emerald-200">
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

          {/* Input CPF */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              CPF do Proprietário:
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={handleCpfChange}
                maxLength={14}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 pl-9 text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          {/* Input Token */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Token de Acesso / Licença:
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ex: TOK-PARCAS-2026"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 pl-9 text-white font-mono text-sm placeholder-slate-500 uppercase tracking-wide focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <Key className="w-4 h-4 text-amber-400 absolute left-3 top-3" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-98 text-sm"
            >
              <span>Entrar no Painel do Salão</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Fill Demo Data Button */}
            <button
              type="button"
              onClick={handleFillDemo}
              className="w-full bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Usar Credenciais do Salão de Teste</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
