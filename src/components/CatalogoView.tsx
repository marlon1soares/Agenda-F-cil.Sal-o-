import React, { useState, useEffect, useRef } from 'react';
import { CatalogMedia, CatalogFolder } from '../types';
import { Storage } from '../utils/storage';
import { Image as ImageIcon, Plus, Trash2, X, Play, CheckCircle2, Folder, Eye, RotateCcw } from 'lucide-react';

interface CatalogoViewProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_FOLDERS: { key: string; title: string; icon: string }[] = [
  { key: 'salao', title: '💈 Fotos do Salão', icon: '💈' },
  { key: 'cliente', title: '👤 Fotos dos Clientes', icon: '👤' },
  { key: 'portfolio', title: '✂️ Portfólio', icon: '✂️' },
  { key: 'higiene', title: '🧴 Produtos', icon: '🧴' },
  { key: 'roupas', title: '👗 Roupas & Acessórios', icon: '👗' },
  { key: 'diversos', title: '📂 Outros Arquivos', icon: '📂' },
];

export const CatalogoView: React.FC<CatalogoViewProps> = ({ isOpen, onClose }) => {
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadCatalog();
    }
  }, [isOpen]);

  const loadCatalog = async () => {
    const data = await Storage.getCatalog();
    const savedFolders = Storage.getCatalogFolderList();

    let folderList = DEFAULT_FOLDERS;

    if (savedFolders && Array.isArray(savedFolders)) {
      folderList = savedFolders;
    }

    if (data) {
      setCatalog(data);
      // Merge any extra keys in catalog data that aren't in folderList
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
    setCustomFolders(DEFAULT_FOLDERS);
    Storage.saveCatalogFolderList(DEFAULT_FOLDERS);
    setActiveFolder('salao');
    setShowRestoreConfirm(false);
  };

  if (!isOpen) return null;

  const currentMediaItems = catalog[activeFolder] || [];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0 || !activeFolder) return;

    let loaded = 0;
    const newItems: CatalogMedia[] = [];

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const urlData = evt.target?.result as string;
        const isVideo = file.type.startsWith('video/');

        newItems.push({
          id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          folder: activeFolder,
          url: urlData,
          title: file.name,
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
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDeleteItem = async (index: number) => {
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

  const lightboxMedia = lightboxIndex !== null ? currentMediaItems[lightboxIndex] : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600/30 text-purple-400 border border-purple-500/20">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">📸 Catálogo de Mídias & Fotos</h3>
              <p className="text-xs text-slate-400">Galeria de fotos e mídias do salão e clientes</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Folder Navigation Tabs */}
        <div className="flex items-center gap-2 p-3 bg-slate-950 border-b border-slate-800 overflow-x-auto">
          {customFolders.map(f => {
            const isActive = activeFolder === f.key;
            return (
              <div key={f.key} className="flex items-center shrink-0 bg-slate-900 rounded-xl border border-slate-800 p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setActiveFolder(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
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

                {/* Trash Icon Button to delete folder */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFolderToDelete(f.key);
                  }}
                  title={`Excluir pasta "${f.title}"`}
                  className="p-1.5 rounded-lg text-rose-400 hover:text-white hover:bg-rose-600 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}

          {/* Add Custom Folder Button */}
          {!showAddFolderInput ? (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowAddFolderInput(true)}
                className="bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold text-xs px-3 py-1.5 rounded-xl transition-all border border-purple-500/30 flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Criar Nova Pasta</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRestoreConfirm(true)}
                title="Restaurar pastas padrão do sistema"
                className="text-[10px] text-slate-400 hover:text-purple-300 underline font-semibold px-2 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restaurar Padrão</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 shrink-0 bg-slate-900 p-1 rounded-xl border border-purple-500/50">
              <input
                type="text"
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCustomFolder();
                  if (e.key === 'Escape') setShowAddFolderInput(false);
                }}
                placeholder="Nome da pasta..."
                className="bg-slate-950 px-2.5 py-1 text-xs text-white rounded-lg border border-slate-700 outline-none focus:border-purple-400 w-36"
              />
              <button
                type="button"
                onClick={handleAddCustomFolder}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded-lg"
              >
                OK
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewFolderName('');
                  setShowAddFolderInput(false);
                }}
                title="Cancelar criação da pasta"
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Action Subbar */}
        <div className="p-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 bg-slate-900/40">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <span>Pasta Atual:</span>
              <span className="text-white font-extrabold bg-purple-950/80 px-2.5 py-1 rounded-lg border border-purple-500/30">
                {customFolders.find(f => f.key === activeFolder)?.title || (activeFolder ? activeFolder : 'Nenhuma pasta selecionada')}
              </span>
            </span>

            {activeFolder && (
              <button
                type="button"
                onClick={() => setFolderToDelete(activeFolder)}
                className="bg-rose-950/80 hover:bg-rose-600 text-rose-200 hover:text-white font-bold text-xs px-2.5 py-1 rounded-lg border border-rose-500/40 transition-all flex items-center gap-1"
                title="Excluir esta pasta"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Esta Pasta</span>
              </button>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*,video/*"
            multiple
            className="hidden"
          />

          <button
            type="button"
            disabled={!activeFolder}
            onClick={() => fileInputRef.current?.click()}
            className={`font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 ${
              activeFolder
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Plus className="w-4 h-4" /> Anexar Foto/Vídeo
          </button>
        </div>

        {/* Gallery Grid */}
        <div className="flex-1 p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-slate-950">
          {currentMediaItems.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-500 text-xs space-y-2">
              <Folder className="w-8 h-8 mx-auto text-slate-700" />
              <div>
                {!activeFolder
                  ? 'Nenhuma pasta selecionada. Selecione ou crie uma pasta acima.'
                  : 'Nenhuma mídia anexada nesta pasta. Clique em "➕ Anexar Foto/Vídeo" para enviar!'}
              </div>
            </div>
          ) : (
            currentMediaItems.map((item, idx) => (
              <div
                key={item.id || idx}
                onClick={() => setLightboxIndex(idx)}
                className="group relative h-36 rounded-xl overflow-hidden border border-slate-800 bg-slate-900 hover:border-purple-500 transition-all cursor-pointer shadow-sm flex items-center justify-center"
              >
                {item.mediaType === 'video' ? (
                  <>
                    <video src={item.url} className="w-full h-full object-cover pointer-events-none" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-xs text-white flex items-center justify-center">
                        <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                      </div>
                    </div>
                  </>
                ) : (
                  <img src={item.url} alt={item.title} className="w-full h-full object-cover pointer-events-none" />
                )}

                {/* Delete Media Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteItem(idx);
                  }}
                  title="Excluir Mídia"
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center text-xs font-bold shadow-md z-10 transition-transform active:scale-90"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

      </div>

      {/* DELETE FOLDER CONFIRMATION MODAL (React-based, works 100% in iFrame) */}
      {folderToDelete && (
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
      {showRestoreConfirm && (
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

      {/* LIGHTBOX PREVIEW MODAL */}
      {lightboxMedia && (
        <div className="fixed inset-0 z-60 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4">
          <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
              <Eye className="w-4 h-4" /> Visualizar Mídia
            </span>
            <button
              onClick={() => setLightboxIndex(null)}
              className="text-white/80 hover:text-white text-sm font-bold p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Media Content */}
          <div className="w-full max-w-3xl flex-1 flex items-center justify-center p-2 overflow-hidden my-2">
            {lightboxMedia.mediaType === 'video' ? (
              <video
                src={lightboxMedia.url}
                controls
                autoPlay
                className="max-w-full max-h-[70vh] rounded-xl object-contain shadow-2xl"
              />
            ) : (
              <img
                src={lightboxMedia.url}
                alt={lightboxMedia.title}
                className="max-w-full max-h-[70vh] rounded-xl object-contain shadow-2xl"
              />
            )}
          </div>

          {/* Lightbox Footer Actions */}
          <div className="w-full max-w-md flex items-center justify-center gap-4 border-t border-slate-800 pt-3">
            <button
              onClick={() => setLightboxIndex(null)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Deixar (Manter)
            </button>

            <button
              onClick={() => lightboxIndex !== null && handleDeleteItem(lightboxIndex)}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" /> Excluir Foto/Vídeo
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

