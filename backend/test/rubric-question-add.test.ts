import { afterAll, describe, expect, it } from 'vitest'
import { handler } from '../src/handlers/rubric/question/add.ts'
import { closePool, query } from '../src/shared/db.ts'
import { makeEvent, parse, testDesignerId } from './helpers.ts'

const explanations = {
  '5': 'Text 5',
  '4': 'Text 4',
  '3': 'Text 3',
  '2': 'Text 2',
  '1': 'Text 1',
}

async function seedRubric(publishDate: string | null = null): Promise<string> {
  const { rows } = await query<{ rubric_id: string }>(
    `INSERT INTO rubric (designer_id, name, state, publish_date)
     VALUES ($1, 'Sample', $2, $3) RETURNING rubric_id`,
    [
      await testDesignerId(),
      publishDate ? 'Published' : 'Unpublished',
      publishDate,
    ],
  )
  return rows[0].rubric_id
}

const add = async (body: object) =>
  parse(
    await handler(
      makeEvent({
        body: {
          designerId: await testDesignerId(),
          section: 3,
          text: 'Sample text',
          explanations,
          ...body,
        },
      }),
    ),
  )

describe('Add Question', () => {
  it('adds questions in order within a section', async () => {
    const rubricId = await seedRubric()
    const first = await add({ rubricId })
    const second = await add({ rubricId, text: 'Second' })
    expect(first.status).toBe(200)
    expect(first.body.questionId).toMatch(/^q_/)
    expect(second.status).toBe(200)

    const { rows } = await query<{
      question_id: string
      section: number
      position: number
      explanations: unknown
    }>(
      `SELECT question_id, section, position, explanations
       FROM question WHERE rubric_id = $1 ORDER BY position`,
      [rubricId],
    )
    expect(rows.map((q) => q.question_id)).toEqual([
      first.body.questionId,
      second.body.questionId,
    ])
    expect(rows.map((q) => q.position)).toEqual([1, 2])
    expect(rows[0].section).toBe(3)
    expect(rows[0].explanations).toEqual(explanations)
  })

  it('400 when rubricId is missing', async () => {
    const r = await add({})
    expect(r.status).toBe(400)
    expect(r.body.error.message).toBe('rubricId is required.')
  })

  it('400 for an invalid section', async () => {
    const r = await add({ rubricId: await seedRubric(), section: 6 })
    expect(r.status).toBe(400)
    expect(r.body.error).toEqual({
      code: 'INVALID_INPUT',
      message: 'section must be an integer from 1 to 5.',
    })
  })

  it('400 for blank text', async () => {
    const r = await add({ rubricId: await seedRubric(), text: '   ' })
    expect(r.status).toBe(400)
    expect(r.body.error.message).toBe('text must not be empty.')
  })

  it('400 for extra explanation keys', async () => {
    const r = await add({
      rubricId: await seedRubric(),
      explanations: { ...explanations, '6': 'Text 6' },
    })
    expect(r.status).toBe(400)
    expect(r.body.error.message).toBe('explanations only accepts keys 5 to 1.')
  })

  it('400 for a missing explanation', async () => {
    const r = await add({
      rubricId: await seedRubric(),
      explanations: { '5': 'Text 5' },
    })
    expect(r.status).toBe(400)
    expect(r.body.error.message).toBe(
      'explanations must include text for keys 5 to 1.',
    )
  })

  it('404 for an unknown rubric', async () => {
    const r = await add({ rubricId: 'rb_doesnotexist' })
    expect(r.status).toBe(404)
  })

  it('409 RUBRIC_FROZEN for a published rubric', async () => {
    const r = await add({ rubricId: await seedRubric('2026-01-01') })
    expect(r.status).toBe(409)
    expect(r.body.error).toEqual({
      code: 'RUBRIC_FROZEN',
      message: 'Published rubrics cannot be edited.',
    })
  })

  afterAll(closePool)
})
