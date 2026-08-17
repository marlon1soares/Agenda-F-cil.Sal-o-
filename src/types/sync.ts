import { SalonApp, SalonConfig, Transaction, Appointment, Professional, ServiceItem, ClientRecord, AdminPaymentConfig, AdminCredentials, ChatMessage, SystemBroadcastNotice, LivePresenceUser } from '../types';

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
  lastUpdated: number;
}
