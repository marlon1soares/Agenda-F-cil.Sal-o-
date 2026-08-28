import React, { useState, useEffect, useMemo } from 'react';
import { Professional, Transaction, Appointment, SalonConfig, EmployeeFechamentoRecord, FechamentoPeriodType, UserRole } from '../types';
import { Storage, getSalonSlug } from '../utils/storage';
import { DEFAULT_PROFESSIONALS } from '../data/mockData';
import { getPublicAppUrl, buildAppUrl } from '../utils/url';
import { getTimeSlotsForDate, getScheduleRuleForDate } from '../utils/schedule';
import { downloadDailyScheduleWord, downloadFechamentoWord, printScheduleDirect, ScheduleItemExport, FechamentoItemExport } from '../utils/exportWord';
import QRCode from 'qrcode';
import { 
  Users, Plus, Trash2, Phone, Percent, UserCheck, Link2, Share2, Sparkles, 
  Scissors, Calendar, Clock, DollarSign, Download, Printer, MessageSquare, 
  CheckCircle2, FileText, ChevronRight, X, QrCode, ExternalLink, Copy, Check,
  AlertCircle, ChevronDown, Filter, ArrowUpRight, TrendingUp, ShieldCheck, User
} from 'lucide-react';

interface MeusFuncionariosViewProps {
  professionals: Professional[];
  transactions: Transaction[];
  appointments: Record<string, Record<string, Appointment>>;
  config: SalonConfig;
  userRole?: UserRole;
  employeeName?: string;
  activeSalonSlug?: string;
  onSaveProfessionals: (profs: Professional[]) => void;
  onOpenEmployeeLink?: () => void;
  onOpenSpecificEmployeeAgenda?: (profName: string) => void;
}

