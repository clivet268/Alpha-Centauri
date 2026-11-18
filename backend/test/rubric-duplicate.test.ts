import { afterAll, describe, expect, it } from 'vitest'
import { handler } from '../src/handlers/rubric/duplicate.ts'
import { closePool, query } from '../src/shared/db.ts'
import { makeEvent, parse, testDesignerId } from './helpers.ts'

async function seedPublishedRubric(): Promise<string> {
  const { rows: accounts } = await query<{ account_id: string }>(
    `INSERT INTO account (email, password_hash, role)
     VALUES ($1, 'x', 'RubricDesigner') RETURNING account_id`,
    [`designer-${crypto.randomUUID()}@test.org`],
  )
  const { rows } = await query<{ rubric_id: string }>(
    `INSERT INTO rubric (designer_id, name, state, publish_date, low_threshold, high_threshold)
     VALUES ($1, 'Sample', 'Published', '2026-01-01', 10, 20) RETURNING rubric_id`,
    [accounts[0].account_id],
  )
  const rubricId = rows[0].rubric_id
  await query(
    `INSERT INTO question (rubric_id, section, position, text, explanations)
     VALUES ($1, 1, 0, 'Q1', '{"5":"a","4":"b","3":"c","2":"d","1":"e"}'),
            ($1, 2, 0, 'Q2', '{"5":"a","4":"b","3":"c","2":"d","1":"e"}')`,
    [rubricId],
  )
  return rubricId
}

const duplicate = async (body: object) =>
  parse(
    await handler(
      makeEvent({ body: { designerId: await testDesignerId(), ...body } }),
    ),
  )

describe('Duplicate Rubric', () => {
  it('copies a published rubric into a new unpublished one', async () => {
    const rubricId = await seedPublishedRubric()
    const r = await duplicate({ rubricId })
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({
      name: 'Copy of Sample',
      state: 'Unpublished',
      publishDate: null,
      lowThreshold: 10,
      highThreshold: 20,
    })
    expect(r.body.rubricId).not.toBe(rubricId)
    expect(r.body.questions.map((q: any) => q.text)).toEqual(['Q1', 'Q2'])
  })

  it('uses the given name', async () => {
    const rubricId = await seedPublishedRubric()
    const r = await duplicate({ rubricId, name: 'Revised' })
    expect(r.body.name).toBe('Revised')
  })

  it('404 for an unknown rubric', async () => {
    const r = await duplicate({ rubricId: 'rb_missing' })
    expect(r.status).toBe(404)
  })

  afterAll(closePool)
})
