import React, { useState, useEffect } from 'react';
import { AdminPaymentConfig } from '../types';
import { Storage } from '../utils/storage';
import { Settings, Lock, Check, X, Wallet, QrCode, CreditCard, ShieldCheck } from 'lucide-react';

interface AdminPaymentAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPaymentAccountModal: React.FC<AdminPaymentAccountModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [config, setConfig] = useState<AdminPaymentConfig>(() => Storage.getAdminPaymentConfig());
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfig(Storage.getAdminPaymentConfig());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    Storage.saveAdminPaymentConfig(config);
    setSuccessMsg('Dados da conta bancária/Pix do Administrador salvos com sucesso!');
    setTimeout(() => {
      setSuccessMsg('');
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[70] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-amber-500/50 rounded-3xl w-full max-w-lg text-white shadow-2xl relative my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-yellow-800 p-5 text-slate-950 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-slate-950/20 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-slate-950/30">
                Painel do Administrador
              </span>
            </div>
            <h2 className="text-lg font-black flex items-center gap-2">
              <Settings className="w-5 h-5" />
              <span>Configurar Conta de Recebimento (Pix / Cartão)</span>
            </h2>
            <p className="text-slate-950/80 text-xs mt-0.5">
              Defina os dados para onde os pagamentos dos clientes irão diretamente.
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-950/80 hover:text-slate-950 p-1 rounded-lg hover:bg-black/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
          
          {successMsg && (
            <div className="bg-emerald-950 border border-emerald-600 text-emerald-200 p-3 rounded-xl font-bold flex items-center gap-2 text-xs">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Pix Key */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <label className="block font-extrabold text-amber-300 flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span>Minha Chave Pix (Recebimento Direto): *</span>
            </label>
            <input
              type="text"
              value={config.chavePix}
              onChange={(e) => setConfig({ ...config, chavePix: e.target.value })}
              placeholder="E-mail, CPF/CNPJ, Telefone ou Chave Aleatória"
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
            />
            <p className="text-[10px] text-slate-400">
              Esta é a chave Pix exibida na tela de pagamento para todos os compradores das licenças.
            </p>
          </div>

          {/* Beneficiary Name */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <label className="block font-extrabold text-amber-300 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-blue-400" />
              <span>Nome do Beneficiário / Titular da Conta: *</span>
            </label>
            <input
              type="text"
              value={config.nomeBeneficiario}
              onChange={(e) => setConfig({ ...config, nomeBeneficiario: e.target.value })}
              placeholder="Ex: Agenda+Fácil Pagamentos - Marlon Soares"
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Bank / Processor & Card Receiver Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1.5">
              <label className="block font-bold text-slate-300 text-[11px]">
                Banco / Processador:
              </label>
              <input
                type="text"
                value={config.bancoOuProcessador}
                onChange={(e) => setConfig({ ...config, bancoOuProcessador: e.target.value })}
                placeholder="Ex: Mercado Pago / Banco Inter"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white"
              />
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1.5">
              <label className="block font-bold text-slate-300 text-[11px] flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                <span>Conta Destino (Cartão):</span>
              </label>
              <input
                type="text"
                value={config.cartaoContaDestino}
                onChange={(e) => setConfig({ ...config, cartaoContaDestino: e.target.value })}
                placeholder="Ex: Conta MP-883921"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white"
              />
            </div>
          </div>

          <div className="bg-amber-950/30 border border-amber-800/60 p-3 rounded-2xl text-[11px] text-amber-200 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Garantia de Recebimento:</strong> Quando um cliente comprar uma licença, o pagamento via Pix ou Cartão de Crédito será enviado diretamente para as contas configuradas neste painel.
            </span>
          </div>

          <button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-2xl text-xs sm:text-sm shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Salvar Minha Conta de Administrador</span>
          </button>

        </form>

      </div>
    </div>
  );
};
