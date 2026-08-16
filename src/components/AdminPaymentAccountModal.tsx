import React, { useState, useEffect } from 'react';
import { AdminPaymentConfig } from '../types';
import { Storage } from '../utils/storage';
import { getCalculatedLicensePlans, calculateDefaultPricesFromBase, formatBRL } from '../utils/pricing';
import { Settings, Lock, Check, X, Wallet, QrCode, CreditCard, ShieldCheck, DollarSign, Clock, Sparkles, RefreshCw } from 'lucide-react';

interface AdminPaymentAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPaymentAccountModal: React.FC<AdminPaymentAccountModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [config, setConfig] = useState<AdminPaymentConfig>(() => Storage.getAdminPaymentConfig());
  const [p30Input, setP30Input] = useState<string>('30.00');
  const [p90Input, setP90Input] = useState<string>('75.00');
  const [p180Input, setP180Input] = useState<string>('135.00');
  const [p365Input, setP365Input] = useState<string>('240.00');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      const current = Storage.getAdminPaymentConfig();
      setConfig(current);
      setP30Input(String(current.precoPlano30Dias || 30));
      setP90Input(String(current.precoPlano90Dias || 75));
      setP180Input(String(current.precoPlano180Dias || 135));
      setP365Input(String(current.precoPlano365Dias || 240));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const numP30 = Number(p30Input.replace(',', '.')) || 30;
  const numP90 = Number(p90Input.replace(',', '.')) || (numP30 * 2.5);
  const numP180 = Number(p180Input.replace(',', '.')) || (numP30 * 4.5);
  const numP365 = Number(p365Input.replace(',', '.')) || (numP30 * 8);

  const handleRecalculateFrom30 = () => {
    const base = Number(p30Input.replace(',', '.')) || 30;
    const defaults = calculateDefaultPricesFromBase(base);
    setP30Input(String((defaults.p30 || 30).toFixed(2)));
    setP90Input(String((defaults.p90 || 75).toFixed(2)));
    setP180Input(String((defaults.p180 || 135).toFixed(2)));
    setP365Input(String((defaults.p365 || 240).toFixed(2)));
  };

  const handleBase30Change = (val: string) => {
    setP30Input(val);
    const parsed = Number(val.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      const defaults = calculateDefaultPricesFromBase(parsed);
      setP90Input(String((defaults.p90 || 75).toFixed(2)));
      setP180Input(String((defaults.p180 || 135).toFixed(2)));
      setP365Input(String((defaults.p365 || 240).toFixed(2)));
    }
  };

  const calculatedPlans = getCalculatedLicensePlans({
    ...config,
    precoPlano30Dias: numP30,
    precoPlano90Dias: numP90,
    precoPlano180Dias: numP180,
    precoPlano365Dias: numP365
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedConfig: AdminPaymentConfig = {
      ...config,
      precoPlano30Dias: numP30,
      precoPlano90Dias: numP90,
      precoPlano180Dias: numP180,
      precoPlano365Dias: numP365
    };
    Storage.saveAdminPaymentConfig(updatedConfig);
    setSuccessMsg('Valores das licenças e formas de pagamento salvos com sucesso!');
    setTimeout(() => {
      setSuccessMsg('');
      onClose();
    }, 1600);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[80] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl w-full max-w-xl text-white shadow-2xl relative my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-yellow-800 p-5 text-slate-950 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-slate-950/20 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-slate-950/30">
                Acesso Exclusivo Administrador
              </span>
            </div>
            <h2 className="text-lg font-black flex items-center gap-2">
              <Settings className="w-5 h-5" />
              <span>Configurar Valores das Licenças & Formas de Pagamento</span>
            </h2>
            <p className="text-slate-950/85 text-xs mt-0.5 font-medium">
              Defina os valores das licenças (30 Dias, 3 Meses, 6 Meses e 1 Ano) que serão cobrados dos salões parceiros.
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
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs max-h-[82vh] overflow-y-auto custom-scrollbar">
          
          {successMsg && (
            <div className="bg-emerald-950 border border-emerald-600 text-emerald-200 p-3 rounded-xl font-bold flex items-center gap-2 text-xs">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* LICENSE PRICE CONFIGURATION SECTION */}
          <div className="bg-slate-950 p-4 rounded-2xl border-2 border-emerald-500/50 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <label className="font-black text-emerald-300 text-sm flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Valores das Licenças para os Salões:</span>
              </label>
              <button
                type="button"
                onClick={handleRecalculateFrom30}
                className="text-[10px] bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-bold px-2 py-1 rounded-lg border border-emerald-500/40 flex items-center gap-1 transition-colors"
                title="Recalcula 3 meses, 6 meses e 1 ano a partir dos 30 dias"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Recalcular Automático</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-300">
              Ao digitar o valor dos <strong>primeiros 30 dias</strong> (ex: R$ 30,00), os outros planos são recalculados automaticamente, ou você pode digitar o valor exato que preferir em cada plano:
            </p>

            {/* 4 Plan Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              
              {/* 30 Dias */}
              <div className="bg-slate-900 p-3 rounded-xl border border-emerald-500/40 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-black text-white">1. Plano 30 Dias (Mensal):</span>
                  <span className="text-[9px] text-amber-300 font-bold">À vista</span>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-emerald-400 font-bold text-xs">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.10"
                    min="1"
                    value={p30Input}
                    onChange={(e) => handleBase30Change(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-emerald-500/60 rounded-lg pl-8 pr-2.5 py-1.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div className="text-[10px] text-slate-400">Base de cálculo dos planos</div>
              </div>

              {/* 3 Meses */}
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-black text-white">2. Plano 3 Meses:</span>
                  <span className="text-[9px] text-amber-300 font-bold">À vista</span>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-emerald-400 font-bold text-xs">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.10"
                    min="1"
                    value={p90Input}
                    onChange={(e) => setP90Input(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div className="text-[10px] text-slate-400">Equivale a {formatBRL(numP90 / 3)}/mês</div>
              </div>

              {/* 6 Meses */}
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-black text-white">3. Plano 6 Meses:</span>
                  <span className="text-[9px] text-emerald-400 font-bold">Até 6x</span>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-emerald-400 font-bold text-xs">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.10"
                    min="1"
                    value={p180Input}
                    onChange={(e) => setP180Input(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div className="text-[10px] text-slate-400">Equivale a {formatBRL(numP180 / 6)}/mês</div>
              </div>

              {/* 1 Ano */}
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-black text-white">4. Plano 1 Ano (Anual):</span>
                  <span className="text-[9px] text-emerald-400 font-bold">Até 6x</span>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-emerald-400 font-bold text-xs">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.10"
                    min="1"
                    value={p365Input}
                    onChange={(e) => setP365Input(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div className="text-[10px] text-slate-400">Equivale a {formatBRL(numP365 / 12)}/mês</div>
              </div>

            </div>

            {/* LIVE PREVIEW OF THE 4 PLANS CARDS */}
            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Visualização final dos 4 Planos na tela de compra do Salão:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {calculatedPlans.map((p) => (
                  <div
                    key={p.days}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center flex flex-col justify-between"
                  >
                    <div>
                      <span className="block text-[11px] font-black text-white">{p.label}</span>
                      <span className="block text-xs font-black text-emerald-400 mt-0.5">{p.priceStr}</span>
                      <span className="block text-[9px] text-slate-400 mt-0.5">{p.detail}</span>
                    </div>
                    <span className={`inline-block text-[8px] font-extrabold px-1.5 py-0.5 rounded-full border mt-1.5 ${
                      p.days >= 180
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-950 text-amber-300 border-amber-500/30'
                    }`}>
                      {p.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PAYMENT METHODS & BANK ACCOUNT CONFIGURATION */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-amber-500/40 space-y-3 shadow-md">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-1.5">
              <Wallet className="w-4 h-4 text-amber-400" />
              <span className="font-extrabold text-amber-300 text-xs">Formas de Pagamento & Conta de Recebimento (Pix / Cartão)</span>
            </div>

            {/* Pix Key */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-300 text-[11px] flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                <span>Minha Chave Pix (Recebimento Direto): *</span>
              </label>
              <input
                type="text"
                value={config.chavePix}
                onChange={(e) => setConfig({ ...config, chavePix: e.target.value })}
                placeholder="E-mail, CPF/CNPJ, Telefone ou Chave Aleatória"
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400 text-xs"
              />
              <p className="text-[10px] text-slate-400">
                Esta é a chave Pix exibida na tela de pagamento e usada para gerar o QR Code oficial.
              </p>
            </div>

            {/* Public App URL / Vercel Domain */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-300 text-[11px] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>Domínio Público do Aplicativo (Vercel / Site Oficial):</span>
              </label>
              <input
                type="url"
                value={config.productionUrl || 'https://agenda-f-cil-sal-o.vercel.app'}
                onChange={(e) => {
                  const val = e.target.value;
                  setConfig({ ...config, productionUrl: val });
                  localStorage.setItem('salaoCustomProductionUrl', val);
                }}
                placeholder="https://agenda-f-cil-sal-o.vercel.app"
                className="w-full bg-slate-900 border border-sky-500/50 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-400 text-xs"
              />
              <p className="text-[10px] text-sky-300/80">
                Garante que todos os links gerados para salões e clientes usem o domínio oficial da Vercel (sem erro 404).
              </p>
            </div>

            {/* Beneficiary Name */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-300 text-[11px] flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-blue-400" />
                <span>Nome do Beneficiário / Titular da Conta: *</span>
              </label>
              <input
                type="text"
                value={config.nomeBeneficiario}
                onChange={(e) => setConfig({ ...config, nomeBeneficiario: e.target.value })}
                placeholder="Ex: Marlon Soares - Agenda+Fácil"
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 text-xs"
              />
            </div>

            {/* Bank / Processor & Card Receiver Account */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block font-bold text-slate-300 text-[11px]">
                  Banco / Processador Pix:
                </label>
                <input
                  type="text"
                  value={config.bancoOuProcessador}
                  onChange={(e) => setConfig({ ...config, bancoOuProcessador: e.target.value })}
                  placeholder="Ex: Mercado Pago / Pix Instantâneo"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-300 text-[11px] flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                  <span>Conta Destino (Cartão de Crédito):</span>
                </label>
                <input
                  type="text"
                  value={config.cartaoContaDestino}
                  onChange={(e) => setConfig({ ...config, cartaoContaDestino: e.target.value })}
                  placeholder="Ex: Conta Mercado Pago (MP-883921)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white text-xs"
                />
              </div>
            </div>

          </div>

          <div className="bg-amber-950/30 border border-amber-800/60 p-3 rounded-2xl text-[11px] text-amber-200 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Garantia de Recebimento:</strong> Quando o perfil Salão abrir a tela para comprar o plano, ele verá os novos valores definidos aqui e o pagamento cairá diretamente na sua conta configurada.
            </span>
          </div>

          <button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-2xl text-xs sm:text-sm shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Salvar Configurações e Atualizar Valores para o Perfil Salão</span>
          </button>

        </form>

      </div>
    </div>
  );
};
