import React, { useState, useRef, useEffect } from 'react';
import { SalonConfig, UserRole, ThemeConfig, Professional } from '../types';
import { THEMES } from '../data/mockData';
import { Storage } from '../utils/storage';
import { formatBRL } from '../utils/pricing';
import { Crown, Scissors, User, Users, Minimize2, Maximize2, Settings, Image as ImageIcon, Sparkles, FolderOpen, ChevronDown, Building2, ShoppingCart, Link2, Key, Radio, Wifi, MessageSquare, Play, Video, Send } from 'lucide-react';

interface NavbarProps {
  config: SalonConfig;
  userRole: UserRole;
  employeeName?: string;
  professionals?: Professional[];
  onSelectEmployeeName?: (name: string) => void;
  onSelectRole: (role: UserRole) => void;
  onOpenConfig: () => void;
  onOpenCatalog: () => void;
  onOpenLiveHub?: () => void;
  onOpenAdminSalons?: () => void;
  onOpenBuyApp?: () => void;
  onOpenAdminPaymentConfig?: () => void;
  onOpenAdminVideoConfig?: () => void;
  onOpenAdminBroadcast?: () => void;
  onOpenClientLink?: () => void;
  onOpenEmployeeLink?: () => void;
  onOpenSalonLink?: () => void;
  onOpenSalonAccessLink?: () => void;
  onOpenAdminChangePassword?: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isMinimized: boolean;
  onToggleMinimize: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  config,
  userRole,
  employeeName,
  professionals = [],
  onSelectEmployeeName,
  onSelectRole,
  onOpenConfig,
  onOpenCatalog,
  onOpenLiveHub,
  onOpenAdminSalons,
  onOpenBuyApp,
  onOpenAdminPaymentConfig,
  onOpenAdminVideoConfig,
  onOpenAdminBroadcast,
  onOpenClientLink,
  onOpenEmployeeLink,
  onOpenSalonLink,
  onOpenSalonAccessLink,
  onOpenAdminChangePassword,
  isExpanded,
  onToggleExpand,
  isMinimized,
  onToggleMinimize,
}) => {


  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentTheme: ThemeConfig = THEMES[config.temaKey] || THEMES.azul;
  const headerBgColor = config.corCustom || currentTheme.headerBg;

  const effectiveEmployeeName = employeeName || (professionals.length > 0 ? professionals[0].name : 'Equipe do Salão');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleButtonStyles = () => {
    switch (userRole) {
      case 'admin':
        return 'bg-[#1e1b4b] border-[#38bdf8] text-[#38bdf8] hover:bg-slate-900';
      case 'salao':
        return 'bg-[#064e3b] border-[#34d399] text-[#34d399] hover:bg-emerald-900';
      case 'funcionario':
        return 'bg-[#0f2e24] border-[#2dd4bf] text-[#2dd4bf] hover:bg-teal-950';
      case 'cliente':
        return 'bg-[#881337] border-[#f43f5e] text-[#f43f5e] hover:bg-rose-950';
      default:
        return 'bg-slate-900 border-sky-400 text-sky-400';
    }
  };

  const getRoleLabel = () => {
    switch (userRole) {
      case 'admin':
        return (
          <>
            <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>👑 Administrador (Gestão)</span>
          </>
        );
      case 'salao':
        return (
          <>
            <Scissors className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span>💈 Salão / Administrador</span>
          </>
        );
      case 'funcionario':
        return (
          <>
            <Scissors className="w-3.5 h-3.5 text-teal-300 shrink-0" />
            <span>💈 Salão / Funcionário{effectiveEmployeeName ? `: ${effectiveEmployeeName}` : ''}</span>
          </>
        );
      case 'cliente':
        return (
          <>
            <User className="w-3.5 h-3.5 text-rose-300 shrink-0" />
            <span>👤 Cliente</span>
          </>
        );
    }
  };

  if (isMinimized) {
    return (
      <div 
        style={{ backgroundColor: headerBgColor }}
        className="w-full px-3 py-2 text-white flex items-center justify-between shadow-md cursor-move select-none rounded-lg"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <button
            onClick={onToggleMinimize}
            className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Abrir Painel</span>
          </button>
          <span className="text-xs font-extrabold truncate max-w-[120px]">
            {config.nomeSalao}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] bg-white/20 font-bold px-1.5 py-0.5 rounded uppercase">
            {userRole}
          </span>
          <button 
            onClick={onToggleMinimize}
            className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <header
      id="main-app-header"
      style={{
        backgroundColor: headerBgColor,
        backgroundImage: config.bgHeaderUrl ? `url("${config.bgHeaderUrl}")` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      className="w-full text-white p-2.5 sm:p-4 shadow-md transition-all flex flex-col items-center justify-between select-none space-y-2.5"
    >
      {/* TIER 1: Top Navigation Bar (Profile Dropdown + Global Actions) */}
      <div 
        id="navbar-top-tier"
        className="w-full flex items-center justify-between gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/10 shadow-lg z-30"
      >
        {/* Left Side: Profile Selector Dropdown & Active Salon Pill */}
        <div className="flex items-center gap-2 shrink-0" ref={dropdownRef}>
          {/* Profile Dropdown */}
          <div className="relative">
            <button
              id="btn-role-dropdown"
              onClick={() => setIsDropdownOpen(prev => !prev)}
              title="Alternar entre Administrador, Salão ou Cliente"
              className={`text-xs font-black px-2.5 sm:px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer ${getRoleButtonStyles()}`}
            >
              {getRoleLabel()}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div 
                id="role-dropdown-menu"
                className="absolute top-full left-0 mt-2 w-64 bg-slate-900 border border-sky-400/80 rounded-2xl shadow-2xl z-50 overflow-hidden py-1 text-xs"
              >
                <div className="px-3 py-1.5 bg-slate-950 text-[10px] font-bold text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                  Mudar Perfil do Usuário:
                </div>

                <button
                  id="btn-select-role-admin"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onSelectRole('admin');
                  }}
                  className="w-full text-left px-3 py-2.5 font-bold text-[#38bdf8] hover:bg-slate-800 flex items-center justify-between border-b border-slate-800/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>👑 Administrador (Gestão)</span>
                  </div>
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                </button>

                <button
                  id="btn-select-role-salao"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onSelectRole('salao');
                  }}
                  className="w-full text-left px-3 py-2.5 font-bold text-[#34d399] hover:bg-slate-800 flex items-center justify-between border-b border-slate-800/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-emerald-300 shrink-0" />
                    <div className="flex flex-col">
                      <span>💈 Salão / Administrador</span>
                      <span className="text-[9px] font-medium text-emerald-400/80">Entrada c/ CPF e Senha • Painel Completo</span>
                    </div>
                  </div>
                </button>

                <button
                  id="btn-select-role-funcionario"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onSelectRole('funcionario');
                  }}
                  className="w-full text-left px-3 py-2.5 font-bold text-[#2dd4bf] hover:bg-slate-800 flex items-center justify-between border-b border-slate-800/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-teal-300 shrink-0" />
                    <div className="flex flex-col">
                      <span>💈 Salão / Funcionário</span>
                      <span className="text-[9px] font-medium text-teal-400/80">Entrada c/ CPF do Funcionário e Senha</span>
                    </div>
                  </div>
                </button>

                <button
                  id="btn-select-role-cliente"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onSelectRole('cliente');
                  }}
                  className="w-full text-left px-3 py-2.5 font-bold text-[#f43f5e] hover:bg-slate-800 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-rose-300 shrink-0" />
                    <div className="flex flex-col">
                      <span>👤 Cliente (Agendamento)</span>
                      <span className="text-[9px] font-medium text-rose-400/80">Portal do Usuário</span>
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Quick Active Salon Label on Desktop/Tablet */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] font-bold text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="truncate max-w-[150px]">{config.nomeSalao}</span>
          </div>

          {/* Prominent Employee Indicator Pill */}
          {userRole === 'funcionario' && (
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-gradient-to-r from-teal-950 via-teal-900 to-emerald-950 border border-teal-400/60 text-xs font-black text-teal-200 shadow-md animate-in fade-in">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping shrink-0" />
              <User className="w-3.5 h-3.5 text-teal-300 shrink-0" />
              <span className="text-teal-300 font-extrabold hidden xs:inline">FUNCIONÁRIO:</span>
              <span className="text-white font-black uppercase tracking-wide truncate max-w-[160px]">
                {effectiveEmployeeName}
              </span>
            </div>
          )}
        </div>

        {/* Right Side: Global Tools (Live Hub, Catalog, Config, Minimize, Expand) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Live Real-Time Connection Hub Button */}
          {onOpenLiveHub && (
            <button
              id="btn-navbar-live-hub"
              onClick={onOpenLiveHub}
              title="Central de Conexão Tripla: Administrador • Salão • Clientes em Tempo Real"
              className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-black px-2.5 sm:px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md transition-all border border-emerald-400/50 active:scale-95 cursor-pointer"
            >
              <div className="relative flex items-center justify-center">
                <Wifi className="w-3.5 h-3.5 text-emerald-300" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>
              </div>
              <span className="hidden sm:inline">Ao Vivo</span>
              <MessageSquare className="w-3.5 h-3.5 text-emerald-200" />
            </button>
          )}

          {/* Catalog Button */}
          <button
            id="btn-navbar-catalog"
            onClick={onOpenCatalog}
            title="Catálogo de Fotos e Trabalhos"
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md transition-all border border-purple-400/30 active:scale-95 cursor-pointer"
          >
            <ImageIcon className="w-3.5 h-3.5 text-purple-200" />
            <span className="hidden sm:inline">Catálogo</span>
          </button>

          {/* Config Button (Salão/Admin) */}
          {(userRole === 'admin' || userRole === 'salao') && (
            <button
              id="btn-navbar-config"
              onClick={onOpenConfig}
              title="Configurações do Salão"
              className="bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-bold p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl flex items-center gap-1 transition-colors border border-slate-700 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Config</span>
            </button>
          )}

          {/* Minimize / Expand Window Actions */}
          <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
            <button
              id="btn-navbar-minimize"
              onClick={onToggleMinimize}
              title="Diminuir / Minimizar em barra"
              className="bg-black/50 hover:bg-black/80 text-slate-300 hover:text-white p-1.5 rounded-xl transition-all border border-white/10 flex items-center justify-center cursor-pointer"
            >
              <Minimize2 className="w-3.5 h-3.5 text-amber-300" />
            </button>

            <button
              id="btn-navbar-expand"
              onClick={onToggleExpand}
              title="Expandir / Alternar Tela Cheia"
              className="bg-emerald-700/70 hover:bg-emerald-600 text-white p-1.5 rounded-xl transition-all border border-emerald-400/40 shadow-sm flex items-center justify-center cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5 text-emerald-200" />
            </button>
          </div>
        </div>
      </div>

      {/* TIER 2: Role Action Strip (Organized Horizontally without Overlapping) */}
      <div 
        id="navbar-action-strip"
        className="w-full bg-slate-950/70 backdrop-blur-md px-2.5 py-1.5 rounded-2xl border border-white/10 shadow-sm flex items-center overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex items-center gap-2 flex-nowrap sm:flex-wrap w-full">
          {/* CLIENT ACTIONS */}
          {userRole === 'cliente' ? (
            <div className="flex items-center justify-between w-full gap-2">
              <div className="flex items-center gap-2">
                <button
                  id="btn-client-catalog-hero"
                  type="button"
                  onClick={onOpenCatalog}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs px-3.5 py-1.5 rounded-xl shadow-md border border-purple-400/40 flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-purple-200" />
                  <span>Ver Catálogo de Fotos</span>
                  <Sparkles className="w-3 h-3 text-amber-300" />
                </button>

                {onOpenLiveHub && (
                  <button
                    id="btn-client-live-chat"
                    type="button"
                    onClick={onOpenLiveHub}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-md border border-emerald-400/40 flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-100" />
                    <span>Chat com o Salão</span>
                  </button>
                )}
              </div>

              <span className="text-[11px] font-bold text-slate-300 hidden md:inline">
                ✨ Escolha o serviço, profissional e horário abaixo
              </span>
            </div>
          ) : userRole === 'funcionario' ? (
            /* EMPLOYEE ACTIONS */
            <div className="flex items-center justify-between w-full gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-2 flex-wrap">
                {/* 1. Link p/ Clientes */}
                {onOpenClientLink && (
                  <button
                    id="btn-action-client-link-func"
                    type="button"
                    onClick={onOpenClientLink}
                    title="Compartilhar link de agendamento online com clientes"
                    className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl shadow-md flex items-center gap-1.5 transition-all active:scale-95 border border-rose-400/40 cursor-pointer shrink-0"
                  >
                    <Link2 className="w-3.5 h-3.5 text-rose-200" />
                    <span>Link p/ Clientes</span>
                  </button>
                )}

                {/* 2. Nome do Funcionário (do lado direito do link para clientes) - EXCLUSIVO E INDIVIDUAL */}
                <div 
                  id="navbar-employee-name-pill"
                  className="bg-gradient-to-r from-teal-950/95 via-teal-900/90 to-emerald-950/95 border border-teal-400/70 px-3.5 py-1.5 rounded-xl text-teal-200 text-xs font-bold flex items-center gap-2 shadow-md"
                >
                  <div className="w-5 h-5 rounded-md bg-teal-500/30 text-teal-200 border border-teal-400/40 flex items-center justify-center font-black text-[11px] shrink-0">
                    {effectiveEmployeeName ? effectiveEmployeeName.charAt(0).toUpperCase() : '👤'}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-teal-300 font-extrabold text-[11px] uppercase tracking-wider">Funcionário:</span>
                    <strong className="text-white font-black text-xs uppercase tracking-wide">
                      {effectiveEmployeeName}
                    </strong>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" title="Conectado à sua agenda individual" />
                </div>
              </div>

              <span className="text-[11px] font-bold text-teal-300/90 hidden md:inline">
                ✨ Sua agenda pessoal e horários sincronizados em tempo real
              </span>
            </div>
          ) : (
            /* SALON / ADMIN ACTIONS */
            <>
              {onOpenClientLink && (
                <button
                  id="btn-action-client-link"
                  onClick={onOpenClientLink}
                  title="Criar e compartilhar link de agendamento online para clientes"
                  className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-all active:scale-95 border border-rose-400/40 shrink-0 cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5 text-rose-200" />
                  <span>Criar Link p/ Clientes</span>
                </button>
              )}

              {onOpenEmployeeLink && (
                <button
                  id="btn-action-employee-link"
                  onClick={onOpenEmployeeLink}
                  title="Criar e enviar link de acesso ao painel para funcionários / equipe"
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-all active:scale-95 border border-teal-400/40 shrink-0 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-teal-200" />
                  <span>Link Salão/Funcionário</span>
                </button>
              )}

              {userRole === 'salao' && onOpenBuyApp && (
                <div className="inline-flex items-center shrink-0">
                  <button
                    id="btn-action-buy-app-salao"
                    type="button"
                    onClick={onOpenBuyApp}
                    title="Abrir painel de compras do App e renovação de licença"
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-all active:scale-95 border border-emerald-400/40 cursor-pointer select-none group"
                  >
                    <ShoppingCart className="w-4 h-4 text-yellow-300 group-hover:scale-110 transition-transform shrink-0" />
                    <span>Comprar App</span>
                    <span className="bg-yellow-400/20 text-yellow-300 font-black text-[10px] px-1.5 py-0.5 rounded border border-yellow-300/40 inline-flex items-center">
                      <span>{formatBRL(Storage.getAdminPaymentConfig().precoPlano30Dias || 30)}/mês</span>
                    </span>
                  </button>
                </div>
              )}

              {userRole === 'admin' && onOpenSalonLink && (
                <button
                  id="btn-action-salon-buy-link"
                  onClick={onOpenSalonLink}
                  title="Criar e enviar link de compra para donos de salão"
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-all active:scale-95 border border-violet-400/40 shrink-0 cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5 text-violet-200" />
                  <span>Criar Link Compra/Salão</span>
                </button>
              )}

              {userRole === 'admin' && onOpenSalonAccessLink && (
                <button
                  id="btn-action-salon-access-link"
                  onClick={onOpenSalonAccessLink}
                  title="Criar e enviar link de acesso direto com CPF e Token para o salão"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-all active:scale-95 border border-emerald-400/40 shrink-0 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5 text-emerald-100" />
                  <span>Criar Link Salão/Acesso</span>
                </button>
              )}

              {userRole === 'admin' && onOpenAdminSalons && (
                <button
                  id="btn-action-my-salons"
                  onClick={onOpenAdminSalons}
                  title="Abrir painel de gestão de salões conectados"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-all active:scale-95 border border-blue-400/40 shrink-0 cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5 text-sky-200" />
                  <span>Meus Salões</span>
                </button>
              )}

              {userRole === 'admin' && onOpenAdminChangePassword && (
                <button
                  id="btn-action-admin-change-password"
                  onClick={onOpenAdminChangePassword}
                  title="Alterar Senha do Administrador e Gerenciar Usuários/Acessos"
                  className="bg-slate-900 hover:bg-slate-800 text-emerald-400 font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-all active:scale-95 border border-emerald-500/40 shrink-0 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Alterar Senha Admin</span>
                </button>
              )}

              {userRole === 'admin' && onOpenAdminVideoConfig && (
                <button
                  id="btn-action-admin-video-config"
                  type="button"
                  onClick={onOpenAdminVideoConfig}
                  title="Configurar e Anexar Vídeo Tutorial em MP4 pesquisando no computador"
                  className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-all active:scale-95 border border-red-400/40 shrink-0 cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5 text-yellow-300" />
                  <span>Anexar Vídeo Tutorial (MP4)</span>
                </button>
              )}

              {userRole === 'admin' && onOpenAdminBroadcast && (
                <button
                  id="btn-action-admin-broadcast"
                  type="button"
                  onClick={onOpenAdminBroadcast}
                  title="Disparar qualquer informação, comunicado ou vídeo tutorial para todos os salões cadastrados de uma vez só"
                  className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-all active:scale-95 border border-amber-400/40 shrink-0 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-amber-200" />
                  <span>Disparar p/ Todos os Salões</span>
                </button>
              )}

              {userRole === 'admin' && onOpenBuyApp && (
                <div className="inline-flex items-center shrink-0">
                  <button
                    id="btn-action-buy-app"
                    type="button"
                    onClick={onOpenBuyApp}
                    onDoubleClick={() => {
                      if (onOpenAdminPaymentConfig) onOpenAdminPaymentConfig();
                    }}
                    title="1 Clique: Abrir Teste de Compra | 2 Cliques: Configurar Valores dos Planos"
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-all active:scale-95 border border-emerald-400/40 cursor-pointer select-none group"
                  >
                    <ShoppingCart className="w-3.5 h-3.5 text-yellow-300 group-hover:scale-110 transition-transform" />
                    <span>Comprar App</span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenAdminPaymentConfig) onOpenAdminPaymentConfig();
                      }}
                      title="Clique para configurar valores dos planos"
                      className="bg-yellow-400/25 hover:bg-yellow-400/40 text-yellow-300 font-black text-[10px] px-1.5 py-0.5 rounded border border-yellow-300/40 inline-flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>{formatBRL(Storage.getAdminPaymentConfig().precoPlano30Dias || 30)}/mês</span>
                    </span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* TIER 3: Center Salon Branding (Clean & Compact) */}
      <div 
        id="navbar-branding-tier"
        className="py-0.5 flex flex-col items-center justify-center text-center max-w-2xl w-full"
      >
        {config.logoUrl && (
          <img
            src={config.logoUrl}
            alt="Logo Salão"
            className="max-h-10 max-w-xs object-contain rounded-xl shadow-md bg-white p-1 mb-1"
          />
        )}
        
        <h1 className="text-lg sm:text-2xl font-black tracking-tight drop-shadow-md font-display flex items-center justify-center gap-2">
          <span>{config.nomeSalao}</span>
        </h1>

        {/* Status & Active Mode Badge */}
        <div className="mt-0.5 text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center justify-center gap-1.5 border shadow-xs backdrop-blur-md bg-black/50 border-white/15 text-white/90">
          <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
          <span>
            {userRole === 'admin' && '👑 Painel Administrador • Gestão Geral da Plataforma'}
            {userRole === 'salao' && '💈 Salão / Administrador • Painel Completo & Gestão'}
            {userRole === 'funcionario' && `💈 Salão / Funcionário: ${effectiveEmployeeName} • Sua Agenda, Equipe, Serviços e Clientes`}
            {userRole === 'cliente' && '👤 Portal do Cliente • Agendamentos Online'}
          </span>
        </div>
      </div>
    </header>
  );
};
