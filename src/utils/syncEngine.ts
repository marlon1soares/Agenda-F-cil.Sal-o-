import { FullSyncState } from '../types/sync';
import { soundEffects } from './audio';

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

class SyncEngine {
  private eventSource: EventSource | null = null;
  private isInitialized = false;
  private debounceTimer: any = null;
  private pendingUpdates: Partial<FullSyncState> = {};
  private isApplyingRemote = false;
  private presenceInterval: any = null;

  public getClientId(): string {
    return CLIENT_ID;
  }

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // 1. Initial State Fetch from Server
    this.fetchServerState();

    // 2. Connect to Server-Sent Events for Real-time Streaming
    this.connectSSE();

    // 3. Start Periodic Presence Heartbeat & Background Polling
    this.startPresenceHeartbeat();
    this.startBackupPolling();

    // 4. Send immediate presence on initialization
    this.broadcastCurrentPresence();

    // 4. Listen to window focus or online to re-sync
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
    // Background polling fallback every 12 seconds in case SSE stream was paused by OS
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
      console.warn('[SyncEngine] Could not reach server for initial sync:', e);
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
        // Auto-reconnect after 4 seconds
        setTimeout(() => {
          this.connectSSE();
        }, 4000);
      };
    } catch (err) {
      console.warn('[SyncEngine] SSE connection error:', err);
    }
  }

  public applyRemoteState(state: Partial<FullSyncState>, senderId?: string) {
    if (!state) return;
    if (senderId && senderId === CLIENT_ID) return; // ignore our own echo

    this.isApplyingRemote = true;
    try {
      let appointmentsChanged = false;
      let messagesChanged = false;

      if (state.salons && Array.isArray(state.salons)) {
        try { localStorage.setItem('salaoAppsList', JSON.stringify(state.salons)); } catch {}
      }
      if (state.config) {
        try { localStorage.setItem('salaoConfig', JSON.stringify(state.config)); } catch {}
      }
      if (state.appointments) {
        appointmentsChanged = true;
        try { localStorage.setItem('salaoAgenda', JSON.stringify(state.appointments)); } catch {}
      }
      if (state.transactions && Array.isArray(state.transactions)) {
        try { localStorage.setItem('salaoLancamentos', JSON.stringify(state.transactions)); } catch {}
      }
      if (state.timeAdjustments) {
        try { localStorage.setItem('salaoAjustesHorarios', JSON.stringify(state.timeAdjustments)); } catch {}
      }
      if (state.professionals && Array.isArray(state.professionals)) {
        try { localStorage.setItem('salaoProfissionais', JSON.stringify(state.professionals)); } catch {}
      }
      if (state.services && Array.isArray(state.services)) {
        try { localStorage.setItem('salaoServicos', JSON.stringify(state.services)); } catch {}
      }
      if (state.clients && Array.isArray(state.clients)) {
        try { localStorage.setItem('salaoClientes', JSON.stringify(state.clients)); } catch {}
      }
      if (state.adminPaymentConfig) {
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

      // Play chime if another device booked an appointment or sent a message
      if (senderId && senderId !== CLIENT_ID) {
        if (appointmentsChanged) {
          soundEffects.playBookingChime();
        } else if (messagesChanged) {
          soundEffects.playMessagePing();
        }
      }

      // Notify entire app of synced remote data
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
      lastUpdated: Date.now()
    };
    this.pendingUpdates = {};

    try {
      fetch('/api/sync/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: toSend,
          clientId: CLIENT_ID,
        }),
      }).catch((e) => {
        console.warn('[SyncEngine] Immediate push failed:', e);
      });
    } catch (e) {
      console.warn('[SyncEngine] Immediate push error:', e);
    }
  }

  public pushUpdate(partial: Partial<FullSyncState>) {
    if (this.isApplyingRemote) return;

    this.pendingUpdates = {
      ...this.pendingUpdates,
      ...partial,
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
    const toSend = { ...this.pendingUpdates };
    this.pendingUpdates = {};

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
      console.warn('[SyncEngine] Failed to push update to server:', e);
    }
  }
}

export const syncEngine = new SyncEngine();
