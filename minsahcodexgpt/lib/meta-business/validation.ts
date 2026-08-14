import 'server-only';

const FEED_ACTIONS = ['create', 'upload', 'schedule'] as const;
const FEED_INTERVALS = ['HOURLY', 'DAILY', 'WEEKLY'] as const;
const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;

export type FeedAction = (typeof FEED_ACTIONS)[number];

export function optionalTrimmedString(value: unknown, name: string, max = 255) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new Error(`${name} must be a string`);
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (normalized.length > max) throw new Error(`${name} must be at most ${max} characters`);
  return normalized;
}

export function optionalBoolean(value: unknown, name: string) {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw new Error(`${name} must be a boolean`);
  return value;
}

export function parseFeedAction(value: unknown): FeedAction {
  const action = value === undefined ? 'create' : optionalTrimmedString(value, 'action', 20)?.toLowerCase();
  if (!action || !FEED_ACTIONS.includes(action as FeedAction)) {
    throw new Error(`action must be one of: ${FEED_ACTIONS.join(', ')}`);
  }
  return action as FeedAction;
}

export function parseFeedSchedule(input: Record<string, unknown>) {
  const interval = (optionalTrimmedString(input.interval, 'interval', 20) ?? 'DAILY').toUpperCase();
  if (!FEED_INTERVALS.includes(interval as (typeof FEED_INTERVALS)[number])) {
    throw new Error(`interval must be one of: ${FEED_INTERVALS.join(', ')}`);
  }

  const hour = input.hour === undefined ? 2 : input.hour;
  const minute = input.minute === undefined ? 0 : input.minute;
  if (!Number.isInteger(hour) || Number(hour) < 0 || Number(hour) > 23) {
    throw new Error('hour must be an integer between 0 and 23');
  }
  if (!Number.isInteger(minute) || Number(minute) < 0 || Number(minute) > 59) {
    throw new Error('minute must be an integer between 0 and 59');
  }

  const dayOfWeekRaw = optionalTrimmedString(input.dayOfWeek, 'dayOfWeek', 20);
  const dayOfWeek = dayOfWeekRaw?.toUpperCase();
  if (interval === 'WEEKLY' && !dayOfWeek) throw new Error('dayOfWeek is required for WEEKLY interval');
  if (dayOfWeek && !WEEKDAYS.includes(dayOfWeek as (typeof WEEKDAYS)[number])) {
    throw new Error(`dayOfWeek must be one of: ${WEEKDAYS.join(', ')}`);
  }

  return { interval, hour: Number(hour), minute: Number(minute), dayOfWeek };
}

export function assertHttpUrl(value: string | undefined, name: string) {
  if (!value) return undefined;
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error(`${name} must be a valid URL`); }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`${name} must use http or https`);
  }
  return parsed.toString();
}
