import { afterAll, describe, expect, it } from 'vitest'
import { handler } from '../src/handlers/reviewer/answer.ts'
import { closePool } from '../src/shared/db.ts'
import { makeEvent, parse } from './helpers.ts'
import { cleanupReviews, readAnswers, readStatus, saveAnswerRow, seedReview } from './review-helpers.ts'

const answer = async (body: object) => parse(await handler(makeEvent({ body })))

describe('Update Answer', () => {
  it('saves an answer and returns when it was saved', async () => {
    const { reviewToken, pin, assignmentId, questionIds } = await seedReview()

    const r = await answer({ reviewToken, pin, questionId: questionIds[0], rating: 3, text: 'Sample text' })

    expect(r.status).toBe(200)
    expect(r.body.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/)
    expect(await readAnswers(assignmentId)).toEqual([
      { question_id: questionIds[0], rating: 3, text: 'Sample text' },
    ])
  })

  it('overwrites an existing answer instead of adding a second one', async () => {
    const { reviewToken, pin, assignmentId, questionIds } = await seedReview()
    await saveAnswerRow(assignmentId, questionIds[0], 1, 'Old comment')

    const r = await answer({ reviewToken, pin, questionId: questionIds[0], rating: 5, text: 'New comment' })

    expect(r.status).toBe(200)
    expect(await readAnswers(assignmentId)).toEqual([
      { question_id: questionIds[0], rating: 5, text: 'New comment' },
    ])
  })

  it('only changes the question that was sent', async () => {
    const { reviewToken, pin, assignmentId, questionIds } = await seedReview()
    await saveAnswerRow(assignmentId, questionIds[1], 2, 'Untouched')

    await answer({ reviewToken, pin, questionId: questionIds[0], rating: 4, text: 'Changed' })

    const rows = await readAnswers(assignmentId)
    expect(rows).toHaveLength(2)
    expect(rows.find((a) => a.question_id === questionIds[1])).toEqual({
      question_id: questionIds[1],
      rating: 2,
      text: 'Untouched',
    })
  })

  it('moves a UrlIssued review to InProgress', async () => {
    const { reviewToken, pin, assignmentId, questionIds } = await seedReview({ status: 'UrlIssued' })

    const r = await answer({ reviewToken, pin, questionId: questionIds[0], rating: 3, text: 'x' })

    expect(r.status).toBe(200)
    expect(await readStatus(assignmentId)).toBe('InProgress')
  })

  it('400 when rating is not an integer from 1 to 5, and saves nothing', async () => {
    const { reviewToken, pin, assignmentId, questionIds } = await seedReview()
    for (const rating of [0, 6, 3.5, '3', null, undefined]) {
      const r = await answer({ reviewToken, pin, questionId: questionIds[0], rating, text: 'x' })
      expect(r.status).toBe(400)
      expect(r.body.error).toEqual({
        code: 'INVALID_INPUT',
        message: 'rating must be an integer from 1 to 5.',
      })
    }
    expect(await readAnswers(assignmentId)).toHaveLength(0)
  })

  it('400 for a blank comment, a missing questionId or a bad PIN format', async () => {
    const { reviewToken, pin, questionIds } = await seedReview()
    const base = { reviewToken, pin, questionId: questionIds[0], rating: 3, text: 'x' }

    expect((await answer({ ...base, text: '   ' })).status).toBe(400)
    expect((await answer({ ...base, text: 'x'.repeat(2001) })).status).toBe(400)

    const noQuestion = await answer({ ...base, questionId: undefined })
    expect(noQuestion.status).toBe(400)
    expect(noQuestion.body.error.message).toBe('questionId is required.')

    const badPin = await answer({ ...base, pin: '12' })
    expect(badPin.status).toBe(400)
    expect(badPin.body.error.message).toBe('pin must be a 6-digit string.')
  })

  it('401 INVALID_PIN for a wrong PIN and saves nothing', async () => {
    const { reviewToken, assignmentId, questionIds } = await seedReview()

    const r = await answer({ reviewToken, pin: '000000', questionId: questionIds[0], rating: 3, text: 'x' })

    expect(r.status).toBe(401)
    expect(r.body.error.code).toBe('INVALID_PIN')
    expect(await readAnswers(assignmentId)).toHaveLength(0)
  })

  it('404 for an unknown token', async () => {
    const r = await answer({ reviewToken: 'nopenopenope', pin: '042817', questionId: 'q_x', rating: 3, text: 'x' })
    expect(r.status).toBe(404)
    expect(r.body.error.message).toBe('Review link is no longer valid.')
  })

  it('404 when the question is unknown or belongs to a different rubric', async () => {
    const { reviewToken, pin, assignmentId } = await seedReview()
    const other = await seedReview()

    for (const questionId of ['q_doesnotexist', other.questionIds[0]]) {
      const r = await answer({ reviewToken, pin, questionId, rating: 3, text: 'x' })
      expect(r.status).toBe(404)
      expect(r.body.error).toEqual({ code: 'NOT_FOUND', message: 'Question is not in this rubric.' })
    }
    expect(await readAnswers(assignmentId)).toHaveLength(0)
  })

  it('409 REVIEW_COMPLETED and keeps the original answer for a completed review', async () => {
    const { reviewToken, pin, assignmentId, questionIds } = await seedReview({ status: 'Completed' })
    await saveAnswerRow(assignmentId, questionIds[0], 5, 'Final')

    const r = await answer({ reviewToken, pin, questionId: questionIds[0], rating: 1, text: 'Sneaky edit' })

    expect(r.status).toBe(409)
    expect(r.body.error).toEqual({
      code: 'REVIEW_COMPLETED',
      message: 'Completed reviews cannot be changed.',
    })
    expect(await readAnswers(assignmentId)).toEqual([
      { question_id: questionIds[0], rating: 5, text: 'Final' },
    ])
  })

  afterAll(async () => {
    await cleanupReviews()
    await closePool()
  })
})
