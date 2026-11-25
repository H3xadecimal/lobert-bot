const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseStartTime } = require('../dist/lib/startTime');
const { LobbyManager } = require('../dist/lib/LobbyManager');
const { data, execute } = require('../dist/commands/lobby');

const now = Date.parse('2026-11-25T18:00:00Z');
test('time parsing defaults to Mauritius and rolls passed times to tomorrow', () => {
  assert.equal(parseStartTime('21:00', now), Date.parse('2026-11-26T17:00:00Z'));
  assert.equal(parseStartTime('23:00', now), Date.parse('2026-11-25T19:00:00Z'));
  assert.equal(parseStartTime('22:00', now), Date.parse('2026-11-26T18:00:00Z'));
});
test('positive and negative offsets cross dates correctly', () => {
  assert.equal(parseStartTime('23:00+04:00', now), Date.parse('2026-11-25T19:00:00Z'));
  assert.equal(parseStartTime('21:00-05:00', now), Date.parse('2026-11-26T02:00:00Z'));
});
test('invalid input is rejected', () => {
  for (const input of ['', 'tomorrow', '24:00', '12:60', '21:00+14:01', '21:00+02:60']) {
    assert.throws(() => parseStartTime(input, now));
  }
});
test('deployed command exposes the time option', () => {
  assert.ok(data.toJSON().options.find(o => o.name === 'create').options.find(o => o.name === 'time'));
});
test('invalid time returns a private error before creating a lobby', async () => {
  let reply;
  await execute({ options: { getSubcommand: () => 'create', getString: name => name === 'game' ? 'Test' : '25:00', getInteger: () => 4 }, reply: async value => { reply = value; } });
  assert.equal(reply.ephemeral, true);
  assert.match(reply.content, /Invalid time/);
});
function lobby(overrides = {}) {
  return { id: '1', channelId: '2', creatorId: '3', game: 'Test', size: 4, players: ['3'], startsAt: now + 4 * 3600000, expiresAt: now + 7 * 3600000, ...overrides };
}
test('scheduled ping fires once using current roster, then expires after start', t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now });
  const started = [], expired = [];
  const manager = new LobbyManager({ start: async l => { started.push([...l.players]); }, expire: async l => { expired.push(l.id); } });
  manager.create(lobby());
  t.mock.timers.tick(3 * 3600000);
  assert.ok(manager.get('1'));
  manager.get('1').players.push('4');
  t.mock.timers.tick(3600000);
  assert.deepEqual(started, [['3', '4']]);
  t.mock.timers.tick(3 * 3600000);
  assert.equal(started.length, 1);
  assert.deepEqual(expired, ['1']);
  assert.equal(manager.get('1'), undefined);
});
test('cancelling a lobby clears its start and expiration timers', t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now });
  let calls = 0;
  const manager = new LobbyManager({ start: async () => { calls++; }, expire: async () => { calls++; } });
  manager.create(lobby());
  manager.delete('1');
  t.mock.timers.tick(8 * 3600000);
  assert.equal(calls, 0);
});
test('unscheduled lobbies retain expiration without a start ping', t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now });
  let starts = 0, expires = 0;
  const manager = new LobbyManager({ start: async () => { starts++; }, expire: async () => { expires++; } });
  manager.create(lobby({ startsAt: undefined, expiresAt: now + 3 * 3600000 }));
  t.mock.timers.tick(3 * 3600000);
  assert.equal(starts, 0);
  assert.equal(expires, 1);
});

test('Mauritius default uses the local calendar date across UTC midnight', () => {
  const late = Date.parse('2026-11-25T22:00:00Z'); // 02:00 next day in Mauritius
  assert.equal(parseStartTime('03:00', late), Date.parse('2026-11-25T23:00:00Z'));
  assert.equal(parseStartTime('01:00', late), Date.parse('2026-11-26T21:00:00Z'));
});
test('explicit UTC overrides Mauritius default', () => {
  assert.equal(parseStartTime('21:00+00:00', now), Date.parse('2026-11-25T21:00:00Z'));
  assert.equal(parseStartTime('21:00', now), parseStartTime('21:00+04:00', now));
});

