import { SalonApp } from '../types';
import { Storage } from './storage';

export interface SalonLicenseInfo {
  isTrial: boolean;
  daysRemaining: number;
  isExpiredOrBlocked: boolean;
  daysUsed: number;
  totalDays: number;
  formattedExpiresAt: string;
  badgeLabel: string;
  badgeColor: 'emerald' | 'amber' | 'rose' | 'blue';
  hasCpfUsedTrialBefore: boolean;
}

export interface TrialEligibilityCheck {
  eligible: boolean;
  reason?: string;
  matchedField?: 'cpf' | 'rg' | 'phone' | 'email' | 'address';
  matchedValue?: string;
}

/**
 * Normalizes text for reliable matching
 */
function cleanDigits(val?: string | null): string {
  return (val || '').replace(/\D/g, '').trim();
}

function cleanAlphaNum(val?: string | null): string {
  return (val || '').replace(/[^a-zA-Z0-9]/g, '').trim().toUpperCase();
}

function cleanEmailStr(val?: string | null): string {
  return (val || '').trim().toLowerCase();
}

/**
 * Strict check: Ensures that no owner data (CPF, RG, Phone, Email, or Address)
 * can ever register for the 15-day free trial more than once.
 */
export function checkTrialEligibility(
  data: {
    cpf?: string;
    rg?: string;
    phone?: string;
    email?: string;
    cep?: string;
    logradouro?: string;
    numero?: string;
  },
  currentSalonId?: string
): TrialEligibilityCheck {
  const salons = Storage.getSalons();

  const reqCpf = cleanDigits(data.cpf);
  const reqRg = cleanAlphaNum(data.rg);
  const reqPhone = cleanDigits(data.phone);
  const reqEmail = cleanEmailStr(data.email);
  const reqCep = cleanDigits(data.cep);
  const reqLogradouro = cleanAlphaNum(data.logradouro);
  const reqNumero = cleanAlphaNum(data.numero);

  for (const s of salons) {
    if (currentSalonId && s.id === currentSalonId) continue;

    // Check if the salon was registered as a trial or has trial record
    const hasUsedTrial = s.isTrial === true || s.planDays === 15 || s.trialStartedAt || s.status === 'trial';
    
    // We treat any matching identity on existing salons as already registered
    const sCpf = cleanDigits(s.ownerCpf);
    if (reqCpf && sCpf && reqCpf === sCpf) {
      return {
        eligible: false,
        reason: `O CPF informado (${data.cpf}) já utilizou o período de 15 dias gratuitos no salão "${s.name}".`,
        matchedField: 'cpf',
        matchedValue: data.cpf,
      };
    }

    const sRg = cleanAlphaNum(s.ownerRg);
    if (reqRg && sRg && reqRg === sRg) {
      return {
        eligible: false,
        reason: `O RG informado (${data.rg}) já foi utilizado para ativar o teste gratuito no salão "${s.name}".`,
        matchedField: 'rg',
        matchedValue: data.rg,
      };
    }

    const sPhone = cleanDigits(s.ownerPhone);
    // Compare last 8 or 9 digits if valid phone
    if (reqPhone && sPhone && (reqPhone === sPhone || (reqPhone.length >= 8 && sPhone.endsWith(reqPhone.slice(-8))))) {
      return {
        eligible: false,
        reason: `O telefone/WhatsApp informado (${data.phone}) já foi utilizado no período de teste gratuito do salão "${s.name}".`,
        matchedField: 'phone',
        matchedValue: data.phone,
      };
    }

    const sEmail = cleanEmailStr(s.ownerEmail);
    if (reqEmail && sEmail && reqEmail === sEmail) {
      return {
        eligible: false,
        reason: `O e-mail informado (${data.email}) já possui um teste gratuito de 15 dias cadastrado no salão "${s.name}".`,
        matchedField: 'email',
        matchedValue: data.email,
      };
    }

    // Address verification: CEP + Número or Logradouro + Número
    const sCep = cleanDigits(s.cep);
    const sNumero = cleanAlphaNum(s.numero);
    const sLogradouro = cleanAlphaNum(s.logradouro);

    if (reqNumero && sNumero && reqNumero === sNumero) {
      if (reqCep && sCep && reqCep === sCep) {
        return {
          eligible: false,
          reason: `O endereço informado (CEP ${data.cep}, Nº ${data.numero}) já foi cadastrado para teste gratuito no salão "${s.name}".`,
          matchedField: 'address',
          matchedValue: `${data.cep} nº ${data.numero}`,
        };
      }
      if (reqLogradouro && sLogradouro && reqLogradouro.length > 4 && sLogradouro.includes(reqLogradouro)) {
        return {
          eligible: false,
          reason: `O endereço informado (${data.logradouro}, Nº ${data.numero}) já foi cadastrado para teste gratuito no salão "${s.name}".`,
          matchedField: 'address',
          matchedValue: `${data.logradouro} nº ${data.numero}`,
        };
      }
    }
  }

  return { eligible: true };
}

