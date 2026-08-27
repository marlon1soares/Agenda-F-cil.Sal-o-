import { ScheduleConfig, DayScheduleRule } from '../types';
import { DEFAULT_TIMESLOTS } from '../data/mockData';

export const DEFAULT_WEEKLY_SCHEDULE: Record<number, DayScheduleRule> = {
  0: { active: false, startTime: '10:00', endTime: '16:00', slotIntervalMinutes: 60, customLabel: 'Domingo (Fechado)' }, // Domingo
  1: { active: true, startTime: '09:00', endTime: '19:00', slotIntervalMinutes: 60, customLabel: 'Segunda-feira' }, // Segunda
  2: { active: true, startTime: '09:00', endTime: '20:00', slotIntervalMinutes: 60, customLabel: 'Terça-feira' }, // Terça
  3: { active: true, startTime: '09:00', endTime: '20:00', slotIntervalMinutes: 60, customLabel: 'Quarta-feira' }, // Quarta
  4: { active: true, startTime: '09:00', endTime: '20:00', slotIntervalMinutes: 60, customLabel: 'Quinta-feira' }, // Quinta
  5: { active: true, startTime: '09:00', endTime: '21:00', slotIntervalMinutes: 60, customLabel: 'Sexta-feira' }, // Sexta
  6: { active: true, startTime: '08:30', endTime: '20:00', slotIntervalMinutes: 60, customLabel: 'Sábado' }, // Sábado
};

export const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
  defaultStartTime: '09:00',
  defaultEndTime: '20:00',
  defaultIntervalMinutes: 60,
  weeklySchedule: DEFAULT_WEEKLY_SCHEDULE,
  specificDateSchedule: {},
};

export const DAY_NAMES_PT = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

export const DAY_SHORT_NAMES_PT = [
  'Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'
];

/**
 * Parses "HH:mm" to total minutes from midnight
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Formats total minutes from midnight to "HH:mm"
 */
export function minutesToTime(totalMinutes: number): string {
  const normalized = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const h = Math.floor(normalized / 60).toString().padStart(2, '0');
  const m = (normalized % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Gets the active schedule rule for a given date (YYYY-MM-DD)
 */
export function getScheduleRuleForDate(
  dateStr: string,
  scheduleConfig?: ScheduleConfig
): DayScheduleRule {
  const config = scheduleConfig || DEFAULT_SCHEDULE_CONFIG;

  // 1. Check for specific date override first (e.g. customized opening/closing for tomorrow or next 15 days)
  if (config.specificDateSchedule && config.specificDateSchedule[dateStr]) {
    return config.specificDateSchedule[dateStr];
  }

  // 2. Check weekly schedule by day of week
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const dateObj = new Date(year, month, day, 12, 0, 0);
      const dayOfWeek = dateObj.getDay();

      if (config.weeklySchedule && config.weeklySchedule[dayOfWeek]) {
        return config.weeklySchedule[dayOfWeek];
      }
    }
  } catch (e) {
    // fallback
  }

  // 3. Fallback to default
  return {
    active: true,
    startTime: config.defaultStartTime || '09:00',
    endTime: config.defaultEndTime || '20:00',
    slotIntervalMinutes: config.defaultIntervalMinutes || 60,
    customLabel: 'Horário Padrão'
  };
}

/**
 * Generates the list of available timeslots for a given date according to the salon's schedule
 */
export function getTimeSlotsForDate(
  dateStr: string,
  scheduleConfig?: ScheduleConfig
): string[] {
  const rule = getScheduleRuleForDate(dateStr, scheduleConfig);

  // If the salon is closed / day off, return empty slots
  if (!rule.active) {
    return [];
  }

  const startMins = timeToMinutes(rule.startTime);
  const endMins = timeToMinutes(rule.endTime);
  const interval = rule.slotIntervalMinutes && rule.slotIntervalMinutes > 0 ? rule.slotIntervalMinutes : 60;

  if (startMins >= endMins) {
    return DEFAULT_TIMESLOTS;
  }

  const slots: string[] = [];
  for (let m = startMins; m <= endMins; m += interval) {
    slots.push(minutesToTime(m));
  }

  return slots.length > 0 ? slots : DEFAULT_TIMESLOTS;
}

/**
 * Helper to generate a list of upcoming dates for the next N days (e.g. 15 days = Quinzena)
 */
export interface UpcomingDayInfo {
  date: string; // YYYY-MM-DD
  dayOfMonth: number;
  monthName: string;
  dayOfWeekName: string;
  dayOfWeekShort: string;
  dayOfWeekIndex: number;
  isToday: boolean;
  isTomorrow: boolean;
  isWeekend: boolean;
  rule: DayScheduleRule;
  isCustomized: boolean;
}

export function getUpcomingDays(
  daysCount = 15,
  startDateStr?: string,
  scheduleConfig?: ScheduleConfig
): UpcomingDayInfo[] {
  const result: UpcomingDayInfo[] = [];
  const base = startDateStr ? new Date(startDateStr + 'T12:00:00') : new Date();
  
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  for (let i = 0; i < daysCount; i++) {
    const current = new Date(base);
    current.setDate(base.getDate() + i);

    const year = current.getFullYear();
    const month = (current.getMonth() + 1).toString().padStart(2, '0');
    const day = current.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const dayOfWeek = current.getDay();
    const isToday = dateStr === todayStr;
    const isTomorrow = dateStr === tomorrowStr;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const rule = getScheduleRuleForDate(dateStr, scheduleConfig);
    const isCustomized = Boolean(
      scheduleConfig?.specificDateSchedule && scheduleConfig.specificDateSchedule[dateStr]
    );

    result.push({
      date: dateStr,
      dayOfMonth: current.getDate(),
      monthName: monthNames[current.getMonth()],
      dayOfWeekName: DAY_NAMES_PT[dayOfWeek],
      dayOfWeekShort: DAY_SHORT_NAMES_PT[dayOfWeek],
      dayOfWeekIndex: dayOfWeek,
      isToday,
      isTomorrow,
      isWeekend,
      rule,
      isCustomized
    });
  }

  return result;
}

/**
 * Bulk applies a schedule rule to the upcoming N days (e.g. 7 days / week or 15 days / fortnight)
 */
export function applyScheduleToNextDays(
  startDateStr: string,
  daysCount: number,
  rule: DayScheduleRule,
  currentSpecific: Record<string, DayScheduleRule>
): Record<string, DayScheduleRule> {
  const updated: Record<string, DayScheduleRule> = { ...currentSpecific };
  const base = new Date(startDateStr + 'T12:00:00');

  for (let i = 0; i < daysCount; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    updated[dateStr] = {
      ...rule,
      customLabel: `Ajuste (${rule.startTime} às ${rule.endTime})`
    };
  }

  return updated;
}
