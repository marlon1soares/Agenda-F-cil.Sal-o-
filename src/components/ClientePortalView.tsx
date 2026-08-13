import React, { useState } from 'react';
import { SalonApp, ServiceItem, Professional, Appointment, ClientRecord } from '../types';
import { Storage } from '../utils/storage';
import { 
  Scissors, Calendar, Clock, User, Phone, CheckCircle2, Building2, 
  Sparkles, Search, ArrowRight, ShieldCheck, Heart, MapPin, Share2, Award, ChevronRight
} from 'lucide-react';

interface ClientePortalViewProps {
  salons: SalonApp[];
  activeSalon: SalonApp;
  onSelectSalon: (salon: SalonApp) => void;
  onAppointmentBooked: (date: string, timeSlot: string, ap: Appointment) => void;
}

export const ClientePortalView: React.FC<ClientePortalViewProps> = ({
  salons,
  activeSalon,
  onSelectSalon,
  onAppointmentBooked,
}) => {
  const [searchCode, setSearchCode] = useState('');
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedProf, setSelectedProf] = useState<Professional | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('09:00');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastAppointment, setLastAppointment] = useState<Appointment | null>(null);

  // Available Time Slots
  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', 
    '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', 
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'
  ];

  // Salon Services and Professionals
  const services: ServiceItem[] = Storage.getServices();
  const profs: Professional[] = activeSalon.config.profs.map((p, idx) => ({
    id: p.id || `prof-${idx}`,
    name: p.nome,
    role: 'Especialista',
    commissionPercent: p.porc,
    active: true
  }));

  // Handle Salon Search by Code or Name
  const handleSearchSalon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;
    const term = searchCode.trim().toLowerCase();
    const found = salons.find(s => 
      s.appCode.toLowerCase() === term || 
      s.name.toLowerCase().includes(term) ||
      s.config.nomeSalao.toLowerCase().includes(term)
    );
    if (found) {
      onSelectSalon(found);
      setSearchCode('');
    } else {
      alert(`Nenhum salão encontrado com o código ou nome "${searchCode}". Tente "SALAO-1001", "SALAO-1002" ou o nome do salão.`);
    }
  };

  // Submit Booking
  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) {
      alert('Por favor, selecione um serviço.');
      return;
    }
    if (!clientName.trim() || !clientPhone.trim()) {
      alert('Por favor, preencha seu nome e WhatsApp.');
      return;
    }

    const newAppointment: Appointment = {
      id: `ap-cli-${Date.now()}`,
      date: selectedDate,
      timeSlot: selectedTime,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      serviceName: selectedService.name,
      professionalName: selectedProf ? selectedProf.name : 'Qualquer Profissional',
      price: selectedService.price,
      status: 'agendado',
      notes: clientNotes.trim(),
      origem: 'cliente'
    };

    // Trigger parent callback to save in salon's appointments
    onAppointmentBooked(selectedDate, selectedTime, newAppointment);

    // Save client in salon's client list
    const currentClients = Storage.getClients();
    const exists = currentClients.some(c => c.phone === clientPhone.trim());
    if (!exists) {
      const newClientRecord: ClientRecord = {
        id: `cli-${Date.now()}`,
        name: clientName.trim(),
        phone: clientPhone.trim(),
        totalVisits: 1,
        totalSpent: selectedService.price,
        lastVisit: selectedDate
      };
      Storage.saveClients([...currentClients, newClientRecord]);
    }

    setLastAppointment(newAppointment);
    setIsSuccess(true);
  };

  const handleShareWhatsapp = () => {
    if (!lastAppointment) return;
    const msg = `Olá *${activeSalon.config.nomeSalao}*! Fiz um agendamento pelo *Agenda mais fácil.cliente*:\n\n` +
      `📅 *Data:* ${lastAppointment.date} às ${lastAppointment.timeSlot}\n` +
      `✂️ *Serviço:* ${lastAppointment.serviceName}\n` +
      `👤 *Profissional:* ${lastAppointment.professionalName}\n` +
      `💰 *Valor:* R$ ${lastAppointment.price.toFixed(2)}\n` +
      `🙋‍♂️ *Cliente:* ${lastAppointment.clientName} (${lastAppointment.clientPhone})`;
    
    window.open(`https://api.whatsapp.com/send?phone=55${activeSalon.ownerPhone.replace(/\D/g, '')}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Client Header Banner */}
      <div className="bg-gradient-to-r from-rose-600 via-pink-600 to-purple-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="bg-white/20 text-white font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider border border-white/20">
              Agenda mais fácil.cliente
            </span>
            <h2 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight flex items-center gap-2">
              <Heart className="w-7 h-7 text-rose-200 fill-rose-200" />
              <span>Agendamento Online do Cliente</span>
            </h2>
            <p className="text-white/90 text-xs sm:text-sm mt-1 max-w-2xl">
              Escolha seu salão preferido, consulte horários livres em tempo real e agende seu horário em segundos sem precisar ligar.
            </p>
          </div>

          {/* Salon Selector Pill */}
          <div className="bg-slate-950/70 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 w-full md:w-auto">
            <span className="text-[10px] font-bold text-rose-200 uppercase tracking-wider block mb-1">
              Salão Selecionado Atual:
            </span>
            <div className="flex items-center gap-2 text-white font-extrabold text-sm">
              <Building2 className="w-4 h-4 text-rose-300" />
              <span>{activeSalon.config.nomeSalao}</span>
              <span className="bg-rose-500/40 text-rose-100 text-[10px] px-2 py-0.5 rounded-full font-mono">
                {activeSalon.appCode}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SALON SELECTION / CODE SEARCH BAR */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-400" />
              <span>Selecione ou Busque um Salão Parceiro</span>
            </h3>
            <p className="text-xs text-slate-400">
              Alterne entre os salões do sistema ou digite o código de um aplicativo (ex: SALAO-1001)
            </p>
          </div>

          <form onSubmit={handleSearchSalon} className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="Digite o código (Ex: SALAO-1001)..."
              className="bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500 w-full sm:w-48"
            />
            <button
              type="submit"
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1 shrink-0 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Buscar</span>
            </button>
          </form>
        </div>

        {/* Quick Salon Switcher Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-800/80">
          <span className="text-[11px] font-bold text-slate-400 shrink-0">Salões Cadastrados:</span>
          {salons.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelectSalon(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border ${
                s.id === activeSalon.id
                  ? 'bg-rose-600 text-white border-rose-400 shadow-md ring-1 ring-rose-400'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
              }`}
            >
              <Scissors className="w-3 h-3 text-rose-300" />
              <span>{s.config.nomeSalao}</span>
              <span className="text-[10px] opacity-75 font-mono">({s.appCode})</span>
            </button>
          ))}
        </div>
      </div>

      {!isSuccess ? (
        /* BOOKING FORM */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* STEP 1 & 2: SERVICES & PROFESSIONALS */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* SERVICES LIST */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-rose-400" />
                  <span>1. Escolha o Serviço Desejado</span>
                </h3>
                <span className="text-xs text-slate-400">
                  {services.length} Serviços Disponíveis
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map((srv) => {
                  const isSelected = selectedService?.id === srv.id;
                  return (
                    <div
                      key={srv.id}
                      onClick={() => setSelectedService(srv)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex justify-between items-center ${
                        isSelected
                          ? 'bg-rose-950/40 border-rose-500 ring-1 ring-rose-500 shadow-lg'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <span className="font-extrabold text-white text-xs block">{srv.name}</span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{srv.durationMinutes} min</span>
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-black text-emerald-400 block">
                          R$ {srv.price.toFixed(2)}
                        </span>
                        {isSelected && (
                          <span className="bg-rose-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-1">
                            Selecionado ✓
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PROFESSIONALS SELECTOR */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-400" />
                  <span>2. Escolha o Profissional (Opcional)</span>
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedProf(null)}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    selectedProf === null
                      ? 'bg-purple-600/30 border-purple-500 text-white font-extrabold ring-1 ring-purple-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="block text-xs font-bold">Sem Preferência</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">Qualquer Atendente</span>
                </button>

                {profs.map((p) => {
                  const isSel = selectedProf?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProf(p)}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        isSel
                          ? 'bg-purple-600/30 border-purple-500 text-white font-extrabold ring-1 ring-purple-500'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="block text-xs font-bold text-white">{p.name}</span>
                      <span className="block text-[10px] text-purple-300 mt-0.5">Especialista</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* STEP 3: DATE, TIME & CLIENT INFO */}
          <div className="space-y-6">
            <form onSubmit={handleConfirmBooking} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span>3. Data, Horário e Seus Dados</span>
                </h3>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Data do Agendamento:
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Time Slots */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Horário Disponível:
                </label>
                <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {timeSlots.map((ts) => (
                    <button
                      key={ts}
                      type="button"
                      onClick={() => setSelectedTime(ts)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedTime === ts
                          ? 'bg-emerald-600 text-white font-black ring-1 ring-emerald-400 shadow-sm'
                          : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {ts}
                    </button>
                  ))}
                </div>
              </div>

              {/* Client Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Seu Nome Completo: *
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Roberto Alves"
                  required
                  className="w-full bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Client WhatsApp */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Seu Telefone / WhatsApp: *
                </label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(11) 98888-7777"
                  required
                  className="w-full bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Observação */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Observações (Opcional):
                </label>
                <textarea
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder="Ex: Preferência por atendimento pontual..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>

              {/* Order Summary Box */}
              {selectedService && (
                <div className="bg-slate-950 p-3 rounded-2xl border border-rose-500/30 text-xs space-y-1">
                  <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider block">
                    Resumo do Agendamento:
                  </span>
                  <div className="flex justify-between text-white font-bold">
                    <span>{selectedService.name}</span>
                    <span className="text-emerald-400">R$ {selectedService.price.toFixed(2)}</span>
                  </div>
                  <div className="text-slate-400 text-[11px] flex items-center gap-2">
                    <span>📅 {selectedDate} às {selectedTime}</span>
                    <span>• {selectedProf ? selectedProf.name : 'Sem Pref.'}</span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-black py-3 rounded-2xl text-xs sm:text-sm shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Agendamento no Salão</span>
              </button>

            </form>
          </div>

        </div>
      ) : (
        /* CONFIRMATION SCREEN */
        <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 text-center space-y-5 max-w-2xl mx-auto shadow-2xl">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-3xl flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-xl font-black text-white">
              Agendamento Confirmado com Sucesso!
            </h3>
            <p className="text-slate-300 text-xs mt-1">
              Seu horário foi registrado em tempo real no aplicativo do salão <strong className="text-rose-300">{activeSalon.config.nomeSalao}</strong>.
            </p>
          </div>

          {/* Receipt Details Box */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-left text-xs space-y-2.5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-400">Salão:</span>
              <span className="font-black text-rose-300 text-sm">{activeSalon.config.nomeSalao} ({activeSalon.appCode})</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-slate-200">
              <div>
                <span className="text-slate-500 block text-[10px]">Serviço:</span>
                <span className="font-extrabold">{lastAppointment?.serviceName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Valor:</span>
                <span className="font-black text-emerald-400">R$ {lastAppointment?.price.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Data e Horário:</span>
                <span className="font-bold text-amber-300">{lastAppointment?.date} às {lastAppointment?.timeSlot}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Profissional:</span>
                <span className="font-bold">{lastAppointment?.professionalName}</span>
              </div>
            </div>

            <div className="border-t border-slate-900 pt-2 flex justify-between text-slate-300">
              <span>Cliente: <strong>{lastAppointment?.clientName}</strong></span>
              <span>WhatsApp: <strong>{lastAppointment?.clientPhone}</strong></span>
            </div>
          </div>

          {/* WhatsApp Share Button */}
          <button
            onClick={handleShareWhatsapp}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>Enviar Confirmação para o Salão via WhatsApp</span>
          </button>

          <button
            onClick={() => setIsSuccess(false)}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-2xl text-xs transition-colors"
          >
            Fazer Novo Agendamento
          </button>
        </div>
      )}

    </div>
  );
};
