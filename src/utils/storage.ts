import { 
  SalonConfig, Transaction, Appointment, Professional, ServiceItem, ClientRecord, 
  CatalogMedia, CatalogFolder, AdminCredentials, SalonApp, AdminPaymentConfig,
  ChatMessage, SystemBroadcastNotice, LivePresenceUser, EmployeeFechamentoRecord,
  CaixaFechamentoCiclo, PaymentMethod
} from '../types';
import { DEFAULT_CONFIG, DEFAULT_PROFESSIONALS, DEFAULT_SERVICES, DEFAULT_CLIENTS, INITIAL_TRANSACTIONS, INITIAL_APPOINTMENTS, INITIAL_CATALOG, DEFAULT_SALON_APPS } from '../data/mockData';
import { DEFAULT_SCHEDULE_CONFIG } from './schedule';
import { syncEngine } from './syncEngine';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

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
  getConfig(salonId?: string): SalonConfig {
    const effectiveSalonId = salonId || safeGetItem('salao_active_id');
    if (effectiveSalonId) {
      // 1. Check specific salon config in localStorage
      const specific = safeGetItem(`salaoConfig_${effectiveSalonId}`);
      if (specific) {
        try {
          const parsed = JSON.parse(specific);
          if (parsed && parsed.nomeSalao) {
            if (!parsed.scheduleConfig) {
              parsed.scheduleConfig = DEFAULT_SCHEDULE_CONFIG;
            }
            return parsed;
          }
        } catch {}
      }
      // 2. Check in salaoAppsList
      const salon = this.getSalons().find(s => s.id === effectiveSalonId);
      if (salon && salon.config) {
        if (!salon.config.scheduleConfig) {
          salon.config.scheduleConfig = DEFAULT_SCHEDULE_CONFIG;
        }
        return salon.config;
      }
    }
    const saved = safeGetItem('salaoConfig');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && !parsed.scheduleConfig) {
          parsed.scheduleConfig = DEFAULT_SCHEDULE_CONFIG;
        }
        return parsed;
      } catch {}
    }
    return DEFAULT_CONFIG;
  },
  saveConfig(config: SalonConfig, salonId?: string) {
    const effectiveSalonId = salonId || safeGetItem('salao_active_id') || 'salon-parcas';

    // 1. Global config fallback (only for salon-parcas)
    if (effectiveSalonId === 'salon-parcas') {
      safeSetItem('salaoConfig', JSON.stringify(config));
    }

    // 2. Dedicated storage key for the individual salon
    if (effectiveSalonId) {
      safeSetItem(`salaoConfig_${effectiveSalonId}`, JSON.stringify(config));
    }

    // 3. Update the specific salon in salaoAppsList
    const currentSalons = this.getSalons();
    const updatedSalons = currentSalons.map(s => {
      if (s.id === effectiveSalonId) {
        return {
          ...s,
          name: config.nomeSalao || s.name,
          config: config
        };
      }
      return s;
    });

    safeSetItem('salaoAppsList', JSON.stringify(updatedSalons));

    // 4. Push updates to syncEngine with immediate persistence (Firestore + SSE)
    syncEngine.pushUpdateImmediate({ 
      salonId: effectiveSalonId,
      salons: updatedSalons,
      salonData: {
        [effectiveSalonId]: { config }
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('salao_sync_data', { 
        detail: { key: 'salaoConfig', salonId: effectiveSalonId, config, salons: updatedSalons } 
      }));
    }
  },

  getTransactions(salonId?: string): Transaction[] {
    const effectiveSalonId = salonId || safeGetItem('salao_active_id') || 'salon-parcas';
    // Helper to ensure commissions are correctly distributed across all configured percentages (e.g. 70% and 30%)
    const sanitizeTransactions = (txList: Transaction[]): Transaction[] => {
      const cfg = Storage.getConfig(effectiveSalonId);
      if (!cfg.profs || cfg.profs.length === 0) return txList;
      return txList.map(t => {
        const net = Number(t.netAmount ?? t.grossAmount ?? 0);
        let comms = t.commissions ? [...t.commissions] : [];
        let modified = false;

        // Ensure every configured prof is present and has proper share of netAmount
        cfg.profs.forEach(p => {
          const existing = comms.find(c => c.professionalName.toLowerCase() === p.nome.toLowerCase());
          if (!existing) {
            comms.push({
              professionalId: p.id || `prof-${p.nome}`,
              professionalName: p.nome,
              percentage: p.porc,
              amount: Number((net * (p.porc / 100)).toFixed(2))
            });
            modified = true;
          } else if ((!existing.amount || existing.amount === 0) && p.porc > 0 && net > 0) {
            existing.amount = Number((net * (p.porc / 100)).toFixed(2));
            existing.percentage = p.porc;
            modified = true;
          }
        });

        return modified ? { ...t, commissions: comms } : t;
      });
    };

    // 1. Dedicated partitioned transactions for this salon
    const specific = safeGetItem(`salaoLancamentos_${effectiveSalonId}`);
    if (specific) {
      try {
        return sanitizeTransactions(JSON.parse(specific));
      } catch {}
    }
    // 2. Legacy fallback
    const saved = safeGetItem('salaoLancamentos');
    if (saved) {
      try {
        const all: Transaction[] = JSON.parse(saved);
        const filtered = all.filter(t => t.salonId === effectiveSalonId);
        if (filtered.length > 0) {
          const sanitized = sanitizeTransactions(filtered);
          safeSetItem(`salaoLancamentos_${effectiveSalonId}`, JSON.stringify(sanitized));
          return sanitized;
        }
        if (effectiveSalonId === 'salon-parcas') {
          const unassigned = all.filter(t => !t.salonId);
          if (unassigned.length > 0) {
            const sanitized = sanitizeTransactions(unassigned);
            safeSetItem(`salaoLancamentos_${effectiveSalonId}`, JSON.stringify(sanitized));
            return sanitized;
          }
          return sanitizeTransactions(all);
        }
      } catch {}
    }
    if (effectiveSalonId === 'salon-parcas') {
      return sanitizeTransactions(INITIAL_TRANSACTIONS);
    }
    return [];
  },
  saveTransactions(transactions: Transaction[], salonId?: string) {
    const effectiveSalonId = salonId || safeGetItem('salao_active_id') || 'salon-parcas';
    const tagged = transactions.map(t => ({ ...t, salonId: effectiveSalonId }));
    safeSetItem(`salaoLancamentos_${effectiveSalonId}`, JSON.stringify(tagged));

    // Update global list safely by keeping other salons' data 100% intact
    const saved = safeGetItem('salaoLancamentos');
    let all: Transaction[] = saved ? JSON.parse(saved) : [];
    const others = all.filter(t => t.salonId && t.salonId !== effectiveSalonId);
    safeSetItem('salaoLancamentos', JSON.stringify([...tagged, ...others]));

    syncEngine.pushUpdate({ 
      transactions: tagged, 
      salonId: effectiveSalonId,
      salonData: {
        [effectiveSalonId]: { transactions: tagged }
      }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoLancamentos', salonId: effectiveSalonId } }));
    }
  },

  getCaixaFechamentos(salonId?: string): CaixaFechamentoCiclo[] {
    const saved = safeGetItem('salao_fechamentos_caixa');
    let list: CaixaFechamentoCiclo[] = saved ? JSON.parse(saved) : [];
    if (salonId) {
      const specificSaved = safeGetItem(`salao_fechamentos_caixa_${salonId}`);
      if (specificSaved) {
        try {
          const specificList: CaixaFechamentoCiclo[] = JSON.parse(specificSaved);
          const map = new Map<string, CaixaFechamentoCiclo>();
          list.forEach(item => map.set(item.id, item));
          specificList.forEach(item => map.set(item.id, item));
          list = Array.from(map.values());
        } catch {}
      }
      return list.filter(item => !item.salonId || item.salonId === salonId);
    }
    return list;
  },

  saveCaixaFechamento(ciclo: CaixaFechamentoCiclo): CaixaFechamentoCiclo[] {
    const current = this.getCaixaFechamentos();
    const filtered = current.filter(c => c.id !== ciclo.id);
    const updated = [ciclo, ...filtered];
    
    safeSetItem('salao_fechamentos_caixa', JSON.stringify(updated));
    if (ciclo.salonId) {
      const salonList = updated.filter(c => c.salonId === ciclo.salonId);
      safeSetItem(`salao_fechamentos_caixa_${ciclo.salonId}`, JSON.stringify(salonList));
    }

    // Direct Firestore write for permanent cloud persistence
    if (db) {
      try {
        setDoc(doc(db, 'caixa_fechamentos', ciclo.id), ciclo, { merge: true }).catch(err => {
          console.warn('[Storage] Firestore saveCaixaFechamento error:', err);
        });
      } catch (err) {
        console.warn('[Storage] Error saving ciclo to Firestore:', err);
      }
    }

    // Push via syncEngine for cross-device broadcast
    syncEngine.pushUpdateImmediate({ 
      caixaFechamentos: updated,
      salonId: ciclo.salonId,
      salonData: ciclo.salonId ? {
        [ciclo.salonId]: { caixaFechamentos: updated.filter(c => c.salonId === ciclo.salonId) }
      } : undefined
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'caixaFechamentos', ciclo, salonId: ciclo.salonId } }));
    }
    return updated;
  },

  getAppointments(salonId?: string): Record<string, Record<string, Appointment>> {
    const effectiveSalonId = salonId || safeGetItem('salao_active_id') || 'salon-parcas';
    const specific = safeGetItem(`salaoAgenda_${effectiveSalonId}`);
    if (specific) {
      try {
        return JSON.parse(specific);
      } catch {}
    }
    if (effectiveSalonId === 'salon-parcas') {
      const saved = safeGetItem('salaoAgenda');
      return saved ? JSON.parse(saved) : INITIAL_APPOINTMENTS;
    }
    return {};
  },
  saveAppointments(agenda: Record<string, Record<string, Appointment>>, salonId?: string) {
    const effectiveSalonId = salonId || safeGetItem('salao_active_id') || 'salon-parcas';
    safeSetItem(`salaoAgenda_${effectiveSalonId}`, JSON.stringify(agenda));
    if (effectiveSalonId === 'salon-parcas') {
      safeSetItem('salaoAgenda', JSON.stringify(agenda));
    }
    syncEngine.pushUpdateImmediate({ 
      appointments: agenda, 
      salonId: effectiveSalonId,
      salonData: {
        [effectiveSalonId]: { appointments: agenda }
      }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoAgenda', salonId: effectiveSalonId } }));
    }
  },
  addAppointment(date: string, timeSlot: string, ap: Appointment, salonId?: string): Record<string, Record<string, Appointment>> {
    const effectiveSalonId = salonId || safeGetItem('salao_active_id') || 'salon-parcas';
    const current = this.getAppointments(effectiveSalonId);
    const updated = { ...current };
    if (!updated[date]) updated[date] = {};
    updated[date][timeSlot] = { ...ap, salonId: effectiveSalonId };
    this.saveAppointments(updated, effectiveSalonId);
    return updated;
  },

  getTimeAdjustments(salonId?: string): Record<string, number> {
    const effectiveSalonId = salonId || safeGetItem('salao_active_id') || 'salon-parcas';
    const specific = safeGetItem(`salaoAjustesHorarios_${effectiveSalonId}`);
    if (specific) {
      try {
        return JSON.parse(specific);
      } catch {}
    }
    if (effectiveSalonId === 'salon-parcas') {
      const saved = safeGetItem('salaoAjustesHorarios');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  },
  saveTimeAdjustments(adjustments: Record<string, number>, salonId?: string) {
    const effectiveSalonId = salonId || safeGetItem('salao_active_id') || 'salon-parcas';
    safeSetItem(`salaoAjustesHorarios_${effectiveSalonId}`, JSON.stringify(adjustments));
    if (effectiveSalonId === 'salon-parcas') {
      safeSetItem('salaoAjustesHorarios', JSON.stringify(adjustments));
    }
    syncEngine.pushUpdate({ 
      timeAdjustments: adjustments, 
      salonId: effectiveSalonId,
      salonData: {
        [effectiveSalonId]: { timeAdjustments: adjustments }
      }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoAjustesHorarios', salonId: effectiveSalonId } }));
    }
  },

  getProfessionals(salonId?: string): Professional[] {
    const effectiveSalonId = salonId || safeGetItem('salao_active_id') || 'salon-parcas';
    try {
      const specific = safeGetItem(`salaoProfissionais_${effectiveSalonId}`);
      if (specific) {
        const parsed = JSON.parse(specific);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p: any, idx: number) => ({
            id: p.id || `prof-${idx + 1}`,
            name: p.name || p.nome || `Profissional ${idx + 1}`,
            role: p.role || 'Cabeleireiro(a)',
            commissionPercent: typeof p.commissionPercent === 'number' ? p.commissionPercent : (typeof p.porc === 'number' ? p.porc : 50),
            phone: p.phone || '',
            cpf: p.cpf || undefined,
            active: p.active !== false
          }));
        }
      }

      // Check salon config profs
      const salon = this.getSalons().find(s => s.id === effectiveSalonId);
      if (salon && salon.config && Array.isArray(salon.config.profs) && salon.config.profs.length > 0) {
        return salon.config.profs.map((p: any, idx: number) => ({
          id: p.id || `prof-${idx + 1}`,
          name: p.nome || p.name || `Profissional ${idx + 1}`,
          role: 'Cabeleireiro(a)',
          commissionPercent: typeof p.porc === 'number' ? p.porc : 50,
          phone: '',
          active: true
        }));
      }

      if (effectiveSalonId === 'salon-parcas') {
        const saved = safeGetItem('salaoProfissionais');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
        return DEFAULT_PROFESSIONALS;
      }
    } catch (e) {
      console.error("Error loading salaoProfissionais:", e);
    }
    return [];
  },
  saveProfessionals(profs: Professional[], salonId?: string) {
    const effectiveSalonId = salonId || safeGetItem('salao_active_id') || 'salon-parcas';
    safeSetItem(`salaoProfissionais_${effectiveSalonId}`, JSON.stringify(profs));
    if (effectiveSalonId === 'salon-parcas') {
      safeSetItem('salaoProfissionais', JSON.stringify(profs));
    }

    // Sync to salon config profs
    const currentSalons = this.getSalons();
    const updatedSalons = currentSalons.map(s => {
      if (s.id === effectiveSalonId) {
        return {
          ...s,
          config: {
            ...s.config,
            profs: profs.map(p => ({ id: p.id, nome: p.name, porc: p.commissionPercent }))
          }
        };
      }
      return s;
    });
    this.saveSalons(updatedSalons);

    syncEngine.pushUpdate({ 
      professionals: profs, 
      salonId: effectiveSalonId,
      salonData: {
        [effectiveSalonId]: { professionals: profs }
      }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoProfissionais', salonId: effectiveSalonId } }));
    }
  },

  getServices(salonId?: string): ServiceItem[] {
    const effectiveSalonId = salonId || safeGetItem('salao_active_id') || 'salon-parcas';
    const specific = safeGetItem(`salaoServicos_${effectiveSalonId}`);
    if (specific) {
      try {
        return JSON.parse(specific);
      } catch {}
    }
    if (effectiveSalonId === 'salon-parcas') {
      const saved = safeGetItem('salaoServicos');
      return saved ? JSON.parse(saved) : DEFAULT_SERVICES;
    }
    return DEFAULT_SERVICES;
  },
  saveServices(services: ServiceItem[], salonId?: string) {
    const effectiveSalonId = salonId || safeGetItem('salao_active_id') || 'salon-parcas';
    safeSetItem(`salaoServicos_${effectiveSalonId}`, JSON.stringify(services));
    if (effectiveSalonId === 'salon-parcas') {
      safeSetItem('salaoServicos', JSON.stringify(services));
    }
    syncEngine.pushUpdate({ 
      services, 
      salonId: effectiveSalonId,
      salonData: {
        [effectiveSalonId]: { services }
      }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoServicos', salonId: effectiveSalonId } }));
    }
  },

  getClients(salonId?: string): ClientRecord[] {
    const effectiveSalonId = salonId || safeGetItem('salao_active_id') || 'salon-parcas';
    const specific = safeGetItem(`salaoClientes_${effectiveSalonId}`);
    if (specific) {
      try {
        return JSON.parse(specific);
      } catch {}
    }
    if (effectiveSalonId === 'salon-parcas') {
      const saved = safeGetItem('salaoClientes');
      return saved ? JSON.parse(saved) : DEFAULT_CLIENTS;
    }
    return [];
  },
  saveClients(clients: ClientRecord[], salonId?: string) {
    const effectiveSalonId = salonId || safeGetItem('salao_active_id') || 'salon-parcas';
    safeSetItem(`salaoClientes_${effectiveSalonId}`, JSON.stringify(clients));
    if (effectiveSalonId === 'salon-parcas') {
      safeSetItem('salaoClientes', JSON.stringify(clients));
    }
    syncEngine.pushUpdate({ 
      clients, 
      salonId: effectiveSalonId,
      salonData: {
        [effectiveSalonId]: { clients }
      }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoClientes', salonId: effectiveSalonId } }));
    }
  },

  getFechamentos(salonId?: string): EmployeeFechamentoRecord[] {
    const effectiveSalonId = salonId || safeGetItem('salao_active_id') || 'salon-parcas';
    const specific = safeGetItem(`salaoFechamentos_${effectiveSalonId}`);
    if (specific) {
      try {
        return JSON.parse(specific);
      } catch {}
    }
    const saved = safeGetItem('salaoFechamentos');
    if (!saved) return [];
    try {
      const all: EmployeeFechamentoRecord[] = JSON.parse(saved);
      return all.filter(r => !r.salonId || r.salonId === effectiveSalonId);
    } catch {
      return [];
    }
  },
  saveFechamentos(records: EmployeeFechamentoRecord[], salonId?: string) {
    const effectiveSalonId = salonId || safeGetItem('salao_active_id') || 'salon-parcas';
    const tagged = records.map(r => ({ ...r, salonId: r.salonId || effectiveSalonId }));
    safeSetItem(`salaoFechamentos_${effectiveSalonId}`, JSON.stringify(tagged));

    // Update global list safely preserving other salons
    const allRaw = safeGetItem('salaoFechamentos');
    let allList: EmployeeFechamentoRecord[] = allRaw ? JSON.parse(allRaw) : [];
    const others = allList.filter(r => r.salonId && r.salonId !== effectiveSalonId);
    safeSetItem('salaoFechamentos', JSON.stringify([...tagged, ...others]));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoFechamentos', salonId: effectiveSalonId } }));
    }
  },

  async getCatalog(): Promise<Record<CatalogFolder, CatalogMedia[]>> {
    let data = await getMediaFromIDB('salaoCatalogo', null);
    if (!data) {
      const backup = safeGetItem('salaoCatalogo_backup');
      if (backup) {
        try {
          data = JSON.parse(backup);
        } catch {}
      }
    }
    return data || INITIAL_CATALOG;
  },
  async saveCatalog(catalog: Record<CatalogFolder, CatalogMedia[]>): Promise<boolean> {
    const ok = await saveMediaToIDB('salaoCatalogo', catalog);
    try {
      safeSetItem('salaoCatalogo_backup', JSON.stringify(catalog));
    } catch {}
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
      chavePix: '11973395723',
      nomeBeneficiario: 'Agenda+Fácil.Salão Oficial',
      bancoOuProcessador: 'Mercado Pago (Ag: 0001 / CC: 7731871243-4)',
      cartaoContaDestino: 'Agência:0001/Conta:7731871243-4',
      instrucoesPagamento: 'O valor do cartão ou Pix é creditado diretamente na conta Mercado Pago (Ag: 0001 / Conta: 7731871243-4) do Administrador.',
      productionUrl: 'https://agendamaisfacil.vercel.app',
      precoPlano30Dias: 30.00,
      precoPlano90Dias: 90.00,
      linkMercadoPago30: 'https://mpago.la/138bXFn',
      linkMercadoPago90: 'https://mpago.la/29DGt6q',
      precoPlano180Dias: 135.00,
      precoPlano365Dias: 240.00,
      diasGratuitos: 7,
      habilitarPlanoGratuito: true,
      webhookSecret: 'ae043f22ecf5be4ebb36625d10f92b6ae689578cde0152721c211351fc73a241',
      webhookUrl: 'https://agendamaisfacil.vercel.app/api/webhook/mercadopago',
      gatewayProvider: 'mercadopago',
      mercadopagoPublicKey: 'APP_USR-43be1eb0-8bed-4707-9bdb-91183e3192b2',
      mercadopagoAccessToken: 'APP_USR-5794522915444902-082217-76cb38c546c7ce4c69b66b82f4612629-1919398594',
      mercadopagoClientId: '5794522915444902',
      mercadopagoClientSecret: 'ziCC7svN4c0MnvYruGEGMFQ7tcGu5P0q',
      bacenPixClientId: '',
      bacenPixCertificateConfigured: false
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
          : 90.00,
        linkMercadoPago30: parsed.linkMercadoPago30 || 'https://mpago.la/138bXFn',
        linkMercadoPago90: parsed.linkMercadoPago90 || 'https://mpago.la/29DGt6q',
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
    
    // Normalize any legacy SALAO-100X codes to SALAO-X and guarantee per-salon config integrity
    let changed = false;
    list = list.map((s, idx) => {
      let currentConfig = s.config || DEFAULT_CONFIG;
      const specific = safeGetItem(`salaoConfig_${s.id}`);
      if (specific) {
        try {
          const parsed = JSON.parse(specific);
          if (parsed && parsed.nomeSalao) {
            currentConfig = parsed;
          }
        } catch {}
      }

      if (!currentConfig.scheduleConfig) {
        currentConfig = {
          ...currentConfig,
          scheduleConfig: DEFAULT_SCHEDULE_CONFIG
        };
      }

      let appCode = s.appCode;
      if (appCode) {
        const legacyMatch = appCode.match(/^SALAO-100(\d+)$/i);
        if (legacyMatch) {
          changed = true;
          appCode = `SALAO-${legacyMatch[1]}`;
        }
      } else {
        changed = true;
        appCode = `SALAO-${idx + 1}`;
      }

      return {
        ...s,
        config: currentConfig,
        appCode
      };
    });

    if (changed && saved) {
      safeSetItem('salaoAppsList', JSON.stringify(list));
    }
    return list;
  },
  saveSalons(salons: SalonApp[]) {
    safeSetItem('salaoAppsList', JSON.stringify(salons));
    salons.forEach(s => {
      if (s && s.id && s.config) {
        safeSetItem(`salaoConfig_${s.id}`, JSON.stringify(s.config));
      }
    });
    syncEngine.pushUpdateImmediate({ salons });
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

    try {
      localStorage.removeItem(`salaoConfig_${id}`);
      localStorage.removeItem(`salaoAgenda_${id}`);
      localStorage.removeItem(`salaoLancamentos_${id}`);
      localStorage.removeItem(`salao_fechamentos_caixa_${id}`);
      localStorage.removeItem(`salaoProfissionais_${id}`);
      localStorage.removeItem(`salaoServicos_${id}`);
      localStorage.removeItem(`salaoClientes_${id}`);
      localStorage.removeItem(`salaoAjustesHorarios_${id}`);
    } catch {}

    safeSetItem('salaoAppsList', JSON.stringify(updated));
    syncEngine.pushUpdateImmediate({ 
      salons: updated,
      deletedSalonId: id
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoAppsList', deletedSalonId: id } }));
    }
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
  },

  getUsedTrialCpfs(): string[] {
    const saved = safeGetItem('salaoUsedTrialCpfs');
    let list: string[] = saved ? JSON.parse(saved) : [];
    // Also include CPFs of existing salons with trial or active status
    const salons = this.getSalons();
    salons.forEach(s => {
      const clean = (s.ownerCpf || '').replace(/\D/g, '').trim();
      if (clean && clean.length >= 11 && !list.includes(clean)) {
        list.push(clean);
      }
    });
    return list;
  },

  saveUsedTrialCpfs(cpfs: string[]) {
    const cleanList = Array.from(new Set(cpfs.map(c => (c || '').replace(/\D/g, '').trim()).filter(c => c.length >= 11)));
    safeSetItem('salaoUsedTrialCpfs', JSON.stringify(cleanList));
    syncEngine.pushUpdate({ usedTrialCpfs: cleanList });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoUsedTrialCpfs' } }));
    }
  },

  recordTrialUsed(data: { cpf?: string; email?: string; phone?: string; rg?: string; salonName?: string }) {
    const clean = (data.cpf || '').replace(/\D/g, '').trim();
    if (!clean || clean.length < 11) return;
    const current = this.getUsedTrialCpfs();
    if (!current.includes(clean)) {
      current.push(clean);
      this.saveUsedTrialCpfs(current);
    }
  }
};

// Natural language command parser for POS
export function parsePOSCommand(
  cmd: string,
  userRole: 'admin' | 'salao',
  profsConfig: { id?: string; nome: string; porc: number }[],
  options?: {
    defaultClientName?: string;
    overridePaymentMethod?: PaymentMethod | 'plano_mensal';
    overrideCardFee?: number;
    specificProfessionalName?: string;
  }
): Transaction | null {
  if (!cmd || !cmd.trim()) return null;
  let text = cmd.trim();

  // Extract card/tax fee percentage if present (e.g. "cartão 5%" or "5%")
  let cardFeePercent = options?.overrideCardFee !== undefined ? options.overrideCardFee : 0;
  const taxMatch = text.match(/(\d+(?:[\.,]\d+)?)%/);
  if (taxMatch) {
    cardFeePercent = parseFloat(taxMatch[1].replace(',', '.'));
    text = text.replace(taxMatch[0], '').trim();
  }

  // Detect Payment method
  let paymentMethod: PaymentMethod = 'pix';
  if (options?.overridePaymentMethod) {
    paymentMethod = options.overridePaymentMethod as PaymentMethod;
  } else if (/\b(cartao|cartão|credito|crédito)\b/i.test(text)) {
    paymentMethod = 'cartao_credito';
  } else if (/\b(debito|débito)\b/i.test(text)) {
    paymentMethod = 'cartao_debito';
  } else if (/\b(dinheiro|especie|espécie)\b/i.test(text)) {
    paymentMethod = 'dinheiro';
  } else if (/\b(plano\s*mensal|plano)\b/i.test(text)) {
    paymentMethod = 'plano_mensal';
  } else if (/\b(pix)\b/i.test(text)) {
    paymentMethod = 'pix';
  }

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
  let description = text.replace(/\b(cartao|cartão|debito|débito|credito|crédito|pix|dinheiro|taxa|no|na)\b/gi, '').trim();
  if (!description) description = "Procedimento do Salão";

  // Check if monthly plan formula applies (1/8 calculation)
  const isMonthlyPlan = paymentMethod === 'plano_mensal' || /\b(plano\s*mensal|plano)\b/i.test(description) || /\b(plano\s*mensal|plano)\b/i.test(cmd);
  let grossAmount = typedValue;

  if (isMonthlyPlan && typedValue > 0) {
    grossAmount = typedValue / 8;
    if (!description.includes('(1/8')) {
      description += ` (1/8 de R$ ${typedValue.toFixed(2)})`;
    }
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const netAmount = grossAmount * (1 - (cardFeePercent / 100));

  // Distribute net value across configured percentages for salon and professionals (e.g., 70% and 30%)
  const commissions = profsConfig.map(p => {
    return {
      professionalId: p.id || `prof-${p.nome}`,
      professionalName: p.nome,
      percentage: p.porc,
      amount: Number((netAmount * (p.porc / 100)).toFixed(2))
    };
  });

  return {
    id: `tx-${Date.now()}`,
    date: dateStr,
    time: timeStr,
    description,
    grossAmount,
    cardFeePercent,
    netAmount,
    paymentMethod,
    clientName: options?.defaultClientName,
    commissions,
    createdBy: userRole
  };
}
