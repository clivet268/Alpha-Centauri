import { afterAll, describe, expect, it } from 'vitest'
import { handler } from '../src/handlers/rubric/delete.ts'
import { closePool, query } from '../src/shared/db.ts'
import { makeEvent, parse } from './helpers.ts'

async function seedRubric(publishDate: string | null = null): Promise<string> {
  const { rows: accounts } = await query<{ account_id: string }>(
    `INSERT INTO account (email, password_hash, role)
     VALUES ($1, 'x', 'RubricDesigner') RETURNING account_id`,
    [`designer-${crypto.randomUUID()}@test.org`],
  )
  const { rows } = await query<{ rubric_id: string }>(
    `INSERT INTO rubric (designer_id, name, state, publish_date)
     VALUES ($1, 'Sample', $2, $3) RETURNING rubric_id`,
    [
      accounts[0].account_id,
      publishDate ? 'Published' : 'Unpublished',
      publishDate,
    ],
  )
  return rows[0].rubric_id
}

async function rubricExists(rubricId: string): Promise<boolean> {
  const { rows } = await query(`SELECT 1 FROM rubric WHERE rubric_id = $1`, [
    rubricId,
  ])
  return rows.length === 1
}

const remove = async (body: unknown) =>
  parse(await handler(makeEvent({ body })))

describe('Delete Rubric', () => {
  it('deletes an unpublished rubric and its questions', async () => {
    const rubricId = await seedRubric()
    await query(
      `INSERT INTO question (rubric_id, section, position, text, explanations)
       VALUES ($1, 1, 1, 'Is key relevant literature cited?', '{}')`,
      [rubricId],
    )

    const r = await remove({ rubricId })
    expect(r.status).toBe(200)
    expect(r.body.rubricId).toBe(rubricId)
    expect(r.body.deletedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)

    expect(await rubricExists(rubricId)).toBe(false)
    const { rows } = await query(
      `SELECT 1 FROM question WHERE rubric_id = $1`,
      [rubricId],
    )
    expect(rows).toHaveLength(0)
  })

  it('400 when rubricId is missing', async () => {
    const r = await remove({})
    expect(r.status).toBe(400)
    expect(r.body.error).toEqual({
      code: 'INVALID_INPUT',
      message: 'rubricId is required.',
    })
  })

  it('404 for an unknown rubric', async () => {
    const r = await remove({ rubricId: 'rb_doesnotexist' })
    expect(r.status).toBe(404)
  })

  it('409 RUBRIC_PUBLISHED for a published rubric', async () => {
    const rubricId = await seedRubric('2026-01-01')
    const r = await remove({ rubricId })
    expect(r.status).toBe(409)
    expect(r.body.error).toEqual({
      code: 'RUBRIC_PUBLISHED',
      message: 'Published rubrics cannot be deleted.',
    })
    expect(await rubricExists(rubricId)).toBe(true)
  })

  afterAll(closePool)
})
