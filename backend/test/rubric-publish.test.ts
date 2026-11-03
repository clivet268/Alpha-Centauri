import { afterAll, describe, expect, it } from 'vitest'
import { handler } from '../src/handlers/rubric/publish.ts'
import { closePool, query } from '../src/shared/db.ts'
import { makeEvent, parse } from './helpers.ts'

async function seedRubric({
  thresholds = [10, 20],
  sections = [1, 2, 3, 4, 5],
}: {
  thresholds?: [number, number] | null
  sections?: number[]
} = {}): Promise<string> {
  const { rows: accounts } = await query<{ account_id: string }>(
    `INSERT INTO account (email, password_hash, role)
     VALUES ($1, 'x', 'RubricDesigner') RETURNING account_id`,
    [`designer-${Date.now()}@test.org`],
  )
  const { rows: rubrics } = await query<{ rubric_id: string }>(
    `INSERT INTO rubric (designer_id, name, low_threshold, high_threshold)
     VALUES ($1, 'Sample', $2, $3) RETURNING rubric_id`,
    [accounts[0].account_id, thresholds?.[0] ?? null, thresholds?.[1] ?? null],
  )
  for (const section of sections) {
    await query(
      `INSERT INTO question (rubric_id, section, position, text, explanations)
       VALUES ($1, $2, 1, 'Question', '{}')`,
      [rubrics[0].rubric_id, section],
    )
  }
  return rubrics[0].rubric_id
}

async function readRubric(rubricId: string) {
  const { rows } = await query<{ state: string; publish_date: string | null }>(
    `SELECT state, to_char(publish_date, 'YYYY-MM-DD') AS publish_date
     FROM rubric WHERE rubric_id = $1`,
    [rubricId],
  )
  return rows[0]
}

const publish = async (rubricId: unknown) =>
  parse(await handler(makeEvent({ body: { rubricId } })))

describe('Publish Rubric', () => {
  it('publishes a complete rubric and records the date', async () => {
    const rubricId = await seedRubric()
    const r = await publish(rubricId)
    expect(r.status).toBe(200)
    expect(await readRubric(rubricId)).toEqual({
      state: 'Published',
      publish_date: r.body.publishDate,
    })
  })

  it('409 RUBRIC_INCOMPLETE without thresholds or a question in every section', async () => {
    for (const seed of [{ thresholds: null }, { sections: [1, 2, 3, 4] }]) {
      const rubricId = await seedRubric(seed)
      const r = await publish(rubricId)
      expect(r.status).toBe(409)
      expect(r.body.error.code).toBe('RUBRIC_INCOMPLETE')
      expect((await readRubric(rubricId)).state).toBe('Unpublished')
    }
  })

  it('409 RUBRIC_FROZEN and keeps the original date when already published', async () => {
    const rubricId = await seedRubric()
    await query(
      `UPDATE rubric SET state = 'Published', publish_date = '2020-01-02' WHERE rubric_id = $1`,
      [rubricId],
    )
    const r = await publish(rubricId)
    expect(r.status).toBe(409)
    expect(r.body.error.code).toBe('RUBRIC_FROZEN')
    expect((await readRubric(rubricId)).publish_date).toBe('2020-01-02')
  })

  afterAll(closePool)
})
