import React, { useState, useEffect, useRef } from 'react';
import { CatalogMedia, CatalogFolder, UserRole, SalonConfig } from '../types';
import { Storage } from '../utils/storage';
import { generatePixEMVPayload, generateQrCodeDataUrl } from '../utils/pix';
import { CheckoutModal } from './CheckoutModal';
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  X,
  Play,
  Folder,
  Eye,
  RotateCcw,
  Tag,
  Edit3,
  Check,
  DollarSign,
  QrCode,
  Copy,
  CheckCheck,
  CreditCard,
  Building2,
  ExternalLink,
  MessageCircle,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  Layers,
  FileText,
  HelpCircle,
  LayoutGrid,
  Maximize2,
  Grid,
  Package,
  Boxes
} from 'lucide-react';

interface CatalogoViewProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: UserRole;
  readOnly?: boolean;
  config?: SalonConfig;
  onSaveConfig?: (cfg: SalonConfig) => void;
}

const DEFAULT_FOLDERS: { key: string; title: string; icon: string }[] = [
  { key: 'salao', title: '💈 Fotos do Salão', icon: '💈' },
  { key: 'cliente', title: '👤 Fotos dos Clientes', icon: '👤' },
  { key: 'portfolio', title: '✂️ Portfólio', icon: '✂️' },
  { key: 'higiene', title: '🧴 Produtos', icon: '🧴' },
  { key: 'roupas', title: '👗 Roupas & Acessórios', icon: '👗' },
  { key: 'diversos', title: '📂 Outros Arquivos', icon: '📂' },
];

