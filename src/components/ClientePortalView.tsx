import React, { useState, useEffect } from 'react';
import { SalonApp, ServiceItem, Professional, Appointment, ClientRecord } from '../types';
import { Storage } from '../utils/storage';
import { DEFAULT_TIMESLOTS, DEFAULT_SALON_APPS, DEFAULT_CONFIG } from '../data/mockData';
import { generatePixEMVPayload, generateQrCodeDataUrl } from '../utils/pix';
import { getUrlParam } from '../utils/url';
import { 
  Scissors, Calendar, Clock, User, Phone, CheckCircle2, Building2,
  Sparkles, ArrowRight, ShieldCheck, Heart, MapPin, Share2, Award, ChevronRight, Lock, Image as ImageIcon,
  QrCode, Copy, CheckCheck, CreditCard, ExternalLink, MessageCircle, X, Check
} from 'lucide-react';

interface ClientePortalViewProps {
  salons?: SalonApp[];
  activeSalon?: SalonApp;
  onSelectSalon?: (salon: SalonApp) => void;
  appointments?: Record<string, Record<string, Appointment>>;
  timeAdjustments?: Record<string, number>;
  onAppointmentBooked: (date: string, timeSlot: string, ap: Appointment) => void;
  onOpenCatalog?: () => void;
  onOpenLiveHub?: () => void;
}

