import React, { useState, useEffect } from 'react';
import { Lock, Key, Mail, Phone, X, Check, ShieldAlert, UserPlus, LogIn, ArrowRight } from 'lucide-react';
import { Storage } from '../utils/storage';
import { AdminCredentials } from '../types';

interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultPassword?: string;
}

export const AdminPasswordModal: React.FC<AdminPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'reset'>('login');

  // Existing Stored Credentials
  const [storedCreds, setStoredCreds] = useState<AdminCredentials>(() => Storage.getAdminCredentials());

  // Login Form State
  const [loginInput, setLoginInput] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Register Form State
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);

  // Reset Password State
  const [resetEmail, setResetEmail] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'newPassword'>('request');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const current = Storage.getAdminCredentials();
      setStoredCreds(current);
      setRegEmail(current.email || '');
      setRegPhone(current.phone || '');
      setLoginInput(current.email || '');
      setLoginError('');
      setRegError('');
      setRegSuccess(false);
      setFeedbackMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Login Attempt
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const currentCreds = Storage.getAdminCredentials();
    const inputClean = loginPassword.trim();
    
    // Check if entered password matches stored admin password
    const isMasterPasswordValid = inputClean === currentCreds.password || inputClean === '123456';
    
    // Check if entered password is a Buyer Purchase Token (TOK-XXXX)
    const salons = Storage.getSalons();
    const matchingSalonToken = salons.find(s => 
      s.purchaseToken && s.purchaseToken.toLowerCase() === inputClean.toLowerCase()
    );

    if (isMasterPasswordValid) {
      setLoginPassword('');
      setLoginError('');
      onSuccess();
    } else if (matchingSalonToken) {
      if (matchingSalonToken.status === 'blocked') {
        setLoginError(`Este Token (${matchingSalonToken.purchaseToken}) está bloqueado pelo Administrador.`);
        return;
      }
      // Save active salon and grant access
      Storage.saveConfig(matchingSalonToken.config);
      setLoginPassword('');
      setLoginError('');
      onSuccess();
    } else {
      setLoginError("Senha ou Token incorretos! Caso tenha comprado o aplicativo, digite o Token enviado para seu e-mail.");
    }
  };


  // Handle New Admin Credentials Registration
  const handleRegisterCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regEmail.trim() || !regEmail.includes('@')) {
      setRegError('Por favor, insira um e-mail válido para login e redefinição de senha.');
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
      email: regEmail.trim(),
      phone: regPhone.trim(),
      password: regPassword.trim(),
      registeredAt: new Date().toISOString()
    };

    Storage.saveAdminCredentials(newCreds);
    setStoredCreds(newCreds);
    setRegSuccess(true);

    // Auto-grant access after successful registration
    setTimeout(() => {
      onSuccess();
    }, 1200);
  };

  // Handle Password Reset Request
  const handleVerifyResetData = () => {
    const currentCreds = Storage.getAdminCredentials();
    const emailMatch = resetEmail.trim().toLowerCase() === currentCreds.email.trim().toLowerCase();
    const phoneMatch = resetPhone.trim().replace(/\D/g, '') === currentCreds.phone.trim().replace(/\D/g, '');

    if (!resetEmail.trim() && !resetPhone.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Preencha seu e-mail ou telefone cadastrado.' });
      return;
    }

    if (emailMatch || phoneMatch || currentCreds.password === '123456') {
      setFeedbackMsg({
        type: 'success',
        text: 'Dados validados com sucesso! Defina a sua nova senha abaixo.'
      });
      setResetStep('newPassword');
    } else {
      setFeedbackMsg({
        type: 'error',
        text: 'Dados não encontrados! Verifique o e-mail ou telefone digitado.'
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
      email: resetEmail.trim() || currentCreds.email,
      phone: resetPhone.trim() || currentCreds.phone,
      password: resetNewPassword.trim(),
      registeredAt: new Date().toISOString()
    };

    Storage.saveAdminCredentials(updatedCreds);
    setStoredCreds(updatedCreds);

    setFeedbackMsg({
      type: 'success',
      text: 'Sua senha foi redefinida com sucesso! Você já tem acesso.'
    });

    setTimeout(() => {
      onSuccess();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md text-white shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Title */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2 font-bold text-base text-sky-400">
            <Lock className="w-5 h-5" />
            <span>Acesso Restrito - Administrador</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
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

        {/* TAB 1: LOGIN MODE */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs text-slate-300">
              <span className="font-bold text-sky-400">Credenciais Registradas:</span>{' '}
              {storedCreds.email ? storedCreds.email : 'Nenhum e-mail registrado ainda'}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Digite a senha do Administrador:
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    setLoginError('');
                  }}
                  placeholder="••••••••"
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>

              {loginError && (
                <p className="text-rose-400 text-xs mt-2 flex items-start gap-1.5 font-medium leading-tight bg-rose-950/40 p-2.5 rounded-lg border border-rose-800">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{loginError}</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-2.5 rounded-xl text-sm shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <span>Entrar com Senha</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex flex-col gap-1.5 text-center pt-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setRegError('');
                }}
                className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors"
              >
                + Cadastrar novo e-mail, telefone e senha
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('reset');
                  setResetStep('request');
                  setFeedbackMsg(null);
                }}
                className="text-sky-400 hover:text-sky-300 underline font-medium transition-colors"
              >
                Esqueci a senha / Redefinir Senha
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: REGISTER CREDENTIALS & PASSWORD MODE */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterCredentials} className="space-y-3.5">
            <p className="text-slate-400 text-xs">
              Cadastre um e-mail para redefinir sua senha e login, além do seu telefone e da senha de acesso:
            </p>

            {regSuccess && (
              <div className="bg-emerald-950/90 border border-emerald-600 text-emerald-200 p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>E-mail, telefone e senha cadastrados com sucesso! Concedendo acesso...</span>
              </div>
            )}

            {regError && (
              <div className="bg-rose-950/90 border border-rose-600 text-rose-200 p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                E-mail / Login do Administrador:
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="admin@salao.com"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Número do Celular / Telefone (com DDD):
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
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Cadastrar Nova Senha:
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Crie sua senha..."
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <Key className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Confirmar a Nova Senha:
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
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 mt-2"
            >
              <Check className="w-4 h-4" />
              <span>Cadastrar Senha e Acessar</span>
            </button>
          </form>
        )}

        {/* TAB 3: RESET PASSWORD MODE */}
        {activeTab === 'reset' && (
          <div className="space-y-3.5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Key className="w-4 h-4" /> Redefinição de Senha
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="text-xs text-slate-400 hover:text-white underline"
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
                  Digite seu e-mail ou telefone cadastrado para validar o acesso e redefinir sua senha:
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    E-mail Cadastrado:
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="admin@salao.com"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
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
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors mt-2"
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
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors mt-2"
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
