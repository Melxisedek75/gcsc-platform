function fail(code) { throw Object.assign(new Error(code), { code }); }
const seconds = value => Math.floor(new Date(value).getTime() / 1000);

function quoteMatches(event, purchase) {
  const quote = event.purchase_snapshot;
  return quote && Object.keys(quote).sort().join(',') === 'amount_cents,contractor_id,created_at,currency,expires_at,price_version,project_id'
    && quote.project_id === purchase.project_id && quote.contractor_id === purchase.contractor_id
    && quote.amount_cents === purchase.amount_cents && quote.currency === purchase.currency
    && quote.price_version === purchase.price_version && quote.expires_at === seconds(purchase.expires_at)
    && quote.created_at === new Date(purchase.created_at).toISOString();
}

function response(event, duplicate) {
  return { eventId: event.event_id, purchaseId: event.purchase_id,
    status: event.status, outcome: event.outcome, duplicate };
}

// Internal, dormant worker entrypoint. Only a stored, verified inbox ID is accepted;
// redirects, HTTP bodies and caller-supplied payment/identity fields have no authority.
async function fulfillLeadCheckoutEvent(pool, eventId) {
  if (typeof eventId !== 'string' || !/^evt_[a-zA-Z0-9]{1,251}$/.test(eventId))
    fail('lead_fulfillment_request_invalid');
  const client = await pool.connect();
  let discard;
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '10s'");
    await client.query("SET LOCAL statement_timeout = '15s'");
    const hint = (await client.query(`SELECT e.purchase_id,p.project_id,p.contractor_id
      FROM project_access_checkout_events e JOIN project_access_purchases p ON p.id=e.purchase_id
      WHERE e.event_id=$1`, [eventId])).rows[0];
    if (!hint) fail('lead_fulfillment_event_missing');

    // Match checkout/bid lock order. Recheck hints after locking; intake/attach
    // acquire purchase before binding, and never wait on a project while holding it.
    const project = (await client.query('SELECT * FROM projects WHERE id=$1 FOR UPDATE', [hint.project_id])).rows[0];
    if (!project) fail('lead_fulfillment_state_invalid');
    const users = (await client.query('SELECT id,role,is_active FROM users WHERE id=ANY($1::int[]) ORDER BY id FOR SHARE',
      [[hint.contractor_id, project.homeowner_id]])).rows;
    const grant = (await client.query('SELECT * FROM project_access_entitlements WHERE project_id=$1 AND contractor_id=$2 FOR UPDATE',
      [hint.project_id, hint.contractor_id])).rows[0];
    const purchase = (await client.query('SELECT * FROM project_access_purchases WHERE id=$1 FOR UPDATE', [hint.purchase_id])).rows[0];
    const binding = (await client.query('SELECT * FROM project_access_checkout_bindings WHERE purchase_id=$1 FOR UPDATE', [hint.purchase_id])).rows[0];
    const event = (await client.query('SELECT * FROM project_access_checkout_events WHERE event_id=$1 FOR UPDATE', [eventId])).rows[0];
    if (!purchase || !event || event.purchase_id !== hint.purchase_id
      || purchase.project_id !== hint.project_id || purchase.contractor_id !== hint.contractor_id)
      fail('lead_fulfillment_state_invalid');
    if (event.status !== 'received') {
      if (!event.outcome || !event.processed_at) fail('lead_fulfillment_state_invalid');
      await client.query('COMMIT');
      return response(event, true);
    }
    const now = (await client.query('SELECT clock_timestamp() AS now')).rows[0].now;

    async function finish(status, outcome, nextPurchaseStatus) {
      if (nextPurchaseStatus) await client.query(
        'UPDATE project_access_purchases SET status=$2,updated_at=clock_timestamp() WHERE id=$1',
        [purchase.id, nextPurchaseStatus]);
      const stored = (await client.query(`UPDATE project_access_checkout_events
        SET status=$2,outcome=$3,processed_at=clock_timestamp() WHERE event_id=$1 RETURNING *`,
      [eventId, status, outcome])).rows[0];
      await client.query(`INSERT INTO audit_events (actor_id,target_user_id,action,entity_type,entity_id,metadata)
        VALUES (NULL,$1,$2,'project',$3,$4)`, [purchase.contractor_id, `lead_checkout.${outcome}`, purchase.project_id,
        JSON.stringify({ purchase_id: purchase.id, event_id: eventId, provider_mode: 'test',
          provider_checkout_id: event.provider_checkout_id, payment_intent_id: event.payment_intent_id,
          amount_cents: purchase.amount_cents, currency: purchase.currency,
          refund_id: event.refund_id, refund_amount_cents: event.refund_amount_cents,
          dispute_id: event.dispute_id, dispute_amount_cents: event.dispute_amount_cents,
          dispute_status: event.dispute_status, outcome })]);
      await client.query('COMMIT');
      return response(stored, false);
    }
    // A late event for a terminal purchase must not claim the active-purchase slot
    // from a replacement purchase. The event/audit retain the reconciliation need.
    const review = outcome => finish('review_required', outcome,
      purchase.status === 'pending' ? 'review_required' : null);

    if (event.provider_mode !== 'test' || purchase.provider_mode !== 'test'
      || !binding || binding.provider_checkout_id !== event.provider_checkout_id
      || (purchase.provider_checkout_id && purchase.provider_checkout_id !== event.provider_checkout_id)
      || (event.payment_intent_id && binding.payment_intent_id !== event.payment_intent_id))
      return await review('binding_mismatch');
    if (!event.purchase_snapshot) return await review('legacy_event');
    if (!quoteMatches(event, purchase)) return await review('quote_mismatch');
    const created = Number(event.provider_created);
    if (!Number.isSafeInteger(created) || created < seconds(purchase.created_at))
      return await review('invalid_event_time');
    // Intake permits clock skew. Preserve the received fact for a later retry
    // instead of permanently holding it while the database clock catches up.
    if (created > seconds(now)) fail('lead_fulfillment_event_not_due');

    if (['charge.dispute.created', 'charge.dispute.updated', 'charge.dispute.closed'].includes(event.event_type)) {
      const dispute = (await client.query('SELECT * FROM project_access_dispute_bindings WHERE dispute_id=$1 FOR UPDATE', [event.dispute_id])).rows[0];
      if (!dispute || dispute.purchase_id !== purchase.id || dispute.payment_intent_id !== event.payment_intent_id
        || dispute.amount_cents !== event.dispute_amount_cents || dispute.currency !== purchase.currency
        || dispute.amount_cents > purchase.amount_cents || Number(dispute.provider_created) < seconds(purchase.created_at)
        || Number(dispute.provider_created) > created) return await review('dispute_binding_mismatch');
      if (grant && grant.provider_payment_id !== event.payment_intent_id) return await review('entitlement_conflict');
      const replacement = await client.query(`SELECT 1 FROM project_access_purchases
        WHERE project_id=$1 AND contractor_id=$2 AND id<>$3 AND status IN ('pending','paid','review_required') FOR UPDATE`,
      [purchase.project_id, purchase.contractor_id, purchase.id]);
      if (replacement.rowCount) return await review('superseded_dispute');
      if (purchase.status === 'refunded' || grant?.status === 'refunded') return await review('dispute_after_refund');

      // Even won/closed facts require separate reconciliation; never restore
      // access from a stale lifecycle snapshot or infer bank settlement.
      if (grant) {
        await client.query(`UPDATE project_access_entitlements SET status='revoked',updated_at=clock_timestamp()
          WHERE project_id=$1 AND contractor_id=$2`, [purchase.project_id, purchase.contractor_id]);
      } else {
        const inserted = await client.query(`INSERT INTO project_access_entitlements
          (project_id,contractor_id,status,provider_payment_id,verified_at)
          VALUES ($1,$2,'revoked',$3,clock_timestamp()) ON CONFLICT (project_id,contractor_id) DO NOTHING`,
        [purchase.project_id, purchase.contractor_id, event.payment_intent_id]);
        if (!inserted.rowCount) return await review('entitlement_conflict');
      }
      return await finish('review_required', 'dispute_observed',
        ['pending', 'paid', 'review_required'].includes(purchase.status) ? 'review_required' : null);
    }

    if (['refund.created', 'refund.updated'].includes(event.event_type)) {
      const refund = (await client.query('SELECT * FROM project_access_refund_bindings WHERE refund_id=$1 FOR UPDATE', [event.refund_id])).rows[0];
      if (!refund || refund.purchase_id !== purchase.id || refund.payment_intent_id !== event.payment_intent_id
        || refund.amount_cents !== event.refund_amount_cents || refund.currency !== purchase.currency
        || refund.amount_cents > purchase.amount_cents || Number(refund.provider_created) < seconds(purchase.created_at)
        || Number(refund.provider_created) > created) return await review('refund_binding_mismatch');
      if (grant && grant.provider_payment_id !== event.payment_intent_id) return await review('entitlement_conflict');
      const replacement = await client.query(`SELECT 1 FROM project_access_purchases
        WHERE project_id=$1 AND contractor_id=$2 AND id<>$3 AND status IN ('pending','paid','review_required') FOR UPDATE`,
      [purchase.project_id, purchase.contractor_id, purchase.id]);
      if (replacement.rowCount) return await review('superseded_refund');
      if (purchase.status === 'refunded' && grant?.status === 'refunded')
        return await finish('processed', 'already_refunded');

      // Observe a provider-confirmed refund; never initiate money movement. A
      // partial refund suspends access pending policy/evidence, not a 50/50 rule.
      const full = refund.amount_cents === purchase.amount_cents;
      const grantStatus = full ? 'refunded' : 'revoked';
      if (grant) {
        await client.query(`UPDATE project_access_entitlements SET status=$3,updated_at=clock_timestamp()
          WHERE project_id=$1 AND contractor_id=$2`, [purchase.project_id, purchase.contractor_id, grantStatus]);
      } else {
        const inserted = await client.query(`INSERT INTO project_access_entitlements
          (project_id,contractor_id,status,provider_payment_id,verified_at)
          VALUES ($1,$2,$3,$4,clock_timestamp()) ON CONFLICT (project_id,contractor_id) DO NOTHING`,
        [purchase.project_id, purchase.contractor_id, grantStatus, event.payment_intent_id]);
        if (!inserted.rowCount) return await review('entitlement_conflict');
      }
      return await finish(full ? 'processed' : 'review_required', full ? 'refund_observed' : 'partial_refund_review',
        full ? 'refunded' : ['pending', 'paid', 'review_required'].includes(purchase.status) ? 'review_required' : null);
    }

    if (purchase.status === 'paid') {
      if (!grant || grant.status !== 'paid' || !grant.verified_at || !binding.payment_intent_id
        || grant.provider_payment_id !== binding.payment_intent_id) return await review('entitlement_conflict');
      return await finish('processed', event.payment_status === 'paid' ? 'already_paid' : 'ignored_after_paid');
    }
    if (purchase.status !== 'pending') return await review('purchase_not_pending');
    if (grant) return await review('entitlement_conflict');
    if (binding.payment_intent_id) {
      // Unknown-PI intake never takes purchase locks under this intent lock.
      // Recheck after waiting so an accepted quarantine cannot race past a grant.
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`lead:unbound:${binding.payment_intent_id}`]);
      const unbound = await client.query('SELECT 1 FROM project_access_unbound_events WHERE payment_intent_id=$1 LIMIT 1', [binding.payment_intent_id]);
      if (unbound.rowCount) return await review('unbound_negative_event');
    }
    const disputePending = await client.query('SELECT 1 FROM project_access_checkout_events WHERE purchase_id=$1 AND dispute_id IS NOT NULL LIMIT 1', [purchase.id]);
    if (disputePending.rowCount) return await review('dispute_pending');
    const refundPending = await client.query('SELECT 1 FROM project_access_checkout_events WHERE purchase_id=$1 AND refund_id IS NOT NULL LIMIT 1', [purchase.id]);
    if (refundPending.rowCount) return await review('refund_pending');
    // Intake also locks this purchase: facts committed before this decision
    // cannot race past us. Contradictory queued facts need reconciliation.
    const conflicting = await client.query(`SELECT 1 FROM project_access_checkout_events
      WHERE purchase_id=$1 AND (($2='checkout.session.expired' AND payment_status='paid')
        OR ($3='paid' AND event_type='checkout.session.expired')) LIMIT 1`,
    [purchase.id, event.event_type, event.payment_status]);
    if (conflicting.rowCount) return await review('conflicting_events');
    if (event.event_type === 'checkout.session.expired' && event.payment_status === 'unpaid')
      return await finish('processed', 'expired', 'expired');
    if (event.event_type !== 'checkout.session.completed' || event.payment_status !== 'paid'
      || !event.payment_intent_id) return await review('payment_unpaid');
    if (created >= seconds(purchase.expires_at) || new Date(now).getTime() >= new Date(purchase.expires_at).getTime())
      return await review('late_payment');
    if (!project.published || project.status !== 'open' || project.escrow_id)
      return await review('project_unavailable');
    if (!users.some(user => user.id === purchase.contractor_id && user.role === 'contractor' && user.is_active)
      || !users.some(user => user.id === project.homeowner_id && user.role === 'homeowner' && user.is_active))
      return await review('identity_unavailable');

    const inserted = await client.query(`INSERT INTO project_access_entitlements
      (project_id,contractor_id,status,provider_payment_id,verified_at)
      VALUES ($1,$2,'paid',$3,clock_timestamp()) ON CONFLICT (project_id,contractor_id) DO NOTHING`,
    [purchase.project_id, purchase.contractor_id, event.payment_intent_id]);
    if (!inserted.rowCount) return await review('entitlement_conflict');
    return await finish('processed', 'paid_granted', 'paid');
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { discard = error; }
    throw error;
  } finally { client.release(discard); }
}

module.exports = { fulfillLeadCheckoutEvent };
