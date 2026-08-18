import fs from 'fs';
import path from 'path';
import type { Response } from 'express';

export interface SyncDatabaseState {
  salons: any[];
  config: any;
  appointments: Record<string, any>;
  transactions: any[];
  timeAdjustments: Record<string, number>;
  professionals: any[];
  services: any[];
  clients: any[];
  adminPaymentConfig: any;
  adminCredentials?: any;
  adminCredentialsList?: any[];
  messages: any[];
  notices: any[];
  onlineUsers: any[];
  lastUpdated: number;
}

const DEFAULT_STATE: SyncDatabaseState = {
  adminCredentials: {
    cpf: "226.224.488-05",
    email: "marlon1soares28@gmail.com",
    phone: "(11) 99999-9999",
    password: "admin",
    registeredAt: "2026-01-01T00:00:00.000Z"
  },
  adminCredentialsList: [
    {
      cpf: "226.224.488-05",
      email: "marlon1soares28@gmail.com",
      phone: "(11) 99999-9999",
      password: "admin",
      registeredAt: "2026-01-01T00:00:00.000Z"
    },
    {
      cpf: "309.287.638-54",
      email: "marlon1soares28@gmail.com",
      phone: "(11) 99999-8888",
      password: "admin",
      registeredAt: "2026-01-01T00:00:00.000Z"
    },
    {
      cpf: "000.000.000-00",
      email: "admin@salao.com",
      phone: "(11) 99999-9999",
      password: "admin",
      registeredAt: "2026-01-01T00:00:00.000Z"
    },
    {
      cpf: "123.456.789-00",
      email: "admin@salao.com",
      phone: "(11) 99999-9999",
      password: "admin",
      registeredAt: "2026-01-01T00:00:00.000Z"
    }
  ],
  salons: [
    {
      id: "salon-parcas",
      name: "Controle Salão dos Parças",
      ownerName: "Marlon & Michael",
      ownerEmail: "admin@salaoparcas.com",
      ownerPhone: "(11) 99999-8888",
      ownerRg: "38.291.823-1",
      ownerCpf: "392.810.491-00",
      cep: "01310-100",
      logradouro: "Av. Paulista, 1000",
      numero: "1000",
      bairro: "Bela Vista",
      cidade: "São Paulo",
      uf: "SP",
      createdAt: "2026-01-10",
      purchaseDate: "2026-01-10",
      expiresAt: "2027-01-10",
      planDays: 365,
      status: "active",
      appCode: "SALAO-1",
      purchaseToken: "SALAO-PARCAS-2026",
      themeKey: "azul",
      config: {
        nomeSalao: "Controle Salão dos Parças",
        logoUrl: "",
        bgHeaderUrl: "",
        temaKey: "azul",
        corCustom: "#2563eb",
        profs: [
          { id: "prof-1", nome: "Michael", porc: 70 },
          { id: "prof-2", nome: "Marlon", porc: 30 }
        ],
        chavePix: "marlon1soares28@gmail.com",
        tipoChavePix: "email",
        titularPix: "Marlon & Michael - Salão dos Parças",
        cidadePix: "São Paulo",
        bancoCartao: "Banco Nubank / Itaú",
        agenciaCartao: "0001",
        contaCartao: "9876543-2",
        tipoContaCartao: "corrente",
        titularCartao: "Salão dos Parças Ltda",
        cpfCnpjCartao: "12.345.678/0001-90",
        linkCartao: "",
        instrucoesPagamento: "Aceitamos Pix imediato e compras no Cartão de Crédito/Débito."
      }
    }
  ],
  config: {
    nomeSalao: "Controle Salão dos Parças",
    logoUrl: "",
    bgHeaderUrl: "",
    temaKey: "azul",
    corCustom: "#2563eb",
    profs: [
      { id: "prof-1", nome: "Michael", porc: 70 },
      { id: "prof-2", nome: "Marlon", porc: 30 }
    ],
    chavePix: "marlon1soares28@gmail.com",
    tipoChavePix: "email",
    titularPix: "Marlon & Michael - Salão dos Parças",
    cidadePix: "São Paulo",
    bancoCartao: "Banco Nubank / Itaú",
    agenciaCartao: "0001",
    contaCartao: "9876543-2",
    tipoContaCartao: "corrente",
    titularCartao: "Salão dos Parças Ltda",
    cpfCnpjCartao: "12.345.678/0001-90",
    linkCartao: "",
    instrucoesPagamento: "Aceitamos Pix imediato e compras no Cartão de Crédito/Débito."
  },
  appointments: {
    "prof-1": {
      "09:00": {
        id: "apt-1",
        time: "09:00",
        clientName: "Rodrigo Silva",
        serviceName: "Corte Degradê Navalhado",
        phone: "(11) 98765-4321",
        status: "confirmed",
        price: 35.00,
        paymentStatus: "paid"
      },
      "10:00": {
        id: "apt-2",
        time: "10:00",
        clientName: "Lucas Mendes",
        serviceName: "Barba Terapia Completa",
        phone: "(11) 91234-5678",
        status: "confirmed",
        price: 30.00,
        paymentStatus: "pending"
      }
    },
    "prof-2": {
      "09:30": {
        id: "apt-3",
        time: "09:30",
        clientName: "Gabriel Santos",
        serviceName: "Combo Cabelo + Barba",
        phone: "(11) 99887-6655",
        status: "confirmed",
        price: 60.00,
        paymentStatus: "paid"
      }
    }
  },
  transactions: [
    {
      id: "tx-1",
      date: new Date().toISOString().split('T')[0],
      time: "09:45",
      description: "Corte Degradê Navalhado - Rodrigo",
      grossAmount: 35.00,
      cardFeePercent: 0,
      netAmount: 35.00,
      paymentMethod: "pix",
      commissions: [
        { professionalId: "prof-1", professionalName: "Michael", percentage: 70, amount: 24.50 },
        { professionalId: "prof-2", professionalName: "Marlon", percentage: 30, amount: 10.50 }
      ],
      createdBy: "salao"
    }
  ],
  timeAdjustments: {},
  professionals: [
    { id: "prof-1", nome: "Michael", cargo: "Barbeiro Master & Especialista", porc: 70, ativo: true },
    { id: "prof-2", nome: "Marlon", cargo: "Barbeiro Sênior & Visagista", porc: 30, ativo: true }
  ],
  services: [
    { id: "srv-1", nome: "Corte Tradicional / Degradê", preco: 35.00, duracaoMinutos: 30, ativo: true },
    { id: "srv-2", nome: "Barba & Toalha Quente", preco: 30.00, duracaoMinutos: 25, ativo: true },
    { id: "srv-3", nome: "Combo Cabelo + Barba", preco: 60.00, duracaoMinutos: 50, ativo: true },
    { id: "srv-4", nome: "Sobrancelha na Navalha", preco: 15.00, duracaoMinutos: 15, ativo: true }
  ],
  clients: [
    { id: "cli-1", nome: "Rodrigo Silva", telefone: "(11) 98765-4321", totalVisitas: 5, totalGasto: 175.00, ultimoServico: "Corte Degradê", ultimaVisita: "2026-02-10" },
    { id: "cli-2", nome: "Lucas Mendes", telefone: "(11) 91234-5678", totalVisitas: 3, totalGasto: 90.00, ultimoServico: "Barba Terapia", ultimaVisita: "2026-02-08" },
    { id: "cli-3", nome: "Gabriel Santos", telefone: "(11) 99887-6655", totalVisitas: 8, totalGasto: 480.00, ultimoServico: "Combo Cabelo + Barba", ultimaVisita: "2026-02-12" }
  ],
  adminPaymentConfig: {
    chavePix: "marlon1soares28@gmail.com",
    nomeBeneficiario: "Agenda+Fácil.Salão Oficial",
    bancoOuProcessador: "Mercado Pago / Pix Instantâneo",
    cartaoContaDestino: "Conta Principal - Marlon Soares (MP-883921)",
    instrucoesPagamento: "O valor do cartão ou Pix é creditado diretamente na conta cadastrada pelo Administrador.",
    precoPlano30Dias: 30.00,
    precoPlano90Dias: 75.00,
    precoPlano180Dias: 135.00,
    precoPlano365Dias: 240.00
  },
  messages: [
    {
      id: "msg-welcome-1",
      salonId: "salon-parcas",
      salonName: "Controle Salão dos Parças",
      fromRole: "admin",
      toRole: "todos",
      senderName: "Administrador Central",
      content: "💈 Bem-vindo ao ecossistema conectado Agenda Fácil! Todos os salões, administradores e clientes agora contam com sincronização ao vivo em tempo real.",
      timestamp: "09:00",
      date: new Date().toISOString().split('T')[0],
      createdAt: Date.now() - 3600000,
      type: "admin_announcement"
    }
  ],
  notices: [
    {
      id: "not-1",
      title: "🚀 Conexão em Tempo Real Ativa",
      message: "Seu sistema está 100% conectado! Agendamentos de clientes, atualizações de horários e mensagens sincronizam instantaneamente.",
      fromRole: "admin",
      target: "todos",
      createdAt: new Date().toISOString().split('T')[0],
      urgent: false
    }
  ],
  onlineUsers: [],
  lastUpdated: Date.now()
};

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'sync-database.json');

