import React, { useState, useMemo } from 'react';
import { SalonApp, SalonConfig } from '../types';
import { THEMES } from '../data/mockData';
import { Storage } from '../utils/storage';
import { 
  Building2, Plus, Search, Check, Trash2, Edit3, ExternalLink, 
  X, Sparkles, User, Mail, Phone, Palette, Scissors, Copy, ShieldCheck, Share2,
  Key, Calendar, Clock, CheckCircle2, AlertCircle, RefreshCw, Send, Lock, Settings,
  MapPin, Globe, FileText, PieChart, Table, Map, Activity, ArrowRight, Eye, Link2,
  Play, Video
} from 'lucide-react';

interface AdminSalonsModalProps {
  isOpen: boolean;
  onClose: () => void;
  salons: SalonApp[];
  activeSalonId: string;
  onSelectSalon: (salon: SalonApp) => void;
  onCreateSalon: (newSalon: SalonApp) => void;
  onUpdateSalon: (updatedSalon: SalonApp) => void;
  onDeleteSalon: (salonId: string) => void;
  onOpenPaymentConfig?: () => void;
  onOpenSalonLink?: () => void;
  onOpenSalonAccessLink?: () => void;
  onOpenAdminAuth?: () => void;
  onOpenAdminChangePassword?: () => void;
  onOpenLiveHub?: () => void;
  onOpenVideoTutorial?: () => void;
  onOpenVideoConfig?: () => void;
}

