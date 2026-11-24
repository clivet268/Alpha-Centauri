import { afterAll, describe, expect, it } from 'vitest'
import { handler } from '../src/handlers/rubric/question/delete.ts'
import { closePool, query } from '../src/shared/db.ts'
import { makeEvent, parse, testDesignerId } from './helpers.ts'

async function seedQuestion(publishDate: string | null = null) {
  const { rows } = await query<{ rubric_id: string }>(
    `INSERT INTO rubric (designer_id, name, state, publish_date)
     VALUES ($1, 'Sample', $2, $3) RETURNING rubric_id`,
    [
      await testDesignerId(),
      publishDate ? 'Published' : 'Unpublished',
      publishDate,
    ],
  )
  const rubricId = rows[0].rubric_id
  const { rows: questions } = await query<{ question_id: string }>(
    `INSERT INTO question (rubric_id, section, position, text, explanations)
     VALUES ($1, 3, 1, 'Sample text', '{}') RETURNING question_id`,
    [rubricId],
  )
  return { rubricId, questionId: questions[0].question_id }
}

async function questionExists(questionId: string): Promise<boolean> {
  const { rows } = await query(
    `SELECT 1 FROM question WHERE question_id = $1`,
    [questionId],
  )
  return rows.length === 1
}

const remove = async (body: object) =>
  parse(
    await handler(
      makeEvent({ body: { designerId: await testDesignerId(), ...body } }),
    ),
  )

describe('Delete Question', () => {
  it('deletes a question', async () => {
    const { rubricId, questionId } = await seedQuestion()
    const r = await remove({ rubricId, questionId })
    expect(r.status).toBe(200)
    expect(r.body.questionId).toBe(questionId)
    expect(r.body.deletedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
    expect(await questionExists(questionId)).toBe(false)
  })

  it('400 when rubricId is missing', async () => {
    const r = await remove({ questionId: 'q_1' })
    expect(r.status).toBe(400)
    expect(r.body.error.message).toBe('rubricId is required.')
  })

  it('400 for an invalid questionId', async () => {
    const { rubricId } = await seedQuestion()
    const r = await remove({ rubricId, questionId: 'bad' })
    expect(r.status).toBe(400)
    expect(r.body.error).toEqual({
      code: 'INVALID_INPUT',
      message: 'questionId is not a valid question ID.',
    })
  })

  it('404 for an unknown rubric', async () => {
    const r = await remove({ rubricId: 'rb_doesnotexist', questionId: 'q_1' })
    expect(r.status).toBe(404)
  })

  it('404 for a question in another rubric', async () => {
    const { rubricId } = await seedQuestion()
    const other = await seedQuestion()
    const r = await remove({ rubricId, questionId: other.questionId })
    expect(r.status).toBe(404)
    expect(await questionExists(other.questionId)).toBe(true)
  })

  it('409 RUBRIC_FROZEN for a published rubric', async () => {
    const { rubricId, questionId } = await seedQuestion('2026-01-01')
    const r = await remove({ rubricId, questionId })
    expect(r.status).toBe(409)
    expect(r.body.error).toEqual({
      code: 'RUBRIC_FROZEN',
      message: 'Published rubrics cannot be edited.',
    })
    expect(await questionExists(questionId)).toBe(true)
  })

  afterAll(closePool)
})
