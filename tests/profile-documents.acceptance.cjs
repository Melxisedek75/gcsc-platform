const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');

async function profileDocumentAcceptance(t, { pool, request, fixtureUser, startApi, stopApi }) {
  const contractor = await fixtureUser('contractor', 'documents-owner');
  const other = await fixtureUser('contractor', 'documents-other');
  const homeowner = await fixtureUser('homeowner', 'documents-homeowner');
  const admin = await fixtureUser('admin', 'documents-reviewer');
  const payload = (label, type = 'contractor_license') => ({
    documentType: type, fileName: `${label}.pdf`, mimeType: 'application/pdf',
    fileDataUrl: `data:application/pdf;base64,${Buffer.from(`%PDF-1.4\nfixture-${label}\n%%EOF`).toString('base64')}`,
  });
  const upload = (label, user = contractor, type) => request('POST', '/api/auth/documents', user, payload(label, type));
  const review = (doc, status = 'approved', user = admin) => request('PUT', `/api/admin/documents/${doc.id}/review`, user,
    { status, expectedRevision: doc.revision, reviewNote: status === 'rejected' ? 'Upload a current license.' : 'Fixture reviewed.' });
  const stored = async id => (await pool.query('SELECT * FROM user_documents WHERE id=$1', [id])).rows[0];

  await t.test('profile changes persist, ignore privileged fields and reject malformed data without partial writes', async () => {
    const result = await request('PUT', '/api/auth/profile', contractor, {
      fullName: 'Fixture Builder', companyName: 'Fixture Construction', licenseNumber: 'FIXTURE-123',
      phone: '5550100', serviceArea: 'Seattle', specialties: ['roofing'], role: 'admin', is_active: false,
      id: other.id, email: other.email, password_hash: 'attacker',
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.user.role, 'contractor');
    assert.equal(result.body.user.id, contractor.id);
    assert.equal(result.body.user.profile.companyName, 'Fixture Construction');
    assert.ok(!('password_hash' in result.body.user));
    const before = (await pool.query('SELECT * FROM users WHERE id=$1', [contractor.id])).rows[0];
    assert.equal(before.email, contractor.email);
    assert.equal(before.is_active, true);
    assert.equal((await request('PUT', '/api/auth/profile', contractor,
      { fullName: 'Must not save', logoDataUrl: 'not-a-logo' })).status, 400);
    assert.deepEqual((await pool.query('SELECT * FROM users WHERE id=$1', [contractor.id])).rows[0], before);
    assert.equal((await request('GET', '/api/auth/profile')).status, 401);
    const events = await pool.query("SELECT * FROM audit_events WHERE actor_id=$1 AND action='profile.updated'", [contractor.id]);
    assert.equal(events.rowCount, 1);
    assert.ok(!JSON.stringify(events.rows[0].metadata).includes('FIXTURE-123'));
  });

  await t.test('document upload binds owner, validates payload and hides bytes from document lists', async () => {
    const body = { ...payload('initial'), user_id: other.id, status: 'approved', reviewed_by: admin.id };
    assert.equal((await request('POST', '/api/auth/documents', null, body)).status, 401);
    assert.equal((await request('POST', '/api/auth/documents', homeowner, body)).status, 403);
    const result = await request('POST', '/api/auth/documents', contractor, body);
    assert.equal(result.status, 201);
    const doc = result.body.document;
    assert.equal(doc.user_id, contractor.id);
    assert.equal(doc.status, 'submitted');
    assert.equal(doc.reviewed_by, null);
    assert.ok(!('file_data_url' in doc));
    const row = await stored(doc.id);
    assert.equal(row.file_data_url, body.fileDataUrl);
    assert.equal(row.file_sha256, createHash('sha256').update(Buffer.from(body.fileDataUrl.split(',')[1], 'base64')).digest('hex'));
    for (const invalid of [
      { documentType: 'unknown' }, { fileName: '' }, { fileDataUrl: 'data:text/html;base64,SGk=' },
      { fileDataUrl: 'data:application/pdf;base64,====' },
      { fileDataUrl: `data:application/pdf;base64,${Buffer.alloc(1500001).toString('base64')}` },
    ]) {
      assert.equal((await request('POST', '/api/auth/documents', contractor, { ...body, ...invalid })).status, 400);
    }
    assert.deepEqual((await request('GET', '/api/auth/documents?user_id=' + contractor.id, other)).body.documents, []);
    assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM user_documents WHERE user_id=$1', [contractor.id])).rows[0].count, 1);
    assert.equal((await stored(doc.id)).file_sha256, row.file_sha256);
  });

  await t.test('file download requires an active owner or admin and the exact submission revision', async () => {
    const result = await upload('private-download');
    assert.equal(result.status, 201);
    const doc = result.body.document;
    const route = `/api/auth/documents/${doc.id}/file?revision=${doc.revision}`;
    assert.equal((await request('GET', route)).status, 401);
    for (const user of [other, homeowner]) assert.equal((await request('GET', route, user)).status, 404);
    for (const user of [contractor, admin]) {
      const download = await request('GET', route, user);
      assert.equal(download.status, 200);
      assert.equal(download.headers.get('cache-control'), 'no-store');
      assert.equal(download.body.file_data_url, payload('private-download').fileDataUrl);
      assert.equal(download.body.document.revision, doc.revision);
    }
    assert.equal((await request('GET', `/api/auth/documents/${doc.id}/file`, contractor)).status, 428);
    assert.equal((await request('GET', `/api/auth/documents/${doc.id}/file?revision=0`, contractor)).status, 400);
    assert.equal((await request('GET', `/api/auth/documents/${doc.id}garbage/file?revision=1`, contractor)).status, 404);
    const adminList = await request('GET', '/api/admin/documents', admin);
    assert.ok(adminList.body.documents.some(item => item.id === doc.id));
    assert.ok(adminList.body.documents.every(item => !('file_data_url' in item)));
    await pool.query('UPDATE users SET is_active=false WHERE id=$1', [contractor.id]);
    try {
      assert.equal((await request('GET', route, contractor)).status, 403);
      assert.equal((await request('GET', '/api/auth/documents', contractor)).status, 403);
      assert.equal((await upload('inactive-upload')).status, 403);
      assert.equal((await request('PUT', '/api/auth/profile', contractor, { fullName: 'Blocked' })).status, 403);
    } finally { await pool.query('UPDATE users SET is_active=true WHERE id=$1', [contractor.id]); }
  });

  await t.test('admin endpoints reject anonymous, non-admin, inactive, demoted and deleted accounts despite stale JWT roles', async () => {
    const doc = (await upload('admin-acl')).body.document;
    const targets = [
      ['GET', '/api/admin/documents'], ['GET', '/api/admin/audit-events'], ['GET', '/api/admin/financing-prechecks'],
      ['PUT', `/api/admin/documents/${doc.id}/review`, { status: 'approved', expectedRevision: doc.revision }],
    ];
    for (const [method, route, body] of targets) {
      assert.equal((await request(method, route, null, body)).status, 401);
      assert.equal((await request(method, route, other, body)).status, route.includes('/file?') ? 404 : 403);
    }
    for (const state of ['inactive', 'demoted', 'deleted']) {
      const revoked = await fixtureUser('admin', `revoked-${state}`);
      if (state === 'inactive') await pool.query('UPDATE users SET is_active=false WHERE id=$1', [revoked.id]);
      if (state === 'demoted') await pool.query("UPDATE users SET role='contractor' WHERE id=$1", [revoked.id]);
      if (state === 'deleted') await pool.query('DELETE FROM users WHERE id=$1', [revoked.id]);
      for (const [method, route, body] of targets) {
        const response = await request(method, route, revoked, body);
        assert.equal(response.status, state === 'deleted' || (state === 'demoted' && route.includes('/file?')) ? 404 : 403,
          `${state}: ${method} ${route}`);
      }
      assert.equal((await request('GET', `/api/auth/documents/${doc.id}/file?revision=${doc.revision}`, revoked)).status,
        state === 'inactive' ? 403 : 404);
    }
    assert.equal((await stored(doc.id)).status, 'submitted');
    assert.equal((await pool.query("SELECT COUNT(*)::int AS count FROM audit_events WHERE action='document.reviewed' AND entity_id=$1", [String(doc.id)])).rows[0].count, 0);
  });

  await t.test('review is version-bound; rejection, replacement and identical re-upload require a fresh review', async () => {
    let doc = (await upload('review-one')).body.document;
    assert.ok(Number.isSafeInteger(doc.revision) && doc.revision > 0);
    const noVersion = await request('PUT', `/api/admin/documents/${doc.id}/review`, admin, { status: 'approved' });
    assert.equal(noVersion.status, 428);
    assert.equal((await request('PUT', `/api/admin/documents/${doc.id}/review`, admin,
      { status: 'approved', expectedRevision: '1' })).status, 400);
    assert.equal((await request('PUT', `/api/admin/documents/${doc.id}/review`, admin,
      { status: 'rejected', expectedRevision: doc.revision })).status, 400);
    const rejected = await review(doc, 'rejected');
    assert.equal(rejected.status, 200);
    assert.equal(rejected.body.document.reviewed_by, admin.id);
    assert.equal(rejected.body.document.status, 'rejected');
    let replacement = (await upload('review-two')).body.document;
    assert.equal(replacement.id, doc.id);
    assert.equal(replacement.revision, doc.revision + 1);
    assert.equal(replacement.status, 'submitted');
    assert.equal(replacement.reviewed_by, null);
    assert.equal(replacement.reviewed_at, null);
    assert.equal(replacement.review_note, '');
    assert.equal((await review(doc)).status, 409);
    assert.equal((await request('GET', `/api/auth/documents/${doc.id}/file?revision=${doc.revision}`, admin)).status, 409);
    assert.equal((await review(replacement)).status, 200);
    doc = replacement;
    replacement = (await upload('review-two')).body.document;
    assert.equal(replacement.file_sha256, doc.file_sha256);
    assert.equal(replacement.revision, doc.revision + 1);
    assert.equal((await review(doc)).status, 409);
    assert.equal((await stored(doc.id)).status, 'submitted');
  });

  await t.test('concurrent replacement and review cannot approve a newer file with an older revision', async () => {
    const original = (await upload('race-before')).body.document;
    const [submitted, reviewed] = await Promise.all([upload('race-after'), review(original)]);
    assert.equal(submitted.status, 201);
    assert.ok([200, 409].includes(reviewed.status));
    const current = await stored(original.id);
    assert.equal(current.status, 'submitted');
    assert.equal(current.reviewed_by, null);
    assert.equal(current.file_data_url, payload('race-after').fileDataUrl);
    assert.equal(current.revision, original.revision + 1);
    const concurrent = await Promise.all([upload('race-a'), upload('race-b')]);
    assert.deepEqual(concurrent.map(result => result.status), [201, 201]);
    assert.equal((await stored(original.id)).revision, current.revision + 2);
  });

  await t.test('a review waiting on a PostgreSQL row lock rechecks the version after replacement commits', async () => {
    const doc = (await upload('locked-original')).body.document;
    const client = await pool.connect();
    let pending;
    try {
      await client.query('BEGIN');
      await client.query("UPDATE user_documents SET revision=revision+1,status='submitted',reviewed_by=NULL,reviewed_at=NULL WHERE id=$1", [doc.id]);
      pending = review(doc);
      const deadline = Date.now() + 3500;
      let waiting = false;
      while (Date.now() < deadline) {
        const active = await pool.query(`SELECT 1 FROM pg_stat_activity WHERE datname=current_database()
          AND pid <> pg_backend_pid() AND wait_event_type='Lock' AND query LIKE 'UPDATE user_documents SET status%'`);
        if (active.rowCount) { waiting = true; break; }
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      assert.ok(waiting, 'Review must reach the blocked SQL update, not just a preflight check');
      await client.query('COMMIT');
      assert.equal((await pending).status, 409);
      assert.equal((await stored(doc.id)).status, 'submitted');
    } finally {
      await client.query('ROLLBACK');
      client.release();
      if (pending) await pending;
    }
  });

  await t.test('restart preserves profile, original file, review and audit without claiming wallet verification', async () => {
    const doc = (await upload('restart')).body.document;
    assert.equal((await review(doc)).status, 200);
    await stopApi();
    await startApi();
    const profile = await request('GET', '/api/auth/profile', contractor);
    assert.equal(profile.body.user.full_name, 'Fixture Builder');
    assert.equal(profile.body.user.profile.companyName, 'Fixture Construction');
    const documents = await request('GET', '/api/auth/documents', contractor);
    assert.equal(documents.body.documents.length, 1);
    assert.equal(documents.body.documents[0].status, 'approved');
    assert.equal(documents.body.documents[0].revision, doc.revision);
    const download = await request('GET', `/api/auth/documents/${doc.id}/file?revision=${doc.revision}`, contractor);
    assert.equal(download.body.file_data_url, payload('restart').fileDataUrl);
    const events = await request('GET', `/api/admin/audit-events?target_user_id=${contractor.id}&limit=200`, admin);
    assert.equal(events.status, 200);
    for (const action of ['profile.updated', 'document.submitted', 'document.reviewed', 'document.downloaded']) {
      assert.ok(events.body.events.some(event => event.action === action), action);
    }
    const reviewed = events.body.events.find(event => event.action === 'document.reviewed');
    assert.equal(reviewed.actor_id, admin.id);
    assert.equal(reviewed.metadata.revision, doc.revision);
    assert.equal(reviewed.metadata.file_sha256, doc.file_sha256);
    assert.ok(events.body.events.every(event => !JSON.stringify(event.metadata).includes('base64,')));
    const compliance = await request('GET', '/api/auth/compliance', contractor);
    assert.equal(compliance.body.wallet_connected, false);
    assert.equal(compliance.body.documents_approved, false);
  });
}

module.exports = { profileDocumentAcceptance };
