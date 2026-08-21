import { SalonConfig, ThemeConfig, Professional, ServiceItem, ClientRecord, Transaction, Appointment, CatalogMedia, SalonApp } from '../types';

export const THEMES: Record<string, ThemeConfig> = {
  rosa: { id: "rosa", nome: "💖 Rosa Chic", headerBg: "#db2777", borderColor: "#db2777", btnPrimary: "#ec4899", accentColor: "#f43f5e" },
  roxo: { id: "roxo", nome: "💜 Roxo Glamour", headerBg: "#7c3aed", borderColor: "#7c3aed", btnPrimary: "#8b5cf6", accentColor: "#a855f7" },
  azul: { id: "azul", nome: "🔵 Azul Elétrico", headerBg: "#2563eb", borderColor: "#2563eb", btnPrimary: "#3b82f6", accentColor: "#38bdf8" },
  verde: { id: "verde", nome: "💚 Verde Esmeralda", headerBg: "#059669", borderColor: "#059669", btnPrimary: "#10b981", accentColor: "#34d399" },
  laranja: { id: "laranja", nome: "🔥 Laranja Sunset", headerBg: "#ea580c", borderColor: "#ea580c", btnPrimary: "#f97316", accentColor: "#fb923c" },
  dourado: { id: "dourado", nome: "💛 Dourado Luxo", headerBg: "#d97706", borderColor: "#d97706", btnPrimary: "#f59e0b", accentColor: "#fbbf24" },
  magenta: { id: "magenta", nome: "🌺 Magenta Paixão", headerBg: "#e11d48", borderColor: "#e11d48", btnPrimary: "#f43f5e", accentColor: "#fb7185" },
  turquesa: { id: "turquesa", nome: "🩵 Turquesa Bright", headerBg: "#0891b2", borderColor: "#0891b2", btnPrimary: "#06b6d4", accentColor: "#22d3ee" },
  darkGold: { id: "darkGold", nome: "🖤 Dark Gold", headerBg: "#18181b", borderColor: "#f59e0b", btnPrimary: "#d97706", accentColor: "#f59e0b" },
  coral: { id: "coral", nome: "🍊 Coral Neon", headerBg: "#f43f5e", borderColor: "#f43f5e", btnPrimary: "#fb7185", accentColor: "#fda4af" }
};

export const DEFAULT_CONFIG: SalonConfig = {
  nomeSalao: "Controle Salão dos Parças",
  logoUrl: "",
  bgHeaderUrl: "",
  temaKey: "azul",
  corCustom: "#2563eb",
  profs: [
    { id: "prof-1", nome: "Michael", porc: 70 },
    { id: "prof-2", nome: "Marlon", porc: 30 }
  ],
  chavePix: "11973395723",
  tipoChavePix: "telefone",
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
};

