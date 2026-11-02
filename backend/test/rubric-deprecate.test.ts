import { afterAll, describe, expect, it } from 'vitest'
import { handler } from '../src/handlers/rubric/deprecate.ts'
import { closePool, query } from '../src/shared/db.ts'
import { makeEvent, parse } from './helpers.ts'

async function seedRubric(
  publishDate: string | null = '2026-01-01',
): Promise<string> {
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

async function readRubric(rubricId: string) {
  const { rows } = await query<{
    state: string
    replacement_rubric_id: string | null
  }>(`SELECT state, replacement_rubric_id FROM rubric WHERE rubric_id = $1`, [
    rubricId,
  ])
  return rows[0]
}

const deprecate = async (rubricId: unknown, replacementRubricId: unknown) =>
  parse(await handler(makeEvent({ body: { rubricId, replacementRubricId } })))

describe('Deprecate Rubric', () => {
  it('deprecates a rubric in favour of one published the same day', async () => {
    const rubricId = await seedRubric('2026-01-01')
    const replacement = await seedRubric('2026-01-01')
    const r = await deprecate(rubricId, replacement)
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({
      rubricId,
      state: 'Deprecated',
      replacementRubricId: replacement,
    })
    expect(await readRubric(rubricId)).toEqual({
      state: 'Deprecated',
      replacement_rubric_id: replacement,
    })
  })

  it('400 when a rubric names itself as replacement', async () => {
    const rubricId = await seedRubric()
    const r = await deprecate(rubricId, rubricId)
    expect(r.status).toBe(400)
    expect((await readRubric(rubricId)).state).toBe('Published')
  })

  it('409 NOT_PUBLISHED for an unpublished rubric', async () => {
    const rubricId = await seedRubric(null)
    const replacement = await seedRubric()
    const r = await deprecate(rubricId, replacement)
    expect(r.status).toBe(409)
    expect(r.body.error.code).toBe('NOT_PUBLISHED')
    expect((await readRubric(rubricId)).state).toBe('Unpublished')
  })

  it('409 RUBRIC_NOT_PUBLISHED when the replacement is unpublished', async () => {
    const rubricId = await seedRubric()
    const replacement = await seedRubric(null)
    const r = await deprecate(rubricId, replacement)
    expect(r.status).toBe(409)
    expect(r.body.error.code).toBe('RUBRIC_NOT_PUBLISHED')
    expect((await readRubric(rubricId)).state).toBe('Published')
  })

  it('409 REPLACEMENT_NOT_NEWER when the replacement was published earlier', async () => {
    const rubricId = await seedRubric('2026-02-01')
    const replacement = await seedRubric('2026-01-01')
    const r = await deprecate(rubricId, replacement)
    expect(r.status).toBe(409)
    expect(r.body.error.code).toBe('REPLACEMENT_NOT_NEWER')
    expect((await readRubric(rubricId)).state).toBe('Published')
  })

  afterAll(closePool)
})
