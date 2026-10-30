import { afterAll, describe, expect, it } from 'vitest'
import { handler } from '../src/handlers/rubric/create.ts'
import { closePool, query } from '../src/shared/db.ts'
import { makeEvent, parse } from './helpers.ts'

describe('Create Rubric', () => {
  it('400 for invalid input', async () => {
    const r = parse(await handler(makeEvent({ body: { designerId: 'ac_1', name: ' ' } })))
    expect(r.status).toBe(400)
  })

  it('creates a rubric', async () => {
    const { rows } = await query<{ account_id: string }>(
      `INSERT INTO account (email, password_hash, role)
       VALUES ($1, 'x', 'RubricDesigner') RETURNING account_id`,
      [`designer-${Date.now()}@test.org`],
    )
    const r = parse(
      await handler(makeEvent({ body: { designerId: rows[0].account_id, name: 'Sample' } })),
    )
    expect(r.status).toBe(200)
    expect(r.body.rubricId).toMatch(/^rb_/)
  })

  afterAll(closePool)
})
