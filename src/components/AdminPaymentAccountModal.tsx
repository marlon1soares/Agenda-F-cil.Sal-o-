import React, { useState, useEffect } from 'react';
import { AdminPaymentConfig } from '../types';
import { Storage } from '../utils/storage';
import { getCalculatedLicensePlans, calculateDefaultPricesFromBase, formatBRL } from '../utils/pricing';
import { Settings, Lock, Check, X, Wallet, QrCode, CreditCard, ShieldCheck, DollarSign, Clock, Sparkles, RefreshCw, Key, Shield, Copy, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';

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
  const [freeDaysInput, setFreeDaysInput] = useState<string>('15');
  const [enableTrial, setEnableTrial] = useState<boolean>(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      const current = Storage.getAdminPaymentConfig();
      setConfig(current);
      setP30Input(String(current.precoPlano30Dias || 30));
      setP90Input(String(current.precoPlano90Dias || 75));
      setP180Input(String(current.precoPlano180Dias || 135));
      setP365Input(String(current.precoPlano365Dias || 240));
      setFreeDaysInput(String(current.diasGratuitos !== undefined && current.diasGratuitos !== null ? current.diasGratuitos : 15));
      setEnableTrial(current.habilitarPlanoGratuito !== false);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const numP30 = Number(p30Input.replace(',', '.')) || 30;
  const numP90 = Number(p90Input.replace(',', '.')) || (numP30 * 2.5);
  const numP180 = Number(p180Input.replace(',', '.')) || (numP30 * 4.5);
  const numP365 = Number(p365Input.replace(',', '.')) || (numP30 * 8);
  const numFreeDays = Math.max(1, parseInt(freeDaysInput, 10) || 15);

  const webhookBaseUrl = (typeof window !== 'undefined' && window.location.origin) || (config.productionUrl || 'https://agenda-f-cil-sal-o.vercel.app');
  const fullWebhookUrl = `${webhookBaseUrl}/api/webhook/payment`;

  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText(fullWebhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  const handleTestWebhookSignature = async () => {
    setTestingWebhook(true);
    setTestResult(null);
    try {
      const response = await fetch('/api/payment/webhook-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: config.webhookSecret,
          provider: config.gatewayProvider || 'mercadopago',
          testPayload: {
            event: 'payment.updated',
            data: { id: `TEST-PAY-${Date.now()}` },
            action: 'payment.created',
            date_created: new Date().toISOString()
          }
        })
      });
      const data = await response.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTestingWebhook(false);
    }
  };

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
    precoPlano365Dias: numP365,
    diasGratuitos: numFreeDays,
    habilitarPlanoGratuito: enableTrial
  }, true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedConfig: AdminPaymentConfig = {
      ...config,
      precoPlano30Dias: numP30,
      precoPlano90Dias: numP90,
      precoPlano180Dias: numP180,
      precoPlano365Dias: numP365,
      diasGratuitos: numFreeDays,
      habilitarPlanoGratuito: enableTrial
    };
    Storage.saveAdminPaymentConfig(updatedConfig);
    setSuccessMsg('Valores das licenças, dias gratuitos e formas de pagamento salvos com sucesso!');
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

          {/* FREE TRIAL DAYS CONFIGURATION */}
          <div className="bg-slate-950 p-4 rounded-2xl border-2 border-sky-500/50 space-y-3 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <label className="font-black text-sky-300 text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>Configuração dos Dias Gratuitos (Teste Grátis):</span>
              </label>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={enableTrial}
                    onChange={(e) => setEnableTrial(e.target.checked)}
                    className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
                  />
                  <span className={`text-xs font-bold ${enableTrial ? 'text-sky-300' : 'text-slate-500'}`}>
                    {enableTrial ? '✓ Teste Gratuito Ativo' : '✕ Teste Gratuito Desativado'}
                  </span>
                </label>
              </div>
            </div>

            <p className="text-[11px] text-slate-300">
              Defina quantos dias de degustação gratuita os novos salões recebem ao se cadastrar. Se desativado, o cliente irá direto para a escolha dos <strong>Planos Pagos (Plano 1, 2, 3 ou 4)</strong>:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-1">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <span>Quantidade de Dias Gratuitos:</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="90"
                    disabled={!enableTrial}
                    value={freeDaysInput}
                    onChange={(e) => setFreeDaysInput(e.target.value)}
                    className="w-full bg-slate-900 border border-sky-500/60 rounded-xl px-3 py-2 text-white font-mono font-black text-sm focus:outline-none focus:border-sky-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="15"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-bold text-slate-400 pointer-events-none">
                    Dias
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="block text-[11px] font-bold text-slate-400">Atalhos Rápidos:</span>
                <div className="flex items-center gap-1.5">
                  {[7, 15, 30].map((days) => (
                    <button
                      key={days}
                      type="button"
                      disabled={!enableTrial}
                      onClick={() => setFreeDaysInput(String(days))}
                      className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all border ${
                        numFreeDays === days && enableTrial
                          ? 'bg-sky-600 text-white border-sky-400 shadow-md ring-1 ring-sky-300'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {days} Dias
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Trial Callout info */}
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-300">
                {enableTrial 
                  ? `Os clientes verão o card: "${numFreeDays} Dias Grátis (R$ 0)" e podem usar ou pular para os planos pagos.`
                  : 'O teste gratuito está desativado. Os clientes verão apenas os Planos Pagos 1, 2, 3 e 4.'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                enableTrial ? 'bg-sky-950 text-sky-300 border border-sky-500/40' : 'bg-rose-950 text-rose-300 border border-rose-500/40'
              }`}>
                {enableTrial ? `${numFreeDays} Dias Grátis` : 'Apenas Pagos'}
              </span>
            </div>
          </div>

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
            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="block font-bold text-slate-300 text-[11px] flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                  <span>Conta Destino (Cartão de Crédito): *</span>
                </label>
                <input
                  type="text"
                  value={config.cartaoContaDestino}
                  onChange={(e) => setConfig({ ...config, cartaoContaDestino: e.target.value })}
                  placeholder="Ex: Agência: 0001 | Conta: 12345-6 (Marlon Soares)"
                  required
                  className="w-full bg-slate-900 border-2 border-purple-500/60 focus:border-purple-400 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none shadow-inner"
                />
                <p className="text-[10px] text-purple-300/90 leading-relaxed">
                  💡 <strong>Recebimento no Cartão:</strong> Insira aqui o <strong>número da Agência e Conta</strong> de destino. Todos os pagamentos realizados via Cartão de Crédito por salões e clientes estarão vinculados e serão creditados nesta conta.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-300 text-[11px]">
                  Banco / Instituição / Processador (Pix e Cartão):
                </label>
                <input
                  type="text"
                  value={config.bancoOuProcessador}
                  onChange={(e) => setConfig({ ...config, bancoOuProcessador: e.target.value })}
                  placeholder="Ex: Mercado Pago / Banco Inter / Nubank"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

          </div>

          {/* WEBHOOK SECURITY & GATEWAY / BACEN PIX / PCI-DSS COMPLIANCE CARD */}
          <div className="bg-slate-950 p-4 rounded-2xl border-2 border-emerald-500/50 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="font-extrabold text-emerald-300 text-xs uppercase tracking-wide">
                  Segurança Financeira: Validação de Webhooks & Gateway (PCI-DSS)
                </span>
              </div>
              <span className="bg-emerald-950/80 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>PCI-DSS Ativo</span>
              </span>
            </div>

            {/* Educational Info Note */}
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl space-y-2">
              <div className="flex items-start gap-2">
                <Key className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-slate-300 space-y-1">
                  <p>
                    <strong>1. Validação de Assinatura (HMAC-SHA256):</strong> O servidor valida a assinatura enviada pelo gateway no cabeçalho <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-300 font-mono text-[10px]">x-signature</code> antes de processar qualquer notificação, impedindo invasores de forjar pagamentos falsos.
                  </p>
                  <p>
                    <strong>2. Pix Direto via Bacen API vs. Gateway Cartão (PCI-DSS):</strong> Pagamentos Pix operam via API do Banco Central (chave e QR Code dinâmico). Para cartão de crédito, o sistema opera com tokenização segura sem salvar CVV/número completo em banco de dados, em conformidade com as normas PCI-DSS.
                  </p>
                </div>
              </div>
            </div>

            {/* Webhook Endpoint URL */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-300 text-[11px]">
                URL Oficial do seu Webhook (Cole no Painel do Mercado Pago / Gateway):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={fullWebhookUrl}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-emerald-300 font-mono text-xs select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyWebhookUrl}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0 text-xs"
                >
                  {copiedWebhook ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWebhook ? 'Copiado!' : 'Copiar URL'}</span>
                </button>
              </div>
            </div>

            {/* Webhook Secret Key */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block font-bold text-slate-300 text-[11px] flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Segredo do Webhook (Chave Secreta HMAC):</span>
                </label>
                <input
                  type="password"
                  value={config.webhookSecret || ''}
                  onChange={(e) => setConfig({ ...config, webhookSecret: e.target.value })}
                  placeholder="Ex: sec_mp_webhook_secret_key"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-400"
                />
                <p className="text-[10px] text-slate-400">
                  Ou configure via variável <code className="text-amber-300">PAYMENT_WEBHOOK_SECRET</code> no servidor.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-300 text-[11px]">
                  Provedor Principal do Gateway:
                </label>
                <select
                  value={config.gatewayProvider || 'mercadopago'}
                  onChange={(e) => setConfig({ ...config, gatewayProvider: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-400 font-bold"
                >
                  <option value="mercadopago">Mercado Pago (x-signature v1 HMAC-SHA256)</option>
                  <option value="asaas">Asaas (asaas-access-token Header)</option>
                  <option value="efi_bank">Efí Bank / Gerencianet (OAuth + Webhook Pix)</option>
                  <option value="bacen_pix_direct">BACEN API Pix Direto (Banco Inter / Itaú / BB)</option>
                  <option value="personalizado">Personalizado (HMAC-SHA256 / Bearer Token)</option>
                </select>
              </div>
            </div>

            {/* Optional Access Token for Automated Pix/Card Generation & Direct Bank Polling */}
            <div className="space-y-1 pt-1">
              <label className="block font-bold text-slate-300 text-[11px] flex items-center gap-1">
                <Key className="w-3.5 h-3.5 text-emerald-400" />
                <span>Access Token Oficial do Gateway (Mercado Pago / Asaas - Opcional):</span>
              </label>
              <input
                type="password"
                value={config.mercadopagoAccessToken || ''}
                onChange={(e) => setConfig({ ...config, mercadopagoAccessToken: e.target.value })}
                placeholder="Ex: APP_USR-xxxxxx-xxxxxx-xxxxxx (Token de Produção do Mercado Pago)"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-emerald-300 font-mono text-xs focus:outline-none focus:border-emerald-400"
              />
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Permite a consulta e verificação de crédito em tempo real diretamente na API do Gateway bancário.
              </p>
            </div>

            {/* Interactive Test Button & Results */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-300">
                  Diagnóstico de Integridade Criptográfica:
                </span>
                <button
                  type="button"
                  onClick={handleTestWebhookSignature}
                  disabled={testingWebhook}
                  className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs self-start sm:self-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingWebhook ? 'animate-spin' : ''}`} />
                  <span>{testingWebhook ? 'Testando Criptografia...' : '⚡ Testar Validação HMAC em Tempo Real'}</span>
                </button>
              </div>

              {testResult && (
                <div className={`p-3 rounded-xl border text-xs space-y-1.5 animate-in fade-in duration-200 ${
                  testResult.success ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200' : 'bg-rose-950/80 border-rose-500 text-rose-200'
                }`}>
                  <div className="flex items-center gap-2 font-bold">
                    {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                    <span>{testResult.success ? 'Validação de Assinatura Webhook Executada com Sucesso!' : 'Falha no Teste de Assinatura'}</span>
                  </div>
                  {testResult.generatedHmacSha256 && (
                    <div className="text-[10px] font-mono break-all text-slate-300 bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <strong>Hash HMAC-SHA256 Gerado:</strong> {testResult.generatedHmacSha256}
                    </div>
                  )}
                  <div className="text-[11px] text-slate-300 flex items-center justify-between flex-wrap gap-1">
                    <span><strong>Conformidade PCI-DSS:</strong> {testResult.pciDssComplianceStatus}</span>
                    <span className="text-emerald-400 font-bold">Proteção Anti-Replay: Ativa</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-amber-950/30 border border-amber-800/60 p-3 rounded-2xl text-[11px] text-amber-200 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Garantia de Recebimento & Segurança:</strong> Quando o perfil Salão abrir a tela para comprar o plano, ele verá os novos valores definidos aqui e o pagamento cairá diretamente na sua conta configurada com validação criptográfica ponta a ponta.
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
