import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { CaixaView } from './components/CaixaView';
import { AgendaView } from './components/AgendaView';
import { ProfissionaisView } from './components/ProfissionaisView';
import { ServicosView } from './components/ServicosView';
import { ClientesView } from './components/ClientesView';
import { CatalogoView } from './components/CatalogoView';
import { ConfiguracoesModal } from './components/ConfiguracoesModal';
import { AdminPasswordModal } from './components/AdminPasswordModal';
import { AdminSalonsModal } from './components/AdminSalonsModal';
import { BuyAppModal } from './components/BuyAppModal';
import { ClientePortalView } from './components/ClientePortalView';
import { AdminPaymentAccountModal } from './components/AdminPaymentAccountModal';
import { ClientLinkModal } from './components/ClientLinkModal';
import { SalonLinkModal } from './components/SalonLinkModal';
import { SalonAccessLinkModal } from './components/SalonAccessLinkModal';
import { SalonAuthModal } from './components/SalonAuthModal';
import { LiveConnectionHubModal } from './components/LiveConnectionHubModal';

import { Transaction, Appointment, SalonConfig, UserRole, Professional, ServiceItem, ClientRecord, SalonApp } from './types';
import { Storage } from './utils/storage';
import { syncEngine } from './utils/syncEngine';
import { DEFAULT_SALON_APPS, DEFAULT_CONFIG } from './data/mockData';
import { getUrlParam, hasUrlAction } from './utils/url';
import { getSalonLicenseInfo } from './utils/license';
import { BlockedLicenseBanner } from './components/BlockedLicenseBanner';
import { LayoutDashboard, CreditCard, Calendar, Users, Scissors, UserCheck, LogOut, RotateCcw, ShieldCheck, Building2, Store, Eye, CheckCircle2, AlertCircle, ShoppingCart, Sparkles, Plus, ExternalLink, Key, Link2, Settings } from 'lucide-react';

