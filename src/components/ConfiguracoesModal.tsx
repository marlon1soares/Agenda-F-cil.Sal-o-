import React, { useState, useRef } from 'react';
import { SalonConfig } from '../types';
import { THEMES } from '../data/mockData';
import { Settings, X, Upload, Palette, Building, Save } from 'lucide-react';

interface ConfiguracoesModalProps {
  isOpen: boolean;
  config: SalonConfig;
  onClose: () => void;
  onSaveConfig: (cfg: SalonConfig) => void;
}

export const ConfiguracoesModal: React.FC<ConfiguracoesModalProps> = ({
  isOpen,
  config,
  onClose,
  onSaveConfig,
}) => {
  const [nomeSalao, setNomeSalao] = useState(config.nomeSalao);
  const [logoUrl, setLogoUrl] = useState(config.logoUrl);
  const [bgHeaderUrl, setBgHeaderUrl] = useState(config.bgHeaderUrl);
  const [temaKey, setTemaKey] = useState(config.temaKey || 'azul');
  const [corCustom, setCorCustom] = useState(config.corCustom || '#2563eb');

  const logoFileRef = useRef<HTMLInputElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => setLogoUrl(evt.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => setBgHeaderUrl(evt.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSelectPresetTheme = (key: string) => {
    setTemaKey(key);
    const preset = THEMES[key];
    if (preset) {
      setCorCustom(preset.headerBg);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SalonConfig = {
      ...config,
      nomeSalao: nomeSalao.trim() || 'Controle Salão dos Parças',
      logoUrl: logoUrl.trim(),
      bgHeaderUrl: bgHeaderUrl.trim(),
      temaKey,
      corCustom
    };
    onSaveConfig(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 w-full max-w-lg overflow-hidden p-6 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" /> Configurações Gerais do Salão
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Salon Name */}
          <div>
            <label className="block font-bold text-slate-300 mb-1">Nome do Salão / Barbearia</label>
            <input
              type="text"
              value={nomeSalao}
              onChange={(e) => setNomeSalao(e.target.value)}
              placeholder="Ex: Controle Salão dos Parças"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-950 text-white outline-none focus:ring-2 focus:ring-blue-500 font-medium text-xs"
            />
          </div>

          {/* Logo URL / File */}
          <div>
            <label className="block font-bold text-slate-300 mb-1">Imagem do Logo Central</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="URL da Imagem..."
                className="flex-1 px-3 py-2 rounded-lg border border-slate-700 bg-slate-950 text-white outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
              <input
                type="file"
                ref={logoFileRef}
                onChange={handleLogoUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => logoFileRef.current?.click()}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-2 rounded-lg transition-colors flex items-center gap-1 shrink-0"
              >
                <Upload className="w-3.5 h-3.5" /> Arquivo
              </button>
            </div>
          </div>

          {/* Header BG Banner */}
          <div>
            <label className="block font-bold text-sky-400 mb-1">📂 Imagem de Fundo do Cabeçalho</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={bgHeaderUrl}
                onChange={(e) => setBgHeaderUrl(e.target.value)}
                placeholder="URL da Imagem de fundo..."
                className="flex-1 px-3 py-2 rounded-lg border border-slate-700 bg-slate-950 text-white outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
              <input
                type="file"
                ref={bgFileRef}
                onChange={handleBgUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => bgFileRef.current?.click()}
                className="bg-sky-700 hover:bg-sky-600 text-white font-bold px-3 py-2 rounded-lg transition-colors flex items-center gap-1 shrink-0"
              >
                <Upload className="w-3.5 h-3.5" /> Arquivo
              </button>
            </div>
          </div>

          {/* Theme Presets */}
          <div>
            <label className="block font-bold text-slate-300 mb-1">Tema de Cores Padrão</label>
            <select
              value={temaKey}
              onChange={(e) => handleSelectPresetTheme(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-950 text-white outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs"
            >
              {Object.values(THEMES).map(t => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>

          {/* Custom Hex Color Picker */}
          <div>
            <label className="block font-bold text-amber-400 mb-1">🎨 Personalizar Cor Exata (Hex)</label>
            <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-lg border border-slate-800">
              <input
                type="color"
                value={corCustom}
                onChange={(e) => setCorCustom(e.target.value)}
                className="w-10 h-8 rounded border-0 bg-transparent cursor-pointer"
              />
              <span className="text-xs text-slate-400 font-mono">{corCustom}</span>
            </div>
          </div>

          {/* Action button */}
          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 mt-2"
          >
            <Save className="w-4 h-4" /> SALVAR ALTERAÇÕES
          </button>
        </form>

      </div>
    </div>
  );
};
