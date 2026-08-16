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
import { SalonAuthModal } from './components/SalonAuthModal';

import { Transaction, Appointment, SalonConfig, UserRole, Professional, ServiceItem, ClientRecord, SalonApp } from './types';
import { Storage } from './utils/storage';
import { syncEngine } from './utils/syncEngine';
import { DEFAULT_SALON_APPS, DEFAULT_CONFIG } from './data/mockData';
import { getUrlParam, hasUrlAction } from './utils/url';
import { getSalonLicenseInfo } from './utils/license';
import { BlockedLicenseBanner } from './components/BlockedLicenseBanner';
import { LayoutDashboard, CreditCard, Calendar, Users, Scissors, UserCheck } from 'lucide-react';

export function App() {
  // Synchronous URL Parameter Detection for instantaneous role and modal setup
  const [userRole, setUserRole] = useState<UserRole>(() => {
    try {
      const role = getUrlParam('role');
      const salon = getUrlParam('salon');
      if (role === 'cliente' || salon) return 'cliente';
      if (role === 'salao') return 'salao';
      if (role === 'admin') return 'admin';
    } catch {}
    return 'admin';
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'caixa' | 'agenda' | 'profissionais' | 'servicos' | 'clientes'>('dashboard');

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
  const [isSalonAuthOpen, setIsSalonAuthOpen] = useState(false);
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
          isExpanded={isExpanded}
          onToggleExpand={() => setIsExpanded(!isExpanded)}
          isMinimized={isMinimized}
          onToggleMinimize={() => setIsMinimized(!isMinimized)}
        />



        {!isMinimized && (
          <div className="p-2 sm:p-4 space-y-4">
            
            {/* ROLE CONTEXT QUICK TOOLBAR */}
            {userRole === 'admin' && (
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <span className="p-1.5 bg-amber-500/20 rounded-lg border border-amber-500/30">👑</span>
                  <span>Modo Administrador Geral da Plataforma</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                  <button
                    onClick={() => setIsSalonLinkOpen(true)}
                    className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 shadow-sm border border-violet-400/30 active:scale-95"
                    title="Gerar e enviar link de compra de licença para donos de salão de cabeleireiro"
                  >
                    <span>🔗 Enviar Link p/ Salão</span>
                  </button>

                  <button
                    onClick={() => setIsAdminPaymentOpen(true)}
                    className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 shadow-sm"
                  >
                    <span>⚙️ Minha Conta de Recebimento (Pix/Cartão)</span>
                  </button>

                  <button
                    onClick={() => setIsAdminSalonsOpen(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 shadow-sm border border-blue-400/30"
                  >
                    <span>🏢 Painel de Salões & Solicitações</span>
                  </button>
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
              />
            ) : (
              <>
                {/* Primary Tab Navigation Bar for Salon / Admin */}
                <div className="bg-slate-900 p-1.5 rounded-2xl flex items-center gap-1 overflow-x-auto shadow-inner border border-slate-800">
                  
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
        onClose={() => setIsAdminAuthOpen(false)}
        onSuccess={() => {
          setUserRole('admin');
          setIsAdminAuthOpen(false);
          setIsAdminSalonsOpen(true);
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
        onOpenAdminPaymentConfig={() => setIsAdminPaymentOpen(true)}
        activeSalon={activeSalon}
        onUpdateSalon={handleUpdateSalon}
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
        onOpenAdminPaymentConfig={() => setIsAdminPaymentOpen(true)}
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
        onSuccess={(salon) => {
          handleSelectSalon(salon);
          setUserRole('salao');
          setIsSalonAuthOpen(false);
        }}
      />


    </div>
  );
}

export default App;
