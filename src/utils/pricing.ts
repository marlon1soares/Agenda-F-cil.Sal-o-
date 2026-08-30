import { AdminPaymentConfig } from '../types';

export interface LicensePlan {
  days: number;
  label: string;
  shortLabel: string;
  priceStr: string;
  numVal: number;
  monthlyEquivalentStr: string;
  detail: string;
  tag: string;
  badge: string;
  maxInstallments: number;
  paymentLink?: string;
}

export function formatBRL(val?: number | string | null): string {
  if (val === undefined || val === null) return 'R$ 0,00';
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) return 'R$ 0,00';
  return `R$ ${num.toFixed(2).replace('.', ',')}`;
}

export function calculateDefaultPricesFromBase(base30: number): {
  p30: number;
  p90: number;
} {
  const base = isNaN(base30) || base30 <= 0 ? 30 : base30;
  return {
    p30: Number(base.toFixed(2)),
    p90: Number((base * 3).toFixed(2)),
  };
}

export function getCalculatedLicensePlans(
  configOrBase?: AdminPaymentConfig | number,
  includeTrial: boolean = true
): LicensePlan[] {
  let p30 = 30;
  let p90 = 90;
  let link30 = 'https://mpago.la/138bXFn';
  let link90 = 'https://mpago.la/29DGt6q';
  let trialDays = 7;
  let isTrialEnabled = true;

  if (typeof configOrBase === 'number') {
    const calculated = calculateDefaultPricesFromBase(configOrBase);
    p30 = calculated.p30;
    p90 = calculated.p90;
  } else if (configOrBase && typeof configOrBase === 'object') {
    const base = Number(configOrBase.precoPlano30Dias) || 30;
    p30 = base;
    p90 = (configOrBase.precoPlano90Dias !== undefined && configOrBase.precoPlano90Dias !== null && Number(configOrBase.precoPlano90Dias) > 0)
      ? Number(configOrBase.precoPlano90Dias)
      : Number((base * 3).toFixed(2));

    if (configOrBase.linkMercadoPago30) {
      link30 = configOrBase.linkMercadoPago30;
    }
    if (configOrBase.linkMercadoPago90) {
      link90 = configOrBase.linkMercadoPago90;
    }

    if (configOrBase.diasGratuitos !== undefined && configOrBase.diasGratuitos !== null && Number(configOrBase.diasGratuitos) > 0) {
      trialDays = Number(configOrBase.diasGratuitos);
    }
    if (configOrBase.habilitarPlanoGratuito === false) {
      isTrialEnabled = false;
    }
  }

  const plans: LicensePlan[] = [];

  if (includeTrial && isTrialEnabled) {
    plans.push({
      days: trialDays,
      label: `${trialDays} Dias (Grátis)`,
      shortLabel: `${trialDays} Dias (Teste Gratuito)`,
      priceStr: 'Grátis (R$ 0)',
      numVal: 0,
      monthlyEquivalentStr: `${trialDays} Dias Sem Custo`,
      detail: 'Teste Gratuito',
      tag: '1x por Cadastro',
      badge: `${trialDays} Dias Grátis`,
      maxInstallments: 1,
    });
  }

  plans.push(
    {
      days: 30,
      label: 'Plano 1 (30 Dias)',
      shortLabel: 'Plano 1 - 30 Dias (Mensal)',
      priceStr: formatBRL(p30),
      numVal: p30,
      monthlyEquivalentStr: `${formatBRL(p30)} / mês`,
      detail: 'Mensal (À vista)',
      tag: 'Plano 1 (R$ 30)',
      badge: 'Plano 1 (30 Dias)',
      maxInstallments: 1,
      paymentLink: link30,
    },
    {
      days: 90,
      label: 'Plano 2 (3 Meses)',
      shortLabel: 'Plano 2 - 3 Meses (Trimestral)',
      priceStr: formatBRL(p90),
      numVal: p90,
      monthlyEquivalentStr: `${formatBRL(p90 / 3)} / mês`,
      detail: `${formatBRL(p90 / 3)} / mês`,
      tag: 'Plano 2 (R$ 90)',
      badge: 'Plano 2 (3 Meses)',
      maxInstallments: 1,
      paymentLink: link90,
    }
  );

  return plans;
}

export function getLicensePlanByDays(days: number, configOrBase?: AdminPaymentConfig | number): LicensePlan {
  const plans = getCalculatedLicensePlans(configOrBase);
  const found = plans.find((p) => p.days === days);
  return found || plans[0];
}
