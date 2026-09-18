export type UserRole = 'admin' | 'salao' | 'funcionario' | 'cliente';

export type PaymentMethod = 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'plano_mensal' | 'outro';

export interface StaffCommission {
  professionalId: string;
  professionalName: string;
  percentage: number;
  amount: number;
}

export interface Transaction {
  id: string;
  salonId?: string;
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
  status?: 'ativo' | 'cancelado';
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: UserRole;
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
  cpf?: string;
  password?: string;
  avatarUrl?: string;
  active: boolean;
}

export type FechamentoPeriodType = 'diario' | 'quinzenal_1' | 'quinzenal_2' | 'mensal' | 'personalizado';

export interface EmployeeFechamentoRecord {
  id: string;
  salonId?: string;
  professionalId: string;
  professionalName: string;
  periodType: FechamentoPeriodType;
  periodLabel: string;
  startDate: string;
  endDate: string;
  totalDaysWorked: number;
  totalClientsServed: number;
  grossAmount: number;
  commissionPercent: number;
  netCommissionAmount: number;
  status: 'pendente' | 'pago' | 'fechado';
  createdAt: string;
  paidAt?: string;
  notes?: string;
}

export interface CaixaFechamentoCiclo {
  id: string;
  salonId: string;
  salonName: string;
  cycleNumber?: number;
  closedAt: string; // ISO string
  closedAtFormatted: string; // e.g. "16/09/2026 às 14:35"
  date: string; // YYYY-MM-DD
  totalGross: number;
  totalNet: number;
  totalCommissions: number;
  activeCount: number;
  cancelledCount: number;
  commissionsByProf: {
    professionalName: string;
    amount: number;
    count: number;
  }[];
  paymentMethodsSummary: {
    method: PaymentMethod;
    total: number;
    count: number;
  }[];
  transactions: Transaction[];
  clearedBy: UserRole;
  notes?: string;
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
  cpf?: string;
  email?: string;
  phone: string;
  password: string;
  registeredAt?: string;
}

export interface DayScheduleRule {
  active: boolean; // true = aberto, false = fechado/folga
  startTime: string; // HH:mm ex: "08:00", "09:00", "10:00"
  endTime: string; // HH:mm ex: "18:00", "19:00", "20:00", "22:00"
  slotIntervalMinutes: number; // 30, 45, 60
  customLabel?: string; // ex: "Abre mais tarde", "Sai mais cedo", "Folga"
}

export interface ScheduleConfig {
  defaultStartTime: string; // HH:mm ex: "09:00"
  defaultEndTime: string; // HH:mm ex: "20:00"
  defaultIntervalMinutes: number; // 30, 45, 60
  weeklySchedule: Record<number, DayScheduleRule>; // 0=Domingo ... 6=Sábado
  specificDateSchedule: Record<string, DayScheduleRule>; // YYYY-MM-DD -> Rule
}

export interface SalonConfig {
  nomeSalao: string;
  logoUrl: string;
  bgHeaderUrl: string;
  temaKey: string;
  corCustom: string;
  profs: { nome: string; porc: number; id?: string }[];
  
  // Schedule & Working Hours Configuration
  scheduleConfig?: ScheduleConfig;

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

export interface VideoTutorialChapterConfig {
  id: number;
  title: string;
  shortTitle: string;
  duration: number; // in seconds
  badge: string;
  headline: string;
  narration: string;
  points: string[];
}

export interface VideoTutorialConfig {
  youtubeUrl: string; // e.g. https://www.youtube.com/watch?v=...
  customVideoUrl?: string; // Direct mp4/video or embed link
  videoTitle?: string;
  useInteractivePlayer?: boolean; // Show simulated screen interactive video player
  chapters?: VideoTutorialChapterConfig[];
}

export interface AdminPaymentConfig {
  chavePix: string;
  nomeBeneficiario: string;
  bancoOuProcessador: string;
  cartaoContaDestino: string;
  instrucoesPagamento?: string;
  productionUrl?: string; // e.g. https://agenda-f-cil-sal-o.vercel.app
  diasGratuitos?: number; // Configuração dos dias gratuitos (padrão: 15 dias, ex: 7, 15, 30)
  habilitarPlanoGratuito?: boolean; // Habilitar ou desabilitar opção de teste gratuito
  precoPlano30Dias?: number; // Plano 1: 30 Dias (padrão: 30.00)
  precoPlano90Dias?: number; // Plano 2: 3 Meses / 90 Dias (padrão: 90.00)
  linkMercadoPago30?: string; // Link de Checkout Oficial Mercado Pago R$ 30 (ex: https://mpago.la/138bXFn)
  linkMercadoPago90?: string; // Link de Checkout Oficial Mercado Pago R$ 90 (ex: https://mpago.la/29DGt6q)
  precoPlano180Dias?: number; // Legado
  precoPlano365Dias?: number; // Legado
  videoTutorialConfig?: VideoTutorialConfig; // Configuração do Vídeo Tutorial & Narração pelo Administrador
  // Webhook Security & Gateway Integration (HMAC-SHA256 & PCI-DSS)
  webhookSecret?: string;
  webhookUrl?: string;
  gatewayProvider?: 'mercadopago' | 'asaas' | 'efi_bank' | 'bacen_pix_direct' | 'personalizado';
  mercadopagoAccessToken?: string; // Access Token Oficial do Mercado Pago para gerar Pix Dinâmico e receber baixa bancária instantânea
  mercadopagoPublicKey?: string; // Chave Pública do Mercado Pago (Public Key)
  mercadopagoClientId?: string; // Client ID do Mercado Pago
  mercadopagoClientSecret?: string; // Client Secret do Mercado Pago
  asaasApiKey?: string; // Chave de API do Asaas para recebimento Pix e baixa automática
  bacenPixClientId?: string;
  bacenPixCertificateConfigured?: boolean;
}

export interface ChatMessage {
  id: string;
  salonId?: string;
  salonName?: string;
  fromRole: UserRole;
  toRole: UserRole | 'todos';
  senderName: string;
  senderPhone?: string;
  clientPhone?: string;
  content: string;
  timestamp: string; // HH:mm
  date: string; // YYYY-MM-DD
  createdAt: number;
  read?: boolean;
  type?: 'chat' | 'booking_alert' | 'status_update' | 'admin_announcement';
}

export interface SystemBroadcastNotice {
  id: string;
  title: string;
  message: string;
  fromRole: UserRole;
  target: 'todos' | 'saloes' | 'clientes';
  createdAt: string;
  urgent?: boolean;
}

export interface LivePresenceUser {
  id: string;
  name: string;
  role: UserRole;
  salonId?: string;
  salonName?: string;
  lastSeen: number;
  status: 'online' | 'em_atendimento' | 'disponivel';
}


