import { SalonConfig, Transaction, Appointment, Professional, ServiceItem, ClientRecord, CatalogMedia, CatalogFolder, AdminCredentials, SalonApp, AdminPaymentConfig } from '../types';
import { DEFAULT_CONFIG, DEFAULT_PROFESSIONALS, DEFAULT_SERVICES, DEFAULT_CLIENTS, INITIAL_TRANSACTIONS, INITIAL_APPOINTMENTS, INITIAL_CATALOG, DEFAULT_SALON_APPS } from '../data/mockData';

// IndexedDB for media storage (Photos & Videos without size limits)
const DB_NAME = 'SalaoFlutuanteDB';
const STORE_NAME = 'catalogoStore';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = (e: any) => resolve(e.target.result);
    req.onerror = (e: any) => reject(e.error);
  });
}

export async function getMediaFromIDB(key: string, defaultValue: any): Promise<any> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result !== undefined ? req.result : defaultValue);
      req.onerror = () => resolve(defaultValue);
    });
  } catch {
    return defaultValue;
  }
}

export async function saveMediaToIDB(key: string, value: any): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = (e: any) => reject(e.error);
    });
  } catch (e) {
    console.error('Error saving to IDB:', e);
    return false;
  }
}

export function getSalonSlug(name: string): string {
  if (!name) return 'salao';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// LocalStorage Persistence Wrappers
export const Storage = {
  getConfig(): SalonConfig {
    const saved = localStorage.getItem('salaoConfig');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  },
  saveConfig(config: SalonConfig) {
    localStorage.setItem('salaoConfig', JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoConfig' } }));
  },

  getTransactions(): Transaction[] {
    const saved = localStorage.getItem('salaoLancamentos');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  },
  saveTransactions(transactions: Transaction[]) {
    localStorage.setItem('salaoLancamentos', JSON.stringify(transactions));
    window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoLancamentos' } }));
  },

  getAppointments(): Record<string, Record<string, Appointment>> {
    const saved = localStorage.getItem('salaoAgenda');
    return saved ? JSON.parse(saved) : INITIAL_APPOINTMENTS;
  },
  saveAppointments(agenda: Record<string, Record<string, Appointment>>) {
    localStorage.setItem('salaoAgenda', JSON.stringify(agenda));
    window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoAgenda' } }));
  },

  getTimeAdjustments(): Record<string, number> {
    const saved = localStorage.getItem('salaoAjustesHorarios');
    return saved ? JSON.parse(saved) : {};
  },
  saveTimeAdjustments(adjustments: Record<string, number>) {
    localStorage.setItem('salaoAjustesHorarios', JSON.stringify(adjustments));
    window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoAjustesHorarios' } }));
  },

  getProfessionals(): Professional[] {
    const saved = localStorage.getItem('salaoProfissionais');
    return saved ? JSON.parse(saved) : DEFAULT_PROFESSIONALS;
  },
  saveProfessionals(profs: Professional[]) {
    localStorage.setItem('salaoProfissionais', JSON.stringify(profs));
    window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoProfissionais' } }));
  },

  getServices(): ServiceItem[] {
    const saved = localStorage.getItem('salaoServicos');
    return saved ? JSON.parse(saved) : DEFAULT_SERVICES;
  },
  saveServices(services: ServiceItem[]) {
    localStorage.setItem('salaoServicos', JSON.stringify(services));
    window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoServicos' } }));
  },

  getClients(): ClientRecord[] {
    const saved = localStorage.getItem('salaoClientes');
    return saved ? JSON.parse(saved) : DEFAULT_CLIENTS;
  },
  saveClients(clients: ClientRecord[]) {
    localStorage.setItem('salaoClientes', JSON.stringify(clients));
    window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoClientes' } }));
  },

  async getCatalog(): Promise<Record<CatalogFolder, CatalogMedia[]>> {
    const data = await getMediaFromIDB('salaoCatalogo', INITIAL_CATALOG);
    return data;
  },
  async saveCatalog(catalog: Record<CatalogFolder, CatalogMedia[]>): Promise<boolean> {
    const ok = await saveMediaToIDB('salaoCatalogo', catalog);
    window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoCatalogo' } }));
    return ok;
  },

  getAdminCredentials(): AdminCredentials {
    const saved = localStorage.getItem('salaoAdminCredentials');
    return saved ? JSON.parse(saved) : { email: 'admin@salao.com', phone: '(11) 99999-9999', password: '123456' };
  },
  saveAdminCredentials(creds: AdminCredentials) {
    localStorage.setItem('salaoAdminCredentials', JSON.stringify(creds));
    window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoAdminCredentials' } }));
  },

  getAdminPaymentConfig(): AdminPaymentConfig {
    const saved = localStorage.getItem('salaoAdminPaymentConfig');
    return saved ? JSON.parse(saved) : {
      chavePix: 'marlon1soares28@gmail.com',
      nomeBeneficiario: 'Agenda+Fácil.Salão Oficial',
      bancoOuProcessador: 'Mercado Pago / Pix Instantâneo',
      cartaoContaDestino: 'Conta Principal - Marlon Soares (MP-883921)',
      instrucoesPagamento: 'O valor do cartão ou Pix é creditado diretamente na conta cadastrada pelo Administrador.'
    };
  },
  saveAdminPaymentConfig(config: AdminPaymentConfig) {
    localStorage.setItem('salaoAdminPaymentConfig', JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoAdminPaymentConfig' } }));
  },

  getSalons(): SalonApp[] {
    const saved = localStorage.getItem('salaoAppsList');
    return saved ? JSON.parse(saved) : DEFAULT_SALON_APPS;
  },
  saveSalons(salons: SalonApp[]) {
    localStorage.setItem('salaoAppsList', JSON.stringify(salons));
    window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoAppsList' } }));
  },
  getSalonBySlugOrCode(query: string): SalonApp | undefined {
    if (!query) return undefined;
    const list = this.getSalons();
    const cleanQuery = query.toLowerCase().trim();
    return list.find(s => {
      const slugName = getSalonSlug(s.name);
      const slugConfigName = getSalonSlug(s.config.nomeSalao);
      const code = (s.appCode || '').toLowerCase();
      const id = (s.id || '').toLowerCase();
      return id === cleanQuery || code === cleanQuery || slugName === cleanQuery || slugConfigName === cleanQuery;
    });
  },
  addSalonApp(newSalon: SalonApp): SalonApp[] {
    const current = this.getSalons();
    const updated = [newSalon, ...current];
    this.saveSalons(updated);
    return updated;
  },
  deleteSalonApp(id: string): SalonApp[] {
    const current = this.getSalons();
    const updated = current.filter(s => s.id !== id);
    this.saveSalons(updated);
    return updated;
  }
};

// Natural language command parser for POS
export function parsePOSCommand(cmd: string, userRole: 'admin' | 'salao', profsConfig: { id?: string; nome: string; porc: number }[]): Transaction | null {
  if (!cmd || !cmd.trim()) return null;
  let text = cmd.trim();

  // Extract card/tax fee percentage if present (e.g. "cartão 5%" or "5%")
  let cardFeePercent = 0;
  const taxMatch = text.match(/(\d+(?:[\.,]\d+)?)%/);
  if (taxMatch) {
    cardFeePercent = parseFloat(taxMatch[1].replace(',', '.'));
    text = text.replace(taxMatch[0], '').trim();
  }

  // Detect Payment method
  let paymentMethod: any = 'pix';
  if (/\b(cartao|cartão|credito|crédito)\b/i.test(text)) paymentMethod = 'cartao_credito';
  else if (/\b(debito|débito)\b/i.test(text)) paymentMethod = 'cartao_debito';
  else if (/\b(dinheiro|especie|espécie)\b/i.test(text)) paymentMethod = 'dinheiro';
  else if (/\b(pix)\b/i.test(text)) paymentMethod = 'pix';

  // Extract numbers
  const numberMatches = text.match(/\b\d+(?:[\.,]\d+)?\b/g);
  let typedValue = 0;

  if (numberMatches) {
    const lastNum = numberMatches[numberMatches.length - 1];
    typedValue = parseFloat(lastNum.replace(',', '.'));
    const idx = text.lastIndexOf(lastNum);
    text = text.substring(0, idx).trim();
  }

  // Clean description
  let description = text.replace(/\b(cartao|cartão|debito|débito|credito|crédito|pix|taxa|no|na)\b/gi, '').trim();
  if (!description) description = "Procedimento do Salão";

  // Check if monthly plan formula applies (1/8 calculation)
  const isMonthlyPlan = /\b(plano|mensal)\b/i.test(description);
  let grossAmount = typedValue;

  if (isMonthlyPlan && typedValue > 0) {
    grossAmount = typedValue / 8;
    description += ` (1/8 de R$ ${typedValue.toFixed(2)})`;
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const netAmount = grossAmount * (1 - (cardFeePercent / 100));

  // Split commissions according to salon setup
  const commissions = profsConfig.map(p => ({
    professionalId: p.id || `prof-${p.nome}`,
    professionalName: p.nome,
    percentage: p.porc,
    amount: netAmount * (p.porc / 100)
  }));

  return {
    id: `tx-${Date.now()}`,
    date: dateStr,
    time: timeStr,
    description,
    grossAmount,
    cardFeePercent,
    netAmount,
    paymentMethod,
    commissions,
    createdBy: userRole
  };
}
