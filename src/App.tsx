import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { CaixaView } from './components/CaixaView';
import { AgendaView } from './components/AgendaView';
import { ProfissionaisView } from './components/ProfissionaisView';
import { MeusFuncionariosView } from './components/MeusFuncionariosView';
import { ServicosView } from './components/ServicosView';
import { ClientesView } from './components/ClientesView';
import { CatalogoView } from './components/CatalogoView';
import { ConfiguracoesModal } from './components/ConfiguracoesModal';
import { AdminPasswordModal } from './components/AdminPasswordModal';
import { AdminChangePasswordModal } from './components/AdminChangePasswordModal';
import { AdminSalonsModal } from './components/AdminSalonsModal';
import { BuyAppModal } from './components/BuyAppModal';
import { ClientePortalView } from './components/ClientePortalView';
import { AdminPaymentAccountModal } from './components/AdminPaymentAccountModal';
import { ClientLinkModal } from './components/ClientLinkModal';
import { SalonLinkModal } from './components/SalonLinkModal';
import { SalonAccessLinkModal } from './components/SalonAccessLinkModal';
import { SalonAuthModal } from './components/SalonAuthModal';
import { EmployeeLinkModal } from './components/EmployeeLinkModal';
import { LiveConnectionHubModal } from './components/LiveConnectionHubModal';
import { AdminVideoConfigModal } from './components/AdminVideoConfigModal';
import { AdminBroadcastModal } from './components/AdminBroadcastModal';

import { Transaction, Appointment, SalonConfig, UserRole, Professional, ServiceItem, ClientRecord, SalonApp, CaixaFechamentoCiclo } from './types';
import { Storage } from './utils/storage';
import { syncEngine } from './utils/syncEngine';
import { DEFAULT_SALON_APPS, DEFAULT_CONFIG } from './data/mockData';
import { getUrlParam, hasUrlAction } from './utils/url';
import { getSalonLicenseInfo } from './utils/license';
import { BlockedLicenseBanner } from './components/BlockedLicenseBanner';
import { LayoutDashboard, CreditCard, Calendar, Users, Scissors, UserCheck, LogOut, RotateCcw, ShieldCheck, Building2, Store, Eye, CheckCircle2, AlertCircle, ShoppingCart, Sparkles, Plus, ExternalLink, Key, Link2, Settings, Play, Video, Gift } from 'lucide-react';

