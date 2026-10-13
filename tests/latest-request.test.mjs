import test from 'node:test'
import assert from 'node:assert/strict'

import { createLatestRequestGate } from '../apps/web/src/services/latest-request.mjs'

test('only the latest out-of-order request may update UI state', async () => {
  const gate = createLatestRequestGate()
  const applied = []
  let resolveFirst
  let resolveSecond
  const first = new Promise(resolve => { resolveFirst = resolve })
  const second = new Promise(resolve => { resolveSecond = resolve })

  const run = async (request, value) => {
    const requestId = gate.start()
    await request
    if (gate.isCurrent(requestId)) applied.push(value)
  }

  const firstRun = run(first, 'stale')
  const secondRun = run(second, 'fresh')
  resolveSecond()
  await secondRun
  resolveFirst()
  await firstRun

  assert.deepEqual(applied, ['fresh'])
})

test('invalidating a pending request prevents a late update after unmount', async () => {
  const gate = createLatestRequestGate()
  const requestId = gate.start()
  gate.invalidate()
  assert.equal(gate.isCurrent(requestId), false)
})
