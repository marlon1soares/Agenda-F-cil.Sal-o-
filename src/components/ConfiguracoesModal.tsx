import React, { useState, useRef, useEffect } from 'react';
import { SalonConfig, ScheduleConfig, DayScheduleRule } from '../types';
import { THEMES } from '../data/mockData';
import { 
  DEFAULT_SCHEDULE_CONFIG, DAY_NAMES_PT, DAY_SHORT_NAMES_PT,
  getUpcomingDays, applyScheduleToNextDays, getScheduleRuleForDate
} from '../utils/schedule';
import { 
  Settings, X, Upload, Palette, Save, QrCode, CreditCard, 
  Building2, Clock, Calendar, CheckCircle2, AlertCircle, Sparkles, 
  RotateCcw, ArrowRight, Zap, Check, ShieldCheck, Sun, Moon
} from 'lucide-react';

interface ConfiguracoesModalProps {
  isOpen: boolean;
  config: SalonConfig;
  onClose: () => void;
  onSaveConfig: (cfg: SalonConfig) => void;
}

export const ConfiguracoesModal: React.FC<ConfiguracoesModalProps> = ({
  isOpen,
  config,
  onClose,
  onSaveConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'horarios' | 'pagamentos'>('visual');
  const [nomeSalao, setNomeSalao] = useState(config.nomeSalao);
  const [logoUrl, setLogoUrl] = useState(config.logoUrl);
  const [bgHeaderUrl, setBgHeaderUrl] = useState(config.bgHeaderUrl);
  const [temaKey, setTemaKey] = useState(config.temaKey || 'azul');
  const [corCustom, setCorCustom] = useState(config.corCustom || '#2563eb');

  // Schedule & Working Hours Settings
  const initialSchedule: ScheduleConfig = config.scheduleConfig || DEFAULT_SCHEDULE_CONFIG;
  const [defaultStartTime, setDefaultStartTime] = useState(initialSchedule.defaultStartTime || '09:00');
  const [defaultEndTime, setDefaultEndTime] = useState(initialSchedule.defaultEndTime || '20:00');
  const [defaultIntervalMinutes, setDefaultIntervalMinutes] = useState(initialSchedule.defaultIntervalMinutes || 60);
  const [weeklySchedule, setWeeklySchedule] = useState<Record<number, DayScheduleRule>>(
    initialSchedule.weeklySchedule || DEFAULT_SCHEDULE_CONFIG.weeklySchedule
  );
  const [specificDateSchedule, setSpecificDateSchedule] = useState<Record<string, DayScheduleRule>>(
    initialSchedule.specificDateSchedule || {}
  );
  const [scheduleSubTab, setScheduleSubTab] = useState<'quinzena' | 'semanal' | 'geral'>('quinzena');
  const [batchFeedback, setBatchFeedback] = useState<string | null>(null);

  // Custom date picker for dates outside next 15 days
  const [customDateInput, setCustomDateInput] = useState('');

  // Payment Receiving Settings (unified for store, catalog and clients)
  const [chavePix, setChavePix] = useState(config.chavePix || '');
  const [tipoChavePix, setTipoChavePix] = useState<any>(config.tipoChavePix || 'email');
  const [titularPix, setTitularPix] = useState(config.titularPix || '');
  const [cidadePix, setCidadePix] = useState(config.cidadePix || 'São Paulo');

  // Bank Account for Credit Card Receipts / Deposit
  const [bancoCartao, setBancoCartao] = useState(config.bancoCartao || '');
  const [agenciaCartao, setAgenciaCartao] = useState(config.agenciaCartao || '');
  const [contaCartao, setContaCartao] = useState(config.contaCartao || '');
  const [tipoContaCartao, setTipoContaCartao] = useState<any>(config.tipoContaCartao || 'corrente');
  const [titularCartao, setTitularCartao] = useState(config.titularCartao || '');
  const [cpfCnpjCartao, setCpfCnpjCartao] = useState(config.cpfCnpjCartao || '');
  const [linkCartao, setLinkCartao] = useState(config.linkCartao || '');
  const [instrucoesPagamento, setInstrucoesPagamento] = useState(config.instrucoesPagamento || '');

  const logoFileRef = useRef<HTMLInputElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);

  // Re-sync when config changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setNomeSalao(config.nomeSalao || '');
      setLogoUrl(config.logoUrl || '');
      setBgHeaderUrl(config.bgHeaderUrl || '');
      setTemaKey(config.temaKey || 'azul');
      setCorCustom(config.corCustom || '#2563eb');
      
      const sc = config.scheduleConfig || DEFAULT_SCHEDULE_CONFIG;
      setDefaultStartTime(sc.defaultStartTime || '09:00');
      setDefaultEndTime(sc.defaultEndTime || '20:00');
      setDefaultIntervalMinutes(sc.defaultIntervalMinutes || 60);
      setWeeklySchedule(sc.weeklySchedule || DEFAULT_SCHEDULE_CONFIG.weeklySchedule);
      setSpecificDateSchedule(sc.specificDateSchedule || {});

      setChavePix(config.chavePix || '');
      setTipoChavePix(config.tipoChavePix || 'email');
      setTitularPix(config.titularPix || '');
      setCidadePix(config.cidadePix || 'São Paulo');

      setBancoCartao(config.bancoCartao || '');
      setAgenciaCartao(config.agenciaCartao || '');
      setContaCartao(config.contaCartao || '');
      setTipoContaCartao(config.tipoContaCartao || 'corrente');
      setTitularCartao(config.titularCartao || '');
      setCpfCnpjCartao(config.cpfCnpjCartao || '');
      setLinkCartao(config.linkCartao || '');
      setInstrucoesPagamento(config.instrucoesPagamento || '');
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => setLogoUrl(evt.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => setBgHeaderUrl(evt.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSelectPresetTheme = (key: string) => {
    setTemaKey(key);
    const preset = THEMES[key];
    if (preset) {
      setCorCustom(preset.headerBg);
    }
  };

  // Schedule Manipulation Handlers
  const handleUpdateWeeklyDay = (dayIndex: number, partial: Partial<DayScheduleRule>) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [dayIndex]: {
        ...(prev[dayIndex] || {
          active: true,
          startTime: defaultStartTime,
          endTime: defaultEndTime,
          slotIntervalMinutes: defaultIntervalMinutes
        }),
        ...partial
      }
    }));
  };

  const handleUpdateSpecificDate = (dateStr: string, partial: Partial<DayScheduleRule>) => {
    setSpecificDateSchedule(prev => {
      const currentRule = getScheduleRuleForDate(dateStr, {
        defaultStartTime,
        defaultEndTime,
        defaultIntervalMinutes,
        weeklySchedule,
        specificDateSchedule: prev
      });

      return {
        ...prev,
        [dateStr]: {
          ...currentRule,
          ...partial,
          customLabel: partial.customLabel || 'Horário Personalizado'
        }
      };
    });
  };

  const handleRemoveSpecificDate = (dateStr: string) => {
    setSpecificDateSchedule(prev => {
      const copy = { ...prev };
      delete copy[dateStr];
      return copy;
    });
  };

  const handleApplyToWeek = () => {
    const today = new Date().toISOString().split('T')[0];
    const ruleToApply: DayScheduleRule = {
      active: true,
      startTime: defaultStartTime,
      endTime: defaultEndTime,
      slotIntervalMinutes: defaultIntervalMinutes,
      customLabel: `Semana (${defaultStartTime} às ${defaultEndTime})`
    };
    const updated = applyScheduleToNextDays(today, 7, ruleToApply, specificDateSchedule);
    setSpecificDateSchedule(updated);
    setBatchFeedback("✅ Horário configurado e aplicado para os próximos 7 dias (Semana Toda)!");
    setTimeout(() => setBatchFeedback(null), 4000);
  };

  const handleApplyToFortnight = () => {
    const today = new Date().toISOString().split('T')[0];
    const ruleToApply: DayScheduleRule = {
      active: true,
      startTime: defaultStartTime,
      endTime: defaultEndTime,
      slotIntervalMinutes: defaultIntervalMinutes,
      customLabel: `Quinzena (${defaultStartTime} às ${defaultEndTime})`
    };
    const updated = applyScheduleToNextDays(today, 15, ruleToApply, specificDateSchedule);
    setSpecificDateSchedule(updated);
    setBatchFeedback("✅ Horário configurado e aplicado para os próximos 15 dias (Quinzena Toda)!");
    setTimeout(() => setBatchFeedback(null), 4000);
  };

  const handleClearSpecificOverrides = () => {
    if (confirm("Deseja resetar todas as exceções de datas e voltar para as regras semanais padrão?")) {
      setSpecificDateSchedule({});
      setBatchFeedback("🔄 Exceções de datas resetadas para o horário padrão semanal!");
      setTimeout(() => setBatchFeedback(null), 4000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const constructedSchedule: ScheduleConfig = {
      defaultStartTime,
      defaultEndTime,
      defaultIntervalMinutes: Number(defaultIntervalMinutes) || 60,
      weeklySchedule,
      specificDateSchedule
    };

    const updated: SalonConfig = {
      ...config,
      nomeSalao: nomeSalao.trim() || 'Controle Salão dos Parças',
      logoUrl: logoUrl.trim(),
      bgHeaderUrl: bgHeaderUrl.trim(),
      temaKey,
      corCustom,
      scheduleConfig: constructedSchedule,
      chavePix: chavePix.trim(),
      tipoChavePix,
      titularPix: titularPix.trim(),
      cidadePix: cidadePix.trim(),
      bancoCartao: bancoCartao.trim(),
      agenciaCartao: agenciaCartao.trim(),
      contaCartao: contaCartao.trim(),
      tipoContaCartao,
      titularCartao: titularCartao.trim(),
      cpfCnpjCartao: cpfCnpjCartao.trim(),
      linkCartao: linkCartao.trim(),
      instrucoesPagamento: instrucoesPagamento.trim()
    };

    onSaveConfig(updated);
    onClose();
  };

  // Upcoming 15 days calculation
  const upcomingDays = getUpcomingDays(15, undefined, {
    defaultStartTime,
    defaultEndTime,
    defaultIntervalMinutes,
    weeklySchedule,
    specificDateSchedule
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-800 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-400" />
              <span>Configurações do Estabelecimento</span>
            </h3>
            <p className="text-xs text-slate-400">
              Personalize a identidade visual, horários da agenda e dados de recebimento (Pix e Cartão)
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector - 3 TABS (Visual, Horários da Agenda, Pagamentos) */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-3 sm:px-4 pt-2 gap-1.5 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('visual')}
            className={`px-3 sm:px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition-all flex items-center gap-1.5 border-t border-x shrink-0 ${
              activeTab === 'visual'
                ? 'bg-slate-900 text-blue-400 border-slate-800 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/50'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Identidade Visual & Nome</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('horarios')}
            className={`px-3 sm:px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition-all flex items-center gap-1.5 border-t border-x shrink-0 ${
              activeTab === 'horarios'
                ? 'bg-slate-900 text-amber-400 border-slate-800 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>⏰ Horários da Agenda</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pagamentos')}
            className={`px-3 sm:px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition-all flex items-center gap-1.5 border-t border-x shrink-0 ${
              activeTab === 'pagamentos'
                ? 'bg-slate-900 text-emerald-400 border-slate-800 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/50'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>💳 Recebimento Pix & Cartão</span>
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          
          {/* TAB 1: IDENTIDADE VISUAL */}
          {activeTab === 'visual' && (
            <div className="space-y-4">
              {/* Salon Name */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">Nome do Salão / Barbearia</label>
                <input
                  type="text"
                  value={nomeSalao}
                  onChange={(e) => setNomeSalao(e.target.value)}
                  placeholder="Ex: Controle Salão dos Parças"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-blue-500 font-medium text-xs"
                />
              </div>

              {/* Logo URL / File */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">Imagem do Logo Central</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="URL da Imagem..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-blue-500 text-xs"
                  />
                  <input
                    type="file"
                    ref={logoFileRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => logoFileRef.current?.click()}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-2 rounded-xl transition-colors flex items-center gap-1 shrink-0 border border-slate-700"
                  >
                    <Upload className="w-3.5 h-3.5" /> Arquivo
                  </button>
                </div>
              </div>

              {/* Header BG Banner */}
              <div>
                <label className="block font-bold text-sky-400 mb-1">📂 Imagem de Fundo do Cabeçalho</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={bgHeaderUrl}
                    onChange={(e) => setBgHeaderUrl(e.target.value)}
                    placeholder="URL da Imagem de fundo..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-blue-500 text-xs"
                  />
                  <input
                    type="file"
                    ref={bgFileRef}
                    onChange={handleBgUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => bgFileRef.current?.click()}
                    className="bg-sky-700 hover:bg-sky-600 text-white font-bold px-3 py-2 rounded-xl transition-colors flex items-center gap-1 shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" /> Arquivo
                  </button>
                </div>
              </div>

              {/* Theme Presets */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">Tema de Cores Padrão</label>
                <select
                  value={temaKey}
                  onChange={(e) => handleSelectPresetTheme(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-blue-500 font-bold text-xs"
                >
                  {Object.values(THEMES).map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>

              {/* Custom Hex Color Picker */}
              <div>
                <label className="block font-bold text-amber-400 mb-1">🎨 Personalizar Cor Exata (Hex)</label>
                <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <input
                    type="color"
                    value={corCustom}
                    onChange={(e) => setCorCustom(e.target.value)}
                    className="w-10 h-8 rounded border-0 bg-transparent cursor-pointer"
                  />
                  <span className="text-xs text-slate-400 font-mono font-bold">{corCustom}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HORÁRIOS DA AGENDA */}
          {activeTab === 'horarios' && (
            <div className="space-y-4">
              
              {/* Introduction Banner */}
              <div className="p-3.5 bg-amber-950/40 border border-amber-500/30 rounded-2xl text-amber-200 text-xs leading-relaxed space-y-1">
                <p className="font-extrabold flex items-center gap-1.5 text-amber-300">
                  <Clock className="w-4 h-4" /> Gestão Completa dos Horários da Agenda
                </p>
                <p className="text-[11px] text-slate-300">
                  Configure o horário de abertura e encerramento. Caso precise <strong>abrir mais tarde</strong> ou <strong>sair mais cedo</strong> nos próximos dias, ajuste a quinzena inteira ou dias específicos com facilidade.
                </p>
              </div>

              {/* Feedback toast */}
              {batchFeedback && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-500 text-emerald-200 rounded-xl font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{batchFeedback}</span>
                </div>
              )}

              {/* Sub-Tabs: Quinzena (Próximos 15 dias) | Semana Padrão | Config Geral */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
                <button
                  type="button"
                  onClick={() => setScheduleSubTab('quinzena')}
                  className={`flex-1 py-1.5 text-[11px] font-extrabold rounded-lg transition-all flex items-center justify-center gap-1 ${
                    scheduleSubTab === 'quinzena'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Próximos 15 Dias (Quinzena)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScheduleSubTab('semanal')}
                  className={`flex-1 py-1.5 text-[11px] font-extrabold rounded-lg transition-all flex items-center justify-center gap-1 ${
                    scheduleSubTab === 'semanal'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Dias da Semana (Seg a Dom)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScheduleSubTab('geral')}
                  className={`flex-1 py-1.5 text-[11px] font-extrabold rounded-lg transition-all flex items-center justify-center gap-1 ${
                    scheduleSubTab === 'geral'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Horário Geral</span>
                </button>
              </div>

              {/* SUBTAB 1: QUINZENA (15 DIAS) */}
              {scheduleSubTab === 'quinzena' && (
                <div className="space-y-3">
                  {/* Quick Batch Actions */}
                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-300 text-[11px] flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" /> Ações Rápidas em Lote:
                      </span>
                      {Object.keys(specificDateSchedule).length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearSpecificOverrides}
                          className="text-[10px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 hover:underline"
                        >
                          <RotateCcw className="w-3 h-3" /> Limpar Exceções ({Object.keys(specificDateSchedule).length})
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleApplyToWeek}
                        className="bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 font-extrabold p-2 rounded-xl text-left flex items-center justify-between transition-colors group cursor-pointer"
                      >
                        <div>
                          <div className="text-xs font-black">⚡ Aplicar para a Semana Toda</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Próximos 7 dias: {defaultStartTime} às {defaultEndTime}
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-1 transition-transform" />
                      </button>

                      <button
                        type="button"
                        onClick={handleApplyToFortnight}
                        className="bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 font-extrabold p-2 rounded-xl text-left flex items-center justify-between transition-colors group cursor-pointer"
                      >
                        <div>
                          <div className="text-xs font-black">🗓️ Aplicar para a Quinzena Toda</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Próximos 15 dias: {defaultStartTime} às {defaultEndTime}
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>

                  {/* 15 Days List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] font-bold text-slate-400">
                        Ajuste dia a dia (abrir mais tarde ou sair mais cedo):
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">15 dias</span>
                    </div>

                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {upcomingDays.map((day) => {
                        const rule = day.rule;
                        return (
                          <div
                            key={day.date}
                            className={`p-3 rounded-2xl border transition-all ${
                              !rule.active
                                ? 'bg-slate-950/60 border-slate-800 opacity-70'
                                : day.isCustomized
                                ? 'bg-amber-950/20 border-amber-500/40 shadow-xs'
                                : 'bg-slate-950 border-slate-800'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              {/* Date identifier */}
                              <div className="flex items-center gap-2.5">
                                <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center font-mono font-bold text-xs shrink-0 border ${
                                  day.isToday 
                                    ? 'bg-blue-600 text-white border-blue-400'
                                    : day.isTomorrow
                                    ? 'bg-amber-600 text-white border-amber-400'
                                    : 'bg-slate-900 text-slate-300 border-slate-700'
                                }`}>
                                  <span className="text-[9px] uppercase leading-none">{day.dayOfWeekShort}</span>
                                  <span className="text-sm font-black leading-none mt-0.5">{day.dayOfMonth}</span>
                                </div>

                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-extrabold text-white text-xs">
                                      {day.dayOfWeekName}
                                    </span>
                                    {day.isToday && (
                                      <span className="text-[9px] bg-blue-500/20 text-blue-300 font-bold px-1.5 py-0.2 rounded border border-blue-500/40">
                                        Hoje
                                      </span>
                                    )}
                                    {day.isTomorrow && (
                                      <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-500/40">
                                        Amanhã
                                      </span>
                                    )}
                                    {day.isCustomized && (
                                      <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-500/40">
                                        Personalizado
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    {day.date} • {rule.active ? `${rule.startTime} às ${rule.endTime}` : 'Fechado (Folga)'}
                                  </div>
                                </div>
                              </div>

                              {/* Controls */}
                              <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                                {/* Toggle Active / Closed */}
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSpecificDate(day.date, { active: !rule.active })}
                                  className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] transition-colors flex items-center gap-1 ${
                                    rule.active
                                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
                                      : 'bg-rose-950/80 text-rose-300 border border-rose-800 hover:bg-rose-900'
                                  }`}
                                >
                                  {rule.active ? 'Aberto' : 'Fechado / Folga'}
                                </button>

                                {rule.active && (
                                  <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-xl border border-slate-700">
                                    <span className="text-[10px] text-slate-400 font-bold">Início:</span>
                                    <input
                                      type="time"
                                      value={rule.startTime}
                                      onChange={(e) => handleUpdateSpecificDate(day.date, { startTime: e.target.value })}
                                      className="bg-slate-950 text-white font-mono font-bold text-[11px] rounded px-1 py-0.5 border border-slate-700 outline-none focus:border-amber-500"
                                    />
                                    <span className="text-[10px] text-slate-400 font-bold ml-1">Fim:</span>
                                    <input
                                      type="time"
                                      value={rule.endTime}
                                      onChange={(e) => handleUpdateSpecificDate(day.date, { endTime: e.target.value })}
                                      className="bg-slate-950 text-white font-mono font-bold text-[11px] rounded px-1 py-0.5 border border-slate-700 outline-none focus:border-amber-500"
                                    />
                                  </div>
                                )}

                                {day.isCustomized && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSpecificDate(day.date)}
                                    title="Restaurar para a regra padrão do dia da semana"
                                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Other future custom date selector */}
                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold text-slate-300 block">
                        Definir data especial além da quinzena:
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Escolha um feriado ou recesso no calendário
                      </span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input
                        type="date"
                        value={customDateInput}
                        onChange={(e) => setCustomDateInput(e.target.value)}
                        className="flex-1 sm:flex-initial px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customDateInput) {
                            handleUpdateSpecificDate(customDateInput, {
                              active: true,
                              startTime: defaultStartTime,
                              endTime: defaultEndTime,
                              slotIntervalMinutes: defaultIntervalMinutes
                            });
                            setBatchFeedback(`Data ${customDateInput} adicionada à lista de horários especiais!`);
                          }
                        }}
                        disabled={!customDateInput}
                        className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-colors shrink-0"
                      >
                        Configurar Data
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 2: DIAS DA SEMANA (SEG A DOM) */}
              {scheduleSubTab === 'semanal' && (
                <div className="space-y-3">
                  <div className="text-[11px] text-slate-400 px-1">
                    Horários fixos padrão para cada dia da semana:
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
                      const dayRule = weeklySchedule[dayIdx] || {
                        active: dayIdx !== 0,
                        startTime: defaultStartTime,
                        endTime: defaultEndTime,
                        slotIntervalMinutes: defaultIntervalMinutes
                      };

                      return (
                        <div
                          key={dayIdx}
                          className={`p-3 rounded-2xl border transition-all ${
                            !dayRule.active
                              ? 'bg-slate-950/60 border-slate-800 opacity-70'
                              : 'bg-slate-950 border-slate-800'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2">
                              <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                dayRule.active ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-500'
                              }`}>
                                {DAY_SHORT_NAMES_PT[dayIdx]}
                              </span>
                              <div>
                                <span className="font-extrabold text-white text-xs block">
                                  {DAY_NAMES_PT[dayIdx]}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {dayRule.active ? `${dayRule.startTime} às ${dayRule.endTime}` : 'Fechado (Folga)'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleUpdateWeeklyDay(dayIdx, { active: !dayRule.active })}
                                className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] transition-colors ${
                                  dayRule.active
                                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                                    : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                                }`}
                              >
                                {dayRule.active ? 'Aberto' : 'Fechado / Folga'}
                              </button>

                              {dayRule.active && (
                                <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-xl border border-slate-700">
                                  <span className="text-[10px] text-slate-400 font-bold">Início:</span>
                                  <input
                                    type="time"
                                    value={dayRule.startTime}
                                    onChange={(e) => handleUpdateWeeklyDay(dayIdx, { startTime: e.target.value })}
                                    className="bg-slate-950 text-white font-mono font-bold text-[11px] rounded px-1 py-0.5 border border-slate-700 outline-none focus:border-amber-500"
                                  />
                                  <span className="text-[10px] text-slate-400 font-bold ml-1">Fim:</span>
                                  <input
                                    type="time"
                                    value={dayRule.endTime}
                                    onChange={(e) => handleUpdateWeeklyDay(dayIdx, { endTime: e.target.value })}
                                    className="bg-slate-950 text-white font-mono font-bold text-[11px] rounded px-1 py-0.5 border border-slate-700 outline-none focus:border-amber-500"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SUBTAB 3: GERAL */}
              {scheduleSubTab === 'geral' && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Horário de Início Padrão:
                      </label>
                      <input
                        type="time"
                        value={defaultStartTime}
                        onChange={(e) => setDefaultStartTime(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white font-mono font-bold rounded-xl px-3 py-2 text-xs focus:border-amber-500 outline-none"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Horário em que o salão costuma abrir</p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Horário de Encerramento Padrão:
                      </label>
                      <input
                        type="time"
                        value={defaultEndTime}
                        onChange={(e) => setDefaultEndTime(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white font-mono font-bold rounded-xl px-3 py-2 text-xs focus:border-amber-500 outline-none"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Último horário disponível de atendimento</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Intervalo entre Agendamentos:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[30, 45, 60, 90].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setDefaultIntervalMinutes(mins)}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold font-mono transition-all cursor-pointer ${
                            defaultIntervalMinutes === mins
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-xs'
                              : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          {mins} minutos
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Duração média da grade de horários gerada na agenda</p>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: RECEBIMENTO PIX & CARTÃO */}
          {activeTab === 'pagamentos' && (
            <div className="space-y-4">
              {/* Payment Section Note */}
              <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl text-emerald-200 text-xs leading-relaxed space-y-1">
                <p className="font-extrabold flex items-center gap-1.5 text-emerald-300">
                  <CreditCard className="w-4 h-4" /> Configuração Unificada de Pagamentos
                </p>
                <p className="text-[11px] text-slate-300">
                  A chave Pix e a conta bancária para compras no cartão configuradas aqui serão exibidas automaticamente para todos os seus clientes em todos os produtos do catálogo e nos agendamentos.
                </p>
              </div>

              {/* PIX SECTION */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-extrabold text-purple-300 flex items-center gap-1.5 text-xs">
                    <QrCode className="w-4 h-4" /> Chave Pix da Loja / Salão (Para todos os produtos)
                  </span>
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 font-mono px-2 py-0.5 rounded-full border border-purple-500/30">
                    Visível ao Cliente
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Tipo de Chave:</label>
                    <select
                      value={tipoChavePix}
                      onChange={(e) => setTipoChavePix(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-2.5 py-2 text-xs focus:border-purple-500 outline-none"
                    >
                      <option value="email">E-mail</option>
                      <option value="cpf">CPF</option>
                      <option value="cnpj">CNPJ</option>
                      <option value="telefone">Celular / WhatsApp</option>
                      <option value="aleatoria">Chave Aleatória (EVP)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Número / Chave Pix:</label>
                    <input
                      type="text"
                      value={chavePix}
                      onChange={(e) => setChavePix(e.target.value)}
                      placeholder="Ex: 11999998888 ou financeiro@loja.com"
                      className="w-full bg-slate-900 border border-slate-700 text-white font-mono rounded-xl px-3 py-2 text-xs focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Nome do Titular / Beneficiário Pix:</label>
                    <input
                      type="text"
                      value={titularPix}
                      onChange={(e) => setTitularPix(e.target.value)}
                      placeholder="Ex: Marlon Soares / Barbearia Ltda"
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Cidade da Conta Pix:</label>
                    <input
                      type="text"
                      value={cidadePix}
                      onChange={(e) => setCidadePix(e.target.value)}
                      placeholder="Ex: São Paulo"
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* CARD BANK ACCOUNT SECTION */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-sky-500/30 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-extrabold text-sky-300 flex items-center gap-1.5 text-xs">
                    <Building2 className="w-4 h-4" /> Conta Bancária para Receber Compras em Cartão de Crédito
                  </span>
                  <span className="text-[10px] bg-sky-500/20 text-sky-300 font-mono px-2 py-0.5 rounded-full border border-sky-500/30">
                    Depósito do Cartão
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Banco / Adquirente:</label>
                    <input
                      type="text"
                      value={bancoCartao}
                      onChange={(e) => setBancoCartao(e.target.value)}
                      placeholder="Ex: Nubank, Itaú, Stone, InfinitePay..."
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-sky-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Tipo de Conta:</label>
                    <select
                      value={tipoContaCartao}
                      onChange={(e) => setTipoContaCartao(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-2.5 py-2 text-xs focus:border-sky-500 outline-none"
                    >
                      <option value="corrente">Conta Corrente (PJ / PF)</option>
                      <option value="poupanca">Conta Poupança</option>
                      <option value="pagamento">Conta de Pagamento</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Agência:</label>
                    <input
                      type="text"
                      value={agenciaCartao}
                      onChange={(e) => setAgenciaCartao(e.target.value)}
                      placeholder="Ex: 0001"
                      className="w-full bg-slate-900 border border-slate-700 text-white font-mono rounded-xl px-3 py-2 text-xs focus:border-sky-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Número da Conta:</label>
                    <input
                      type="text"
                      value={contaCartao}
                      onChange={(e) => setContaCartao(e.target.value)}
                      placeholder="Ex: 1234567-8"
                      className="w-full bg-slate-900 border border-slate-700 text-white font-mono rounded-xl px-3 py-2 text-xs focus:border-sky-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Titular da Conta de Cartão:</label>
                    <input
                      type="text"
                      value={titularCartao}
                      onChange={(e) => setTitularCartao(e.target.value)}
                      placeholder="Nome completo ou Razão Social"
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-sky-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">CPF ou CNPJ do Titular:</label>
                    <input
                      type="text"
                      value={cpfCnpjCartao}
                      onChange={(e) => setCpfCnpjCartao(e.target.value)}
                      placeholder="Ex: 00.000.000/0001-00"
                      className="w-full bg-slate-900 border border-slate-700 text-white font-mono rounded-xl px-3 py-2 text-xs focus:border-sky-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Link de Pagamento no Cartão (Opcional):
                  </label>
                  <input
                    type="url"
                    value={linkCartao}
                    onChange={(e) => setLinkCartao(e.target.value)}
                    placeholder="https://mpago.la/... ou https://link.stone.com.br/..."
                    className="w-full bg-slate-900 border border-slate-700 text-white font-mono rounded-xl px-3 py-2 text-xs focus:border-sky-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Se preenchido, os clientes poderão clicar e pagar com cartão online diretamente pelo link.
                  </p>
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">Instruções de Pagamento aos Clientes:</label>
                <textarea
                  rows={2}
                  value={instrucoesPagamento}
                  onChange={(e) => setInstrucoesPagamento(e.target.value)}
                  placeholder="Ex: Aceitamos Pix imediato ou parcelamento no cartão em até 12x..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-emerald-500 text-xs resize-none"
                />
              </div>
            </div>
          )}

          {/* Action button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-3 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Save className="w-4 h-4" /> SALVAR TODAS AS ALTERAÇÕES
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};


