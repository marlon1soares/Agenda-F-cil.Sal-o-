import React, { useState, useEffect } from 'react';
import { ClientRecord } from '../types';
import { Users, Plus, Phone, MessageSquare, Sparkles, Send } from 'lucide-react';

interface ClientesViewProps {
  clients: ClientRecord[];
  onSaveClients: (clients: ClientRecord[]) => void;
}

export const ClientesView: React.FC<ClientesViewProps> = ({
  clients = [],
  onSaveClients,
}) => {
  const [items, setItems] = useState<ClientRecord[]>(clients || []);
  const [selectedClientForMsg, setSelectedClientForMsg] = useState<ClientRecord | null>(null);
  const [generatedMsg, setGeneratedMsg] = useState('');
  const [loadingMsg, setLoadingMsg] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (clients && Array.isArray(clients)) {
      setItems(clients);
    }
  }, [clients]);

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

  const safeItems = Array.isArray(items) ? items : [];

  return (
    <div className="space-y-5">
      
      {/* Header */}
      <div className="bg-slate-900/90 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-400" />
            <span>Cadastro de Clientes & CRM</span>
            <span className="text-xs bg-sky-950 text-sky-300 font-mono px-2 py-0.5 rounded-full border border-sky-800">
              {safeItems.length} Clientes
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Histórico de frequência, gastos e gerador de lembretes via WhatsApp
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Clients List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {safeItems.map(cli => (
          <div key={cli.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md space-y-3.5 hover:border-slate-700 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-extrabold text-white">{cli.name}</h4>
                <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-500" /> {cli.phone}
                </div>
              </div>

              <button
                onClick={() => handleGenerateWhatsAppMsg(cli)}
                className="bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mensagem WhatsApp</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-800">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Visitas</span>
                <div className="font-extrabold text-white text-sm mt-0.5">{cli.totalVisits}</div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Gasto</span>
                <div className="font-black text-emerald-400 text-sm mt-0.5 font-mono">
                  R$ {(Number(cli.totalSpent) || 0).toFixed(2).replace('.', ',')}
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Última Visita</span>
                <div className="font-bold text-slate-300 text-xs mt-0.5">{cli.lastVisit || 'Hoje'}</div>
              </div>
            </div>

            {cli.notes && (
              <div className="text-[11px] text-amber-200 bg-amber-950/40 p-2.5 rounded-xl border border-amber-900/50">
                <span className="font-bold text-amber-400">Obs: </span>{cli.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* WhatsApp Message Generator Modal */}
      {selectedClientForMsg && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-lg overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <span>Mensagem WhatsApp para {selectedClientForMsg.name}</span>
              </h3>
              <button onClick={() => setSelectedClientForMsg(null)} className="text-slate-400 hover:text-white font-bold p-1">
                ✕
              </button>
            </div>

            {loadingMsg ? (
              <div className="p-8 text-center text-xs text-slate-400 font-medium">
                <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Gerando mensagem personalizada inteligente...
              </div>
            ) : (
              <div className="space-y-3.5">
                <textarea
                  value={generatedMsg}
                  onChange={(e) => setGeneratedMsg(e.target.value)}
                  rows={6}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono outline-none focus:border-emerald-500 text-slate-200"
                />

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedMsg);
                      alert("Mensagem copiada para a área de transferência!");
                    }}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2.5 rounded-xl transition-colors"
                  >
                    Copiar Mensagem
                  </button>

                  <a
                    href={`https://wa.me/55${selectedClientForMsg.phone.replace(/\D/g, '')}?text=${encodeURIComponent(generatedMsg)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-2.5 rounded-xl transition-colors text-center flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Abrir no WhatsApp</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-md overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-400" />
                <span>Cadastrar Novo Cliente</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddClient} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Mariana Costa"
                  required
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 98888-7777"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@email.com"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Preferências ou Observações</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Prefere escova modelada, alérgica a esmalte tradicional..."
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
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

