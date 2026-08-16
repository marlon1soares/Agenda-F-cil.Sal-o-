import React, { useState } from 'react';
import { Professional, Transaction } from '../types';
import { Users, Plus, Trash2, Award, Phone, DollarSign, Percent } from 'lucide-react';

interface ProfissionaisViewProps {
  professionals: Professional[];
  transactions: Transaction[];
  onSaveProfessionals: (profs: Professional[]) => void;
}

export const ProfissionaisView: React.FC<ProfissionaisViewProps> = ({
  professionals,
  transactions,
  onSaveProfessionals,
}) => {
  const [editingProfs, setEditingProfs] = useState<Professional[]>(professionals);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Cabeleireiro(a)');
  const [newCommission, setNewCommission] = useState('50');
  const [newPhone, setNewPhone] = useState('');

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
      active: true
    };

    const updated = [...editingProfs, newProf];
    setEditingProfs(updated);
    onSaveProfessionals(updated);

    setNewName('');
    setNewRole('Cabeleireiro(a)');
    setNewCommission('50');
    setNewPhone('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> Gestão da Equipe & Repasse de Comissões
          </h3>
          <p className="text-xs text-slate-500">Configure as porcentagens de comissão e acompanhe os ganhos individuais</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" /> Novo Profissional
        </button>
      </div>

      {/* Staff Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {editingProfs.map(prof => {
          // Calculate earnings today for this professional
          const earningsToday = transactions.reduce((acc, t) => {
            const comm = t.commissions.find(c => c.professionalName === prof.name);
            return acc + (comm ? comm.amount : 0);
          }, 0);

          const servicesCount = transactions.filter(t => 
            t.commissions.some(c => c.professionalName === prof.name)
          ).length;

          return (
            <div key={prof.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 relative">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-extrabold text-lg flex items-center justify-center shadow-xs">
                    {prof.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{prof.name}</h4>
                    <span className="text-xs text-slate-500 font-medium">{prof.role}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteProf(prof.id)}
                  className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Comissão Padrão</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <input
                      type="number"
                      value={prof.commissionPercent}
                      onChange={(e) => handleUpdateCommission(prof.id, parseFloat(e.target.value) || 0)}
                      className="w-16 px-2 py-1 border border-slate-300 rounded font-bold text-slate-900 text-xs text-center"
                    />
                    <Percent className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </div>

                <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-emerald-800 font-bold uppercase">Acumulado Hoje</span>
                  <div className="text-sm font-black text-emerald-700 mt-0.5">
                    R$ {(Number(earningsToday) || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-500 flex items-center justify-between pt-1">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" /> {prof.phone || 'Sem fone'}
                </span>
                <span className="font-semibold text-slate-700">
                  {servicesCount} serviço(s)
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
              Cadastrar Novo Profissional
            </h3>

            <form onSubmit={handleAddProf} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome do Profissional *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Camila Ribeiro"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Especialidade / Cargo</label>
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="Ex: Manicure, Colorista"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Comissão Padrão (%)</label>
                  <input
                    type="number"
                    value={newCommission}
                    onChange={(e) => setNewCommission(e.target.value)}
                    placeholder="50"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="(11) 98888-7777"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-colors shadow-xs"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
