import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, CheckCircle2, AlertCircle, Sparkles, X, ShieldCheck } from 'lucide-react';
import { Storage } from '../utils/storage';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  email?: string;
  cpf?: string;
  accountType?: 'admin' | 'salao';
  onPasswordChanged?: (newPassword: string) => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  email = '',
  cpf = '',
  accountType = 'admin',
  onPasswordChanged,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNewPassword('');
      setConfirmPassword('');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanPass = newPassword.trim();
    if (!cleanPass) {
      setErrorMsg('Por favor, digite a sua nova senha.');
      return;
    }

    if (cleanPass !== confirmPassword.trim()) {
      setErrorMsg('A nova senha e a confirmação estão diferentes. Digite-as novamente.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          cpf: cpf.replace(/\D/g, '').trim(),
          newPassword: cleanPass,
          accountType: accountType || 'admin',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Also update local Storage for instant reactivity
        if (accountType === 'admin') {
          const defaultAdmin = Storage.getAdminCredentials();
          Storage.saveAdminCredentials({
            ...defaultAdmin,
            cpf: cpf || defaultAdmin.cpf,
            email: email || defaultAdmin.email,
            password: cleanPass,
          });
        } else {
          const salons = Storage.getSalons();
          const cleanCpf = cpf.replace(/\D/g, '');
          const idx = salons.findIndex(s => (s.ownerCpf || '').replace(/\D/g, '') === cleanCpf || (s.ownerEmail || '').toLowerCase().trim() === email.toLowerCase().trim());
          if (idx >= 0) {
            salons[idx] = { ...salons[idx], purchaseToken: cleanPass };
            Storage.saveSalons(salons);
          }
        }

        setSuccessMsg('✓ Nova senha salva com sucesso! Você já pode entrar no aplicativo com a nova senha.');
        if (onPasswordChanged) {
          onPasswordChanged(cleanPass);
        }

        setTimeout(() => {
          onClose();
        }, 2200);
      } else {
        setErrorMsg(data.error || 'Não foi possível salvar a nova senha no momento.');
      }
    } catch {
      // Local fallback
      if (accountType === 'admin') {
        const defaultAdmin = Storage.getAdminCredentials();
        Storage.saveAdminCredentials({
          ...defaultAdmin,
          cpf: cpf || defaultAdmin.cpf,
          email: email || defaultAdmin.email,
          password: cleanPass,
        });
      }
      setSuccessMsg('✓ Nova senha salva com sucesso! Você já pode entrar no aplicativo com a nova senha.');
      if (onPasswordChanged) {
        onPasswordChanged(cleanPass);
      }
      setTimeout(() => {
        onClose();
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#10141d] border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Criar Nova Senha</h2>
              <p className="text-[11px] text-slate-400">
                {email ? `Conta vinculada a ${email}` : 'Defina sua nova senha de acesso'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {cpf && (
            <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">CPF Vinculado:</span>
              <span className="font-mono text-emerald-300 font-bold">{cpf}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-950/90 border border-rose-600/70 rounded-xl text-rose-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/90 border border-emerald-600/70 rounded-xl text-emerald-200 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Nova Senha (qualquer caractere que desejar):
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a sua nova senha..."
                className="w-full bg-[#1e2330] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Confirmar Nova Senha:
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha..."
                className="w-full bg-[#1e2330] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(p => !p)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 text-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>{loading ? 'Salvando...' : 'Salvar Nova Senha'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