export const DEFAULT_SALON_APPS: SalonApp[] = [
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
    purchaseToken: "TOK-PARCAS-2026",
    emailSentAt: "2026-01-10 14:30",
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
      chavePix: "11973395723",
      tipoChavePix: "telefone",
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
  },
  {
    id: "salon-beleza-chic",
    name: "Studio Beleza & Glamour Chic",
    ownerName: "Patricia Lima",
    ownerEmail: "patricia@studioglamour.com",
    ownerPhone: "(21) 98765-4321",
    ownerRg: "42.119.502-8",
    ownerCpf: "219.401.882-33",
    cep: "22041-001",
    logradouro: "Av. Nossa Senhora de Copacabana, 500",
    numero: "500",
    bairro: "Copacabana",
    cidade: "Rio de Janeiro",
    uf: "RJ",
    createdAt: "2026-02-15",
    purchaseDate: "2026-02-15",
    expiresAt: "2026-08-15",
    planDays: 180,
    status: "active",
    appCode: "SALAO-2",
    purchaseToken: "TOK-GLAMOUR-8812",
    emailSentAt: "2026-02-15 09:12",
    config: {
      nomeSalao: "Studio Beleza & Glamour Chic",
      logoUrl: "",
      bgHeaderUrl: "",
      temaKey: "rosa",
      corCustom: "#db2777",
      profs: [
        { id: "prof-p1", nome: "Patricia", porc: 60 },
        { id: "prof-p2", nome: "Renata", porc: 40 }
      ]
    }
  },
  {
    id: "salon-rota66",
    name: "Barbearia Vintage Rota 66",
    ownerName: "Carlos Eduardo (Kadu)",
    ownerEmail: "kadu@barbeariarota66.com",
    ownerPhone: "(41) 97654-3210",
    ownerRg: "29.840.112-X",
    ownerCpf: "109.332.901-44",
    cep: "80020-090",
    logradouro: "Rua das Flores, 120",
    numero: "120",
    bairro: "Centro",
    cidade: "Curitiba",
    uf: "PR",
    createdAt: "2026-03-20",
    purchaseDate: "2026-03-20",
    expiresAt: "2026-09-20",
    planDays: 180,
    status: "active",
    appCode: "SALAO-3",
    purchaseToken: "TOK-ROTA66-7731",
    emailSentAt: "2026-03-20 18:45",
    config: {
      nomeSalao: "Barbearia Vintage Rota 66",
      logoUrl: "",
      bgHeaderUrl: "",
      temaKey: "darkGold",
      corCustom: "#18181b",
      profs: [
        { id: "prof-k1", nome: "Kadu", porc: 60 },
        { id: "prof-k2", nome: "Rodrigo", porc: 40 }
      ]
    }
  },
  {
    id: "salon-espacovip",
    name: "Espaço VIP Estética & Noivas",
    ownerName: "Fernanda Alencar",
    ownerEmail: "noivas@espacovip.com.br",
    ownerPhone: "(31) 96543-2109",
    ownerRg: "50.123.890-4",
    ownerCpf: "402.991.023-55",
    cep: "30130-010",
    logradouro: "Av. Afonso Pena, 800",
    numero: "800",
    bairro: "Centro",
    cidade: "Belo Horizonte",
    uf: "MG",
    createdAt: "2026-04-05",
    purchaseDate: "2026-04-05",
    expiresAt: "2026-05-05",
    planDays: 30,
    status: "pending_approval",
    appCode: "SALAO-4",
    purchaseToken: "TOK-VIPNOIVAS-4091",
    emailSentAt: "2026-04-05 11:20",
    config: {
      nomeSalao: "Espaço VIP Estética & Noivas",
      logoUrl: "",
      bgHeaderUrl: "",
      temaKey: "roxo",
      corCustom: "#7c3aed",
      profs: [
        { id: "prof-f1", nome: "Fernanda", porc: 50 },
        { id: "prof-f2", nome: "Gisele", porc: 50 }
      ]
    }
  },
  {
    id: "salon-beleza-pura",
    name: "Salão Beleza Pura & Cia",
    ownerName: "Amanda Souza",
    ownerEmail: "amanda@belezapura.com",
    ownerPhone: "(71) 99123-4567",
    ownerRg: "18.390.221-9",
    ownerCpf: "512.890.312-77",
    cep: "40020-000",
    logradouro: "Praça da Sé, 45",
    numero: "45",
    bairro: "Pelourinho",
    cidade: "Salvador",
    uf: "BA",
    createdAt: "2026-04-10",
    purchaseDate: "2026-04-10",
    expiresAt: "2027-04-10",
    planDays: 365,
    status: "pending_approval",
    appCode: "SALAO-5",
    purchaseToken: "TOK-BELEZAPURA-5510",
    emailSentAt: "2026-04-10 16:15",
    config: {
      nomeSalao: "Salão Beleza Pura & Cia",
      logoUrl: "",
      bgHeaderUrl: "",
      temaKey: "verde",
      corCustom: "#059669",
      profs: [
        { id: "prof-a1", nome: "Amanda", porc: 70 },
        { id: "prof-a2", nome: "Jessica", porc: 30 }
      ]
    }
  }
];


export const DEFAULT_PROFESSIONALS: Professional[] = [
  { id: "prof-1", name: "Michael", commissionPercent: 70, role: "Cabeleireiro & Stylist", phone: "(11) 98877-6655", active: true },
  { id: "prof-2", name: "Marlon", commissionPercent: 30, role: "Barbeiro & Colorista", phone: "(11) 97766-5544", active: true },
  { id: "prof-3", name: "Camila", commissionPercent: 50, role: "Manicure & Pedicure", phone: "(11) 96655-4433", active: true },
  { id: "prof-4", name: "Juliana", commissionPercent: 60, role: "Esteticista & Maquiadora", phone: "(11) 95544-3322", active: true },
];