export const ClientePortalView: React.FC<ClientePortalViewProps> = ({
  salons = DEFAULT_SALON_APPS,
  activeSalon,
  appointments = {},
  timeAdjustments = {},
  onAppointmentBooked,
  onOpenCatalog,
  onOpenLiveHub,
}) => {
  // Guaranteed non-null salon and configuration objects
  const safeSalon: SalonApp = activeSalon || (salons && salons.length > 0 ? salons[0] : DEFAULT_SALON_APPS[0]);
  const safeConfig = safeSalon.config || DEFAULT_CONFIG;

  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedProf, setSelectedProf] = useState<Professional | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('10:00');
  const [clientName, setClientName] = useState(() => {
    try { return localStorage.getItem('salao_cliente_name') || ''; } catch { return ''; }
  });
  const [clientPhone, setClientPhone] = useState(() => {
    try { return localStorage.getItem('salao_cliente_phone') || ''; } catch { return ''; }
  });
  const [clientNotes, setClientNotes] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastAppointment, setLastAppointment] = useState<Appointment | null>(null);

  // Sync / Detect phone & name from URL params or stored clients
  useEffect(() => {
    try {
      const phoneParam = getUrlParam('phone') || getUrlParam('celular') || getUrlParam('tel');
      const nameParam = getUrlParam('name') || getUrlParam('nome');

      let savedPhone = '';
      let savedName = '';
      try {
        savedPhone = localStorage.getItem('salao_cliente_phone') || '';
        savedName = localStorage.getItem('salao_cliente_name') || '';
      } catch {}

      const effectivePhone = phoneParam ? phoneParam.replace(/\D/g, '') : savedPhone;
      let effectiveName = nameParam || savedName;

      if (effectivePhone) {
        setClientPhone(effectivePhone);
        try { localStorage.setItem('salao_cliente_phone', effectivePhone); } catch {}

        // Check if client name is already recorded in salon's clients database
        if (!effectiveName) {
          const clients = Storage.getClients();
          const found = clients.find(c => c.phone.replace(/\D/g, '') === effectivePhone);
          if (found && found.name) {
            effectiveName = found.name;
            setClientName(found.name);
            try { localStorage.setItem('salao_cliente_name', found.name); } catch {}
          }
        }
      }

      if (effectiveName) {
        setClientName(effectiveName);
        try { localStorage.setItem('salao_cliente_name', effectiveName); } catch {}
      }
    } catch {}
  }, []);

  // Payment states for Client
  const [copiedPix, setCopiedPix] = useState(false);
  const [showPixQr, setShowPixQr] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [pixPayload, setPixPayload] = useState('');

  // Compute Current Day Appointments & Time Shift
  const currentDayAppointments = appointments[selectedDate] || {};
  const currentDayShift = timeAdjustments[selectedDate] || 0;

  const getDisplayTime = (baseTime: string) => {
    const [hbH, hbM] = baseTime.split(':').map(Number);
    const totalMins = hbH * 60 + hbM + currentDayShift;
    const shiftedH = Math.floor(totalMins / 60).toString().padStart(2, '0');
    const shiftedM = (totalMins % 60).toString().padStart(2, '0');
    return `${shiftedH}:${shiftedM}`;
  };

  // Salon Services and Professionals
  const services: ServiceItem[] = Storage.getServices();
  const profsList = safeConfig.profs || [];
  const profs: Professional[] = profsList.map((p, idx) => ({
    id: p.id || `prof-${idx}`,
    name: p.nome,
    role: 'Especialista',
    commissionPercent: p.porc,
    active: true
  }));

  // Submit Booking
  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTime) {
      alert('Por favor, escolha um horário disponível (botão verde) para agendar.');
      return;
    }
    if (!selectedService) {
      alert('Por favor, selecione um serviço.');
      return;
    }
    if (!clientName.trim() || !clientPhone.trim()) {
      alert('Por favor, preencha seu nome e WhatsApp.');
      return;
    }

    // Check if slot was booked or blocked in real-time
    const existingAp = currentDayAppointments[selectedTime];
    if (existingAp && (existingAp.status === 'agendado' || existingAp.status === 'concluido' || existingAp.status === 'bloqueado')) {
      alert('Atenção: O horário selecionado acabou de ser reservado ou bloqueado pelo salão. Por favor, escolha outro horário livre.');
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

    // Trigger parent callback to save in salon's appointments (immediately synced to cloud)
    onAppointmentBooked(selectedDate, selectedTime, newAppointment);

    // Push real-time booking alert message to chat and online feed
    try {
      Storage.addMessage({
        id: `msg_book_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        salonId: safeSalon.id,
        salonName: safeSalon.name,
        fromRole: 'cliente',
        toRole: 'salao',
        senderName: clientName.trim(),
        senderPhone: clientPhone.trim(),
        clientPhone: clientPhone.trim(),
        content: `📅 [Agendamento Confirmado] ${clientName.trim()} agendou "${selectedService.name}" para o dia ${selectedDate} às ${selectedTime} (${selectedProf ? selectedProf.name : 'Qualquer Profissional'}).`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        date: selectedDate,
        createdAt: Date.now(),
        type: 'chat'
      });
    } catch {}

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
    const salonNameStr = safeSalon?.config?.nomeSalao || safeSalon?.name || 'Salão';
    const targetPhone = (safeSalon?.ownerPhone || '11999998888').replace(/\D/g, '');
    const msg = `Olá *${salonNameStr}*! Fiz um agendamento pelo *Agenda mais fácil.cliente*:\n\n` +
      `📅 *Data:* ${lastAppointment.date} às ${lastAppointment.timeSlot}\n` +
      `✂️ *Serviço:* ${lastAppointment.serviceName}\n` +
      `👤 *Profissional:* ${lastAppointment.professionalName}\n` +
      `💰 *Valor:* R$ ${(Number(lastAppointment.price) || 0).toFixed(2)}\n` +
      `🙋‍♂️ *Cliente:* ${lastAppointment.clientName} (${lastAppointment.clientPhone})`;
    
    window.open(`https://api.whatsapp.com/send?phone=55${targetPhone}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      
      {/* Client Header Banner (Compact Height) */}
      <div className="bg-gradient-to-r from-rose-600 via-pink-600 to-purple-700 rounded-2xl p-3 sm:p-4 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-white/20 text-white font-black text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-white/20 inline-block">
                Agenda mais fácil.cliente
              </span>
              {clientPhone && (
                <span className="bg-emerald-500/30 text-emerald-100 font-bold text-[9px] px-2.5 py-0.5 rounded-full border border-emerald-300/30 inline-flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-300" />
                  Link Permanente Atrelado: {clientPhone} {clientName ? `(${clientName})` : ''}
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-black mt-1 tracking-tight flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-rose-200 fill-rose-200" />
              <span>Agendamento Online de Horários</span>
            </h2>
            <p className="text-white/90 text-xs mt-0.5 max-w-xl leading-tight">
              {clientName ? `Olá, ${clientName}! ` : ''}Consulte os horários livres em tempo real e confirme seu agendamento em segundos. Este link é permanente e pode ser utilizado quantas vezes desejar!
            </p>
          </div>

          {/* Salon Identification Badge */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0 flex-wrap">
            <div className="bg-slate-950/70 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/20 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-500/30 flex items-center justify-center text-rose-200">
                <Scissors className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] font-bold text-rose-200 uppercase tracking-wider block leading-none">
                  Salão:
                </span>
                <span className="text-white font-black text-xs block leading-tight">
                  {safeConfig.nomeSalao}
                </span>
              </div>
            </div>

            {onOpenLiveHub && (
              <button
                type="button"
                onClick={onOpenLiveHub}
                title="Abrir Chat ao Vivo com o Proprietário do Salão"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-2 rounded-xl border border-emerald-400/40 shadow-md flex items-center gap-1.5 transition-all active:scale-95 shrink-0 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-emerald-100 animate-pulse" />
                <span>Chat com o Salão</span>
              </button>
            )}
          </div>
        </div>

        {/* Real-Time Live Connection Ribbon */}
        <div className="mt-3 pt-2.5 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-[11px] text-rose-100">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-white">Conexão em Tempo Real Ativa:</span>
            <span className="opacity-90">Salão e Clientes 100% Sincronizados</span>
          </div>

          {onOpenLiveHub && (
            <button
              type="button"
              onClick={onOpenLiveHub}
              className="text-[10px] font-black bg-white/20 hover:bg-white/30 text-white px-2.5 py-0.5 rounded-full border border-white/20 flex items-center gap-1 transition-colors"
            >
              <span>Ver Avisos & Mural</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
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
                          R$ {(Number(srv.price) || 0).toFixed(2)}
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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-300">
                    Horários Disponíveis (10h às 22h - Intervalo de 1 hora):
                  </label>
                  <span className="text-[10px] text-emerald-400 font-extrabold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/50 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    Sincronizado c/ Salão
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                  {DEFAULT_TIMESLOTS.map((baseSlot) => {
                    const displayTime = getDisplayTime(baseSlot);
                    const ap = currentDayAppointments[baseSlot];
                    const isBooked = ap && (ap.status === 'agendado' || ap.status === 'concluido');
                    const isBlocked = ap && ap.status === 'bloqueado';
                    const isOccupied = isBooked || isBlocked;
                    const isSelected = selectedTime === baseSlot;

                    if (isOccupied) {
                      return (
                        <button
                          key={baseSlot}
                          type="button"
                          disabled
                          className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all opacity-85 cursor-not-allowed border select-none ${
                            isBlocked
                              ? 'bg-rose-950/60 text-rose-300 border-rose-800/70'
                              : 'bg-amber-950/60 text-amber-200 border-amber-800/70'
                          }`}
                        >
                          <span className="font-mono text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3 opacity-60" /> {displayTime}
                          </span>
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/40">
                            {isBlocked ? '🔒 Bloqueado' : '📌 Reservado'}
                          </span>
                        </button>
                      );
                    }

                    return (
                      <button
                        key={baseSlot}
                        type="button"
                        onClick={() => setSelectedTime(prev => prev === baseSlot ? '' : baseSlot)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all border ${
                          isSelected
                            ? 'bg-emerald-600 text-white font-black border-emerald-500 shadow-md scale-[1.02]'
                            : 'bg-slate-950 text-slate-200 border-slate-800 hover:border-emerald-500/60 hover:bg-slate-900'
                        }`}
                      >
                        <span className="font-mono text-xs font-extrabold flex items-center gap-1">
                          <Clock className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-emerald-400'}`} /> {displayTime}
                        </span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                          isSelected ? 'bg-emerald-800 text-white' : 'text-emerald-400 bg-emerald-950/70'
                        }`}>
                          {isSelected ? 'SELECIONADO ✓' : 'LIVRE ✓'}
                        </span>
                      </button>
                    );
                  })}
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
                    <span className="text-emerald-400">R$ {(Number(selectedService.price) || 0).toFixed(2)}</span>
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
              Seu horário foi registrado em tempo real no aplicativo do salão <strong className="text-rose-300">{safeConfig.nomeSalao}</strong>.
            </p>
          </div>

          {/* Receipt Details Box */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-left text-xs space-y-2.5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-400">Salão:</span>
              <span className="font-black text-rose-300 text-sm">{safeConfig.nomeSalao} ({safeSalon.appCode})</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-slate-200">
              <div>
                <span className="text-slate-500 block text-[10px]">Serviço:</span>
                <span className="font-extrabold">{lastAppointment?.serviceName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Valor:</span>
                <span className="font-black text-emerald-400">R$ {(Number(lastAppointment?.price) || 0).toFixed(2)}</span>
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

          {/* Payment Instructions & Credentials Box */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-purple-500/30 text-left text-xs space-y-3.5 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-extrabold text-purple-300 flex items-center gap-1.5 text-xs">
                <CreditCard className="w-4 h-4 text-emerald-400" /> Formas de Pagamento Aceitas
              </span>
              <span className="text-[10px] text-slate-400">Pague agora via Pix ou Cartão</span>
            </div>

            {/* Pix Section */}
            <div className="bg-purple-950/40 p-3 rounded-xl border border-purple-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-purple-300 flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5 text-purple-400" /> Pagamento Pix:
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const pixKey = safeConfig.chavePix || 'marlon1soares28@gmail.com';
                      navigator.clipboard.writeText(pixKey);
                      setCopiedPix(true);
                      setTimeout(() => setCopiedPix(false), 2500);
                    }}
                    className="bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black px-2.5 py-1 rounded-lg transition-all flex items-center gap-1"
                  >
                    {copiedPix ? (
                      <>
                        <CheckCheck className="w-3 h-3 text-emerald-300" /> Chave Copiada!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copiar Chave Pix
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const pixKey = safeConfig.chavePix || 'marlon1soares28@gmail.com';
                      const beneficiary = safeConfig.titularPix || safeConfig.nomeSalao;
                      const city = safeConfig.cidadePix || 'SAO PAULO';
                      const amount = lastAppointment?.price;
                      const payload = generatePixEMVPayload(pixKey, beneficiary, city, amount);
                      setPixPayload(payload);
                      const qrUrl = await generateQrCodeDataUrl(payload);
                      setQrCodeUrl(qrUrl);
                      setShowPixQr(true);
                    }}
                    className="bg-purple-800 hover:bg-purple-700 text-purple-200 text-[10px] font-bold px-2 py-1 rounded-lg transition-all flex items-center gap-1"
                  >
                    <QrCode className="w-3 h-3" /> QR Code
                  </button>
                </div>
              </div>

              <div className="font-mono text-xs font-bold text-purple-200 break-all">
                {safeConfig.chavePix || 'marlon1soares28@gmail.com'}
              </div>

              {safeConfig.titularPix && (
                <div className="text-[10px] text-slate-400">
                  Titular: <strong className="text-white">{safeConfig.titularPix}</strong>
                </div>
              )}
            </div>

            {/* Card Receiving Account Info */}
            <div className="bg-sky-950/40 p-3 rounded-xl border border-sky-500/30 space-y-1.5">
              <span className="text-[11px] font-extrabold text-sky-300 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-sky-400" /> Pagamento com Cartão de Crédito / Débito:
              </span>
              {safeConfig.bancoCartao || safeConfig.contaCartao || safeConfig.linkCartao ? (
                <div className="text-[11px] text-slate-300 space-y-0.5">
                  <div>Banco: <strong className="text-white">{safeConfig.bancoCartao || 'Banco Cadastrado'}</strong></div>
                  <div>Agência: <strong className="font-mono text-white">{safeConfig.agenciaCartao || '0001'}</strong> • Conta: <strong className="font-mono text-white">{safeConfig.contaCartao || '-'}</strong> ({safeConfig.tipoContaCartao || 'Corrente'})</div>
                  {safeConfig.titularCartao && (
                    <div>Titular da Conta: <strong className="text-white">{safeConfig.titularCartao}</strong></div>
                  )}
                  {safeConfig.linkCartao && (
                    <div className="pt-1.5">
                      <a
                        href={safeConfig.linkCartao}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Pagar com Cartão de Crédito Online
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-slate-400">
                  Aceitamos cartões de crédito e débito presencialmente na maquininha do salão.
                </p>
              )}
            </div>
          </div>

          {/* Dynamic Pix QR Code Modal in Client Confirmation */}
          {showPixQr && (
            <div className="fixed inset-0 z-80 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-purple-500/50 p-5 rounded-3xl max-w-xs w-full text-center space-y-3 shadow-2xl">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-xs font-black text-purple-300 flex items-center gap-1">
                    <QrCode className="w-4 h-4" /> QR Code Pix
                  </span>
                  <button onClick={() => setShowPixQr(false)} className="text-slate-400 hover:text-white p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-sm font-black text-emerald-400">
                  R$ {(Number(lastAppointment?.price) || 0).toFixed(2)}
                </div>

                <div className="bg-white p-3 rounded-2xl inline-block mx-auto border border-purple-400">
                  {qrCodeUrl && <img src={qrCodeUrl} alt="Pix QR" className="w-44 h-44" />}
                </div>

                <div className="text-[10px] font-mono text-purple-200 bg-slate-950 p-2 rounded-xl border border-slate-800 break-all">
                  {safeConfig.chavePix || 'marlon1soares28@gmail.com'}
                </div>

                <button
                  onClick={() => {
                    if (pixPayload) {
                      navigator.clipboard.writeText(pixPayload);
                      alert('Código Pix Copia e Cola copiado!');
                    }
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2 rounded-xl"
                >
                  Copiar Código "Copia e Cola"
                </button>
              </div>
            </div>
          )}

          {/* Repeat Booking Notice */}
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center space-y-1">
            <span className="text-[11px] font-bold text-emerald-400 flex items-center justify-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              <span>Link Permanente & Reutilizável</span>
            </span>
            <p className="text-[10px] text-slate-300 leading-tight">
              Este link é exclusivo do seu celular ({clientPhone || 'seu número'}). Salve esta página nos favoritos do seu navegador para agendar seus próximos horários no <strong>{safeConfig.nomeSalao}</strong> sempre que precisar, sem precisar solicitar um novo link!
            </p>
          </div>

          {/* WhatsApp Share Button */}
          <button
            onClick={handleShareWhatsapp}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
          >
            <Share2 className="w-4 h-4" />
            <span>Enviar Confirmação para o Salão via WhatsApp</span>
          </button>

          <button
            onClick={() => {
              setIsSuccess(false);
              setSelectedService(null);
            }}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-2xl text-xs transition-colors flex items-center justify-center gap-2"
          >
            <span>Fazer Outro Agendamento com Este Mesmo Link</span>
          </button>
        </div>
      )}

    </div>
  );
};
