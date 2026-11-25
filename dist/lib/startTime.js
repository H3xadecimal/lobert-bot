"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseStartTime = parseStartTime;
/** Next occurrence of HH:mm, optionally followed by a UTC offset. Defaults to Mauritius time (UTC+04:00). */
function parseStartTime(input, now = Date.now()) {
    const match = /^(\d{2}):(\d{2})(?:([+-])(\d{2}):(\d{2}))?$/.exec(input.trim());
    if (!match)
        throw new Error('Use HH:mm (Mauritius, UTC+04:00), or HH:mm+04:00 / HH:mm-05:00.');
    const [, h, m, sign, oh = '4', om = '0'] = match;
    const hours = Number(h), minutes = Number(m);
    const offsetHours = Number(oh), offsetMinutes = Number(om);
    if (hours > 23 || minutes > 59 || offsetHours > 14 || offsetMinutes > 59 ||
        (offsetHours === 14 && offsetMinutes !== 0)) {
        throw new Error('Invalid time or UTC offset. Use 00:00–23:59 and offsets up to ±14:00.');
    }
    const offset = (sign === '-' ? -1 : 1) * (offsetHours * 60 + offsetMinutes) * 60000;
    const local = new Date(now + offset);
    let result = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hours, minutes) - offset;
    if (result <= now)
        result += 24 * 60 * 60000;
    return result;
}
