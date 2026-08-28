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
          <span className="bg-sky-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-full shadow-xs whitespace-nowrap inline-flex items-center gap-1">
            <span>Procedimentos:</span>
            <span className="bg-white/20 px-1.5 py-0.5 rounded-full font-black text-white">{filteredTransactions.length}</span>
          </span>
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

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenCatalog}
              className="flex-1 sm:flex-initial bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0 hover:opacity-90 active:scale-95 cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Catálogo</span>
            </button>

            <button
              onClick={onClearAllTransactions}
              className="flex-1 sm:flex-initial bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0 hover:opacity-90 active:scale-95 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>
          </div>

        </div>

      </div>

      {/* MOBILE ADAPTIVE VIEW (CARD-BASED - PERFECT ON SMARTPHONES) */}
      <div className="block sm:hidden space-y-2.5">
        {filteredTransactions.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
            Nenhum lançamento registrado no caixa. Use o campo acima para lançar!
          </div>
        ) : (
          filteredTransactions.map((tx) => (
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
          TOTAL DO DIA ({filteredTransactions.length} procedimentos):{' '}
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

      {/* Export Reports Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
        <button
          onClick={() => exportToExcel(filteredTransactions, config)}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>BAIXAR EXCEL (.XLS)</span>
        </button>

        <button
          onClick={() => exportToWord(filteredTransactions, config)}
          className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <FileText className="w-4 h-4" />
          <span>BAIXAR WORD (.DOC)</span>
        </button>
      </div>

    </div>
  );
};
