import React, { useState } from 'react';
import { Appointment, SalonConfig, UserRole } from '../types';
import { DEFAULT_TIMESLOTS } from '../data/mockData';
import { getTimeSlotsForDate, getScheduleRuleForDate, DAY_NAMES_PT } from '../utils/schedule';
import { Calendar as CalendarIcon, Clock, Lock, Plus, RotateCcw, CheckCircle2, ChevronUp, ChevronDown, DollarSign, X, MessageSquare, Phone, Wifi, AlertCircle, Sparkles } from 'lucide-react';

interface AgendaViewProps {
  appointments: Record<string, Record<string, Appointment>>;
  timeAdjustments: Record<string, number>;
  config: SalonConfig;
  userRole: UserRole;
  onSaveAppointment: (date: string, timeSlot: string, ap: Appointment) => void;
  onDeleteAppointment: (date: string, timeSlot: string) => void;
  onShiftDayTime: (date: string, deltaMinutes: number) => void;
  onResetDaySchedule: (date: string) => void;
  onConvertToPOS: (ap: Appointment) => void;
  onOpenLiveHub?: () => void;
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  appointments,
  timeAdjustments,
  config,
  userRole,
  onSaveAppointment,
  onDeleteAppointment,
  onShiftDayTime,
  onResetDaySchedule,
  onConvertToPOS,
  onOpenLiveHub,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activeModal, setActiveModal] = useState<'book' | 'block' | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Form states
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [selectedProf, setSelectedProf] = useState(config.profs[0]?.nome || 'Michael');
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

  const handleOpenBookModal = (slot: string) => {
    setSelectedSlot(slot);
    setClientName('');
    setClientPhone('');
    setServiceName('');
    setPrice('80');
    setActiveModal('book');
  };

  const handleOpenBlockModal = (slot: string) => {
    setSelectedSlot(slot);
    setBlockReason('Horário de Almoço');
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

      {/* Date Selector & Day Schedule Summary */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            <span className="text-xs sm:text-sm font-bold text-slate-900">Data da Agenda:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 cursor-pointer"
            />
          </div>

          {/* Schedule indicator badge */}
          <div className="flex items-center gap-1.5">
            {dayRule.active ? (
              <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-600" />
                <span>Expediente: <strong>{dayRule.startTime} às {dayRule.endTime}</strong> ({dayRule.slotIntervalMinutes || 60}m)</span>
              </span>
            ) : (
              <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-rose-600" />
                <span>Fechado / Folga nesta data</span>
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => {
            if (confirm("Resetar todos os horários e deslocamentos deste dia?")) {
              onResetDaySchedule(selectedDate);
            }
          }}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Resetar Deslocamento (+/-)
        </button>

      </div>

      {/* Closed Day Notice */}
      {!dayRule.active && allSlots.length === 0 && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-xs space-y-1">
          <div className="font-extrabold flex items-center gap-1.5 text-rose-900 text-sm">
            <AlertCircle className="w-4 h-4 text-rose-600" /> Salão Fechado / Folga nesta data
          </div>
          <p className="text-slate-600">
            Nenhum horário está liberado para atendimento no dia <strong>{selectedDate}</strong>. Você pode alterar essa configuração ou abrir o salão a qualquer momento na aba <strong>"Configurações &gt; ⏰ Horários da Agenda"</strong>.
          </p>
        </div>
      )}

      {/* Agenda Time Slot Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="max-h-[500px] overflow-y-auto">
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
              {allSlots.map((timeBase, idx) => {
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
                        <span className="text-slate-800 font-semibold">{ap.professionalName}</span>
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
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded-md text-[11px] transition-colors flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Agendar
                            </button>
                            <button
                              onClick={() => handleOpenBlockModal(timeBase)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded-md text-[11px] transition-colors flex items-center gap-1"
                            >
                              <Lock className="w-3 h-3" /> Bloquear
                            </button>
                          </>
                        ) : status === 'agendado' ? (
                          <>
                            <button
                              onClick={() => onConvertToPOS(ap)}
                              title="Concluir atendimento e lançar no Caixa"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-md text-[11px] transition-colors flex items-center gap-1 shadow-xs"
                            >
                              <DollarSign className="w-3 h-3" /> Concluir
                            </button>
                            <button
                              onClick={() => onDeleteAppointment(selectedDate, timeBase)}
                              className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50"
                              title="Desmarcar / Cancelar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : status === 'bloqueado' ? (
                          <button
                            onClick={() => onDeleteAppointment(selectedDate, timeBase)}
                            className="text-xs text-rose-600 hover:text-rose-800 font-bold bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-md transition-colors"
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
                  <select
                    value={selectedProf}
                    onChange={(e) => setSelectedProf(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    {config.profs.map(p => (
                      <option key={p.nome} value={p.nome}>{p.nome}</option>
                    ))}
                  </select>
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
                  className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-xs"
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
                  className="flex-1 py-2 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 shadow-xs"
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