test('time option explains the colon format with a concrete example', () => {
  const option = data.toJSON().options.find(o => o.name === 'create').options.find(o => o.name === 'time');
  assert.match(option.description, /HH:mm/);
  assert.match(option.description, /19:00/);
  assert.match(option.description, /not 1900/);
  assert.ok(option.description.length <= 100);
});
test('compact time gets actionable feedback', async () => {
  let reply;
  await execute({ options: { getSubcommand: () => 'create', getString: name => name === 'game' ? 'Test' : '1900', getInteger: () => 4 }, reply: async value => { reply = value; } });
  assert.equal(reply.ephemeral, true);
  assert.match(reply.content, /19:00/);
  assert.match(reply.content, /colon/);
});
for (const [input, expected] of [['19:00', '26 Nov 2026, 19:00'], ['19:00+00:00', '25 Nov 2026, 23:00'], [null, null]]) {
  test(`create embed confirms accepted schedule: ${input}`, async t => {
    t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now });
    const { lobbyManager } = require('../dist/lib/LobbyManager');
    let reply;
    const msg = { id: 'test-message', channel: { id: 'test-channel' }, edit: async () => {} };
    try {
      await execute({
        id: 'interaction-id', user: { id: 'creator' },
        options: { getSubcommand: () => 'create', getString: name => name === 'game' ? 'Test' : input, getInteger: () => 4 },
        reply: async value => { reply = value; return { fetch: async () => msg }; },
      });
      const fields = reply.embeds[0].toJSON().fields ?? [];
      if (expected) {
        assert.equal(fields[0].name, 'Scheduled start (Mauritius, UTC+4)');
        assert.ok(fields[0].value.includes(expected));
        const timestamp = Math.floor(lobbyManager.get(msg.id).startsAt / 1000);
        assert.ok(fields[0].value.includes(`<t:${timestamp}:F>`));
        assert.ok(fields[0].value.includes(`<t:${timestamp}:R>`));
      } else {
        assert.match(fields[0].value, /Not scheduled/);
        assert.equal(lobbyManager.get(msg.id).startsAt, undefined);
      }
    } finally {
      lobbyManager.delete(msg.id);
    }
  });
}

test('AM/PM inputs match 24-hour input, including noon and midnight', () => {
  for (const [input, expected] of [['8PM','20:00'],['9pm','21:00'],['11AM','11:00'],['8:30 PM','20:30'],['12AM','00:00'],['12PM','12:00']]) {
    assert.equal(parseStartTime(input, now), parseStartTime(expected, now));
  }
  assert.equal(parseStartTime('8PM-05:00', now), parseStartTime('20:00-05:00', now));
  for (const input of ['0PM','13AM','8:60PM','1900','8','24:00']) assert.throws(() => parseStartTime(input, now));
});
test('list renders live roster and schedule without fetching original messages', async t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now });
  const { lobbyManager } = require('../dist/lib/LobbyManager');
  const entry = lobby({ startsAt: parseStartTime('8PM', now) });
  lobbyManager.create(entry);
  entry.players.push('4');
  let payload, deferred = false;
  try {
    await execute({ options: { getSubcommand: () => 'list' }, deferReply: async () => { deferred = true; }, editReply: async value => { payload = value; } });
    assert.equal(deferred, true);
    const embed = payload.embeds[0].toJSON();
    assert.match(embed.title, /2\/4/);
    assert.match(embed.description, /<@4>/);
    assert.match(embed.fields[0].value, /20:00/);
    assert.equal(payload.components[0].toJSON().components[0].custom_id, 'join:1');
    assert.deepEqual(payload.allowedMentions.parse, []);
  } finally { lobbyManager.delete(entry.id); }
});