export function App() {
  // Check if opened via dedicated direct purchase / activation link
  const [isDirectPurchaseMode, setIsDirectPurchaseMode] = useState<boolean>(() => {
    try {
      return hasUrlAction('comprar-licenca', 'comprar', 'comprar_licenca', 'licenca', 'buy', 'compra', 'contratar');
    } catch {}
    return false;
  });

  const [isPageClosed, setIsPageClosed] = useState(false);
  const [isAppCompletelyTerminated, setIsAppCompletelyTerminated] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const isBuying = hasUrlAction('comprar-licenca', 'comprar', 'comprar_licenca', 'licenca', 'buy', 'compra', 'contratar');
      if (isBuying) return false;
      const role = getUrlParam('role');
      const salon = getUrlParam('salon');
      const prof = getUrlParam('prof') || getUrlParam('funcionario') || getUrlParam('employee');
      // Direct client or employee link
      if (role === 'cliente' || (salon && !role && !prof)) return true;
      if (role === 'funcionario' || prof) return true;

      const isAdminAuth = typeof window !== 'undefined' && sessionStorage.getItem('salao_admin_authenticated') === 'true';
      const isSalonAuth = typeof window !== 'undefined' && sessionStorage.getItem('salao_authenticated') === 'true';
      if (isAdminAuth || isSalonAuth) return true;
    } catch {}
    return false;
  });

  // Close and exit entire screen / URL action handler
  const handleCloseEntireScreen = () => {
    setIsAppCompletelyTerminated(true);
    setIsPageClosed(true);
    setIsDirectPurchaseMode(false);
    setIsBuyAppOpen(false);
    setIsSalonAuthOpen(false);

    // 1. Attempt standard script and window closing
    try {
      if (typeof window !== 'undefined') {
        window.close();
        window.open('', '_self', '');
        window.close();
        self.close();
        if (window.top && window.top !== window) {
          window.top.close();
        }
      }
    } catch {}

    // 2. Clean URL query parameters and attempt navigation to about:blank to fully close
    try {
      if (typeof window !== 'undefined') {
        if (window.history && window.history.replaceState) {
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }
        // Redirect to about:blank if window.close was blocked by browser
        setTimeout(() => {
          try {
            window.location.replace('about:blank');
          } catch {
            try {
              window.location.href = 'about:blank';
            } catch {}
          }
        }, 100);
      }
    } catch {}
  };

  // Synchronous URL Parameter Detection for instantaneous role and modal setup
  const [userRole, setUserRole] = useState<UserRole>(() => {
    try {
      const isBuying = hasUrlAction('comprar-licenca', 'comprar', 'comprar_licenca', 'licenca', 'buy', 'compra', 'contratar');
      if (isBuying) return 'salao';
      const role = getUrlParam('role');
      const salon = getUrlParam('salon');
      if (role === 'funcionario' || role === 'equipe') return 'funcionario';
      if (role === 'cliente' || (salon && !role)) return 'cliente';
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

  const [activeTab, setActiveTab] = useState<'todos_saloes' | 'dashboard' | 'caixa' | 'agenda' | 'profissionais' | 'servicos' | 'clientes'>(() => {
    try {
      const role = getUrlParam('role');
      if (role === 'funcionario' || role === 'equipe') return 'agenda';
    } catch {}
    return 'dashboard';
  });

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
      const savedAuth = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('salao_authenticated_id');
      if (savedAuth) {
        const found = Storage.getSalons().find(s => s.id === savedAuth);
        if (found) return found.id;
      }
      const savedActive = typeof localStorage !== 'undefined' && localStorage.getItem('salao_active_id');
      if (savedActive) {
        const found = Storage.getSalons().find(s => s.id === savedActive);
        if (found) return found.id;
      }
    } catch {}
    const list = Storage.getSalons();
    return list && list.length > 0 ? list[0].id : DEFAULT_SALON_APPS[0].id;
  });

  // Salon Data States
  const [config, setConfig] = useState<SalonConfig>(() => {
    const list = Storage.getSalons();
    const active = list.find(s => s.id === activeSalonId);
    return Storage.getConfig(activeSalonId) || active?.config || DEFAULT_CONFIG;
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => Storage.getTransactions(activeSalonId));
  const [appointments, setAppointments] = useState<Record<string, Record<string, Appointment>>>(() => Storage.getAppointments(activeSalonId));
  const [timeAdjustments, setTimeAdjustments] = useState<Record<string, number>>(() => Storage.getTimeAdjustments(activeSalonId));
  const [professionals, setProfessionals] = useState<Professional[]>(() => Storage.getProfessionals(activeSalonId));
  const [services, setServices] = useState<ServiceItem[]>(() => Storage.getServices(activeSalonId));
  const [clients, setClients] = useState<ClientRecord[]>(() => Storage.getClients(activeSalonId));

  // Window State
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Active Employee State (when accessed via employee personal link)
  const [employeeName, setEmployeeName] = useState<string>(() => {
    try {
      const profParam = getUrlParam('prof') || getUrlParam('funcionario') || getUrlParam('employee') || getUrlParam('p');
      if (profParam) return profParam;
      const roleParam = getUrlParam('role');
      if (roleParam === 'funcionario' || roleParam === 'equipe') {
        const nameParam = getUrlParam('name') || getUrlParam('nome');
        if (nameParam) return nameParam;
        const saved = localStorage.getItem('salao_active_employee_name');
        if (saved) return saved;
      }
    } catch {}
    return '';
  });

  // Modals
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false);
  const [isAdminChangePasswordOpen, setIsAdminChangePasswordOpen] = useState(false);
  const [adminAuthTargetRole, setAdminAuthTargetRole] = useState<UserRole>('admin');
  const [isSalonAuthOpen, setIsSalonAuthOpen] = useState<boolean>(() => {
    try {
      // If direct purchase link, client portal, or specific employee link, don't open modal
      const isBuying = hasUrlAction('comprar-licenca', 'comprar', 'comprar_licenca', 'licenca', 'buy', 'compra', 'contratar');
      const orderTrackingParam = getUrlParam('confirmar-pedido') || getUrlParam('confirmar_pedido') || getUrlParam('pedido') || getUrlParam('order') || getUrlParam('acompanhar') || getUrlParam('pay');
      if (isBuying || orderTrackingParam) return false;

      const role = getUrlParam('role');
      const salon = getUrlParam('salon');
      const prof = getUrlParam('prof') || getUrlParam('funcionario') || getUrlParam('employee');

      // Client portal or employee personal link opens directly to their view
      if (role === 'cliente' || (salon && !role && !prof)) return false;
      if (role === 'funcionario' || prof) return false;

      // In all other cases (e.g. visiting agendamaisfacil.vercel.app / root URL / acesso-salao),
      // open the "Entrada Salão / Administrador" screen directly!
      return true;
    } catch {}
    return true;
  });
  const [isAdminSalonsOpen, setIsAdminSalonsOpen] = useState(false);
  const [isAdminPaymentOpen, setIsAdminPaymentOpen] = useState(false);
  const [isAdminVideoConfigOpen, setIsAdminVideoConfigOpen] = useState(false);
  const [isAdminBroadcastOpen, setIsAdminBroadcastOpen] = useState(false);
  const [isBuyAppOpen, setIsBuyAppOpen] = useState<boolean>(() => {
    try {
      return hasUrlAction('comprar-licenca', 'comprar', 'comprar_licenca', 'licenca', 'buy', 'compra');
    } catch {}
    return false;
  });
  const [isClientLinkOpen, setIsClientLinkOpen] = useState(false);
  const [isEmployeeLinkOpen, setIsEmployeeLinkOpen] = useState(false);
  const [isSalonLinkOpen, setIsSalonLinkOpen] = useState(false);
  const [isSalonAccessLinkOpen, setIsSalonAccessLinkOpen] = useState(false);
  const [isLiveHubOpen, setIsLiveHubOpen] = useState(false);
  const [initialPaymentOrderId, setInitialPaymentOrderId] = useState<string | null>(() => {
    try {
      return getUrlParam('confirmar-pedido') || 
             getUrlParam('confirmar_pedido') || 
             getUrlParam('pedido') || 
             getUrlParam('order') || 
             getUrlParam('acompanhar') || 
             getUrlParam('acompanhar-pedido') || 
             getUrlParam('orderId') ||
             getUrlParam('pay');
    } catch {}
    return null;
  });
  const [selectedBuyPlanDays, setSelectedBuyPlanDays] = useState<number | undefined>(undefined);
  const [selectedBuyCpf, setSelectedBuyCpf] = useState<string | undefined>(undefined);
  const [salonAuthCredentials, setSalonAuthCredentials] = useState<{ cpf: string; token: string }>({ cpf: '', token: '' });
  const [salonAuthMode, setSalonAuthMode] = useState<'salao' | 'funcionario'>('salao');

  const handleOpenSalonAuth = (creds?: { cpf?: string; token?: string }) => {
    if (creds) {
      setSalonAuthCredentials({ cpf: creds.cpf || '', token: creds.token || '' });
    }
    setSalonAuthMode('salao');
    setIsSalonAuthOpen(true);
  };

  const handleOpenBuyAppWithPlan = (planDays?: number, buyerCpf?: string) => {
    setSelectedBuyPlanDays(planDays);
    setSelectedBuyCpf(buyerCpf);
    setIsBuyAppOpen(true);
  };

  // Initialize Real-time synchronization and detect URL parameters
  useEffect(() => {
    // 1. Start Real-time synchronization engine (Server-Sent Events)
    syncEngine.init();

    const resolveUrlParams = () => {
      try {
        const isBuying = hasUrlAction('comprar-licenca', 'comprar', 'comprar_licenca', 'licenca', 'buy', 'compra', 'contratar');
        const orderTrackingParam = getUrlParam('confirmar-pedido') || 
                                   getUrlParam('confirmar_pedido') || 
                                   getUrlParam('pedido') || 
                                   getUrlParam('order') || 
                                   getUrlParam('acompanhar') || 
                                   getUrlParam('acompanhar-pedido') || 
                                   getUrlParam('orderId') ||
                                   getUrlParam('pay');

        if (orderTrackingParam) {
          setInitialPaymentOrderId(orderTrackingParam);
          setIsBuyAppOpen(true);
        } else if (isBuying) {
          setIsBuyAppOpen(true);
        }

        const isAccessLink = hasUrlAction('acesso-salao', 'acesso', 'login-salao', 'acessar-salao', 'painel-salao');
        const tokenParam = getUrlParam('token') || getUrlParam('senha') || getUrlParam('tok') || getUrlParam('chave');
        const cpfParam = getUrlParam('cpf') || getUrlParam('login') || getUrlParam('doc');

        if (tokenParam || cpfParam) {
          setSalonAuthCredentials({ cpf: cpfParam || '', token: tokenParam || '' });
          
          // Auto-authenticate if credentials match
          const cleanCpf = (cpfParam || '').replace(/\D/g, '').trim();
          const cleanToken = (tokenParam || '').trim().toUpperCase();
          const currentList = Storage.getSalons();
          
          const matched = currentList.find(s => {
            const sCpf = (s.ownerCpf || '').replace(/\D/g, '').trim();
            const sTok = (s.purchaseToken || '').trim().toUpperCase();
            const sCode = (s.appCode || '').trim().toUpperCase();
            const sId = (s.id || '').trim().toUpperCase();
            
            const matchCpf = cleanCpf && sCpf === cleanCpf;
            const matchTok = cleanToken && (sTok === cleanToken || sCode === cleanToken || sId === cleanToken);
            return (matchCpf && matchTok) || (cleanToken && matchTok);
          });
          
          if (matched) {
            setActiveSalonId(matched.id);
            try {
              localStorage.setItem('salao_active_id', matched.id);
              sessionStorage.setItem('salao_authenticated_id', matched.id);
            } catch {}
            const salonConfig = Storage.getConfig(matched.id) || matched.config;
            setConfig(salonConfig);
            setAppointments(Storage.getAppointments(matched.id));
            setTransactions(Storage.getTransactions(matched.id));
            setTimeAdjustments(Storage.getTimeAdjustments(matched.id));
            setProfessionals(Storage.getProfessionals(matched.id));
            setServices(Storage.getServices(matched.id));
            setClients(Storage.getClients(matched.id));
            setUserRole('salao');
            setIsSalonAuthOpen(false);
          } else if (isAccessLink) {
            setIsSalonAuthOpen(true);
            setUserRole('salao');
          }
        } else if (isAccessLink) {
          setIsSalonAuthOpen(true);
          setUserRole('salao');
        }

        const roleParam = getUrlParam('role');
        const salonParam = getUrlParam('salon');
        const phoneParam = getUrlParam('phone') || getUrlParam('celular') || getUrlParam('tel');
        const nameParam = getUrlParam('name') || getUrlParam('nome');
        const profParam = getUrlParam('prof') || getUrlParam('funcionario') || getUrlParam('employee') || getUrlParam('p');

        if (profParam) {
          setEmployeeName(profParam);
          try { localStorage.setItem('salao_active_employee_name', profParam); } catch {}
        } else if ((roleParam === 'funcionario' || roleParam === 'equipe') && nameParam) {
          setEmployeeName(nameParam);
          try { localStorage.setItem('salao_active_employee_name', nameParam); } catch {}
        }

        if (phoneParam) {
          try { localStorage.setItem('salao_cliente_phone', phoneParam.replace(/\D/g, '')); } catch {}
        }
        if (nameParam) {
          try { localStorage.setItem('salao_cliente_name', nameParam); } catch {}
        }

        if (roleParam === 'funcionario' || roleParam === 'equipe') {
          setUserRole('funcionario');
          setActiveTab('agenda');
        } else if (roleParam === 'cliente' || (salonParam && !roleParam)) {
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
            if (roleParam === 'funcionario' || roleParam === 'equipe') {
              setUserRole('funcionario');
              setActiveTab('agenda');
            } else if (roleParam === 'salao') {
              setUserRole('salao');
            } else if (roleParam !== 'admin') {
              setUserRole('cliente');
            }
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
        const mergedSalons = Storage.getSalons();
        setSalons(mergedSalons);
        const active = mergedSalons.find(s => s.id === activeSalonId);
        if (active && active.config) {
          setConfig(active.config);
        } else {
          setConfig(Storage.getConfig(activeSalonId));
        }
        setAppointments(Storage.getAppointments(activeSalonId));
        setTransactions(Storage.getTransactions(activeSalonId));
        setTimeAdjustments(Storage.getTimeAdjustments(activeSalonId));
        setProfessionals(Storage.getProfessionals(activeSalonId));
        setServices(Storage.getServices(activeSalonId));
        setClients(Storage.getClients(activeSalonId));

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
      const active = currentSalons.find(s => s.id === activeSalonId);
      if (active && active.config) {
        setConfig(active.config);
      } else {
        setConfig(Storage.getConfig(activeSalonId));
      }
      setTransactions(Storage.getTransactions(activeSalonId));
      setAppointments(Storage.getAppointments(activeSalonId));
      setTimeAdjustments(Storage.getTimeAdjustments(activeSalonId));
      setProfessionals(Storage.getProfessionals(activeSalonId));
      setServices(Storage.getServices(activeSalonId));
      setClients(Storage.getClients(activeSalonId));
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
    try {
      localStorage.setItem('salao_active_id', salon.id);
      sessionStorage.setItem('salao_authenticated_id', salon.id);
    } catch {}
    const salonConfig = Storage.getConfig(salon.id) || salon.config;
    setConfig(salonConfig);
    Storage.saveConfig(salonConfig, salon.id);

    // Switch all active data strictly to this salon's isolated dataset
    setAppointments(Storage.getAppointments(salon.id));
    setTransactions(Storage.getTransactions(salon.id));
    setTimeAdjustments(Storage.getTimeAdjustments(salon.id));
    setProfessionals(Storage.getProfessionals(salon.id));
    setServices(Storage.getServices(salon.id));
    setClients(Storage.getClients(salon.id));
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
      Storage.saveConfig(updatedSalon.config, updatedSalon.id);
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
        setAdminAuthTargetRole('admin');
        setIsAdminAuthOpen(true);
      }
    } else if (targetRole === 'salao') {
      // Salão / Administrador Login Screen (CPF + Senha)
      setSalonAuthMode('salao');
      setIsSalonAuthOpen(true);
    } else if (targetRole === 'funcionario') {
      setUserRole('funcionario');
      setActiveTab('agenda');
      if (!employeeName && professionals.length > 0) {
        const saved = localStorage.getItem('salao_active_employee_name');
        const defaultName = saved || professionals[0].name;
        setEmployeeName(defaultName);
      }
    } else {
      setUserRole(targetRole);
    }
  };

  // Handlers for Transactions (with Soft-Delete for audit reports in Word/Excel)
  const handleAddTransaction = (tx: Transaction) => {
    const newTx: Transaction = {
      ...tx,
      salonId: activeSalonId,
      status: 'ativo',
      deleted: false,
    };
    const updated = [newTx, ...transactions];
    setTransactions(updated);
    Storage.saveTransactions(updated, activeSalonId);
  };

  const handleDeleteTransaction = (id: string) => {
    const updated = transactions.map(t => {
      if (t.id === id) {
        return {
          ...t,
          status: 'cancelado' as const,
          deleted: true,
          deletedAt: new Date().toISOString(),
          deletedBy: userRole,
        };
      }
      return t;
    });
    setTransactions(updated);
    Storage.saveTransactions(updated, activeSalonId);
  };

  const handleClearAllTransactions = () => {
    if (transactions.length === 0) return;

    const activeTx = transactions.filter(t => !t.deleted && t.status !== 'cancelado');
    const totalGross = activeTx.reduce((acc, t) => acc + (Number(t.grossAmount) || 0), 0);
    const totalNet = activeTx.reduce((acc, t) => acc + (Number(t.netAmount) || 0), 0);

    // Calculate commissions by prof for this cycle
    const profCommissionMap = new Map<string, { totalAmount: number; count: number }>();
    let totalCommissions = 0;
    activeTx.forEach(t => {
      if (t.commissions && t.commissions.length > 0) {
        t.commissions.forEach(c => {
          const current = profCommissionMap.get(c.professionalName) || { totalAmount: 0, count: 0 };
          const amt = Number(c.amount) || 0;
          totalCommissions += amt;
          profCommissionMap.set(c.professionalName, {
            totalAmount: current.totalAmount + amt,
            count: current.count + 1
          });
        });
      }
    });

    const commissionsByProf = Array.from(profCommissionMap.entries()).map(([profName, val]) => ({
      professionalName: profName,
      amount: val.totalAmount,
      count: val.count
    }));

    // Payment methods summary
    const methodMap = new Map<string, { total: number; count: number }>();
    activeTx.forEach(t => {
      const m = t.paymentMethod || 'dinheiro';
      const cur = methodMap.get(m) || { total: 0, count: 0 };
      methodMap.set(m, {
        total: cur.total + (Number(t.grossAmount) || 0),
        count: cur.count + 1
      });
    });
    const paymentMethodsSummary = Array.from(methodMap.entries()).map(([m, v]) => ({
      method: m as any,
      total: v.total,
      count: v.count
    }));

    const now = new Date();
    const cycleId = `ciclo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const formattedDate = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    const yyyymmdd = now.toISOString().split('T')[0];

    const ciclo: CaixaFechamentoCiclo = {
      id: cycleId,
      salonId: activeSalonId || config.id || 'default',
      salonName: config.nomeSalao || 'Meu Salão',
      closedAt: now.toISOString(),
      closedAtFormatted: formattedDate,
      date: yyyymmdd,
      totalGross,
      totalNet,
      totalCommissions,
      activeCount: activeTx.length,
      cancelledCount: transactions.length - activeTx.length,
      commissionsByProf,
      paymentMethodsSummary,
      transactions: [...transactions],
      clearedBy: userRole
    };

    // 1. Salva o ciclo com 100% de segurança no Banco de Dados (LocalStorage + Firestore)
    Storage.saveCaixaFechamento(ciclo);

    // 2. Limpa o painel de lançamentos atual para iniciar um novo ciclo isolado deste salão
    setTransactions([]);
    Storage.saveTransactions([], activeSalonId);
  };

  // Handlers for Appointments
  const handleSaveAppointment = (date: string, timeSlot: string, ap: Appointment) => {
    const updated = { ...appointments };
    if (!updated[date]) updated[date] = {};
    updated[date][timeSlot] = ap;
    setAppointments(updated);
    Storage.saveAppointments(updated, activeSalonId);
  };

  const handleDeleteAppointment = (date: string, timeSlot: string) => {
    const updated = { ...appointments };
    if (updated[date]) {
      delete updated[date][timeSlot];
    }
    setAppointments(updated);
    Storage.saveAppointments(updated, activeSalonId);
  };

  const handleShiftDayTime = (date: string, deltaMinutes: number) => {
    const updated = { ...timeAdjustments };
    updated[date] = (updated[date] || 0) + deltaMinutes;
    setTimeAdjustments(updated);
    Storage.saveTimeAdjustments(updated, activeSalonId);
  };

  const handleResetDaySchedule = (date: string) => {
    // Only reset time shifts (+/- minutes adjustment)
    // NEVER delete existing booked appointments
    const updatedShifts = { ...timeAdjustments };
    delete updatedShifts[date];
    setTimeAdjustments(updatedShifts);
    Storage.saveTimeAdjustments(updatedShifts, activeSalonId);
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

    setSalons(prevSalons => {
      const updated = prevSalons.map(s => {
        if (s.id === activeSalonId) {
          return {
            ...s,
            name: newConfig.nomeSalao || s.name,
            config: newConfig
          };
        }
        return s;
      });
      return updated;
    });

    Storage.saveConfig(newConfig, activeSalonId);
  };

  // Active Salon & License Status
  const activeSalon = salons.find(s => s.id === activeSalonId) || salons[0];
  const licenseInfo = getSalonLicenseInfo(activeSalon);

  // When app is completely closed / terminated
  if (isAppCompletelyTerminated) {
    return (
      <div className="fixed inset-0 bg-[#060a14] flex flex-col items-center justify-center p-6 text-center select-none z-[99999]">
        <div className="w-14 h-14 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center justify-center text-slate-500 mb-3 shadow-inner">
          <LogOut className="w-7 h-7 text-slate-500" />
        </div>
        <p className="text-base font-bold text-slate-300">Aplicativo Finalizado</p>
        <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
          A página e a sessão foram encerradas por completo. Você já pode fechar esta aba no seu navegador.
        </p>
      </div>
    );
  }

  // Standalone Direct Purchase Mode (when link with ?action=comprar-licenca is opened)
  if (isDirectPurchaseMode) {
    if (isPageClosed || !isBuyAppOpen) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100 font-sans select-none">
          <div className="bg-[#0b1222] border border-slate-800 p-6 sm:p-8 rounded-3xl max-w-md w-full text-center shadow-2xl space-y-5">
            <div className="w-14 h-14 bg-slate-800/80 rounded-2xl border border-slate-700 mx-auto flex items-center justify-center text-rose-400 shadow-inner">
              <LogOut className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <span className="bg-rose-500/15 text-rose-300 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border border-rose-500/30">
                Página Finalizada
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white">
                Sessão de Compra Encerrada
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Você saiu do formulário de aquisição de licença. Para sua segurança e privacidade, o sistema foi finalizado e você já pode fechar esta aba no seu navegador.
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleCloseEntireScreen}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer"
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
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reabrir Tela de Contratação / 7 Dias Grátis</span>
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
          onClose={handleCloseEntireScreen}
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
            setIsAuthenticated(true);
            setIsPageClosed(false);
          }}
        />
      </div>
    );
  }

  // When user closes entrance modal without logging in or clicks exit:
  if (isPageClosed || (!isAuthenticated && !isSalonAuthOpen && !isBuyAppOpen)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100 font-sans select-none">
        <div className="bg-[#0b1222] border border-slate-800 p-6 sm:p-8 rounded-3xl max-w-md w-full text-center shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 bg-slate-800/80 rounded-2xl border border-slate-700 mx-auto flex items-center justify-center text-rose-400 shadow-inner">
            <LogOut className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <span className="bg-rose-500/15 text-rose-300 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border border-rose-500/30">
              Sessão Encerrada
            </span>
            <h2 className="text-lg sm:text-xl font-black text-white">
              Aplicativo Fechado
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Você saiu da tela de entrada. O acesso ao painel de gestão do salão foi finalizado e bloqueado com segurança.
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={handleCloseEntireScreen}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Fechar Esta Aba / Janela</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPageClosed(false);
                setIsSalonAuthOpen(true);
              }}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Entrada Salão / Administrador</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPageClosed(false);
                handleOpenBuyAppWithPlan(7);
              }}
              className="w-full bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Gift className="w-3.5 h-3.5 text-emerald-400" />
              <span>Testar 7 Dias Grátis</span>
            </button>
          </div>
        </div>
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
          employeeName={employeeName}
          professionals={professionals}
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
          onOpenAdminVideoConfig={() => setIsAdminVideoConfigOpen(true)}
          onOpenAdminBroadcast={() => setIsAdminBroadcastOpen(true)}
          onOpenClientLink={() => setIsClientLinkOpen(true)}
          onOpenEmployeeLink={() => setIsEmployeeLinkOpen(true)}
          onOpenSalonLink={() => setIsSalonLinkOpen(true)}
          onOpenSalonAccessLink={() => setIsSalonAccessLinkOpen(true)}
          onOpenAdminChangePassword={() => setIsAdminChangePasswordOpen(true)}
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
                {/* Role Awareness Banners */}
                {userRole === 'funcionario' && (
                  <div className="bg-gradient-to-r from-teal-950/90 via-slate-900 to-teal-950/90 border border-teal-600/50 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center justify-center font-black text-sm shrink-0 shadow-inner">
                        {employeeName ? employeeName.charAt(0).toUpperCase() : <UserCheck className="w-5 h-5 text-teal-400" />}
                      </div>
                      <div>
                        <div className="font-extrabold text-white flex items-center gap-2 flex-wrap">
                          <span className="text-sm">
                            {employeeName ? `Painel do Profissional: ${employeeName}` : 'Acesso Salão / Funcionário'}
                          </span>
                          <span className="bg-teal-900 text-teal-200 text-[10px] font-mono px-2 py-0.5 rounded-full border border-teal-700">
                            {config.nomeSalao || 'Salão'}
                          </span>
                          {employeeName && (
                            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40">
                              ✓ Agenda Própria Conectada
                            </span>
                          )}
                        </div>
                        <p className="text-teal-200/80 text-[11px] mt-0.5">
                          {employeeName
                            ? `Olá, ${employeeName}! Esta é a sua agenda individual e atendimentos sincronizados em tempo real com o salão.`
                            : 'Visualizando apenas Agenda, Equipe, Serviços e Clientes — 100% integrado e sincronizado em tempo real.'
                          }
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSalonAuthMode('salao');
                        setIsSalonAuthOpen(true);
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 text-[11px] font-bold shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer self-stretch sm:self-auto justify-center"
                    >
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span>Sou Proprietário/Admin (Entrar)</span>
                    </button>
                  </div>
                )}

                {userRole === 'salao' && (
                  <div className="bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border border-blue-600/30 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="font-extrabold text-white">Painel Salão / Administrador</span>
                      <span className="text-slate-400 text-[11px] hidden sm:inline">— Acesso total ao painel e gestão do salão</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                      <button
                        onClick={() => setIsClientLinkOpen(true)}
                        className="px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/60 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                        title="Enviar link de autoagendamento para os clientes no WhatsApp"
                      >
                        <Link2 className="w-3 h-3 text-rose-300" />
                        <span>Link Clientes</span>
                      </button>
                      <button
                        onClick={() => setIsEmployeeLinkOpen(true)}
                        className="px-2.5 py-1 rounded-lg bg-teal-950/80 hover:bg-teal-900 text-teal-200 border border-teal-800/60 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                        title="Enviar link de acesso restrito para os profissionais e funcionários"
                      >
                        <Users className="w-3 h-3 text-teal-300" />
                        <span>Enviar Link Funcionários</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Primary Tab Navigation Bar for Salon / Admin / Funcionario */}
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

                  {/* Dashboard & Caixa only visible for Salão/Administrador and Gestão Admin */}
                  {userRole !== 'funcionario' && (
                    <>
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
                    </>
                  )}

                  {/* Agenda, Equipe, Serviços e Clientes (Visible to all staff and admins) */}
                  <button
                    onClick={() => setActiveTab('agenda')}
                    className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                      (activeTab === 'agenda' || (userRole === 'funcionario' && (activeTab === 'dashboard' || activeTab === 'caixa' || activeTab === 'todos_saloes')))
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Agenda</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('profissionais')}
                    className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                      activeTab === 'profissionais'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>{userRole === 'funcionario' ? 'Meu Perfil' : 'Meus Funcionários'}</span>
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
                    onOpenEmployeeLink={() => setIsEmployeeLinkOpen(true)}
                  />
                )}

                {activeTab === 'caixa' && (
                  <CaixaView
                    transactions={transactions}
                    config={config}
                    userRole={userRole}
                    salonId={activeSalonId}
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
                    employeeName={employeeName}
                    initialProfFilter={employeeName || 'todos'}
                    onSaveAppointment={handleSaveAppointment}
                    onDeleteAppointment={handleDeleteAppointment}
                    onShiftDayTime={handleShiftDayTime}
                    onResetDaySchedule={handleResetDaySchedule}
                    onConvertToPOS={handleConvertAppointmentToPOS}
                    onOpenLiveHub={() => setIsLiveHubOpen(true)}
                    onOpenConfig={() => setIsConfigOpen(true)}
                  />
                )}

                {activeTab === 'profissionais' && (
                  <MeusFuncionariosView
                    professionals={professionals}
                    transactions={transactions}
                    appointments={appointments}
                    config={config}
                    userRole={userRole}
                    employeeName={employeeName}
                    activeSalonSlug={salons.find(s => s.id === activeSalonId)?.slug}
                    salonId={activeSalonId}
                    onSaveProfessionals={(profs) => {
                      setProfessionals(profs);
                      Storage.saveProfessionals(profs, activeSalonId);
                    }}
                    onOpenEmployeeLink={() => setIsEmployeeLinkOpen(true)}
                    onOpenSpecificEmployeeAgenda={(profName) => {
                      setEmployeeName(profName);
                      try { localStorage.setItem('salao_active_employee_name', profName); } catch {}
                      setActiveTab('agenda');
                    }}
                  />
                )}

                {activeTab === 'servicos' && (
                  <ServicosView
                    services={services}
                    onSaveServices={(srvs) => {
                      setServices(srvs);
                      Storage.saveServices(srvs, activeSalonId);
                    }}
                  />
                )}

                {activeTab === 'clientes' && (
                  <ClientesView
                    clients={clients}
                    onSaveClients={(clis) => {
                      setClients(clis);
                      Storage.saveClients(clis, activeSalonId);
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
        readOnly={userRole === 'cliente' || userRole === 'funcionario'}
        config={config}
        onSaveConfig={handleSaveConfig}
      />

      {/* Settings Modal */}
      <ConfiguracoesModal
        isOpen={isConfigOpen}
        config={config}
        salonId={activeSalonId}
        salonName={activeSalon.name || config.nomeSalao}
        onClose={() => setIsConfigOpen(false)}
        onSaveConfig={handleSaveConfig}
      />

      {/* Admin Password & Auth Modal */}
      <AdminPasswordModal
        isOpen={isAdminAuthOpen}
        isAlreadyAdmin={userRole === 'admin'}
        targetRole={adminAuthTargetRole}
        onClose={() => setIsAdminAuthOpen(false)}
        onSuccess={(resolvedRole) => {
          const roleToSet = resolvedRole || adminAuthTargetRole || 'admin';
          setUserRole(roleToSet);
          setIsAdminAuthOpen(false);
          if (roleToSet === 'admin') {
            setIsAdminSalonsOpen(false);
          }
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
        onOpenSalonAccessLink={() => setIsSalonAccessLinkOpen(true)}
        onOpenAdminAuth={() => {
          setAdminAuthTargetRole('admin');
          setIsAdminAuthOpen(true);
        }}
        onOpenAdminChangePassword={() => setIsAdminChangePasswordOpen(true)}
        onOpenLiveHub={() => setIsLiveHubOpen(true)}
      />

      {/* Admin Change Password & User Management Modal */}
      <AdminChangePasswordModal
        isOpen={isAdminChangePasswordOpen}
        onClose={() => setIsAdminChangePasswordOpen(false)}
      />

      {/* Admin Receiving Payment Account Modal */}
      <AdminPaymentAccountModal
        isOpen={isAdminPaymentOpen}
        onClose={() => setIsAdminPaymentOpen(false)}
      />

      {/* Buy App & Generate Token Checkout Modal */}
      <BuyAppModal
        isOpen={isBuyAppOpen}
        onClose={() => {
          setIsBuyAppOpen(false);
          setInitialPaymentOrderId(null);
          setSelectedBuyPlanDays(undefined);
          setSelectedBuyCpf(undefined);
          if (!isAuthenticated) {
            setIsPageClosed(true);
          }
        }}
        initialOrderId={initialPaymentOrderId || undefined}
        initialPlanDays={selectedBuyPlanDays}
        initialBuyerCpf={selectedBuyCpf}
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
          setIsAuthenticated(true);
          setIsPageClosed(false);
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
        salons={salons}
        activeSalonId={activeSalonId}
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

      {/* Employee Direct Link & WhatsApp Generator Modal for Salon Admin */}
      <EmployeeLinkModal
        isOpen={isEmployeeLinkOpen}
        onClose={() => setIsEmployeeLinkOpen(false)}
        activeSalon={salons.find(s => s.id === activeSalonId) || salons[0]}
        salons={salons}
        professionals={professionals}
        onOpenEmployeeView={(salon, profName) => {
          handleSelectSalon(salon);
          if (profName) {
            setEmployeeName(profName);
            try { localStorage.setItem('salao_active_employee_name', profName); } catch {}
          } else {
            setEmployeeName('');
            try { localStorage.removeItem('salao_active_employee_name'); } catch {}
          }
          setUserRole('funcionario');
          setActiveTab('agenda');
        }}
      />

      {/* Salon Owner & Employee Login Modal */}
      <SalonAuthModal
        isOpen={isSalonAuthOpen}
        onClose={() => {
          setIsSalonAuthOpen(false);
          if (!isAuthenticated) {
            setIsPageClosed(true);
          }
        }}
        salons={salons}
        initialCpf={salonAuthCredentials.cpf}
        initialToken={salonAuthCredentials.token}
        initialMode={salonAuthMode}
        onOpenBuyApp={handleOpenBuyAppWithPlan}
        onSuccess={(salon, authenticatedRole, matchedEmployeeName) => {
          handleSelectSalon(salon);
          const roleToSet = authenticatedRole || salonAuthMode || 'salao';
          setUserRole(roleToSet);
          setIsAuthenticated(true);
          setIsPageClosed(false);
          if (roleToSet === 'admin') {
            setActiveTab('todos_saloes');
            setIsAdminSalonsOpen(false);
          } else if (roleToSet === 'funcionario') {
            if (matchedEmployeeName) {
              setEmployeeName(matchedEmployeeName);
              try { localStorage.setItem('salao_active_employee_name', matchedEmployeeName); } catch {}
            }
            setActiveTab('agenda');
          } else if (roleToSet === 'cliente') {
            setActiveTab('agendamento');
          } else {
            setActiveTab('dashboard');
          }
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

      {/* Admin Video Tutorial Configuration & MP4 Attachment Modal */}
      <AdminVideoConfigModal
        isOpen={isAdminVideoConfigOpen}
        onClose={() => setIsAdminVideoConfigOpen(false)}
        activeSalon={activeSalon}
        onOpenVideoTutorial={() => {
          // Can test video player if needed
        }}
      />

      {/* Admin Mass Broadcast to All Registered Salons Modal */}
      <AdminBroadcastModal
        isOpen={isAdminBroadcastOpen}
        onClose={() => setIsAdminBroadcastOpen(false)}
        salons={salons}
        onOpenVideoConfig={() => {
          setIsAdminBroadcastOpen(false);
          setIsAdminVideoConfigOpen(true);
        }}
      />

    </div>
  );
}

export default App;