class SyncStore {
  private state: SyncDatabaseState;
  private sseClients: Set<Response> = new Set();
  private saveTimeout: any = null;

  constructor() {
    this.state = this.loadFromDisk();
    this.startHeartbeat();
  }

  private loadFromDisk(): SyncDatabaseState {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        const merged: SyncDatabaseState = {
          ...DEFAULT_STATE,
          ...parsed,
          lastUpdated: parsed.lastUpdated || Date.now()
        };
        if (parsed.adminCredentialsList && Array.isArray(parsed.adminCredentialsList) && parsed.adminCredentialsList.length > 0) {
          merged.adminCredentialsList = parsed.adminCredentialsList;
        }
        if (parsed.adminCredentials && parsed.adminCredentials.cpf) {
          merged.adminCredentials = parsed.adminCredentials;
        }
        return merged;
      }
    } catch (e) {
      console.warn('[SyncStore] Could not read from database file, using default state:', e);
    }
    this.persistToDisk(DEFAULT_STATE);
    return { ...DEFAULT_STATE };
  }

  private persistToDisk(state: SyncDatabaseState) {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[SyncStore] Failed to write database file:', e);
    }
  }

  private scheduleSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.persistToDisk(this.state);
    }, 200);
  }

  private startHeartbeat() {
    setInterval(() => {
      this.broadcastRaw(`data: ${JSON.stringify({ type: 'ping', time: Date.now() })}\n\n`);
    }, 25000);
  }

  public getState(): SyncDatabaseState {
    return this.state;
  }

  public updateState(updates: Partial<SyncDatabaseState>, senderId?: string): SyncDatabaseState {
    this.state = {
      ...this.state,
      ...updates,
      lastUpdated: Date.now()
    };

    if (updates.adminCredentials || updates.adminCredentialsList || updates.salons) {
      this.persistToDisk(this.state);
    } else {
      this.scheduleSave();
    }

    // Broadcast to all connected clients (Admin, Salon Owner, Clients)
    const payload = `data: ${JSON.stringify({
      type: 'sync_update',
      state: this.state,
      senderId: senderId || null,
      timestamp: this.state.lastUpdated
    })}\n\n`;

    this.broadcastRaw(payload);
    return this.state;
  }

  public addMessage(message: any, senderId?: string): SyncDatabaseState {
    const messages = Array.isArray(this.state.messages) ? [...this.state.messages] : [];
    messages.push(message);
    // Keep last 200 messages
    if (messages.length > 200) {
      messages.splice(0, messages.length - 200);
    }
    return this.updateState({ messages }, senderId);
  }

  public addNotice(notice: any, senderId?: string): SyncDatabaseState {
    const notices = Array.isArray(this.state.notices) ? [...this.state.notices] : [];
    notices.unshift(notice);
    if (notices.length > 50) {
      notices.splice(50);
    }
    return this.updateState({ notices }, senderId);
  }

  public updatePresence(user: { id: string; name: string; role: string; salonId?: string; salonName?: string; status?: string }): SyncDatabaseState {
    const now = Date.now();
    let onlineUsers = Array.isArray(this.state.onlineUsers) ? [...this.state.onlineUsers] : [];
    
    // Filter out inactive users (> 45s without ping)
    onlineUsers = onlineUsers.filter(u => now - u.lastSeen < 45000 && u.id !== user.id);
    onlineUsers.push({
      ...user,
      lastSeen: now,
      status: user.status || 'online'
    });

    return this.updateState({ onlineUsers });
  }

  public addSseClient(res: Response) {
    this.sseClients.add(res);

    // Initial sync event for newly connected client
    res.write(`data: ${JSON.stringify({
      type: 'sync_update',
      state: this.state,
      timestamp: this.state.lastUpdated
    })}\n\n`);

    res.on('close', () => {
      this.sseClients.delete(res);
    });
  }

  private broadcastRaw(data: string) {
    for (const client of this.sseClients) {
      try {
        client.write(data);
      } catch (err) {
        this.sseClients.delete(client);
      }
    }
  }
}

export const syncStore = new SyncStore();
