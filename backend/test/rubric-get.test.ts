import { afterAll, describe, expect, it } from 'vitest'
import { handler } from '../src/handlers/rubric/get.ts'
import { closePool, query } from '../src/shared/db.ts'
import { makeEvent, parse } from './helpers.ts'

const explanations = { 5: 'a', 4: 'b', 3: 'c', 2: 'd', 1: 'e' }

async function seedRubric(): Promise<string> {
  const { rows: accounts } = await query<{ account_id: string }>(
    `INSERT INTO account (email, password_hash, role)
     VALUES ($1, 'x', 'RubricDesigner') RETURNING account_id`,
    [`designer-${crypto.randomUUID()}@test.org`],
  )
  const { rows } = await query<{ rubric_id: string }>(
    `INSERT INTO rubric (designer_id, name) VALUES ($1, 'Sample') RETURNING rubric_id`,
    [accounts[0].account_id],
  )
  return rows[0].rubric_id
}

const get = async (rubricId: string) =>
  parse(
    await handler({
      ...makeEvent({ method: 'GET' }),
      queryStringParameters: { rubricId },
    }),
  )

describe('Get Rubric', () => {
  it('returns an unpublished rubric with its questions', async () => {
    const rubricId = await seedRubric()
    await query(
      `INSERT INTO question (rubric_id, section, position, text, explanations)
       VALUES ($1, 1, 1, 'Question', $2)`,
      [rubricId, JSON.stringify(explanations)],
    )

    const r = await get(rubricId)

    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({
      rubricId,
      name: 'Sample',
      state: 'Unpublished',
      questions: [{ section: 1, text: 'Question', explanations }],
    })
  })

  it('404 for an unknown rubric', async () => {
    const r = await get('rb_missing')
    expect(r.status).toBe(404)
  })

  afterAll(closePool)
})
