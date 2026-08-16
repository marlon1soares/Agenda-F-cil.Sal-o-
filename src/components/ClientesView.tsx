import React, { useState } from 'react';
import { ClientRecord } from '../types';
import { Users, Plus, Phone, MessageSquare, Sparkles, Send, Calendar, DollarSign } from 'lucide-react';

interface ClientesViewProps {
  clients: ClientRecord[];
  onSaveClients: (clients: ClientRecord[]) => void;
}

export const ClientesView: React.FC<ClientesViewProps> = ({
  clients,
  onSaveClients,
}) => {
  const [items, setItems] = useState<ClientRecord[]>(clients);
  const [selectedClientForMsg, setSelectedClientForMsg] = useState<ClientRecord | null>(null);
  const [generatedMsg, setGeneratedMsg] = useState('');
  const [loadingMsg, setLoadingMsg] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  const handleGenerateWhatsAppMsg = async (client: ClientRecord) => {
    setSelectedClientForMsg(client);
    setLoadingMsg(true);
    setGeneratedMsg('');
    try {
      const prompt = `Gere uma mensagem amigável, educada e atrativa de WhatsApp para a cliente do salão de beleza "${client.name}".
Informações da cliente:
- Nome: ${client.name}
- Total de visitas: ${client.totalVisits}
- Preferências/Anotações: ${client.notes || 'Cliente especial do salão'}

A mensagem deve confirmar um agendamento ou convidá-la para um novo atendimento com um benefício carinhoso. Mantenha curta para fácil envio no WhatsApp.`;

      const res = await fetch('/api/salon-ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, contextType: 'whatsapp_reminder' })
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedMsg(data.result);
      } else {
        setGeneratedMsg("Erro ao gerar mensagem automática.");
      }
    } catch {
      setGeneratedMsg("Erro de conexão.");
    } finally {
      setLoadingMsg(false);
    }
  };

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newClient: ClientRecord = {
      id: `cli-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim() || '(11) 90000-0000',
      email: email.trim(),
      totalVisits: 1,
      totalSpent: 0,
      lastVisit: new Date().toISOString().split('T')[0],
      notes: notes.trim()
    };

    const updated = [...items, newClient];
    setItems(updated);
    onSaveClients(updated);

    setName('');
    setPhone('');
    setEmail('');
    setNotes('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> Cadastro de Clientes & CRM
          </h3>
          <p className="text-xs text-slate-500">Histórico de frequência, gastos e gerador de lembretes via WhatsApp</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      {/* Clients List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map(cli => (
          <div key={cli.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">{cli.name}</h4>
                <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3 text-slate-400" /> {cli.phone}
                </div>
              </div>

              <button
                onClick={() => handleGenerateWhatsAppMsg(cli)}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Mensagem WhatsApp
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-100">
              <div className="bg-slate-50 p-2 rounded-lg text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Visitas</span>
                <div className="font-extrabold text-slate-800">{cli.totalVisits}</div>
              </div>

              <div className="bg-slate-50 p-2 rounded-lg text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Total Gasto</span>
                <div className="font-extrabold text-emerald-600">R$ {(Number(cli.totalSpent) || 0).toFixed(2)}</div>
              </div>

              <div className="bg-slate-50 p-2 rounded-lg text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Última Visita</span>
                <div className="font-extrabold text-slate-700">{cli.lastVisit}</div>
              </div>
            </div>

            {cli.notes && (
              <div className="text-[11px] text-slate-600 bg-amber-50/60 p-2 rounded-lg border border-amber-100">
                <span className="font-bold text-amber-900">Obs: </span>{cli.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* WhatsApp Message Generator Modal */}
      {selectedClientForMsg && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" /> Mensagem WhatsApp para {selectedClientForMsg.name}
              </h3>
              <button onClick={() => setSelectedClientForMsg(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            {loadingMsg ? (
              <div className="p-8 text-center text-xs text-slate-500 font-medium">
                Gerando mensagem personalizada inteligente...
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={generatedMsg}
                  onChange={(e) => setGeneratedMsg(e.target.value)}
                  rows={6}
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 bg-slate-50"
                />

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedMsg);
                      alert("Mensagem copiada para a área de transferência!");
                    }}
                    className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2.5 rounded-xl transition-colors"
                  >
                    Copiar Mensagem
                  </button>

                  <a
                    href={`https://wa.me/55${selectedClientForMsg.phone.replace(/\D/g, '')}?text=${encodeURIComponent(generatedMsg)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition-colors text-center flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Abrir no WhatsApp
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
              Cadastrar Novo Cliente
            </h3>

            <form onSubmit={handleAddClient} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Mariana Costa"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 98888-7777"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@email.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Preferências ou Observações</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Prefere escova modelada, alérgica a esmalte tradicional..."
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
