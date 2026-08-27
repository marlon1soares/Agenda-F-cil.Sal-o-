import React, { useState, useEffect } from 'react';
import { ServiceItem } from '../types';
import { Scissors, Plus, Trash2, Clock, Tag } from 'lucide-react';

interface ServicosViewProps {
  services: ServiceItem[];
  onSaveServices: (services: ServiceItem[]) => void;
}

export const ServicosView: React.FC<ServicosViewProps> = ({
  services = [],
  onSaveServices,
}) => {
  const [items, setItems] = useState<ServiceItem[]>(services || []);
  const [showAddModal, setShowAddModal] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Cabelo');
  const [price, setPrice] = useState('100');
  const [duration, setDuration] = useState('45');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (services && Array.isArray(services)) {
      setItems(services);
    }
  }, [services]);

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

  const safeItems = Array.isArray(items) ? items : [];

  return (
    <div className="space-y-5">
      
      {/* Top Header */}
      <div className="bg-slate-900/90 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Scissors className="w-5 h-5 text-sky-400" />
            <span>Tabela de Serviços e Preços</span>
            <span className="text-xs bg-sky-950 text-sky-300 font-mono px-2 py-0.5 rounded-full border border-sky-800">
              {safeItems.length} Serviços
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Cadastre os procedimentos oferecidos no salão para agendamentos e vendas rápidas
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Serviço</span>
        </button>
      </div>

      {/* Services Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-md overflow-hidden">
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-300 sticky top-0 z-10 font-bold border-b border-slate-800">
              <tr>
                <th className="p-3.5">Serviço / Procedimento</th>
                <th className="p-3.5">Categoria</th>
                <th className="p-3.5 text-center">Duração</th>
                <th className="p-3.5 text-center">Preço (R$)</th>
                <th className="p-3.5 text-center w-12">#</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/70 font-medium text-slate-300">
              {safeItems.map((srv, idx) => (
                <tr key={srv.id} className={idx % 2 === 1 ? 'bg-slate-950/40 hover:bg-slate-800/40' : 'bg-slate-900/60 hover:bg-slate-800/40'}>
                  <td className="p-3.5 font-bold text-white">
                    {srv.name}
                    {srv.description && (
                      <span className="block text-[11px] text-slate-400 font-normal mt-0.5">{srv.description}</span>
                    )}
                  </td>
                  <td className="p-3.5">
                    <span className="bg-sky-950/80 text-sky-300 font-bold text-[10px] px-2.5 py-1 rounded-md border border-sky-800/60">
                      {srv.category}
                    </span>
                  </td>
                  <td className="p-3.5 text-center text-slate-400 font-mono">
                    {srv.durationMinutes} min
                  </td>
                  <td className="p-3.5 text-center font-black text-emerald-400 text-sm font-mono">
                    R$ {(Number(srv.price) || 0).toFixed(2).replace('.', ',')}
                  </td>
                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => handleDeleteService(srv.id)}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-950/40 transition-colors"
                      title="Excluir serviço"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-md overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Scissors className="w-5 h-5 text-sky-400" />
                <span>Cadastrar Novo Serviço</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddService} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Nome do Serviço *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Escova Progressiva Orgânica"
                  required
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-blue-500 font-bold"
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
                  <label className="block font-bold text-slate-300 mb-1">Preço (R$) *</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="100"
                    required
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Duração Estimada (minutos)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="45"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Descrição Breve</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhes adicionais..."
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs outline-none focus:border-blue-500"
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
                  Salvar Serviço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

