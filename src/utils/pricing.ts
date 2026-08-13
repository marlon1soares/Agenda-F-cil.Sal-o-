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
}

export function formatBRL(val: number): string {
  if (isNaN(val) || val === undefined || val === null) return 'R$ 0,00';
  return `R$ ${val.toFixed(2).replace('.', ',')}`;
}

export function calculateDefaultPricesFromBase(base30: number): {
  p30: number;
  p90: number;
  p180: number;
  p365: number;
} {
  const base = isNaN(base30) || base30 <= 0 ? 30 : base30;
  return {
    p30: Number(base.toFixed(2)),
    p90: Number((base * 2.5).toFixed(2)),
    p180: Number((base * 4.5).toFixed(2)),
    p365: Number((base * 8).toFixed(2)),
  };
}

export function getCalculatedLicensePlans(configOrBase?: AdminPaymentConfig | number): LicensePlan[] {
  let p30 = 30;
  let p90 = 75;
  let p180 = 135;
  let p365 = 240;

  if (typeof configOrBase === 'number') {
    const calculated = calculateDefaultPricesFromBase(configOrBase);
    p30 = calculated.p30;
    p90 = calculated.p90;
    p180 = calculated.p180;
    p365 = calculated.p365;
  } else if (configOrBase && typeof configOrBase === 'object') {
    const base = Number(configOrBase.precoPlano30Dias) || 30;
    p30 = base;
    p90 = (configOrBase.precoPlano90Dias !== undefined && configOrBase.precoPlano90Dias !== null && Number(configOrBase.precoPlano90Dias) > 0)
      ? Number(configOrBase.precoPlano90Dias)
      : Number((base * 2.5).toFixed(2));
    p180 = (configOrBase.precoPlano180Dias !== undefined && configOrBase.precoPlano180Dias !== null && Number(configOrBase.precoPlano180Dias) > 0)
      ? Number(configOrBase.precoPlano180Dias)
      : Number((base * 4.5).toFixed(2));
    p365 = (configOrBase.precoPlano365Dias !== undefined && configOrBase.precoPlano365Dias !== null && Number(configOrBase.precoPlano365Dias) > 0)
      ? Number(configOrBase.precoPlano365Dias)
      : Number((base * 8).toFixed(2));
  }

  return [
    {
      days: 30,
      label: '30 Dias',
      shortLabel: '30 Dias (Mensal)',
      priceStr: formatBRL(p30),
      numVal: p30,
      monthlyEquivalentStr: `${formatBRL(p30)} / mês`,
      detail: 'Mensal',
      tag: 'À vista',
      badge: 'À vista',
      maxInstallments: 1,
    },
    {
      days: 90,
      label: '3 Meses',
      shortLabel: '3 Meses (Trimestral)',
      priceStr: formatBRL(p90),
      numVal: p90,
      monthlyEquivalentStr: `${formatBRL(p90 / 3)} / mês`,
      detail: `${formatBRL(p90 / 3)} / mês`,
      tag: 'À vista',
      badge: 'À vista',
      maxInstallments: 1,
    },
    {
      days: 180,
      label: '6 Meses',
      shortLabel: '6 Meses (Semestral)',
      priceStr: formatBRL(p180),
      numVal: p180,
      monthlyEquivalentStr: `${formatBRL(p180 / 6)} / mês`,
      detail: `${formatBRL(p180 / 6)} / mês`,
      tag: 'Até 6x (3x S/ Juros)',
      badge: 'Até 6x (3x S/ Juros)',
      maxInstallments: 6,
    },
    {
      days: 365,
      label: '1 Anual',
      shortLabel: '1 Anual (12 Meses)',
      priceStr: formatBRL(p365),
      numVal: p365,
      monthlyEquivalentStr: `${formatBRL(p365 / 12)} / mês`,
      detail: `${formatBRL(p365 / 12)} / mês`,
      tag: 'Até 6x (3x S/ Juros)',
      badge: 'Até 6x (3x S/ Juros)',
      maxInstallments: 6,
    },
  ];
}

export function getLicensePlanByDays(days: number, configOrBase?: AdminPaymentConfig | number): LicensePlan {
  const plans = getCalculatedLicensePlans(configOrBase);
  const found = plans.find((p) => p.days === days);
  return found || plans[0];
}