export const DEFAULT_SERVICES: ServiceItem[] = [
  { id: "srv-1", name: "Corte Feminino + Escova", category: "Cabelo", price: 120, durationMinutes: 60, defaultCommissionPercent: 70, description: "Corte moderno com lavagem e escova modeladora" },
  { id: "srv-2", name: "Corte Masculino + Barba", category: "Barbearia", price: 70, durationMinutes: 45, defaultCommissionPercent: 50, description: "Corte na tesoura/máquina com alinhamento de barba" },
  { id: "srv-3", name: "Unhas Pé e Mão (Gel)", category: "Unhas", price: 85, durationMinutes: 60, defaultCommissionPercent: 50, description: "Esmaltação completa e tratamento de cutículas" },
  { id: "srv-4", name: "Mechas & Mechas Iluminadas", category: "Coloração", price: 280, durationMinutes: 120, defaultCommissionPercent: 60, description: "Técnica de morena iluminada com matização" },
  { id: "srv-5", name: "Plano Mensal (Atendimento)", category: "Planos", price: 160, durationMinutes: 40, defaultCommissionPercent: 50, description: "Plano mensal de manutenção e alinhamento" },
  { id: "srv-6", name: "Hidratação Profunda Kérastase", category: "Tratamento", price: 150, durationMinutes: 45, defaultCommissionPercent: 60, description: "Tratamento intensivo para brilho e maciez" },
  { id: "srv-7", name: "Design de Sobrancelhas + Henna", category: "Estética", price: 55, durationMinutes: 30, defaultCommissionPercent: 50, description: "Mapeamento facial e pigmentação com henna" },
];

export const DEFAULT_CLIENTS: ClientRecord[] = [
  { id: "cli-1", name: "Ana Clara Silva", phone: "(11) 99123-4567", email: "anaclara@gmail.com", totalVisits: 8, totalSpent: 960, lastVisit: "2026-08-05", notes: "Prefere escova modelada para fora" },
  { id: "cli-2", name: "Lucas Fernandes", phone: "(11) 98234-5678", email: "lucas.f@hotmail.com", totalVisits: 12, totalSpent: 840, lastVisit: "2026-08-08", notes: "Barba desenhada com Toalha Quente" },
  { id: "cli-3", name: "Mariana Costa", phone: "(11) 97345-6789", email: "marianacosta@yahoo.com", totalVisits: 5, totalSpent: 750, lastVisit: "2026-08-01", notes: "Coloração tons frios" },
  { id: "cli-4", name: "Roberto Santos", phone: "(11) 96456-7890", email: "roberto.s@gmail.com", totalVisits: 15, totalSpent: 1050, lastVisit: "2026-08-09", notes: "Cliente vip, atende sempre de manhã" },
];

const todayISO = new Date().toISOString().split('T')[0];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "tx-1",
    date: todayISO,
    time: "10:15",
    description: "Corte Feminino + Escova",
    category: "Cabelo",
    grossAmount: 120,
    cardFeePercent: 0,
    netAmount: 120,
    paymentMethod: "pix",
    clientName: "Ana Clara Silva",
    commissions: [
      { professionalId: "prof-1", professionalName: "Michael", percentage: 70, amount: 84 },
      { professionalId: "prof-2", professionalName: "Marlon", percentage: 30, amount: 36 }
    ],
    createdBy: "admin"
  },
  {
    id: "tx-2",
    date: todayISO,
    time: "11:30",
    description: "Corte Masculino e Barba",
    category: "Barbearia",
    grossAmount: 70,
    cardFeePercent: 5,
    netAmount: 66.5,
    paymentMethod: "cartao_credito",
    clientName: "Lucas Fernandes",
    commissions: [
      { professionalId: "prof-1", professionalName: "Michael", percentage: 70, amount: 46.55 },
      { professionalId: "prof-2", professionalName: "Marlon", percentage: 30, amount: 19.95 }
    ],
    createdBy: "salao"
  },
  {
    id: "tx-3",
    date: todayISO,
    time: "14:00",
    description: "Plano Mensal (1/8 de R$ 160.00)",
    category: "Planos",
    grossAmount: 20,
    cardFeePercent: 0,
    netAmount: 20,
    paymentMethod: "pix",
    clientName: "Roberto Santos",
    commissions: [
      { professionalId: "prof-1", professionalName: "Michael", percentage: 70, amount: 14 },
      { professionalId: "prof-2", professionalName: "Marlon", percentage: 30, amount: 6 }
    ],
    createdBy: "admin"
  },
  {
    id: "tx-4",
    date: todayISO,
    time: "15:45",
    description: "Unhas Pé e Mão em Gel",
    category: "Unhas",
    grossAmount: 85,
    cardFeePercent: 0,
    netAmount: 85,
    paymentMethod: "dinheiro",
    clientName: "Camila Ribeiro",
    commissions: [
      { professionalId: "prof-1", professionalName: "Michael", percentage: 70, amount: 59.5 },
      { professionalId: "prof-2", professionalName: "Marlon", percentage: 30, amount: 25.5 }
    ],
    createdBy: "salao"
  }
];

