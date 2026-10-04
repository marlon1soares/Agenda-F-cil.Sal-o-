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
  private activeSalonId: string = '';
  private unsubscribeActiveSalon: (() => void) | null = null;
  private lastProcessedRemoteTimestamp: number = 0;

  public getClientId(): string {
    return CLIENT_ID;
  }

  public setActiveSalonId(salonId: string) {
    if (!salonId) return;
    if (this.activeSalonId === salonId && this.unsubscribeActiveSalon) return;
    this.activeSalonId = salonId;

    if (this.unsubscribeActiveSalon) {
      try {
        this.unsubscribeActiveSalon();
      } catch {}
      this.unsubscribeActiveSalon = null;
    }

    if (!db) return;

    try {
      const salonDocRef = doc(db, 'salons', salonId);
      this.unsubscribeActiveSalon = onSnapshot(salonDocRef, (snap) => {
        if (snap.exists()) {
          const sData = snap.data();
          if (sData) {
            this.applySalonPartition(salonId, sData);
          }
        }
      }, (err) => {
        console.warn(`[SyncEngine] Firestore salon listener error (${salonId}):`, err);
      });
    } catch (err) {
      console.warn(`[SyncEngine] Setup salon listener error:`, err);
    }
  }

  public applySalonPartition(salonId: string, sData: any) {
    if (!salonId || !sData) return;
    try {
      let changed = false;

      // 1. Appointments: Never overwrite existing appointments with empty object
      if (sData.appointments && typeof sData.appointments === 'object') {
        const currentRaw = localStorage.getItem(`salaoAgenda_${salonId}`);
        const newRaw = JSON.stringify(sData.appointments);
        if (currentRaw !== newRaw) {
          const currentHasApts = currentRaw && currentRaw !== '{}' && Object.keys(JSON.parse(currentRaw) || {}).length > 0;
          const newHasApts = Object.keys(sData.appointments).length > 0;
          if (!currentHasApts || newHasApts) {
            localStorage.setItem(`salaoAgenda_${salonId}`, newRaw);
            if (salonId === 'salon-parcas') {
              localStorage.setItem('salaoAgenda', newRaw);
            }
            changed = true;
          }
        }
      }

      // 2. Transactions: Never wipe out existing transactions with empty array
      if (sData.transactions && Array.isArray(sData.transactions)) {
        const currentRaw = localStorage.getItem(`salaoLancamentos_${salonId}`);
        const newRaw = JSON.stringify(sData.transactions);
        if (currentRaw !== newRaw) {
          const currentHasTx = currentRaw && currentRaw !== '[]' && (JSON.parse(currentRaw) || []).length > 0;
          const newHasTx = sData.transactions.length > 0;
          if (!currentHasTx || newHasTx) {
            localStorage.setItem(`salaoLancamentos_${salonId}`, newRaw);
            changed = true;
          }
        }
      }

      // 3. Time Adjustments
      if (sData.timeAdjustments && typeof sData.timeAdjustments === 'object') {
        const currentRaw = localStorage.getItem(`salaoAjustesHorarios_${salonId}`);
        const newRaw = JSON.stringify(sData.timeAdjustments);
        if (currentRaw !== newRaw) {
          localStorage.setItem(`salaoAjustesHorarios_${salonId}`, newRaw);
          changed = true;
        }
      }

      // 4. Professionals: Never wipe out existing professionals
      if (sData.professionals && Array.isArray(sData.professionals)) {
        const currentRaw = localStorage.getItem(`salaoProfissionais_${salonId}`);
        const newRaw = JSON.stringify(sData.professionals);
        if (currentRaw !== newRaw) {
          const currentHasProf = currentRaw && currentRaw !== '[]' && (JSON.parse(currentRaw) || []).length > 0;
          const newHasProf = sData.professionals.length > 0;
          if (!currentHasProf || newHasProf) {
            localStorage.setItem(`salaoProfissionais_${salonId}`, newRaw);
            changed = true;
          }
        }
      }

      // 5. Services: Never wipe out existing services
      if (sData.services && Array.isArray(sData.services)) {
        const currentRaw = localStorage.getItem(`salaoServicos_${salonId}`);
        const newRaw = JSON.stringify(sData.services);
        if (currentRaw !== newRaw) {
          const currentHasSrv = currentRaw && currentRaw !== '[]' && (JSON.parse(currentRaw) || []).length > 0;
          const newHasSrv = sData.services.length > 0;
          if (!currentHasSrv || newHasSrv) {
            localStorage.setItem(`salaoServicos_${salonId}`, newRaw);
            changed = true;
          }
        }
      }

      // 6. Clients: Never wipe out existing clients
      if (sData.clients && Array.isArray(sData.clients)) {
        const currentRaw = localStorage.getItem(`salaoClientes_${salonId}`);
        const newRaw = JSON.stringify(sData.clients);
        if (currentRaw !== newRaw) {
          const currentHasCli = currentRaw && currentRaw !== '[]' && (JSON.parse(currentRaw) || []).length > 0;
          const newHasCli = sData.clients.length > 0;
          if (!currentHasCli || newHasCli) {
            localStorage.setItem(`salaoClientes_${salonId}`, newRaw);
            changed = true;
          }
        }
      }

      // 7. Fechamentos
      if (sData.caixaFechamentos && Array.isArray(sData.caixaFechamentos)) {
        const currentRaw = localStorage.getItem(`salao_fechamentos_caixa_${salonId}`);
        const newRaw = JSON.stringify(sData.caixaFechamentos);
        if (currentRaw !== newRaw) {
          localStorage.setItem(`salao_fechamentos_caixa_${salonId}`, newRaw);
          changed = true;
        }
      }

      // 8. Configuration: Strictly preserve customized local configuration
      if (sData.config && typeof sData.config === 'object') {
        const currentRaw = localStorage.getItem(`salaoConfig_${salonId}`);
        const newRaw = JSON.stringify(sData.config);
        if (currentRaw !== newRaw) {
          let canUpdateConfig = true;
          if (currentRaw) {
            try {
              const currentCfg = JSON.parse(currentRaw);
              if (currentCfg && currentCfg.nomeSalao && (!sData.config.nomeSalao || (sData.config.nomeSalao === 'Controle Salão dos Parças' && currentCfg.nomeSalao !== 'Controle Salão dos Parças'))) {
                canUpdateConfig = false;
              }
            } catch {}
          }
          if (canUpdateConfig) {
            localStorage.setItem(`salaoConfig_${salonId}`, newRaw);
            if (salonId === 'salon-parcas') {
              localStorage.setItem('salaoConfig', newRaw);
            }
            changed = true;
          }
        }
      }

      // Only dispatch if actual data was modified on disk
      if (changed && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { source: 'remote', salonId } }));
      }
    } catch {}
  }

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // 1. Initialize Firestore Real-time listener
    this.initFirestoreSync();

    // 2. Initial State Fetch from Local Server (only once on startup)
    this.fetchServerState();

    // 3. Connect to Server-Sent Events for Real-time Streaming
    this.connectSSE();

    // 4. Send Periodic Presence Heartbeat (keeps user active without polling state)
    this.startPresenceHeartbeat();

    // 5. Send immediate presence on initialization
    this.broadcastCurrentPresence();

    // 6. Online listener - only reconnect SSE if connection was lost, without resetting state
    try {
      window.addEventListener('online', () => {
        this.connectSSE();
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

      const fechamentos = getLocalOrFallback('salao_fechamentos_caixa');
      if (fechamentos) seedData.caixaFechamentos = fechamentos;

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
    // Polling removed to prevent idle refreshing and accidental resets
  }

  public async fetchServerState(): Promise<FullSyncState | null> {
    try {
      const res = await fetch('/api/sync/state');
      if (!res.ok) return null;
      const data = await res.json();
      if (data.success && data.state) {
        if (data.state.lastUpdated && this.lastProcessedRemoteTimestamp && data.state.lastUpdated <= this.lastProcessedRemoteTimestamp) {
          return data.state;
        }
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

    // Prevent re-applying the exact same or older remote state
    if (state.lastUpdated && this.lastProcessedRemoteTimestamp && state.lastUpdated <= this.lastProcessedRemoteTimestamp) {
      return;
    }
    if (state.lastUpdated) {
      this.lastProcessedRemoteTimestamp = state.lastUpdated;
    }

    this.isApplyingRemote = true;
    try {
      let hasAnyChange = false;

      // 0. Deletion of a specific salon (strictly remove that salon without touching others)
      if (state.deletedSalonId) {
        const dId = state.deletedSalonId;
        try {
          localStorage.removeItem(`salaoConfig_${dId}`);
          localStorage.removeItem(`salaoAgenda_${dId}`);
          localStorage.removeItem(`salaoLancamentos_${dId}`);
          localStorage.removeItem(`salao_fechamentos_caixa_${dId}`);
          localStorage.removeItem(`salaoProfissionais_${dId}`);
          localStorage.removeItem(`salaoServicos_${dId}`);
          localStorage.removeItem(`salaoClientes_${dId}`);
          localStorage.removeItem(`salaoAjustesHorarios_${dId}`);

          const localSalonsRaw = localStorage.getItem('salaoAppsList');
          if (localSalonsRaw) {
            const list = JSON.parse(localSalonsRaw);
            if (Array.isArray(list)) {
              localStorage.setItem('salaoAppsList', JSON.stringify(list.filter((s: any) => s.id !== dId)));
              hasAnyChange = true;
            }
          }
        } catch {}
      }

      // 1. Multi-tenant Partitioned Salon Data
      if (state.salonData && typeof state.salonData === 'object') {
        Object.keys(state.salonData).forEach((sId) => {
          const sData = (state.salonData as any)[sId];
          if (sData) {
            this.applySalonPartition(sId, sData);
          }
        });
      }

      // 2. Specific salon update via state.salonId
      if (state.salonId) {
        this.applySalonPartition(state.salonId, {
          appointments: state.appointments,
          transactions: state.transactions,
          timeAdjustments: state.timeAdjustments,
          professionals: state.professionals,
          services: state.services,
          clients: state.clients,
          caixaFechamentos: state.caixaFechamentos,
          config: state.config
        });
      }

      // 3. Salons List (Multi-salon registry with absolute preservation of all salons and configurations)
      if (state.salons && Array.isArray(state.salons) && state.salons.length > 0) {
        try { 
          const localSalonsRaw = localStorage.getItem('salaoAppsList');
          const localSalons = localSalonsRaw ? JSON.parse(localSalonsRaw) : [];
          const salonMap = new Map<string, any>();
          if (Array.isArray(localSalons)) {
            localSalons.forEach((s: any) => { if (s && s.id) salonMap.set(s.id, s); });
          }

          // Merge without ever dropping any local salon, and without overwriting local custom config with defaults
          state.salons.forEach((remoteSalon: any) => {
            if (!remoteSalon || !remoteSalon.id) return;
            const local = salonMap.get(remoteSalon.id);
            if (!local) {
              salonMap.set(remoteSalon.id, remoteSalon);
            } else {
              // Local customized config takes precedence over remote default config
              const localConfig = local.config || {};
              const remoteConfig = remoteSalon.config || {};
              const mergedConfig = {
                ...remoteConfig,
                ...localConfig
              };
              salonMap.set(remoteSalon.id, {
                ...remoteSalon,
                ...local,
                name: local.name || remoteSalon.name,
                ownerName: local.ownerName || remoteSalon.ownerName,
                ownerPhone: local.ownerPhone || remoteSalon.ownerPhone,
                ownerEmail: local.ownerEmail || remoteSalon.ownerEmail,
                ownerCpf: local.ownerCpf || remoteSalon.ownerCpf,
                ownerRg: local.ownerRg || remoteSalon.ownerRg,
                cep: local.cep || remoteSalon.cep,
                logradouro: local.logradouro || remoteSalon.logradouro,
                numero: local.numero || remoteSalon.numero,
                bairro: local.bairro || remoteSalon.bairro,
                cidade: local.cidade || remoteSalon.cidade,
                uf: local.uf || remoteSalon.uf,
                config: mergedConfig
              });
            }
          });

          const mergedSalons = Array.from(salonMap.values());
          const oldStr = JSON.stringify(localSalons);
          const newStr = JSON.stringify(mergedSalons);
          if (oldStr !== newStr) {
            localStorage.setItem('salaoAppsList', newStr);
            hasAnyChange = true;
          }
        } catch {}
      }

      if (state.adminPaymentConfig && state.adminPaymentConfig.chavePix) {
        try {
          const old = localStorage.getItem('salaoAdminPaymentConfig');
          const n = JSON.stringify(state.adminPaymentConfig);
          if (old !== n) {
            localStorage.setItem('salaoAdminPaymentConfig', n);
            hasAnyChange = true;
          }
        } catch {}
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
          const n = JSON.stringify(mergedMaster);
          if (currentLocalRaw !== n) {
            localStorage.setItem('salaoAdminCredentials', n);
            sessionStorage.setItem('salaoAdminCredentials', n);
            hasAnyChange = true;
          }
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

          const n = JSON.stringify(mergedList);
          if (currentListRaw !== n) {
            localStorage.setItem('salaoAdminCredentialsList', n);
            sessionStorage.setItem('salaoAdminCredentialsList', n);
            hasAnyChange = true;
          }
        } catch {}
      }
      if (state.messages && Array.isArray(state.messages)) {
        try {
          const old = localStorage.getItem('salaoMessages');
          const n = JSON.stringify(state.messages);
          if (old !== n) localStorage.setItem('salaoMessages', n);
        } catch {}
      }
      if (state.notices && Array.isArray(state.notices)) {
        try {
          const old = localStorage.getItem('salaoNotices');
          const n = JSON.stringify(state.notices);
          if (old !== n) localStorage.setItem('salaoNotices', n);
        } catch {}
      }
      if (state.onlineUsers && Array.isArray(state.onlineUsers)) {
        try {
          const old = localStorage.getItem('salaoOnlineUsers');
          const n = JSON.stringify(state.onlineUsers);
          if (old !== n) localStorage.setItem('salaoOnlineUsers', n);
        } catch {}
      }
      if (state.usedTrialCpfs && Array.isArray(state.usedTrialCpfs)) {
        try {
          const old = localStorage.getItem('salaoUsedTrialCpfs');
          const n = JSON.stringify(state.usedTrialCpfs);
          if (old !== n) localStorage.setItem('salaoUsedTrialCpfs', n);
        } catch {}
      }

      // Only dispatch if actual changes were made to persistent state
      if (hasAnyChange && typeof window !== 'undefined') {
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

        // Dedicated Cloud Salon Partition Document
        if (toSend.salonId && toSend.salonData && (toSend.salonData as any)[toSend.salonId]) {
          const salonDocRef = doc(db, 'salons', toSend.salonId);
          setDoc(salonDocRef, sanitizeForFirestore({ ...(toSend.salonData as any)[toSend.salonId], lastUpdated: Date.now() }), { merge: true }).catch(() => {});
        }

        if (toSend.deletedSalonId) {
          try {
            const delRef = doc(db, 'salons', toSend.deletedSalonId);
            deleteDoc(delRef).catch(() => {});
          } catch {}
        }
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

        // Dedicated Cloud Salon Partition Document
        if (toSend.salonId && toSend.salonData && (toSend.salonData as any)[toSend.salonId]) {
          const salonDocRef = doc(db, 'salons', toSend.salonId);
          setDoc(salonDocRef, sanitizeForFirestore({ ...(toSend.salonData as any)[toSend.salonId], lastUpdated: Date.now() }), { merge: true }).catch(() => {});
        }

        if (toSend.deletedSalonId) {
          try {
            const delRef = doc(db, 'salons', toSend.deletedSalonId);
            deleteDoc(delRef).catch(() => {});
          } catch {}
        }
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

