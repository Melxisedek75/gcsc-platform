function conflict(code) { throw Object.assign(new Error(code), { code }); }

// Caller holds the purchase lock and owns the transaction. One provider session
// and payment intent can belong to only one purchase, even before HTTP attachment.
async function bindCheckoutSession(client, purchaseId, sessionId, paymentIntentId = null,
  failureCode = 'lead_checkout_session_conflict') {
  const inserted = await client.query(`INSERT INTO project_access_checkout_bindings
    (provider_checkout_id,purchase_id,payment_intent_id) VALUES ($1,$2,$3)
    ON CONFLICT DO NOTHING RETURNING *`, [sessionId, purchaseId, paymentIntentId]);
  const row = inserted.rows[0] || (await client.query(`SELECT * FROM project_access_checkout_bindings
    WHERE provider_checkout_id=$1 FOR UPDATE`, [sessionId])).rows[0];
  if (!row || row.purchase_id !== purchaseId
    || (paymentIntentId && row.payment_intent_id && row.payment_intent_id !== paymentIntentId)) conflict(failureCode);
  if (paymentIntentId && !row.payment_intent_id) {
    try {
      await client.query('UPDATE project_access_checkout_bindings SET payment_intent_id=$2 WHERE provider_checkout_id=$1',
        [sessionId, paymentIntentId]);
    } catch (error) {
      if (error.code === '23505') conflict(failureCode);
      throw error;
    }
  }
}

module.exports = { bindCheckoutSession };
