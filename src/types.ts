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
  price?: number | string;
  stock?: number | string;
  description?: string;
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
  
  // Payment receiving config for store & catalog (unified for all products)
  chavePix?: string;
  tipoChavePix?: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';
  titularPix?: string;
  cidadePix?: string;
  
  // Bank Account for Credit Card Receipts / Deposits
  bancoCartao?: string;
  agenciaCartao?: string;
  contaCartao?: string;
  tipoContaCartao?: 'corrente' | 'poupanca' | 'pagamento';
  titularCartao?: string;
  cpfCnpjCartao?: string;
  linkCartao?: string;
  instrucoesPagamento?: string;
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
  planDays?: number; // Days valid (e.g., 15 for trial, 30, 90, 180, 365)
  isTrial?: boolean; // Indicates if this salon was registered as a 15-day free trial
  trialStartedAt?: string; // Date when 15 days free trial started
  status: 'pending_approval' | 'active' | 'trial' | 'expired' | 'blocked';
  appCode: string;
  purchaseToken: string; // Token generated on purchase or trial, acts as buyer's password
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
  productionUrl?: string; // e.g. https://agenda-f-cil-sal-o.vercel.app
  precoPlano30Dias?: number; // 30 Dias (padrão: 30.00)
  precoPlano90Dias?: number; // 3 Meses (padrão: 75.00)
  precoPlano180Dias?: number; // 6 Meses (padrão: 135.00)
  precoPlano365Dias?: number; // 1 Ano (padrão: 240.00)
}