/**
 * Checks if a CPF has ever registered or used a 15-day trial before.
 * Each CPF is strictly limited to 1 trial in a lifetime.
 */
export function hasCpfUsedTrial(cpf: string, currentSalonId?: string): boolean {
  return !checkTrialEligibility({ cpf }, currentSalonId).eligible;
}

/**
 * Calculates accurate license state, trial state (15 days), and expiration
 */
export function getSalonLicenseInfo(salon: SalonApp | undefined | null): SalonLicenseInfo {
  if (!salon) {
    return {
      isTrial: false,
      daysRemaining: 0,
      isExpiredOrBlocked: false,
      daysUsed: 0,
      totalDays: 30,
      formattedExpiresAt: 'N/A',
      badgeLabel: 'Ativo',
      badgeColor: 'emerald',
      hasCpfUsedTrialBefore: false,
    };
  }

  const isTrial = salon.isTrial === true || salon.planDays === 15 || salon.status === 'trial';
  const totalDays = salon.planDays || (isTrial ? 15 : 30);

  // Reference creation/start date
  const startDateStr = salon.trialStartedAt || salon.purchaseDate || salon.createdAt || new Date().toISOString().split('T')[0];
  const startDate = new Date(startDateStr);
  const now = new Date();

  // If explicit expiresAt is defined
  let expiresAtDate: Date;
  if (salon.expiresAt) {
    expiresAtDate = new Date(salon.expiresAt);
  } else {
    expiresAtDate = new Date(startDate);
    expiresAtDate.setDate(expiresAtDate.getDate() + totalDays);
  }

  // Calculate day difference (normalized to midnight to count full calendar days)
  const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expDateOnly = new Date(expiresAtDate.getFullYear(), expiresAtDate.getMonth(), expiresAtDate.getDate());
  const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUsed = Math.max(0, Math.floor((nowDateOnly.getTime() - startDateOnly.getTime()) / msPerDay));
  const daysRemaining = Math.max(0, Math.ceil((expDateOnly.getTime() - nowDateOnly.getTime()) / msPerDay));

  const isTimeExpired = nowDateOnly.getTime() > expDateOnly.getTime();
  const isExpiredOrBlocked = salon.status === 'blocked' || salon.status === 'expired' || isTimeExpired;

  const formattedExpiresAt = expiresAtDate.toLocaleDateString('pt-BR');

  let badgeLabel = '';
  let badgeColor: 'emerald' | 'amber' | 'rose' | 'blue' = 'emerald';

  if (salon.status === 'blocked') {
    badgeLabel = 'Bloqueado';
    badgeColor = 'rose';
  } else if (isExpiredOrBlocked) {
    badgeLabel = isTrial ? '15 Dias Gratuitos Expirados (Bloqueado)' : 'Licença Vencida (Bloqueado)';
    badgeColor = 'rose';
  } else if (isTrial) {
    badgeLabel = `${daysRemaining} ${daysRemaining === 1 ? 'dia gratuito restante' : 'dias gratuitos restantes'} (Período de Teste)`;
    badgeColor = daysRemaining <= 3 ? 'amber' : 'blue';
  } else {
    badgeLabel = `${daysRemaining} ${daysRemaining === 1 ? 'dia de licença' : 'dias de licença'}`;
    badgeColor = daysRemaining <= 5 ? 'amber' : 'emerald';
  }

  const cleanCpf = (salon.ownerCpf || '').replace(/\D/g, '').trim();
  const hasCpfUsedTrialBefore = hasCpfUsedTrial(cleanCpf, salon.id);

  return {
    isTrial,
    daysRemaining,
    isExpiredOrBlocked,
    daysUsed,
    totalDays,
    formattedExpiresAt,
    badgeLabel,
    badgeColor,
    hasCpfUsedTrialBefore,
  };
}
