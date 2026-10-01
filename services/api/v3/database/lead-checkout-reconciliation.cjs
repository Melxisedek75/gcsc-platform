function fail() { throw Object.assign(new Error('lead_reconcile_request_invalid'), { code: 'lead_reconcile_request_invalid' }); }
const seconds = value => Math.floor(new Date(value).getTime() / 1000);

function quoteMatches(snapshot, purchase) {
  return snapshot && Object.keys(snapshot).sort().join(',')
    === 'amount_cents,contractor_id,created_at,currency,expires_at,price_version,project_id'
    && snapshot.project_id === purchase.project_id && snapshot.contractor_id === purchase.contractor_id
    && snapshot.amount_cents === purchase.amount_cents && snapshot.currency === purchase.currency
    && snapshot.price_version === purchase.price_version && snapshot.expires_at === seconds(purchase.expires_at)
    && snapshot.created_at === new Date(purchase.created_at).toISOString();
}

// Explicit local reconciliation of an already held purchase. This moves a
// signed fact between inboxes; it never fulfills it or grants access.
async function reconcileUnboundLeadEvent(pool, eventId) {
  if (typeof eventId !== 'string' || !/^evt_[a-zA-Z0-9]{1,251}$/.test(eventId)) fail();
  const client = await pool.connect();
  let discard;
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '10s'");
    await client.query("SET LOCAL statement_timeout = '15s'");
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`lead:event:${eventId}`]);
    const quarantine = (await client.query('SELECT * FROM project_access_unbound_events WHERE event_id=$1', [eventId])).rows[0];
    if (!quarantine) {
      const bound = (await client.query('SELECT 1 FROM project_access_checkout_events WHERE event_id=$1', [eventId])).rowCount;
      await client.query('COMMIT');
      return { eventId, status: bound ? 'already_promoted' : 'not_found' };
    }
    const hint = (await client.query(`SELECT b.purchase_id,p.project_id,p.contractor_id
      FROM project_access_checkout_bindings b JOIN project_access_purchases p ON p.id=b.purchase_id
      WHERE b.payment_intent_id=$1`, [quarantine.payment_intent_id])).rows[0];
    if (!hint) { await client.query('COMMIT'); return { eventId, status: 'unbound' }; }

    // Match fulfillment's project/grant/purchase order before taking the PI
    // advisory lock. Intake never acquires a purchase lock under that PI lock.
    await client.query('SELECT 1 FROM projects WHERE id=$1 FOR UPDATE', [hint.project_id]);
    const grant = (await client.query(`SELECT * FROM project_access_entitlements
      WHERE project_id=$1 AND contractor_id=$2 FOR UPDATE`, [hint.project_id, hint.contractor_id])).rows[0];
    const purchase = (await client.query('SELECT * FROM project_access_purchases WHERE id=$1 FOR UPDATE', [hint.purchase_id])).rows[0];
    const binding = (await client.query('SELECT * FROM project_access_checkout_bindings WHERE purchase_id=$1 FOR UPDATE', [hint.purchase_id])).rows[0];
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`lead:unbound:${quarantine.payment_intent_id}`]);
    const stored = (await client.query('SELECT * FROM project_access_unbound_events WHERE event_id=$1 FOR UPDATE', [eventId])).rows[0];
    const held = (await client.query(`SELECT * FROM project_access_checkout_events
      WHERE purchase_id=$1 AND payment_intent_id=$2 AND event_type='checkout.session.completed'
        AND payment_status='paid' AND status='review_required' AND outcome='unbound_negative_event'
      ORDER BY provider_created,event_id`, [hint.purchase_id, quarantine.payment_intent_id])).rows;
    const paid = stored && purchase && held.find(event => quoteMatches(event.purchase_snapshot, purchase)
      && Number(event.provider_created) >= seconds(purchase.created_at)
      && Number(event.provider_created) <= Number(stored.object_created));
    if (!stored || stored.payload_sha256 !== quarantine.payload_sha256 || !purchase || !binding
      || binding.payment_intent_id !== stored.payment_intent_id
      || (purchase.provider_checkout_id && binding.provider_checkout_id !== purchase.provider_checkout_id)
      || purchase.provider_mode !== 'test' || purchase.status !== 'review_required' || grant
      || purchase.project_id !== hint.project_id || purchase.contractor_id !== hint.contractor_id
      || stored.currency !== purchase.currency || stored.amount_cents > purchase.amount_cents
      || Number(stored.object_created) < seconds(purchase.created_at) || !paid) {
      await client.query('ROLLBACK');
      return { eventId, status: 'ineligible' };
    }

    const refund = stored.event_type.startsWith('refund.');
    const table = refund ? 'project_access_refund_bindings' : 'project_access_dispute_bindings';
    const key = refund ? 'refund_id' : 'dispute_id';
    await client.query(`INSERT INTO ${table}
      (${key},purchase_id,payment_intent_id,charge_id,amount_cents,currency,provider_created)
      VALUES ($1,$2,$3,$4,$5,'usd',$6) ON CONFLICT (${key}) DO NOTHING`,
    [stored.object_id, purchase.id, stored.payment_intent_id, stored.charge_id,
      stored.amount_cents, stored.object_created]);
    const object = (await client.query(`SELECT * FROM ${table} WHERE ${key}=$1 FOR UPDATE`, [stored.object_id])).rows[0];
    if (!object || object.purchase_id !== purchase.id || object.payment_intent_id !== stored.payment_intent_id
      || object.charge_id !== stored.charge_id || object.amount_cents !== stored.amount_cents
      || object.currency !== stored.currency || Number(object.provider_created) !== Number(stored.object_created)) {
      await client.query('ROLLBACK');
      return { eventId, status: 'ineligible' };
    }
    const inserted = await client.query(`INSERT INTO project_access_checkout_events
      (event_id,purchase_id,provider_checkout_id,event_type,api_version,provider_created,payload_sha256,
        payment_status,payment_intent_id,purchase_snapshot,refund_id,refund_amount_cents,
        dispute_id,dispute_amount_cents,dispute_status,received_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'unpaid',$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
    [eventId,purchase.id,binding.provider_checkout_id,stored.event_type,stored.api_version,
      stored.provider_created,stored.payload_sha256,stored.payment_intent_id,
      JSON.stringify(paid.purchase_snapshot),refund ? stored.object_id : null,
      refund ? stored.amount_cents : null,refund ? null : stored.object_id,
      refund ? null : stored.amount_cents,stored.dispute_status,stored.received_at]);
    if (!inserted.rowCount) {
      await client.query('ROLLBACK');
      return { eventId, status: 'ineligible' };
    }
    await client.query('DELETE FROM project_access_unbound_events WHERE event_id=$1', [eventId]);
    await client.query(`INSERT INTO audit_events (actor_id,target_user_id,action,entity_type,entity_id,metadata)
      VALUES (NULL,$1,'lead_checkout.quarantine_promoted','project',$2,$3)`,
    [purchase.contractor_id,purchase.project_id,JSON.stringify({ purchase_id: purchase.id,
      event_id: eventId, payment_intent_id: stored.payment_intent_id, object_id: stored.object_id })]);
    await client.query('COMMIT');
    return { eventId, status: 'promoted' };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { discard = error; }
    throw error;
  } finally { client.release(discard); }
}

module.exports = { reconcileUnboundLeadEvent };
