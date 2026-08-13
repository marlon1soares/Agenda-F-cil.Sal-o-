import React, { useState } from 'react';
import { Appointment, SalonConfig, UserRole } from '../types';
import { DEFAULT_TIMESLOTS } from '../data/mockData';
import { Calendar as CalendarIcon, Clock, Lock, Plus, RotateCcw, CheckCircle2, ChevronUp, ChevronDown, DollarSign, X } from 'lucide-react';

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
    <div className="space-y-6">
      
      {/* Date Selector & Day Schedule Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-blue-600" />
          <span className="text-xs sm:text-sm font-bold text-slate-900">Visão Geral da Agenda:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 cursor-pointer"
          />
        </div>

        <button
          onClick={() => {
            if (confirm("Resetar todos os horários e deslocamentos deste dia?")) {
              onResetDaySchedule(selectedDate);
            }
          }}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Resetar Horários Padrão
        </button>

      </div>

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
              {DEFAULT_TIMESLOTS.map((timeBase, idx) => {
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
                        <div>
                          <div className="text-slate-900 font-bold">{ap?.clientName}</div>
                          {ap?.clientPhone && <div className="text-[10px] text-slate-500">{ap.clientPhone}</div>}
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
                        <span className="text-slate-400 font-normal">-</span>
                      )}
                    </td>

                    {/* Professional */}
                    <td className="p-3 font-medium">
                      {ap?.professionalName || '-'}
                    </td>

                    {/* Action buttons */}
                    <td className="p-3 text-center">
                      {status === 'livre' ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenBookModal(timeBase)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] px-2.5 py-1 rounded-md transition-colors flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Agendar
                          </button>
                          <button
                            onClick={() => handleOpenBlockModal(timeBase)}
                            className="bg-slate-600 hover:bg-slate-700 text-white font-bold text-[11px] px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                          >
                            <Lock className="w-3 h-3" /> Bloquear
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          {status === 'agendado' && (
                            <button
                              onClick={() => onConvertToPOS(ap)}
                              title="Concluir serviço e lançar automaticamente no Caixa"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-2.5 py-1 rounded-md transition-colors flex items-center gap-1"
                            >
                              <DollarSign className="w-3 h-3" /> Lançar Caixa
                            </button>
                          )}
                          <button
                            onClick={() => onDeleteAppointment(selectedDate, timeBase)}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] px-2.5 py-1 rounded-md transition-colors"
                          >
                            Desocupar
                          </button>
                        </div>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* BOOKING MODAL */}
      {activeModal === 'book' && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-600" /> Agendar Atendimento ({selectedSlot})
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmBooking} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome do Cliente *
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: João Silva"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="Ex: (11) 98888-7777"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Serviço / Procedimento *
                </label>
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="Ex: Corte Masculino + Barba"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Profissional
                  </label>
                  <select
                    value={selectedProf}
                    onChange={(e) => setSelectedProf(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white"
                  >
                    {config.profs.map(p => (
                      <option key={p.nome} value={p.nome}>{p.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Valor Estimado (R$)
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="80"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl transition-colors shadow-sm mt-2"
              >
                Confirmar Agendamento
              </button>
            </form>
          </div>
        </div>
      )}

      {/* BLOCK MODAL */}
      {activeModal === 'block' && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-rose-600" /> Bloquear Horário ({selectedSlot})
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmBlock} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Motivo do Bloqueio
                </label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Ex: Horário de Almoço, Manutenção"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-3 rounded-xl transition-colors shadow-sm"
              >
                Confirmar Bloqueio
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
