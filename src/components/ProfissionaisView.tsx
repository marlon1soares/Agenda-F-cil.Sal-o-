import React, { useState, useEffect } from 'react';
import { Professional, Transaction } from '../types';
import { Users, Plus, Trash2, Phone, Percent, UserCheck, Link2, Share2, Sparkles, Scissors } from 'lucide-react';

interface ProfissionaisViewProps {
  professionals: Professional[];
  transactions: Transaction[];
  onSaveProfessionals: (profs: Professional[]) => void;
  onOpenEmployeeLink?: () => void;
}

export const ProfissionaisView: React.FC<ProfissionaisViewProps> = ({
  professionals = [],
  transactions = [],
  onSaveProfessionals,
  onOpenEmployeeLink,
}) => {
  const [editingProfs, setEditingProfs] = useState<Professional[]>(professionals || []);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Cabeleireiro(a)');
  const [newCommission, setNewCommission] = useState('50');
  const [newPhone, setNewPhone] = useState('');
  const [newCpf, setNewCpf] = useState('');

  // Keep state synchronized with props
  useEffect(() => {
    if (professionals && Array.isArray(professionals)) {
      setEditingProfs(professionals);
    }
  }, [professionals]);

  const handleUpdateCommission = (id: string, percent: number) => {
    const updated = editingProfs.map(p => p.id === id ? { ...p, commissionPercent: percent } : p);
    setEditingProfs(updated);
    onSaveProfessionals(updated);
  };

  const handleDeleteProf = (id: string) => {
    if (editingProfs.length <= 1) {
      alert("É necessário manter ao menos 1 profissional cadastrado.");
      return;
    }
    const updated = editingProfs.filter(p => p.id !== id);
    setEditingProfs(updated);
    onSaveProfessionals(updated);
  };

  const handleAddProf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newProf: Professional = {
      id: `prof-${Date.now()}`,
      name: newName.trim(),
      role: newRole.trim() || 'Cabeleireiro(a)',
      commissionPercent: parseFloat(newCommission) || 50,
      phone: newPhone.trim() || '(11) 90000-0000',
      cpf: newCpf.trim() || undefined,
      active: true
    };

    const updated = [...editingProfs, newProf];
    setEditingProfs(updated);
    onSaveProfessionals(updated);

    setNewName('');
    setNewRole('Cabeleireiro(a)');
    setNewCommission('50');
    setNewPhone('');
    setNewCpf('');
    setShowAddModal(false);
  };

  const safeProfs = Array.isArray(editingProfs) ? editingProfs : [];
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  return (
    <div className="space-y-5">
      
      {/* Top Bar */}
      <div className="bg-slate-900/90 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-400" />
            <span>Equipe do Salão & Comissões</span>
            <span className="text-xs bg-sky-950 text-sky-300 font-mono px-2 py-0.5 rounded-full border border-sky-800">
              {safeProfs.length} Profissionais
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Gerencie os profissionais do salão, ajuste porcentagens de comissão e envie o link de acesso aos funcionários
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {onOpenEmployeeLink && (
            <button
              onClick={onOpenEmployeeLink}
              className="bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-600 hover:to-emerald-600 text-white font-extrabold text-xs px-3.5 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer border border-teal-500/40"
              title="Gerar e compartilhar link de acesso direto com a equipe"
            >
              <Link2 className="w-4 h-4 text-teal-200" />
              <span>Enviar Link p/ Funcionários</span>
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Profissional</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {safeProfs.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <Users className="w-12 h-12 text-slate-600 mx-auto" />
          <h4 className="text-sm font-bold text-white">Nenhum profissional cadastrado</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Cadastre os membros da sua equipe para vincular aos atendimentos e calcular as comissões.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Cadastrar Primeiro Profissional
          </button>
        </div>
      ) : (
        /* Staff Grid Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {safeProfs.map(prof => {
            // Calculate earnings today for this professional safely
            const earningsToday = safeTransactions.reduce((acc, t) => {
              if (!t || !Array.isArray(t.commissions)) return acc;
              const comm = t.commissions.find(c => c && c.professionalName === prof.name);
              return acc + (comm && typeof comm.amount === 'number' ? comm.amount : 0);
            }, 0);

            const servicesCount = safeTransactions.filter(t => 
              t && Array.isArray(t.commissions) && t.commissions.some(c => c && c.professionalName === prof.name)
            ).length;

            return (
              <div key={prof.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4 relative hover:border-slate-700 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-base flex items-center justify-center shadow-md border border-blue-400/30 shrink-0">
                      {prof.name ? prof.name.substring(0, 2).toUpperCase() : 'PR'}
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-white">{prof.name}</h4>
                      <span className="text-xs text-sky-400 font-medium">{prof.role || 'Profissional'}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteProf(prof.id)}
                    className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-950/40 transition-colors"
                    title="Excluir profissional"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Comissão</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="number"
                        value={prof.commissionPercent}
                        onChange={(e) => handleUpdateCommission(prof.id, parseFloat(e.target.value) || 0)}
                        className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg font-mono font-bold text-white text-xs text-center focus:outline-none focus:border-blue-500"
                      />
                      <Percent className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>

                  <div className="bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-900/60">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase block">Acumulado Hoje</span>
                    <div className="text-sm font-black text-emerald-300 mt-1 font-mono">
                      R$ {(Number(earningsToday) || 0).toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-mono">{prof.phone || 'Sem telefone'}</span>
                  </span>
                  {prof.cpf && (
                    <span className="font-mono text-[10px] text-teal-400 font-bold bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800/40">
                      CPF: {prof.cpf}
                    </span>
                  )}
                  <span className="font-bold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-md text-[11px]">
                    {servicesCount} {servicesCount === 1 ? 'atendimento' : 'atendimentos'}
                  </span>
                </div>

                {onOpenEmployeeLink && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={onOpenEmployeeLink}
                      className="w-full py-1.5 px-3 rounded-xl bg-teal-950/60 hover:bg-teal-900/80 text-teal-300 border border-teal-700/50 hover:border-teal-500 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer"
                    >
                      <Link2 className="w-3.5 h-3.5 text-teal-400" />
                      <span>Gerar Link de Acesso ({prof.name})</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-md overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-sky-400" />
                <span>Cadastrar Novo Profissional</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddProf} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Nome do Profissional *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Camila Ribeiro"
                  required
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Especialidade / Cargo</label>
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="Ex: Cabeleireira, Manicure, Barbeiro..."
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Comissão Padrão (%)</label>
                  <input
                    type="number"
                    value={newCommission}
                    onChange={(e) => setNewCommission(e.target.value)}
                    placeholder="50"
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="(11) 98888-7777"
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">CPF do Profissional (Opcional p/ Login)</label>
                <input
                  type="text"
                  value={newCpf}
                  onChange={(e) => setNewCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl transition-colors text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-2.5 rounded-xl transition-colors shadow-md text-xs active:scale-95 cursor-pointer"
                >
                  Salvar Profissional
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

