import { FullSyncState } from '../types/sync';
import { soundEffects } from './audio';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, collection, deleteDoc } from 'firebase/firestore';

function getSafeClientId(): string {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const stored = window.sessionStorage.getItem('salao_client_id');
      if (stored) return stored;
      const id = 'client_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
      try {
        window.sessionStorage.setItem('salao_client_id', id);
      } catch {
        // ignore
      }
      return id;
    }
  } catch (e) {
    // fallback if sessionStorage blocked
  }
  return 'client_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
}

const CLIENT_ID = getSafeClientId();

function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  return JSON.parse(JSON.stringify(obj));
}

class SyncEngine {
  private eventSource: EventSource | null = null;
  private isInitialized = false;
  private debounceTimer: any = null;
  private pendingUpdates: Partial<FullSyncState> = {};
  private isApplyingRemote = false;
  private presenceInterval: any = null;
  private unsubscribeFirestore: (() => void) | null = null;
  private unsubscribePresence: (() => void) | null = null;

  public getClientId(): string {
    return CLIENT_ID;
  }

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // 1. Initialize Firestore Real-time listener
    this.initFirestoreSync();

    // 2. Initial State Fetch from Local Server (fallback if running Node server)
    this.fetchServerState();

    // 3. Connect to Server-Sent Events for Real-time Streaming (fallback)
    this.connectSSE();

    // 4. Start Periodic Presence Heartbeat & Background Polling
    this.startPresenceHeartbeat();
    this.startBackupPolling();

    // 5. Send immediate presence on initialization
    this.broadcastCurrentPresence();

