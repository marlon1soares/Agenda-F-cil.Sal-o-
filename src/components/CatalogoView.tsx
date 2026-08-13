import React, { useState, useEffect, useRef } from 'react';
import { CatalogMedia, CatalogFolder } from '../types';
import { Storage } from '../utils/storage';
import { Image as ImageIcon, Plus, Trash2, X, Play, CheckCircle2, Folder, Eye } from 'lucide-react';

interface CatalogoViewProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_FOLDERS: { key: string; title: string; icon: string }[] = [
  { key: 'salao', title: '💈 Pasta do Salão (Arquivos & Fotos)', icon: '💈' },
  { key: 'cliente', title: '👤 Pasta dos Clientes (Resultados & Fichas)', icon: '👤' },
  { key: 'portfolio', title: '✂️ Portfólio & Transformações', icon: '✂️' },
  { key: 'higiene', title: '🧴 Produtos & Higiene Pessoal', icon: '🧴' },
  { key: 'roupas', title: '👗 Roupas & Acessórios', icon: '👗' },
  { key: 'diversos', title: '📂 Outras Pastas & Diversos', icon: '📂' },
];

export const CatalogoView: React.FC<CatalogoViewProps> = ({ isOpen, onClose }) => {
  const [activeFolder, setActiveFolder] = useState<string>('salao');
  const [customFolders, setCustomFolders] = useState<{ key: string; title: string; icon: string }[]>(DEFAULT_FOLDERS);
  const [newFolderName, setNewFolderName] = useState('');
  const [showAddFolderInput, setShowAddFolderInput] = useState(false);

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
    if (data) {
      setCatalog(data);
      // Ensure all custom keys in data are added to folder tabs
      const keys = Object.keys(data);
      const existingKeys = new Set(DEFAULT_FOLDERS.map(f => f.key));
      const extraFolders = keys
        .filter(k => !existingKeys.has(k))
        .map(k => ({ key: k, title: `📁 ${k}`, icon: '📁' }));
      
      setCustomFolders([...DEFAULT_FOLDERS, ...extraFolders]);
    }
  };

  const handleAddCustomFolder = () => {
    if (!newFolderName.trim()) return;
    const key = newFolderName.trim().toLowerCase().replace(/\s+/g, '_');
    if (!customFolders.some(f => f.key === key)) {
      const newFolderObj = { key, title: `📁 ${newFolderName.trim()}`, icon: '📁' };
      const updatedFolders = [...customFolders, newFolderObj];
      setCustomFolders(updatedFolders);
      setActiveFolder(key);
      setCatalog(prev => ({ ...prev, [key]: [] }));
    } else {
      setActiveFolder(key);
    }
    setNewFolderName('');
    setShowAddFolderInput(false);
  };

  if (!isOpen) return null;

  const currentMediaItems = catalog[activeFolder] || [];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

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
              <h3 className="text-sm sm:text-base font-bold text-white">📁 Central de Pastas & Arquivos (Salão, Clientes e Mais)</h3>
              <p className="text-xs text-slate-400">Pastas separadas para armazenar mídias, fotos e documentos do salão e de clientes</p>
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
          {customFolders.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFolder(f.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 border ${
                activeFolder === f.key
                  ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>{f.title}</span>
              <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded-full text-slate-300 font-mono">
                {(catalog[f.key] || []).length}
              </span>
            </button>
          ))}

          {/* Add Custom Folder Button */}
          {!showAddFolderInput ? (
            <button
              onClick={() => setShowAddFolderInput(true)}
              className="bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold text-xs px-3 py-1.5 rounded-xl transition-all border border-purple-500/30 flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Criar Nova Pasta</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 shrink-0 bg-slate-900 p-1 rounded-xl border border-purple-500/50">
              <input
                type="text"
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomFolder()}
                placeholder="Nome da pasta..."
                className="bg-slate-950 px-2.5 py-1 text-xs text-white rounded-lg border border-slate-700 outline-none focus:border-purple-400 w-36"
              />
              <button
                onClick={handleAddCustomFolder}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded-lg"
              >
                OK
              </button>
              <button
                onClick={() => setShowAddFolderInput(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Action Subbar */}
        <div className="p-3.5 flex items-center justify-between border-b border-slate-800/60 bg-slate-900/40">
          <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
            <span>Pasta Atual:</span>
            <span className="text-white font-extrabold bg-purple-950/80 px-2.5 py-1 rounded-lg border border-purple-500/30">
              {customFolders.find(f => f.key === activeFolder)?.title || activeFolder}
            </span>
          </span>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*,video/*"
            multiple
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Anexar Foto/Vídeo
          </button>
        </div>

        {/* Gallery Grid */}
        <div className="flex-1 p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-slate-950">
          {currentMediaItems.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-500 text-xs space-y-2">
              <Folder className="w-8 h-8 mx-auto text-slate-700" />
              <div>Nenhuma mídia anexada nesta pasta. Clique em "➕ Anexar Foto/Vídeo" para enviar!</div>
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

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteItem(idx);
                  }}
                  title="Excluir Mídia"
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-rose-600/90 text-white hover:bg-rose-600 flex items-center justify-center text-xs font-bold shadow-xs z-10"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

      </div>

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
