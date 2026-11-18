import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { handler } from '../src/handlers/rubric/view.ts'
import { closePool, query } from '../src/shared/db.ts'
import { makeEvent, parse } from './helpers.ts'

let designerId: string

async function seedRubric(state: string, publishDate: string | null): Promise<string> {
  const { rows } = await query<{ rubric_id: string }>(
    `INSERT INTO rubric (designer_id, name, state, publish_date)
     VALUES ($1, 'Sample', $2, $3) RETURNING rubric_id`,
    [designerId, state, publishDate],
  )
  return rows[0].rubric_id
}

const view = async (rubricId: string) =>
  parse(
    await handler({
      ...makeEvent({ method: 'GET' }),
      queryStringParameters: { rubricId },
    }),
  )

describe('View Rubric', () => {
  beforeAll(async () => {
    const { rows } = await query<{ account_id: string }>(
      `INSERT INTO account (email, password_hash, role)
       VALUES ($1, 'x', 'RubricDesigner') RETURNING account_id`,
      [`designer-${crypto.randomUUID()}@test.org`],
    )
    designerId = rows[0].account_id
  })

  it('returns a published rubric', async () => {
    const rubricId = await seedRubric('Published', '2999-01-01')

    const r = await view(rubricId)

    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ rubricId, state: 'Published', questions: [] })
  })

  it('404 for an unpublished rubric', async () => {
    const r = await view(await seedRubric('Unpublished', null))
    expect(r.status).toBe(404)
  })

  afterAll(async () => {
    await query(`DELETE FROM rubric WHERE designer_id = $1`, [designerId])
    await closePool()
  })
})
