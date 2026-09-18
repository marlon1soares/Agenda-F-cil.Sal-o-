import { SalonApp, SalonConfig, Transaction, Appointment, Professional, ServiceItem, ClientRecord, AdminPaymentConfig, AdminCredentials, ChatMessage, SystemBroadcastNotice, LivePresenceUser, CaixaFechamentoCiclo } from '../types';

export interface FullSyncState {
  salons: SalonApp[];
  config: SalonConfig;
  appointments: Record<string, Record<string, Appointment>>;
  transactions: Transaction[];
  timeAdjustments: Record<string, number>;
  professionals: Professional[];
  services: ServiceItem[];
  clients: ClientRecord[];
  adminPaymentConfig: AdminPaymentConfig;
  adminCredentials?: AdminCredentials;
  adminCredentialsList?: AdminCredentials[];
  messages?: ChatMessage[];
  notices?: SystemBroadcastNotice[];
  onlineUsers?: LivePresenceUser[];
  usedTrialCpfs?: string[];
  caixaFechamentos?: CaixaFechamentoCiclo[];
  salonData?: Record<string, {
    appointments?: Record<string, Record<string, Appointment>>;
    transactions?: Transaction[];
    timeAdjustments?: Record<string, number>;
    professionals?: Professional[];
    services?: ServiceItem[];
    clients?: ClientRecord[];
    config?: SalonConfig;
    caixaFechamentos?: CaixaFechamentoCiclo[];
  }>;
  salonId?: string;
  deletedSalonId?: string;
  lastSenderId?: string;
  lastUpdated: number;
}
