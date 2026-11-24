import { afterAll, describe, expect, it } from 'vitest'
import { handler } from '../src/handlers/rubric/edit.ts'
import { closePool, query } from '../src/shared/db.ts'
import { makeEvent, parse, testDesignerId } from './helpers.ts'

async function seedRubric(publishDate: string | null = null): Promise<string> {
  const { rows } = await query<{ rubric_id: string }>(
    `INSERT INTO rubric (designer_id, name, state, publish_date, low_threshold, high_threshold)
     VALUES ($1, 'Sample', $2, $3, 10, 20) RETURNING rubric_id`,
    [
      await testDesignerId(),
      publishDate ? 'Published' : 'Unpublished',
      publishDate,
    ],
  )
  return rows[0].rubric_id
}

async function loadRubric(rubricId: string) {
  const { rows } = await query<{
    name: string
    low_threshold: number | null
    high_threshold: number | null
  }>(
    `SELECT name, low_threshold, high_threshold FROM rubric WHERE rubric_id = $1`,
    [rubricId],
  )
  return rows[0]
}

const edit = async (body: object) =>
  parse(
    await handler(
      makeEvent({ body: { designerId: await testDesignerId(), ...body } }),
    ),
  )

describe('Edit Rubric', () => {
  it('updates the name and thresholds', async () => {
    const rubricId = await seedRubric()
    const r = await edit({
      rubricId,
      name: '  Renamed  ',
      lowThreshold: 40,
      highThreshold: 55,
    })
    expect(r.status).toBe(200)
    expect(r.body.rubricId).toBe(rubricId)
    expect(r.body.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
    expect(await loadRubric(rubricId)).toEqual({
      name: 'Renamed',
      low_threshold: 40,
      high_threshold: 55,
    })
  })

  it('keeps fields that were not sent', async () => {
    const rubricId = await seedRubric()
    const r = await edit({ rubricId, highThreshold: 30 })
    expect(r.status).toBe(200)
    expect(await loadRubric(rubricId)).toEqual({
      name: 'Sample',
      low_threshold: 10,
      high_threshold: 30,
    })
  })

  it('400 when rubricId is missing', async () => {
    const r = await edit({ lowThreshold: 1 })
    expect(r.status).toBe(400)
    expect(r.body.error.message).toBe('rubricId is required.')
  })

  it('400 for a blank name', async () => {
    const r = await edit({ rubricId: await seedRubric(), name: '   ' })
    expect(r.status).toBe(400)
    expect(r.body.error.message).toBe('name must not be empty.')
  })

  it('400 for an invalid threshold', async () => {
    const r = await edit({ rubricId: await seedRubric(), lowThreshold: -1 })
    expect(r.status).toBe(400)
    expect(r.body.error.message).toBe(
      'lowThreshold must be a non-negative integer.',
    )
  })

  it('404 for an unknown rubric', async () => {
    const r = await edit({ rubricId: 'rb_doesnotexist', lowThreshold: 1 })
    expect(r.status).toBe(404)
  })

  it('409 RUBRIC_FROZEN for a published rubric', async () => {
    const rubricId = await seedRubric('2026-01-01')
    const r = await edit({ rubricId, lowThreshold: 1 })
    expect(r.status).toBe(409)
    expect(r.body.error).toEqual({
      code: 'RUBRIC_FROZEN',
      message: 'Rubric has been published',
    })
  })

  it('409 LOW_ABOVE_HIGH against the stored threshold', async () => {
    const rubricId = await seedRubric()
    const r = await edit({ rubricId, lowThreshold: 25 })
    expect(r.status).toBe(409)
    expect(r.body.error).toEqual({
      code: 'LOW_ABOVE_HIGH',
      message: 'lowThreshold cannot exceed highThreshold.',
    })
    expect((await loadRubric(rubricId)).low_threshold).toBe(10)
  })

  afterAll(closePool)
})