    // 6. Listen to window focus or online to re-sync
    try {
      window.addEventListener('online', () => {
        this.fetchServerState();
        this.connectSSE();
      });

      window.addEventListener('focus', () => {
        this.fetchServerState();
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.fetchServerState();
        }
      });
    } catch {
      // ignore
    }
  }

  private initFirestoreSync() {
    if (!db) {
      console.warn('[SyncEngine] Firestore db instance not ready.');
      return;
    }

    try {
      const globalDocRef = doc(db, 'system', 'global_sync_state');

      // Realtime listener for all database changes across all devices & Vercel
      this.unsubscribeFirestore = onSnapshot(globalDocRef, (snapshot) => {
        if (snapshot.exists()) {
          const remoteData = snapshot.data() as FullSyncState & { lastSenderId?: string };
          if (remoteData) {
            this.applyRemoteState(remoteData, remoteData.lastSenderId);
          }
        } else {
          // Document does not exist yet in Firestore - seed from current local state
          this.seedInitialFirestoreState(globalDocRef);
        }
      }, (error) => {
        console.warn('[SyncEngine] Firestore onSnapshot error:', error);
      });

      // Realtime presence listener
      try {
        const presenceCollRef = collection(db, 'presence');
        this.unsubscribePresence = onSnapshot(presenceCollRef, (snap) => {
          const now = Date.now();
          const activeUsers: any[] = [];
          snap.forEach((d) => {
            const user = d.data();
            // Active within last 45 seconds
            if (user && user.lastSeen && (now - user.lastSeen < 45000)) {
              activeUsers.push(user);
            }
          });
          if (activeUsers.length > 0) {
            try {
              localStorage.setItem('salaoOnlineUsers', JSON.stringify(activeUsers));
              window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { key: 'salaoOnlineUsers' } }));
            } catch {}
          }
        }, (err) => {
          console.warn('[SyncEngine] Presence onSnapshot error:', err);
        });
      } catch (err) {
        console.warn('[SyncEngine] Presence setup error:', err);
      }
    } catch (err) {
      console.warn('[SyncEngine] Error configuring Firestore listener:', err);
    }
  }

  private async seedInitialFirestoreState(docRef: any) {
    try {
      const getLocalOrFallback = (key: string) => {
        try {
          const raw = localStorage.getItem(key);
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      };

      const seedData: any = {
        lastSenderId: CLIENT_ID,
        lastUpdated: Date.now()
      };

      const salons = getLocalOrFallback('salaoAppsList');
      if (salons) seedData.salons = salons;

      const config = getLocalOrFallback('salaoConfig');
      if (config) seedData.config = config;

      const appointments = getLocalOrFallback('salaoAgenda');
      if (appointments) seedData.appointments = appointments;

      const transactions = getLocalOrFallback('salaoLancamentos');
      if (transactions) seedData.transactions = transactions;

      const adjustments = getLocalOrFallback('salaoAjustesHorarios');
      if (adjustments) seedData.timeAdjustments = adjustments;

      const profs = getLocalOrFallback('salaoProfissionais');
      if (profs) seedData.professionals = profs;

      const services = getLocalOrFallback('salaoServicos');
      if (services) seedData.services = services;

      const clients = getLocalOrFallback('salaoClientes');
      if (clients) seedData.clients = clients;

      const adminPay = getLocalOrFallback('salaoAdminPaymentConfig');
      if (adminPay) seedData.adminPaymentConfig = adminPay;

      const adminCreds = getLocalOrFallback('salaoAdminCredentials');
      if (adminCreds) seedData.adminCredentials = adminCreds;

      const adminList = getLocalOrFallback('salaoAdminCredentialsList');
      if (adminList) seedData.adminCredentialsList = adminList;

      await setDoc(docRef, sanitizeForFirestore(seedData), { merge: true });
    } catch (err) {
      console.warn('[SyncEngine] Failed to seed initial Firestore state:', err);
    }
  }

  public sendPresence(user: { id?: string; name: string; role: string; salonId?: string; salonName?: string; status?: string }) {
    if (typeof window === 'undefined') return;
    try {
      const payload = {
        id: user.id || CLIENT_ID,
        name: user.name || 'Convidado',
        role: user.role || 'cliente',
        salonId: user.salonId,
        salonName: user.salonName,
        status: user.status || 'online',
        lastSeen: Date.now()
      };

      // 1. Push to Firestore Presence
      if (db) {
        try {
          const userDocRef = doc(db, 'presence', payload.id);
          setDoc(userDocRef, sanitizeForFirestore(payload), { merge: true }).catch(() => {});
        } catch {}
      }

      // 2. Secondary fallback via local server
      fetch('/api/presence/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: payload })
      }).catch(() => {});
    } catch {}
  }

  public broadcastCurrentPresence() {
    try {
      const role = (typeof localStorage !== 'undefined' && localStorage.getItem('salao_active_role')) || 'cliente';
      const name = (typeof localStorage !== 'undefined' && (localStorage.getItem('salao_user_name') || localStorage.getItem('salao_cliente_name'))) || 'Usuário Online';
      const activeSalonId = (typeof localStorage !== 'undefined' && localStorage.getItem('salao_active_id')) || 'salon-parcas';
      this.sendPresence({ id: CLIENT_ID, name, role, salonId: activeSalonId });
    } catch {}
  }

  private startPresenceHeartbeat() {
    if (this.presenceInterval) clearInterval(this.presenceInterval);
    this.presenceInterval = setInterval(() => {
      this.broadcastCurrentPresence();
    }, 15000);
  }

  private startBackupPolling() {
    // Background polling fallback every 12 seconds in case SSE stream or snapshot was suspended
    setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        this.fetchServerState();
      }
    }, 12000);
  }

  public async fetchServerState(): Promise<FullSyncState | null> {
    try {
      const res = await fetch('/api/sync/state');
      if (!res.ok) return null;
      const data = await res.json();
      if (data.success && data.state) {
        this.applyRemoteState(data.state);
        return data.state;
      }
    } catch (e) {
      // serverless / static vercel environment without express API - expected
    }
    return null;
  }

  private connectSSE() {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {}
      this.eventSource = null;
    }

    try {
      const es = new EventSource('/api/sync/events');
      this.eventSource = es;

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'sync_update' && payload.state) {
            // Apply remote updates from another device/browser
            this.applyRemoteState(payload.state, payload.senderId);
          }
        } catch (err) {
          // ignore heartbeat parse errors
        }
      };

      es.onerror = () => {
        if (this.eventSource) {
          try {
            this.eventSource.close();
          } catch {}
            this.eventSource = null;
        }
        // Auto-reconnect after 8 seconds
        setTimeout(() => {
          this.connectSSE();
        }, 8000);
      };
    } catch (err) {
      // expected if deployed as static bundle on Vercel
    }
  }

  public applyRemoteState(state: Partial<FullSyncState>, senderId?: string) {
    if (!state) return;
    if (senderId && senderId === CLIENT_ID) return; // ignore our own echo

    this.isApplyingRemote = true;
    try {
      let appointmentsChanged = false;
      let messagesChanged = false;

      if (state.salons && Array.isArray(state.salons) && state.salons.length > 0) {
        try { 
          const localSalonsRaw = localStorage.getItem('salaoAppsList');
          const localSalons = localSalonsRaw ? JSON.parse(localSalonsRaw) : [];
          const salonMap = new Map<string, any>();
          if (Array.isArray(localSalons)) {
            localSalons.forEach((s: any) => { if (s && s.id) salonMap.set(s.id, s); });
          }
          state.salons.forEach((s: any) => {
            if (s && s.id) {
              const existing = salonMap.get(s.id);
              salonMap.set(s.id, existing ? { ...existing, ...s } : s);
            }
          });
          const mergedSalons = Array.from(salonMap.values());
          localStorage.setItem('salaoAppsList', JSON.stringify(mergedSalons));
          mergedSalons.forEach((s: any) => {
            if (s && s.id && s.config) {
              localStorage.setItem(`salaoConfig_${s.id}`, JSON.stringify(s.config));
            }
          });
        } catch {}
      }
      if (state.config && state.config.nomeSalao) {
        try { localStorage.setItem('salaoConfig', JSON.stringify(state.config)); } catch {}
      }
      if (state.appointments && typeof state.appointments === 'object') {
        appointmentsChanged = true;
        try {
          const localAgendaRaw = localStorage.getItem('salaoAgenda');
          const localAgenda = localAgendaRaw ? JSON.parse(localAgendaRaw) : {};
          const mergedAgenda = { ...localAgenda };
          Object.keys(state.appointments).forEach((dateKey) => {
            mergedAgenda[dateKey] = {
              ...(mergedAgenda[dateKey] || {}),
              ...state.appointments![dateKey]
            };
          });
          localStorage.setItem('salaoAgenda', JSON.stringify(mergedAgenda));
        } catch {}
      }
      if (state.transactions && Array.isArray(state.transactions)) {
        try {
          const localTxRaw = localStorage.getItem('salaoLancamentos');
          const localTx = localTxRaw ? JSON.parse(localTxRaw) : [];
          const txMap = new Map<string, any>();
          if (Array.isArray(localTx)) {
            localTx.forEach((t: any) => { if (t && t.id) txMap.set(t.id, t); });
          }
          state.transactions.forEach((t: any) => {
            if (t && t.id) {
              const existing = txMap.get(t.id);
              txMap.set(t.id, existing ? { ...existing, ...t } : t);
            }
          });
          localStorage.setItem('salaoLancamentos', JSON.stringify(Array.from(txMap.values())));
        } catch {}
      }
      if (state.timeAdjustments) {
        try { localStorage.setItem('salaoAjustesHorarios', JSON.stringify(state.timeAdjustments)); } catch {}
      }
      if (state.professionals && Array.isArray(state.professionals) && state.professionals.length > 0) {
        try { localStorage.setItem('salaoProfissionais', JSON.stringify(state.professionals)); } catch {}
      }
      if (state.services && Array.isArray(state.services) && state.services.length > 0) {
        try { localStorage.setItem('salaoServicos', JSON.stringify(state.services)); } catch {}
      }
      if (state.clients && Array.isArray(state.clients)) {
        try { localStorage.setItem('salaoClientes', JSON.stringify(state.clients)); } catch {}
      }
      if (state.adminPaymentConfig && state.adminPaymentConfig.chavePix) {
        try { localStorage.setItem('salaoAdminPaymentConfig', JSON.stringify(state.adminPaymentConfig)); } catch {}
      }
      if (state.adminCredentials && state.adminCredentials.cpf) {
        try {
          const currentLocalRaw = localStorage.getItem('salaoAdminCredentials');
          let currentLocal: any = null;
          if (currentLocalRaw) {
            try { currentLocal = JSON.parse(currentLocalRaw); } catch {}
          }
          const mergedMaster = { ...state.adminCredentials };
          if (currentLocal && currentLocal.password && currentLocal.password !== 'admin' && (!mergedMaster.password || mergedMaster.password === 'admin')) {
            mergedMaster.password = currentLocal.password;
          }
          if (!mergedMaster.password || mergedMaster.password === 'admin') {
            mergedMaster.password = 'Ana1@@theo';
          }
          localStorage.setItem('salaoAdminCredentials', JSON.stringify(mergedMaster));
          sessionStorage.setItem('salaoAdminCredentials', JSON.stringify(mergedMaster));
        } catch {}
      }
      if (state.adminCredentialsList && Array.isArray(state.adminCredentialsList) && state.adminCredentialsList.length > 0) {
        try {
          const currentListRaw = localStorage.getItem('salaoAdminCredentialsList');
          let currentList: any[] = [];
          if (currentListRaw) {
            try { currentList = JSON.parse(currentListRaw) || []; } catch {}
          }

          const mergedList = state.adminCredentialsList.map((remoteCred: any) => {
            const cleanRemoteCpf = (remoteCred.cpf || '').replace(/\D/g, '');
            const localMatch = currentList.find((l: any) => {
              const cleanLocalCpf = (l.cpf || '').replace(/\D/g, '');
              return cleanRemoteCpf && cleanLocalCpf && cleanLocalCpf === cleanRemoteCpf;
            });
            if (localMatch && localMatch.password && localMatch.password !== 'admin' && (!remoteCred.password || remoteCred.password === 'admin')) {
              return { ...remoteCred, password: localMatch.password };
            }
            if (cleanRemoteCpf === '22622448805' && (!remoteCred.password || remoteCred.password === 'admin')) {
              return { ...remoteCred, password: 'Ana1@@theo' };
            }
            if (cleanRemoteCpf === '30928763854' && (!remoteCred.password || remoteCred.password === 'admin')) {
              return { ...remoteCred, password: 'Ana1@luna' };
            }
            return remoteCred;
          });

          localStorage.setItem('salaoAdminCredentialsList', JSON.stringify(mergedList));
          sessionStorage.setItem('salaoAdminCredentialsList', JSON.stringify(mergedList));
        } catch {}
      }
      if (state.messages && Array.isArray(state.messages)) {
        messagesChanged = true;
        try { localStorage.setItem('salaoMessages', JSON.stringify(state.messages)); } catch {}
      }
      if (state.notices && Array.isArray(state.notices)) {
        try { localStorage.setItem('salaoNotices', JSON.stringify(state.notices)); } catch {}
      }
      if (state.onlineUsers && Array.isArray(state.onlineUsers)) {
        try { localStorage.setItem('salaoOnlineUsers', JSON.stringify(state.onlineUsers)); } catch {}
      }
      if (state.usedTrialCpfs && Array.isArray(state.usedTrialCpfs)) {
        try { localStorage.setItem('salaoUsedTrialCpfs', JSON.stringify(state.usedTrialCpfs)); } catch {}
      }

      // Atualizações de dados processadas silenciosamente sem emitir nenhum som
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { source: 'remote', state } }));
      }
    } finally {
      this.isApplyingRemote = false;
    }
  }

  public pushUpdateImmediate(partial: Partial<FullSyncState>) {
    if (this.isApplyingRemote) return;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    const toSend = {
      ...this.pendingUpdates,
      ...partial,
      lastSenderId: CLIENT_ID,
      lastUpdated: Date.now()
    };
    this.pendingUpdates = {};

    // 1. Direct Push to Firestore Database (Works everywhere, including Vercel & Mobile)
    if (db) {
      try {
        const globalDocRef = doc(db, 'system', 'global_sync_state');
        setDoc(globalDocRef, sanitizeForFirestore(toSend), { merge: true }).catch((err) => {
          console.warn('[SyncEngine] Firestore immediate push error:', err);
        });
      } catch (err) {
        console.warn('[SyncEngine] Error triggering Firestore setDoc:', err);
      }
    }

    // 2. Fallback Push to Node Server
    try {
      fetch('/api/sync/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: toSend,
          clientId: CLIENT_ID,
        }),
      }).catch(() => {});
    } catch {}
  }

  public pushUpdate(partial: Partial<FullSyncState>) {
    if (this.isApplyingRemote) return;

    this.pendingUpdates = {
      ...this.pendingUpdates,
      ...partial,
      lastSenderId: CLIENT_ID,
      lastUpdated: Date.now()
    };

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.sendPendingUpdates();
    }, 150);
  }

  private async sendPendingUpdates() {
    const toSend = { 
      ...this.pendingUpdates,
      lastSenderId: CLIENT_ID,
      lastUpdated: Date.now()
    };
    this.pendingUpdates = {};

    // 1. Push to Firebase Firestore in real-time
    if (db) {
      try {
        const globalDocRef = doc(db, 'system', 'global_sync_state');
        await setDoc(globalDocRef, sanitizeForFirestore(toSend), { merge: true });
      } catch (err) {
        console.warn('[SyncEngine] Firestore debounced push error:', err);
      }
    }

    // 2. Secondary push to local backend API
    try {
      await fetch('/api/sync/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: toSend,
          clientId: CLIENT_ID,
        }),
      });
    } catch (e) {
      // expected on static / serverless Vercel
    }
  }
}

export const syncEngine = new SyncEngine();