export const DEFAULT_TIMESLOTS = [
  "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"
];

export const INITIAL_APPOINTMENTS: Record<string, Record<string, Appointment>> = {
  [todayISO]: {
    "10:00": {
      id: "ap-1",
      date: todayISO,
      timeSlot: "10:00",
      status: "concluido",
      clientName: "Ana Clara Silva",
      clientPhone: "(11) 99123-4567",
      serviceName: "Corte Feminino + Escova",
      professionalId: "prof-1",
      professionalName: "Michael",
      price: 120,
      origem: "admin"
    },
    "11:00": {
      id: "ap-2",
      date: todayISO,
      timeSlot: "11:00",
      status: "concluido",
      clientName: "Lucas Fernandes",
      clientPhone: "(11) 98234-5678",
      serviceName: "Corte Masculino + Barba",
      professionalId: "prof-2",
      professionalName: "Marlon",
      price: 70,
      origem: "salao"
    },
    "13:00": {
      id: "ap-3",
      date: todayISO,
      timeSlot: "13:00",
      status: "bloqueado",
      notes: "Horário de Almoço da Equipe",
      professionalName: "Todos os Profissionais",
      origem: "admin"
    },
    "15:00": {
      id: "ap-4",
      date: todayISO,
      timeSlot: "15:00",
      status: "agendado",
      clientName: "Mariana Costa",
      clientPhone: "(11) 97345-6789",
      serviceName: "Mechas & Mechas Iluminadas",
      professionalId: "prof-1",
      professionalName: "Michael",
      price: 280,
      origem: "salao"
    },
    "17:00": {
      id: "ap-5",
      date: todayISO,
      timeSlot: "17:00",
      status: "agendado",
      clientName: "Roberto Santos",
      clientPhone: "(11) 96456-7890",
      serviceName: "Corte Masculino + Barba",
      professionalId: "prof-2",
      professionalName: "Marlon",
      price: 70,
      origem: "admin"
    }
  }
};

export const INITIAL_CATALOG: Record<string, CatalogMedia[]> = {
  salao: [
    { id: "cat-s1", folder: "salao", url: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80", title: "Fachada & Recepção do Salão", description: "Ambiente climatizado e aconchegante", mediaType: "image", createdAt: todayISO },
    { id: "cat-s2", folder: "salao", url: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=600&q=80", title: "Bancadas & Equipamentos", description: "Equipamentos esterilizados de ponta", mediaType: "image", createdAt: todayISO }
  ],
  cliente: [
    { id: "cat-c1", folder: "cliente", url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80", title: "Resultado de Atendimento - Ana Clara", description: "Corte e finalização especial", price: 120, mediaType: "image", createdAt: todayISO }
  ],
  portfolio: [
    { id: "cat-5", folder: "portfolio", url: "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=600&q=80", title: "Penteado Noiva & Festa", description: "Produção completa para noivas e formandas", price: 250, mediaType: "image", createdAt: todayISO },
    { id: "cat-6", folder: "portfolio", url: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=600&q=80", title: "Corte Fade Moderno", description: "Degradê navalhado com alinhamento", price: 65, mediaType: "image", createdAt: todayISO }
  ],
  higiene: [
    { id: "cat-3", folder: "higiene", url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80", title: "Linha Capilar Profissional", description: "Shampoo e máscara hidratante reconstrutora", price: 89.90, mediaType: "image", createdAt: todayISO },
    { id: "cat-4", folder: "higiene", url: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=600&q=80", title: "Óleos Essenciais e Serums", description: "Serum reparador de pontas com óleo de argan", price: 45.00, mediaType: "image", createdAt: todayISO }
  ],
  roupas: [
    { id: "cat-1", folder: "roupas", url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80", title: "Look Verão Elegante", description: "Vestido casual em tecido premium", price: 159.90, mediaType: "image", createdAt: todayISO },
    { id: "cat-2", folder: "roupas", url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=80", title: "Coleção Acessórios Ouro", description: "Brincos e colares folheados", price: 79.90, mediaType: "image", createdAt: todayISO }
  ],
  diversos: [
    { id: "cat-7", folder: "diversos", url: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80", title: "Documentos & Imagens Gerais", description: "Informativos e tabela de horários", mediaType: "image", createdAt: todayISO }
  ]
};
