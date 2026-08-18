import { 
  SalonConfig, Transaction, Appointment, Professional, ServiceItem, ClientRecord, 
  CatalogMedia, CatalogFolder, AdminCredentials, SalonApp, AdminPaymentConfig,
  ChatMessage, SystemBroadcastNotice, LivePresenceUser
} from '../types';
import { DEFAULT_CONFIG, DEFAULT_PROFESSIONALS, DEFAULT_SERVICES, DEFAULT_CLIENTS, INITIAL_TRANSACTIONS, INITIAL_APPOINTMENTS, INITIAL_CATALOG, DEFAULT_SALON_APPS } from '../data/mockData';
import { syncEngine } from './syncEngine';

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

// Safe storage helpers for Apple iOS Safari / Android WebViews (prevents incognito SecurityError crashes)
function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (e) {
    // ignore
  }
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch (e) {
    // ignore
  }
}

// LocalStorage Persistence Wrappers
export const Storage = {
  getConfig(): SalonConfig {
    const saved = safeGetItem('salaoConfig');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  },
  saveConfig(config: SalonConfig) {
    safeSetItem('salaoConfig', JSON.stringify(config));
    syncEngine.pushUpdate({ config });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoConfig' } }));
    }
  },

  getTransactions(): Transaction[] {
    const saved = safeGetItem('salaoLancamentos');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  },
  saveTransactions(transactions: Transaction[]) {
    safeSetItem('salaoLancamentos', JSON.stringify(transactions));
    syncEngine.pushUpdate({ transactions });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoLancamentos' } }));
    }
  },

  getAppointments(): Record<string, Record<string, Appointment>> {
    const saved = safeGetItem('salaoAgenda');
    return saved ? JSON.parse(saved) : INITIAL_APPOINTMENTS;
  },
  saveAppointments(agenda: Record<string, Record<string, Appointment>>) {
    safeSetItem('salaoAgenda', JSON.stringify(agenda));
    syncEngine.pushUpdate({ appointments: agenda });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoAgenda' } }));
    }
  },

  getTimeAdjustments(): Record<string, number> {
    const saved = safeGetItem('salaoAjustesHorarios');
    return saved ? JSON.parse(saved) : {};
  },
  saveTimeAdjustments(adjustments: Record<string, number>) {
    safeSetItem('salaoAjustesHorarios', JSON.stringify(adjustments));
    syncEngine.pushUpdate({ timeAdjustments: adjustments });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoAjustesHorarios' } }));
    }
  },

  getProfessionals(): Professional[] {
    const saved = safeGetItem('salaoProfissionais');
    return saved ? JSON.parse(saved) : DEFAULT_PROFESSIONALS;
  },
  saveProfessionals(profs: Professional[]) {
    safeSetItem('salaoProfissionais', JSON.stringify(profs));
    syncEngine.pushUpdate({ professionals: profs });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoProfissionais' } }));
    }
  },

  getServices(): ServiceItem[] {
    const saved = safeGetItem('salaoServicos');
    return saved ? JSON.parse(saved) : DEFAULT_SERVICES;
  },
  saveServices(services: ServiceItem[]) {
    safeSetItem('salaoServicos', JSON.stringify(services));
    syncEngine.pushUpdate({ services });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoServicos' } }));
    }
  },

  getClients(): ClientRecord[] {
    const saved = safeGetItem('salaoClientes');
    return saved ? JSON.parse(saved) : DEFAULT_CLIENTS;
  },
  saveClients(clients: ClientRecord[]) {
    safeSetItem('salaoClientes', JSON.stringify(clients));
    syncEngine.pushUpdate({ clients });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoClientes' } }));
    }
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

  getCatalogFolderList(): { key: string; title: string; icon: string }[] | null {
    const saved = safeGetItem('salaoCatalogFolders');
    return saved ? JSON.parse(saved) : null;
  },
  saveCatalogFolderList(folders: { key: string; title: string; icon: string }[]) {
    safeSetItem('salaoCatalogFolders', JSON.stringify(folders));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoCatalogFolders' } }));
    }
  },

  getAdminCredentials(): AdminCredentials {
    const defaultMaster: AdminCredentials = {
      cpf: '226.224.488-05',
      email: 'marlon1soares28@gmail.com',
      phone: '(11) 99999-9999',
      password: 'Ana1@@theo',
      registeredAt: '2026-01-01T00:00:00.000Z'
    };

    const saved = safeGetItem('salaoAdminCredentials');
    let result = defaultMaster;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        result = { ...defaultMaster, ...parsed };
        if (!result.password || result.password === 'admin') {
          result.password = 'Ana1@@theo';
        }
      } catch {
        result = defaultMaster;
      }
    }

    // Check if the list contains this admin with an active customized password
    const savedListRaw = safeGetItem('salaoAdminCredentialsList');
    if (savedListRaw) {
      try {
        const parsedList: AdminCredentials[] = JSON.parse(savedListRaw);
        if (Array.isArray(parsedList) && parsedList.length > 0) {
          const match = parsedList.find(c => 
            (c.cpf && result.cpf && c.cpf.replace(/\D/g, '') === result.cpf.replace(/\D/g, '')) ||
            (c.email && result.email && c.email.toLowerCase().trim() === result.email.toLowerCase().trim())
          );
          if (match && match.password && match.password !== 'admin') {
            result.password = match.password;
          }
        }
      } catch {}
    }

    return result;
  },
  getAdminCredentialsList(): AdminCredentials[] {
    const defaultMaster = this.getAdminCredentials();
    const defaultList: AdminCredentials[] = [
      { cpf: '226.224.488-05', email: 'marlon1soares28@gmail.com', phone: '(11) 99999-9999', password: 'Ana1@@theo', registeredAt: '2026-01-01T00:00:00.000Z' },
      { cpf: '309.287.638-54', email: 'marlon1soares28@gmail.com', phone: '(11) 99999-8888', password: 'Ana1@luna', registeredAt: '2026-01-01T00:00:00.000Z' },
      { cpf: '000.000.000-00', email: 'admin@salao.com', phone: '(11) 99999-9999', password: 'admin', registeredAt: '2026-01-01T00:00:00.000Z' },
      { cpf: '123.456.789-00', email: 'admin@salao.com', phone: '(11) 99999-9999', password: 'admin', registeredAt: '2026-01-01T00:00:00.000Z' }
    ];

    const savedList = safeGetItem('salaoAdminCredentialsList');
    if (savedList !== null) {
      try {
        const parsed = JSON.parse(savedList);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge with default list to ensure master CPFs are always present and upgrade stale 'admin' passwords
          const merged = parsed.map(c => {
            const digits = (c.cpf || '').replace(/\D/g, '');
            if (digits === '22622448805' && (!c.password || c.password === 'admin')) {
              return { ...c, password: 'Ana1@@theo' };
            }
            if (digits === '30928763854' && (!c.password || c.password === 'admin')) {
              return { ...c, password: 'Ana1@luna' };
            }
            return c;
          });

          for (const def of defaultList) {
            const defCpfDigits = def.cpf ? def.cpf.replace(/\D/g, '') : '';
            const exists = merged.some(c => {
              const cDigits = c.cpf ? c.cpf.replace(/\D/g, '') : '';
              return defCpfDigits && cDigits && cDigits === defCpfDigits;
            });
            if (!exists) {
              merged.push(def);
            }
          }
          return merged;
        }
      } catch {}
    }

    safeSetItem('salaoAdminCredentialsList', JSON.stringify(defaultList));
    return defaultList;
  },
  saveAdminCredentials(creds: AdminCredentials) {
    safeSetItem('salaoAdminCredentials', JSON.stringify(creds));
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem('salaoAdminCredentials', JSON.stringify(creds));
      }
    } catch {}

    const list = this.getAdminCredentialsList();
    const cleanCpf = creds.cpf ? creds.cpf.replace(/\D/g, '') : '';
    const cleanEmail = creds.email ? creds.email.toLowerCase().trim() : '';

    // Match strictly by CPF if CPF exists, otherwise by email
    const existingIndex = list.findIndex(c => {
      const cCpf = c.cpf ? c.cpf.replace(/\D/g, '') : '';
      const cEmail = c.email ? c.email.toLowerCase().trim() : '';
      if (cleanCpf && cCpf) {
        return cCpf === cleanCpf;
      }
      if (!cleanCpf && cleanEmail && cEmail) {
        return cEmail === cleanEmail;
      }
      return false;
    });

    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...creds };
    } else {
      list.push(creds);
    }

    safeSetItem('salaoAdminCredentialsList', JSON.stringify(list));
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem('salaoAdminCredentialsList', JSON.stringify(list));
      }
    } catch {}

    // Push to cloud sync engine so all cellphones, tablets, and devices update their credentials in real time
    syncEngine.pushUpdate({
      adminCredentials: creds,
      adminCredentialsList: list
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoAdminCredentials' } }));
    }
  },
  deleteAdminCredential(identifier: string): AdminCredentials[] {
    const list = this.getAdminCredentialsList();
    const cleanId = identifier.replace(/\D/g, '');
    const cleanRaw = identifier.toLowerCase().trim();

    const filtered = list.filter(c => {
      const cCpfDigits = c.cpf ? c.cpf.replace(/\D/g, '') : '';
      const cEmail = (c.email || '').toLowerCase().trim();
      if (cleanId && cCpfDigits) {
        return cCpfDigits !== cleanId;
      }
      if (!cleanId && cleanRaw && cEmail) {
        return cEmail !== cleanRaw;
      }
      return c.cpf !== identifier && c.email !== identifier;
    });

    safeSetItem('salaoAdminCredentialsList', JSON.stringify(filtered));
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem('salaoAdminCredentialsList', JSON.stringify(filtered));
      }
    } catch {}

    // If the main single cred was deleted, update it to the first available or default
    if (filtered.length > 0) {
      safeSetItem('salaoAdminCredentials', JSON.stringify(filtered[0]));
    } else {
      safeRemoveItem('salaoAdminCredentials');
    }

    syncEngine.pushUpdate({
      adminCredentialsList: filtered
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoAdminCredentials' } }));
    }
    return filtered;
  },

  getAdminPaymentConfig(): AdminPaymentConfig {
    const saved = safeGetItem('salaoAdminPaymentConfig');
    const defaults: AdminPaymentConfig = {
      chavePix: 'marlon1soares28@gmail.com',
      nomeBeneficiario: 'Agenda+Fácil.Salão Oficial',
      bancoOuProcessador: 'Mercado Pago / Pix Instantâneo',
      cartaoContaDestino: 'Conta Principal - Marlon Soares (MP-883921)',
      instrucoesPagamento: 'O valor do cartão ou Pix é creditado diretamente na conta cadastrada pelo Administrador.',
      productionUrl: 'https://agenda-f-cil-sal-o.vercel.app',
      precoPlano30Dias: 30.00,
      precoPlano90Dias: 75.00,
      precoPlano180Dias: 135.00,
      precoPlano365Dias: 240.00
    };
    if (!saved) return defaults;
    try {
      const parsed = JSON.parse(saved);
      const base30 = (parsed.precoPlano30Dias !== undefined && parsed.precoPlano30Dias !== null && !isNaN(Number(parsed.precoPlano30Dias)) && Number(parsed.precoPlano30Dias) > 0)
        ? Number(parsed.precoPlano30Dias)
        : 30.00;

      return {
        ...defaults,
        ...parsed,
        precoPlano30Dias: base30,
        precoPlano90Dias: (parsed.precoPlano90Dias !== undefined && parsed.precoPlano90Dias !== null && !isNaN(Number(parsed.precoPlano90Dias)) && Number(parsed.precoPlano90Dias) > 0)
          ? Number(parsed.precoPlano90Dias)
          : Number((base30 * 2.5).toFixed(2)),
        precoPlano180Dias: (parsed.precoPlano180Dias !== undefined && parsed.precoPlano180Dias !== null && !isNaN(Number(parsed.precoPlano180Dias)) && Number(parsed.precoPlano180Dias) > 0)
          ? Number(parsed.precoPlano180Dias)
          : Number((base30 * 4.5).toFixed(2)),
        precoPlano365Dias: (parsed.precoPlano365Dias !== undefined && parsed.precoPlano365Dias !== null && !isNaN(Number(parsed.precoPlano365Dias)) && Number(parsed.precoPlano365Dias) > 0)
          ? Number(parsed.precoPlano365Dias)
          : Number((base30 * 8).toFixed(2))
      };
    } catch {
      return defaults;
    }
  },
  saveAdminPaymentConfig(config: AdminPaymentConfig) {
    safeSetItem('salaoAdminPaymentConfig', JSON.stringify(config));
    syncEngine.pushUpdate({ adminPaymentConfig: config });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoAdminPaymentConfig' } }));
    }
  },

  getSalons(): SalonApp[] {
    const saved = safeGetItem('salaoAppsList');
    let list: SalonApp[] = saved ? JSON.parse(saved) : DEFAULT_SALON_APPS;
    
    // Normalize any legacy SALAO-100X codes to SALAO-X (e.g. SALAO-1, SALAO-2, ...)
    let changed = false;
    list = list.map((s, idx) => {
      if (s.appCode) {
        const legacyMatch = s.appCode.match(/^SALAO-100(\d+)$/i);
        if (legacyMatch) {
          changed = true;
          return { ...s, appCode: `SALAO-${legacyMatch[1]}` };
        }
      } else {
        changed = true;
        return { ...s, appCode: `SALAO-${idx + 1}` };
      }
      return s;
    });

    if (changed && saved) {
      safeSetItem('salaoAppsList', JSON.stringify(list));
    }
    return list;
  },
  saveSalons(salons: SalonApp[]) {
    safeSetItem('salaoAppsList', JSON.stringify(salons));
    syncEngine.pushUpdate({ salons });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoAppsList' } }));
    }
  },
  getNextSalonCode(): string {
    const list = this.getSalons();
    let maxNum = 0;
    list.forEach((s, idx) => {
      const code = s.appCode || '';
      const match = code.match(/(?:SALAO|SALÃO)[-_]?(\d+)/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n >= 1000 && n <= 1999) {
          const norm = n - 1000;
          if (norm > maxNum) maxNum = norm;
        } else if (n > maxNum) {
          maxNum = n;
        }
      }
    });
    if (maxNum === 0) {
      maxNum = list.length;
    }
    return `SALAO-${maxNum + 1}`;
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
  },

  getMessages(): ChatMessage[] {
    const saved = safeGetItem('salaoMessages');
    return saved ? JSON.parse(saved) : [];
  },
  saveMessages(messages: ChatMessage[]) {
    safeSetItem('salaoMessages', JSON.stringify(messages));
    syncEngine.pushUpdate({ messages });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoMessages' } }));
    }
  },
  addMessage(msg: ChatMessage) {
    const current = this.getMessages();
    const updated = [...current, msg];
    if (updated.length > 200) updated.splice(0, updated.length - 200);
    this.saveMessages(updated);
    // Also post to server endpoint to trigger SSE immediately
    try {
      fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, clientId: syncEngine.getClientId() })
      }).catch(() => {});
    } catch {}
    return updated;
  },

  getNotices(): SystemBroadcastNotice[] {
    const saved = safeGetItem('salaoNotices');
    return saved ? JSON.parse(saved) : [];
  },
  saveNotices(notices: SystemBroadcastNotice[]) {
    safeSetItem('salaoNotices', JSON.stringify(notices));
    syncEngine.pushUpdate({ notices });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoNotices' } }));
    }
  },
  broadcastNotice(notice: SystemBroadcastNotice) {
    const current = this.getNotices();
    const updated = [notice, ...current];
    if (updated.length > 50) updated.splice(50);
    this.saveNotices(updated);
    try {
      fetch('/api/notices/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notice, clientId: syncEngine.getClientId() })
      }).catch(() => {});
    } catch {}
    return updated;
  },

  getOnlineUsers(): LivePresenceUser[] {
    const saved = safeGetItem('salaoOnlineUsers');
    return saved ? JSON.parse(saved) : [];
  },
  saveOnlineUsers(users: LivePresenceUser[]) {
    safeSetItem('salaoOnlineUsers', JSON.stringify(users));
    syncEngine.pushUpdate({ onlineUsers: users });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoOnlineUsers' } }));
    }
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
