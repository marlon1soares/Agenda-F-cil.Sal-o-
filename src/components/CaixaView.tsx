import React, { useState, useEffect, useRef } from 'react';
import { Transaction, SalonConfig, UserRole, CaixaFechamentoCiclo, Appointment, PaymentMethod } from '../types';
import { parsePOSCommand, Storage } from '../utils/storage';
import { exportToExcel, exportToWord } from '../utils/exporters';
import { CreditCard, Trash2, FileSpreadsheet, FileText, Send, Sparkles, Filter, X, FolderOpen, Settings, CheckCircle2, Lock, Database, Calendar as CalendarIcon, ShieldCheck, Zap, Coins, Check, UserCheck, AlertCircle } from 'lucide-react';
import { BancoDadosCaixaModal } from './BancoDadosCaixaModal';

interface CaixaViewProps {
  transactions: Transaction[];
  config: SalonConfig;
  userRole: UserRole;
  salonId?: string;
  pendingAppointment?: Appointment | null;
  onClearPendingAppointment?: () => void;
  onCompleteAppointment?: (date: string, timeSlot: string, ap: Appointment) => void;
  onAddTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onClearAllTransactions: () => void;
  onOpenCatalog: () => void;
  onOpenConfig: () => void;
}

export const CaixaView: React.FC<CaixaViewProps> = ({
  transactions,
  config,
  userRole,
  salonId,
  pendingAppointment,
  onClearPendingAppointment,
  onCompleteAppointment,
  onAddTransaction,
  onDeleteTransaction,
  onClearAllTransactions,
  onOpenCatalog,
  onOpenConfig,
}) => {
  const [commandInput, setCommandInput] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [isBancoDadosOpen, setIsBancoDadosOpen] = useState(false);
  const [showConfirmClearModal, setShowConfirmClearModal] = useState(false);
  const [activePaymentMethod, setActivePaymentMethod] = useState<'pix' | 'cartao' | 'plano_mensal' | 'dinheiro' | null>(null);
  const [cardTaxPercent, setCardTaxPercent] = useState<number>(5);
  const [launchSuccessNotice, setLaunchSuccessNotice] = useState<string | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalInputRef = useRef<HTMLInputElement>(null);

  // When a pending appointment arrives from "Concluir" on Agenda
  useEffect(() => {
    if (pendingAppointment) {
      const sName = pendingAppointment.serviceName || 'Procedimento';
      const sPrice = pendingAppointment.price ? `${pendingAppointment.price}` : '';
      setCommandInput(`${sName} ${sPrice}`.trim());
      setActivePaymentMethod('pix');
      setShowCompletionModal(true);
      setTimeout(() => {
        inputRef.current?.focus();
        modalInputRef.current?.focus();
      }, 150);
    }
  }, [pendingAppointment]);

  const handleSelectPaymentMethodQuick = (method: 'pix' | 'cartao' | 'plano_mensal' | 'dinheiro') => {
    setActivePaymentMethod(method);
    let cur = commandInput.trim();
    if (!cur) return;

    if (method === 'cartao') {
      if (!cur.match(/\b(cartao|cartão|credito|crédito|debito|débito)\b/i)) {
        cur = cur.replace(/\b(pix|dinheiro|especie|espécie|plano\s*mensal|plano)\b/gi, '').trim();
        setCommandInput(`${cur} cartão ${cardTaxPercent}%`.trim());
      }
    } else if (method === 'plano_mensal') {
      if (!cur.match(/\b(plano\s*mensal|plano)\b/i)) {
        cur = cur.replace(/\b(cartao|cartão|debito|débito|credito|crédito|pix|dinheiro|taxa\s*\d+%?)\b/gi, '').trim();
        setCommandInput(`plano mensal ${cur}`.trim());
      }
    } else if (method === 'pix') {
      if (!cur.match(/\b(pix)\b/i)) {
        cur = cur.replace(/\b(cartao|cartão|debito|débito|credito|crédito|dinheiro|plano\s*mensal|plano|taxa\s*\d+%?)\b/gi, '').trim();
        setCommandInput(`${cur} pix`.trim());
      }
    } else if (method === 'dinheiro') {
      if (!cur.match(/\b(dinheiro|especie|espécie)\b/i)) {
        cur = cur.replace(/\b(cartao|cartão|debito|débito|credito|crédito|pix|plano\s*mensal|plano|taxa\s*\d+%?)\b/gi, '').trim();
        setCommandInput(`${cur} dinheiro`.trim());
      }
    }
  };

  const handleLaunchCommand = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToParse = commandInput.trim();
    if (!textToParse) {
      alert("Por favor, digite o procedimento e o valor (Ex: 'unhas 34', 'barba 50 cartão 5%' ou 'plano mensal 80').");
      return;
    }

    let overrideMethod: PaymentMethod | 'plano_mensal' | undefined = undefined;
    let overrideFee: number | undefined = undefined;

    if (activePaymentMethod === 'pix') overrideMethod = 'pix';
    else if (activePaymentMethod === 'cartao') {
      overrideMethod = 'cartao_credito';
      overrideFee = cardTaxPercent;
    } else if (activePaymentMethod === 'plano_mensal') {
      overrideMethod = 'plano_mensal';
    } else if (activePaymentMethod === 'dinheiro') {
      overrideMethod = 'dinheiro';
    }

    const newTx = parsePOSCommand(textToParse, userRole, config.profs, {
      defaultClientName: pendingAppointment?.clientName,
      overridePaymentMethod: overrideMethod,
      overrideCardFee: overrideFee,
      specificProfessionalName: pendingAppointment?.professionalName
    });

    if (!newTx || newTx.grossAmount <= 0) {
      alert("Por favor, informe uma descrição e um valor numérico válido (Ex: 'unhas 34', 'barba 50 cartão 5%' ou 'plano mensal 80').");
      return;
    }

    if (pendingAppointment) {
      newTx.clientName = pendingAppointment.clientName;
      if (pendingAppointment.date) {
        newTx.date = pendingAppointment.date;
      }
      if (onCompleteAppointment) {
        onCompleteAppointment(pendingAppointment.date, pendingAppointment.timeSlot, {
          ...pendingAppointment,
          status: 'concluido'
        });
      }
      if (onClearPendingAppointment) {
        onClearPendingAppointment();
      }
      setLaunchSuccessNotice(`Atendimento de ${pendingAppointment.clientName} concluído com sucesso e lançado no caixa!`);
      setTimeout(() => setLaunchSuccessNotice(null), 5000);
    } else {
      setLaunchSuccessNotice(`Lançamento realizado no caixa com sucesso: R$ ${newTx.grossAmount.toFixed(2)}!`);
      setTimeout(() => setLaunchSuccessNotice(null), 4000);
    }

    onAddTransaction(newTx);
    setCommandInput('');
    setActivePaymentMethod(null);
    setShowCompletionModal(false);
  };

  // Filtered transactions (including both active and cancelled for export)
  const filteredTransactions = transactions.filter(tx => {
    if (!filterQuery) return true;
    const query = filterQuery.toLowerCase();
    return (
      tx.description.toLowerCase().includes(query) ||
      tx.paymentMethod.toLowerCase().includes(query) ||
      (tx.clientName && tx.clientName.toLowerCase().includes(query)) ||
      tx.date.includes(query)
    );
  });

  // Active transactions for on-screen daily caixa view
  const activeTransactions = filteredTransactions.filter(tx => !tx.deleted && tx.status !== 'cancelado');
  const cancelledTransactionsCount = filteredTransactions.filter(tx => tx.deleted || tx.status === 'cancelado').length;

  // Calculate Totals for active procedures (omitting cancelled items)
  const totalGross = activeTransactions.reduce((acc, t) => acc + (Number(t.grossAmount) || 0), 0);
  const totalNet = activeTransactions.reduce((acc, t) => acc + (Number(t.netAmount) || 0), 0);

  // Professional Commission Totals (from active procedures only)
  const profCommissionTotals = config.profs.map(p => {
    const totalAmount = activeTransactions.reduce((acc, t) => {
      const comm = t.commissions?.find(c => c.professionalName === p.nome);
      return acc + (comm ? comm.amount : 0);
    }, 0);
    return { name: p.nome, percentage: p.porc, totalAmount };
  });

  const canExportReports = userRole === 'admin' || userRole === 'salao';

  const [fechamentoNotice, setFechamentoNotice] = useState<string | null>(null);
  const [isClosingCaixa, setIsClosingCaixa] = useState(false);
  const effectiveSalonId = salonId || config.id || 'default';

  const [lastFechamento, setLastFechamento] = useState<{
    date: string;
    totalGross: number;
    count: number;
  } | null>(() => {
    try {
      const saved = localStorage.getItem(`fechamento_caixa_${effectiveSalonId}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleFechamentoCaixa = () => {
    if (activeTransactions.length === 0 && cancelledTransactionsCount === 0) {
      alert("Não há lançamentos ou procedimentos registrados no período atual para fechamento de caixa.");
      return;
    }

    setIsClosingCaixa(true);

    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    const yyyymmdd = now.toISOString().split('T')[0];

    const info = {
      date: formattedDate,
      totalGross: Number(totalGross) || 0,
      count: activeTransactions.length,
    };

    try {
      localStorage.setItem(`fechamento_caixa_${effectiveSalonId}`, JSON.stringify(info));
      setLastFechamento(info);
    } catch (e) {
      console.warn("Aviso ao salvar registro local do fechamento:", e);
    }

    // Calcula resumo de comissões e formas de pagamento
    const profCommissionMap = new Map<string, { totalAmount: number; count: number }>();
    let totalCommissions = 0;
    activeTransactions.forEach(t => {
      if (t.commissions && t.commissions.length > 0) {
        t.commissions.forEach(c => {
          const current = profCommissionMap.get(c.professionalName) || { totalAmount: 0, count: 0 };
          const amt = Number(c.amount) || 0;
          totalCommissions += amt;
          profCommissionMap.set(c.professionalName, {
            totalAmount: current.totalAmount + amt,
            count: current.count + 1
          });
        });
      }
    });

    const commissionsByProf = Array.from(profCommissionMap.entries()).map(([profName, val]) => ({
      professionalName: profName,
      amount: val.totalAmount,
      count: val.count
    }));

    const methodMap = new Map<string, { total: number; count: number }>();
    activeTransactions.forEach(t => {
      const m = t.paymentMethod || 'dinheiro';
      const cur = methodMap.get(m) || { total: 0, count: 0 };
      methodMap.set(m, {
        total: cur.total + (Number(t.grossAmount) || 0),
        count: cur.count + 1
      });
    });
    const paymentMethodsSummary = Array.from(methodMap.entries()).map(([m, v]) => ({
      method: m as any,
      total: v.total,
      count: v.count
    }));

    const cycleId = `fechamento_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const ciclo: CaixaFechamentoCiclo = {
      id: cycleId,
      salonId: effectiveSalonId,
      salonName: config.nomeSalao || 'Meu Salão',
      closedAt: now.toISOString(),
      closedAtFormatted: formattedDate,
      date: yyyymmdd,
      totalGross,
      totalNet,
      totalCommissions,
      activeCount: activeTransactions.length,
      cancelledCount: cancelledTransactionsCount,
      commissionsByProf,
      paymentMethodsSummary,
      transactions: [...filteredTransactions],
      clearedBy: userRole
    };

    // Salva o fechamento no Banco de Dados Histórico com 100% de segurança
    Storage.saveCaixaFechamento(ciclo);

    // 1. Gera e baixa o relatório em Word (.doc)
    exportToWord(filteredTransactions, config);

    // 2. Gera e baixa o relatório em Excel (.xls) com pequeno intervalo para o navegador permitir ambos os downloads
    setTimeout(() => {
      exportToExcel(filteredTransactions, config);
      setIsClosingCaixa(false);
      setFechamentoNotice(`Fechamento de Caixa realizado com sucesso! Total contabilizado: R$ ${info.totalGross.toFixed(2)} (${info.count} procedimentos). Os relatórios em Word (.doc) e Excel (.xls) foram baixados.`);
      setTimeout(() => setFechamentoNotice(null), 9000);
    }, 450);
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notice for Launch or Fechamento */}
      {launchSuccessNotice && (
        <div className="bg-emerald-600 text-white p-3.5 rounded-2xl shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-200" />
            <span>{launchSuccessNotice}</span>
          </div>
          <button
            onClick={() => setLaunchSuccessNotice(null)}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Instructions & POS Command Input Box */}
      <div id="caixa-pos-input-section" className={`bg-white p-4 sm:p-5 rounded-2xl border ${pendingAppointment ? 'border-emerald-400 ring-2 ring-emerald-400/30' : 'border-slate-200'} shadow-xs space-y-3.5 transition-all`}>
        
        {/* Pending Appointment Banner if coming from "Concluir" on Agenda */}
        {pendingAppointment && (
          <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs animate-in fade-in">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-xs">
                $
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-xs sm:text-sm text-emerald-950">
                    Concluindo Atendimento: {pendingAppointment.clientName}
                  </span>
                  <span className="bg-emerald-200 text-emerald-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                    Horário: {pendingAppointment.timeSlot}
                  </span>
                </div>
                <p className="text-xs text-emerald-800 mt-0.5 font-medium">
                  Procedimento marcado: <b>{pendingAppointment.serviceName || 'Atendimento'}</b>
                  {pendingAppointment.professionalName && (
                    <span> • Profissional: <b>{pendingAppointment.professionalName}</b></span>
                  )}
                  {pendingAppointment.price ? (
                    <span> • Valor base: <b>R$ {Number(pendingAppointment.price).toFixed(2)}</b></span>
                  ) : null}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setShowCompletionModal(true)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-100/70 hover:bg-emerald-200/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                Abrir na Janela
              </button>
              <button
                type="button"
                onClick={onClearPendingAppointment}
                className="text-xs font-bold text-slate-500 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Descartar conclusão e voltar ao modo manual"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div className="text-xs text-slate-600 font-medium">
            Digite o procedimento (ex: <i className="text-slate-800 font-semibold">unhas 34</i>, <i className="text-slate-800 font-semibold">barba 50 cartão 5%</i> ou <i className="text-slate-800 font-semibold">plano mensal 80</i>):
          </div>
          <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1 self-start sm:self-auto">
            <Sparkles className="w-3 h-3" /> Lançamento Rápido POS
          </span>
        </div>

        <form onSubmit={handleLaunchCommand} className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="Ex: plano mensal 80 ou barba 50 cartão 5%"
              className="flex-1 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900 bg-slate-50/50"
            />
            <button
              type="submit"
              style={{ backgroundColor: config.corCustom || '#2563eb' }}
              className="text-white font-extrabold text-sm px-6 py-2.5 sm:py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Lançar no Caixa</span>
            </button>
          </div>

          {/* Quick Payment Method Selector */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <span>Forma de Pagamento:</span>
            </span>

            {/* PIX */}
            <button
              type="button"
              onClick={() => handleSelectPaymentMethodQuick('pix')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activePaymentMethod === 'pix'
                  ? 'bg-emerald-600 text-white shadow-xs scale-105'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>Pix</span>
            </button>

            {/* CARTÃO */}
            <button
              type="button"
              onClick={() => handleSelectPaymentMethodQuick('cartao')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activePaymentMethod === 'cartao'
                  ? 'bg-blue-600 text-white shadow-xs scale-105'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Cartão</span>
            </button>

            {/* PLANO MENSAL */}
            <button
              type="button"
              onClick={() => handleSelectPaymentMethodQuick('plano_mensal')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activePaymentMethod === 'plano_mensal'
                  ? 'bg-purple-600 text-white shadow-xs scale-105'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title="Plano Mensal (Calcula automaticamente 1/8 do valor digitado)"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Plano Mensal (1/8)</span>
            </button>

            {/* DINHEIRO */}
            <button
              type="button"
              onClick={() => handleSelectPaymentMethodQuick('dinheiro')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activePaymentMethod === 'dinheiro'
                  ? 'bg-amber-600 text-white shadow-xs scale-105'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Coins className="w-3.5 h-3.5 text-amber-300" />
              <span>Dinheiro</span>
            </button>

            {/* Taxa Cartão */}
            {activePaymentMethod === 'cartao' && (
              <div className="flex items-center gap-1.5 ml-auto text-xs bg-blue-50 border border-blue-200 px-2 py-1 rounded-lg">
                <span className="text-blue-900 font-bold">Taxa Cartão:</span>
                <select
                  value={cardTaxPercent}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setCardTaxPercent(val);
                    let cur = commandInput;
                    if (cur.match(/cart[aã]o\s*\d*%/i)) {
                      cur = cur.replace(/cart[aã]o\s*\d*%/i, `cartão ${val}%`);
                      setCommandInput(cur);
                    }
                  }}
                  className="bg-white border border-blue-300 rounded px-1.5 py-0.5 text-xs font-bold text-blue-900 outline-none cursor-pointer"
                >
                  <option value={0}>0%</option>
                  <option value={3}>3%</option>
                  <option value={5}>5%</option>
                  <option value={10}>10%</option>
                </select>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Completion Modal Window (Identical layout to POS input as requested) */}
      {showCompletionModal && pendingAppointment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[99999] animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 p-5 sm:p-6 rounded-3xl max-w-xl w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-emerald-900/20">
                  $
                </div>
                <div>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Concluir Atendimento e Lançar no Caixa
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-0.5">
                    {pendingAppointment.clientName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Procedimento: <span className="font-bold text-slate-800">{pendingAppointment.serviceName}</span>
                    {pendingAppointment.professionalName && <span> • Profissional: <span className="font-bold text-slate-800">{pendingAppointment.professionalName}</span></span>}
                    <span> • Horário: <span className="font-bold text-slate-800">{pendingAppointment.timeSlot}</span></span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCompletionModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                title="Fechar janela e usar a tela do caixa"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* POS Input Exactly as Requested */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div className="text-xs text-slate-600 font-medium">
                  Digite o procedimento (ex: <i className="text-slate-800 font-semibold">unhas 34</i>, <i className="text-slate-800 font-semibold">barba 50 cartão 5%</i> ou <i className="text-slate-800 font-semibold">plano mensal 80</i>):
                </div>
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1 self-start sm:self-auto">
                  <Sparkles className="w-3 h-3" /> Lançamento Rápido POS
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  ref={modalInputRef}
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder="Ex: plano mensal 80 ou barba 50 cartão 5%"
                  className="flex-1 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900 bg-slate-50/50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleLaunchCommand(e);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={(e) => handleLaunchCommand(e)}
                  style={{ backgroundColor: config.corCustom || '#2563eb' }}
                  className="text-white font-extrabold text-sm px-6 py-2.5 sm:py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Lançar no Caixa</span>
                </button>
              </div>

              {/* Forma de Pagamento */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-500 mr-1">
                  Forma de Pagamento:
                </span>

                <button
                  type="button"
                  onClick={() => handleSelectPaymentMethodQuick('pix')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activePaymentMethod === 'pix'
                      ? 'bg-emerald-600 text-white shadow-xs scale-105'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  <span>Pix</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPaymentMethodQuick('cartao')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activePaymentMethod === 'cartao'
                      ? 'bg-blue-600 text-white shadow-xs scale-105'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Cartão</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPaymentMethodQuick('plano_mensal')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activePaymentMethod === 'plano_mensal'
                      ? 'bg-purple-600 text-white shadow-xs scale-105'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                  title="Plano Mensal (1/8)"
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>Plano Mensal (1/8)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPaymentMethodQuick('dinheiro')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activePaymentMethod === 'dinheiro'
                      ? 'bg-amber-600 text-white shadow-xs scale-105'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5 text-amber-300" />
                  <span>Dinheiro</span>
                </button>

                {activePaymentMethod === 'cartao' && (
                  <div className="flex items-center gap-1.5 ml-auto text-xs bg-blue-50 border border-blue-200 px-2 py-1 rounded-lg">
                    <span className="text-blue-900 font-bold">Taxa:</span>
                    <select
                      value={cardTaxPercent}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCardTaxPercent(val);
                        let cur = commandInput;
                        if (cur.match(/cart[aã]o\s*\d*%/i)) {
                          cur = cur.replace(/cart[aã]o\s*\d*%/i, `cartão ${val}%`);
                          setCommandInput(cur);
                        }
                      }}
                      className="bg-white border border-blue-300 rounded px-1.5 py-0.5 text-xs font-bold text-blue-900 outline-none cursor-pointer"
                    >
                      <option value={0}>0%</option>
                      <option value={3}>3%</option>
                      <option value={5}>5%</option>
                      <option value={10}>10%</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowCompletionModal(false);
                  if (onClearPendingAppointment) onClearPendingAppointment();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar / Descartar
              </button>
              <button
                type="button"
                onClick={(e) => handleLaunchCommand(e)}
                style={{ backgroundColor: config.corCustom || '#2563eb' }}
                className="px-5 py-2.5 rounded-xl text-xs font-black text-white hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirmar e Lançar no Caixa</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Header Bar with Count Badge & Actions */}
      <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 overflow-hidden">
        
        {/* Title & Count Badge */}
        <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 sm:gap-3">
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
            Lançamentos Globais de Hoje
          </h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="bg-sky-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-full shadow-xs whitespace-nowrap inline-flex items-center gap-1">
              <span>Ativos:</span>
              <span className="bg-white/20 px-1.5 py-0.5 rounded-full font-black text-white">{activeTransactions.length}</span>
            </span>
            {cancelledTransactionsCount > 0 && (
              <span className="bg-rose-50 text-rose-700 border border-rose-200 font-extrabold text-xs px-2 py-0.5 rounded-full whitespace-nowrap inline-flex items-center gap-1" title="Procedimentos cancelados mantidos para o relatório Word/Excel">
                <span>Apagados:</span>
                <span className="bg-rose-200 text-rose-900 px-1.5 py-0.2 rounded-full font-black text-[11px]">{cancelledTransactionsCount}</span>
              </span>
            )}
          </div>
        </div>

        {/* Filter Search Input & Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          
          <div className="relative w-full sm:w-48 lg:w-56">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Buscar no caixa..."
              className="w-full pl-8 pr-7 py-2 text-xs font-medium border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50"
            />
            {filterQuery && (
              <button onClick={() => setFilterQuery('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1.5 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenCatalog}
                className="flex-1 sm:flex-initial bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0 hover:opacity-90 active:scale-95 cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Catálogo</span>
              </button>

              <button
                type="button"
                id="btn-caixa-limpar"
                onClick={() => {
                  if (transactions.length === 0) {
                    alert("O painel já está limpo e pronto para novos lançamentos.");
                    return;
                  }
                  setShowConfirmClearModal(true);
                }}
                className="flex-1 sm:flex-initial bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0 hover:opacity-90 active:scale-95 cursor-pointer"
                title="Limpar para iniciar um novo ciclo: Salva todos os lançamentos com segurança no Banco de Dados com consulta por calendário"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            </div>

            {/* Botão Banco de Dados exatamente abaixo do Limpar conforme solicitado */}
            <button
              type="button"
              id="btn-banco-dados-caixa"
              onClick={() => setIsBancoDadosOpen(true)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-white border border-slate-700 hover:border-cyan-500/60 text-[11px] font-black py-1.5 px-3 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              title="Banco de Dados dos lançamentos globais: consulte o histórico por calendário e baixe relatórios a qualquer momento"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>Banco de Dados</span>
            </button>
          </div>

        </div>

      </div>

      {/* MOBILE ADAPTIVE VIEW (CARD-BASED - PERFECT ON SMARTPHONES) */}
      <div className="block sm:hidden space-y-2.5">
        {activeTransactions.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
            Nenhum lançamento ativo no caixa de hoje. Use o campo acima para lançar!
          </div>
        ) : (
          activeTransactions.map((tx) => (
            <div key={`mob-tx-${tx.id}`} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-black text-slate-900">{tx.description}</h4>
                  {tx.clientName && (
                    <span className="text-[11px] text-slate-500 block mt-0.5">Cliente: {tx.clientName}</span>
                  )}
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-1">
                    <span>📅 {tx.date}</span>
                    <span>⏰ {tx.time}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-black text-slate-900">
                    R$ {(Number(tx.grossAmount) || 0).toFixed(2)}
                  </div>
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md uppercase font-mono mt-1 ${
                    tx.paymentMethod === 'pix' ? 'bg-emerald-100 text-emerald-800' :
                    tx.paymentMethod === 'cartao_credito' || tx.paymentMethod === 'cartao_debito' ? 'bg-blue-100 text-blue-800' :
                    tx.paymentMethod === 'plano_mensal' ? 'bg-purple-100 text-purple-800 font-extrabold' :
                    tx.paymentMethod === 'dinheiro' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {tx.paymentMethod === 'cartao_credito' ? 'CRÉDITO' :
                     tx.paymentMethod === 'cartao_debito' ? 'DÉBITO' :
                     tx.paymentMethod === 'plano_mensal' ? 'PLANO MENSAL' :
                     tx.paymentMethod === 'pix' ? 'PIX' :
                     tx.paymentMethod === 'dinheiro' ? 'DINHEIRO' :
                     (tx.paymentMethod || '').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Commission Badges */}
              {config.profs.length > 0 && (
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="text-slate-400 font-bold">Comissões:</span>
                  {config.profs.map(p => {
                    const comm = tx.commissions.find(c => c.professionalName === p.nome);
                    const amount = comm ? comm.amount : (tx.netAmount * (p.porc / 100));
                    return (
                      <span key={p.nome} className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
                        {p.nome}: R$ {(Number(amount) || 0).toFixed(2)}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Delete Button */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                <span className="text-slate-400">
                  {tx.cardFeePercent > 0 ? `Taxa Cartão: ${tx.cardFeePercent}%` : 'Sem taxa de cartão'}
                </span>
                <button
                  onClick={() => onDeleteTransaction(tx.id)}
                  className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Excluir</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* TABLE VIEW FOR TABLET & DESKTOP */}
      <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead 
              style={{ backgroundColor: config.corCustom || '#2563eb' }}
              className="text-white sticky top-0 z-10 font-bold"
            >
              <tr>
                <th className="p-3 text-center w-20">Data</th>
                <th className="p-3 text-center w-20">Horário</th>
                <th className="p-3">Descrição / Procedimento</th>
                <th className="p-3 text-center">Pagamento</th>
                <th className="p-3 text-center">Bruto (R$)</th>
                <th className="p-3 text-center">Taxa</th>
                {config.profs.map(p => (
                  <th key={p.nome} className="p-3 text-center">
                    {p.nome} ({p.porc}%)
                  </th>
                ))}
                <th className="p-3 text-center w-12">#</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {activeTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7 + config.profs.length} className="p-8 text-center text-slate-400">
                    Nenhum lançamento ativo no caixa de hoje. Use o campo acima para lançar!
                  </td>
                </tr>
              ) : (
                activeTransactions.map((tx, idx) => (
                  <tr key={tx.id} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                    <td className="p-3 text-center text-slate-500 font-mono">{tx.date}</td>
                    <td className="p-3 text-center text-slate-500 font-mono">{tx.time}</td>
                    <td className="p-3 font-semibold text-slate-900">
                      {tx.description}
                      {tx.clientName && (
                        <span className="block text-[10px] text-slate-500 font-normal">Cliente: {tx.clientName}</span>
                      )}
                    </td>
                    <td className="p-3 text-center font-mono font-bold">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase inline-block ${
                        tx.paymentMethod === 'pix' ? 'bg-emerald-100 text-emerald-800' :
                        tx.paymentMethod === 'cartao_credito' || tx.paymentMethod === 'cartao_debito' ? 'bg-blue-100 text-blue-800' :
                        tx.paymentMethod === 'plano_mensal' ? 'bg-purple-100 text-purple-800 font-extrabold' :
                        tx.paymentMethod === 'dinheiro' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {tx.paymentMethod === 'cartao_credito' ? 'CRÉDITO' :
                         tx.paymentMethod === 'cartao_debito' ? 'DÉBITO' :
                         tx.paymentMethod === 'plano_mensal' ? 'PLANO MENSAL' :
                         tx.paymentMethod === 'pix' ? 'PIX' :
                         tx.paymentMethod === 'dinheiro' ? 'DINHEIRO' :
                         (tx.paymentMethod || '').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-slate-900">
                      R$ {(Number(tx.grossAmount) || 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-center text-rose-600 font-semibold">
                      {tx.cardFeePercent > 0 ? `${tx.cardFeePercent}%` : '-'}
                    </td>

                    {/* Commissions for each professional */}
                    {config.profs.map(p => {
                      const comm = tx.commissions.find(c => c.professionalName === p.nome);
                      const amount = comm ? comm.amount : (tx.netAmount * (p.porc / 100));
                      return (
                        <td key={p.nome} className="p-3 text-center font-bold text-emerald-600">
                          R$ {(Number(amount) || 0).toFixed(2)}
                        </td>
                      );
                    })}

                    <td className="p-3 text-center">
                      <button
                        onClick={() => onDeleteTransaction(tx.id)}
                        title="Excluir Lançamento"
                        className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals Summary Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-xs font-bold text-slate-900 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div>
          TOTAL DO DIA ({activeTransactions.length} procedimento{activeTransactions.length === 1 ? '' : 's'}):{' '}
          <span className="text-orange-600 font-extrabold text-sm sm:text-base ml-1">
            R$ {(Number(totalGross) || 0).toFixed(2)}
          </span>
          <span className="text-slate-500 font-normal text-[11px] block sm:inline sm:ml-2">
            (Líquido: R$ {(Number(totalNet) || 0).toFixed(2)})
          </span>
        </div>

        {/* Professional commission totals badge list */}
        <div className="flex items-center gap-2 flex-wrap">
          {profCommissionTotals.map(p => (
            <div key={p.name} className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-[11px]">
              <span className="text-slate-500">{p.name}: </span>
              <span className="text-emerald-600 font-extrabold">R$ {(Number(p.totalAmount) || 0).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Export Reports Action Buttons - Restricted to Owner & Admin */}
      {canExportReports ? (
        <div className="space-y-2">
          {/* Mensagem de Feedback de Fechamento Concluído */}
          {fechamentoNotice && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{fechamentoNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setFechamentoNotice(null)}
                className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5 sm:gap-3">
            {/* Coluna Esquerda: Baixar Excel (.XLS) */}
            <div className="flex-1 flex flex-col justify-end">
              <button
                type="button"
                id="btn-caixa-baixar-excel"
                onClick={() => exportToExcel(filteredTransactions, config)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>BAIXAR EXCEL (.XLS)</span>
              </button>
            </div>

            {/* Coluna Direita: Botão pequeno Fechamento de Caixa EM CIMA do Baixar Word */}
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="flex justify-end">
                <button
                  type="button"
                  id="btn-fechamento-caixa"
                  onClick={handleFechamentoCaixa}
                  disabled={isClosingCaixa}
                  className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-[11px] py-1 px-3 rounded-lg shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer border border-amber-300 disabled:opacity-50"
                  title="Fazer Fechamento de Caixa: Consolida os valores contabilizados no período e baixa automaticamente os relatórios em Word e Excel"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-950" />
                  <span>Fechamento de Caixa</span>
                </button>
              </div>

              <button
                type="button"
                id="btn-caixa-baixar-word"
                onClick={() => exportToWord(filteredTransactions, config)}
                className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <FileText className="w-4 h-4" />
                <span>BAIXAR WORD (.DOC)</span>
              </button>
            </div>
          </div>

          {/* Registro do último fechamento efetuado */}
          {lastFechamento && (
            <div className="text-[11px] text-slate-500 text-right pr-1 flex items-center justify-end gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              <span>Último fechamento: {lastFechamento.date} • Total: R$ {lastFechamento.totalGross.toFixed(2)} ({lastFechamento.count} procedimentos)</span>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center text-xs text-slate-500 font-medium">
          🔒 Relatórios de fechamento em Excel e Word são reservados exclusivamente para o Dono do Salão e Administrador.
        </div>
      )}

      {/* Modal de Confirmação para Iniciar Novo Ciclo & Salvar no Banco de Dados */}
      {showConfirmClearModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-slate-900">
                Iniciar Novo Ciclo de Lançamentos?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ao confirmar a limpeza do painel, todos os <b>{activeTransactions.length} lançamentos</b> do ciclo atual serão salvos com <b>100% de segurança no Banco de Dados Histórico</b> com data, hora e estatísticas consolidadas.
              </p>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-left text-xs space-y-1 text-slate-700 mt-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Faturado no Ciclo:</span>
                  <span className="font-extrabold text-emerald-600">R$ {totalGross.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Procedimentos Ativos:</span>
                  <span className="font-bold text-slate-800">{activeTransactions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Consulta Posterior:</span>
                  <span className="font-bold text-cyan-700 flex items-center gap-1">
                    <Database className="w-3 h-3" /> Botão Banco de Dados
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmClearModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmClearModal(false);
                  onClearAllTransactions();
                  setFechamentoNotice("Novo ciclo iniciado! Os lançamentos anteriores foram arquivados com sucesso no Banco de Dados.");
                  setTimeout(() => setFechamentoNotice(null), 8000);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-extrabold text-xs shadow-md shadow-rose-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Salvar & Iniciar Ciclo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Completo do Banco de Dados com Calendário */}
      <BancoDadosCaixaModal
        isOpen={isBancoDadosOpen}
        onClose={() => setIsBancoDadosOpen(false)}
        salonId={effectiveSalonId}
        salonName={config.nomeSalao}
        config={config}
        userRole={userRole}
        currentTransactions={transactions}
      />

    </div>
  );
};
