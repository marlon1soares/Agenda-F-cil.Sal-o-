import React, { useState, useRef, useEffect } from 'react';
import { SalonConfig, UserRole, ThemeConfig } from '../types';
import { THEMES } from '../data/mockData';
import { Storage } from '../utils/storage';
import { formatBRL } from '../utils/pricing';
import { Crown, Scissors, User, Minimize2, Maximize2, Settings, Image as ImageIcon, Sparkles, FolderOpen, ChevronDown, Building2, ShoppingCart, Link2 } from 'lucide-react';

interface NavbarProps {
  config: SalonConfig;
  userRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onOpenConfig: () => void;
  onOpenCatalog: () => void;
  onOpenAdminSalons?: () => void;
  onOpenBuyApp?: () => void;
  onOpenAdminPaymentConfig?: () => void;
  onOpenClientLink?: () => void;
  onOpenSalonLink?: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isMinimized: boolean;
  onToggleMinimize: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  config,
  userRole,
  onSelectRole,
  onOpenConfig,
  onOpenCatalog,
  onOpenAdminSalons,
  onOpenBuyApp,
  onOpenAdminPaymentConfig,
  onOpenClientLink,
  onOpenSalonLink,
  isExpanded,
  onToggleExpand,
  isMinimized,
  onToggleMinimize,
}) => {


  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentTheme: ThemeConfig = THEMES[config.temaKey] || THEMES.azul;
  const headerBgColor = config.corCustom || currentTheme.headerBg;

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
            <span>👑 Administrador</span>
          </>
        );
      case 'salao':
        return (
          <>
            <Scissors className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span>💈 Salão</span>
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
    <div
      style={{
        backgroundColor: headerBgColor,
        backgroundImage: config.bgHeaderUrl ? `url("${config.bgHeaderUrl}")` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      className="w-full text-white p-3 sm:p-5 shadow-md transition-all flex flex-col items-center justify-between select-none space-y-3"
    >
      {/* Top Action Bar Container (No overlapping) */}
      <div className="w-full flex items-center justify-between gap-2 bg-slate-950/70 backdrop-blur-md p-1.5 sm:px-3 sm:py-1.5 rounded-2xl border border-white/10 shadow-lg z-30">
        
        {/* Left Side: Role Selector & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap" ref={dropdownRef}>
          
          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(prev => !prev)}
              title="Alternar entre Administrador, Salão ou Cliente"
              className={`text-xs font-black px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shadow-md transition-all active:scale-95 ${getRoleButtonStyles()}`}
            >
              {getRoleLabel()}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-56 bg-slate-900 border border-sky-400/80 rounded-2xl shadow-2xl z-50 overflow-hidden py-1 text-xs">
                <div className="px-3 py-1.5 bg-slate-950 text-[10px] font-bold text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                  Perfil do Usuário:
                </div>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onSelectRole('admin');
                    if (onOpenAdminSalons) {
                      onOpenAdminSalons();
                    }
                  }}
                  className="w-full text-left px-3 py-2.5 font-bold text-[#38bdf8] hover:bg-slate-800/80 flex items-center justify-between border-b border-slate-800/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>👑 Administrador (Gestão)</span>
                  </div>
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                </button>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onSelectRole('salao');
                  }}
                  className="w-full text-left px-3 py-2.5 font-bold text-[#34d399] hover:bg-slate-800/80 flex items-center justify-between border-b border-slate-800/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-emerald-300 shrink-0" />
                    <div className="flex flex-col">
                      <span>💈 Salão / Barbearia</span>
                      <span className="text-[9px] font-medium text-emerald-400/80">Entrada c/ CPF e Token</span>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onSelectRole('cliente');
                  }}
                  className="w-full text-left px-3 py-2.5 font-bold text-[#f43f5e] hover:bg-slate-800/80 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-rose-300 shrink-0" />
                    <div className="flex flex-col">
                      <span>👤 Cliente (Agendamento)</span>
                      <span className="text-[9px] font-medium text-rose-400/80">Acesso por Link Exclusivo</span>
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Quick Buttons for Salon/Admin, and Prominent Horizontal Catalog for Client */}
          {userRole === 'cliente' ? (
            <button
              type="button"
              onClick={onOpenCatalog}
              title="Ver Catálogo de Fotos, Trabalhos & Produtos do Salão"
              className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm px-4 sm:px-6 py-2 rounded-xl shadow-lg border border-purple-400/50 flex items-center gap-2 transition-all active:scale-95 hover:shadow-purple-500/25"
            >
              <ImageIcon className="w-4 h-4 text-purple-200" />
              <span className="tracking-wide">Catálogo de Fotos & Trabalhos</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-300 hidden sm:inline" />
            </button>
          ) : (
            <>
              {onOpenClientLink && (
                <button
                  onClick={onOpenClientLink}
                  title="Criar e compartilhar link de agendamento online para clientes"
                  className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1.5 transition-all active:scale-95 border border-rose-400/40 shrink-0"
                >
                  <Link2 className="w-3.5 h-3.5 text-rose-200" />
                  <span>Criar Link p/ Clientes</span>
                </button>
              )}

              {userRole === 'admin' && onOpenSalonLink && (
                <button
                  onClick={onOpenSalonLink}
                  title="Criar e enviar link de compra de licença para proprietários de salões de cabeleireiro e barbearias"
                  className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1.5 transition-all active:scale-95 border border-violet-400/40 shrink-0"
                >
                  <Link2 className="w-3.5 h-3.5 text-violet-200" />
                  <span>Criar Link p/ Salão</span>
                </button>
              )}

              {userRole === 'admin' && onOpenAdminSalons && (
                <button
                  onClick={onOpenAdminSalons}
                  title="Abrir painel de salões conectados e solicitações para novos salões"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1.5 transition-all active:scale-95 border border-blue-400/40 shrink-0"
                >
                  <Building2 className="w-3.5 h-3.5 text-sky-200" />
                  <span>Meus Salões</span>
                </button>
              )}

              {userRole === 'admin' && onOpenBuyApp && (
                <button
                  type="button"
                  onClick={onOpenBuyApp}
                  onDoubleClick={() => {
                    if (onOpenAdminPaymentConfig) {
                      onOpenAdminPaymentConfig();
                    }
                  }}
                  title="[Exclusivo Administrador] 1 Clique: Abrir Teste de Compra | 2 Cliques: Configurar Valores (30d, 3m, 6m, 1a)"
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1.5 transition-all active:scale-95 border border-emerald-400/40 select-none group cursor-pointer"
                >
                  <ShoppingCart className="w-3.5 h-3.5 text-yellow-300 group-hover:scale-110 transition-transform" />
                  <span>Comprar Aplicativo</span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenAdminPaymentConfig) onOpenAdminPaymentConfig();
                    }}
                    title="💡 2 Cliques para Configurar Valores (Clique aqui ou 2 cliques no botão para alterar preços)"
                    className="bg-yellow-400/25 hover:bg-yellow-400/40 text-yellow-300 font-black text-[10px] px-2 py-0.5 rounded-md border border-yellow-300/40 inline-flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>{formatBRL(Storage.getAdminPaymentConfig().precoPlano30Dias || 30)}/mês</span>
                    <span className="text-[9px] font-extrabold text-amber-200 hidden sm:inline">💡 2 Cliques</span>
                  </span>
                </button>
              )}
            </>
          )}

        </div>

        {/* Right Side: Control & Window Actions */}
        <div className="flex items-center gap-1.5">
          {userRole !== 'cliente' && (
            <button
              onClick={onOpenCatalog}
              title="Abrir e Gerenciar Catálogo de Mídias"
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md transition-all border border-purple-400/30 active:scale-95"
            >
              <ImageIcon className="w-3.5 h-3.5 text-purple-200" />
              <span>Catálogo</span>
            </button>
          )}

          {userRole !== 'cliente' && (
            <button
              onClick={onOpenConfig}
              title="Configurações do Salão"
              className="bg-slate-800/80 hover:bg-slate-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-colors border border-slate-700"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Config</span>
            </button>
          )}

          {/* Seta de Diminuir (Minimizar) - visível em todos os módulos */}
          <button
            onClick={onToggleMinimize}
            title="Diminuir / Minimizar em barra"
            className="bg-black/50 hover:bg-black/80 text-white text-xs font-bold p-1.5 sm:px-2.5 rounded-xl transition-all border border-white/10 flex items-center gap-1"
          >
            <Minimize2 className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden md:inline text-[10px]">Diminuir</span>
          </button>

          {/* Seta de Expandir (Tela Cheia) - visível em todos os módulos */}
          <button
            onClick={onToggleExpand}
            title="Expandir / Alternar Tela Cheia"
            className="bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-bold p-1.5 sm:px-2.5 rounded-xl transition-all border border-emerald-400/40 shadow-sm flex items-center gap-1"
          >
            <Maximize2 className="w-3.5 h-3.5 text-emerald-200" />
            <span className="hidden md:inline text-[10px]">Expandir</span>
          </button>
        </div>

      </div>

      {/* Center Salon Header Title & Clean Module Badge - Compact to move content UP */}
      <div className="py-1 flex flex-col items-center justify-center text-center max-w-2xl w-full">
        {config.logoUrl && (
          <img
            src={config.logoUrl}
            alt="Logo Salão"
            className="max-h-12 max-w-xs object-contain rounded-xl shadow-md bg-white p-1 mb-1"
          />
        )}
        
        <h1 className="text-xl sm:text-2xl font-black tracking-tight drop-shadow-md font-display flex items-center justify-center gap-2">
          <span>{config.nomeSalao}</span>
        </h1>

        {/* Status & Active Mode Badge in Portuguese */}
        <div className="mt-1 text-[11px] font-bold px-3 py-0.5 rounded-full flex items-center justify-center gap-1.5 border shadow-sm backdrop-blur-md bg-black/50 border-white/15 text-white/90">
          <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
          <span>
            {userRole === 'admin' && '👑 Módulo Administrador • Gestão da Plataforma e Salões'}
            {userRole === 'salao' && '💈 Módulo Salão de Beleza • Painel do Profissional'}
            {userRole === 'cliente' && '👤 Portal do Cliente • Agendamento Online'}
          </span>
        </div>
      </div>
    </div>
  );
};
