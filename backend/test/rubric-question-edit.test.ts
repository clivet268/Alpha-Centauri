import { afterAll, describe, expect, it } from 'vitest'
import { handler } from '../src/handlers/rubric/question/edit.ts'
import { closePool, query } from '../src/shared/db.ts'
import { makeEvent, parse, testDesignerId } from './helpers.ts'

const explanations = {
  '5': 'Text 5',
  '4': 'Text 4',
  '3': 'Text 3',
  '2': 'Text 2',
  '1': 'Text 1',
}

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
     VALUES ($1, 3, 1, 'Sample text', $2) RETURNING question_id`,
    [rubricId, JSON.stringify(explanations)],
  )
  return { rubricId, questionId: questions[0].question_id }
}

async function loadQuestion(questionId: string) {
  const { rows } = await query<{
    text: string
    explanations: Record<string, string>
  }>(`SELECT text, explanations FROM question WHERE question_id = $1`, [
    questionId,
  ])
  return rows[0]
}

const edit = async (body: object) =>
  parse(
    await handler(
      makeEvent({ body: { designerId: await testDesignerId(), ...body } }),
    ),
  )

describe('Edit Question', () => {
  it('updates one explanation and keeps the rest', async () => {
    const { rubricId, questionId } = await seedQuestion()
    const r = await edit({
      rubricId,
      questionId,
      explanations: { '3': 'New 3' },
    })
    expect(r.status).toBe(200)
    expect(r.body.questionId).toBe(questionId)
    expect(r.body.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
    expect(await loadQuestion(questionId)).toEqual({
      text: 'Sample text',
      explanations: { ...explanations, '3': 'New 3' },
    })
  })

  it('updates the text', async () => {
    const { rubricId, questionId } = await seedQuestion()
    const r = await edit({ rubricId, questionId, text: '  New text  ' })
    expect(r.status).toBe(200)
    expect(await loadQuestion(questionId)).toEqual({
      text: 'New text',
      explanations,
    })
  })

  it('400 for an invalid questionId', async () => {
    const { rubricId } = await seedQuestion()
    const r = await edit({ rubricId, questionId: 'bad', text: 'New' })
    expect(r.status).toBe(400)
    expect(r.body.error.message).toBe('questionId is not a valid question ID.')
  })

  it('400 for blank text', async () => {
    const { rubricId, questionId } = await seedQuestion()
    const r = await edit({ rubricId, questionId, text: '   ' })
    expect(r.status).toBe(400)
    expect(r.body.error.message).toBe('text must not be empty.')
  })

  it('400 for an invalid explanation key', async () => {
    const { rubricId, questionId } = await seedQuestion()
    const r = await edit({
      rubricId,
      questionId,
      explanations: { '6': 'Text 6' },
    })
    expect(r.status).toBe(400)
    expect(r.body.error).toEqual({
      code: 'INVALID_INPUT',
      message: 'explanations only accepts keys 5 to 1.',
    })
  })

  it('400 when nothing is sent to change', async () => {
    const { rubricId, questionId } = await seedQuestion()
    const r = await edit({ rubricId, questionId })
    expect(r.status).toBe(400)
    expect(r.body.error.message).toBe('text or explanations is required.')
  })

  it('404 for a question in another rubric', async () => {
    const { rubricId } = await seedQuestion()
    const other = await seedQuestion()
    const r = await edit({
      rubricId,
      questionId: other.questionId,
      text: 'New',
    })
    expect(r.status).toBe(404)
    expect((await loadQuestion(other.questionId)).text).toBe('Sample text')
  })

  it('409 RUBRIC_FROZEN for a published rubric', async () => {
    const { rubricId, questionId } = await seedQuestion('2026-01-01')
    const r = await edit({ rubricId, questionId, text: 'New' })
    expect(r.status).toBe(409)
    expect(r.body.error).toEqual({
      code: 'RUBRIC_FROZEN',
      message: 'Published rubrics cannot be edited.',
    })
    expect((await loadQuestion(questionId)).text).toBe('Sample text')
  })

  afterAll(closePool)
})
