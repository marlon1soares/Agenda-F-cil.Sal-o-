import React, { useState } from 'react';
import { Transaction, SalonConfig, UserRole, CaixaFechamentoCiclo } from '../types';
import { parsePOSCommand, Storage } from '../utils/storage';
import { exportToExcel, exportToWord } from '../utils/exporters';
import { CreditCard, Trash2, FileSpreadsheet, FileText, Send, Sparkles, Filter, X, FolderOpen, Settings, CheckCircle2, Lock, Database, Calendar as CalendarIcon, ShieldCheck } from 'lucide-react';
import { BancoDadosCaixaModal } from './BancoDadosCaixaModal';

interface CaixaViewProps {
  transactions: Transaction[];
  config: SalonConfig;
  userRole: UserRole;
  salonId?: string;
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

  const handleLaunchCommand = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commandInput.trim()) return;

    const newTx = parsePOSCommand(commandInput, userRole, config.profs);
    if (!newTx || newTx.grossAmount <= 0) {
      alert("Por favor, informe uma descrição e um valor numérico válido (Ex: 'corte e barba 80' ou 'plano mensal 160').");
      return;
    }

    onAddTransaction(newTx);
    setCommandInput('');
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
      
      {/* Instructions & POS Command Input Box */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div className="text-xs text-slate-500 font-medium">
            Digite o procedimento (ex: <i className="text-slate-700">unhas 34</i>, <i className="text-slate-700">barba 50 cartão 5%</i> ou <i className="text-slate-700">plano mensal 80</i>):
          </div>
          <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1 self-start sm:self-auto">
            <Sparkles className="w-3 h-3" /> Lançamento Rápido POS
          </span>
        </div>

        <form onSubmit={handleLaunchCommand} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
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
        </form>
      </div>

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
                  <span className="inline-block bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase font-mono mt-1">
                    {tx.paymentMethod}
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
                    <td className="p-3 text-center uppercase font-mono font-bold text-slate-600">
                      {tx.paymentMethod}
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
