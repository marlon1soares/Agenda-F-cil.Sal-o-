export type UserRole = 'admin' | 'salao' | 'cliente';

export type PaymentMethod = 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'outro';

export interface StaffCommission {
  professionalId: string;
  professionalName: string;
  percentage: number;
  amount: number;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  description: string;
  category?: string;
  grossAmount: number;
  cardFeePercent: number;
  netAmount: number;
  paymentMethod: PaymentMethod;
  clientName?: string;
  commissions: StaffCommission[];
  createdBy: UserRole;
  notes?: string;
}

export type AppointmentStatus = 'livre' | 'agendado' | 'em_atendimento' | 'concluido' | 'bloqueado' | 'cancelado';

export interface Appointment {
  id: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // HH:mm
  status: AppointmentStatus;
  clientName?: string;
  clientPhone?: string;
  serviceName?: string;
  professionalId?: string;
  professionalName?: string;
  price?: number;
  notes?: string;
  origem?: UserRole;
}

export interface Professional {
  id: string;
  name: string;
  commissionPercent: number;
  role: string;
  phone?: string;
  avatarUrl?: string;
  active: boolean;
}

export interface ServiceItem {
  id: string;
  name: string;
  category: string;
  price: number;
  durationMinutes: number;
  defaultCommissionPercent: number;
  description?: string;
}

export interface ClientRecord {
  id: string;
  name: string;
  phone: string;
  email?: string;
  totalVisits: number;
  totalSpent: number;
  lastVisit: string;
  notes?: string;
}

export type CatalogFolder = 'salao' | 'cliente' | 'portfolio' | 'higiene' | 'roupas' | 'diversos' | string;

export interface CatalogMedia {
  id: string;
  folder: CatalogFolder;
  url: string;
  title?: string;
  mediaType: 'image' | 'video';
  createdAt: string;
}

export interface ThemeConfig {
  id: string;
  nome: string;
  headerBg: string;
  borderColor: string;
  btnPrimary: string;
  accentColor: string;
}

export interface AdminCredentials {
  email: string;
  phone: string;
  password: string;
  registeredAt?: string;
}

export interface SalonConfig {
  nomeSalao: string;
  logoUrl: string;
  bgHeaderUrl: string;
  temaKey: string;
  corCustom: string;
  profs: { nome: string; porc: number; id?: string }[];
}

export interface SalonApp {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerRg?: string;
  ownerCpf?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  createdAt: string;
  purchaseDate?: string;
  expiresAt?: string;
  planDays?: number; // Days valid (e.g., 30, 90, 365, 9999 for vitalicio)
  status: 'pending_approval' | 'active' | 'expired' | 'blocked';
  appCode: string;
  purchaseToken: string; // Token generated on purchase, acts as buyer's password
  emailSentAt?: string;
  config: SalonConfig;
}

export interface PurchaseRequest {
  id: string;
  buyerName: string;
  buyerRg: string;
  buyerCpf?: string;
  buyerEmail: string;
  buyerPhone: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  salonName: string;
  planDays: number;
  planName: string;
  price: string;
  generatedToken: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface AdminPaymentConfig {
  chavePix: string;
  nomeBeneficiario: string;
  bancoOuProcessador: string;
  cartaoContaDestino: string;
  instrucoesPagamento?: string;
}


