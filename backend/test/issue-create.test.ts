import { afterAll, describe, expect, it } from 'vitest'
import { handler } from '../src/handlers/issue/create.ts'
import { closePool, query } from '../src/shared/db.ts'
import { makeEvent, parse } from './helpers.ts'

async function makeJournal(): Promise<string> {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const { rows: accounts } = await query<{ account_id: string }>(
    `INSERT INTO account (email, password_hash, role)
     VALUES ($1, 'x', 'RubricDesigner'), ($2, 'x', 'Editor') RETURNING account_id`,
    [`designer-${stamp}@test.org`, `editor-${stamp}@test.org`],
  )
  const { rows: rubrics } = await query<{ rubric_id: string }>(
    `INSERT INTO rubric (designer_id, name) VALUES ($1, 'R') RETURNING rubric_id`,
    [accounts[0].account_id],
  )
  const { rows } = await query<{ journal_id: string }>(
    `INSERT INTO journal (editor_id, rubric_id, name) VALUES ($1, $2, 'J') RETURNING journal_id`,
    [accounts[1].account_id, rubrics[0].rubric_id],
  )
  return rows[0].journal_id
}

describe('Create Issue', () => {
  it('400 for invalid input', async () => {
    const r = parse(
      await handler(makeEvent({ body: { journalId: 'jr_x', volume: 1, number: 13 } })),
    )
    expect(r.status).toBe(400)
  })

  it('creates an issue, then 409 on duplicate', async () => {
    const journalId = await makeJournal()
    const body = { journalId, volume: 1, number: 1 }

    const first = parse(await handler(makeEvent({ body })))
    expect(first.status).toBe(200)
    expect(first.body.issueId).toMatch(/^is_/)

    const dup = parse(await handler(makeEvent({ body })))
    expect(dup.status).toBe(409)
  })

  afterAll(closePool)
})