export const AdminSalonsModal: React.FC<AdminSalonsModalProps> = ({
  isOpen,
  onClose,
  salons,
  activeSalonId,
  onSelectSalon,
  onCreateSalon,
  onUpdateSalon,
  onDeleteSalon,
  onOpenPaymentConfig,
  onOpenSalonLink,
  onOpenSalonAccessLink,
  onOpenAdminAuth,
  onOpenAdminChangePassword,
  onOpenLiveHub,
  onOpenVideoTutorial,
  onOpenVideoConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'cards' | 'pending' | 'connected' | 'inspector' | 'location_table'>('cards');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'blocked'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectedSalonId, setInspectedSalonId] = useState<string>(activeSalonId || (salons.length > 0 ? salons[0].id : ''));
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSalon, setEditingSalon] = useState<SalonApp | null>(null);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>('');
  const [salonToDelete, setSalonToDelete] = useState<SalonApp | null>(null);

  // New / Edit Salon Form States
  const [formName, setFormName] = useState('');
  const [formOwnerName, setFormOwnerName] = useState('');
  const [formOwnerRg, setFormOwnerRg] = useState('');
  const [formOwnerCpf, setFormOwnerCpf] = useState('');
  const [formOwnerEmail, setFormOwnerEmail] = useState('');
  const [formOwnerPhone, setFormOwnerPhone] = useState('');
  const [formCep, setFormCep] = useState('');
  const [formLogradouro, setFormLogradouro] = useState('');
  const [formNumero, setFormNumero] = useState('');
  const [formBairro, setFormBairro] = useState('');
  const [formCidade, setFormCidade] = useState('');
  const [formUf, setFormUf] = useState('');
  const [formPlanDays, setFormPlanDays] = useState<number>(365);
  const [formTemaKey, setFormTemaKey] = useState('azul');
  const [formCorCustom, setFormCorCustom] = useState('#2563eb');
  const [formLogoUrl, setFormLogoUrl] = useState('');
  const [formBgHeaderUrl, setFormBgHeaderUrl] = useState('');
  const [formProfs, setFormProfs] = useState<{ id: string; nome: string; porc: number }[]>([
    { id: 'p-1', nome: 'Michael', porc: 70 },
    { id: 'p-2', nome: 'Marlon', porc: 30 }
  ]);
  const [formError, setFormError] = useState('');

  const showFeedback = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(''), 3500);
  };

  const pendingSalons = useMemo(() => salons.filter(s => s.status === 'pending_approval'), [salons]);
  const connectedSalons = useMemo(() => salons.filter(s => s.status === 'active' || !s.status), [salons]);
  const blockedSalons = useMemo(() => salons.filter(s => s.status === 'blocked'), [salons]);

  const pendingCount = pendingSalons.length;
  const activeCount = connectedSalons.length;
  const blockedCount = blockedSalons.length;

  const filteredSalons = salons.filter(s => {
    // Tab Filter constraints
    if (activeTab === 'pending' && s.status !== 'pending_approval') return false;
    if (activeTab === 'connected' && s.status !== 'active' && s.status) return false;

    // Status Filter dropdown (when in cards view)
    if (activeTab === 'cards') {
      if (statusFilter === 'pending' && s.status !== 'pending_approval') return false;
      if (statusFilter === 'active' && s.status !== 'active' && s.status) return false;
      if (statusFilter === 'blocked' && s.status !== 'blocked') return false;
    }

    // Search Query Filter
    const q = searchQuery.toLowerCase();
    const token = (s.purchaseToken || '').toLowerCase();
    const rg = (s.ownerRg || '').toLowerCase();
    const cpf = (s.ownerCpf || '').toLowerCase();
    const cidade = (s.cidade || '').toLowerCase();
    const uf = (s.uf || '').toLowerCase();
    const cep = (s.cep || '').toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.ownerName.toLowerCase().includes(q) ||
      s.ownerEmail.toLowerCase().includes(q) ||
      s.appCode.toLowerCase().includes(q) ||
      token.includes(q) ||
      rg.includes(q) ||
      cpf.includes(q) ||
      cidade.includes(q) ||
      uf.includes(q) ||
      cep.includes(q)
    );
  });

  // Inspected Salon object for the inspector tab
  const inspectedSalon = salons.find(s => s.id === inspectedSalonId) || (salons.length > 0 ? salons[0] : null);

  // Group salons by location for the Geographical Table
  const locationGroups = useMemo(() => {
    const map: Record<string, { uf: string; cidade: string; salons: SalonApp[] }> = {};
    salons.forEach(s => {
      const uf = (s.uf || 'N/A').toUpperCase();
      const cidade = s.cidade ? s.cidade.trim() : 'Não Informada';
      const key = `${uf} - ${cidade}`;
      if (!map[key]) {
        map[key] = { uf, cidade, salons: [] };
      }
      map[key].salons.push(s);
    });
    return Object.values(map).sort((a, b) => b.salons.length - a.salons.length);
  }, [salons]);

  if (!isOpen) return null;

  const resetForm = () => {
    setFormName('');
    setFormOwnerName('');
    setFormOwnerRg('');
    setFormOwnerCpf('');
    setFormOwnerEmail('');
    setFormOwnerPhone('');
    setFormCep('');
    setFormLogradouro('');
    setFormNumero('');
    setFormBairro('');
    setFormCidade('');
    setFormUf('');
    setFormPlanDays(365);
    setFormTemaKey('azul');
    setFormCorCustom('#2563eb');
    setFormLogoUrl('');
    setFormBgHeaderUrl('');
    setFormProfs([
      { id: 'p-1', nome: 'Michael', porc: 70 },
      { id: 'p-2', nome: 'Marlon', porc: 30 }
    ]);
    setFormError('');
    setEditingSalon(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateForm(true);
  };

  const openEditModal = (salon: SalonApp) => {
    setEditingSalon(salon);
    setFormName(salon.name);
    setFormOwnerName(salon.ownerName);
    setFormOwnerRg(salon.ownerRg || '');
    setFormOwnerCpf(salon.ownerCpf || '');
    setFormOwnerEmail(salon.ownerEmail);
    setFormOwnerPhone(salon.ownerPhone);
    setFormCep(salon.cep || '');
    setFormLogradouro(salon.logradouro || '');
    setFormNumero(salon.numero || '');
    setFormBairro(salon.bairro || '');
    setFormCidade(salon.cidade || '');
    setFormUf(salon.uf || '');
    setFormPlanDays(salon.planDays || 365);
    setFormTemaKey(salon.config.temaKey || 'azul');
    setFormCorCustom(salon.config.corCustom || '#2563eb');
    setFormLogoUrl(salon.config.logoUrl || '');
    setFormBgHeaderUrl(salon.config.bgHeaderUrl || '');
    setFormProfs(
      salon.config.profs.length > 0
        ? salon.config.profs.map((p, idx) => ({ id: p.id || `p-${idx}`, nome: p.nome, porc: p.porc }))
        : [{ id: 'p-1', nome: 'Michael', porc: 70 }]
    );
    setFormError('');
    setShowCreateForm(true);
  };

  const handleToggleApproveSalon = (salon: SalonApp) => {
    const newStatus = salon.status === 'pending_approval' || salon.status === 'blocked' ? 'active' : 'blocked';
    const updated: SalonApp = {
      ...salon,
      status: newStatus,
      emailSentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    onUpdateSalon(updated);
    showFeedback(newStatus === 'active' ? `Acesso do salão "${salon.name}" APROVADO e LIBERADO com sucesso!` : `Acesso do salão "${salon.name}" bloqueado.`);
  };

  const handleExtendLicense = (salon: SalonApp, extraDays: number) => {
    const currentExp = salon.expiresAt ? new Date(salon.expiresAt) : new Date();
    currentExp.setDate(currentExp.getDate() + extraDays);
    const newExpiresAt = currentExp.toISOString().split('T')[0];

    const updated: SalonApp = {
      ...salon,
      status: 'active',
      planDays: (salon.planDays || 365) + extraDays,
      expiresAt: newExpiresAt
    };
    onUpdateSalon(updated);
    showFeedback(`Prazo de licença prorrogado em +${extraDays} dias para o salão "${salon.name}"!`);
  };

  const handleRegenerateToken = (salon: SalonApp) => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const cleanName = salon.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
    const newToken = `TOK-${cleanName || 'SALÃO'}-${randomNum}`;

    const updated: SalonApp = {
      ...salon,
      purchaseToken: newToken,
      emailSentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    onUpdateSalon(updated);
    showFeedback(`Novo Token (${newToken}) gerado e e-mail disparado para ${salon.ownerEmail}`);
  };

  const handleCopyToken = (salonId: string, token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedTokenId(salonId);
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  const handleAddProfLine = () => {
    setFormProfs(prev => [...prev, { id: `p-${Date.now()}`, nome: '', porc: 50 }]);
  };

  const handleRemoveProfLine = (id: string) => {
    if (formProfs.length <= 1) {
      setFormError('O aplicativo do salão precisa ter pelo menos 1 profissional.');
      return;
    }
    setFormProfs(prev => prev.filter(p => p.id !== id));
  };

  const handleSaveSalonForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('Por favor, informe o Nome do Salão / Barbearia.');
      return;
    }
    if (!formOwnerEmail.trim() || !formOwnerEmail.includes('@')) {
      setFormError('Por favor, informe um E-mail válido do proprietário do salão.');
      return;
    }

    const cleanProfs = formProfs
      .filter(p => p.nome.trim() !== '')
      .map(p => ({ id: p.id, nome: p.nome.trim(), porc: Number(p.porc) || 0 }));

    if (cleanProfs.length === 0) {
      setFormError('Informe o nome de ao menos um profissional.');
      return;
    }

    const salonConfig: SalonConfig = {
      nomeSalao: formName.trim(),
      logoUrl: formLogoUrl.trim(),
      bgHeaderUrl: formBgHeaderUrl.trim(),
      temaKey: formTemaKey,
      corCustom: formCorCustom,
      profs: cleanProfs
    };

    const today = new Date().toISOString().split('T')[0];
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + formPlanDays);
    const expiresAt = expDate.toISOString().split('T')[0];

    if (editingSalon) {
      const updated: SalonApp = {
        ...editingSalon,
        name: formName.trim(),
        ownerName: formOwnerName.trim() || 'Proprietário',
        ownerRg: formOwnerRg.trim() || editingSalon.ownerRg || '',
        ownerCpf: formOwnerCpf.trim() || editingSalon.ownerCpf || '',
        ownerEmail: formOwnerEmail.trim(),
        ownerPhone: formOwnerPhone.trim(),
        cep: formCep.trim(),
        logradouro: formLogradouro.trim(),
        numero: formNumero.trim(),
        bairro: formBairro.trim(),
        cidade: formCidade.trim(),
        uf: formUf.trim().toUpperCase(),
        planDays: formPlanDays,
        expiresAt: expiresAt,
        config: salonConfig
      };
      onUpdateSalon(updated);
      showFeedback(`Salão "${formName}" atualizado com sucesso.`);
    } else {
      const randomCode = Storage.getNextSalonCode();
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const tokenCleanName = formName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
      const newToken = `TOK-${tokenCleanName || 'SALÃO'}-${randomNum}`;

      const isTrialMode = formPlanDays === 15;

      const newSalon: SalonApp = {
        id: `salon-${Date.now()}`,
        name: formName.trim(),
        ownerName: formOwnerName.trim() || 'Proprietário',
        ownerRg: formOwnerRg.trim() || 'RG Não Informado',
        ownerCpf: formOwnerCpf.trim(),
        ownerEmail: formOwnerEmail.trim(),
        ownerPhone: formOwnerPhone.trim(),
        cep: formCep.trim(),
        logradouro: formLogradouro.trim(),
        numero: formNumero.trim(),
        bairro: formBairro.trim(),
        cidade: formCidade.trim(),
        uf: formUf.trim().toUpperCase(),
        createdAt: today,
        purchaseDate: today,
        expiresAt: expiresAt,
        planDays: formPlanDays,
        isTrial: isTrialMode,
        trialStartedAt: isTrialMode ? today : undefined,
        status: isTrialMode ? 'trial' : 'active',
        appCode: randomCode,
        purchaseToken: newToken,
        emailSentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        config: salonConfig
      };
      onCreateSalon(newSalon);
      showFeedback(`Novo aplicativo criado com Token (${newToken}) enviado por e-mail!`);
    }

    setShowCreateForm(false);
    resetForm();
  };

  const handleConfirmDelete = () => {
    if (!salonToDelete) return;
    const deletedName = salonToDelete.name;
    const deletedCode = salonToDelete.appCode;
    onDeleteSalon(salonToDelete.id);
    setSalonToDelete(null);
    showFeedback(`Salão ${deletedCode} ("${deletedName}") excluído com sucesso.`);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      
      {/* Primary Modal Container */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-[98vw] text-white shadow-2xl relative my-auto overflow-hidden flex flex-col h-[94vh] max-h-[94vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header Bar - Organized, Clean, and Perfectly Sized */}
        <div className="bg-slate-950 px-3 sm:px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 bg-blue-600/20 border border-blue-500/40 rounded-lg text-blue-400 shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-black text-white tracking-tight flex items-center gap-1.5 truncate">
                <span className="truncate">Meus Salões</span>
                <span className="bg-blue-600/30 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/30 shrink-0">
                  {salons.length} {salons.length === 1 ? 'cadastrado' : 'cadastrados'}
                </span>
              </h2>
            </div>
          </div>

          {/* Top Action Buttons - Compact, concise labels, perfect spacing */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            {onOpenLiveHub && (
              <button
                onClick={onOpenLiveHub}
                className="bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 border border-emerald-400/40 cursor-pointer"
                title="Abrir Central de Conexão Tripla, Chat com Salões/Clientes e Mural de Comunicados Oficiais"
              >
                <Activity className="w-3.5 h-3.5 text-emerald-300 animate-pulse shrink-0" />
                <span className="tracking-tight">Central Ao Vivo</span>
              </button>
            )}

            {onOpenSalonLink && (
              <button
                onClick={onOpenSalonLink}
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-extrabold px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 border border-violet-400/30 cursor-pointer"
                title="Criar e enviar link de compra/salão para proprietários de salões e barbearias"
              >
                <Link2 className="w-3.5 h-3.5 text-violet-200 shrink-0" />
                <span className="tracking-tight">Link Compra</span>
              </button>
            )}

            {onOpenSalonAccessLink && (
              <button
                onClick={onOpenSalonAccessLink}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 border border-emerald-400/40 cursor-pointer"
                title="Criar e enviar link de acesso ao salão com CPF e Token"
              >
                <Key className="w-3.5 h-3.5 text-white shrink-0" />
                <span className="tracking-tight">Link Acesso</span>
              </button>
            )}

            {onOpenVideoTutorial && (
              <button
                onClick={onOpenVideoTutorial}
                className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 border border-red-400/40 cursor-pointer"
                title="Assistir à Demonstração & Vídeo Tutorial Interativo"
              >
                <Play className="w-3.5 h-3.5 fill-white shrink-0" />
                <span className="tracking-tight">Vídeo Tutorial</span>
              </button>
            )}

            {onOpenVideoConfig && (
              <button
                onClick={onOpenVideoConfig}
                className="bg-slate-900 hover:bg-slate-800 text-rose-300 border border-rose-500/40 font-extrabold px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                title="Configurar Link do Vídeo (YouTube/MP4) e Roteiro de Narração por Voz"
              >
                <Video className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Config Vídeo/Voz</span>
              </button>
            )}

            {onOpenPaymentConfig && (
              <button
                onClick={onOpenPaymentConfig}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 border border-amber-300/40 cursor-pointer"
                title="Configurar Recebimento, Pix e Cartão"
              >
                <Settings className="w-3.5 h-3.5 shrink-0" />
                <span>Pix / Cartão</span>
              </button>
            )}

            <button
              onClick={openCreateModal}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 border border-emerald-400/40 cursor-pointer"
              title="Cadastrar novo salão ou registrar compra"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>+ Novo Salão</span>
            </button>

            {onOpenAdminChangePassword && (
              <button
                onClick={onOpenAdminChangePassword}
                className="bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 font-extrabold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                title="Alterar Senha do Administrador e Gerenciar Usuários/Acessos"
              >
                <Key className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Alterar Senha Admin</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700 ml-1 cursor-pointer shrink-0"
              title="Fechar Janela"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Action Feedback Alert */}
        {actionSuccessMsg && (
          <div className="bg-emerald-950/90 border-b border-emerald-700 text-emerald-200 px-4 py-1.5 text-xs font-bold flex items-center gap-2 animate-in fade-in shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* Navigation Tabs Bar & Search Box - Compact & Responsive */}
        <div className="bg-slate-900/95 px-3 sm:px-4 py-2 border-b border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 shrink-0">
          
          {/* Primary View Switcher Tabs without native scrollbar glitch */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden shrink-0">
            
            <button
              onClick={() => setActiveTab('cards')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'cards'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-sky-200 shrink-0" />
              <span>Visão Geral</span>
              <span className="bg-blue-950/80 text-sky-300 font-bold text-[10px] px-1.5 py-0.2 rounded-full border border-sky-500/30">
                {salons.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('pending')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black ring-2 ring-amber-400/40'
                  : pendingCount > 0
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 animate-pulse'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Solicitações</span>
              <span className="bg-amber-950/80 text-amber-300 font-bold text-[10px] px-1.5 py-0.2 rounded-full border border-amber-500/30">
                {pendingCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('connected')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'connected'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span>Conectados</span>
              <span className="bg-emerald-950/80 text-emerald-300 font-bold text-[10px] px-1.5 py-0.2 rounded-full border border-emerald-500/30">
                {activeCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('inspector')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'inspector'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-purple-300 shrink-0" />
              <span>Tempo Real</span>
            </button>

            <button
              onClick={() => setActiveTab('location_table')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'location_table'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-teal-300 shrink-0" />
              <span>Cidades</span>
              <span className="bg-teal-950/80 text-teal-300 font-bold text-[10px] px-1.5 py-0.2 rounded-full border border-teal-500/30">
                {locationGroups.length}
              </span>
            </button>

          </div>

          {/* Search Input Box */}
          <div className="relative w-full md:w-56 lg:w-72 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar salão, CPF, cidade..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>

        {/* Quick Sub-Filter Badges for Cards Tab */}
        {activeTab === 'cards' && (
          <div className="px-3 sm:px-5 py-1 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto shrink-0 text-xs [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
              Filtro rápido:
            </span>

            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all shrink-0 border ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white border-blue-400'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              Todos ({salons.length})
            </button>

            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all shrink-0 border ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-slate-950 font-black border-amber-400'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              Solicitações ({pendingCount})
            </button>

            <button
              onClick={() => setStatusFilter('active')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all shrink-0 border ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white border-emerald-400'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              Conectados ({activeCount})
            </button>

            <button
              onClick={() => setStatusFilter('blocked')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all shrink-0 border ${
                statusFilter === 'blocked'
                  ? 'bg-rose-600 text-white border-rose-400'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              Bloqueados ({blockedCount})
            </button>
          </div>
        )}

        {/* Modal Main Content Area - Maximized Viewport Height */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: INSPECTOR VIEW ("O QUE ESTÁ ACONTECENDO NO SALÃO") */}
          {activeTab === 'inspector' ? (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Salon Selector Header */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-600/20 text-purple-400 rounded-xl border border-purple-500/30 shrink-0">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">Visualizador em Tempo Real do Salão</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Inspecione o que está acontecendo no salão selecionado: dados, equipe, licença e prazos.
                    </p>
                  </div>
                </div>

                {/* Salon Selector Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-bold whitespace-nowrap">Selecionar Salão:</span>
                  <select
                    value={inspectedSalonId}
                    onChange={(e) => setInspectedSalonId(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-purple-500 transition-colors"
                  >
                    {salons.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.status === 'pending_approval' ? '⏳ Pendente' : '🟢 Ativo'}) - {s.cidade || 'Brasil'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {inspectedSalon ? (
                <div className="space-y-5">
                  
                  {/* Selected Salon Banner */}
                  <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                    <div className="p-5 bg-gradient-to-r from-purple-900/60 via-slate-900 to-slate-950 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono font-bold text-xs px-2.5 py-0.5 rounded-full">
                            {inspectedSalon.appCode}
                          </span>
                          
                          {inspectedSalon.status === 'pending_approval' ? (
                            <span className="bg-amber-500 text-slate-950 font-black text-xs px-3 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                              <AlertCircle className="w-3.5 h-3.5" /> PENDENTE DE APROVAÇÃO
                            </span>
                          ) : inspectedSalon.status === 'active' ? (
                            <span className="bg-emerald-500 text-slate-950 font-black text-xs px-3 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> LIBERADO & CONECTADO
                            </span>
                          ) : (
                            <span className="bg-rose-600 text-white font-black text-xs px-3 py-0.5 rounded-full flex items-center gap-1">
                              <Lock className="w-3.5 h-3.5" /> BLOQUEADO
                            </span>
                          )}
                        </div>

                        <h2 className="text-xl font-black text-white mt-2 flex items-center gap-2">
                          <span>{inspectedSalon.name}</span>
                        </h2>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                          <span>👤 Proprietário: <strong className="text-slate-200">{inspectedSalon.ownerName}</strong></span>
                          <span>•</span>
                          <span>📞 {inspectedSalon.ownerPhone}</span>
                          <span>•</span>
                          <span>✉️ {inspectedSalon.ownerEmail}</span>
                        </p>
                      </div>

                      {/* Main Action to Switch to this Salon in App */}
                      <button
                        onClick={() => {
                          onSelectSalon(inspectedSalon);
                          onClose();
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-4 py-3 rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0 active:scale-95 border border-emerald-400/40"
                      >
                        <ArrowRight className="w-4 h-4" />
                        <span>Conectar & Entrar neste Salão Agora</span>
                      </button>
                    </div>

                    {/* Detailed Grid Stats */}
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      
                      {/* Stat 1: License & Expiration */}
                      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider block">Licença & Prazo</span>
                        <div className="text-base font-black text-amber-300">
                          {inspectedSalon.expiresAt ? `Expira em: ${inspectedSalon.expiresAt}` : 'Vitalício'}
                        </div>
                        <p className="text-xs text-slate-400">Plano Contratado: <strong>{inspectedSalon.planDays || 365} dias</strong></p>
                      </div>

                      {/* Stat 2: Document CPF & RG */}
                      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider block">Documentação do Comprador</span>
                        <div className="text-xs font-mono font-bold text-slate-200">
                          CPF: {inspectedSalon.ownerCpf || 'Não informado'}
                        </div>
                        <div className="text-xs font-mono text-slate-400">
                          RG: {inspectedSalon.ownerRg || 'Não informado'}
                        </div>
                      </div>

                      {/* Stat 3: Address & Location */}
                      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider block">Endereço & Cidade</span>
                        <div className="text-xs font-bold text-slate-200 truncate">
                          {inspectedSalon.logradouro ? `${inspectedSalon.logradouro}, ${inspectedSalon.numero}` : 'Endereço Não informado'}
                        </div>
                        <div className="text-xs text-slate-400">
                          {inspectedSalon.cidade || 'Cidade'} - {inspectedSalon.uf || 'UF'} ({inspectedSalon.cep || 'CEP'})
                        </div>
                      </div>

                      {/* Stat 4: Purchase Token */}
                      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider block">Token de Acesso</span>
                        <div className="flex items-center gap-1.5">
                          <code className="text-xs font-mono font-black text-sky-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 truncate flex-1">
                            {inspectedSalon.purchaseToken}
                          </code>
                          <button
                            onClick={() => handleCopyToken(inspectedSalon.id, inspectedSalon.purchaseToken)}
                            className="bg-slate-800 hover:bg-slate-700 p-1.5 rounded text-slate-300 hover:text-white transition-colors"
                            title="Copiar Token"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-500 block">Enviado para o e-mail do cliente</span>
                      </div>

                    </div>

                    {/* Quick Administrative Action Bar */}
                    <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        
                        <button
                          onClick={() => handleToggleApproveSalon(inspectedSalon)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-sm ${
                            inspectedSalon.status === 'pending_approval' || inspectedSalon.status === 'blocked'
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-amber-600/30 text-amber-300 border border-amber-500/40 hover:bg-amber-600 hover:text-white'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {inspectedSalon.status === 'pending_approval' ? 'Aprovar & Liberar Salão Agora' : inspectedSalon.status === 'blocked' ? 'Desbloquear Acesso' : 'Bloquear Acesso'}
                          </span>
                        </button>

                        <button
                          onClick={() => handleExtendLicense(inspectedSalon, 30)}
                          className="bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5"
                        >
                          <Calendar className="w-4 h-4" />
                          <span>Prorrogar +30 Dias</span>
                        </button>

                        <button
                          onClick={() => handleRegenerateToken(inspectedSalon)}
                          className="bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span>Regerar Novo Token</span>
                        </button>

                        <button
                          onClick={() => openEditModal(inspectedSalon)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 border border-slate-700"
                        >
                          <Edit3 className="w-4 h-4" />
                          <span>Editar Dados</span>
                        </button>

                        <button
                          onClick={() => setSalonToDelete(inspectedSalon)}
                          className="bg-rose-950/70 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-800/40 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Excluir Salão</span>
                        </button>

                      </div>

                      <div className="text-[11px] text-slate-400 font-mono">
                        Última notificação enviada: {inspectedSalon.emailSentAt || 'Na criação'}
                      </div>
                    </div>

                  </div>

                  {/* Team Professionals & Commission Breakdown */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden p-5 space-y-3">
                    <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-emerald-400" />
                      <span>Equipe & Divisão de Comissões Cadastradas ({inspectedSalon.config.profs.length} Profissionais)</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {inspectedSalon.config.profs.map((prof, idx) => (
                        <div key={prof.id || idx} className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 font-bold flex items-center justify-center text-xs">
                              {prof.nome.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="text-xs font-extrabold text-white block">{prof.nome}</span>
                              <span className="text-[10px] text-slate-400">Profissional do Salão</span>
                            </div>
                          </div>
                          <span className="bg-emerald-500/20 text-emerald-300 font-black text-xs px-2.5 py-1 rounded-lg border border-emerald-500/30">
                            {prof.porc}% Comissão
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Selecione um salão no menu acima para inspecionar.
                </div>
              )}

            </div>
          ) : activeTab === 'location_table' ? (
            
            /* TAB 2: GEOGRAPHICAL LOCATION REPORT TABLE */
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
                  <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block">Cidades Atendidas</span>
                    <span className="text-xl font-black text-white">{locationGroups.length} Cidades / Regiões</span>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
                  <div className="p-3 bg-emerald-600/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block">Total de Salões Registrados</span>
                    <span className="text-xl font-black text-emerald-400">{salons.length} Aplicativos</span>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
                  <div className="p-3 bg-purple-600/20 text-purple-400 rounded-xl border border-purple-500/30">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block">Relatório de Vendas</span>
                    <span className="text-xs font-bold text-slate-200">Classificação por Estado & Cidade</span>
                  </div>
                </div>
              </div>

              {/* Geographical Breakdown Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <Table className="w-4 h-4 text-emerald-400" />
                    <span>Tabela Geográfica de Salões Vendidos e Conectados</span>
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-3.5">Estado / Cidade</th>
                        <th className="p-3.5">Salão / Aplicativo</th>
                        <th className="p-3.5">Comprador / CPF / RG</th>
                        <th className="p-3.5">Endereço Completo & CEP</th>
                        <th className="p-3.5">Validade & Vencimento</th>
                        <th className="p-3.5 text-center">Status</th>
                        <th className="p-3.5 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {locationGroups.map((group) => {
                        return group.salons.map((salon, idx) => {
                          const isPending = salon.status === 'pending_approval';

                          return (
                            <tr key={salon.id} className="hover:bg-slate-900/50 transition-colors">
                              {/* Location */}
                              {idx === 0 ? (
                                <td rowSpan={group.salons.length} className="p-3.5 align-top border-r border-slate-800 bg-slate-900/30">
                                  <div className="flex items-center gap-1.5 font-black text-amber-300 text-xs">
                                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    <span>{group.uf} - {group.cidade}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-1 font-bold">
                                    {group.salons.length} {group.salons.length === 1 ? 'Salão' : 'Salões'}
                                  </div>
                                </td>
                              ) : null}

                              {/* Salon Info */}
                              <td className="p-3.5 font-bold text-white whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                    {salon.appCode}
                                  </span>
                                  <span>{salon.name}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  Token: {salon.purchaseToken}
                                </div>
                              </td>

                              {/* Buyer Details */}
                              <td className="p-3.5 text-slate-300 whitespace-nowrap">
                                <div className="font-bold text-white">{salon.ownerName}</div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <span>CPF: {salon.ownerCpf || 'N/A'}</span>
                                  <span>•</span>
                                  <span>RG: {salon.ownerRg || 'N/A'}</span>
                                </div>
                              </td>

                              {/* Full Address */}
                              <td className="p-3.5 text-slate-300">
                                <div className="text-xs font-bold text-slate-200">
                                  {salon.logradouro ? `${salon.logradouro}, ${salon.numero}` : 'N/A'}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {salon.bairro || ''} {salon.cep ? `CEP: ${salon.cep}` : ''}
                                </div>
                              </td>

                              {/* Validity & Expiration */}
                              <td className="p-3.5 whitespace-nowrap">
                                <div className="text-[11px] font-bold text-amber-300">
                                  {salon.expiresAt ? salon.expiresAt : '1 Ano (Vitalício)'}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  Plano: {salon.planDays || 365} dias
                                </div>
                              </td>

                              {/* Status Badge */}
                              <td className="p-3.5 text-center">
                                {isPending ? (
                                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold px-2 py-0.5 rounded-full text-[10px] inline-block animate-pulse">
                                    Solicitando Permissão
                                  </span>
                                ) : salon.status === 'active' ? (
                                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold px-2 py-0.5 rounded-full text-[10px] inline-block">
                                    Conectado / Liberado
                                  </span>
                                ) : (
                                  <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold px-2 py-0.5 rounded-full text-[10px] inline-block">
                                    Bloqueado
                                  </span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="p-3.5 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleToggleApproveSalon(salon)}
                                    title={isPending ? 'Liberar Salão Agora' : salon.status === 'blocked' ? 'Desbloquear' : 'Bloquear Acesso'}
                                    className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                                      isPending || salon.status === 'blocked'
                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                        : 'bg-amber-600/30 text-amber-300 border border-amber-500/40 hover:bg-amber-600 hover:text-white'
                                    }`}
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => {
                                      setInspectedSalonId(salon.id);
                                      setActiveTab('inspector');
                                    }}
                                    title="Acompanhar em Tempo Real"
                                    className="bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white p-1.5 rounded-lg text-xs transition-colors"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => openEditModal(salon)}
                                    title="Editar Salão"
                                    className="bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg text-slate-300 hover:text-white transition-colors"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => setSalonToDelete(salon)}
                                    title="Excluir Salão"
                                    className="bg-rose-950/60 hover:bg-rose-600 text-rose-300 hover:text-white p-1.5 rounded-lg text-xs transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => {
                                      onSelectSalon(salon);
                                      onClose();
                                    }}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
                                  >
                                    Acessar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : filteredSalons.length === 0 ? (
            /* EMPTY FILTERED SALONS STATE */
            <div className="text-center py-12 px-4 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
              <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-300">
                {activeTab === 'pending'
                  ? 'Nenhuma solicitação pendente no momento'
                  : activeTab === 'connected'
                  ? 'Nenhum salão conectado no momento'
                  : 'Nenhum salão ou compra encontrado'}
              </h3>
              <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? 'Tente buscar com outro nome, CPF, RG ou Token.'
                  : activeTab === 'pending'
                  ? 'Todas as solicitações foram liberadas ou não há novos pedidos.'
                  : 'Ainda não há compras de aplicativos registradas.'}
              </p>
            </div>
          ) : (
            /* TAB 3 / CARDS / PENDING / CONNECTED LIST VIEW */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredSalons.map((salon) => {
                const isActive = salon.id === activeSalonId;
                const themeInfo = THEMES[salon.config.temaKey] || THEMES.azul;
                const headerColor = salon.config.corCustom || themeInfo.headerBg;
                const isPending = salon.status === 'pending_approval';

                return (
                  <div
                    key={salon.id}
                    className={`bg-slate-950 rounded-2xl border transition-all overflow-hidden flex flex-col justify-between relative group ${
                      isPending
                        ? 'border-amber-500 shadow-lg shadow-amber-950/30'
                        : isActive
                        ? 'border-emerald-500 shadow-xl shadow-emerald-950/30 ring-1 ring-emerald-500'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Top Decorative Banner */}
                    <div
                      style={{ backgroundColor: headerColor }}
                      className="h-16 px-4 py-2.5 flex items-center justify-between text-white relative"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-black/40 text-white font-mono font-extrabold text-[10px] px-2 py-0.5 rounded-full backdrop-blur-xs">
                          {salon.appCode}
                        </span>

                        {/* Status Badge */}
                        {isPending ? (
                          <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm animate-pulse">
                            <AlertCircle className="w-3 h-3" /> SOLICITANDO PERMISSÃO
                          </span>
                        ) : salon.status === 'active' ? (
                          <span className="bg-emerald-500 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                            <Check className="w-3 h-3" /> CONECTADO / LIBERADO
                          </span>
                        ) : (
                          <span className="bg-rose-500 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                            <Lock className="w-3 h-3" /> BLOQUEADO
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setInspectedSalonId(salon.id);
                            setActiveTab('inspector');
                          }}
                          title="Acompanhar o que está acontecendo no salão"
                          className="bg-black/40 hover:bg-black/70 p-1.5 rounded-lg text-white transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-purple-300" />
                        </button>

                        <button
                          onClick={() => openEditModal(salon)}
                          title="Editar dados e prazo do salão"
                          className="bg-black/30 hover:bg-black/60 p-1.5 rounded-lg text-white/90 hover:text-white transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        
                        <button
                          onClick={() => setSalonToDelete(salon)}
                          title="Excluir salão"
                          className="bg-rose-900/60 hover:bg-rose-600 p-1.5 rounded-lg text-rose-200 hover:text-white transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Salon Main Content */}
                    <div className="p-4 space-y-3 flex-1">
                      <div>
                        <h3 className="text-base font-black text-white group-hover:text-sky-300 transition-colors">
                          {salon.name}
                        </h3>
                        <p className="text-slate-400 text-xs flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>Comprador: <strong>{salon.ownerName}</strong></span>
                        </p>
                      </div>

                      {/* Info Badges & Document Grid */}
                      <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate">{salon.ownerEmail}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>{salon.ownerPhone}</span>
                          </div>
                        </div>

                        {/* CPF, RG & Address Row */}
                        <div className="pt-2 border-t border-slate-800 text-[11px] space-y-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap text-slate-300 font-mono">
                            <span>CPF: <strong className="text-white">{salon.ownerCpf || 'N/A'}</strong></span>
                            <span>RG: <strong className="text-slate-300">{salon.ownerRg || 'N/A'}</strong></span>
                          </div>

                          <div className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="truncate">
                              {salon.logradouro ? `${salon.logradouro}, ${salon.numero} - ${salon.cidade}/${salon.uf}` : 'Endereço não cadastrado'}
                            </span>
                          </div>
                        </div>

                      </div>

                      {/* Purchase Token and Expiration Bar */}
                      <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-extrabold block">Token de Acesso:</span>
                          <code className="text-xs font-mono font-bold text-sky-300">{salon.purchaseToken}</code>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCopyToken(salon.id, salon.purchaseToken)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                            title="Copiar Token"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[10px]">{copiedTokenId === salon.id ? 'Copiado!' : 'Copiar'}</span>
                          </button>

                          <button
                            onClick={() => handleRegenerateToken(salon)}
                            className="bg-purple-900/40 hover:bg-purple-600 text-purple-300 hover:text-white p-1.5 rounded-lg text-xs transition-colors"
                            title="Regerar Novo Token"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* Card Footer Actions */}
                    <div className="p-3 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between gap-2">
                      <div className="text-[10px] text-slate-400 font-bold">
                        <span>Expira: <strong className="text-amber-300">{salon.expiresAt || 'Vitalício'}</strong> ({salon.planDays || 365}d)</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        
                        {/* Approval / Status Toggle */}
                        <button
                          onClick={() => handleToggleApproveSalon(salon)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1 ${
                            isPending
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
                              : salon.status === 'blocked'
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-amber-600/30 text-amber-300 hover:bg-amber-600 hover:text-white border border-amber-500/40'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isPending ? 'Aprovar Permissão' : salon.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}</span>
                        </button>

                        <button
                          onClick={() => handleExtendLicense(salon, 30)}
                          className="bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 px-2 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                          title="Prorrogar por mais 30 dias"
                        >
                          +30d
                        </button>

                        <button
                          onClick={() => {
                            onSelectSalon(salon);
                            onClose();
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1 shadow-md ${
                            isActive
                              ? 'bg-emerald-600 text-white border border-emerald-400/50'
                              : 'bg-blue-600 hover:bg-blue-500 text-white'
                          }`}
                        >
                          <span>{isActive ? 'Conectado' : 'Acessar'}</span>
                        </button>

                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

      {/* CREATE / EDIT SALON MODAL FORM */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-60 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl text-white shadow-2xl relative my-auto overflow-hidden animate-in fade-in zoom-in-95">
            
            {/* Modal Form Header */}
            <div className="bg-slate-950 p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                <span>{editingSalon ? 'Editar Cadastro do Salão' : 'Cadastrar Novo Salão / Compra'}</span>
              </h3>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields Body */}
            <form onSubmit={handleSaveSalonForm} className="p-4 sm:p-6 space-y-4 max-h-[78vh] overflow-y-auto">
              
              {formError && (
                <div className="bg-rose-950/80 border border-rose-800 text-rose-200 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Salon Name & Plan Days */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-extrabold text-slate-300">Nome do Salão / Barbearia *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Studio Beleza & Arte"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-300">Prazo do Plano (Dias)</label>
                  <select
                    value={formPlanDays}
                    onChange={(e) => setFormPlanDays(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-bold"
                  >
                    <option value={15}>15 Dias (Teste Gratuito)</option>
                    <option value={30}>30 Dias (Mensal)</option>
                    <option value={90}>90 Dias (Trimestral)</option>
                    <option value={180}>180 Dias (Semestral)</option>
                    <option value={365}>365 Dias (Anual)</option>
                    <option value={9999}>Vitalício (Sem limite)</option>
                  </select>
                </div>
              </div>

              {/* Owner Info: Name, RG, CPF */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-300">Nome do Proprietário</label>
                  <input
                    type="text"
                    value={formOwnerName}
                    onChange={(e) => setFormOwnerName(e.target.value)}
                    placeholder="Ex: Carlos Silva"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-300">CPF do Comprador</label>
                  <input
                    type="text"
                    value={formOwnerCpf}
                    onChange={(e) => setFormOwnerCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-300">RG do Comprador</label>
                  <input
                    type="text"
                    value={formOwnerRg}
                    onChange={(e) => setFormOwnerRg(e.target.value)}
                    placeholder="00.000.000-0"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Contact Info: Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-300">E-mail de Destino (Token) *</label>
                  <input
                    type="email"
                    value={formOwnerEmail}
                    onChange={(e) => setFormOwnerEmail(e.target.value)}
                    placeholder="cliente@email.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-300">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={formOwnerPhone}
                    onChange={(e) => setFormOwnerPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Address Fields: CEP, Logradouro, Número, Bairro, Cidade, UF */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 space-y-3">
                <span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider block">
                  📍 Endereço Geográfico & Localização
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">CEP</label>
                    <input
                      type="text"
                      value={formCep}
                      onChange={(e) => setFormCep(e.target.value)}
                      placeholder="00000-000"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">Logradouro / Rua</label>
                    <input
                      type="text"
                      value={formLogradouro}
                      onChange={(e) => setFormLogradouro(e.target.value)}
                      placeholder="Av. Principal"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">Número</label>
                    <input
                      type="text"
                      value={formNumero}
                      onChange={(e) => setFormNumero(e.target.value)}
                      placeholder="123"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">Bairro</label>
                    <input
                      type="text"
                      value={formBairro}
                      onChange={(e) => setFormBairro(e.target.value)}
                      placeholder="Centro"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">Cidade</label>
                    <input
                      type="text"
                      value={formCidade}
                      onChange={(e) => setFormCidade(e.target.value)}
                      placeholder="São Paulo"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">Estado UF</label>
                    <input
                      type="text"
                      value={formUf}
                      onChange={(e) => setFormUf(e.target.value)}
                      placeholder="SP"
                      maxLength={2}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white uppercase font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Theme & Visual Color Customization */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-300">Tema do Salão</label>
                  <select
                    value={formTemaKey}
                    onChange={(e) => setFormTemaKey(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {Object.values(THEMES).map(t => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-300">Cor Customizada</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formCorCustom}
                      onChange={(e) => setFormCorCustom(e.target.value)}
                      className="w-10 h-8 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={formCorCustom}
                      onChange={(e) => setFormCorCustom(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Team Professionals Section */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-300">Equipe & Comissões de Início</label>
                  <button
                    type="button"
                    onClick={handleAddProfLine}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Profissional
                  </button>
                </div>

                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {formProfs.map((p, idx) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={p.nome}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormProfs(prev => prev.map(item => item.id === p.id ? { ...item, nome: val } : item));
                        }}
                        placeholder={`Profissional ${idx + 1}`}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                      <div className="flex items-center gap-1 w-28 shrink-0">
                        <input
                          type="number"
                          value={p.porc}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setFormProfs(prev => prev.map(item => item.id === p.id ? { ...item, porc: val } : item));
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white text-center font-bold"
                          min={0}
                          max={100}
                        />
                        <span className="text-xs font-bold text-slate-400">%</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveProfLine(p.id)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Actions Footer */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-5 py-2 rounded-xl text-xs shadow-lg transition-all"
                >
                  {editingSalon ? 'Salvar Alterações' : 'Criar Aplicativo & Gerar Token'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL TO DELETE SALON */}
      {salonToDelete && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[70] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-rose-500/50 rounded-3xl w-full max-w-md text-white shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mx-auto shadow-lg shadow-rose-950/50">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-white">
                Deseja realmente deletar este salão?
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Esta ação é irreversível e excluirá todos os dados, agendamentos, histórico e o token vinculado.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Identificador:</span>
                <span className="font-mono font-black bg-slate-900 px-2.5 py-0.5 rounded text-sky-400 border border-slate-800">
                  {salonToDelete.appCode}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Nome do Salão:</span>
                <span className="font-bold text-white truncate max-w-[200px]">{salonToDelete.name}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Proprietário:</span>
                <span className="font-semibold text-slate-200">{salonToDelete.ownerName}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Token de Acesso:</span>
                <span className="font-mono text-emerald-400 font-bold">{salonToDelete.purchaseToken}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSalonToDelete(null)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors border border-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs shadow-lg shadow-rose-950/50 transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
