import React, { useState } from 'react';
import { Transaction, Appointment, SalonConfig, Professional } from '../types';
import { DollarSign, Calendar, TrendingUp, Users, Award, CreditCard, Sparkles, ArrowUpRight, CheckCircle2, Clock, Heart } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

interface DashboardViewProps {
  transactions: Transaction[];
  appointments: Record<string, Record<string, Appointment>>;
  professionals: Professional[];
  config: SalonConfig;
  onNavigateToCaixa: () => void;
  onNavigateToAgenda: () => void;
  onOpenClientLink?: () => void;
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  appointments,
  professionals,
  config,
  onNavigateToCaixa,
  onNavigateToAgenda,
  onOpenClientLink,
}) => {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const todayISO = new Date().toISOString().split('T')[0];

  // Calculate Today KPIs
  const todayTransactions = transactions.filter(t => t.date === todayISO);
  const totalRevenueToday = todayTransactions.reduce((acc, t) => acc + t.grossAmount, 0);
  const totalNetToday = todayTransactions.reduce((acc, t) => acc + t.netAmount, 0);
  const totalServicesToday = todayTransactions.length;

  // Calculate Commissions Today
  const totalCommissionsToday = todayTransactions.reduce((acc, t) => {
    const commTotal = t.commissions.reduce((cAcc, c) => cAcc + c.amount, 0);
    return acc + commTotal;
  }, 0);

  // Today Appointments Stats
  const todayAppointments = Object.values(appointments[todayISO] || {}) as Appointment[];
  const bookedCount = todayAppointments.filter(a => a.status === 'agendado').length;
  const completedCount = todayAppointments.filter(a => a.status === 'concluido').length;

  // Revenue By Payment Method for Chart
  const paymentMethodData = ['pix', 'cartao_credito', 'cartao_debito', 'dinheiro', 'outro'].map(pm => {
    const sum = transactions
      .filter(t => t.paymentMethod === pm)
      .reduce((acc, t) => acc + t.grossAmount, 0);
    return {
      name: pm === 'cartao_credito' ? 'Crédito' : pm === 'cartao_debito' ? 'Débito' : pm.toUpperCase(),
      value: sum
    };
  }).filter(d => d.value > 0);

  // Performance per professional
  const professionalPerformance = config.profs.map(p => {
    const earnings = transactions.reduce((acc, t) => {
      const comm = t.commissions.find(c => c.professionalName === p.nome);
      return acc + (comm ? comm.amount : 0);
    }, 0);
    return {
      name: p.nome,
      percentage: p.porc,
      commissionAmount: earnings
    };
  });

  // Fetch AI Financial Advice
  const handleFetchAIAdvice = async () => {
    setLoadingAi(true);
    setAiInsight(null);
    try {
      const prompt = `Faça uma análise rápida dos dados financeiros de hoje do salão "${config.nomeSalao}":
- Faturamento Bruto de Hoje: R$ ${totalRevenueToday.toFixed(2)}
- Quantidade de Lançamentos: ${totalServicesToday}
- Comissões da Equipe: R$ ${totalCommissionsToday.toFixed(2)}
- Agendamentos Hoje: ${bookedCount} pendentes, ${completedCount} concluídos.

Dê 3 recomendações curtas e motivadoras para o administrador melhorar o faturamento e a gestão do salão hoje.`;

      const res = await fetch('/api/salon-ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, contextType: 'financial_analysis' })
      });
      const data = await res.json();
      if (data.success) {
        setAiInsight(data.result);
      } else {
        setAiInsight("Não foi possível carregar a análise automática neste momento.");
      }
    } catch {
      setAiInsight("Erro de conexão com o assistente IA.");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Welcome & KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Faturamento Bruto */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Faturamento Hoje</span>
            <div className="text-2xl font-black text-slate-900 mt-1 font-display">
              R$ {totalRevenueToday.toFixed(2)}
            </div>
            <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3.5 h-3.5" /> {totalServicesToday} procedimento(s)
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Faturamento Líquido */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Líquido do Salão</span>
            <div className="text-2xl font-black text-emerald-600 mt-1 font-display">
              R$ {totalNetToday.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Após taxas de cartão
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Comissões Equipe */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Comissões Hoje</span>
            <div className="text-2xl font-black text-purple-600 mt-1 font-display">
              R$ {totalCommissionsToday.toFixed(2)}
            </div>
            <div className="text-[11px] text-purple-700 font-medium mt-1">
              Distribuído aos profissionais
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: Agendamentos */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Agenda Hoje</span>
            <div className="text-2xl font-black text-slate-900 mt-1 font-display">
              {todayAppointments.length} horários
            </div>
            <div className="text-[11px] font-semibold text-sky-600 flex items-center gap-1 mt-1">
              <Clock className="w-3.5 h-3.5" /> {bookedCount} pendente(s) • {completedCount} ok
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* AI Salon Advisor Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-indigo-900/60 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-600/40 text-amber-300 border border-indigo-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold">Assistente Inteligente de Gestão</h3>
              <p className="text-xs text-slate-300">Análise automática de métricas financeiras e dicas práticas em tempo real</p>
            </div>
          </div>
          <button
            onClick={handleFetchAIAdvice}
            disabled={loadingAi}
            className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{loadingAi ? 'Analisando...' : 'Gerar Análise Financeira'}</span>
          </button>
        </div>

        {aiInsight && (
          <div className="bg-white/10 backdrop-blur-xs p-4 rounded-xl border border-white/10 text-xs leading-relaxed text-indigo-100 space-y-2">
            <div className="font-bold text-amber-300 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Diagnóstico Financeiro Inteligente:
            </div>
            <div className="whitespace-pre-line text-slate-200">{aiInsight}</div>
          </div>
        )}
      </div>

      {/* Charts & Quick Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Performance per Stylist Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Comissões por Profissional (Hoje)</h3>
              <p className="text-xs text-slate-500">Divisão de repasse de comissões por profissional cadastrado</p>
            </div>
            <button
              onClick={onNavigateToCaixa}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Ver Caixa</span> <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={professionalPerformance} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(val) => `R$${val}`} />
                <Tooltip formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Comissão']} />
                <Bar dataKey="commissionAmount" fill={config.corCustom || '#2563eb'} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Meios de Pagamento</h3>
            <p className="text-xs text-slate-500">Distribuição do faturamento por forma de pagamento</p>
          </div>

          {paymentMethodData.length > 0 ? (
            <div className="h-52 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentMethodData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Valor']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center text-xs text-slate-400 py-12">
              Nenhum lançamento registrado hoje.
            </div>
          )}

          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            {paymentMethodData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="font-medium text-slate-700">{d.name}</span>
                </div>
                <span className="font-bold text-slate-900">R$ {d.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Quick Launch Buttons & Today Schedule Quick Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Quick Actions Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" /> Ações Rápidas do Administrador
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onNavigateToCaixa}
              className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/80 text-blue-900 transition-all text-left group"
            >
              <div className="text-xs font-bold text-blue-700">💳 Novo Lançamento</div>
              <div className="text-[11px] text-blue-600 mt-0.5">Lançar no caixa com comando rápido</div>
            </button>

            <button
              onClick={onNavigateToAgenda}
              className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100/80 text-purple-900 transition-all text-left group"
            >
              <div className="text-xs font-bold text-purple-700">📅 Agendar Cliente</div>
              <div className="text-[11px] text-purple-600 mt-0.5">Reservar horário na agenda geral</div>
            </button>
          </div>
        </div>

        {/* Today Upcoming Appointments Preview */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" /> Próximos Agendamentos de Hoje
            </h3>
            <button onClick={onNavigateToAgenda} className="text-xs font-bold text-emerald-600 hover:text-emerald-700">
              Ver Agenda
            </button>
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {todayAppointments.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-6">Nenhum agendamento marcado para hoje.</div>
            ) : (
              todayAppointments.map(ap => (
                <div key={ap.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="font-extrabold text-slate-900 bg-white px-2 py-1 rounded border border-slate-200">
                      {ap.timeSlot}
                    </span>
                    <div>
                      <div className="font-bold text-slate-800">{ap.clientName || ap.notes || 'Agendamento'}</div>
                      <div className="text-[11px] text-slate-500">{ap.serviceName || 'Procedimento'} • Prof: {ap.professionalName}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    ap.status === 'concluido' ? 'bg-emerald-100 text-emerald-800' :
                    ap.status === 'agendado' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {ap.status.toUpperCase()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
