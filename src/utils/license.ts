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
 * Checks if a given CPF belongs to a registered Administrator
 */
export function isAdminCpf(cpf?: string | null): boolean {
  if (!cpf) return false;
  const clean = cleanDigits(cpf);
  if (!clean) return false;

  const adminList = Storage.getAdminCredentialsList();
  const master = Storage.getAdminCredentials();

  const allAdmins = [...adminList];
  if (master && !allAdmins.some(a => cleanDigits(a.cpf) === cleanDigits(master.cpf))) {
    allAdmins.push(master);
  }

  return allAdmins.some(admin => {
    const adminCpfDigits = cleanDigits(admin.cpf);
    return Boolean(adminCpfDigits && adminCpfDigits === clean);
  });
}

/**
 * Checks if any given identifier (CPF, email, or phone) matches a registered Administrator
 */
export function isAdminIdentifier(data: { cpf?: string; email?: string; phone?: string }): boolean {
  const reqCpf = cleanDigits(data.cpf);
  const reqEmail = cleanEmailStr(data.email);
  const reqPhone = cleanDigits(data.phone);

  const adminList = Storage.getAdminCredentialsList();
  const master = Storage.getAdminCredentials();

  const allAdmins = [...adminList];
  if (master && !allAdmins.some(a => cleanDigits(a.cpf) === cleanDigits(master.cpf))) {
    allAdmins.push(master);
  }

  return allAdmins.some(admin => {
    const aCpf = cleanDigits(admin.cpf);
    const aEmail = cleanEmailStr(admin.email);
    const aPhone = cleanDigits(admin.phone);

    if (reqCpf && aCpf && reqCpf === aCpf) return true;
    if (reqEmail && aEmail && reqEmail === aEmail) return true;
    if (reqPhone && aPhone && (reqPhone === aPhone || (reqPhone.length >= 8 && aPhone.endsWith(reqPhone.slice(-8))))) return true;
    return false;
  });
}

/**
 * Strict check: Ensures that regular users (non-admin) can only use the 7-day trial ONCE per CPF.
 * Administrators registered with CPF and password have UNLIMITED access to trials whenever needed.
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
  currentSalonId?: string,
  userRole?: string
): TrialEligibilityCheck {
  // If the user has active admin role, admin session, or is a registered Administrator:
  // Administradores possuem liberação total e ilimitada para utilizar os testes gratuitos sempre que necessário.
  const isSessionAdmin = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('salao_admin_authenticated') === 'true';
  if (userRole === 'admin' || isSessionAdmin || isAdminIdentifier(data)) {
    return { eligible: true };
  }

  const reqCpf = cleanDigits(data.cpf);

  // 1. Direct Used Trial CPFs verification (persisted across sessions and sync)
  if (reqCpf && reqCpf.length >= 11) {
    const usedCpfs = Storage.getUsedTrialCpfs();
    if (usedCpfs.includes(reqCpf)) {
      return {
        eligible: false,
        reason: `O CPF informado (${data.cpf}) já utilizou o período de 7 dias gratuitos anteriormente. Cada CPF só pode utilizar o teste grátis 1 única vez.`,
        matchedField: 'cpf',
        matchedValue: data.cpf,
      };
    }
  }

  const salons = Storage.getSalons();

  const reqRg = cleanAlphaNum(data.rg);
  const reqPhone = cleanDigits(data.phone);
  const reqEmail = cleanEmailStr(data.email);
  const reqCep = cleanDigits(data.cep);
  const reqLogradouro = cleanAlphaNum(data.logradouro);
  const reqNumero = cleanAlphaNum(data.numero);

  for (const s of salons) {
    if (currentSalonId && s.id === currentSalonId) continue;

    // Check if the salon was registered with this CPF
    const sCpf = cleanDigits(s.ownerCpf);
    if (reqCpf && sCpf && reqCpf === sCpf) {
      return {
        eligible: false,
        reason: `O CPF informado (${data.cpf}) já possui cadastro com período gratuito utilizado no salão "${s.name}". Cada CPF só pode utilizar os 7 dias grátis 1 única vez.`,
        matchedField: 'cpf',
        matchedValue: data.cpf,
      };
    }

    const sRg = cleanAlphaNum(s.ownerRg);
    if (reqRg && sRg && reqRg === sRg && reqRg !== 'ISENTO') {
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
        reason: `O e-mail informado (${data.email}) já possui um teste gratuito cadastrado no salão "${s.name}".`,
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
 * Checks if a CPF has ever registered or used a 7-day trial before.
 * Non-admin CPFs are strictly limited to 1 trial.
 * Admin CPFs have unlimited access and return false (never blocked).
 */
export function hasCpfUsedTrial(cpf: string, currentSalonId?: string, userRole?: string): boolean {
  const isSessionAdmin = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('salao_admin_authenticated') === 'true';
  if (userRole === 'admin' || isSessionAdmin || isAdminCpf(cpf)) {
    return false;
  }
  const clean = cleanDigits(cpf);
  if (!clean || clean.length < 11) {
    return false;
  }
  return !checkTrialEligibility({ cpf: clean }, currentSalonId, userRole).eligible;
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
  const rawRemaining = Math.max(0, Math.ceil((expDateOnly.getTime() - nowDateOnly.getTime()) / msPerDay));
  
  const isTimeExpired = (salon.planDays === 0) || (nowDateOnly.getTime() > expDateOnly.getTime()) || (expDateOnly.getTime() <= nowDateOnly.getTime() && rawRemaining <= 0);
  const isExpiredOrBlocked = salon.status === 'blocked' || salon.status === 'expired' || isTimeExpired;
  const daysRemaining = (salon.planDays === 0 || isExpiredOrBlocked) ? 0 : rawRemaining;

  const formattedExpiresAt = expiresAtDate.toLocaleDateString('pt-BR');

  let badgeLabel = '';
  let badgeColor: 'emerald' | 'amber' | 'rose' | 'blue' = 'emerald';

  if (salon.status === 'blocked') {
    badgeLabel = 'Bloqueado';
    badgeColor = 'rose';
  } else if (isExpiredOrBlocked) {
    badgeLabel = isTrial ? 'Período Gratuito Expirado (Bloqueado)' : 'Licença Vencida (Bloqueado)';
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