export function App() {
  // Check if opened via dedicated direct purchase / activation link
  const isDirectPurchaseUrl = (() => {
    try {
      return hasUrlAction('comprar-licenca', 'comprar', 'comprar_licenca', 'licenca', 'buy', 'compra', 'contratar');
    } catch {}
    return false;
  })();

  const [isPageClosed, setIsPageClosed] = useState(false);

  // Synchronous URL Parameter Detection for instantaneous role and modal setup
  const [userRole, setUserRole] = useState<UserRole>(() => {
    try {
      const isBuying = hasUrlAction('comprar-licenca', 'comprar', 'comprar_licenca', 'licenca', 'buy', 'compra', 'contratar');
      if (isBuying) return 'salao';
      const role = getUrlParam('role');
      const salon = getUrlParam('salon');
      if (role === 'cliente' || salon) return 'cliente';
      if (role === 'salao') return 'salao';
      if (role === 'admin') {
        const isAuth = typeof window !== 'undefined' && sessionStorage.getItem('salao_admin_authenticated') === 'true';
        if (isAuth) return 'admin';
        return 'salao';
      }
    } catch {}
    const isAuth = typeof window !== 'undefined' && sessionStorage.getItem('salao_admin_authenticated') === 'true';
    return isAuth ? 'admin' : 'salao';
  });

  const [activeTab, setActiveTab] = useState<'todos_saloes' | 'dashboard' | 'caixa' | 'agenda' | 'profissionais' | 'servicos' | 'clientes'>('dashboard');

  // Multi-Salon State
  const [salons, setSalons] = useState<SalonApp[]>(() => {
    const list = Storage.getSalons();
    return list && list.length > 0 ? list : DEFAULT_SALON_APPS;
  });

  const [activeSalonId, setActiveSalonId] = useState<string>(() => {
    try {
      const salonParam = getUrlParam('salon');
      if (salonParam) {
        const found = Storage.getSalonBySlugOrCode(salonParam);
        if (found) return found.id;
      }
    } catch {}
    const list = Storage.getSalons();
    return list && list.length > 0 ? list[0].id : DEFAULT_SALON_APPS[0].id;
  });

  // Salon Data States
  const [config, setConfig] = useState<SalonConfig>(() => Storage.getConfig() || DEFAULT_CONFIG);
  const [transactions, setTransactions] = useState<Transaction[]>(() => Storage.getTransactions());
  const [appointments, setAppointments] = useState<Record<string, Record<string, Appointment>>>(() => Storage.getAppointments());
  const [timeAdjustments, setTimeAdjustments] = useState<Record<string, number>>(() => Storage.getTimeAdjustments());
  const [professionals, setProfessionals] = useState<Professional[]>(() => Storage.getProfessionals());
  const [services, setServices] = useState<ServiceItem[]>(() => Storage.getServices());
  const [clients, setClients] = useState<ClientRecord[]>(() => Storage.getClients());

  // Window State
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Modals
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false);
  const [isSalonAuthOpen, setIsSalonAuthOpen] = useState<boolean>(() => {
    try {
      return hasUrlAction('acesso-salao', 'acesso', 'login-salao', 'acessar-salao');
    } catch {}
    return false;
  });
  const [isAdminSalonsOpen, setIsAdminSalonsOpen] = useState(false);
  const [isAdminPaymentOpen, setIsAdminPaymentOpen] = useState(false);
  const [isBuyAppOpen, setIsBuyAppOpen] = useState<boolean>(() => {
    try {
      return hasUrlAction('comprar-licenca', 'comprar', 'comprar_licenca', 'licenca', 'buy', 'compra');
    } catch {}
    return false;
  });
  const [isClientLinkOpen, setIsClientLinkOpen] = useState(false);
  const [isSalonLinkOpen, setIsSalonLinkOpen] = useState(false);
  const [isSalonAccessLinkOpen, setIsSalonAccessLinkOpen] = useState(false);
  const [isLiveHubOpen, setIsLiveHubOpen] = useState(false);
  const [salonAuthCredentials, setSalonAuthCredentials] = useState<{ cpf: string; token: string }>({ cpf: '', token: '' });

  const handleOpenSalonAuth = (creds?: { cpf?: string; token?: string }) => {
    if (creds) {
      setSalonAuthCredentials({ cpf: creds.cpf || '', token: creds.token || '' });
    }
    setIsSalonAuthOpen(true);
  };

  // Initialize Real-time synchronization and detect URL parameters
  useEffect(() => {
    // 1. Start Real-time synchronization engine (Server-Sent Events)
    syncEngine.init();

    const resolveUrlParams = () => {
      try {
        const isBuying = hasUrlAction('comprar-licenca', 'comprar', 'comprar_licenca', 'licenca', 'buy', 'compra', 'contratar');
        if (isBuying) {
          setIsBuyAppOpen(true);
        }

        const isAccessLink = hasUrlAction('acesso-salao', 'acesso', 'login-salao', 'acessar-salao');
        if (isAccessLink) {
          setIsSalonAuthOpen(true);
          setUserRole('salao');
        }

        const roleParam = getUrlParam('role');
        const salonParam = getUrlParam('salon');
        const phoneParam = getUrlParam('phone') || getUrlParam('celular') || getUrlParam('tel');
        const nameParam = getUrlParam('name') || getUrlParam('nome');

        if (phoneParam) {
          try { localStorage.setItem('salao_cliente_phone', phoneParam.replace(/\D/g, '')); } catch {}
        }
        if (nameParam) {
          try { localStorage.setItem('salao_cliente_name', nameParam); } catch {}
        }

        if (roleParam === 'cliente' || salonParam) {
          setUserRole('cliente');
        } else if (roleParam === 'salao') {
          setUserRole('salao');
        } else if (roleParam === 'admin') {
          setUserRole('admin');
        }

        if (salonParam) {
          const targetSalon = Storage.getSalonBySlugOrCode(salonParam);
          if (targetSalon) {
            setActiveSalonId(targetSalon.id);
            setConfig(targetSalon.config);
            Storage.saveConfig(targetSalon.config);
            setUserRole('cliente');
          }
        }
      } catch (err) {
        console.warn('URL parsing error:', err);
      }
    };

    // Immediate local resolution
    resolveUrlParams();

    // Listen to browser navigation / URL changes
    window.addEventListener('popstate', resolveUrlParams);
    window.addEventListener('hashchange', resolveUrlParams);

    // Re-resolve after fetching authoritative server state
    syncEngine.fetchServerState().then((serverState) => {
      if (serverState) {
        if (serverState.salons && serverState.salons.length > 0) {
          setSalons(serverState.salons);
        }
        if (serverState.config) setConfig(serverState.config);
        if (serverState.appointments) setAppointments(serverState.appointments);
        if (serverState.transactions) setTransactions(serverState.transactions);
        if (serverState.timeAdjustments) setTimeAdjustments(serverState.timeAdjustments);
        if (serverState.professionals) setProfessionals(serverState.professionals);
        if (serverState.services) setServices(serverState.services);
        if (serverState.clients) setClients(serverState.clients);

        resolveUrlParams();
      }
    });

    return () => {
      window.removeEventListener('popstate', resolveUrlParams);
      window.removeEventListener('hashchange', resolveUrlParams);
    };
  }, []);

  // Sync state event listener
  useEffect(() => {
    const handleSync = () => {
      const currentSalons = Storage.getSalons();
      setSalons(currentSalons);
      setConfig(Storage.getConfig());
      setTransactions(Storage.getTransactions());
      setAppointments(Storage.getAppointments());
      setTimeAdjustments(Storage.getTimeAdjustments());
      setProfessionals(Storage.getProfessionals());
      setServices(Storage.getServices());
      setClients(Storage.getClients());

      // If active salon changed, re-sync its config
      const active = currentSalons.find(s => s.id === activeSalonId);
      if (active) {
        setConfig(active.config);
      }
    };

    window.addEventListener('salao_sync_data', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('salao_sync_data', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [activeSalonId]);

  // Multi-salon handlers
  const handleSelectSalon = (salon: SalonApp) => {
    setActiveSalonId(salon.id);
    setConfig(salon.config);
    Storage.saveConfig(salon.config);
  };

  const handleCreateSalon = (newSalon: SalonApp) => {
    const updatedList = Storage.addSalonApp(newSalon);
    setSalons(updatedList);
    // Switch to newly created salon app
    handleSelectSalon(newSalon);
  };

  const handleUpdateSalon = (updatedSalon: SalonApp) => {
    const currentSalons = Storage.getSalons();
    const updatedList = currentSalons.map(s => s.id === updatedSalon.id ? updatedSalon : s);
    Storage.saveSalons(updatedList);
    setSalons(updatedList);

    if (updatedSalon.id === activeSalonId) {
      setConfig(updatedSalon.config);
      Storage.saveConfig(updatedSalon.config);
    }
  };

  const handleDeleteSalon = (salonId: string) => {
    const updatedList = Storage.deleteSalonApp(salonId);
    setSalons(updatedList);
    if (activeSalonId === salonId && updatedList.length > 0) {
      handleSelectSalon(updatedList[0]);
    }
  };


  // Handle Role Selection
  const handleSelectRole = (targetRole: UserRole) => {
    if (targetRole === 'admin') {
      if (userRole !== 'admin') {
        setIsAdminAuthOpen(true);
      }
    } else if (targetRole === 'salao') {
      setIsSalonAuthOpen(true);
    } else {
      setUserRole(targetRole);
    }
  };

  // Handlers for Transactions
  const handleAddTransaction = (tx: Transaction) => {
    const updated = [tx, ...transactions];
    setTransactions(updated);
    Storage.saveTransactions(updated);
  };

  const handleDeleteTransaction = (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    Storage.saveTransactions(updated);
  };

  const handleClearAllTransactions = () => {
    if (confirm("Tem certeza que deseja apagar todos os lançamentos do caixa?")) {
      setTransactions([]);
      Storage.saveTransactions([]);
    }
  };

  // Handlers for Appointments
  const handleSaveAppointment = (date: string, timeSlot: string, ap: Appointment) => {
    const updated = { ...appointments };
    if (!updated[date]) updated[date] = {};
    updated[date][timeSlot] = ap;
    setAppointments(updated);
    Storage.saveAppointments(updated);
  };

  const handleDeleteAppointment = (date: string, timeSlot: string) => {
    const updated = { ...appointments };
    if (updated[date]) {
      delete updated[date][timeSlot];
    }
    setAppointments(updated);
    Storage.saveAppointments(updated);
  };

  const handleShiftDayTime = (date: string, deltaMinutes: number) => {
    const updated = { ...timeAdjustments };
    updated[date] = (updated[date] || 0) + deltaMinutes;
    setTimeAdjustments(updated);
    Storage.saveTimeAdjustments(updated);
  };

  const handleResetDaySchedule = (date: string) => {
    const updatedAgenda = { ...appointments };
    delete updatedAgenda[date];
    setAppointments(updatedAgenda);
    Storage.saveAppointments(updatedAgenda);

    const updatedShifts = { ...timeAdjustments };
    delete updatedShifts[date];
    setTimeAdjustments(updatedShifts);
    Storage.saveTimeAdjustments(updatedShifts);
  };

  // Convert completed appointment directly into POS Launch
  const handleConvertAppointmentToPOS = (ap: Appointment) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const netAmount = ap.price || 0;

    const commissions = config.profs.map(p => ({
      professionalId: p.id || `prof-${p.nome}`,
      professionalName: p.nome,
      percentage: p.porc,
      amount: netAmount * (p.porc / 100)
    }));

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      date: ap.date,
      time: timeStr,
      description: `${ap.serviceName || 'Atendimento Agenda'} - ${ap.clientName || 'Cliente'}`,
      grossAmount: ap.price || 0,
      cardFeePercent: 0,
      netAmount,
      paymentMethod: 'pix',
      clientName: ap.clientName,
      commissions,
      createdBy: userRole
    };

    handleAddTransaction(newTx);

    // Update appointment status to 'concluido'
    handleSaveAppointment(ap.date, ap.timeSlot, { ...ap, status: 'concluido' });
    setActiveTab('caixa');
  };

  // Handlers for Master Config
  const handleSaveConfig = (newConfig: SalonConfig) => {
    setConfig(newConfig);
    Storage.saveConfig(newConfig);
  };

  // Active Salon & License Status
  const activeSalon = salons.find(s => s.id === activeSalonId) || salons[0];
  const licenseInfo = getSalonLicenseInfo(activeSalon);

  // Standalone Direct Purchase Mode (when link with ?action=comprar-licenca is opened)
  if (isDirectPurchaseUrl) {
    if (isPageClosed || !isBuyAppOpen) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100 font-sans select-none">
          <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl max-w-md w-full text-center shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-slate-800/80 rounded-2xl border border-slate-700/80 mx-auto flex items-center justify-center text-rose-400 shadow-inner">
              <LogOut className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="bg-rose-500/15 text-rose-300 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border border-rose-500/30">
                Página Finalizada
              </span>
              <h2 className="text-xl font-black text-white">
                Sessão de Compra Encerrada
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Você saiu do formulário de aquisição de licença. Para sua segurança e privacidade, o sistema foi finalizado e você já pode fechar esta aba no seu navegador.
              </p>
            </div>

            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  try {
                    window.close();
                    window.open('', '_self', '');
                    window.close();
                  } catch {}
                }}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Fechar Esta Aba / Janela</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPageClosed(false);
                  setIsBuyAppOpen(true);
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reabrir Tela de Contratação / 15 Dias Grátis</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-950 font-sans text-slate-800 p-2 sm:p-6 flex items-center justify-center">
        <BuyAppModal
          isOpen={isBuyAppOpen}
          onClose={() => {
            try {
              window.close();
              window.open('', '_self', '');
              window.close();
            } catch {}
            setIsBuyAppOpen(false);
            setIsPageClosed(true);
          }}
          userRole="salao"
          activeSalon={activeSalon}
          onUpdateSalon={handleUpdateSalon}
          onOpenSalonAuth={handleOpenSalonAuth}
          onPurchaseComplete={(newOrUpdatedSalon) => {
            const currentList = Storage.getSalons();
            const exists = currentList.some(s => s.id === newOrUpdatedSalon.id);
            if (exists) {
              handleUpdateSalon(newOrUpdatedSalon);
            } else {
              handleCreateSalon(newOrUpdatedSalon);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-slate-950 font-sans text-slate-800 transition-all flex flex-col ${isExpanded ? 'p-0' : 'p-2 sm:p-6'}`}>
      
      {/* 15-Day Trial / License Status Warning & Blocking Banner */}
      {userRole !== 'admin' && activeSalon && (
        <BlockedLicenseBanner
          salon={activeSalon}
          licenseInfo={licenseInfo}
          onOpenBuyApp={() => setIsBuyAppOpen(true)}
          isAdmin={userRole === 'admin'}
        />
      )}

      {/* Main Salon Application Container */}
      <div className={`bg-slate-50 border border-slate-200 shadow-2xl overflow-hidden transition-all mx-auto w-full ${
        isExpanded ? 'rounded-none max-w-full h-screen' : 'rounded-3xl max-w-6xl'
      }`}>

        {/* Top Navbar Header */}
        <Navbar
          config={config}
          userRole={userRole}
          onSelectRole={handleSelectRole}
          onOpenConfig={() => setIsConfigOpen(true)}
          onOpenCatalog={() => setIsCatalogOpen(true)}
          onOpenAdminSalons={() => {
            if (userRole !== 'admin') {
              setIsAdminAuthOpen(true);
            } else {
              setIsAdminSalonsOpen(true);
            }
          }}
          onOpenBuyApp={() => setIsBuyAppOpen(true)}
          onOpenAdminPaymentConfig={() => setIsAdminPaymentOpen(true)}
          onOpenClientLink={() => setIsClientLinkOpen(true)}
          onOpenSalonLink={() => setIsSalonLinkOpen(true)}
          onOpenSalonAccessLink={() => setIsSalonAuthOpen(true)}
          onOpenLiveHub={() => setIsLiveHubOpen(true)}
          isExpanded={isExpanded}
          onToggleExpand={() => setIsExpanded(!isExpanded)}
          isMinimized={isMinimized}
          onToggleMinimize={() => setIsMinimized(!isMinimized)}
        />



        {!isMinimized && (
          <div className="p-2 sm:p-4 space-y-4">
            
            {/* ROLE CONTEXT QUICK TOOLBAR FOR ADMIN */}
            {userRole === 'admin' && (
              <div id="admin-context-toolbar" className="bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-2xl space-y-3 shadow-md">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-xs font-bold text-amber-300">
                    <span className="p-2 bg-amber-500/20 rounded-xl border border-amber-500/30 text-base">👑</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm sm:text-base text-sky-400">Painel do Administrador (Gestão)</span>
                        <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/30">
                          {salons.filter(s => s.status === 'active').length} Salões Ativos
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-normal mt-0.5">
                        Monitore salões, barbearias, faturamento e solicitações de acesso
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-start md:justify-end">
                    <button
                      id="btn-admin-auth-settings"
                      onClick={() => setIsAdminAuthOpen(true)}
                      className="bg-slate-800 hover:bg-slate-700 text-emerald-300 font-extrabold text-xs px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-xs border border-emerald-500/30 active:scale-95 cursor-pointer"
                      title="Cadastrar ou alterar CPF e senha de Administrador"
                    >
                      <Key className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Alterar Senha Admin</span>
                    </button>

                    <button
                      id="btn-admin-payment-config"
                      onClick={() => setIsAdminPaymentOpen(true)}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
                      title="Configurar Conta de Recebimento Pix e Cartão"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Configurar Recebimento (Pix)</span>
                    </button>

                    <button
                      id="btn-admin-salons-manage"
                      onClick={() => setIsAdminSalonsOpen(true)}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-xs border border-blue-400/30 active:scale-95 cursor-pointer"
                      title="Abrir Gestão Completa de Salões & Solicitações"
                    >
                      <Building2 className="w-3.5 h-3.5 text-sky-200" />
                      <span>Gestão de Salões</span>
                    </button>
                  </div>
                </div>

                {/* Connected Salons Switcher Bar */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden text-xs">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                    <Store className="w-3.5 h-3.5 text-sky-400" />
                    <span>Salões ({salons.length}):</span>
                  </span>

                  <div className="flex items-center gap-1.5 flex-nowrap">
                    {salons.map((salon) => {
                      const isCurrent = salon.id === activeSalonId;
                      return (
                        <button
                          key={salon.id}
                          id={`btn-select-salon-${salon.id}`}
                          onClick={() => {
                            handleSelectSalon(salon);
                            if (activeTab === 'todos_saloes') setActiveTab('dashboard');
                          }}
                          title={`Visualizar e gerenciar layout de ${salon.config.nomeSalao}`}
                          className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-2 transition-all shrink-0 border text-xs active:scale-95 cursor-pointer ${
                            isCurrent
                              ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-900/30'
                              : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-600 hover:bg-slate-800'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${
                            salon.status === 'blocked' ? 'bg-rose-500' :
                            salon.status === 'pending' ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
                          }`} />
                          <span className="truncate max-w-[140px]">{salon.config.nomeSalao}</span>
                          {isCurrent && (
                            <span className="text-[9px] bg-white/20 px-1 py-0.2 rounded font-extrabold">
                              Ativo
                            </span>
                          )}
                        </button>
                      );
                    })}

                    <button
                      id="btn-admin-add-new-salon"
                      onClick={() => setIsAdminSalonsOpen(true)}
                      className="px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-sky-300 bg-slate-950/60 hover:bg-slate-800 border border-dashed border-slate-700 hover:border-sky-500 font-bold flex items-center gap-1 shrink-0 transition-all text-xs cursor-pointer"
                      title="Cadastrar ou conectar novo salão"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Novo Salão</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW CONTENT BASED ON ROLE */}
            {userRole === 'cliente' ? (
              <ClientePortalView
                salons={salons}
                activeSalon={salons.find(s => s.id === activeSalonId) || salons[0]}
                appointments={appointments}
                timeAdjustments={timeAdjustments}
                onSelectSalon={(s) => {
                  setActiveSalonId(s.id);
                  setConfig(s.config);
                  Storage.saveConfig(s.config);
                }}
                onAppointmentBooked={(date, timeSlot, ap) => {
                  handleSaveAppointment(date, timeSlot, ap);
                }}
                onOpenCatalog={() => setIsCatalogOpen(true)}
                onOpenLiveHub={() => setIsLiveHubOpen(true)}
              />
            ) : (
              <>
                {/* Primary Tab Navigation Bar for Salon / Admin */}
                <div className="bg-slate-900 p-1.5 rounded-2xl flex items-center gap-1 overflow-x-auto shadow-inner border border-slate-800">
                  
                  {userRole === 'admin' && (
                    <button
                      onClick={() => setActiveTab('todos_saloes')}
                      className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'todos_saloes'
                          ? 'bg-sky-600 text-white shadow-md'
                          : 'text-sky-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Store className="w-4 h-4" />
                      <span>🏬 Todos os Salões ({salons.length})</span>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                      activeTab === 'dashboard'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('caixa')}
                    className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                      activeTab === 'caixa'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Caixa</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('agenda')}
                    className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                      activeTab === 'agenda'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Agenda</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('profissionais')}
                    className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                      activeTab === 'profissionais'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Equipe</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('servicos')}
                    className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                      activeTab === 'servicos'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <Scissors className="w-4 h-4" />
                    <span>Serviços</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('clientes')}
                    className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                      activeTab === 'clientes'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Clientes</span>
                  </button>

                </div>

                {/* Tab Views Content */}
                {activeTab === 'todos_saloes' && userRole === 'admin' && (
                  <div className="space-y-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                          <Store className="w-5 h-5 text-sky-400" />
                          <span>Todos os Salões & Barbearias Conectados</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Visualize e alterne entre os layouts completos de cada salão conectado ao administrador
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsAdminSalonsOpen(true)}
                          className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md active:scale-95"
                        >
                          <Building2 className="w-4 h-4" />
                          <span>Painel Detalhado de Gestão</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {salons.map((s) => {
                        const isCurrent = s.id === activeSalonId;
                        return (
                          <div
                            key={s.id}
                            className={`bg-slate-900 rounded-2xl p-4 border transition-all shadow-md flex flex-col justify-between ${
                              isCurrent
                                ? 'border-sky-500 ring-2 ring-sky-500/20 shadow-sky-950/50'
                                : 'border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center font-black text-sky-400 text-sm overflow-hidden shrink-0">
                                    {s.config.logoUrl ? (
                                      <img src={s.config.logoUrl} alt={s.config.nomeSalao} className="w-full h-full object-cover" />
                                    ) : (
                                      s.config.nomeSalao.slice(0, 2).toUpperCase()
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="font-extrabold text-sm text-white leading-tight">{s.config.nomeSalao}</h4>
                                    <p className="text-[11px] text-slate-400 truncate max-w-[180px]">
                                      {s.ownerName || 'Proprietário não informado'}
                                    </p>
                                  </div>
                                </div>
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                                  s.status === 'blocked' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                                  s.status === 'pending' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                                  'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                }`}>
                                  {s.status === 'blocked' ? 'Bloqueado' : s.status === 'pending' ? 'Pendente' : 'Conectado'}
                                </span>
                              </div>

                              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 space-y-1 text-xs">
                                <div className="flex justify-between text-slate-400 text-[11px]">
                                  <span>Telefone / WhatsApp:</span>
                                  <span className="font-mono text-slate-200">{s.phone || s.config.whatsapp || 'Não informado'}</span>
                                </div>
                                {s.ownerCpf && (
                                  <div className="flex justify-between text-slate-400 text-[11px]">
                                    <span>CPF Proprietário:</span>
                                    <span className="font-mono text-slate-200">{s.ownerCpf}</span>
                                  </div>
                                )}
                                <div className="flex justify-between text-slate-400 text-[11px]">
                                  <span>Código / Slug:</span>
                                  <span className="font-mono text-sky-400">/{s.code || s.id}</span>
                                </div>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-slate-800 mt-3 flex items-center gap-2">
                              <button
                                onClick={() => {
                                  handleSelectSalon(s);
                                  setActiveTab('dashboard');
                                }}
                                className={`flex-1 py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 ${
                                  isCurrent
                                    ? 'bg-sky-600 hover:bg-sky-500 text-white'
                                    : 'bg-slate-800 hover:bg-slate-700 text-white hover:text-sky-300 border border-slate-700'
                                }`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>{isCurrent ? 'Layout Ativo (Ver)' : 'Abrir Layout'}</span>
                              </button>

                              <button
                                onClick={() => {
                                  handleSelectSalon(s);
                                  setIsConfigOpen(true);
                                }}
                                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors"
                                title="Configurar Logo, Cores e Dados deste Salão"
                              >
                                <Scissors className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tab Views Content */}
                {activeTab === 'dashboard' && (
                  <DashboardView
                    transactions={transactions}
                    appointments={appointments}
                    professionals={professionals}
                    config={config}
                    onNavigateToCaixa={() => setActiveTab('caixa')}
                    onNavigateToAgenda={() => setActiveTab('agenda')}
                    onOpenClientLink={() => setIsClientLinkOpen(true)}
                  />
                )}

                {activeTab === 'caixa' && (
                  <CaixaView
                    transactions={transactions}
                    config={config}
                    userRole={userRole}
                    onAddTransaction={handleAddTransaction}
                    onDeleteTransaction={handleDeleteTransaction}
                    onClearAllTransactions={handleClearAllTransactions}
                    onOpenCatalog={() => setIsCatalogOpen(true)}
                    onOpenConfig={() => setIsConfigOpen(true)}
                  />
                )}

                {activeTab === 'agenda' && (
                  <AgendaView
                    appointments={appointments}
                    timeAdjustments={timeAdjustments}
                    config={config}
                    userRole={userRole}
                    onSaveAppointment={handleSaveAppointment}
                    onDeleteAppointment={handleDeleteAppointment}
                    onShiftDayTime={handleShiftDayTime}
                    onResetDaySchedule={handleResetDaySchedule}
                    onConvertToPOS={handleConvertAppointmentToPOS}
                    onOpenLiveHub={() => setIsLiveHubOpen(true)}
                  />
                )}

                {activeTab === 'profissionais' && (
                  <ProfissionaisView
                    professionals={professionals}
                    transactions={transactions}
                    onSaveProfessionals={(profs) => {
                      setProfessionals(profs);
                      Storage.saveProfessionals(profs);
                    }}
                  />
                )}

                {activeTab === 'servicos' && (
                  <ServicosView
                    services={services}
                    onSaveServices={(srvs) => {
                      setServices(srvs);
                      Storage.saveServices(srvs);
                    }}
                  />
                )}

                {activeTab === 'clientes' && (
                  <ClientesView
                    clients={clients}
                    onSaveClients={(clis) => {
                      setClients(clis);
                      Storage.saveClients(clis);
                    }}
                  />
                )}
              </>
            )}

          </div>
        )}

      </div>

      {/* Catalog Lightbox Modal */}
      {/* Photos & Products Media Catalog Modal */}
      <CatalogoView
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        userRole={userRole}
        readOnly={userRole === 'cliente'}
        config={config}
        onSaveConfig={handleSaveConfig}
      />

      {/* Settings Modal */}
      <ConfiguracoesModal
        isOpen={isConfigOpen}
        config={config}
        onClose={() => setIsConfigOpen(false)}
        onSaveConfig={handleSaveConfig}
      />

      {/* Admin Password & Reset Modal */}
      <AdminPasswordModal
        isOpen={isAdminAuthOpen}
        simpleLoginOnly={userRole !== 'admin'}
        onClose={() => setIsAdminAuthOpen(false)}
        onSuccess={() => {
          setUserRole('admin');
          setIsAdminAuthOpen(false);
          setIsAdminSalonsOpen(false);
        }}
      />

      {/* Admin Multi-Salon Manager Modal */}
      <AdminSalonsModal
        isOpen={isAdminSalonsOpen}
        onClose={() => setIsAdminSalonsOpen(false)}
        salons={salons}
        activeSalonId={activeSalonId}
        onSelectSalon={handleSelectSalon}
        onCreateSalon={handleCreateSalon}
        onUpdateSalon={handleUpdateSalon}
        onDeleteSalon={handleDeleteSalon}
        onOpenPaymentConfig={() => setIsAdminPaymentOpen(true)}
        onOpenSalonLink={() => setIsSalonLinkOpen(true)}
        onOpenSalonAccessLink={() => setIsSalonAuthOpen(true)}
        onOpenAdminAuth={() => setIsAdminAuthOpen(true)}
        onOpenLiveHub={() => setIsLiveHubOpen(true)}
      />

      {/* Admin Receiving Payment Account Modal */}
      <AdminPaymentAccountModal
        isOpen={isAdminPaymentOpen}
        onClose={() => setIsAdminPaymentOpen(false)}
      />

      {/* Buy App & Generate Token Checkout Modal */}
      <BuyAppModal
        isOpen={isBuyAppOpen}
        onClose={() => setIsBuyAppOpen(false)}
        userRole={userRole}
        activeSalon={activeSalon}
        onUpdateSalon={handleUpdateSalon}
        onOpenSalonAuth={handleOpenSalonAuth}
        onPurchaseComplete={(newOrUpdatedSalon) => {
          const currentList = Storage.getSalons();
          const exists = currentList.some(s => s.id === newOrUpdatedSalon.id);
          if (exists) {
            handleUpdateSalon(newOrUpdatedSalon);
          } else {
            handleCreateSalon(newOrUpdatedSalon);
          }
        }}
      />

      {/* Salon Direct Purchase Link Generator Modal for Admins */}
      <SalonLinkModal
        isOpen={isSalonLinkOpen}
        onClose={() => setIsSalonLinkOpen(false)}
        onOpenBuyApp={() => setIsBuyAppOpen(true)}
      />

      {/* Salon Direct Access Link Generator Modal for Admins */}
      <SalonAccessLinkModal
        isOpen={isSalonAccessLinkOpen}
        onClose={() => setIsSalonAccessLinkOpen(false)}
        onOpenSalonAuth={() => setIsSalonAuthOpen(true)}
      />

      {/* Client Direct Link & WhatsApp Generator Modal */}
      <ClientLinkModal
        isOpen={isClientLinkOpen}
        onClose={() => setIsClientLinkOpen(false)}
        activeSalon={salons.find(s => s.id === activeSalonId) || salons[0]}
        salons={salons}
        onSelectSalon={handleSelectSalon}
        onOpenClientView={(salon) => {
          handleSelectSalon(salon);
          setUserRole('cliente');
        }}
      />

      {/* Salon Owner CPF + Token Login Modal */}
      <SalonAuthModal
        isOpen={isSalonAuthOpen}
        onClose={() => setIsSalonAuthOpen(false)}
        salons={salons}
        initialCpf={salonAuthCredentials.cpf}
        initialToken={salonAuthCredentials.token}
        onSuccess={(salon) => {
          handleSelectSalon(salon);
          setUserRole('salao');
          setIsSalonAuthOpen(false);
        }}
      />

      {/* Triple Live Connection Hub: Admin, Salons and Clients Connected */}
      <LiveConnectionHubModal
        isOpen={isLiveHubOpen}
        onClose={() => setIsLiveHubOpen(false)}
        userRole={userRole}
        activeSalon={activeSalon}
        onSelectRole={handleSelectRole}
      />


    </div>
  );
}

export default App;
