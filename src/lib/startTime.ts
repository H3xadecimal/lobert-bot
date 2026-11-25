/** Next occurrence of HH:mm, optionally followed by a UTC offset. Defaults to Mauritius time (UTC+04:00). */
export function parseStartTime(input: string, now = Date.now()): number {
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?(?:\s*([+-])(\d{2}):(\d{2}))?$/i.exec(input.trim());
  const help = 'Use HH:mm with a colon (19:00), or 7PM / 7:30PM. Default: Mauritius UTC+4. Optional offset: 19:00-05:00.';
  if (!match) throw new Error(help);
  const [, h, m, period, sign, oh = '4', om = '0'] = match;
  let hours = Number(h);
  const minutes = Number(m ?? '0');
  const offsetHours = Number(oh), offsetMinutes = Number(om);
  if ((!period && (h.length !== 2 || m === undefined || hours > 23)) ||
      (period && (hours < 1 || hours > 12)) || minutes > 59 ||
      offsetHours > 14 || offsetMinutes > 59 || (offsetHours === 14 && offsetMinutes !== 0)) {
    throw new Error('Invalid time or UTC offset. ' + help);
  }
  if (period) hours = hours % 12 + (period.toUpperCase() === 'PM' ? 12 : 0);
  const offset = (sign === '-' ? -1 : 1) * (offsetHours * 60 + offsetMinutes) * 60_000;
  const local = new Date(now + offset);
  let result = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hours, minutes) - offset;
  if (result <= now) result += 24 * 60 * 60_000;
  return result;
}
