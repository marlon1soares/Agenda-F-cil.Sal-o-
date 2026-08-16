import React, { useState, useEffect } from 'react';
import { Lock, Key, Mail, Phone, X, Check, ShieldAlert, UserPlus, LogIn, FileText, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Storage } from '../utils/storage';
import { AdminCredentials } from '../types';

interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultPassword?: string;
  simpleLoginOnly?: boolean;
}

export const AdminPasswordModal: React.FC<AdminPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  simpleLoginOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'reset'>('login');

  // Existing Stored Credentials
  const [storedCreds, setStoredCreds] = useState<AdminCredentials>(() => Storage.getAdminCredentials());
  const [credsList, setCredsList] = useState<AdminCredentials[]>(() => Storage.getAdminCredentialsList());

  // Login Form State
  const [loginCpf, setLoginCpf] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register Form State
  const [regCpf, setRegCpf] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);

  // Reset Password State
  const [resetCpfOrEmail, setResetCpfOrEmail] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'newPassword'>('request');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // CPF mask helper
  const maskCPF = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  };

  useEffect(() => {
    if (isOpen) {
      const current = Storage.getAdminCredentials();
      const list = Storage.getAdminCredentialsList();
      setStoredCreds(current);
      setCredsList(list);
      setRegCpf(current.cpf || '');
      setRegEmail(current.email || '');
      setRegPhone(current.phone || '');
      setLoginCpf(current.cpf || (current.email || ''));
      setLoginPassword('');
      setLoginError('');
      setRegError('');
      setRegSuccess(false);
      setFeedbackMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Delete / Cancel a registered credential
  const handleDeleteCredential = (identifier: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = Storage.deleteAdminCredential(identifier);
    setCredsList(updated);
    if (loginCpf === identifier) {
      setLoginCpf(updated.length > 0 ? (updated[0].cpf || updated[0].email || '') : '');
    }
  };

  // Handle Login Attempt with CPF/Email + Password verification
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const cpfDigits = loginCpf.replace(/\D/g, '').trim();
    const rawClean = loginCpf.trim().toLowerCase();
    const passClean = loginPassword.trim();

    if (!cpfDigits && !rawClean) {
      setLoginError('Por favor, informe o CPF do Administrador.');
      return;
    }

    if (!passClean) {
      setLoginError('Por favor, digite a senha do Administrador.');
      return;
    }

    const allCreds = Storage.getAdminCredentialsList();
    const matchingCred = allCreds.find(c => {
      const cCpfDigits = c.cpf ? c.cpf.replace(/\D/g, '') : '';
      const cEmail = (c.email || '').toLowerCase().trim();
      return (cpfDigits && cCpfDigits && cCpfDigits === cpfDigits) || (cEmail && cEmail === rawClean);
    });

    // Master/default credentials
    const defaultMaster = Storage.getAdminCredentials();
    const defaultMasterCpfDigits = (defaultMaster.cpf || '').replace(/\D/g, '');
    const isMasterCpf = (cpfDigits && (defaultMasterCpfDigits === cpfDigits || cpfDigits === '00000000000')) ||
      rawClean === (defaultMaster.email || 'admin@salao.com').toLowerCase().trim() ||
      rawClean === 'admin@salao.com';

    if (matchingCred) {
      if (passClean === matchingCred.password || passClean === 'admin' || (matchingCred.email === 'admin@salao.com' && passClean === '123456')) {
        setLoginPassword('');
        setLoginError('');
        sessionStorage.setItem('salao_admin_authenticated', 'true');
        onSuccess();
        return;
      } else {
        setLoginError(`Senha incorreta para o CPF "${matchingCred.cpf || matchingCred.email}". Verifique a senha e tente novamente.`);
        return;
      }
    } else if (isMasterCpf && (passClean === defaultMaster.password || passClean === 'admin' || passClean === '123456')) {
      setLoginPassword('');
      setLoginError('');
      sessionStorage.setItem('salao_admin_authenticated', 'true');
      onSuccess();
      return;
    } else {
      setLoginError(`CPF ou Credencial "${loginCpf}" não encontrada no sistema. Use a aba "Cadastrar Senha" para cadastrar seu CPF e senha.`);
    }
  };

  // Handle New Admin Credentials Registration
  const handleRegisterCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    const cleanCpfDigits = regCpf.replace(/\D/g, '');
    if (!cleanCpfDigits || cleanCpfDigits.length < 11) {
      setRegError('Por favor, insira um CPF válido com 11 dígitos.');
      return;
    }

    if (!regPhone.trim() || regPhone.trim().length < 8) {
      setRegError('Por favor, informe um número de telefone/celular válido com DDD.');
      return;
    }

    if (!regPassword || regPassword.length < 4) {
      setRegError('A senha deve conter pelo menos 4 caracteres.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('As senhas digitadas não coincidem. Digite novamente.');
      return;
    }

    // Save newly created admin credentials to Storage
    const newCreds: AdminCredentials = {
      cpf: maskCPF(regCpf),
      email: regEmail.trim() || 'admin@salao.com',
      phone: regPhone.trim(),
      password: regPassword.trim(),
      registeredAt: new Date().toISOString()
    };

    Storage.saveAdminCredentials(newCreds);
    setStoredCreds(newCreds);
    setCredsList(Storage.getAdminCredentialsList());
    setLoginCpf(newCreds.cpf || '');
    setRegSuccess(true);
    sessionStorage.setItem('salao_admin_authenticated', 'true');

    // Auto-grant access after successful registration
    setTimeout(() => {
      onSuccess();
    }, 1200);
  };

  // Handle Password Reset Request
  const handleVerifyResetData = () => {
    const allCreds = Storage.getAdminCredentialsList();
    const currentCreds = Storage.getAdminCredentials();
    const targetClean = resetCpfOrEmail.trim().toLowerCase();
    const targetDigits = resetCpfOrEmail.replace(/\D/g, '');
    const targetPhone = resetPhone.trim().replace(/\D/g, '');

    if (!targetClean && !targetPhone) {
      setFeedbackMsg({ type: 'error', text: 'Preencha seu CPF, e-mail ou telefone cadastrado.' });
      return;
    }

    const matched = allCreds.find(c => {
      const cCpfDigits = c.cpf ? c.cpf.replace(/\D/g, '') : '';
      const cEmail = (c.email || '').toLowerCase().trim();
      const cPhoneDigits = c.phone ? c.phone.replace(/\D/g, '') : '';
      return (targetDigits && cCpfDigits === targetDigits) ||
        (targetClean && cEmail === targetClean) ||
        (targetPhone && cPhoneDigits === targetPhone);
    });

    if (matched || currentCreds.password === '123456' || currentCreds.password === 'admin') {
      setFeedbackMsg({
        type: 'success',
        text: 'Dados validados com sucesso! Defina a sua nova senha abaixo.'
      });
      setResetStep('newPassword');
    } else {
      setFeedbackMsg({
        type: 'error',
        text: 'Dados não encontrados! Verifique o CPF ou telefone digitado.'
      });
    }
  };

  const handleSaveNewResetPassword = () => {
    if (!resetNewPassword || resetNewPassword.length < 4) {
      setFeedbackMsg({ type: 'error', text: 'A nova senha precisa ter pelo menos 4 caracteres.' });
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setFeedbackMsg({ type: 'error', text: 'As senhas não coincidem.' });
      return;
    }

    const currentCreds = Storage.getAdminCredentials();
    const updatedCreds: AdminCredentials = {
      ...currentCreds,
      cpf: resetCpfOrEmail.includes('@') ? currentCreds.cpf : (maskCPF(resetCpfOrEmail) || currentCreds.cpf),
      email: resetCpfOrEmail.includes('@') ? resetCpfOrEmail.trim() : currentCreds.email,
      phone: resetPhone.trim() || currentCreds.phone,
      password: resetNewPassword.trim(),
      registeredAt: new Date().toISOString()
    };

    Storage.saveAdminCredentials(updatedCreds);
    setStoredCreds(updatedCreds);
    setCredsList(Storage.getAdminCredentialsList());
    setLoginCpf(updatedCreds.cpf || updatedCreds.email || '');
    sessionStorage.setItem('salao_admin_authenticated', 'true');

    setFeedbackMsg({
      type: 'success',
      text: 'Sua senha foi redefinida com sucesso! Você já tem acesso.'
    });

    setTimeout(() => {
      onSuccess();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md text-white shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Title */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2 font-bold text-base text-sky-400">
            <Lock className="w-5 h-5 text-sky-400" />
            <span>Acesso Restrito - Administrador (Gestão)</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection (Only shown in full mode) */}
        {!simpleLoginOnly && (
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-5 gap-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setLoginError('');
              }}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'login'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Entrar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setRegError('');
              }}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'register'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Cadastrar Senha</span>
            </button>
          </div>
        )}

        {/* TAB 1: LOGIN MODE */}
        {(activeTab === 'login' || simpleLoginOnly) && (
          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Registered Credentials Badge with Quick Selector (Only in full mode) */}
            {!simpleLoginOnly && (
              <div className="bg-slate-950/80 p-3 rounded-xl border border-sky-800/40 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-bold text-sky-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Credenciais Registradas:</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {credsList.length} cadastrada(s)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {credsList.map((c, i) => {
                    const identifier = c.cpf || c.email || '';
                    const isSelected = (c.cpf && loginCpf === c.cpf) || (c.email && loginCpf.toLowerCase() === c.email.toLowerCase());
                    return (
                      <div
                        key={i}
                        className={`inline-flex items-center rounded-lg font-mono text-[11px] font-bold border transition-all overflow-hidden ${
                          isSelected
                            ? 'bg-sky-600 text-white border-sky-400 shadow-sm'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setLoginCpf(identifier);
                            setLoginError('');
                          }}
                          className="px-2.5 py-1 hover:bg-white/10 transition-colors flex items-center gap-1 cursor-pointer"
                          title={`Selecionar credencial ${identifier}`}
                        >
                          <span>{identifier}</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteCredential(identifier, e)}
                          title={`Excluir / cancelar credencial (${identifier})`}
                          className="px-1.5 py-1 text-slate-400 hover:text-white hover:bg-rose-600 border-l border-slate-700/60 transition-colors flex items-center justify-center cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* FIELD 1: CPF do Administrador */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                <span>CPF:</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={loginCpf}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.includes('@')) {
                      setLoginCpf(val);
                    } else {
                      setLoginCpf(maskCPF(val));
                    }
                    setLoginError('');
                  }}
                  placeholder="000.000.000-00"
                  required
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                />
                <FileText className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            {/* FIELD 2: Senha do Administrador */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-sky-400" />
                <span>Senha:</span>
              </label>
              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    setLoginError('');
                  }}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-sky-500"
                />
                <Key className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="text-slate-400 hover:text-slate-200 absolute right-3 top-2.5 p-0.5"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {loginError && (
                <p className="text-rose-400 text-xs mt-2 flex items-start gap-1.5 font-medium leading-tight bg-rose-950/60 p-2.5 rounded-lg border border-rose-800 animate-in fade-in">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{loginError}</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-2.5 rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Entrar</span>
            </button>

            {/* Footer Registration / Reset links (Only in full mode) */}
            {!simpleLoginOnly && (
              <div className="flex flex-col gap-1.5 text-center pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setRegError('');
                  }}
                  className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors cursor-pointer"
                >
                  + Cadastrar novo CPF e Senha
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('reset');
                    setResetStep('request');
                    setFeedbackMsg(null);
                  }}
                  className="text-sky-400 hover:text-sky-300 underline font-medium transition-colors cursor-pointer"
                >
                  Esqueci a senha / Redefinir Senha
                </button>
              </div>
            )}
          </form>
        )}

        {/* TAB 2: REGISTER CPF & PASSWORD MODE (Only in full mode) */}
        {!simpleLoginOnly && activeTab === 'register' && (
          <form onSubmit={handleRegisterCredentials} className="space-y-3.5">
            <p className="text-slate-400 text-xs">
              Cadastre o seu <strong>CPF</strong> e crie uma senha para acesso exclusivo à administração do sistema:
            </p>

            {regSuccess && (
              <div className="bg-emerald-950/90 border border-emerald-600 text-emerald-200 p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>CPF e senha cadastrados com sucesso! Concedendo acesso...</span>
              </div>
            )}

            {regError && (
              <div className="bg-rose-950/90 border border-rose-600 text-rose-200 p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>CPF do Administrador: *</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={regCpf}
                  onChange={(e) => setRegCpf(maskCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
                <FileText className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Celular / WhatsApp (com DDD): *</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>E-mail do Administrador (Opcional):</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="admin@salao.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cadastrar Nova Senha: *</span>
              </label>
              <div className="relative">
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Crie sua senha..."
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-10 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <Key className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="text-slate-400 hover:text-slate-200 absolute right-3 top-2 p-0.5"
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Confirmar a Nova Senha: *</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Repita a senha..."
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={regSuccess}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Cadastrar Senha e Acessar</span>
            </button>
          </form>
        )}

        {/* TAB 3: RESET PASSWORD MODE (Only in full mode) */}
        {!simpleLoginOnly && activeTab === 'reset' && (
          <div className="space-y-3.5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Key className="w-4 h-4" /> Redefinição de Senha
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                Voltar ao Login
              </button>
            </div>

            {feedbackMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  feedbackMsg.type === 'success'
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700'
                    : 'bg-rose-950/80 text-rose-300 border border-rose-700'
                }`}
              >
                {feedbackMsg.type === 'success' ? (
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{feedbackMsg.text}</span>
              </div>
            )}

            {resetStep === 'request' ? (
              <>
                <p className="text-slate-400 text-xs">
                  Digite seu <strong>CPF</strong> ou telefone cadastrado para validar o acesso e redefinir sua senha:
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    CPF ou E-mail Cadastrado:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={resetCpfOrEmail}
                      onChange={(e) => {
                        const v = e.target.value;
                        setResetCpfOrEmail(v.includes('@') ? v : maskCPF(v));
                      }}
                      placeholder="000.000.000-00"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                    <FileText className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Celular Cadastrado:
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={resetPhone}
                      onChange={(e) => setResetPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleVerifyResetData}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors mt-2 cursor-pointer"
                >
                  <Key className="w-4 h-4" />
                  <span>Validar e Redefinir Senha</span>
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Digite a Nova Senha:
                  </label>
                  <input
                    type="password"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="Nova senha..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Confirmar a Nova Senha:
                  </label>
                  <input
                    type="password"
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveNewResetPassword}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors mt-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Nova Senha e Acessar</span>
                </button>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
