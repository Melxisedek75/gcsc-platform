const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

async function chatAcceptance(t, { pool, request, fixtureUser, startApi, stopApi }) {
  const owner = await fixtureUser('homeowner', 'chat-owner');
  const contractor = await fixtureUser('contractor', 'chat-contractor');
  const other = await fixtureUser('contractor', 'chat-other-bidder');
  const outsider = await fixtureUser('homeowner', 'chat-outsider');
  const admin = await fixtureUser('admin', 'chat-admin');
  const project = (await pool.query(`INSERT INTO projects(homeowner_id,title)
    VALUES($1,'Chat fixture') RETURNING *`, [owner.id])).rows[0];
  const bidFor = async user => (await pool.query(`INSERT INTO bids(project_id,contractor_id,amount)
    VALUES($1,$2,100) RETURNING *`, [project.id, user.id])).rows[0];
  const bid = await bidFor(contractor);
  const otherBid = await bidFor(other);
  const open = (user = owner, bidId = bid.id) => request('POST', '/api/chat/threads', user, { bid_id: bidId });
  const send = (thread, user = contractor, body = {}) => request('POST', `/api/chat/threads/${thread.id}/messages`, user,
    { text: 'Fixture message', client_message_id: randomUUID(), ...body });
  const history = (thread, user = owner, query = '') => request('GET', `/api/chat/threads/${thread.id}/messages${query}`, user);
  let thread;

  await t.test('chat opens only for actual bid participants and reuses a project/pair conversation', async () => {
    assert.equal((await open(null)).status, 401);
    assert.equal((await open(admin)).status, 403);
    assert.equal((await open(outsider)).status, 404);
    assert.equal((await open(other)).status, 404);
    const opening = await Promise.all([open(), open(contractor), open()]);
    assert.equal(opening.filter(r => r.status === 201).length, 1);
    assert.equal(opening.filter(r => r.status === 200).length, 2);
    const first = opening.find(r => r.status === 201);
    assert.equal(first.status, 201, 'canonical server must implement durable participant chat');
    assert.equal(first.headers.get('cache-control'), 'no-store');
    thread = first.body.thread;
    assert.equal(thread.homeowner_id, owner.id);
    assert.equal(thread.contractor_id, contractor.id);
    assert.equal(thread.can_send, true);
    assert.deepEqual(thread.counterparty, { id: contractor.id, full_name: 'chat-contractor', role: 'contractor' });
    const repeatedBid = await bidFor(contractor);
    const concurrent = await Promise.all([open(), open(contractor, repeatedBid.id), open(contractor)]);
    for (const result of concurrent) {
      assert.equal(result.status, 200);
      assert.equal(result.body.thread.id, thread.id);
    }
    assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM chat_threads')).rows[0].count, 1);
  });
  if (!thread) return;

  await t.test('same-project outsider cannot list, read or send; payload identities cannot be spoofed', async () => {
    for (const user of [other, outsider]) {
      assert.equal((await history(thread, user)).status, 404);
      assert.equal((await send(thread, user)).status, 404);
      assert.deepEqual((await request('GET', '/api/chat/threads', user)).body.threads, []);
    }
    assert.equal((await history(thread, admin)).status, 403);
    assert.equal((await history(thread, null)).status, 401);
    assert.equal((await send(thread, owner, { sender_id: contractor.id })).status, 400);
    assert.equal((await request('POST', '/api/chat/threads', owner, { bid_id: bid.id, contractor_id: other.id })).status, 400);
    const sent = await send(thread, owner, { text: 'Exact private text' });
    assert.equal(sent.status, 201);
    assert.equal(sent.body.message.sender_id, owner.id);
    const messages = await history(thread, contractor);
    assert.equal(messages.status, 200);
    assert.equal(messages.headers.get('cache-control'), 'no-store');
    assert.deepEqual(messages.body.messages, [sent.body.message]);
    assert.equal(messages.body.thread.counterparty.id, owner.id);
    for (const forbidden of ['email', 'password_hash', 'wallet', 'phone']) {
      assert.ok(!JSON.stringify(messages.body).includes(`"${forbidden}"`));
    }
  });

  await t.test('sends are idempotent, conflict on changed text and have bounded cursor pagination', async () => {
    const key = randomUUID();
    const results = await Promise.all(Array.from({ length: 6 }, () => send(thread, contractor,
      { client_message_id: key, text: 'Retry-safe text' })));
    assert.equal(results.filter(r => r.status === 201).length, 1);
    assert.equal(results.filter(r => r.status === 200).length, 5);
    assert.equal(new Set(results.map(r => r.body.message.id)).size, 1);
    assert.equal((await send(thread, contractor, { client_message_id: key, text: 'Different' })).status, 409);
    assert.equal((await send(thread, owner, { client_message_id: key, text: 'Other sender same key' })).status, 201);
    for (const bad of [{ text: '' }, { text: ' ' }, { text: 'x'.repeat(4001) }, { text: 'a\u0000b' }, { text: '\ud800' },
      { text: {} }, { client_message_id: 'not-a-uuid' }, { client_message_id: null }]) {
      assert.equal((await send(thread, contractor, bad)).status, 400);
    }
    assert.equal((await send(thread, contractor, { text: 'x'.repeat(33000) })).status, 413);
    for (const query of ['?after=-1', '?after=1junk', '?limit=0', '?limit=101', '?limit=2&limit=3', '?after=2147483648']) {
      assert.equal((await history(thread, owner, query)).status, 400, query);
    }
    const first = (await history(thread, owner, '?limit=2')).body;
    assert.equal(first.messages.length, 2);
    assert.equal(first.has_more, true);
    const last = (await history(thread, owner, `?after=${first.next_after}&limit=2`)).body;
    assert.equal(last.messages.length, 1);
    assert.equal(last.has_more, false);
    assert.deepEqual([...first.messages, ...last.messages].map(m => m.sequence), [1, 2, 3]);
    const empty = (await history(thread, owner, `?after=${last.next_after}`)).body;
    assert.equal(empty.next_after, last.next_after);
    assert.deepEqual(empty.messages, []);
    const audits = await pool.query("SELECT metadata FROM audit_events WHERE action='chat.message_sent' AND entity_id=$1", [thread.id]);
    assert.equal(audits.rowCount, 3);
    assert.ok(!JSON.stringify(audits.rows).includes('Retry-safe text'));
  });

  await t.test('thread lists paginate and separate other bidders and repeated bids', async () => {
    const another = await open(other, otherBid.id);
    assert.equal(another.status, 201);
    assert.notEqual(another.body.thread.id, thread.id);
    const list = (await request('GET', '/api/chat/threads?limit=1', owner)).body;
    assert.equal(list.threads[0].id, another.body.thread.id);
    assert.equal(list.has_more, true);
    const next = (await request('GET', `/api/chat/threads?before=${list.next_before}&limit=1`, owner)).body;
    assert.equal(next.threads[0].id, thread.id);
    assert.equal(next.has_more, false);
    assert.equal((await history(another.body.thread, contractor)).status, 404);
    for (const value of ['0', '1x', '-1', '2147483648']) {
      assert.equal((await request('GET', `/api/chat/threads?before=${value}`, owner)).status, 400);
      assert.equal((await request('GET', `/api/chat/threads/${value}/messages`, owner)).status, 400);
    }
  });

  await t.test('rejected bids and closed projects are read-only; accepted active projects can send', async () => {
    await pool.query("UPDATE bids SET status='rejected' WHERE project_id=$1 AND contractor_id=$2", [project.id, contractor.id]);
    assert.equal((await history(thread)).body.thread.can_send, false);
    assert.equal((await send(thread)).status, 409);
    assert.equal((await open()).status, 200);
    await pool.query("UPDATE bids SET status='accepted' WHERE id=$1", [bid.id]);
    await pool.query("UPDATE projects SET status='in_progress' WHERE id=$1", [project.id]);
    const active = await send(thread);
    assert.equal(active.status, 201);
    await pool.query("UPDATE projects SET status='completed' WHERE id=$1", [project.id]);
    assert.equal((await send(thread)).status, 409);
    const replay = await send(thread, contractor, { text: active.body.message.text, client_message_id: active.body.message.client_message_id });
    assert.equal(replay.status, 200, 'a retry can acknowledge an earlier commit even after project completion');
    await pool.query("UPDATE projects SET status='in_progress' WHERE id=$1", [project.id]);
  });

  await t.test('fresh stored roles/status and project ownership prevent stale-token access', async () => {
    await pool.query('UPDATE users SET is_active=false WHERE id=$1', [contractor.id]);
    assert.equal((await history(thread, contractor)).status, 403);
    assert.equal((await send(thread)).status, 403);
    await pool.query("UPDATE users SET is_active=true,role='admin' WHERE id=$1", [contractor.id]);
    assert.equal((await history(thread, contractor)).status, 403);
    await pool.query("UPDATE users SET role='contractor' WHERE id=$1", [contractor.id]);
    await pool.query('UPDATE projects SET homeowner_id=$1 WHERE id=$2', [outsider.id, project.id]);
    for (const user of [owner, contractor, outsider]) assert.equal((await history(thread, user)).status, 404);
    await pool.query('UPDATE projects SET homeowner_id=$1 WHERE id=$2', [owner.id, project.id]);
  });

  await t.test('bounded parser rejects invalid JSON; Unicode text round-trips without interpretation', async () => {
    const route = `/api/chat/threads/${thread.id}/messages`;
    for (const rawBody of ['{invalid', 'null', '[]', 'true']) {
      assert.equal((await request('POST', route, contractor, undefined, { rawBody })).status, 400);
    }
    assert.equal((await request('POST', route, contractor, {}, { headers: { 'Content-Type': 'text/plain' } })).status, 400);
    const text = '\u0421\u043c\u0435\u0442\u0430 \ud83c\udfd7\ufe0f\n<script>untrusted</script>';
    const sent = await send(thread, contractor, { text });
    assert.equal(sent.status, 201);
    assert.equal(sent.body.message.text, text);
    assert.equal((await history(thread)).body.messages.at(-1).text, text);
  });

  await t.test('malformed UTF-8 wire bytes are rejected before JSON decoding or persistence', async () => {
    const key = randomUUID();
    const rawBody = Buffer.concat([Buffer.from('{"text":"'), Buffer.from([0xc3, 0x28]),
      Buffer.from(`","client_message_id":"${key}"}`)]);
    const result = await request('POST', `/api/chat/threads/${thread.id}/messages`, contractor, undefined, { rawBody });
    assert.equal(result.status, 400);
    assert.equal((await pool.query('SELECT * FROM chat_messages WHERE client_message_id=$1', [key])).rowCount, 0);
  });

  for (const table of ['chat_threads', 'users']) {
    await t.test(`chat list and authentication bound waits on a locked ${table} table`, async () => {
      const locker = await pool.connect();
      try {
        await locker.query('BEGIN');
        await locker.query(`LOCK TABLE ${table} IN ACCESS EXCLUSIVE MODE`);
        const result = await request('GET', '/api/chat/threads', owner);
        assert.equal(result.status, 503);
        assert.equal(result.headers.get('cache-control'), 'no-store');
      } finally {
        await locker.query('ROLLBACK');
        locker.release();
      }
      assert.equal((await request('GET', '/api/chat/threads', owner)).status, 200);
    });
  }

  await t.test('a queued send rechecks revoked access after acquiring the thread lock', async () => {
    const locker = await pool.connect();
    let pending;
    try {
      await locker.query('BEGIN');
      await locker.query('SELECT id FROM chat_threads WHERE id=$1 FOR UPDATE', [thread.id]);
      pending = send(thread);
      const deadline = Date.now() + 2000;
      let waiting = false;
      while (Date.now() < deadline) {
        const locks = await pool.query(`SELECT 1 FROM pg_stat_activity WHERE datname=current_database()
          AND wait_event_type='Lock' AND query LIKE 'SELECT * FROM chat_threads%'`);
        if (locks.rowCount) { waiting = true; break; }
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      assert.equal(waiting, true, 'the request must pass initial authentication and wait on the thread row');
      await pool.query('UPDATE users SET is_active=false WHERE id=$1', [contractor.id]);
      await locker.query('COMMIT');
      assert.equal((await pending).status, 404, 'stored relationships must be rechecked inside the transaction');
    } finally {
      await locker.query('ROLLBACK');
      locker.release();
      if (pending) await pending;
      await pool.query('UPDATE users SET is_active=true WHERE id=$1', [contractor.id]);
    }
  });

  await t.test('message and audit roll back together; retry then succeeds with the same key', async () => {
    const before = (await history(thread)).body.thread.last_sequence;
    await pool.query(`CREATE FUNCTION fixture_chat_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.action='chat.message_sent' THEN RAISE EXCEPTION 'fixture audit failure'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER fixture_chat_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION fixture_chat_audit_fail()`);
    const key = randomUUID();
    try {
      assert.equal((await send(thread, contractor, { client_message_id: key })).status, 500);
      assert.equal((await history(thread)).body.thread.last_sequence, before);
      assert.equal((await pool.query('SELECT * FROM chat_messages WHERE client_message_id=$1', [key])).rowCount, 0);
    } finally {
      await pool.query('DROP TRIGGER fixture_chat_audit ON audit_events; DROP FUNCTION fixture_chat_audit_fail()');
    }
    assert.equal((await send(thread, contractor, { client_message_id: key })).status, 201);
  });

  await t.test('lock contention times out without delivery; the same message key can safely retry', async () => {
    const locker = await pool.connect();
    const key = randomUUID();
    try {
      await locker.query('BEGIN');
      await locker.query('SELECT id FROM chat_threads WHERE id=$1 FOR UPDATE', [thread.id]);
      const busy = await send(thread, contractor, { client_message_id: key });
      assert.equal(busy.status, 503);
      assert.match(busy.body.error, /same message key/);
      assert.equal((await pool.query('SELECT * FROM chat_messages WHERE client_message_id=$1', [key])).rowCount, 0);
    } finally {
      await locker.query('ROLLBACK');
      locker.release();
    }
    assert.equal((await send(thread, contractor, { client_message_id: key })).status, 201);
  });

  await t.test('concurrent sends have gap-free cursor order and survive API/storage restart', async () => {
    const before = (await history(thread)).body.thread.last_sequence;
    const results = await Promise.all(Array.from({ length: 8 }, (_, i) => send(thread, i % 2 ? owner : contractor,
      { text: `Concurrent ${i}` })));
    assert.ok(results.every(r => r.status === 201));
    const messages = (await history(thread, owner, `?after=${before}`)).body.messages;
    assert.deepEqual(messages.map(m => m.sequence), Array.from({ length: 8 }, (_, i) => before + i + 1));
    await stopApi();
    await startApi();
    assert.deepEqual((await history(thread, contractor, `?after=${before}`)).body.messages, messages);
  });

  await t.test('deleting the bid relationship revokes history without exposing it to other roles', async () => {
    await pool.query('DELETE FROM bids WHERE project_id=$1 AND contractor_id=$2', [project.id, contractor.id]);
    assert.equal((await history(thread)).status, 404);
    assert.equal((await send(thread)).status, 404);
    assert.ok(!(await request('GET', '/api/chat/threads', owner)).body.threads.some(row => row.id === thread.id));
    assert.ok((await pool.query('SELECT COUNT(*)::int AS count FROM chat_messages WHERE thread_id=$1', [thread.id])).rows[0].count > 0);
  });

  await t.test('write rate limit is per stored user even when JWT metadata and forwarded IP change', async () => {
    const user = await fixtureUser('homeowner', 'chat-rate-fixture');
    for (let i = 0; i < 60; i++) {
      const result = await request('POST', '/api/chat/threads', { ...user, email: `${i}@example.invalid` }, {},
        { headers: { 'X-Forwarded-For': `192.0.2.${i}` } });
      assert.equal(result.status, 400);
    }
    const limited = await request('POST', '/api/chat/threads', user, {});
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get('cache-control'), 'no-store');
    assert.ok(Number(limited.headers.get('retry-after')) > 0);
    assert.equal((await request('GET', '/api/chat/threads', user)).status, 200);
    assert.equal((await open(owner, otherBid.id)).status, 200);
  });
}

module.exports = { chatAcceptance };
