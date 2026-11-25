/** Next occurrence of HH:mm, optionally followed by a UTC offset. Defaults to UTC. */
export function parseStartTime(input: string, now = Date.now()): number {
  const match = /^(\d{2}):(\d{2})(?:([+-])(\d{2}):(\d{2}))?$/.exec(input.trim());
  if (!match) throw new Error('Use HH:mm (UTC), or HH:mm+04:00 / HH:mm-05:00.');
  const [, h, m, sign, oh = '0', om = '0'] = match;
  const hours = Number(h), minutes = Number(m);
  const offsetHours = Number(oh), offsetMinutes = Number(om);
  if (hours > 23 || minutes > 59 || offsetHours > 14 || offsetMinutes > 59 ||
      (offsetHours === 14 && offsetMinutes !== 0)) {
    throw new Error('Invalid time or UTC offset. Use 00:00–23:59 and offsets up to ±14:00.');
  }
  const offset = (sign === '-' ? -1 : 1) * (offsetHours * 60 + offsetMinutes) * 60_000;
  const local = new Date(now + offset);
  let result = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hours, minutes) - offset;
  if (result <= now) result += 24 * 60 * 60_000;
  return result;
}
