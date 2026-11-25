const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseStartTime } = require('../dist/lib/startTime');
const { LobbyManager } = require('../dist/lib/LobbyManager');
const { data, execute } = require('../dist/commands/lobby');

const now = Date.parse('2026-11-25T18:00:00Z');
test('time parsing uses explicit UTC and rolls passed times to tomorrow', () => {
  assert.equal(parseStartTime('21:00', now), Date.parse('2026-11-25T21:00:00Z'));
  assert.equal(parseStartTime('17:00', now), Date.parse('2026-11-26T17:00:00Z'));
  assert.equal(parseStartTime('18:00', now), Date.parse('2026-11-26T18:00:00Z'));
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
