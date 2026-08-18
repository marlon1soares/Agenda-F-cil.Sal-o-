import React, { useState, useEffect, useRef } from 'react';
import { Key, Lock, Phone, X, Check, ShieldAlert, FileText, Eye, EyeOff, Crown, UserPlus, CheckCircle2, Edit3, AlertCircle } from 'lucide-react';
import { Storage } from '../utils/storage';
import { AdminCredentials } from '../types';

interface AdminChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminChangePasswordModal: React.FC<AdminChangePasswordModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [credsList, setCredsList] = useState<AdminCredentials[]>(() => Storage.getAdminCredentialsList());
  
  // Editing state
  const [editingAdminCpf, setEditingAdminCpf] = useState<string | null>(null);

  // Form State
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const newPasswordInputRef = useRef<HTMLInputElement>(null);

  // CPF mask helper
  const maskCPF = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  };

  const refreshList = () => {
    const list = Storage.getAdminCredentialsList();
    setCredsList(list);
  };

  useEffect(() => {
    if (isOpen) {
      refreshList();
      setCpf('');
      setPhone('');
      setNewPassword('');
      setConfirmPassword('');
      setEditingAdminCpf(null);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Start editing password for a specific administrator
  const handleStartEdit = (admin: AdminCredentials) => {
    const adminIdentifier = admin.cpf || admin.email || '';
    setEditingAdminCpf(adminIdentifier);
    setCpf(admin.cpf || '');
    setPhone(admin.phone || '');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMsg('');
    setSuccessMsg(`Modo de edição: Digite a nova senha para o Administrador (${admin.cpf || admin.email}).`);

    setTimeout(() => {
      newPasswordInputRef.current?.focus();
    }, 150);
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setEditingAdminCpf(null);
    setCpf('');
    setPhone('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  // Delete / Remove an Administrator with the [ X ] button
  const handleDeleteAdmin = (identifier: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setErrorMsg('');
    setSuccessMsg('');

    if (credsList.length <= 1) {
      setErrorMsg('Atenção: É necessário manter pelo menos 1 administrador ativo no sistema.');
      return;
    }

    const updated = Storage.deleteAdminCredential(identifier);
    setCredsList([...updated]);

    if (editingAdminCpf === identifier) {
      handleCancelEdit();
    }

    setSuccessMsg(`✓ Administrador (${identifier}) foi excluído com sucesso.`);
    setTimeout(() => {
      setSuccessMsg('');
    }, 3500);
  };

  // Add new admin or change password
  const handleSaveAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanCpfDigits = cpf.replace(/\D/g, '').trim();
    if (!cleanCpfDigits || cleanCpfDigits.length < 11) {
      setErrorMsg('Por favor, informe um CPF válido com 11 dígitos.');
      return;
    }

    if (!newPassword || newPassword.trim().length < 4) {
      setErrorMsg('A senha do administrador precisa ter no mínimo 4 dígitos.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('A nova senha e a confirmação não coincidem. Digite-as novamente.');
      return;
    }

    const formattedCpf = maskCPF(cpf);
    const existingAdmin = credsList.find(c => (c.cpf || '').replace(/\D/g, '') === cleanCpfDigits);
    const newCred: AdminCredentials = {
      cpf: formattedCpf,
      email: existingAdmin?.email || 'marlon1soares28@gmail.com',
      phone: phone.trim() || existingAdmin?.phone || '(11) 99999-9999',
      password: newPassword.trim(),
      registeredAt: existingAdmin?.registeredAt || new Date().toISOString()
    };

    Storage.saveAdminCredentials(newCred);
    const updatedList = Storage.getAdminCredentialsList();
    setCredsList([...updatedList]);

    setSuccessMsg(`✓ Senha do Administrador (${formattedCpf}) salva com sucesso!`);
    setCpf('');
    setPhone('');
    setNewPassword('');
    setConfirmPassword('');
    setEditingAdminCpf(null);

    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b1222] border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 text-white flex items-center justify-between border-b border-slate-800/80 bg-[#0b1222]">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-teal-950/60 rounded-2xl border border-teal-500/40 text-teal-400 flex items-center justify-center shadow-inner">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-950/90 text-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-amber-500/40 flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-400" />
                  PAINEL DO ADMINISTRADOR
                </span>
                <span className="bg-teal-950/90 text-teal-400 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-teal-500/40">
                  Gestão de Senhas
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black mt-1 tracking-tight text-white flex items-center gap-1.5">
                <span>Alterar Senha Admin & Usuários</span>
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto text-xs text-slate-200">
          
          {errorMsg && (
            <div className="bg-rose-950/90 border border-rose-700 p-3 rounded-2xl flex items-start gap-2 text-rose-200 animate-shake">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="text-xs font-semibold leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-950/90 border border-emerald-600 p-3 rounded-2xl flex items-center gap-2 text-emerald-200 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-bold leading-relaxed">{successMsg}</span>
            </div>
          )}

          {/* Section 1: Administradores Cadastrados com botão [ X ] e [ Editar Senha ] */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase text-sky-400 tracking-wider flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>ADMINISTRADORES CADASTRADOS:</span>
              </label>
              <span className="text-[11px] font-mono text-slate-400">
                {credsList.length} administrador(es)
              </span>
            </div>

            <div className="space-y-2 pt-1">
              {credsList.map((admin, idx) => {
                const identifier = admin.cpf || admin.email || '';
                const isCurrentEditing = editingAdminCpf === identifier;

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between bg-slate-900 border rounded-2xl p-3 px-3.5 transition-all ${
                      isCurrentEditing
                        ? 'border-teal-400 bg-teal-950/20 shadow-md ring-1 ring-teal-400'
                        : 'border-slate-700/80 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isCurrentEditing ? 'bg-teal-400 animate-pulse' : 'bg-emerald-400'}`}></div>
                      <div className="flex flex-col">
                        <span className="font-mono font-black text-white text-xs sm:text-sm">
                          {admin.cpf || 'Sem CPF'}
                        </span>
                        {admin.phone && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <span>📱</span> {admin.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Botão Editar Senha */}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(admin)}
                        className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
                          isCurrentEditing
                            ? 'bg-teal-600 text-white border-teal-400 shadow-sm'
                            : 'bg-slate-800 hover:bg-slate-700 text-sky-300 border-slate-700 hover:border-sky-500'
                        }`}
                        title="Preencher dados no formulário abaixo para alterar senha"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar Senha</span>
                      </button>

                      {/* Botão [ X ] Vermelho para Cancelamento / Remoção de Administrador */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteAdmin(identifier, e)}
                        title={`Remover / Cancelar cadastro deste Administrador (${identifier})`}
                        className="p-2 bg-rose-950/80 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl border border-rose-800 hover:border-rose-500 transition-all cursor-pointer flex items-center justify-center shadow-xs active:scale-95"
                      >
                        <X className="w-4 h-4 font-black" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Formulário para Adicionar Administrador ou Alterar Senha */}
          <form onSubmit={handleSaveAdmin} className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-inner">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2 text-white">
                {editingAdminCpf ? (
                  <Edit3 className="w-4 h-4 text-teal-400" />
                ) : (
                  <UserPlus className="w-4 h-4 text-teal-400" />
                )}
                <h3 className="font-black text-xs uppercase tracking-wide">
                  {editingAdminCpf ? `Alterar Senha do Administrador:` : 'Adicionar Administrador / Nova Senha:'}
                </h3>
              </div>

              {editingAdminCpf && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-[10px] text-amber-400 hover:text-amber-300 underline font-bold cursor-pointer"
                >
                  Cancelar Edição
                </button>
              )}
            </div>

            {editingAdminCpf && (
              <div className="bg-teal-950/60 border border-teal-500/50 p-2.5 rounded-xl text-teal-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-teal-400" />
                <span>Editando senha para o CPF: <strong className="font-mono text-white">{cpf}</strong></span>
              </div>
            )}

            {/* Input CPF */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-300">
                CPF do Administrador:
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(maskCPF(e.target.value))}
                  maxLength={14}
                  required
                  className="w-full bg-[#060a14] border border-slate-700/80 rounded-xl px-3.5 py-3 pl-10 text-white font-mono text-xs placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all shadow-inner"
                />
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
            </div>

            {/* Input Celular/WhatsApp (Opcional) */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-300">
                Celular / WhatsApp (Opcional):
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#060a14] border border-slate-700/80 rounded-xl px-3.5 py-3 pl-10 text-white font-mono text-xs placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all shadow-inner"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
            </div>

            {/* Input Nova Senha */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-slate-300">
                  {editingAdminCpf ? 'Nova Senha:' : 'Senha:'}
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="text-[10px] text-slate-400 hover:text-slate-200 font-bold flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showPassword ? 'Ocultar' : 'Exibir'}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  ref={newPasswordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full bg-[#060a14] border border-slate-700/80 rounded-xl px-3.5 py-3 pl-10 text-white font-mono text-xs placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all shadow-inner font-bold text-teal-300"
                />
                <Key className="w-4 h-4 text-amber-400 absolute left-3 top-3.5" />
              </div>
            </div>

            {/* Input Confirmar Senha */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-slate-300">
                  Confirmar Senha do Administrador:
                </label>
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(prev => !prev)}
                  className="text-[10px] text-slate-400 hover:text-slate-200 font-bold flex items-center gap-1 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showConfirmPassword ? 'Ocultar' : 'Exibir'}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full bg-[#060a14] border border-slate-700/80 rounded-xl px-3.5 py-3 pl-10 text-white font-mono text-xs placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all shadow-inner font-bold text-teal-300"
                />
                <Lock className="w-4 h-4 text-teal-400 absolute left-3 top-3.5" />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black py-3.5 rounded-xl shadow-lg shadow-teal-950/50 flex items-center justify-center gap-2 transition-all active:scale-98 text-xs cursor-pointer"
              >
                <Check className="w-4 h-4 text-white" />
                <span>{editingAdminCpf ? 'Salvar Nova Senha do Administrador ➔' : 'Salvar / Cadastrar Administrador ➔'}</span>
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};
