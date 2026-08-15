import { FullSyncState } from '../types/sync';
import { Storage } from './storage';

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

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // 1. Initial State Fetch from Server
    this.fetchServerState();

    // 2. Connect to Server-Sent Events for Real-time Streaming
    this.connectSSE();

    // 3. Listen to window focus or online to re-sync
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
      if (state.salons && Array.isArray(state.salons)) {
        try { localStorage.setItem('salaoAppsList', JSON.stringify(state.salons)); } catch {}
      }
      if (state.config) {
        try { localStorage.setItem('salaoConfig', JSON.stringify(state.config)); } catch {}
      }
      if (state.appointments) {
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

      // Notify entire app of synced remote data
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('salao_sync_data', { detail: { source: 'remote', state } }));
      }
    } finally {
      this.isApplyingRemote = false;
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
