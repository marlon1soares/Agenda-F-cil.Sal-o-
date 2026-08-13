import React, { useState } from 'react';
import { Transaction, SalonConfig, UserRole } from '../types';
import { parsePOSCommand } from '../utils/storage';
import { exportToExcel, exportToWord } from '../utils/exporters';
import { CreditCard, Trash2, FileSpreadsheet, FileText, Send, Sparkles, Filter, X, FolderOpen, Settings } from 'lucide-react';

interface CaixaViewProps {
  transactions: Transaction[];
  config: SalonConfig;
  userRole: UserRole;
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
  onAddTransaction,
  onDeleteTransaction,
  onClearAllTransactions,
  onOpenCatalog,
  onOpenConfig,
}) => {
  const [commandInput, setCommandInput] = useState('');
  const [filterQuery, setFilterQuery] = useState('');

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

  // Filtered transactions
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

  // Calculate Totals
  const totalGross = filteredTransactions.reduce((acc, t) => acc + t.grossAmount, 0);
  const totalNet = filteredTransactions.reduce((acc, t) => acc + t.netAmount, 0);

  // Professional Commission Totals
  const profCommissionTotals = config.profs.map(p => {
    const totalAmount = filteredTransactions.reduce((acc, t) => {
      const comm = t.commissions.find(c => c.professionalName === p.nome);
      return acc + (comm ? comm.amount : 0);
    }, 0);
    return { name: p.nome, percentage: p.porc, totalAmount };
  });

  return (
    <div className="space-y-6">
      
      {/* Instructions & POS Command Input Box */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            Digite o procedimento (ex: <i className="text-slate-700">unhas 34</i>, <i className="text-slate-700">barba 50 cartão 5%</i> ou <i className="text-slate-700">plano mensal 80</i>):
          </div>
          <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Lançamento Rápido POS
          </span>
        </div>

        <form onSubmit={handleLaunchCommand} className="flex items-center gap-2">
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="Ex: plano mensal 80 ou barba 50 cartão 5%"
            className="flex-1 px-4 py-3 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900 bg-slate-50/50"
          />
          <button
            type="submit"
            style={{ backgroundColor: config.corCustom || '#2563eb' }}
            className="text-white font-bold text-sm px-6 py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-sm flex items-center gap-2 shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>Lançar</span>
          </button>
        </form>
      </div>

      {/* Header Bar with Count Badge & Actions */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 overflow-hidden">
        
        {/* Title & Count Badge */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 whitespace-nowrap">
            Lançamentos Globais de Hoje
          </h3>
          <span className="bg-sky-600 text-white font-extrabold text-xs px-3 py-1 rounded-full shadow-xs whitespace-nowrap inline-flex items-center gap-1">
            <span>Procedimentos:</span>
            <span className="bg-white/20 px-1.5 py-0.5 rounded-full font-black text-white">{filteredTransactions.length}</span>
          </span>
        </div>

        {/* Filter Search Input & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          
          <div className="relative min-w-[150px] flex-1 md:w-44 lg:w-52">
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

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onOpenCatalog}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0 hover:opacity-90 active:scale-95"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Catálogo</span>
            </button>

            <button
              onClick={onOpenConfig}
              className="bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0 hover:opacity-90 active:scale-95"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Config</span>
            </button>

            <button
              onClick={onClearAllTransactions}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0 hover:opacity-90 active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>
          </div>

        </div>

      </div>

      {/* Transactions Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
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
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7 + config.profs.length} className="p-8 text-center text-slate-400">
                    Nenhum lançamento registrado no caixa. Use o campo acima para lançar!
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx, idx) => (
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
                      R$ {tx.grossAmount.toFixed(2)}
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
                          R$ {amount.toFixed(2)}
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

        {/* Totals Footer Bar */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 text-xs font-bold text-slate-900 flex flex-wrap items-center justify-between gap-4">
          <div>
            TOTAL DO DIA ({filteredTransactions.length} procedimentos):{' '}
            <span className="text-orange-600 font-extrabold text-sm ml-1">
              R$ {totalGross.toFixed(2)}
            </span>
            <span className="text-slate-500 font-normal text-[11px] ml-2">
              (Líquido: R$ {totalNet.toFixed(2)})
            </span>
          </div>

          {/* Professional commission totals badge list */}
          <div className="flex items-center gap-3 flex-wrap">
            {profCommissionTotals.map(p => (
              <div key={p.name} className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-[11px]">
                <span className="text-slate-500">{p.name}: </span>
                <span className="text-emerald-600 font-extrabold">R$ {p.totalAmount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Export Reports Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => exportToExcel(filteredTransactions, config)}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>BAIXAR EXCEL (.XLS)</span>
        </button>

        <button
          onClick={() => exportToWord(filteredTransactions, config)}
          className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
        >
          <FileText className="w-4 h-4" />
          <span>BAIXAR WORD (.DOC)</span>
        </button>
      </div>

    </div>
  );
};