export const MeusFuncionariosView: React.FC<MeusFuncionariosViewProps> = ({
  professionals = [],
  transactions = [],
  appointments = {},
  config,
  userRole = 'salao',
  employeeName,
  activeSalonSlug,
  onSaveProfessionals,
  onOpenEmployeeLink,
  onOpenSpecificEmployeeAgenda,
}) => {
  const isEmployee = userRole === 'funcionario';
  const isSalonAdmin = userRole === 'salao' || userRole === 'admin';

  // Normalize incoming professionals
  const normalizeProfs = (profsList: any[]): Professional[] => {
    if (!Array.isArray(profsList) || profsList.length === 0) {
      return DEFAULT_PROFESSIONALS;
    }
    return profsList.map((p: any, idx: number) => ({
      id: p?.id || `prof-${idx + 1}`,
      name: p?.name || p?.nome || `Profissional ${idx + 1}`,
      role: p?.role || 'Cabeleireiro(a)',
      commissionPercent: typeof p?.commissionPercent === 'number' ? p.commissionPercent : (typeof p?.porc === 'number' ? p.porc : 50),
      phone: p?.phone || '',
      cpf: p?.cpf || undefined,
      active: p?.active !== false
    }));
  };

  const [editingProfs, setEditingProfs] = useState<Professional[]>(() => normalizeProfs(professionals));
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Selected employee for detailed Day Agenda or Fechamento inspection
  const [selectedProfForAgenda, setSelectedProfForAgenda] = useState<Professional | null>(null);
  const [selectedProfForFechamento, setSelectedProfForFechamento] = useState<Professional | null>(null);
  
  // Day Agenda Inspection State
  const [agendaDate, setAgendaDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  
  // Fechamento Inspection State
  const [fechamentoPeriod, setFechamentoPeriod] = useState<FechamentoPeriodType>('mensal');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [fechamentoMonth, setFechamentoMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [savedFechamentos, setSavedFechamentos] = useState<EmployeeFechamentoRecord[]>([]);
  const [fechamentoSuccessMsg, setFechamentoSuccessMsg] = useState<string | null>(null);

  // Link & QR modal state for specific employee
  const [qrModalProf, setQrModalProf] = useState<Professional | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copiedProfId, setCopiedProfId] = useState<string | null>(null);

  // Form states for new employee
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Cabeleireiro(a)');
  const [newCommission, setNewCommission] = useState('50');
  const [newPhone, setNewPhone] = useState('');
  const [newCpf, setNewCpf] = useState('');

  useEffect(() => {
    if (professionals && Array.isArray(professionals)) {
      setEditingProfs(normalizeProfs(professionals));
    }
    try {
      setSavedFechamentos(Storage.getFechamentos() || []);
    } catch (e) {
      console.error("Error loading fechamentos:", e);
    }
  }, [professionals]);

  const salonSlug = activeSalonSlug || getSalonSlug(config?.nomeSalao || 'salao');

  // If employee role, strictly show ONLY this employee's card and information
  const displayedProfs = useMemo(() => {
    if (isEmployee) {
      const targetName = (employeeName || '').toLowerCase().trim();
      if (targetName) {
        const match = editingProfs.filter(p => (p.name || '').toLowerCase().trim() === targetName);
        if (match.length > 0) return match;
      }
      return editingProfs.slice(0, 1);
    }
    return editingProfs;
  }, [isEmployee, employeeName, editingProfs]);

  // Compute stats for each professional across all appointments and transactions
  const profsStats = useMemo(() => {
    const statsMap: Record<string, { daysWorked: Set<string>; clientsServed: number; totalGross: number; totalCommission: number }> = {};

    editingProfs.forEach((p, idx) => {
      const profName = p?.name || `Profissional ${idx + 1}`;
      statsMap[profName] = {
        daysWorked: new Set<string>(),
        clientsServed: 0,
        totalGross: 0,
        totalCommission: 0,
      };
    });

    // 1. Scan transactions (POS Completed)
    (transactions || []).forEach(t => {
      if (t && t.commissions && Array.isArray(t.commissions)) {
        t.commissions.forEach(c => {
          if (!c || !c.professionalName) return;
          const profEntry = statsMap[c.professionalName];
          if (profEntry) {
            if (t.date) profEntry.daysWorked.add(t.date);
            profEntry.clientsServed += 1;
            profEntry.totalGross += (Number(t.grossAmount) || 0);
            profEntry.totalCommission += (Number(c.amount) || 0);
          }
        });
      }
    });

    // 2. Scan appointments (Booked or completed appointments)
    if (appointments && typeof appointments === 'object') {
      Object.entries(appointments).forEach(([date, daySlots]) => {
        if (daySlots && typeof daySlots === 'object') {
          Object.values(daySlots).forEach((ap: any) => {
            if (ap && ap.professionalName && statsMap[ap.professionalName]) {
              if (ap.status === 'agendado' || ap.status === 'concluido') {
                statsMap[ap.professionalName].daysWorked.add(date);
              }
            }
          });
        }
      });
    }

    return statsMap;
  }, [editingProfs, transactions, appointments]);

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
    if (confirm("Deseja realmente remover este profissional da equipe?")) {
      const updated = editingProfs.filter(p => p.id !== id);
      setEditingProfs(updated);
      onSaveProfessionals(updated);
    }
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
      cpf: newCpf.trim() || undefined,
      active: true
    };

    const updated = [...editingProfs, newProf];
    setEditingProfs(updated);
    onSaveProfessionals(updated);

    setNewName('');
    setNewRole('Cabeleireiro(a)');
    setNewCommission('50');
    setNewPhone('');
    setNewCpf('');
    setShowAddModal(false);
  };

  // Helper to build individual employee agenda link
  const getProfAgendaUrl = (profName: string) => {
    const safeName = profName || 'Equipe';
    const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : getPublicAppUrl();
    return buildAppUrl({
      role: 'funcionario',
      salon: salonSlug,
      prof: safeName
    }, baseUrl);
  };

  const handleCopyProfLink = (profName: string, profId: string) => {
    const url = getProfAgendaUrl(profName);
    navigator.clipboard.writeText(url);
    setCopiedProfId(profId);
    setTimeout(() => setCopiedProfId(null), 3000);
  };

  const handleOpenProfQr = async (prof: Professional) => {
    setQrModalProf(prof);
    try {
      const url = getProfAgendaUrl(prof.name);
      const dataUrl = await QRCode.toDataURL(url, {
        width: 320,
        margin: 2,
        color: { dark: '#042f2e', light: '#ffffff' }
      });
      setQrCodeUrl(dataUrl);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendProfLinkWhatsapp = (prof: Professional) => {
    const safeProfName = prof?.name || 'Profissional';
    const url = getProfAgendaUrl(safeProfName);
    const msg = `Olá, *${safeProfName}*! 💈✂️\n\n` +
      `Aqui está o seu *Link Exclusivo de Acesso à sua Agenda* no *${config?.nomeSalao || 'Salão'}*:\n\n` +
      `👉 ${url}\n\n` +
      `Abra o link para visualizar seus horários, clientes agendados, catálogo de serviços e equipe em tempo real!\n\n` +
      `💡 *Dica:* Salve este link nos seus favoritos do celular ou fixado no WhatsApp para acessar rapidamente. ✨`;
    
    const phone = prof.phone ? prof.phone.replace(/\D/g, '') : '';
    const encoded = encodeURIComponent(msg);
    if (phone.length >= 10) {
      window.open(`https://api.whatsapp.com/send?phone=55${phone}&text=${encoded}`, '_blank');
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    }
  };

  // -------------------------------------------------------------
  // DAY AGENDA INSPECTION CALCULATION
  // -------------------------------------------------------------
  const getProfDayScheduleItems = (profName: string, dateStr?: string): ScheduleItemExport[] => {
    const targetDate = dateStr || agendaDate || new Date().toISOString().split('T')[0];
    const generatedSlots = getTimeSlotsForDate(targetDate, config?.scheduleConfig);
    const dayAppointments = (appointments && appointments[targetDate]) ? appointments[targetDate] : {};
    const bookedSlots = Object.keys(dayAppointments || {});
    const allSlots = Array.from(new Set([...(generatedSlots || []), ...bookedSlots])).sort();

    const items: ScheduleItemExport[] = [];

    allSlots.forEach(time => {
      const ap = dayAppointments[time];
      if (ap) {
        // Only include if matches this prof or if "Todos"
        if (!ap.professionalName || ap.professionalName === profName || ap.professionalName === 'Todos') {
          items.push({
            time,
            clientName: ap.clientName || (ap.status === 'bloqueado' ? (ap.notes || 'Horário Bloqueado') : '-'),
            clientPhone: ap.clientPhone || '',
            serviceName: ap.serviceName || (ap.status === 'bloqueado' ? 'Bloqueio' : '-'),
            price: Number(ap.price) || 0,
            status: ap.status || 'agendado',
            notes: ap.notes || ''
          });
        }
      } else {
        // Free slot
        items.push({
          time,
          clientName: 'Livre',
          serviceName: '-',
          status: 'livre'
        });
      }
    });

    return items;
  };

  const handleDownloadProfDayWord = (profName: string, dateStr: string) => {
    const items = getProfDayScheduleItems(profName, dateStr);
    downloadDailyScheduleWord(config?.nomeSalao || 'Salão', profName, dateStr, items);
  };

  const handlePrintProfDay = (profName: string, dateStr: string) => {
    const items = getProfDayScheduleItems(profName, dateStr);
    printScheduleDirect(config?.nomeSalao || 'Salão', profName, dateStr, items);
  };

  const handleSendDayScheduleWhatsApp = (prof: Professional, dateStr: string) => {
    const profName = prof?.name || 'Profissional';
    const items = getProfDayScheduleItems(profName, dateStr);
    const bookedItems = items.filter(i => i.status === 'agendado' || i.status === 'concluido');
    const [y, m, d] = (dateStr || '').split('-');
    const formattedDate = (d && m && y) ? `${d}/${m}/${y}` : dateStr;

    let msg = `📅 *AGENDA DO DIA (${formattedDate})* • *${config?.nomeSalao || 'Salão'}*\n` +
      `👤 Profissional: *${profName}*\n` +
      `✂️ Total de Clientes Agendados: *${bookedItems.length}*\n\n` +
      `─────────────────────────\n`;

    if (bookedItems.length === 0) {
      msg += `Nenhum cliente agendado até o momento para esta data.\n`;
    } else {
      bookedItems.forEach(i => {
        msg += `⏰ *${i.time}* — ${i.clientName}\n`;
        msg += `   ✂️ Serviço: ${i.serviceName}\n`;
        if (i.clientPhone) msg += `   📞 Tel: ${i.clientPhone}\n`;
        if (i.price) msg += `   💰 Valor: R$ ${(Number(i.price) || 0).toFixed(2).replace('.', ',')}\n`;
        msg += `\n`;
      });
    }

    msg += `─────────────────────────\n`;
    msg += `👉 Acesse sua agenda ao vivo: ${getProfAgendaUrl(profName)}\n`;
    msg += `Bom trabalho! ✨`;

    const phone = prof.phone ? prof.phone.replace(/\D/g, '') : '';
    const encoded = encodeURIComponent(msg);
    if (phone.length >= 10) {
      window.open(`https://api.whatsapp.com/send?phone=55${phone}&text=${encoded}`, '_blank');
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    }
  };

  // -------------------------------------------------------------
  // FECHAMENTO CALCULATION (Diário, Quinzenal, Mensal, Personalizado)
  // -------------------------------------------------------------
  const calculateFechamento = (prof: Professional | null) => {
    if (!prof) {
      return {
        startDate: '',
        endDate: '',
        periodLabel: '',
        totalDaysWorked: 0,
        totalClients: 0,
        grossAmount: 0,
        commissionPercent: 50,
        netCommission: 0,
        items: [] as FechamentoItemExport[]
      };
    }

    const profName = prof.name || 'Profissional';
    const profComm = typeof prof.commissionPercent === 'number' ? prof.commissionPercent : 50;

    let startDate = '';
    let endDate = '';
    let periodLabel = '';

    const [curYear, curMonth] = (fechamentoMonth || '2026-08').split('-').map(Number);
    const lastDayOfMonth = new Date(curYear || 2026, curMonth || 8, 0).getDate();

    if (fechamentoPeriod === 'diario') {
      startDate = agendaDate;
      endDate = agendaDate;
      const [y, m, d] = (agendaDate || '').split('-');
      periodLabel = `Diário (${d || '01'}/${m || '01'}/${y || '2026'})`;
    } else if (fechamentoPeriod === 'quinzenal_1') {
      startDate = `${fechamentoMonth}-01`;
      endDate = `${fechamentoMonth}-15`;
      periodLabel = `1ª Quinzena (${fechamentoMonth}/01 a ${fechamentoMonth}/15)`;
    } else if (fechamentoPeriod === 'quinzenal_2') {
      startDate = `${fechamentoMonth}-16`;
      endDate = `${fechamentoMonth}-${lastDayOfMonth}`;
      periodLabel = `2ª Quinzena (${fechamentoMonth}/16 a ${fechamentoMonth}/${lastDayOfMonth})`;
    } else if (fechamentoPeriod === 'mensal') {
      startDate = `${fechamentoMonth}-01`;
      endDate = `${fechamentoMonth}-${lastDayOfMonth}`;
      periodLabel = `Mês Completo (${fechamentoMonth})`;
    } else {
      startDate = customStartDate;
      endDate = customEndDate;
      periodLabel = `Personalizado (${customStartDate} até ${customEndDate})`;
    }

    const filteredItems: FechamentoItemExport[] = [];
    const daysWorkedSet = new Set<string>();

    (transactions || []).forEach(t => {
      if (t && t.date && t.date >= startDate && t.date <= endDate) {
        if (t.commissions && Array.isArray(t.commissions)) {
          const matchComm = t.commissions.find(c => c && (c.professionalName === profName || c.professionalId === prof.id));
          if (matchComm && Number(matchComm.amount) > 0) {
            daysWorkedSet.add(t.date);
            filteredItems.push({
              date: t.date,
              time: t.time || '12:00',
              clientName: t.clientName || t.description || 'Cliente',
              serviceName: t.description || 'Atendimento',
              grossAmount: Number(t.grossAmount) || 0,
              commissionAmount: Number(matchComm.amount) || 0
            });
          }
        }
      }
    });

    const totalDaysWorked = daysWorkedSet.size;
    const totalClients = filteredItems.length;
    const grossAmount = filteredItems.reduce((acc, curr) => acc + curr.grossAmount, 0);
    const netCommission = filteredItems.reduce((acc, curr) => acc + curr.commissionAmount, 0);

    return {
      startDate,
      endDate,
      periodLabel,
      totalDaysWorked,
      totalClients,
      grossAmount,
      commissionPercent: profComm,
      netCommission,
      items: filteredItems
    };
  };

  const handleSaveFechamento = (prof: Professional) => {
    const calc = calculateFechamento(prof);
    const newRecord: EmployeeFechamentoRecord = {
      id: `fech-${Date.now()}`,
      professionalId: prof.id,
      professionalName: prof.name,
      periodType: fechamentoPeriod,
      periodLabel: calc.periodLabel,
      startDate: calc.startDate,
      endDate: calc.endDate,
      totalDaysWorked: calc.totalDaysWorked,
      totalClientsServed: calc.totalClients,
      grossAmount: calc.grossAmount,
      commissionPercent: calc.commissionPercent,
      netCommissionAmount: calc.netCommission,
      status: 'fechado',
      createdAt: new Date().toISOString(),
      paidAt: new Date().toISOString()
    };

    const updated = [newRecord, ...savedFechamentos];
    setSavedFechamentos(updated);
    Storage.saveFechamentos(updated);
    setFechamentoSuccessMsg(`Fechamento de ${prof.name} (${calc.periodLabel}) salvo com sucesso!`);
    setTimeout(() => setFechamentoSuccessMsg(null), 4000);
  };

  const handleDownloadFechamentoWord = (prof: Professional) => {
    const calc = calculateFechamento(prof);
    downloadFechamentoWord(
      config?.nomeSalao || 'Salão',
      prof.name,
      {
        totalClients: calc.totalClients,
        totalDaysWorked: calc.totalDaysWorked,
        grossAmount: calc.grossAmount,
        commissionPercent: calc.commissionPercent,
        netCommission: calc.netCommission,
        periodLabel: calc.periodLabel
      },
      calc.items
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-slate-900/95 p-4 sm:p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-mono text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
              isEmployee 
                ? 'bg-teal-950 text-teal-300 border-teal-800' 
                : 'bg-blue-950 text-blue-300 border-blue-800'
            }`}>
              {isEmployee ? `💈 SALÃO / FUNCIONÁRIO: ${(employeeName || 'PROFISSIONAL').toUpperCase()}` : '💈 SALÃO / ADMINISTRADOR'}
            </span>
            <span className="bg-emerald-950 text-emerald-300 font-mono text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-800">
              {displayedProfs.length} {displayedProfs.length === 1 ? 'Profissional' : 'Profissionais'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center gap-2">
            <Users className={`w-6 h-6 ${isEmployee ? 'text-teal-400' : 'text-sky-400'}`} />
            <span>{isEmployee ? 'Meu Perfil & Desempenho' : 'Meus Funcionários & Fechamento'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            {isEmployee
              ? 'Consulte exclusivamente suas informações, link pessoal de agendamento, dias trabalhados e atendimentos.'
              : 'Acompanhe dias trabalhados, clientes atendidos, realize fechamento diário/quinzenal/mensal e gerencie links e agendas individuais de cada funcionário.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
          {!isEmployee && onOpenEmployeeLink && (
            <button
              onClick={onOpenEmployeeLink}
              className="bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-600 hover:to-emerald-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 shrink-0 active:scale-95 cursor-pointer border border-teal-500/40"
              title="Gerar e compartilhar links de acesso direto com toda a equipe"
            >
              <Link2 className="w-4 h-4 text-teal-200" />
              <span>Gerar Links da Equipe</span>
            </button>
          )}

          {!isEmployee && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 shrink-0 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Funcionário</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Banner */}
      {fechamentoSuccessMsg && (
        <div className="bg-emerald-950 border border-emerald-500/50 p-4 rounded-2xl text-emerald-200 text-xs flex items-center gap-3 shadow-lg animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-bold">{fechamentoSuccessMsg}</span>
        </div>
      )}

      {/* Employees Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {displayedProfs.map((prof, idx) => {
          const profId = prof?.id || `prof-${idx + 1}`;
          const profName = prof?.name || `Profissional ${idx + 1}`;
          const profRole = prof?.role || 'Cabeleireiro(a)';
          const profPhone = prof?.phone || '';
          const profCpf = prof?.cpf;
          const profCommission = typeof prof?.commissionPercent === 'number' ? prof.commissionPercent : 50;

          const stats = profsStats[profName] || { daysWorked: new Set(), clientsServed: 0, totalGross: 0, totalCommission: 0 };
          const daysCount = stats?.daysWorked ? stats.daysWorked.size : 0;
          const clientsCount = stats?.clientsServed || 0;
          const grossVal = stats?.totalGross || 0;
          const commVal = stats?.totalCommission || 0;
          const initials = (profName.slice(0, 2) || 'PR').toUpperCase();

          return (
            <div 
              key={profId}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col justify-between transition-all space-y-4"
            >
              {/* Header: Name, Role, Commission Input & Actions */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-700 border border-blue-400/40 flex items-center justify-center text-white font-black text-lg shadow-md shrink-0">
                      {initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-black text-white">{profName}</h3>
                        <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-700">
                          {profRole}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {profPhone || 'Sem telefone'}
                        </span>
                        {!isEmployee && profCpf && (
                          <span className="bg-teal-950/80 text-teal-300 font-mono text-[9px] px-1.5 py-0.2 rounded border border-teal-800/40">
                            CPF: {profCpf}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {!isEmployee && (
                    <button
                      onClick={() => handleDeleteProf(profId)}
                      title="Remover Funcionário"
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Real-time KPI Stats Counters */}
                {isEmployee ? (
                  /* Salão / Funcionário: Visualiza APENAS Dias Trabalhados e Clientes Atendidos */
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {/* Days Worked */}
                    <div className="bg-slate-950/90 p-3 rounded-2xl border border-slate-800/80 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Dias Trabalhados
                      </span>
                      <span className="text-sm sm:text-base font-black text-sky-400 flex items-center justify-center gap-1.5 mt-1">
                        <Calendar className="w-4 h-4" />
                        <span>{daysCount} {daysCount === 1 ? 'dia' : 'dias'}</span>
                      </span>
                    </div>

                    {/* Clients Served */}
                    <div className="bg-slate-950/90 p-3 rounded-2xl border border-slate-800/80 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Clientes Atendidos
                      </span>
                      <span className="text-sm sm:text-base font-black text-emerald-400 flex items-center justify-center gap-1.5 mt-1">
                        <Scissors className="w-4 h-4" />
                        <span>{clientsCount} {clientsCount === 1 ? 'cliente' : 'clientes'}</span>
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Salão / Administrador: Visualiza Tudo (Dias, Clientes, Faturamento e Comissão) */
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                    
                    {/* Days Worked */}
                    <div className="bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800/80 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Dias Trabalhados
                      </span>
                      <span className="text-sm sm:text-base font-black text-sky-400 flex items-center justify-center gap-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{daysCount} {daysCount === 1 ? 'dia' : 'dias'}</span>
                      </span>
                    </div>

                    {/* Clients Served */}
                    <div className="bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800/80 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Clientes Atendidos
                      </span>
                      <span className="text-sm sm:text-base font-black text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
                        <Scissors className="w-3.5 h-3.5" />
                        <span>{clientsCount}</span>
                      </span>
                    </div>

                    {/* Gross Revenue */}
                    <div className="bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800/80 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Faturamento
                      </span>
                      <span className="text-xs sm:text-sm font-black text-slate-200 block mt-0.5">
                        R$ {grossVal.toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    {/* Commission % & Total */}
                    <div className="bg-slate-950/80 p-2.5 rounded-2xl border border-emerald-900/40 text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-emerald-400 uppercase">
                        <span>Comissão ({profCommission}%)</span>
                      </div>
                      <span className="text-xs sm:text-sm font-black text-emerald-400 block mt-0.5">
                        R$ {commVal.toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                  </div>
                )}

                {/* Commission Percentage Quick Slider / Input - ADMIN ONLY */}
                {!isEmployee && (
                  <div className="mt-3.5 pt-3 border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-400 font-semibold flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5 text-blue-400" />
                      <span>Ajustar Taxa de Comissão:</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={profCommission}
                        onChange={(e) => handleUpdateCommission(profId, parseFloat(e.target.value) || 0)}
                        className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-center font-bold text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                      <span className="text-slate-400 font-bold">%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons: ADMIN ONLY (Agenda do Dia Word/Print, Fechamento e Link Exclusivo) */}
              {!isEmployee && (
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  
                  {/* Row 1: Agenda do Dia do Funcionário & Fechamento */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedProfForAgenda(prof)}
                      className="py-2.5 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98 cursor-pointer"
                    >
                      <Calendar className="w-4 h-4 text-blue-400 group-hover:text-white" />
                      <span>Ver Agenda do Dia & Word</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedProfForFechamento(prof)}
                      className="py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98 cursor-pointer"
                    >
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      <span>Fazer Fechamento</span>
                    </button>
                  </div>

                  {/* Row 2: Link Direto da Agenda do Funcionário */}
                  <div className="bg-slate-950/90 p-2.5 rounded-2xl border border-teal-900/40 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
                        <Link2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <span className="text-[9px] text-teal-400 font-bold uppercase tracking-wider block">Link da Agenda do Funcionário</span>
                        <span className="text-[11px] font-mono text-slate-300 truncate block">
                          ...prof={encodeURIComponent(prof.name)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyProfLink(prof.name, prof.id)}
                        title="Copiar Link Exclusivo da Agenda deste Funcionário"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                      >
                        {copiedProfId === prof.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendProfLinkWhatsapp(prof)}
                        title="Enviar Link da Agenda no WhatsApp do Funcionário"
                        className="p-1.5 bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-white rounded-lg transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenProfQr(prof)}
                        title="QR Code da Agenda no Celular"
                        className="p-1.5 bg-teal-950 text-teal-300 border border-teal-800 hover:bg-teal-900 rounded-lg transition-colors cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: AGENDA DO DIA DO FUNCIONÁRIO (VER, WORD, IMPRIMIR)    */}
      {/* ============================================================== */}
      {selectedProfForAgenda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0b1222] border border-blue-500/40 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-800 p-4 sm:p-5 text-white flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/15 rounded-2xl border border-white/25 backdrop-blur-sm">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-950 text-blue-200 text-[10px] font-mono font-black px-2 py-0.5 rounded-full uppercase">
                      Escala & Agenda Diária
                    </span>
                    <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {selectedProfForAgenda.name}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black mt-0.5">
                    Agenda do Dia • {selectedProfForAgenda.name}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedProfForAgenda(null)}
                className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Controls: Date Selection & Export Actions */}
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300">Data da Agenda:</span>
                <input
                  type="date"
                  value={agendaDate}
                  onChange={(e) => setAgendaDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-700 text-white rounded-xl text-xs font-bold font-mono focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleDownloadProfDayWord(selectedProfForAgenda.name, agendaDate)}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  title="Baixar a agenda do dia formatada em Word (.doc)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Word (.doc)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePrintProfDay(selectedProfForAgenda.name, agendaDate)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  title="Imprimir escala e clientes do dia"
                >
                  <Printer className="w-3.5 h-3.5 text-sky-400" />
                  <span>Imprimir</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendDayScheduleWhatsApp(selectedProfForAgenda, agendaDate)}
                  className="px-3 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  title="Enviar a agenda do dia no WhatsApp do funcionário"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Mandar no Zap</span>
                </button>
              </div>
            </div>

            {/* Modal Body: Schedule Table */}
            <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              {(() => {
                const items = getProfDayScheduleItems(selectedProfForAgenda.name, agendaDate);
                const bookedCount = items.filter(i => i.status === 'agendado' || i.status === 'concluido').length;
                const totalValorPrevisto = items.reduce((acc, curr) => acc + (curr.price || 0), 0);

                return (
                  <div className="space-y-3">
                    {/* Summary card */}
                    <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Resumo do Dia ({agendaDate}):</span>
                        <span className="font-bold text-white text-sm">
                          {bookedCount} {bookedCount === 1 ? 'cliente agendado' : 'clientes agendados'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[11px]">Valor Total Previsto:</span>
                        <span className="font-bold text-emerald-400 text-sm">
                          R$ {totalValorPrevisto.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-inner">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-900 text-slate-300 font-bold border-b border-slate-800">
                          <tr>
                            <th className="p-3 text-center w-24">Horário</th>
                            <th className="p-3 text-center w-24">Status</th>
                            <th className="p-3">Cliente / Contato</th>
                            <th className="p-3">Serviço</th>
                            <th className="p-3 text-right w-28">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80 text-slate-300">
                          {items.map((item, idx) => (
                            <tr key={idx} className={item.status === 'agendado' || item.status === 'concluido' ? 'bg-blue-950/20' : 'bg-transparent'}>
                              <td className="p-3 text-center font-mono font-bold text-white">
                                {item.time}
                              </td>
                              <td className="p-3 text-center">
                                {item.status === 'concluido' ? (
                                  <span className="bg-purple-950 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-800">
                                    Concluído
                                  </span>
                                ) : item.status === 'agendado' ? (
                                  <span className="bg-sky-950 text-sky-300 text-[10px] font-bold px-2 py-0.5 rounded border border-sky-800">
                                    Agendado
                                  </span>
                                ) : item.status === 'bloqueado' ? (
                                  <span className="bg-rose-950 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-800">
                                    Bloqueado
                                  </span>
                                ) : (
                                  <span className="text-slate-600 font-semibold text-[10px]">
                                    Livre
                                  </span>
                                )}
                              </td>
                              <td className="p-3 font-semibold text-white">
                                {item.clientName}
                                {item.clientPhone && (
                                  <span className="block text-[10px] text-slate-400 font-normal font-mono">
                                    📞 {item.clientPhone}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-slate-300">
                                {item.serviceName}
                              </td>
                              <td className="p-3 text-right font-bold font-mono text-emerald-400">
                                {item.price ? `R$ ${item.price.toFixed(2).replace('.', ',')}` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: FECHAMENTO DE COMISSÕES (DIÁRIO, QUINZENAL, MENSAL)   */}
      {/* ============================================================== */}
      {selectedProfForFechamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0b1222] border border-emerald-500/40 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 p-4 sm:p-5 text-white flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/15 rounded-2xl border border-white/25 backdrop-blur-sm">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-950 text-emerald-200 text-[10px] font-mono font-black px-2 py-0.5 rounded-full uppercase">
                      Fechamento Financeiro & Comissões
                    </span>
                    <span className="bg-white text-emerald-900 text-[10px] font-black px-2 py-0.5 rounded-full">
                      {selectedProfForFechamento.name} ({selectedProfForFechamento.commissionPercent}%)
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black mt-0.5">
                    Fechamento de Comissões • {selectedProfForFechamento.name}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedProfForFechamento(null)}
                className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Period Selection Filters */}
            <div className="p-4 bg-slate-900 border-b border-slate-800 space-y-3 shrink-0">
              <div className="flex items-center gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setFechamentoPeriod('diario')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    fechamentoPeriod === 'diario'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  📅 Diário (Hoje)
                </button>

                <button
                  type="button"
                  onClick={() => setFechamentoPeriod('quinzenal_1')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    fechamentoPeriod === 'quinzenal_1'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  1ª Quinzena (Dias 1 a 15)
                </button>

                <button
                  type="button"
                  onClick={() => setFechamentoPeriod('quinzenal_2')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    fechamentoPeriod === 'quinzenal_2'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  2ª Quinzena (Dias 16 ao Fim)
                </button>

                <button
                  type="button"
                  onClick={() => setFechamentoPeriod('mensal')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    fechamentoPeriod === 'mensal'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  🗓️ Mês Completo
                </button>

                <button
                  type="button"
                  onClick={() => setFechamentoPeriod('personalizado')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    fechamentoPeriod === 'personalizado'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Personalizado
                </button>
              </div>

              {/* Period Inputs based on type */}
              <div className="flex items-center gap-3 flex-wrap text-xs text-slate-300">
                {fechamentoPeriod === 'diario' && (
                  <div className="flex items-center gap-2">
                    <span>Data:</span>
                    <input
                      type="date"
                      value={agendaDate}
                      onChange={(e) => setAgendaDate(e.target.value)}
                      className="px-3 py-1 bg-slate-950 border border-slate-700 text-white rounded-lg text-xs font-mono"
                    />
                  </div>
                )}

                {(fechamentoPeriod === 'mensal' || fechamentoPeriod === 'quinzenal_1' || fechamentoPeriod === 'quinzenal_2') && (
                  <div className="flex items-center gap-2">
                    <span>Mês de Referência:</span>
                    <input
                      type="month"
                      value={fechamentoMonth}
                      onChange={(e) => setFechamentoMonth(e.target.value)}
                      className="px-3 py-1 bg-slate-950 border border-slate-700 text-white rounded-lg text-xs font-mono"
                    />
                  </div>
                )}

                {fechamentoPeriod === 'personalizado' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>De:</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="px-3 py-1 bg-slate-950 border border-slate-700 text-white rounded-lg text-xs font-mono"
                    />
                    <span>Até:</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="px-3 py-1 bg-slate-950 border border-slate-700 text-white rounded-lg text-xs font-mono"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Fechamento Body & Calculations */}
            <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              {(() => {
                const calc = calculateFechamento(selectedProfForFechamento);

                return (
                  <div className="space-y-4">
                    {/* Key Metric Blocks */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Dias Trabalhados</span>
                        <span className="text-base font-black text-sky-400 mt-0.5 block font-mono">
                          📅 {calc.totalDaysWorked} dias
                        </span>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Clientes Atendidos</span>
                        <span className="text-base font-black text-emerald-400 mt-0.5 block font-mono">
                          ✂️ {calc.totalClients}
                        </span>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Faturamento Bruto</span>
                        <span className="text-base font-black text-slate-200 mt-0.5 block font-mono">
                          R$ {calc.grossAmount.toFixed(2).replace('.', ',')}
                        </span>
                      </div>

                      <div className="bg-emerald-950/60 p-3 rounded-2xl border border-emerald-500/50 text-center">
                        <span className="text-[10px] text-emerald-300 uppercase font-bold block">Comissão Líquida ({calc.commissionPercent}%)</span>
                        <span className="text-lg font-black text-emerald-300 mt-0.5 block font-mono">
                          R$ {calc.netCommission.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    </div>

                    {/* Actions: Save Fechamento & Download Word */}
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div className="text-xs text-slate-400">
                        Período apurado: <strong className="text-white">{calc.periodLabel}</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadFechamentoWord(selectedProfForFechamento)}
                          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                        >
                          <Download className="w-4 h-4 text-emerald-400" />
                          <span>Extrato Word (.doc)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSaveFechamento(selectedProfForFechamento)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Salvar / Efetuar Fechamento</span>
                        </button>
                      </div>
                    </div>

                    {/* Detailed Transactions Table */}
                    <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-inner">
                      <div className="p-3 bg-slate-900 text-xs font-bold text-slate-300 border-b border-slate-800">
                        Detalhamento dos Atendimentos do Período ({calc.items.length})
                      </div>
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-900/80 text-slate-400 font-bold border-b border-slate-800">
                          <tr>
                            <th className="p-2.5 text-center w-28">Data/Hora</th>
                            <th className="p-2.5">Cliente</th>
                            <th className="p-2.5">Serviço</th>
                            <th className="p-2.5 text-right w-24">Bruto</th>
                            <th className="p-2.5 text-right w-28">Comissão</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                          {calc.items.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-6 text-center text-slate-500">
                                Nenhum atendimento faturado para este funcionário no período selecionado.
                              </td>
                            </tr>
                          ) : (
                            calc.items.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-900/40">
                                <td className="p-2.5 text-center font-mono text-slate-400">
                                  {item.date.split('-').reverse().slice(0, 2).join('/')} {item.time}
                                </td>
                                <td className="p-2.5 font-bold text-white">
                                  {item.clientName}
                                </td>
                                <td className="p-2.5 text-slate-300">
                                  {item.serviceName}
                                </td>
                                <td className="p-2.5 text-right font-mono text-slate-300">
                                  R$ {item.grossAmount.toFixed(2).replace('.', ',')}
                                </td>
                                <td className="p-2.5 text-right font-mono font-bold text-emerald-400">
                                  R$ {item.commissionAmount.toFixed(2).replace('.', ',')}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                  </div>
                );
              })()}
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: QR CODE DO LINK DA AGENDA DO FUNCIONÁRIO             */}
      {/* ============================================================== */}
      {qrModalProf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0b1222] border border-teal-500/40 w-full max-w-sm rounded-3xl shadow-2xl p-5 text-center space-y-4">
            <div className="flex items-center justify-between">
              <span className="bg-teal-950 text-teal-300 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-teal-800">
                QR CODE • AGENDA EXCLUSIVA
              </span>
              <button
                onClick={() => setQrModalProf(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-black text-white">{qrModalProf.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Escaneie com a câmera do celular para abrir a agenda específica deste funcionário
              </p>
            </div>

            {qrCodeUrl && (
              <div className="bg-white p-4 rounded-2xl inline-block shadow-lg border border-teal-500">
                <img src={qrCodeUrl} alt="QR Code Agenda" className="w-48 h-48 rounded-xl" />
              </div>
            )}

            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  handleCopyProfLink(qrModalProf.name, qrModalProf.id);
                  setQrModalProf(null);
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>Copiar Link da Agenda</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: NOVO FUNCIONÁRIO                                      */}
      {/* ============================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl text-slate-200">
            <h3 className="text-base font-extrabold text-white mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-sky-400" />
                <span>Cadastrar Novo Funcionário</span>
              </span>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </h3>

            <form onSubmit={handleAddProf} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Nome Completo do Profissional:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Silva"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Cargo / Especialidade:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Barbeiro(a)"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Comissão Padrão (%):</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={newCommission}
                    onChange={(e) => setNewCommission(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Telefone / WhatsApp:</label>
                <input
                  type="text"
                  placeholder="(11) 99999-9999"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">CPF (Opcional - para login):</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={newCpf}
                  onChange={(e) => setNewCpf(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-extrabold hover:bg-blue-500 shadow-md"
                >
                  Cadastrar Funcionário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
