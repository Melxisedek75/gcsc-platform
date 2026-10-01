const { fulfillLeadCheckoutEvent } = require('./lead-checkout-fulfillment.cjs');
const { randomUUID } = require('node:crypto');

function fail() { throw Object.assign(new Error('lead_retry_request_invalid'), { code: 'lead_retry_request_invalid' }); }
const eventId = value => typeof value === 'string' && /^evt_[a-zA-Z0-9]{1,251}$/.test(value);
const transientCodes = new Set(['40001', '40P01', '55P03', '57014']);

// Dormant, explicitly invoked sweep. The inbox is durable; the lease covers
// process loss between selecting a due event and recording its outcome.
async function sweepDueLeadCheckoutEvents(pool, options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)
    || Object.keys(options).some(key => !['limit', 'eventIds'].includes(key))) fail();
  const limit = options.limit ?? 20;
  const ids = options.eventIds ?? null;
  if (!Number.isInteger(limit) || limit < 1 || limit > 50
    || (ids !== null && (!Array.isArray(ids) || ids.length < 1 || ids.length > 50
      || ids.some(id => !eventId(id)) || new Set(ids).size !== ids.length))) fail();

  const selected = (await pool.query(`SELECT e.event_id FROM project_access_checkout_events e
    LEFT JOIN project_access_checkout_retries r ON r.event_id=e.event_id
    WHERE e.status='received' AND e.provider_created<=FLOOR(EXTRACT(EPOCH FROM clock_timestamp()))
      AND ($2::text[] IS NULL OR e.event_id=ANY($2::text[]))
      AND (r.event_id IS NULL OR (r.state='ready' AND r.attempts<5
        AND r.next_attempt_at<=clock_timestamp() AND r.lease_until<=clock_timestamp()))
    ORDER BY e.provider_created,e.event_id LIMIT $1`, [limit, ids])).rows;
  const counts = { considered: selected.length, processed: 0, reviewRequired: 0, retried: 0, parked: 0, skipped: 0 };

  for (const selectedEvent of selected) {
    const id = selectedEvent.event_id;
    const token = randomUUID();
    const claim = await pool.query(`INSERT INTO project_access_checkout_retries
      (event_id,next_attempt_at,lease_until,lease_token)
      SELECT event_id,clock_timestamp(),clock_timestamp()+INTERVAL '30 seconds',$2::uuid
      FROM project_access_checkout_events
      WHERE event_id=$1 AND status='received'
        AND provider_created<=FLOOR(EXTRACT(EPOCH FROM clock_timestamp()))
      ON CONFLICT (event_id) DO UPDATE SET lease_until=EXCLUDED.lease_until,
        lease_token=EXCLUDED.lease_token,updated_at=clock_timestamp()
      WHERE project_access_checkout_retries.state='ready' AND project_access_checkout_retries.attempts<5
        AND project_access_checkout_retries.next_attempt_at<=clock_timestamp()
        AND project_access_checkout_retries.lease_until<=clock_timestamp()
      RETURNING event_id`, [id, token]);
    if (!claim.rowCount) { counts.skipped++; continue; }

    try {
      const result = await fulfillLeadCheckoutEvent(pool, id);
      await pool.query('DELETE FROM project_access_checkout_retries WHERE event_id=$1 AND lease_token=$2::uuid', [id, token]);
      if (result.duplicate) counts.skipped++;
      else if (result.status === 'processed') counts.processed++;
      else counts.reviewRequired++;
    } catch (error) {
      // A successful fulfillment may lose its COMMIT acknowledgement. Re-read
      // committed state before counting an error or scheduling another attempt.
      const stored = (await pool.query('SELECT status FROM project_access_checkout_events WHERE event_id=$1', [id])).rows[0];
      if (stored?.status && stored.status !== 'received') {
        await pool.query('DELETE FROM project_access_checkout_retries WHERE event_id=$1 AND lease_token=$2::uuid', [id, token]);
        counts.skipped++;
        continue;
      }
      const kind = error?.code === 'lead_fulfillment_event_not_due' ? 'not_due'
        : transientCodes.has(error?.code) ? 'temporary' : 'unexpected';
      const retry = await pool.query(`UPDATE project_access_checkout_retries SET
        attempts=attempts+1,
        state=CASE WHEN attempts+1>=5 OR $2='unexpected' THEN 'parked' ELSE 'ready' END,
        next_attempt_at=clock_timestamp()+LEAST(300,5*POWER(3,attempts))*INTERVAL '1 second',
        lease_until='-infinity'::timestamptz,last_error_kind=$2,updated_at=clock_timestamp()
        WHERE event_id=$1 AND lease_token=$3::uuid AND state='ready' AND lease_until>clock_timestamp()
        RETURNING state`, [id, kind, token]);
      if (retry.rows[0]?.state === 'ready') counts.retried++;
      else if (retry.rows[0]?.state === 'parked') counts.parked++;
      else counts.skipped++;
    }
  }
  return counts;
}

module.exports = { sweepDueLeadCheckoutEvents };
