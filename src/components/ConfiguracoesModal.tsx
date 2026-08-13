import React, { useState, useRef } from 'react';
import { SalonConfig } from '../types';
import { THEMES } from '../data/mockData';
import { Settings, X, Upload, Palette, Building, Save, QrCode, CreditCard, DollarSign, Building2, Tag } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'visual' | 'pagamentos'>('visual');
  const [nomeSalao, setNomeSalao] = useState(config.nomeSalao);
  const [logoUrl, setLogoUrl] = useState(config.logoUrl);
  const [bgHeaderUrl, setBgHeaderUrl] = useState(config.bgHeaderUrl);
  const [temaKey, setTemaKey] = useState(config.temaKey || 'azul');
  const [corCustom, setCorCustom] = useState(config.corCustom || '#2563eb');

  // Payment Receiving Settings (unified for store, catalog and clients)
  const [chavePix, setChavePix] = useState(config.chavePix || '');
  const [tipoChavePix, setTipoChavePix] = useState<any>(config.tipoChavePix || 'email');
  const [titularPix, setTitularPix] = useState(config.titularPix || '');
  const [cidadePix, setCidadePix] = useState(config.cidadePix || 'São Paulo');

  // Bank Account for Credit Card Receipts / Deposit
  const [bancoCartao, setBancoCartao] = useState(config.bancoCartao || '');
  const [agenciaCartao, setAgenciaCartao] = useState(config.agenciaCartao || '');
  const [contaCartao, setContaCartao] = useState(config.contaCartao || '');
  const [tipoContaCartao, setTipoContaCartao] = useState<any>(config.tipoContaCartao || 'corrente');
  const [titularCartao, setTitularCartao] = useState(config.titularCartao || '');
  const [cpfCnpjCartao, setCpfCnpjCartao] = useState(config.cpfCnpjCartao || '');
  const [linkCartao, setLinkCartao] = useState(config.linkCartao || '');
  const [instrucoesPagamento, setInstrucoesPagamento] = useState(config.instrucoesPagamento || '');

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
      corCustom,
      chavePix: chavePix.trim(),
      tipoChavePix,
      titularPix: titularPix.trim(),
      cidadePix: cidadePix.trim(),
      bancoCartao: bancoCartao.trim(),
      agenciaCartao: agenciaCartao.trim(),
      contaCartao: contaCartao.trim(),
      tipoContaCartao,
      titularCartao: titularCartao.trim(),
      cpfCnpjCartao: cpfCnpjCartao.trim(),
      linkCartao: linkCartao.trim(),
      instrucoesPagamento: instrucoesPagamento.trim()
    };
    onSaveConfig(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-800 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-400" /> Configurações do Estabelecimento
            </h3>
            <p className="text-xs text-slate-400">Personalize a identidade visual e os dados de recebimento (Pix e Cartão)</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-4 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('visual')}
            className={`px-4 py-2 text-xs font-extrabold rounded-t-xl transition-all flex items-center gap-1.5 border-t border-x ${
              activeTab === 'visual'
                ? 'bg-slate-900 text-blue-400 border-slate-800'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Palette className="w-3.5 h-3.5" /> Identidade Visual & Nome
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pagamentos')}
            className={`px-4 py-2 text-xs font-extrabold rounded-t-xl transition-all flex items-center gap-1.5 border-t border-x ${
              activeTab === 'pagamentos'
                ? 'bg-slate-900 text-emerald-400 border-slate-800'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" /> 💳 Recebimento Pix & Cartão
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          
          {activeTab === 'visual' ? (
            <>
              {/* Salon Name */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">Nome do Salão / Barbearia</label>
                <input
                  type="text"
                  value={nomeSalao}
                  onChange={(e) => setNomeSalao(e.target.value)}
                  placeholder="Ex: Controle Salão dos Parças"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-blue-500 font-medium text-xs"
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
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-blue-500 text-xs"
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
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-2 rounded-xl transition-colors flex items-center gap-1 shrink-0 border border-slate-700"
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
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-blue-500 text-xs"
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
                    className="bg-sky-700 hover:bg-sky-600 text-white font-bold px-3 py-2 rounded-xl transition-colors flex items-center gap-1 shrink-0"
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
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-blue-500 font-bold text-xs"
                >
                  {Object.values(THEMES).map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>

              {/* Custom Hex Color Picker */}
              <div>
                <label className="block font-bold text-amber-400 mb-1">🎨 Personalizar Cor Exata (Hex)</label>
                <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <input
                    type="color"
                    value={corCustom}
                    onChange={(e) => setCorCustom(e.target.value)}
                    className="w-10 h-8 rounded border-0 bg-transparent cursor-pointer"
                  />
                  <span className="text-xs text-slate-400 font-mono font-bold">{corCustom}</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Payment Section Note */}
              <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl text-emerald-200 text-xs leading-relaxed space-y-1">
                <p className="font-extrabold flex items-center gap-1.5 text-emerald-300">
                  <CreditCard className="w-4 h-4" /> Configuração Unificada de Pagamentos
                </p>
                <p className="text-[11px] text-slate-300">
                  A chave Pix e a conta bancária para compras no cartão configuradas aqui serão exibidas automaticamente para todos os seus clientes em todos os produtos do catálogo e nos agendamentos.
                </p>
              </div>

              {/* PIX SECTION */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-extrabold text-purple-300 flex items-center gap-1.5 text-xs">
                    <QrCode className="w-4 h-4" /> Chave Pix da Loja / Salão (Para todos os produtos)
                  </span>
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 font-mono px-2 py-0.5 rounded-full border border-purple-500/30">
                    Visível ao Cliente
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Tipo de Chave:</label>
                    <select
                      value={tipoChavePix}
                      onChange={(e) => setTipoChavePix(e.target.value)}
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
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Número / Chave Pix:</label>
                    <input
                      type="text"
                      value={chavePix}
                      onChange={(e) => setChavePix(e.target.value)}
                      placeholder="Ex: 11999998888 ou financeiro@loja.com"
                      className="w-full bg-slate-900 border border-slate-700 text-white font-mono rounded-xl px-3 py-2 text-xs focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Nome do Titular / Beneficiário Pix:</label>
                    <input
                      type="text"
                      value={titularPix}
                      onChange={(e) => setTitularPix(e.target.value)}
                      placeholder="Ex: Marlon Soares / Barbearia Ltda"
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Cidade da Conta Pix:</label>
                    <input
                      type="text"
                      value={cidadePix}
                      onChange={(e) => setCidadePix(e.target.value)}
                      placeholder="Ex: São Paulo"
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* CARD BANK ACCOUNT SECTION */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-sky-500/30 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-extrabold text-sky-300 flex items-center gap-1.5 text-xs">
                    <Building2 className="w-4 h-4" /> Conta Bancária para Receber Compras em Cartão de Crédito
                  </span>
                  <span className="text-[10px] bg-sky-500/20 text-sky-300 font-mono px-2 py-0.5 rounded-full border border-sky-500/30">
                    Depósito do Cartão
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Banco / Adquirente:</label>
                    <input
                      type="text"
                      value={bancoCartao}
                      onChange={(e) => setBancoCartao(e.target.value)}
                      placeholder="Ex: Nubank, Itaú, Stone, InfinitePay..."
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-sky-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Tipo de Conta:</label>
                    <select
                      value={tipoContaCartao}
                      onChange={(e) => setTipoContaCartao(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-2.5 py-2 text-xs focus:border-sky-500 outline-none"
                    >
                      <option value="corrente">Conta Corrente (PJ / PF)</option>
                      <option value="poupanca">Conta Poupança</option>
                      <option value="pagamento">Conta de Pagamento</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Agência:</label>
                    <input
                      type="text"
                      value={agenciaCartao}
                      onChange={(e) => setAgenciaCartao(e.target.value)}
                      placeholder="Ex: 0001"
                      className="w-full bg-slate-900 border border-slate-700 text-white font-mono rounded-xl px-3 py-2 text-xs focus:border-sky-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Número da Conta:</label>
                    <input
                      type="text"
                      value={contaCartao}
                      onChange={(e) => setContaCartao(e.target.value)}
                      placeholder="Ex: 1234567-8"
                      className="w-full bg-slate-900 border border-slate-700 text-white font-mono rounded-xl px-3 py-2 text-xs focus:border-sky-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Titular da Conta de Cartão:</label>
                    <input
                      type="text"
                      value={titularCartao}
                      onChange={(e) => setTitularCartao(e.target.value)}
                      placeholder="Nome completo ou Razão Social"
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-sky-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">CPF ou CNPJ do Titular:</label>
                    <input
                      type="text"
                      value={cpfCnpjCartao}
                      onChange={(e) => setCpfCnpjCartao(e.target.value)}
                      placeholder="Ex: 00.000.000/0001-00"
                      className="w-full bg-slate-900 border border-slate-700 text-white font-mono rounded-xl px-3 py-2 text-xs focus:border-sky-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Link de Pagamento no Cartão (Opcional):
                  </label>
                  <input
                    type="url"
                    value={linkCartao}
                    onChange={(e) => setLinkCartao(e.target.value)}
                    placeholder="https://mpago.la/... ou https://link.stone.com.br/..."
                    className="w-full bg-slate-900 border border-slate-700 text-white font-mono rounded-xl px-3 py-2 text-xs focus:border-sky-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Se preenchido, os clientes poderão clicar e pagar com cartão online diretamente pelo link.
                  </p>
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">Instruções de Pagamento aos Clientes:</label>
                <textarea
                  rows={2}
                  value={instrucoesPagamento}
                  onChange={(e) => setInstrucoesPagamento(e.target.value)}
                  placeholder="Ex: Aceitamos Pix imediato ou parcelamento no cartão em até 12x..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-emerald-500 text-xs resize-none"
                />
              </div>
            </>
          )}

          {/* Action button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-3 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> SALVAR TODAS AS ALTERAÇÕES
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

