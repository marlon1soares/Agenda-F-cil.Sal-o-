import React, { useState, useEffect } from 'react';
import { Appointment, SalonConfig, UserRole } from '../types';
import { getTimeSlotsForDate, getScheduleRuleForDate } from '../utils/schedule';
import { downloadDailyScheduleWord, printScheduleDirect, ScheduleItemExport } from '../utils/exportWord';
import { getUrlParam } from '../utils/url';
import { 
  Calendar as CalendarIcon, Clock, Lock, Plus, RotateCcw, CheckCircle2, ChevronUp, 
  ChevronDown, DollarSign, X, MessageSquare, Phone, AlertCircle,
  Download, Printer, Users, User, Settings
} from 'lucide-react';

interface AgendaViewProps {
  appointments: Record<string, Record<string, Appointment>>;
  timeAdjustments: Record<string, number>;
  config: SalonConfig;
  userRole: UserRole;
  employeeName?: string;
  initialProfFilter?: string;
  onSaveAppointment: (date: string, timeSlot: string, ap: Appointment) => void;
  onDeleteAppointment: (date: string, timeSlot: string) => void;
  onShiftDayTime: (date: string, deltaMinutes: number) => void;
  onResetDaySchedule: (date: string) => void;
  onConvertToPOS: (ap: Appointment) => void;
  onOpenLiveHub?: () => void;
  onOpenConfig?: () => void;
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  appointments,
  timeAdjustments,
  config,
  userRole,
  employeeName,
  initialProfFilter,
  onSaveAppointment,
  onDeleteAppointment,
  onShiftDayTime,
  onResetDaySchedule,
  onConvertToPOS,
  onOpenLiveHub,
  onOpenConfig,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activeModal, setActiveModal] = useState<'book' | 'block' | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const isFuncionario = userRole === 'funcionario';
  const effectiveEmployee = employeeName || config.profs[0]?.nome || 'Funcionário';

  // Professional filter state
  const [selectedProfFilter, setSelectedProfFilter] = useState<string>(() => {
    if (isFuncionario) return effectiveEmployee;
    try {
      const p = getUrlParam('prof');
      if (p) return p;
    } catch {}
    if (employeeName) return employeeName;
    return initialProfFilter || 'todos';
  });

  useEffect(() => {
    if (isFuncionario) {
      setSelectedProfFilter(effectiveEmployee);
    } else if (employeeName) {
      setSelectedProfFilter(employeeName);
    } else if (initialProfFilter) {
      setSelectedProfFilter(initialProfFilter);
    }
  }, [isFuncionario, effectiveEmployee, employeeName, initialProfFilter]);

  // Form states
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [selectedProf, setSelectedProf] = useState(isFuncionario ? effectiveEmployee : (config.profs[0]?.nome || 'Michael'));
  const [price, setPrice] = useState('80');
  const [blockReason, setBlockReason] = useState('Horário de Almoço');

  const currentDayAppointments = appointments[selectedDate] || {};
  const currentDayShift = timeAdjustments[selectedDate] || 0;

  // Compute active slots and day rule for selected date
  const dayRule = getScheduleRuleForDate(selectedDate, config.scheduleConfig);
  const generatedSlots = getTimeSlotsForDate(selectedDate, config.scheduleConfig);

  // Combine with any slots that have existing appointments recorded (so past bookings are never hidden)
  const bookedSlots = Object.keys(currentDayAppointments);
  const allSlots = Array.from(new Set([...generatedSlots, ...bookedSlots])).sort();

  // Filter slots strictly if employee or specific professional is selected
  const displaySlots = allSlots.filter(timeBase => {
    const ap = currentDayAppointments[timeBase];
    if (isFuncionario) {
      if (!ap) return true; // free slots are available for booking
      // Strictly show only appointments belonging to this employee
      return !ap.professionalName || ap.professionalName.toLowerCase() === effectiveEmployee.toLowerCase() || ap.professionalName === 'Todos';
    }
    if (selectedProfFilter === 'todos') return true;
    if (!ap) return true; // free slots are available
    return !ap.professionalName || ap.professionalName === selectedProfFilter || ap.professionalName === 'Todos';
  });

  const handleOpenBookModal = (slot: string) => {
    setSelectedSlot(slot);
    setClientName('');
    setClientPhone('');
    setServiceName('');
    setSelectedProf(isFuncionario ? effectiveEmployee : (selectedProfFilter !== 'todos' ? selectedProfFilter : config.profs[0]?.nome || ''));
    setPrice('80');
    setActiveModal('book');
  };

  const handleOpenBlockModal = (slot: string) => {
    setSelectedSlot(slot);
    setBlockReason('Horário de Almoço');
    setSelectedProf(isFuncionario ? effectiveEmployee : (selectedProfFilter !== 'todos' ? selectedProfFilter : config.profs[0]?.nome || ''));
    setActiveModal('block');
  };

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !clientName.trim() || !serviceName.trim()) {
      alert("Por favor, informe o nome do cliente e o serviço.");
      return;
    }

    const newAp: Appointment = {
      id: `ap-${Date.now()}`,
      date: selectedDate,
      timeSlot: selectedSlot,
      status: 'agendado',
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      serviceName: serviceName.trim(),
      professionalName: selectedProf,
      price: parseFloat(price) || 0,
      origem: userRole
    };

    onSaveAppointment(selectedDate, selectedSlot, newAp);
    setActiveModal(null);
  };

  const handleConfirmBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    const newAp: Appointment = {
      id: `ap-${Date.now()}`,
      date: selectedDate,
      timeSlot: selectedSlot,
      status: 'bloqueado',
      notes: blockReason.trim() || 'Bloqueado',
      professionalName: selectedProf || 'Todos',
      origem: userRole
    };

    onSaveAppointment(selectedDate, selectedSlot, newAp);
    setActiveModal(null);
  };

  // Export handlers for current view
  const getExportItems = (): ScheduleItemExport[] => {
    return displaySlots.map(time => {
      const ap = currentDayAppointments[time];
      if (ap) {
        return {
          time,
          clientName: ap.clientName || (ap.status === 'bloqueado' ? (ap.notes || 'Horário Bloqueado') : '-'),
          clientPhone: ap.clientPhone,
          serviceName: ap.serviceName || (ap.status === 'bloqueado' ? 'Bloqueio' : '-'),
          price: ap.price,
          status: ap.status,
          notes: ap.notes
        };
      }
      return {
        time,
        clientName: 'Livre',
        serviceName: '-',
        status: 'livre'
      };
    });
  };

  const handleDownloadWord = () => {
    const profLabel = selectedProfFilter === 'todos' ? 'Geral Salão' : selectedProfFilter;
    const items = getExportItems();
    downloadDailyScheduleWord(config.nomeSalao || 'Salão', profLabel, selectedDate, items);
  };

  const handlePrint = () => {
    const profLabel = selectedProfFilter === 'todos' ? 'Geral Salão' : selectedProfFilter;
    const items = getExportItems();
    printScheduleDirect(config.nomeSalao || 'Salão', profLabel, selectedDate, items);
  };

  return (
    <div className="space-y-4">
      
      {/* Real-time sync status ribbon */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <div className="text-xs">
            <span className="font-bold text-white">Sincronização em Tempo Real: </span>
            <span className="text-emerald-400 font-medium">Conectado com Clientes e Administrador</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenLiveHub && (
            <button
              onClick={onOpenLiveHub}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat / Mural de Avisos</span>
            </button>
          )}
        </div>
      </div>

      {/* Personalized Employee Hero Bar when accessed by employee */}
      {userRole === 'funcionario' && (
        <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-teal-950 border border-teal-500/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center justify-center font-black text-base shrink-0 shadow-inner">
              {employeeName ? employeeName.charAt(0).toUpperCase() : '👤'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-white text-sm sm:text-base">
                  {employeeName ? `Agenda de: ${employeeName}` : 'Sua Agenda de Atendimentos'}
                </span>
                <span className="bg-teal-900/90 text-teal-300 border border-teal-500/40 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {employeeName ? `Profissional: ${employeeName}` : 'Equipe do Salão'}
                </span>
              </div>
              <p className="text-teal-200/90 text-[11px] mt-0.5">
                {employeeName 
                  ? `Visualizando exclusivamente seus horários marcados, livres e bloqueados para ${selectedDate.split('-').reverse().join('/')}.`
                  : 'Visualizando horários e clientes agendados em tempo real.'
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <span className="text-[11px] font-bold text-teal-300 bg-teal-950/80 px-3 py-1 rounded-xl border border-teal-500/30">
              ⚡ Agenda Individual Conectada
            </span>
          </div>
        </div>
      )}

      {/* Date Selector, Professional Filter & Export Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
        
        {/* Left: Date & Working Hours */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start bg-slate-50 sm:bg-transparent p-2 sm:p-0 rounded-xl sm:rounded-none border sm:border-0 border-slate-200">
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-slate-900">Data:</span>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 bg-white sm:bg-slate-50 cursor-pointer font-mono"
            />
          </div>

          {/* Schedule indicator badge */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {dayRule.active ? (
              <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                <span>Expediente: <strong>{dayRule.startTime} às {dayRule.endTime}</strong> ({dayRule.slotIntervalMinutes || 60}m)</span>
              </span>
            ) : (
              <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                <span>Fechado / Folga nesta data</span>
              </span>
            )}
            {onOpenConfig && (userRole === 'salao' || userRole === 'admin') && (
              <button
                type="button"
                onClick={onOpenConfig}
                className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-2xs active:scale-98"
                title="Configurar horários de expediente e funcionamento deste salão"
              >
                <Settings className="w-3 h-3 text-amber-700" />
                <span>Alterar Horários</span>
              </button>
            )}
          </div>

          {/* Professional Selector Filter */}
          {isFuncionario ? (
            <div className="flex items-center gap-2 bg-gradient-to-r from-teal-950 via-teal-900 to-emerald-950 p-1.5 px-3 rounded-xl border border-teal-500/50 shadow-xs">
              <User className="w-4 h-4 text-teal-400 shrink-0" />
              <span className="text-xs font-bold text-teal-300">Sua Agenda:</span>
              <strong className="text-xs font-black text-white uppercase tracking-wide truncate max-w-[140px]">
                {effectiveEmployee}
              </strong>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5 shrink-0" title="Acesso individual exclusivo" />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4 text-blue-600 ml-1 shrink-0" />
                <span className="text-xs font-bold text-slate-700">Agenda:</span>
              </div>
              <select
                value={selectedProfFilter}
                onChange={(e) => setSelectedProfFilter(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 font-bold text-xs px-2.5 py-1 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer flex-1 sm:flex-initial"
              >
                <option value="todos">👥 Todos os Funcionários</option>
                {config.profs.map(p => (
                  <option key={p.nome} value={p.nome}>👤 {p.nome}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right: Word (.doc) Download & Print Actions */}
        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-between sm:justify-start">
          <button
            type="button"
            onClick={handleDownloadWord}
            className="flex-1 sm:flex-initial px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            title="Baixar lista de clientes e horários em Word (.doc)"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Baixar Word (.doc)</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            title="Imprimir escala do dia"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>

          <button
            onClick={() => {
              if (confirm("Resetar todos os horários e deslocamentos deste dia?")) {
                onResetDaySchedule(selectedDate);
              }
            }}
            className="text-xs font-bold text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            title="Zerar deslocamento de minutos (+/-)"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="sm:hidden text-[10px]">Resetar</span>
          </button>
        </div>

      </div>

      {/* Closed Day Notice */}
      {!dayRule.active && displaySlots.length === 0 && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-xs space-y-1">
          <div className="font-extrabold flex items-center gap-1.5 text-rose-900 text-sm">
            <AlertCircle className="w-4 h-4 text-rose-600" /> Salão Fechado / Folga nesta data
          </div>
          <p className="text-slate-600">
            Nenhum horário está liberado para atendimento no dia <strong>{selectedDate}</strong>. Você pode alterar essa configuração ou abrir o salão a qualquer momento na aba <strong>"Configurações &gt; ⏰ Horários da Agenda"</strong>.
          </p>
        </div>
      )}

      {/* MOBILE ADAPTIVE VIEW (CARD-BASED - PERFECT ON PHONES WITHOUT HORIZONTAL SCROLL) */}
      <div className="block sm:hidden space-y-2.5">
        {displaySlots.map((timeBase) => {
          // Calculate time shift
          const [hbH, hbM] = timeBase.split(':').map(Number);
          const totalMins = hbH * 60 + hbM + currentDayShift;
          const shiftedH = Math.floor(totalMins / 60).toString().padStart(2, '0');
          const shiftedM = (totalMins % 60).toString().padStart(2, '0');
          const displayTime = `${shiftedH}:${shiftedM}`;

          const ap = currentDayAppointments[timeBase];
          const status = ap?.status || 'livre';

          return (
            <div
              key={`mob-${timeBase}`}
              className={`p-3.5 rounded-2xl border transition-all shadow-xs space-y-2.5 ${
                status === 'livre'
                  ? 'bg-white border-slate-200'
                  : status === 'agendado'
                  ? 'bg-sky-50/70 border-sky-200'
                  : status === 'concluido'
                  ? 'bg-purple-50/70 border-purple-200'
                  : 'bg-rose-50/70 border-rose-200'
              }`}
            >
              {/* Header: Time, Time-Shift Buttons & Status Badge */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="bg-slate-900 text-white font-mono font-black text-xs px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-xs">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    <span>{displayTime}</span>
                  </div>

                  {/* Quick Shift Minute Arrows */}
                  <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      onClick={() => onShiftDayTime(selectedDate, 15)}
                      title="+15 minutos no dia"
                      className="p-1 hover:bg-white text-slate-700 rounded transition-colors text-[10px] font-bold"
                    >
                      +15m
                    </button>
                    <button
                      onClick={() => onShiftDayTime(selectedDate, -15)}
                      title="-15 minutos no dia"
                      className="p-1 hover:bg-white text-slate-700 rounded transition-colors text-[10px] font-bold"
                    >
                      -15m
                    </button>
                  </div>
                </div>

                <div>
                  {status === 'livre' && (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-300">
                      LIVRE ✓
                    </span>
                  )}
                  {status === 'agendado' && (
                    <span className="bg-sky-100 text-sky-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-sky-300">
                      AGENDADO
                    </span>
                  )}
                  {status === 'concluido' && (
                    <span className="bg-purple-100 text-purple-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-purple-300">
                      CONCLUÍDO
                    </span>
                  )}
                  {status === 'bloqueado' && (
                    <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-rose-300">
                      BLOQUEADO
                    </span>
                  )}
                </div>
              </div>

              {/* Slot Details (Client, Service, Professional) */}
              {status === 'agendado' || status === 'concluido' ? (
                <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-black text-slate-900 flex items-center gap-1.5">
                        <span>{ap?.clientName}</span>
                        {ap?.origem === 'cliente' && (
                          <span className="bg-sky-100 text-sky-700 text-[9px] font-black px-1.5 py-0.2 rounded border border-sky-300">
                            Portal
                          </span>
                        )}
                      </div>
                      {ap?.clientPhone && (
                        <span className="text-[11px] text-slate-500 font-mono block mt-0.5">{ap.clientPhone}</span>
                      )}
                    </div>

                    {ap?.clientPhone && (
                      <a
                        href={`https://wa.me/55${ap.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${ap.clientName}! Confirmando seu horário no ${config.nomeSalao} às ${displayTime}.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs shrink-0"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Zap</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px]">
                    <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-bold truncate max-w-[140px]">
                      ✂️ {ap?.serviceName || 'Serviço'}
                    </span>
                    <span className="text-slate-600 font-bold truncate max-w-[130px]">
                      👤 {ap?.professionalName || 'Profissional'}
                    </span>
                  </div>
                </div>
              ) : status === 'bloqueado' ? (
                <div className="bg-rose-100/60 p-2.5 rounded-xl border border-rose-200 text-xs">
                  <span className="text-rose-800 font-bold italic">
                    🔒 Motivo do Bloqueio: {ap?.notes || 'Horário Bloqueado'}
                  </span>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 italic">
                  Horário vago disponível para agendamento presencial ou online.
                </div>
              )}

              {/* Action Buttons on Mobile */}
              <div className="flex items-center gap-2 pt-1">
                {status === 'livre' ? (
                  <>
                    <button
                      onClick={() => handleOpenBookModal(timeBase)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agendar</span>
                    </button>
                    <button
                      onClick={() => handleOpenBlockModal(timeBase)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 border border-slate-300 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Bloquear</span>
                    </button>
                  </>
                ) : status === 'agendado' ? (
                  <>
                    <button
                      onClick={() => onConvertToPOS(ap)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Concluir no Caixa</span>
                    </button>
                    <button
                      onClick={() => onDeleteAppointment(selectedDate, timeBase)}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 border border-rose-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cancelar</span>
                    </button>
                  </>
                ) : status === 'bloqueado' ? (
                  <button
                    onClick={() => onDeleteAppointment(selectedDate, timeBase)}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Desbloquear Horário</span>
                  </button>
                ) : (
                  <div className="w-full text-center text-xs font-bold text-purple-700 py-1 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-purple-600" />
                    <span>Atendimento Concluído com Sucesso</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* TABLE VIEW FOR TABLET & DESKTOP (WITH SMOOTH SCROLL) */}
      <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="max-h-[550px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead 
              style={{ backgroundColor: config.corCustom || '#2563eb' }}
              className="text-white sticky top-0 z-10 font-bold"
            >
              <tr>
                <th className="p-3 text-center w-36">Horário</th>
                <th className="p-3 text-center w-28">Status</th>
                <th className="p-3">Cliente / Motivo</th>
                <th className="p-3">Serviço</th>
                <th className="p-3">Profissional</th>
                <th className="p-3 text-center w-48">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {displaySlots.map((timeBase, idx) => {
                // Calculate time shift
                const [hbH, hbM] = timeBase.split(':').map(Number);
                const totalMins = hbH * 60 + hbM + currentDayShift;
                const shiftedH = Math.floor(totalMins / 60).toString().padStart(2, '0');
                const shiftedM = (totalMins % 60).toString().padStart(2, '0');
                const displayTime = `${shiftedH}:${shiftedM}`;

                const ap = currentDayAppointments[timeBase];
                const status = ap?.status || 'livre';

                return (
                  <tr key={timeBase} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                    
                    {/* Time & Shift controls */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm font-mono flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-blue-600" /> {displayTime}
                        </span>

                        <div className="flex flex-col gap-0.5 bg-slate-100 p-0.5 rounded border border-slate-200">
                          <button
                            onClick={() => onShiftDayTime(selectedDate, 15)}
                            title="+15 minutos no dia"
                            className="p-0.5 hover:bg-white text-slate-700 rounded transition-colors"
                          >
                            <ChevronUp className="w-2.5 h-2.5" />
                          </button>
                          <button
                            onClick={() => onShiftDayTime(selectedDate, -15)}
                            title="-15 minutos no dia"
                            className="p-0.5 hover:bg-white text-slate-700 rounded transition-colors"
                          >
                            <ChevronDown className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="p-3 text-center">
                      {status === 'livre' && (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-md">
                          LIVRE
                        </span>
                      )}
                      {status === 'agendado' && (
                        <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-2.5 py-1 rounded-md">
                          AGENDADO
                        </span>
                      )}
                      {status === 'concluido' && (
                        <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2.5 py-1 rounded-md">
                          CONCLUÍDO
                        </span>
                      )}
                      {status === 'bloqueado' && (
                        <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-1 rounded-md">
                          BLOQUEADO
                        </span>
                      )}
                    </td>

                    {/* Client / Reason */}
                    <td className="p-3 font-semibold">
                      {status === 'agendado' || status === 'concluido' ? (
                        <div className="space-y-1">
                          <div className="text-slate-900 font-bold flex items-center gap-1.5">
                            <span>{ap?.clientName}</span>
                            {ap?.origem === 'cliente' && (
                              <span className="bg-sky-100 text-sky-700 text-[9px] font-black px-1.5 py-0.2 rounded border border-sky-300">
                                Via Portal
                              </span>
                            )}
                          </div>
                          {ap?.clientPhone && (
                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                              <span>{ap.clientPhone}</span>
                              <a
                                href={`https://wa.me/55${ap.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${ap.clientName}! Confirmando seu horário no ${config.nomeSalao} às ${displayTime}.`)}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Enviar mensagem no WhatsApp para o cliente"
                                className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-0.5"
                              >
                                <Phone className="w-2.5 h-2.5" /> Zap
                              </a>
                            </div>
                          )}
                        </div>
                      ) : status === 'bloqueado' ? (
                        <span className="text-rose-600 italic font-semibold">{ap?.notes || 'Horário Bloqueado'}</span>
                      ) : (
                        <span className="text-slate-400 font-normal">-</span>
                      )}
                    </td>

                    {/* Service */}
                    <td className="p-3">
                      {ap?.serviceName ? (
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-semibold">
                          {ap.serviceName}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Professional */}
                    <td className="p-3">
                      {ap?.professionalName ? (
                        <span className="text-slate-800 font-bold bg-slate-100 px-2 py-0.5 rounded">
                          {ap.professionalName}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {status === 'livre' ? (
                          <>
                            <button
                              onClick={() => handleOpenBookModal(timeBase)}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded-md text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" /> Agendar
                            </button>
                            <button
                              onClick={() => handleOpenBlockModal(timeBase)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded-md text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Lock className="w-3 h-3" /> Bloquear
                            </button>
                          </>
                        ) : status === 'agendado' ? (
                          <>
                            <button
                              onClick={() => onConvertToPOS(ap)}
                              title="Concluir atendimento e lançar no Caixa"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-md text-[11px] transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <DollarSign className="w-3 h-3" /> Concluir
                            </button>
                            <button
                              onClick={() => onDeleteAppointment(selectedDate, timeBase)}
                              className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 cursor-pointer"
                              title="Desmarcar / Cancelar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : status === 'bloqueado' ? (
                          <button
                            onClick={() => onDeleteAppointment(selectedDate, timeBase)}
                            className="text-xs text-rose-600 hover:text-rose-800 font-bold bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                          >
                            Desbloquear
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 justify-center">
                            <CheckCircle2 className="w-3 h-3 text-purple-600" /> Finalizado
                          </span>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Book Modal */}
      {activeModal === 'book' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 text-slate-800">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center justify-between">
              <span>Novo Agendamento ({selectedSlot})</span>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </h3>

            <form onSubmit={handleConfirmBooking} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome do Cliente:</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Carlos Silva"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">WhatsApp / Telefone:</label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(11) 99999-8888"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Serviço:</label>
                <input
                  type="text"
                  required
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="Ex: Corte Masculino + Barba"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Profissional:</label>
                  {isFuncionario ? (
                    <input
                      type="text"
                      disabled
                      value={effectiveEmployee}
                      className="w-full px-3 py-2 border border-teal-300 bg-teal-50 text-teal-950 rounded-lg font-black text-xs cursor-not-allowed"
                    />
                  ) : (
                    <select
                      value={selectedProf}
                      onChange={(e) => setSelectedProf(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      {config.profs.map(p => (
                        <option key={p.nome} value={p.nome}>{p.nome}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Valor Previsto (R$):</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-xs cursor-pointer"
                >
                  Confirmar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Block Modal */}
      {activeModal === 'block' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 text-slate-800">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center justify-between">
              <span>Bloquear Horário ({selectedSlot})</span>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </h3>

            <form onSubmit={handleConfirmBlock} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Motivo do Bloqueio:</label>
                <input
                  type="text"
                  required
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Ex: Horário de Almoço, Reunião..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 shadow-xs cursor-pointer"
                >
                  Bloquear Horário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
