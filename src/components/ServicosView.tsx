import React, { useState } from 'react';
import { ServiceItem } from '../types';
import { Scissors, Plus, Trash2, Clock, DollarSign, Tag } from 'lucide-react';

interface ServicosViewProps {
  services: ServiceItem[];
  onSaveServices: (services: ServiceItem[]) => void;
}

export const ServicosView: React.FC<ServicosViewProps> = ({
  services,
  onSaveServices,
}) => {
  const [items, setItems] = useState<ServiceItem[]>(services);
  const [showAddModal, setShowAddModal] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Cabelo');
  const [price, setPrice] = useState('100');
  const [duration, setDuration] = useState('45');
  const [description, setDescription] = useState('');

  const handleDeleteService = (id: string) => {
    const updated = items.filter(s => s.id !== id);
    setItems(updated);
    onSaveServices(updated);
  };

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newService: ServiceItem = {
      id: `srv-${Date.now()}`,
      name: name.trim(),
      category,
      price: parseFloat(price) || 0,
      durationMinutes: parseInt(duration) || 30,
      defaultCommissionPercent: 50,
      description: description.trim()
    };

    const updated = [...items, newService];
    setItems(updated);
    onSaveServices(updated);

    setName('');
    setPrice('100');
    setDuration('45');
    setDescription('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Scissors className="w-5 h-5 text-blue-600" /> Tabela de Serviços e Preços
          </h3>
          <p className="text-xs text-slate-500">Cadastre os procedimentos oferecidos no salão para agendamentos e vendas rápidas</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" /> Novo Serviço
        </button>
      </div>

      {/* Services Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-white sticky top-0 z-10 font-bold">
              <tr>
                <th className="p-3">Serviço / Procedimento</th>
                <th className="p-3">Categoria</th>
                <th className="p-3 text-center">Duração</th>
                <th className="p-3 text-center">Preço (R$)</th>
                <th className="p-3 text-center w-12">#</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {items.map((srv, idx) => (
                <tr key={srv.id} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                  <td className="p-3 font-bold text-slate-900">
                    {srv.name}
                    {srv.description && (
                      <span className="block text-[10px] text-slate-500 font-normal mt-0.5">{srv.description}</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="bg-blue-50 text-blue-700 font-bold text-[10px] px-2 py-0.5 rounded border border-blue-100">
                      {srv.category}
                    </span>
                  </td>
                  <td className="p-3 text-center text-slate-600 font-mono">
                    {srv.durationMinutes} min
                  </td>
                  <td className="p-3 text-center font-extrabold text-emerald-600 text-sm">
                    R$ {srv.price.toFixed(2)}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleDeleteService(srv.id)}
                      className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
              Cadastrar Novo Serviço
            </h3>

            <form onSubmit={handleAddService} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome do Serviço *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Escova Progressiva Orgânica"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Cabelo">Cabelo</option>
                    <option value="Barbearia">Barbearia</option>
                    <option value="Unhas">Unhas</option>
                    <option value="Coloração">Coloração</option>
                    <option value="Tratamento">Tratamento</option>
                    <option value="Estética">Estética</option>
                    <option value="Planos">Planos</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Preço (R$) *</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="100"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Duração Estimada (minutos)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="45"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descrição Breve</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhes adicionais..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
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
