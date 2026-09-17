import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Database, Calendar as CalendarIcon, Download, FileText, 
  FileSpreadsheet, Search, ChevronLeft, ChevronRight, CheckCircle2, 
  Clock, ShieldCheck, Eye, Sparkles, Filter, ChevronDown, 
  ChevronUp, AlertCircle, RefreshCw, Layers, DollarSign, UserCheck,
  ArrowRight, RotateCcw
} from 'lucide-react';
import { CaixaFechamentoCiclo, SalonConfig, UserRole, Transaction } from '../types';
import { Storage } from '../utils/storage';
import { exportToExcel, exportToWord } from '../utils/exporters';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

interface BancoDadosCaixaModalProps {
  isOpen: boolean;
  onClose: () => void;
  salonId: string;
  salonName: string;
  config: SalonConfig;
  userRole: UserRole;
  currentTransactions?: Transaction[];
}

export const BancoDadosCaixaModal: React.FC<BancoDadosCaixaModalProps> = ({
  isOpen,
  onClose,
  salonId,
  salonName,
  config,
  userRole,
  currentTransactions = []
}) => {
  const [ciclos, setCiclos] = useState<CaixaFechamentoCiclo[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Date Helpers
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getFirstDayOfMonthStr = (date?: Date) => {
    const d = date || new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  };

  const getDaysAgoStr = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getMonthsAgoStr = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // State for Date Range
  // By default, as requested: "quando eu clicar hoje ou a data, tem que puxar do mês inteiro.
  // Por exemplo, dia 16 que eu fechei hoje, tem que aparecer todos os lançamentos do dia 16 que eu fechei hoje até o dia 1º de setembro"
  const [startDate, setStartDate] = useState<string>(() => getFirstDayOfMonthStr());
  const [endDate, setEndDate] = useState<string>(() => getTodayStr());
  const [activeFilterPreset, setActiveFilterPreset] = useState<'hoje' | '7dias' | '30dias' | '6meses' | '1ano' | 'todos' | 'personalizado'>('hoje');

  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Load data from local storage and firestore
  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Local storage first
      let localData = Storage.getCaixaFechamentos(salonId);

      // Verify if there was a saved fechamento in localStorage that hasn't been archived as a cycle yet
      const savedFechamentoStr = localStorage.getItem(`fechamento_caixa_${salonId || 'default'}`);
      const liveTxs = (currentTransactions && currentTransactions.length > 0)
        ? currentTransactions
        : Storage.getTransactions();

      if (localData.length === 0 && (savedFechamentoStr || liveTxs.length > 0)) {
        let savedFechamento: any = null;
        try {
          if (savedFechamentoStr) savedFechamento = JSON.parse(savedFechamentoStr);
        } catch { /* ignore */ }

        const now = new Date();
        const formattedDate = savedFechamento?.date || `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        const yyyymmdd = now.toISOString().split('T')[0];

        const activeTxs = liveTxs.filter(t => !t.deleted && t.status !== 'cancelado');
        const gross = savedFechamento?.totalGross ?? activeTxs.reduce((acc, t) => acc + (Number(t.grossAmount) || 0), 0);
        const net = activeTxs.reduce((acc, t) => acc + (Number(t.netAmount) || 0), 0);

        const syntheticCycle: CaixaFechamentoCiclo = {
          id: `fechamento_recuperado_${Date.now()}`,
          salonId: salonId || 'default',
          salonName: config.nomeSalao || salonName,
          closedAt: now.toISOString(),
          closedAtFormatted: formattedDate,
          date: yyyymmdd,
          totalGross: gross,
          totalNet: net,
          totalCommissions: 0,
          activeCount: savedFechamento?.count ?? activeTxs.length,
          cancelledCount: liveTxs.length - activeTxs.length,
          commissionsByProf: [],
          paymentMethodsSummary: [],
          transactions: [...liveTxs],
          clearedBy: userRole
        };

        Storage.saveCaixaFechamento(syntheticCycle);
        localData = [syntheticCycle];
      }

      setCiclos(localData);

      // 2. Query Firestore if available to sync any cycles made on other devices
      if (db) {
        try {
          const coll = collection(db, 'caixa_fechamentos');
          const snap = await getDocs(coll);
          if (!snap.empty) {
            const remoteCiclos: CaixaFechamentoCiclo[] = [];
            snap.forEach(docSnap => {
              const data = docSnap.data() as CaixaFechamentoCiclo;
              if (data && (!data.salonId || data.salonId === salonId)) {
                remoteCiclos.push(data);
              }
            });
            if (remoteCiclos.length > 0) {
              // Merge
              const map = new Map<string, CaixaFechamentoCiclo>();
              localData.forEach(c => map.set(c.id, c));
              remoteCiclos.forEach(c => map.set(c.id, c));
              const merged = Array.from(map.values()).sort((a, b) => {
                return new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime();
              });
              setCiclos(merged);
              localStorage.setItem('salao_fechamentos_caixa', JSON.stringify(merged));
            }
          }
        } catch (err) {
          console.warn('[BancoDadosCaixaModal] Firestore fetch notice:', err);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      // Ensure it defaults to month-to-date
      setStartDate(getFirstDayOfMonthStr());
      setEndDate(getTodayStr());
      setActiveFilterPreset('hoje');
    }
  }, [isOpen, salonId]);

  // Listen to cross-tab / cross-device sync
  useEffect(() => {
    const handleSync = (e: any) => {
      if (e.detail?.key === 'caixaFechamentos') {
        const local = Storage.getCaixaFechamentos(salonId);
        setCiclos(local);
      }
    };
    window.addEventListener('salao_sync_data', handleSync);
    return () => window.removeEventListener('salao_sync_data', handleSync);
  }, [salonId]);

  // Pool all transactions from archived cycles and live transactions (deduplicating by ID)
  const allTransactionsMap = useMemo<Map<string, Transaction>>(() => {
    const map = new Map<string, Transaction>();
    
    // 1. From archived cycles
    ciclos.forEach(c => {
      (c.transactions || []).forEach(tx => {
        if (tx && tx.id) {
          map.set(tx.id, tx);
        }
      });
    });

    // 2. From current live transactions (or storage)
    const liveTxs: Transaction[] = (currentTransactions && currentTransactions.length > 0)
      ? currentTransactions
      : Storage.getTransactions();
    
    liveTxs.forEach(tx => {
      if (tx && tx.id && !map.has(tx.id)) {
        map.set(tx.id, tx);
      }
    });

    return map;
  }, [ciclos, currentTransactions]);

  // Filter individual transactions for the selected date range and search term
  const periodTransactions = useMemo<Transaction[]>(() => {
    const txList: Transaction[] = Array.from(allTransactionsMap.values());
    return txList.filter((tx: Transaction) => {
      const txDate = tx.date || (tx.deletedAt ? tx.deletedAt.split('T')[0] : '');
      if (startDate && txDate && txDate < startDate) return false;
      if (endDate && txDate && txDate > endDate) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const desc = (tx.description || '').toLowerCase();
        const client = (tx.clientName || '').toLowerCase();
        const method = (tx.paymentMethod || '').toLowerCase();
        const dateStr = (tx.date || '').toLowerCase();
        const commMatch = (tx.commissions || []).some(c => (c.professionalName || '').toLowerCase().includes(q));
        if (!desc.includes(q) && !client.includes(q) && !method.includes(q) && !dateStr.includes(q) && !commMatch) {
          return false;
        }
      }
      return true;
    }).sort((a: Transaction, b: Transaction) => {
      const dateComp = (b.date || '').localeCompare(a.date || '');
      if (dateComp !== 0) return dateComp;
      return (b.time || '').localeCompare(a.time || '');
    });
  }, [allTransactionsMap, startDate, endDate, searchTerm]);

  // Group cycles by date for calendar highlighting
  const cyclesByDate = useMemo(() => {
    const map: Record<string, CaixaFechamentoCiclo[]> = {};
    ciclos.forEach(c => {
      const d = c.date || (c.closedAt ? c.closedAt.split('T')[0] : '');
      if (d) {
        if (!map[d]) map[d] = [];
        map[d].push(c);
      }
    });
    return map;
  }, [ciclos]);

  // Filter cycles based on date range and search term
  const filteredCiclos = useMemo(() => {
    return ciclos.filter(c => {
      const cycleDate = c.date || (c.closedAt ? c.closedAt.split('T')[0] : '');

      if (startDate && cycleDate && cycleDate < startDate) return false;
      if (endDate && cycleDate && cycleDate > endDate) return false;

      // Text search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const dateMatch = (c.date || '').toLowerCase().includes(query);
        const formatMatch = (c.closedAtFormatted || '').toLowerCase().includes(query);
        const txMatch = (c.transactions || []).some(t => 
          (t.description || '').toLowerCase().includes(query) ||
          (t.clientName || '').toLowerCase().includes(query) ||
          (t.paymentMethod || '').toLowerCase().includes(query) ||
          (t.commissions || []).some(comm => (comm.professionalName || '').toLowerCase().includes(query))
        );
        return dateMatch || formatMatch || txMatch;
      }

      return true;
    });
  }, [ciclos, startDate, endDate, searchTerm]);

  // Aggregate stats of periodTransactions
  const stats = useMemo(() => {
    let gross = 0;
    let net = 0;
    let procedures = 0;
    let cancelled = 0;
    const profMap: Record<string, number> = {};

    periodTransactions.forEach(tx => {
      const isCancelled = Boolean(tx.deleted || tx.status === 'cancelado');
      if (!isCancelled) {
        gross += Number(tx.grossAmount) || 0;
        net += Number(tx.netAmount) || 0;
        procedures++;
        (tx.commissions || []).forEach(c => {
          profMap[c.professionalName] = (profMap[c.professionalName] || 0) + (Number(c.amount) || 0);
        });
      } else {
        cancelled++;
      }
    });

    return { gross, net, procedures, cancelled, profMap };
  }, [periodTransactions]);

  // Preset Handlers
  const handlePresetSelect = (preset: 'hoje' | '7dias' | '30dias' | '6meses' | '1ano' | 'todos') => {
    setActiveFilterPreset(preset);
    const today = getTodayStr();

    if (preset === 'hoje') {
      // Puxa do dia 1º do mês atual até hoje
      setStartDate(getFirstDayOfMonthStr());
      setEndDate(today);
    } else if (preset === '7dias') {
      setStartDate(getDaysAgoStr(7));
      setEndDate(today);
    } else if (preset === '30dias') {
      setStartDate(getDaysAgoStr(30));
      setEndDate(today);
    } else if (preset === '6meses') {
      setStartDate(getMonthsAgoStr(6));
      setEndDate(today);
    } else if (preset === '1ano') {
      setStartDate(getMonthsAgoStr(12));
      setEndDate(today);
    } else if (preset === 'todos') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Calendar generation helpers
  const currentYear = calendarMonth.getFullYear();
  const currentMonthIndex = calendarMonth.getMonth();

  const handlePrevMonth = () => {
    setCalendarMonth(new Date(currentYear, currentMonthIndex - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarMonth(new Date(currentYear, currentMonthIndex + 1, 1));
  };

  const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
  const firstDayWeekIndex = new Date(currentYear, currentMonthIndex, 1).getDay();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Calendar day click handler
  const handleCalendarDayClick = (dayStr: string) => {
    setActiveFilterPreset('personalizado');
    // If no start date or both already set, start fresh
    if (!startDate || (startDate && endDate && startDate !== endDate)) {
      setStartDate(dayStr);
      setEndDate(dayStr);
    } else if (startDate && (!endDate || startDate === endDate)) {
      if (dayStr < startDate) {
        setEndDate(startDate);
        setStartDate(dayStr);
      } else {
        setEndDate(dayStr);
      }
    }
  };

  // Quick action: Pull from 1st of month to selected day
  const handlePullFromFirstToDate = (targetDate?: string) => {
    const target = targetDate || endDate || getTodayStr();
    const parts = target.split('-');
    const firstDay = `${parts[0]}-${parts[1]}-01`;
    setStartDate(firstDay);
    setEndDate(target);
    setActiveFilterPreset('personalizado');
    setNotice(`Filtro atualizado: De ${firstDay.split('-').reverse().join('/')} até ${target.split('-').reverse().join('/')}`);
    setTimeout(() => setNotice(null), 4000);
  };

  // Downloads for an individual cycle
  const handleDownloadCycleExcel = (ciclo: CaixaFechamentoCiclo) => {
    const formattedDate = ciclo.date ? ciclo.date.replace(/-/g, '_') : 'periodo';
    const filename = `Fechamento_Ciclo_${config.nomeSalao.replace(/\s+/g, '_')}_${formattedDate}_${ciclo.id.slice(-6)}.xls`;
    const title = `Relatório do Ciclo Fechado em ${ciclo.closedAtFormatted} - ${config.nomeSalao}`;
    exportToExcel(ciclo.transactions || [], config, title, filename);
    setNotice(`Planilha do ciclo (${ciclo.closedAtFormatted}) baixada com sucesso!`);
    setTimeout(() => setNotice(null), 5000);
  };

  const handleDownloadCycleWord = (ciclo: CaixaFechamentoCiclo) => {
    const formattedDate = ciclo.date ? ciclo.date.replace(/-/g, '_') : 'periodo';
    const filename = `Fechamento_Ciclo_${config.nomeSalao.replace(/\s+/g, '_')}_${formattedDate}_${ciclo.id.slice(-6)}.doc`;
    const title = `Relatório do Ciclo Fechado em ${ciclo.closedAtFormatted} - ${config.nomeSalao}`;
    exportToWord(ciclo.transactions || [], config, title, filename);
    setNotice(`Documento Word do ciclo (${ciclo.closedAtFormatted}) baixado com sucesso!`);
    setTimeout(() => setNotice(null), 5000);
  };

  // Consolidated download for the entire filtered period (WORD & EXCEL)
  const handleDownloadConsolidatedExcel = () => {
    if (periodTransactions.length === 0) {
      alert(`Nenhum lançamento encontrado no período selecionado (${startDate ? startDate.split('-').reverse().join('/') : 'Início'} até ${endDate ? endDate.split('-').reverse().join('/') : 'Fim'}). Selecione outro período no calendário ou clique em 'Todos'.`);
      return;
    }

    const startLabel = startDate ? startDate.split('-').reverse().join('/') : 'Inicio';
    const endLabel = endDate ? endDate.split('-').reverse().join('/') : 'Hoje';
    const filename = `Relatorio_Lancamentos_${config.nomeSalao.replace(/\s+/g, '_')}_${startLabel.replace(/\//g, '-')}_a_${endLabel.replace(/\//g, '-')}.xls`;
    const title = `Relatório Consolidado de Lançamentos (${startLabel} até ${endLabel}) - ${periodTransactions.length} procedimentos - ${config.nomeSalao}`;

    exportToExcel(periodTransactions, config, title, filename);
    setNotice(`Planilha Excel baixada com sucesso! Total de ${periodTransactions.length} procedimentos entre ${startLabel} e ${endLabel}.`);
    setTimeout(() => setNotice(null), 6000);
  };

  const handleDownloadConsolidatedWord = () => {
    if (periodTransactions.length === 0) {
      alert(`Nenhum lançamento encontrado no período selecionado (${startDate ? startDate.split('-').reverse().join('/') : 'Início'} até ${endDate ? endDate.split('-').reverse().join('/') : 'Fim'}). Selecione outro período no calendário ou clique em 'Todos'.`);
      return;
    }

    const startLabel = startDate ? startDate.split('-').reverse().join('/') : 'Inicio';
    const endLabel = endDate ? endDate.split('-').reverse().join('/') : 'Hoje';
    const filename = `Relatorio_Lancamentos_${config.nomeSalao.replace(/\s+/g, '_')}_${startLabel.replace(/\//g, '-')}_a_${endLabel.replace(/\//g, '-')}.doc`;
    const title = `Relatório Consolidado de Lançamentos (${startLabel} até ${endLabel}) - ${periodTransactions.length} procedimentos - ${config.nomeSalao}`;

    exportToWord(periodTransactions, config, title, filename);
    setNotice(`Relatório Word baixado com sucesso! Total de ${periodTransactions.length} procedimentos entre ${startLabel} e ${endLabel}.`);
    setTimeout(() => setNotice(null), 6000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-50 border border-slate-300 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] my-auto">
        
        {/* MODAL HEADER */}
        <div 
          style={{ backgroundColor: config.corCustom || '#2563eb' }}
          className="p-4 sm:p-5 text-white flex items-center justify-between shadow-md relative"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/30 flex items-center justify-center shadow-inner">
              <Database className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Banco de Dados dos Lançamentos Globais
                </h3>
                <span className="bg-white/20 text-white border border-white/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-300" />
                  Preservação Permanente
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                Consulte e baixe relatórios em Word e Excel com filtro por Data Inicial e Data Final ou períodos rápidos.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Fechar banco de dados"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NOTICE BANNER */}
        {notice && (
          <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 flex items-center justify-between shadow-inner animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
              <span>{notice}</span>
            </div>
            <button onClick={() => setNotice(null)} className="text-emerald-100 hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* MAIN BODY */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-4 flex-1">

          {/* TOP CONTROLS: PERIOD PRESETS, DATE RANGE INPUTS, SEARCH & CONSOLIDATED DOWNLOADS */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            
            {/* ROW 1: PRESETS AND DOWNLOAD BUTTONS */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              
              {/* Quick Period Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-slate-600 flex items-center gap-1 mr-1">
                  <Filter className="w-3.5 h-3.5 text-blue-600" /> Período:
                </span>
                
                {[
                  { key: 'hoje', label: 'Hoje (01 a 16/09)' },
                  { key: '7dias', label: 'Últimos 7 dias' },
                  { key: '30dias', label: '30 dias' },
                  { key: '6meses', label: '6 meses' },
                  { key: '1ano', label: '1 ano' },
                  { key: 'todos', label: 'Todos' },
                ].map((item) => {
                  const isActive = activeFilterPreset === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => handlePresetSelect(item.key as any)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs scale-[1.02]'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Word and Excel Action Buttons (ALWAYS FUNCTIONAL) */}
              <div className="flex items-center gap-2 self-start lg:self-auto shrink-0 flex-wrap">
                <button
                  type="button"
                  id="btn-banco-baixar-word"
                  onClick={handleDownloadConsolidatedWord}
                  className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold px-3.5 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                  title="Baixar em Word (.doc) todos os lançamentos do período selecionado"
                >
                  <FileText className="w-4 h-4 text-white" />
                  <span>Baixar Período Word</span>
                  <span className="bg-sky-800/80 text-white text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                    {periodTransactions.length}
                  </span>
                </button>

                <button
                  type="button"
                  id="btn-banco-baixar-excel"
                  onClick={handleDownloadConsolidatedExcel}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-3.5 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                  title="Baixar em Excel (.xls) todos os lançamentos do período selecionado"
                >
                  <FileSpreadsheet className="w-4 h-4 text-white" />
                  <span>Baixar Período Excel</span>
                  <span className="bg-emerald-800/80 text-white text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                    {periodTransactions.length}
                  </span>
                </button>
              </div>

            </div>

            {/* ROW 2: EXPLICIT DATA INICIAL AND DATA FINAL CONTROLS */}
            <div className="bg-slate-100/90 p-3 rounded-xl border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                
                {/* Data Inicial Input */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-black text-slate-700 flex items-center gap-1 shrink-0">
                    <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>Data Inicial:</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setActiveFilterPreset('personalizado');
                    }}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                  />
                </div>

                <div className="hidden sm:block text-slate-400">
                  <ArrowRight className="w-4 h-4" />
                </div>

                {/* Data Final Input */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-black text-slate-700 flex items-center gap-1 shrink-0">
                    <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>Data Final:</span>
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setActiveFilterPreset('personalizado');
                    }}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                  />
                </div>

                {/* Quick Helper Button */}
                <button
                  type="button"
                  onClick={() => handlePullFromFirstToDate()}
                  className="bg-white hover:bg-slate-200 text-blue-700 border border-blue-200 hover:border-blue-300 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                  title="Puxar lançamentos desde o dia 1º até a data final"
                >
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  <span>Puxar do dia 1º até hoje</span>
                </button>

                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                      setActiveFilterPreset('todos');
                    }}
                    className="text-[11px] text-slate-500 hover:text-rose-600 font-bold flex items-center gap-1 px-2 py-1 rounded cursor-pointer"
                    title="Limpar filtro de datas e ver todos"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Limpar Datas</span>
                  </button>
                )}
              </div>

              {/* Selected Interval Pill */}
              <div className="bg-white border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-900 flex items-center justify-between sm:justify-start gap-2 shadow-2xs">
                <span className="text-slate-500 font-medium">Intervalo Selecionado:</span>
                <span className="text-blue-700 font-black">
                  {startDate ? startDate.split('-').reverse().join('/') : 'Início'} até {endDate ? endDate.split('-').reverse().join('/') : 'Hoje'}
                </span>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por cliente, procedimento, profissional, valor ou data..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

          </div>

          {/* DUAL COLUMN: LEFT IS INTERACTIVE CALENDAR, RIGHT IS CYCLES & PROCEDURES LIST */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            
            {/* LEFT COLUMN: INTERACTIVE MONTH CALENDAR (4 COLS) */}
            <div className="lg:col-span-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-extrabold text-slate-800">
                    {monthNames[currentMonthIndex]} {currentYear}
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
                    title="Mês anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
                    title="Próximo mês"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day names header */}
              <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 mb-1">
                <span>Dom</span>
                <span>Seg</span>
                <span>Ter</span>
                <span>Qua</span>
                <span>Qui</span>
                <span>Sex</span>
                <span>Sáb</span>
              </div>

              {/* Calendar Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Blank days before day 1 */}
                {Array.from({ length: firstDayWeekIndex }).map((_, i) => (
                  <div key={`blank-${i}`} className="h-9 rounded-lg" />
                ))}

                {/* Days of month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dayStr = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const dayCycles = cyclesByDate[dayStr] || [];
                  const hasCycles = dayCycles.length > 0;

                  // Check range highlighting
                  const isRangeStart = startDate === dayStr;
                  const isRangeEnd = endDate === dayStr;
                  const isInRange = Boolean(startDate && endDate && dayStr >= startDate && dayStr <= endDate);

                  return (
                    <button
                      key={dayStr}
                      onClick={() => handleCalendarDayClick(dayStr)}
                      className={`h-9 rounded-xl flex flex-col items-center justify-center relative text-xs font-bold transition-all cursor-pointer ${
                        isRangeStart || isRangeEnd
                          ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300 font-black z-10' 
                          : isInRange
                            ? 'bg-blue-100 text-blue-900 border border-blue-200 font-extrabold'
                            : hasCycles 
                              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100' 
                              : 'hover:bg-slate-100 text-slate-700'
                      }`}
                      title={hasCycles ? `${dayCycles.length} ciclo(s) arquivado(s) neste dia` : `Dia ${dayNum}`}
                    >
                      <span>{dayNum}</span>
                      {hasCycles && (
                        <span 
                          className={`w-1.5 h-1.5 rounded-full ${isRangeStart || isRangeEnd ? 'bg-white' : 'bg-emerald-600'} -mt-0.5`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Quick helper buttons below calendar */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    const today = getTodayStr();
                    handlePullFromFirstToDate(today);
                  }}
                  className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold py-1.5 px-2.5 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Puxar do dia 1º até o dia 16 (Hoje)</span>
                </button>

                <div className="space-y-1 text-[11px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                    <span>Azul: Intervalo entre Data Inicial e Final.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>Ponto verde: Ciclos arquivados no dia.</span>
                  </div>
                </div>
              </div>

              {/* Period Stats Summary Box */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="font-extrabold text-slate-800 flex items-center justify-between">
                  <span>Resumo do Período:</span>
                  <span className="text-[10px] text-blue-700 font-black bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {periodTransactions.length} procedimento(s)
                  </span>
                </div>

                <div className="space-y-1 text-slate-600 text-[11px]">
                  <div className="flex justify-between">
                    <span>Faturamento Bruto:</span>
                    <strong className="text-slate-900">R$ {stats.gross.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Líquido:</span>
                    <strong className="text-blue-700">R$ {stats.net.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Procedimentos:</span>
                    <strong className="text-slate-900">{stats.procedures} ativo(s){stats.cancelled > 0 ? ` (${stats.cancelled} cancelados)` : ''}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Ciclos Arquivados:</span>
                    <strong className="text-slate-900">{filteredCiclos.length} ciclo(s)</strong>
                  </div>
                </div>

                {Object.keys(stats.profMap).length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">Comissões Computadas:</span>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(stats.profMap).map(([name, val]) => (
                        <span key={name} className="bg-white text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          {name}: R$ {(Number(val) || 0).toFixed(2)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT COLUMN: ARCHIVED CYCLES CARDS & VERIFICATION DETAILS (8 COLS) */}
            <div className="lg:col-span-8 space-y-3">
              
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  Ciclos e Lançamentos no Período ({periodTransactions.length} procedimentos | {filteredCiclos.length} ciclos)
                </h4>
                <button
                  onClick={loadData}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Sincronizar</span>
                </button>
              </div>

              {filteredCiclos.length === 0 && periodTransactions.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
                  <Database className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-700">Nenhum lançamento encontrado no período</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Altere as datas inicial e final, escolha outro período ou clique em "Todos" para visualizar todos os lançamentos históricos.
                  </p>
                </div>
              ) : (
                filteredCiclos.map((ciclo, idx) => {
                  const isExpanded = selectedCycleId === ciclo.id;
                  const txList = ciclo.transactions || [];

                  return (
                    <div 
                      key={ciclo.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-slate-300"
                    >
                      {/* CARD HEADER */}
                      <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-blue-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-md uppercase font-mono tracking-wide">
                              Ciclo #{filteredCiclos.length - idx}
                            </span>
                            <span className="text-xs font-black text-slate-900">
                              📅 {ciclo.closedAtFormatted || ciclo.date}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-1">
                            <span>Procedimentos: <strong className="text-slate-800">{ciclo.activeCount || txList.length}</strong></span>
                            {ciclo.cancelledCount > 0 && (
                              <span className="text-rose-600 font-bold">
                                {ciclo.cancelledCount} cancelado(s)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* TOTAL & QUICK ACTIONS */}
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                          <div className="text-right sm:mr-2">
                            <span className="text-[10px] text-slate-400 font-bold block">Total Bruto</span>
                            <span className="text-sm font-black text-emerald-700">
                              R$ {(Number(ciclo.totalGross) || 0).toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* DOWNLOAD WORD */}
                            <button
                              onClick={() => handleDownloadCycleWord(ciclo)}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold p-2 rounded-xl transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                              title="Baixar este ciclo em Word (.doc)"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Word</span>
                            </button>

                            {/* DOWNLOAD EXCEL */}
                            <button
                              onClick={() => handleDownloadCycleExcel(ciclo)}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold p-2 rounded-xl transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                              title="Baixar este ciclo em Excel (.xls)"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Excel</span>
                            </button>

                            {/* TOGGLE EXPAND / VIEW */}
                            <button
                              onClick={() => setSelectedCycleId(isExpanded ? null : ciclo.id)}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold px-2.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                              title="Ver todos os lançamentos deste ciclo na íntegra"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{isExpanded ? 'Ocultar' : 'Ver'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* COMMISSIONS SUMMARY BAR */}
                      {ciclo.commissionsByProf && ciclo.commissionsByProf.length > 0 && (
                        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="text-slate-400 font-bold">Comissões:</span>
                          {ciclo.commissionsByProf.map(p => (
                            <span key={p.professionalName} className="bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                              {p.professionalName}: <strong>R$ {p.amount.toFixed(2)}</strong>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* EXPANDED TRANSACTION LIST / VERIFICATION SCREEN */}
                      {isExpanded && (
                        <div className="p-3 sm:p-4 border-t border-slate-200 bg-white space-y-3 animate-fadeIn">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                            <span>Lançamentos Contabilizados no Ciclo ({txList.length}):</span>
                            <span className="text-[11px] text-slate-400">
                              Valores originais e comissões preservados na íntegra
                            </span>
                          </div>

                          <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead 
                                style={{ backgroundColor: config.corCustom || '#2563eb' }}
                                className="text-white font-bold text-[11px]"
                              >
                                <tr>
                                  <th className="p-2.5 text-center w-16">Horário</th>
                                  <th className="p-2.5">Descrição / Procedimento</th>
                                  <th className="p-2.5 text-center">Pagamento</th>
                                  <th className="p-2.5 text-right">Bruto (R$)</th>
                                  <th className="p-2.5 text-center">Taxa</th>
                                  <th className="p-2.5 text-right">Líquido (R$)</th>
                                  <th className="p-2.5">Comissões</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium">
                                {txList.map(tx => {
                                  const isCancelled = Boolean(tx.deleted || tx.status === 'cancelado');

                                  return (
                                    <tr 
                                      key={tx.id} 
                                      className={isCancelled ? 'bg-rose-50/60 text-rose-800' : 'hover:bg-slate-50 text-slate-800'}
                                    >
                                      <td className="p-2.5 text-center font-mono text-[11px] text-slate-400">
                                        {tx.time}
                                      </td>
                                      <td className="p-2.5">
                                        <div className="font-bold">{tx.description}</div>
                                        {tx.clientName && (
                                          <div className="text-[10px] text-slate-400">Cliente: {tx.clientName}</div>
                                        )}
                                        {isCancelled && (
                                          <span className="inline-block bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded mt-0.5">
                                            Cancelado
                                          </span>
                                        )}
                                      </td>
                                      <td className="p-2.5 text-center uppercase font-mono text-[10px]">
                                        {tx.paymentMethod}
                                      </td>
                                      <td className={`p-2.5 text-right font-bold ${isCancelled ? 'line-through text-rose-600' : 'text-slate-900'}`}>
                                        R$ {(Number(tx.grossAmount) || 0).toFixed(2)}
                                      </td>
                                      <td className="p-2.5 text-center text-[10px] text-slate-400">
                                        {tx.cardFeePercent > 0 ? `${tx.cardFeePercent}%` : '-'}
                                      </td>
                                      <td className={`p-2.5 text-right font-bold ${isCancelled ? 'line-through text-rose-600' : 'text-blue-700'}`}>
                                        R$ {(Number(tx.netAmount) || 0).toFixed(2)}
                                      </td>
                                      <td className="p-2.5 text-[10px]">
                                        {tx.commissions && tx.commissions.length > 0 ? (
                                          <div className="flex flex-wrap gap-1">
                                            {tx.commissions.map(c => (
                                              <span key={c.professionalName} className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-bold">
                                                {c.professionalName}: R$ {c.amount.toFixed(2)}
                                              </span>
                                            ))}
                                          </div>
                                        ) : '-'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                        </div>
                      )}

                    </div>
                  );
                })
              )}

            </div>

          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Todos os dados são criptografados e sincronizados com a nuvem Firestore em tempo real.</span>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white font-bold px-5 py-2 rounded-xl transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