export const CatalogoView: React.FC<CatalogoViewProps> = ({
  isOpen,
  onClose,
  userRole = 'salao',
  readOnly = false,
  config: propConfig,
  onSaveConfig
}) => {
  // If user is 'cliente' or readOnly is explicitly true, hide all editing controls
  const isClientView = readOnly || userRole === 'cliente';

  const [activeFolder, setActiveFolder] = useState<string>('salao');
  const [customFolders, setCustomFolders] = useState<{ key: string; title: string; icon: string }[]>(DEFAULT_FOLDERS);
  const [newFolderName, setNewFolderName] = useState('');
  const [showAddFolderInput, setShowAddFolderInput] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  const [catalog, setCatalog] = useState<Record<string, CatalogMedia[]>>({
    salao: [],
    cliente: [],
    portfolio: [],
    higiene: [],
    roupas: [],
    diversos: []
  });

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [viewCardSize, setViewCardSize] = useState<'large' | 'medium' | 'compact'>('large');
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const singleFileInputRef = useRef<HTMLInputElement>(null);

  // PRODUCT ADD / EDIT MODAL STATE (WITH VISUAL PREVIEW)
  const [showProductModal, setShowProductModal] = useState(false);
  const [productModalMode, setProductModalMode] = useState<'add' | 'edit'>('add');
  const [editingItemTarget, setEditingItemTarget] = useState<{ folder: string; index: number } | null>(null);

  // Product Form Fields
  const [formFolder, setFormFolder] = useState<string>('higiene');
  const [formImageUrl, setFormImageUrl] = useState<string>('');
  const [formMediaType, setFormMediaType] = useState<'image' | 'video'>('image');
  const [formTitle, setFormTitle] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Store payment config state
  const currentConfig: SalonConfig = propConfig || Storage.getConfig();
  const [showPaymentConfigModal, setShowPaymentConfigModal] = useState(false);
  const [editChavePix, setEditChavePix] = useState(currentConfig.chavePix || '');
  const [editTipoChavePix, setEditTipoChavePix] = useState(currentConfig.tipoChavePix || 'email');
  const [editTitularPix, setEditTitularPix] = useState(currentConfig.titularPix || '');
  const [editCidadePix, setEditCidadePix] = useState(currentConfig.cidadePix || 'São Paulo');
  const [editBancoCartao, setEditBancoCartao] = useState(currentConfig.bancoCartao || '');
  const [editAgenciaCartao, setEditAgenciaCartao] = useState(currentConfig.agenciaCartao || '');
  const [editContaCartao, setEditContaCartao] = useState(currentConfig.contaCartao || '');
  const [editTipoContaCartao, setEditTipoContaCartao] = useState(currentConfig.tipoContaCartao || 'corrente');
  const [editTitularCartao, setEditTitularCartao] = useState(currentConfig.titularCartao || '');
  const [editCpfCnpjCartao, setEditCpfCnpjCartao] = useState(currentConfig.cpfCnpjCartao || '');
  const [editLinkCartao, setEditLinkCartao] = useState(currentConfig.linkCartao || '');
  const [editInstrucoes, setEditInstrucoes] = useState(currentConfig.instrucoesPagamento || '');

  // Copy Feedback
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Pix QR Code Modal for specific item or general store
  const [pixQrItem, setPixQrItem] = useState<{ title: string; price?: number | string; stock?: number | string } | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [emvPayload, setEmvPayload] = useState<string>('');

  // Client Checkout Modal State (Pix / Cartao with Quantity & Installment Calculator)
  const [checkoutItem, setCheckoutItem] = useState<{
    id?: string;
    title: string;
    price?: number | string;
    stock?: number | string;
    url?: string;
    description?: string;
    folder?: string;
  } | null>(null);
  const [checkoutMethod, setCheckoutMethod] = useState<'pix' | 'cartao'>('pix');

  useEffect(() => {
    if (isOpen) {
      loadCatalog();
      // Sync local form state with config
      setEditChavePix(currentConfig.chavePix || '');
      setEditTipoChavePix(currentConfig.tipoChavePix || 'email');
      setEditTitularPix(currentConfig.titularPix || '');
      setEditCidadePix(currentConfig.cidadePix || 'São Paulo');
      setEditBancoCartao(currentConfig.bancoCartao || '');
      setEditAgenciaCartao(currentConfig.agenciaCartao || '');
      setEditContaCartao(currentConfig.contaCartao || '');
      setEditTipoContaCartao(currentConfig.tipoContaCartao || 'corrente');
      setEditTitularCartao(currentConfig.titularCartao || '');
      setEditCpfCnpjCartao(currentConfig.cpfCnpjCartao || '');
      setEditLinkCartao(currentConfig.linkCartao || '');
      setEditInstrucoes(currentConfig.instrucoesPagamento || '');
    }
  }, [isOpen, propConfig]);

  const loadCatalog = async () => {
    const data = await Storage.getCatalog();
    const savedFolders = Storage.getCatalogFolderList();

    let folderList = DEFAULT_FOLDERS;

    if (savedFolders && Array.isArray(savedFolders)) {
      folderList = savedFolders;
    }

    if (data) {
      setCatalog(data);
      const keys = Object.keys(data);
      const existingKeys = new Set(folderList.map(f => f.key));
      const extraFolders = keys
        .filter(k => !existingKeys.has(k) && data[k]?.length > 0)
        .map(k => ({ key: k, title: `📁 ${k}`, icon: '📁' }));
      
      if (extraFolders.length > 0) {
        folderList = [...folderList, ...extraFolders];
        Storage.saveCatalogFolderList(folderList);
      }
    }

    setCustomFolders(folderList);

    if (folderList.length > 0) {
      if (!folderList.some(f => f.key === activeFolder)) {
        setActiveFolder(folderList[0].key);
      }
    } else {
      setActiveFolder('');
    }
  };

  const handleAddCustomFolder = async () => {
    if (isClientView) return;
    if (!newFolderName.trim()) return;
    const cleanName = newFolderName.trim();
    const key = `folder_${Date.now()}_` + cleanName.toLowerCase().replace(/\s+/g, '_');
    const newFolderObj = { key, title: `📁 ${cleanName}`, icon: '📁' };
    const updatedFolders = [...customFolders, newFolderObj];
    
    setCustomFolders(updatedFolders);
    Storage.saveCatalogFolderList(updatedFolders);

    setActiveFolder(key);
    const updatedCatalog = { ...catalog, [key]: catalog[key] || [] };
    setCatalog(updatedCatalog);
    await Storage.saveCatalog(updatedCatalog);

    setNewFolderName('');
    setShowAddFolderInput(false);
  };

  const confirmDeleteFolder = async (folderKey: string) => {
    if (isClientView) return;
    const updatedCatalog = { ...catalog };
    delete updatedCatalog[folderKey];
    setCatalog(updatedCatalog);
    await Storage.saveCatalog(updatedCatalog);

    const updatedFolders = customFolders.filter(f => f.key !== folderKey);
    setCustomFolders(updatedFolders);
    Storage.saveCatalogFolderList(updatedFolders);

    if (activeFolder === folderKey) {
      const nextFolder = updatedFolders.length > 0 ? updatedFolders[0].key : '';
      setActiveFolder(nextFolder);
    }
  };

  const handleRestoreDefaultFolders = async () => {
    if (isClientView) return;
    setCustomFolders(DEFAULT_FOLDERS);
    Storage.saveCatalogFolderList(DEFAULT_FOLDERS);
    setActiveFolder('salao');
    setShowRestoreConfirm(false);
  };

  // OPEN MODAL TO ADD NEW PRODUCT (WITH LIVE VISUAL PREVIEW)
  const openAddNewProductModal = (preselectedFolder?: string) => {
    if (isClientView) return;
    setProductModalMode('add');
    setEditingItemTarget(null);
    setFormFolder(preselectedFolder || activeFolder || 'higiene');
    setFormImageUrl('');
    setFormMediaType('image');
    setFormTitle('');
    setFormPrice('');
    setFormStock('');
    setFormDescription('');
    setShowProductModal(true);
  };

  // OPEN MODAL TO EDIT EXISTING PRODUCT (WITH LIVE VISUAL PREVIEW)
  const openEditProductModal = (index: number, e?: React.MouseEvent) => {
    if (isClientView) return;
    if (e) e.stopPropagation();
    const item = (catalog[activeFolder] || [])[index];
    if (!item) return;

    setProductModalMode('edit');
    setEditingItemTarget({ folder: activeFolder, index });
    setFormFolder(item.folder || activeFolder);
    setFormImageUrl(item.url || '');
    setFormMediaType(item.mediaType || 'image');
    setFormTitle(item.title || '');
    setFormPrice(item.price !== undefined ? String(item.price) : '');
    setFormStock(item.stock !== undefined ? String(item.stock) : '');
    setFormDescription(item.description || '');
    setShowProductModal(true);
  };

  // HANDLE SINGLE FILE SELECTION FOR THE MODAL PREVIEW
  const handleSelectSingleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    setFormMediaType(isVideo ? 'video' : 'image');

    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result as string;
      setFormImageUrl(result);
      if (!formTitle) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ');
        setFormTitle(cleanName);
      }
    };
    reader.readAsDataURL(file);
  };

  // SAVE PRODUCT FROM MODAL (ADD OR EDIT)
  const handleSaveProductForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isClientView) return;

    if (!formImageUrl) {
      alert('Por favor, selecione uma foto ou vídeo para o produto.');
      return;
    }

    const parsedPrice = formPrice.trim() !== '' ? parseFloat(formPrice.replace(',', '.')) : undefined;
    const finalPrice = !isNaN(Number(parsedPrice)) ? parsedPrice : undefined;
    const parsedStock = formStock.trim() !== '' ? parseInt(formStock, 10) : undefined;
    const finalStock = (parsedStock !== undefined && !isNaN(parsedStock) && parsedStock >= 0) ? parsedStock : (formStock.trim() !== '' ? formStock.trim() : undefined);
    const cleanTitle = formTitle.trim() || 'Produto sem título';
    const cleanDescription = formDescription.trim() || undefined;
    const targetFolder = formFolder || activeFolder || 'higiene';

    if (productModalMode === 'add') {
      const newItem: CatalogMedia = {
        id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        folder: targetFolder,
        url: formImageUrl,
        title: cleanTitle,
        price: finalPrice,
        stock: finalStock,
        description: cleanDescription,
        mediaType: formMediaType,
        createdAt: new Date().toISOString()
      };

      const updatedCatalog = {
        ...catalog,
        [targetFolder]: [...(catalog[targetFolder] || []), newItem]
      };
      setCatalog(updatedCatalog);
      await Storage.saveCatalog(updatedCatalog);
      setActiveFolder(targetFolder);
    } else if (productModalMode === 'edit' && editingItemTarget) {
      const { folder: originalFolder, index } = editingItemTarget;
      const originalItems = [...(catalog[originalFolder] || [])];
      const existingItem = originalItems[index];

      if (existingItem) {
        const updatedItem: CatalogMedia = {
          ...existingItem,
          folder: targetFolder,
          url: formImageUrl,
          mediaType: formMediaType,
          title: cleanTitle,
          price: finalPrice,
          stock: finalStock,
          description: cleanDescription
        };

        let updatedCatalog = { ...catalog };

        if (originalFolder === targetFolder) {
          originalItems[index] = updatedItem;
          updatedCatalog[targetFolder] = originalItems;
        } else {
          // Moved to another folder
          originalItems.splice(index, 1);
          updatedCatalog[originalFolder] = originalItems;
          updatedCatalog[targetFolder] = [...(updatedCatalog[targetFolder] || []), updatedItem];
          setActiveFolder(targetFolder);
        }

        setCatalog(updatedCatalog);
        await Storage.saveCatalog(updatedCatalog);
      }
    }

    setShowProductModal(false);
  };

  // BATCH FILE UPLOAD (FOR RAPID BULK IMAGES)
  const handleBatchFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isClientView) return;
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0 || !activeFolder) return;

    let loaded = 0;
    const newItems: CatalogMedia[] = [];

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const urlData = evt.target?.result as string;
        const isVideo = file.type.startsWith('video/');
        const cleanTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ');

        newItems.push({
          id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          folder: activeFolder,
          url: urlData,
          title: cleanTitle,
          price: activeFolder === 'higiene' || activeFolder === 'roupas' ? 50 : undefined,
          mediaType: isVideo ? 'video' : 'image',
          createdAt: new Date().toISOString()
        });

        loaded++;
        if (loaded === files.length) {
          const updatedCatalog = {
            ...catalog,
            [activeFolder]: [...(catalog[activeFolder] || []), ...newItems]
          };
          setCatalog(updatedCatalog);
          await Storage.saveCatalog(updatedCatalog);
          if (batchFileInputRef.current) batchFileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDeleteItem = async (index: number) => {
    if (isClientView) return;
    if (!activeFolder) return;
    const folderItems = [...(catalog[activeFolder] || [])];
    folderItems.splice(index, 1);
    const updatedCatalog = {
      ...catalog,
      [activeFolder]: folderItems
    };
    setCatalog(updatedCatalog);
    await Storage.saveCatalog(updatedCatalog);

    if (lightboxIndex === index) {
      setLightboxIndex(null);
    }
  };

  // Save Store-wide Payment Config (Pix & Card Account)
  const handleSaveStorePaymentConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedCfg: SalonConfig = {
      ...currentConfig,
      chavePix: editChavePix.trim(),
      tipoChavePix: editTipoChavePix,
      titularPix: editTitularPix.trim(),
      cidadePix: editCidadePix.trim(),
      bancoCartao: editBancoCartao.trim(),
      agenciaCartao: editAgenciaCartao.trim(),
      contaCartao: editContaCartao.trim(),
      tipoContaCartao: editTipoContaCartao,
      titularCartao: editTitularCartao.trim(),
      cpfCnpjCartao: editCpfCnpjCartao.trim(),
      linkCartao: editLinkCartao.trim(),
      instrucoesPagamento: editInstrucoes.trim()
    };

    if (onSaveConfig) {
      onSaveConfig(updatedCfg);
    } else {
      Storage.saveConfig(updatedCfg);
    }

    setShowPaymentConfigModal(false);
  };

  const handleCopyText = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Open dynamic Pix QR Code generator for an item or store
  const handleOpenPixQr = async (item: { title: string; price?: number | string }) => {
    const rawPrice = item.price;
    const numPrice = rawPrice ? (typeof rawPrice === 'string' ? parseFloat(rawPrice.replace(',', '.')) : Number(rawPrice)) : undefined;
    const validAmount = numPrice && !isNaN(numPrice) && numPrice > 0 ? numPrice : undefined;

    const pixKey = currentConfig.chavePix || '11973395723';
    const beneficiaryName = currentConfig.titularPix || currentConfig.nomeSalao || 'AGENDA FACIL';
    const cityName = currentConfig.cidadePix || 'SAO PAULO';

    const payload = generatePixEMVPayload(pixKey, beneficiaryName, cityName, validAmount);
    setEmvPayload(payload);
    setPixQrItem(item);

    const qrUrl = await generateQrCodeDataUrl(payload);
    setQrCodeDataUrl(qrUrl);
  };

  if (!isOpen) return null;

  const currentMediaItems = catalog[activeFolder] || [];
  const lightboxMedia = lightboxIndex !== null ? currentMediaItems[lightboxIndex] : null;

  // Format Brazilian Real price
  const formatPrice = (val: number | string | undefined) => {
    if (val === undefined || val === null || val === '') return null;
    const num = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : Number(val);
    if (isNaN(num)) return typeof val === 'string' ? val : null;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const activePixKey = currentConfig.chavePix || '11973395723';
  const activeTitularPix = currentConfig.titularPix || currentConfig.nomeSalao;
  const hasCardAccount = !!(currentConfig.bancoCartao || currentConfig.contaCartao || currentConfig.linkCartao);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-1 sm:p-3 overflow-hidden animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-7xl h-[98vh] flex flex-col min-h-0 overflow-hidden relative">
        
        {/* Compact Top Header Bar */}
        <div className="px-3 py-2 sm:px-4 sm:py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-xl bg-purple-600/30 text-purple-400 border border-purple-500/20 shadow-inner shrink-0">
              <Folder className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black text-white truncate">
                  📸 Catálogo de Mídias & Anexos
                </h3>
                {isClientView ? (
                  <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <Eye className="w-3 h-3" /> Cliente
                  </span>
                ) : (
                  <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-extrabold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                    <Settings className="w-3 h-3" /> Gestão
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Top Actions & Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* View Size Switcher */}
            <div className="flex items-center bg-slate-950 p-0.5 sm:p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setViewCardSize('large')}
                title="Cards Grandes (Fotos Ampliadas)"
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  viewCardSize === 'large'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grande</span>
              </button>
              <button
                type="button"
                onClick={() => setViewCardSize('medium')}
                title="Grade Média"
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  viewCardSize === 'medium'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Médio</span>
              </button>
              <button
                type="button"
                onClick={() => setViewCardSize('compact')}
                title="Grade Compacta"
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  viewCardSize === 'compact'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
            </div>

            {!isClientView && (
              <>
                <input
                  type="file"
                  ref={batchFileInputRef}
                  onChange={handleBatchFileUpload}
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                />
                
                <button
                  type="button"
                  onClick={() => batchFileInputRef.current?.click()}
                  title="Upload em lote"
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-2.5 py-1.5 rounded-xl transition-all border border-slate-700 hidden sm:flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5 text-purple-400" />
                  <span>Lote</span>
                </button>

                <button
                  type="button"
                  onClick={() => openAddNewProductModal(activeFolder)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-md border border-emerald-400/40 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Anexo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPaymentConfigModal(true)}
                  title="Configurar Pix e Cartão"
                  className="bg-purple-900/80 hover:bg-purple-800 text-purple-200 hover:text-white font-bold text-xs px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 border border-purple-500/30 active:scale-95"
                >
                  <CreditCard className="w-3.5 h-3.5 text-purple-300" />
                  <span className="hidden md:inline">Pix & Cartão</span>
                </button>
              </>
            )}

            <button
              onClick={onClose}
              title="Fechar Catálogo"
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Folder Navigation Tabs */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 border-b border-slate-800 overflow-x-auto shrink-0 custom-scrollbar">
          {customFolders.map(f => {
            const isActive = activeFolder === f.key;
            return (
              <div key={f.key} className="flex items-center shrink-0 bg-slate-900/90 rounded-xl border border-slate-800 p-0.5 gap-0.5">
                <button
                  type="button"
                  onClick={() => setActiveFolder(f.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-purple-600 text-white border border-purple-400 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>{f.title}</span>
                  <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded-full text-slate-300 font-mono">
                    {(catalog[f.key] || []).length}
                  </span>
                </button>

                {/* Trash Icon Button to delete folder - ONLY FOR SALON/ADMIN */}
                {!isClientView && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFolderToDelete(f.key);
                    }}
                    title={`Excluir pasta "${f.title}"`}
                    className="p-1 rounded-lg text-rose-400 hover:text-white hover:bg-rose-600 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Add Custom Folder Button & Restore - ONLY FOR SALON/ADMIN */}
          {!isClientView && (
            !showAddFolderInput ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddFolderInput(true)}
                  className="bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold text-xs px-2.5 py-1 rounded-xl transition-all border border-purple-500/30 flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nova Pasta</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowRestoreConfirm(true)}
                  title="Restaurar pastas padrão do sistema"
                  className="text-[10px] text-slate-400 hover:text-purple-300 underline font-semibold px-1.5 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restaurar</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-purple-500 shrink-0">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Nome da pasta..."
                  className="bg-slate-950 text-white text-xs px-2.5 py-1 rounded-lg border border-slate-700 outline-none w-32 sm:w-40 focus:border-purple-400"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddCustomFolder();
                    if (e.key === 'Escape') setShowAddFolderInput(false);
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddCustomFolder}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded-lg transition-all"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddFolderInput(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          )}
        </div>

        {/* Media Grid with Guaranteed Smooth Vertical Scrollbar & min-h-0 */}
        <div className="flex-1 min-h-0 w-full overflow-y-scroll custom-scrollbar p-3 sm:p-5 bg-slate-950/40">
          <div
            className={`grid ${
              viewCardSize === 'large'
                ? 'grid-cols-1 md:grid-cols-2 gap-5'
                : viewCardSize === 'medium'
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'
            } pb-28`}
          >
          {currentMediaItems.length === 0 ? (
            <div className="col-span-full h-80 flex flex-col items-center justify-center text-slate-400 space-y-3 bg-slate-950/40 rounded-3xl border border-slate-800 border-dashed p-6">
              <div className="w-16 h-16 rounded-3xl bg-slate-800/80 flex items-center justify-center text-purple-400 border border-slate-700 shadow-inner">
                <ImageIcon className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="text-base font-extrabold text-white">Nenhum anexo ou produto nesta pasta</p>
                <p className="text-xs text-slate-400 mt-0.5 max-w-md">
                  {isClientView
                    ? 'O salão ainda não publicou anexos ou produtos nesta categoria.'
                    : 'Adicione fotos de produtos, comprovantes, serviços, portfólio ou cortes com valores em R$ e descrições detalhadas.'}
                </p>
              </div>
              {!isClientView ? (
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => openAddNewProductModal(activeFolder)}
                    className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-lg active:scale-95"
                  >
                    <Plus className="w-4 h-4" /> Cadastrar Primeiro Item
                  </button>
                  <button
                    type="button"
                    onClick={() => batchFileInputRef.current?.click()}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3.5 py-2 rounded-xl transition-all border border-slate-700 flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" /> Envio de Múltiplos
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            currentMediaItems.map((item, idx) => {
              const formatted = formatPrice(item.price);
              return (
                <div
                  key={item.id || idx}
                  onClick={() => setLightboxIndex(idx)}
                  className={`group relative bg-slate-950 border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl hover:border-purple-500/80 transition-all hover:scale-[1.01] cursor-pointer flex flex-col justify-between ${
                    viewCardSize === 'large' ? 'ring-1 ring-slate-800/50' : ''
                  }`}
                >
                  {/* Thumbnail / Media Preview Box with Guaranteed High Min-Height */}
                  <div className="w-full flex flex-col">
                    <div
                      className={`w-full bg-slate-900/90 relative overflow-hidden flex items-center justify-center ${
                        viewCardSize === 'large'
                          ? 'min-h-[300px] sm:min-h-[380px] max-h-[460px]'
                          : viewCardSize === 'medium'
                          ? 'min-h-[220px] sm:min-h-[270px]'
                          : 'min-h-[170px] sm:min-h-[210px]'
                      }`}
                    >
                      {item.mediaType === 'video' ? (
                        <div className="w-full h-full min-h-inherit relative flex items-center justify-center bg-slate-950">
                          <video src={item.url} className="w-full h-full max-h-[460px] object-cover opacity-85" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-all">
                            <div className="w-14 h-14 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-xl">
                              <Play className="w-7 h-7 ml-0.5" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={item.url}
                          alt={item.title || 'Foto do Anexo'}
                          className={`w-full h-full ${
                            viewCardSize === 'large' ? 'max-h-[460px] object-contain sm:object-cover' : 'object-cover'
                          } transition-transform duration-300 group-hover:scale-105`}
                          loading="lazy"
                        />
                      )}

                      {/* Top Overlay Gradient */}
                      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />

                      {/* Price Badge (Top Right) */}
                      {formatted ? (
                        <div className="absolute top-3 right-3 bg-emerald-600/95 text-white text-xs sm:text-sm font-black px-3 py-1 rounded-xl shadow-xl border border-emerald-400/40 backdrop-blur-xs flex items-center gap-1.5 z-10">
                          <Tag className="w-3.5 h-3.5 text-emerald-200" />
                          <span>{formatted}</span>
                        </div>
                      ) : (
                        <div className="absolute top-3 right-3 bg-slate-900/90 text-slate-300 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-700 backdrop-blur-xs z-10">
                          Sob consulta
                        </div>
                      )}

                      {/* Salon Admin Action buttons: Edit & Delete (Top Left) */}
                      {!isClientView && (
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity z-10">
                          <button
                            type="button"
                            onClick={(e) => openEditProductModal(idx, e)}
                            title="Editar Nome, Valor (R$), Descrição e Foto"
                            className="w-8 h-8 rounded-xl bg-slate-900/90 hover:bg-purple-600 text-purple-300 hover:text-white flex items-center justify-center text-xs font-bold shadow-lg transition-all border border-slate-700 active:scale-95"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteItem(idx);
                            }}
                            title="Excluir Anexo"
                            className="w-8 h-8 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white flex items-center justify-center text-xs font-bold shadow-lg transition-all active:scale-95"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Product / Attachment Information Body */}
                    <div className="p-4 text-left space-y-2">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-base font-extrabold text-white truncate group-hover:text-purple-300 transition-colors">
                          {item.title || 'Sem título'}
                        </h4>
                      </div>

                      {/* Stock / Available Quantity in Salon Badge */}
                      {item.stock !== undefined && String(item.stock).trim() !== '' ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {Number(item.stock) === 0 ? (
                            <span className="text-[10px] font-extrabold bg-rose-950/90 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-lg flex items-center gap-1">
                              <Package className="w-3 h-3 text-rose-400" />
                              Esgotado no salão
                            </span>
                          ) : Number(item.stock) <= 3 ? (
                            <span className="text-[10px] font-extrabold bg-amber-950/90 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-lg flex items-center gap-1">
                              <Package className="w-3 h-3 text-amber-400" />
                              Últimas {item.stock} un. disponíveis
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-lg flex items-center gap-1">
                              <Package className="w-3 h-3 text-emerald-400" />
                              {item.stock} un. disponíveis no salão
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                          <Package className="w-3 h-3 text-slate-500" />
                          <span>Disponível no salão</span>
                        </div>
                      )}

                      {/* Description displayed prominently on the card */}
                      {item.description ? (
                        <p
                          className={`text-xs text-slate-300 leading-relaxed bg-slate-900/70 p-3 rounded-xl border border-slate-800/80 ${
                            viewCardSize === 'large' ? 'line-clamp-4' : 'line-clamp-2'
                          }`}
                        >
                          {item.description}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500 italic">
                          Sem descrição informada
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Fast Action Footer */}
                  <div className="p-2.5 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-xs gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIndex(idx);
                      }}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 px-2 rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-1 text-center active:scale-95"
                    >
                      <Eye className="w-3.5 h-3.5 text-purple-400" />
                      <span className="truncate">Detalhes</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCheckoutItem(item);
                        setCheckoutMethod('pix');
                      }}
                      title="Pagar com Pix"
                      className="bg-purple-900/90 hover:bg-purple-800 text-purple-200 hover:text-white font-bold py-2 px-2.5 rounded-xl transition-all border border-purple-500/30 flex items-center justify-center gap-1 active:scale-95"
                    >
                      <QrCode className="w-3.5 h-3.5 text-purple-300" />
                      <span>Pix</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCheckoutItem(item);
                        setCheckoutMethod('cartao');
                      }}
                      title="Pagar com Cartão de Crédito"
                      className="bg-sky-900/90 hover:bg-sky-800 text-sky-200 hover:text-white font-bold py-2 px-2.5 rounded-xl transition-all border border-sky-500/30 flex items-center justify-center gap-1 active:scale-95"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-sky-300" />
                      <span>Cartão</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>

      </div>

      {/* PRODUCT CREATION / EDITING MODAL WITH FULL VISUAL PREVIEW */}
      {showProductModal && !isClientView && (
        <div className="fixed inset-0 z-70 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl shadow-2xl max-w-3xl w-full my-auto overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2.5 text-purple-400 font-bold text-sm sm:text-base">
                <Tag className="w-5 h-5 text-emerald-400" />
                <span className="text-white">
                  {productModalMode === 'add' ? '➕ Cadastrar Novo Produto / Foto' : '✏️ Editar Informações do Produto'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProductForm} className="p-4 sm:p-6 space-y-5">
              
              {/* TWO COLUMN LAYOUT: IMAGE PREVIEW & FORM INPUTS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                
                {/* LEFT COLUMN: LIVE IMAGE PREVIEW & CARD MOCKUP */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-purple-400" />
                      <span>Visualização da Foto do Produto:</span>
                    </label>
                    {formImageUrl && (
                      <button
                        type="button"
                        onClick={() => singleFileInputRef.current?.click()}
                        className="text-[11px] text-purple-400 hover:text-purple-300 font-bold underline"
                      >
                        Trocar Foto
                      </button>
                    )}
                  </div>

                  {/* Hidden File Input for Single Image */}
                  <input
                    type="file"
                    ref={singleFileInputRef}
                    onChange={handleSelectSingleFile}
                    accept="image/*,video/*"
                    className="hidden"
                  />

                  {/* Visual Preview Box */}
                  {formImageUrl ? (
                    <div className="bg-slate-950 border-2 border-purple-500/40 rounded-2xl p-2 relative group overflow-hidden shadow-lg">
                      <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-black/60 flex items-center justify-center relative">
                        {formMediaType === 'video' ? (
                          <video src={formImageUrl} controls className="w-full h-full object-contain" />
                        ) : (
                          <img
                            src={formImageUrl}
                            alt="Preview do Produto"
                            className="w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute top-2 right-2 bg-emerald-600 text-white text-xs font-black px-2.5 py-0.5 rounded-lg shadow-md border border-emerald-400/40">
                          {formatPrice(formPrice) || 'R$ 0,00'}
                        </div>
                      </div>

                      <div className="mt-2 text-center">
                        <button
                          type="button"
                          onClick={() => singleFileInputRef.current?.click()}
                          className="w-full bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white font-bold text-xs py-2 rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-1.5"
                        >
                          <Upload className="w-3.5 h-3.5" /> Escolher Outra Foto / Vídeo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => singleFileInputRef.current?.click()}
                      className="aspect-[4/3] w-full bg-slate-950 border-2 border-dashed border-purple-500/50 hover:border-purple-400 rounded-2xl flex flex-col items-center justify-center p-5 text-center cursor-pointer transition-all hover:bg-purple-950/20 group"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-purple-900/30 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Upload className="w-7 h-7" />
                      </div>
                      <p className="text-xs font-extrabold text-white">
                        Clique aqui para carregar a Foto ou Vídeo
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Formatos aceitos: JPG, PNG, WEBP, MP4
                      </p>
                    </div>
                  )}

                  {/* LIVE PREVIEW OF CARD TEXT */}
                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-left space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Como o cliente verá no Catálogo:
                    </div>
                    <div className="text-sm font-extrabold text-white">
                      {formTitle || 'Nome do Produto...'}
                    </div>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-xs font-bold text-emerald-400">
                        {formatPrice(formPrice) || 'Valor sob consulta'}
                      </div>
                      {formStock.trim() !== '' && (
                        <div className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border ${
                          Number(formStock) === 0
                            ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                            : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                        }`}>
                          <Package className="w-3 h-3" />
                          {Number(formStock) === 0 ? 'Esgotado' : `${formStock} un. disponíveis`}
                        </div>
                      )}
                    </div>
                    {formDescription ? (
                      <p className="text-xs text-slate-300 bg-slate-900 p-2 rounded-xl border border-slate-800/80 line-clamp-3 leading-relaxed">
                        {formDescription}
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">
                        (A descrição digitada ao lado aparecerá aqui)
                      </p>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: FORM INPUTS */}
                <div className="space-y-4">
                  
                  {/* Category / Folder Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                      <Folder className="w-3.5 h-3.5 text-purple-400" />
                      <span>Pasta / Categoria de Exibição:</span>
                    </label>
                    <select
                      value={formFolder}
                      onChange={(e) => setFormFolder(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-xs focus:border-purple-500 outline-none font-bold"
                    >
                      {customFolders.map(f => (
                        <option key={f.key} value={f.key}>
                          {f.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Title / Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Nome / Título do Produto ou Serviço: *
                    </label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Ex: Shampoo Especial, Corte Degradê, Vestido..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-semibold"
                    />
                  </div>

                  {/* Price in R$ */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>Valor / Preço do Produto (R$):</span>
                      <span className="text-[10px] text-emerald-400 font-bold">Visível aos clientes</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400 text-xs font-black">
                        R$
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formPrice}
                        onChange={(e) => setFormPrice(e.target.value)}
                        placeholder="Ex: 50.00 ou 500"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-emerald-300 font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Available Quantity in Salon (Stock) - Sincronizado para Cliente e Salão */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-purple-400" />
                        <span>Quantidade Disponível no Salão (Estoque):</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold">Visível aos clientes</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={formStock}
                        onChange={(e) => setFormStock(e.target.value)}
                        placeholder="Ex: 5, 10, 20 unidades..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-purple-500 pr-24"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-[11px] font-bold">
                        unidades
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Quantidade disponível no salão para venda. O cliente e o administrador visualizam esta informação em tempo real.
                    </p>
                  </div>

                  {/* Detailed Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-purple-400" />
                        <span>Descrição Completa / Detalhes do Produto:</span>
                      </span>
                      <span className="text-[10px] text-purple-400 font-bold">Importante</span>
                    </label>
                    <textarea
                      rows={4}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Ex: Frasco 500ml, produto importado com alta fixação e hidratação intensa. Modo de uso e composição..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
                    />
                  </div>

                  {/* Store Pix Info Card */}
                  <div className="p-3 bg-slate-950 rounded-2xl border border-purple-500/30 text-[11px] text-slate-300 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-purple-300 flex items-center gap-1">
                        <QrCode className="w-3.5 h-3.5" /> Chave Pix da Loja (Unificada):
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowProductModal(false);
                          setShowPaymentConfigModal(true);
                        }}
                        className="text-[10px] text-purple-400 hover:text-purple-300 underline font-bold"
                      >
                        Configurar Chave
                      </button>
                    </div>
                    <p className="font-mono text-purple-200 font-bold">{activePixKey}</p>
                    <p className="text-[10px] text-slate-400">
                      O cliente poderá pagar este produto diretamente usando esta chave Pix ou QR Code instantâneo.
                    </p>
                  </div>

                </div>
              </div>

              {/* Form Action Footer */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-3 rounded-xl transition-all border border-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95 border border-emerald-400/40"
                >
                  <Check className="w-4 h-4" />
                  <span>{productModalMode === 'add' ? 'Adicionar Produto ao Catálogo' : 'Salvar Alterações'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* STORE PAYMENT & CARD ACCOUNT CONFIG MODAL (SALON ADMIN) */}
      {showPaymentConfigModal && !isClientView && (
        <div className="fixed inset-0 z-70 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 text-white p-5 rounded-3xl shadow-2xl max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm">
                <CreditCard className="w-5 h-5" />
                <span>Conta de Recebimento da Loja (Pix & Cartão)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentConfigModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStorePaymentConfig} className="space-y-4 text-xs">
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl text-slate-300 text-[11px] space-y-1">
                <p className="font-bold text-emerald-300">💡 Chave Pix & Conta Única para Todos os Produtos</p>
                <p>
                  As informações configuradas aqui serão exibidas para todos os clientes em todos os produtos do catálogo e nos agendamentos.
                </p>
              </div>

              {/* PIX SECTION */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-purple-500/30 space-y-3">
                <span className="font-extrabold text-purple-300 flex items-center gap-1.5 text-xs">
                  <QrCode className="w-4 h-4" /> 1. Chave Pix do Estabelecimento
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Tipo:</label>
                    <select
                      value={editTipoChavePix}
                      onChange={(e) => setEditTipoChavePix(e.target.value as any)}
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
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Chave Pix:</label>
                    <input
                      type="text"
                      value={editChavePix}
                      onChange={(e) => setEditChavePix(e.target.value)}
                      placeholder="Ex: financeiro@meusalao.com ou 11999998888"
                      className="w-full bg-slate-900 border border-slate-700 text-white font-mono rounded-xl px-3 py-2 text-xs focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Titular / Beneficiário:</label>
                    <input
                      type="text"
                      value={editTitularPix}
                      onChange={(e) => setEditTitularPix(e.target.value)}
                      placeholder="Nome completo ou Razão Social"
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Cidade:</label>
                    <input
                      type="text"
                      value={editCidadePix}
                      onChange={(e) => setEditCidadePix(e.target.value)}
                      placeholder="Ex: São Paulo"
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* CARD BANK ACCOUNT SECTION */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-sky-500/30 space-y-3">
                <span className="font-extrabold text-sky-300 flex items-center gap-1.5 text-xs">
                  <Building2 className="w-4 h-4" /> 2. Conta para Receber Compras em Cartão de Crédito
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Banco / Adquirente:</label>
                    <input
                      type="text"
                      value={editBancoCartao}
                      onChange={(e) => setEditBancoCartao(e.target.value)}
                      placeholder="Ex: Nubank, Itaú, Stone, InfinitePay..."
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-sky-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Tipo de Conta:</label>
                    <select
                      value={editTipoContaCartao}
                      onChange={(e) => setEditTipoContaCartao(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-2.5 py-2 text-xs focus:border-sky-500 outline-none"
                    >
                      <option value="corrente">Conta Corrente</option>
                      <option value="poupanca">Conta Poupança</option>
                      <option value="pagamento">Conta Pagamento</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Agência:</label>
                    <input
                      type="text"
                      value={editAgenciaCartao}
                      onChange={(e) => setEditAgenciaCartao(e.target.value)}
                      placeholder="Ex: 0001"
                      className="w-full bg-slate-900 border border-slate-700 text-white font-mono rounded-xl px-3 py-2 text-xs focus:border-sky-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Número da Conta:</label>
                    <input
                      type="text"
                      value={editContaCartao}
                      onChange={(e) => setEditContaCartao(e.target.value)}
                      placeholder="Ex: 1234567-8"
                      className="w-full bg-slate-900 border border-slate-700 text-white font-mono rounded-xl px-3 py-2 text-xs focus:border-sky-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Titular da Conta:</label>
                    <input
                      type="text"
                      value={editTitularCartao}
                      onChange={(e) => setEditTitularCartao(e.target.value)}
                      placeholder="Nome do Titular"
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-sky-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">CPF ou CNPJ:</label>
                    <input
                      type="text"
                      value={editCpfCnpjCartao}
                      onChange={(e) => setEditCpfCnpjCartao(e.target.value)}
                      placeholder="00.000.000/0001-00"
                      className="w-full bg-slate-900 border border-slate-700 text-white font-mono rounded-xl px-3 py-2 text-xs focus:border-sky-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Link de Pagamento com Cartão (Opcional):</label>
                  <input
                    type="url"
                    value={editLinkCartao}
                    onChange={(e) => setEditLinkCartao(e.target.value)}
                    placeholder="https://mpago.la/... ou https://link.infinitepay.io/..."
                    className="w-full bg-slate-900 border border-slate-700 text-white font-mono rounded-xl px-3 py-2 text-xs focus:border-sky-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Instruções aos Clientes:</label>
                <textarea
                  rows={2}
                  value={editInstrucoes}
                  onChange={(e) => setEditInstrucoes(e.target.value)}
                  placeholder="Ex: Aceitamos Pix imediato ou parcelamento no cartão presencialmente na maquininha..."
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-emerald-500 outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPaymentConfigModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-2.5 rounded-xl transition-all border border-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Salvar Configurações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DYNAMIC PIX QR CODE & EMV MODAL */}
      {pixQrItem && (
        <div className="fixed inset-0 z-80 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-purple-500/40 text-white p-5 rounded-3xl shadow-2xl max-w-sm w-full space-y-4 text-center animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-purple-300 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-purple-400" /> Pagamento Pix Instantâneo
              </span>
              <button
                type="button"
                onClick={() => setPixQrItem(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h4 className="text-sm font-extrabold text-white">{pixQrItem.title}</h4>
              {pixQrItem.price && (
                <div className="text-xl font-black text-emerald-400 mt-1">
                  {formatPrice(pixQrItem.price)}
                </div>
              )}
            </div>

            {/* QR Code Canvas/Image */}
            <div className="bg-white p-3.5 rounded-2xl inline-block shadow-xl mx-auto border-2 border-purple-500/50">
              {qrCodeDataUrl ? (
                <img src={qrCodeDataUrl} alt="QR Code Pix" className="w-48 h-48 mx-auto" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-slate-800 text-xs font-bold">
                  Gerando QR Code Pix...
                </div>
              )}
            </div>

            {/* Pix Key Display & Copy */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-left space-y-2">
              <div>
                <span className="text-[10px] text-slate-400 block font-bold">Chave Pix do Estabelecimento:</span>
                <span className="text-xs font-mono font-black text-purple-200 break-all">{activePixKey}</span>
              </div>
              {activeTitularPix && (
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Beneficiário:</span>
                  <span className="text-xs font-extrabold text-white">{activeTitularPix}</span>
                </div>
              )}
            </div>

            {/* Copy EMV / Key Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleCopyText(activePixKey, 'modal_key')}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black text-xs py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                {copiedField === 'modal_key' ? (
                  <>
                    <CheckCheck className="w-4 h-4 text-emerald-300" /> Chave Pix Copiada com Sucesso!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copiar Chave Pix
                  </>
                )}
              </button>

              {emvPayload && (
                <button
                  type="button"
                  onClick={() => handleCopyText(emvPayload, 'modal_emv')}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-purple-200 font-bold text-xs py-2 rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-1"
                >
                  {copiedField === 'modal_emv' ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> Código Copia e Cola Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copiar Código Pix "Copia e Cola"
                    </>
                  )}
                </button>
              )}
            </div>

            <p className="text-[10px] text-slate-400 leading-tight">
              Abra o app do seu banco, selecione <strong>Pix &gt; Pagar com QR Code</strong> ou <strong>Pix Copia e Cola</strong> e confirme o pagamento.
            </p>
          </div>
        </div>
      )}

      {/* DELETE FOLDER CONFIRMATION MODAL */}
      {folderToDelete && !isClientView && (
        <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 text-white p-5 rounded-2xl shadow-2xl max-w-sm w-full space-y-4 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Excluir Pasta?</h4>
              <p className="text-xs text-slate-300 mt-1">
                Tem certeza que deseja excluir a pasta <span className="font-extrabold text-purple-300">"{customFolders.find(f => f.key === folderToDelete)?.title || folderToDelete}"</span>? Todas as fotos e vídeos desta pasta serão apagados.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setFolderToDelete(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-2.5 rounded-xl transition-all border border-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDeleteFolder(folderToDelete);
                  setFolderToDelete(null);
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESTORE DEFAULT FOLDERS CONFIRMATION MODAL */}
      {showRestoreConfirm && !isClientView && (
        <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 text-white p-5 rounded-2xl shadow-2xl max-w-sm w-full space-y-4 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center mx-auto border border-purple-500/30">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Restaurar Pastas Padrão?</h4>
              <p className="text-xs text-slate-300 mt-1">
                Isso irá redefinir a lista de abas para as pastas padrão do sistema (Salão, Clientes, Portfólio, etc.).
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowRestoreConfirm(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-2.5 rounded-xl transition-all border border-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRestoreDefaultFolders}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md"
              >
                Restaurar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX / FULL DETAIL PREVIEW MODAL */}
      {lightboxMedia && (
        <div className="fixed inset-0 z-60 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3 max-w-5xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                <Eye className="w-4 h-4" /> Detalhes da Foto / Produto
              </span>
              {formatPrice(lightboxMedia.price) && (
                <span className="bg-emerald-600 text-white font-black text-xs px-2.5 py-0.5 rounded-full shadow-md">
                  {formatPrice(lightboxMedia.price)}
                </span>
              )}
            </div>
            <button
              onClick={() => setLightboxIndex(null)}
              className="text-white/80 hover:text-white text-sm font-bold p-1 hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Media & Details Card */}
          <div className="w-full max-w-5xl flex-1 flex flex-col md:flex-row items-center justify-center gap-5 p-2 overflow-y-auto my-2">
            <div className="flex-1 flex items-center justify-center max-h-[60vh] md:max-h-[70vh]">
              {lightboxMedia.mediaType === 'video' ? (
                <video
                  src={lightboxMedia.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[60vh] md:max-h-[70vh] rounded-3xl object-contain shadow-2xl border border-slate-800"
                />
              ) : (
                <img
                  src={lightboxMedia.url}
                  alt={lightboxMedia.title}
                  className="max-w-full max-h-[60vh] md:max-h-[70vh] rounded-3xl object-contain shadow-2xl border border-slate-800"
                />
              )}
            </div>

            {/* Details Column */}
            <div className="w-full md:w-96 bg-slate-900/95 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-3.5 text-left shrink-0 max-h-[75vh] overflow-y-auto">
              <div>
                <h4 className="text-base font-black text-white">
                  {lightboxMedia.title || 'Foto do Catálogo'}
                </h4>
                <p className="text-xs text-purple-300">
                  Pasta: {customFolders.find(f => f.key === lightboxMedia.folder)?.title || lightboxMedia.folder}
                </p>
              </div>

              {/* Price & Stock Display */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 mb-0.5">Valor do Produto / Serviço:</div>
                    <div className="text-xl font-black text-emerald-400">
                      {formatPrice(lightboxMedia.price) || 'Sob consulta'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setCheckoutItem(lightboxMedia);
                        setCheckoutMethod('pix');
                      }}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all shadow-md flex items-center gap-1 active:scale-95"
                    >
                      <QrCode className="w-4 h-4" /> Pagar Pix
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCheckoutItem(lightboxMedia);
                        setCheckoutMethod('cartao');
                      }}
                      className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all shadow-md flex items-center gap-1 active:scale-95"
                    >
                      <CreditCard className="w-4 h-4" /> Cartão
                    </button>
                  </div>
                </div>

                {/* Real-time Stock Display */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-purple-400" />
                    Estoque no Salão:
                  </span>
                  {lightboxMedia.stock !== undefined && String(lightboxMedia.stock).trim() !== '' ? (
                    Number(lightboxMedia.stock) === 0 ? (
                      <span className="font-extrabold text-rose-400 bg-rose-950/80 px-2.5 py-0.5 rounded-lg border border-rose-500/40">
                        Esgotado
                      </span>
                    ) : (
                      <span className="font-extrabold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-lg border border-emerald-500/40">
                        {lightboxMedia.stock} unidade(s) disponível(is)
                      </span>
                    )
                  ) : (
                    <span className="font-semibold text-slate-300">
                      Disponível para venda
                    </span>
                  )}
                </div>
              </div>

              {/* Comprehensive Description Box */}
              <div>
                <div className="text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  <span>Descrição / Detalhes do Produto:</span>
                </div>
                {lightboxMedia.description ? (
                  <p className="text-xs text-slate-200 bg-slate-950 p-3.5 rounded-2xl border border-slate-800 leading-relaxed whitespace-pre-line font-normal">
                    {lightboxMedia.description}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 italic bg-slate-950 p-3 rounded-2xl border border-slate-800">
                    Nenhuma descrição detalhada cadastrada para este item.
                  </p>
                )}
              </div>

              {/* CLEAN FAST CHECKOUT BUTTONS (NO CLUNKY RAW TEXT BOXES) */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
                <span className="text-[11px] font-black text-slate-200 uppercase tracking-wider block border-b border-slate-800/80 pb-1.5 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" /> Opções de Pagamento Rápido
                </span>

                {/* Direct Pix Button */}
                <button
                  type="button"
                  onClick={() => {
                    setCheckoutItem(lightboxMedia);
                    setCheckoutMethod('pix');
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black text-xs py-2.5 px-3 rounded-xl transition-all shadow-md flex items-center justify-between active:scale-95 border border-purple-400/40"
                >
                  <span className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-purple-200" />
                    <span>Pagar com Pix (QR Code & Copia e Cola)</span>
                  </span>
                  <span className="text-[10px] bg-purple-950/60 text-purple-200 px-2 py-0.5 rounded-lg border border-purple-400/30">
                    Instantâneo
                  </span>
                </button>

                {/* Direct Credit Card Button with Installments */}
                <button
                  type="button"
                  onClick={() => {
                    setCheckoutItem(lightboxMedia);
                    setCheckoutMethod('cartao');
                  }}
                  className="w-full bg-sky-600 hover:bg-sky-500 text-white font-black text-xs py-2.5 px-3 rounded-xl transition-all shadow-md flex items-center justify-between active:scale-95 border border-sky-400/40"
                >
                  <span className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-sky-200" />
                    <span>Pagar com Cartão de Crédito</span>
                  </span>
                  <span className="text-[10px] bg-sky-950/60 text-sky-200 px-2 py-0.5 rounded-lg border border-sky-400/30">
                    Até 5x
                  </span>
                </button>

                {/* WhatsApp Contact Action */}
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Olá! Tenho interesse no produto/serviço "${lightboxMedia.title || 'do catálogo'}"${lightboxMedia.price ? ` no valor de ${formatPrice(lightboxMedia.price)}` : ''}. Como posso efetuar o pagamento?`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md"
                >
                  <MessageCircle className="w-4 h-4" /> Comprar / Pedir pelo WhatsApp
                </a>
              </div>

              {/* Edit Button in Lightbox - SALON ADMIN ONLY */}
              {!isClientView && lightboxIndex !== null && (
                <div className="pt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const idx = lightboxIndex;
                      setLightboxIndex(null);
                      openEditProductModal(idx);
                    }}
                    className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Edit3 className="w-4 h-4" /> Editar Foto, Valor e Descrição
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPaymentConfigModal(true)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-3 py-2.5 rounded-xl border border-slate-700"
                    title="Editar Chave Pix & Conta de Cartão da Loja"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Lightbox Footer Actions */}
          <div className="w-full max-w-md flex items-center justify-center gap-3 border-t border-slate-800 pt-3">
            <button
              onClick={() => setLightboxIndex(null)}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all flex items-center gap-1.5 border border-slate-700"
            >
              <X className="w-4 h-4" /> Fechar Visualização
            </button>

            {!isClientView && (
              <button
                onClick={() => lightboxIndex !== null && handleDeleteItem(lightboxIndex)}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Excluir Mídia
              </button>
            )}
          </div>
        </div>
      )}

      {/* DEDICATED CLIENT CHECKOUT MODAL (PIX & CARTÃO WITH QUANTITY CALCULATOR & INSTALLMENTS) */}
      {checkoutItem && (
        <CheckoutModal
          isOpen={!!checkoutItem}
          onClose={() => setCheckoutItem(null)}
          item={checkoutItem}
          defaultMethod={checkoutMethod}
          salonConfig={currentConfig}
        />
      )}

    </div>
  );
};
