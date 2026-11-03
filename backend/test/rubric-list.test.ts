import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { handler } from '../src/handlers/rubric/list.ts'
import { closePool, query } from '../src/shared/db.ts'
import { makeEvent, parse } from './helpers.ts'

let designerId: string
let older: string
let newer: string

async function seedRubric(state: string, publishDate: string | null): Promise<string> {
  const { rows } = await query<{ rubric_id: string }>(
    `INSERT INTO rubric (designer_id, name, state, publish_date)
     VALUES ($1, 'Sample', $2, $3) RETURNING rubric_id`,
    [designerId, state, publishDate],
  )
  return rows[0].rubric_id
}

const list = async (queryStringParameters: Record<string, string>) =>
  parse(
    await handler({
      ...makeEvent({ method: 'GET' }),
      queryStringParameters,
    }),
  )

describe('List Rubrics', () => {
  beforeAll(async () => {
    const { rows } = await query<{ account_id: string }>(
      `INSERT INTO account (email, password_hash, role)
       VALUES ($1, 'x', 'RubricDesigner') RETURNING account_id`,
      [`designer-${new Date()}@test.org`],
    )
    designerId = rows[0].account_id

    await seedRubric('Unpublished', null)
    older = await seedRubric('Published', '2999-01-01')
    newer = await seedRubric('Published', '2999-01-02')
    await query(
      `INSERT INTO question (rubric_id, section, position, text, explanations)
       VALUES ($1, 1, 1, 'Question', '{}')`,
      [newer],
    )
    await query(
      `UPDATE rubric SET state = 'Deprecated', replacement_rubric_id = $1, deprecated_at = now()
       WHERE rubric_id = $2`,
      [newer, older],
    )
  })

  it('lists rubrics newest first with state and question counts', async () => {
    const r = await list({ limit: '2' })

    expect(r.status).toBe(200)
    expect(r.body.rubrics).toEqual([
      {
        rubricId: newer,
        name: 'Sample',
        state: 'Published',
        publishDate: '2999-01-02',
        questionCount: 1,
      },
      {
        rubricId: older,
        name: 'Sample',
        state: 'Deprecated',
        publishDate: '2999-01-01',
        questionCount: 0,
      },
    ])
  })

  it('lists unpublished rubrics last', async () => {
    const { body } = await list({ limit: '1' })

    const r = await list({ limit: '1', offset: String(body.page.totalCount - 1) })

    expect(r.body.rubrics[0]).toMatchObject({ state: 'Unpublished', publishDate: null })
  })

  it('pages with limit and offset', async () => {
    const r = await list({ limit: '1', offset: '1' })

    expect(r.body.rubrics[0].rubricId).toBe(older)
    expect(r.body.page).toMatchObject({ limit: 1, offset: 1 })
  })

  it('400 for an out-of-range limit', async () => {
    const r = await list({ limit: '101' })
    expect(r.status).toBe(400)
  })

  afterAll(async () => {
    await query(`DELETE FROM rubric WHERE designer_id = $1`, [designerId])
    await closePool()
  })
})
