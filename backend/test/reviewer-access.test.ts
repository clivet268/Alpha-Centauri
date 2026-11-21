import { afterAll, describe, expect, it } from 'vitest'
import { handler } from '../src/handlers/reviwer/access.ts'
import { closePool } from '../src/shared/db.ts'
import { makeEvent, parse } from './helpers.ts'
import {
  JOURNAL_NAME,
  PAPER_REFERENCE,
  PAPER_TITLE,
  readStatus,
  saveAnswerRow,
  seedReview,
} from './review-helpers.ts'

const access = async (body: unknown) => parse(await handler(makeEvent({ body })))

describe('Access Rubric', () => {
  it('returns the paper, journal, rubric and saved answers of an in-progress review', async () => {
    const { reviewToken, pin, assignmentId, questionIds } = await seedReview({ status: 'InProgress' })
    await saveAnswerRow(assignmentId, questionIds[0], 4, 'Saved comment')

    const r = await access({ reviewToken, pin })

    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({
      status: 'InProgress',
      deadline: '2026-11-01',
      paper: { title: PAPER_TITLE, reference: PAPER_REFERENCE },
      journal: { name: JOURNAL_NAME, volume: 12, number: 3 },
      rubric: { name: 'Sample rubric', lowThreshold: 20, highThreshold: 40 },
      answers: [{ questionId: questionIds[0], rating: 4, text: 'Saved comment' }],
    })
    expect(r.body.rubric.questions).toEqual([
      {
        questionId: questionIds[0],
        section: 1,
        text: 'Question 1',
        explanations: { 5: 'a', 4: 'b', 3: 'c', 2: 'd', 1: 'e' },
      },
      {
        questionId: questionIds[1],
        section: 2,
        text: 'Question 2',
        explanations: { 5: 'a', 4: 'b', 3: 'c', 2: 'd', 1: 'e' },
      },
    ])
    expect(r.body).not.toHaveProperty('report')
    expect(r.body).not.toHaveProperty('totalScore')
  })

  it('moves a UrlIssued review to InProgress on first access', async () => {
    const { reviewToken, pin, assignmentId } = await seedReview({ status: 'UrlIssued' })

    const r = await access({ reviewToken, pin })

    expect(r.status).toBe(200)
    expect(r.body.status).toBe('InProgress')
    expect(await readStatus(assignmentId)).toBe('InProgress')
  })

  it('returns the score, quality and ASCII report of a completed review', async () => {
    const { reviewToken, pin, assignmentId, questionIds } = await seedReview({ status: 'Completed' })
    await saveAnswerRow(assignmentId, questionIds[0], 5, 'Great')

    const r = await access({ reviewToken, pin })

    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({
      status: 'Completed',
      totalScore: 36,
      quality: 'Moderate',
    })
    // Compare the instant, not the text, so it passes with or without milliseconds in the output.
    expect(new Date(r.body.completedAt).getTime()).toBe(Date.parse('2026-10-20T16:02:11Z'))
    expect(r.body.report).toContain(PAPER_TITLE)
    expect(r.body.report).toContain('Great')
    expect(await readStatus(assignmentId)).toBe('Completed')
  })

  it('400 when reviewToken is missing', async () => {
    const r = await access({ pin: '042817' })
    expect(r.status).toBe(400)
    expect(r.body.error).toEqual({ code: 'INVALID_INPUT', message: 'reviewToken is required.' })
  })

  it('400 when the pin is not a 6-digit string', async () => {
    const { reviewToken } = await seedReview()
    for (const pin of ['12345', '1234567', 'abcdef', 42817, null, undefined]) {
      const r = await access({ reviewToken, pin })
      expect(r.status).toBe(400)
      expect(r.body.error).toEqual({ code: 'INVALID_INPUT', message: 'pin must be a 6-digit string.' })
    }
  })

  it('401 INVALID_PIN for a wrong PIN and does not start the review', async () => {
    const { reviewToken, assignmentId } = await seedReview({ status: 'UrlIssued' })

    const r = await access({ reviewToken, pin: '000000' })

    expect(r.status).toBe(401)
    expect(r.body.error).toEqual({ code: 'INVALID_PIN', message: 'The PIN is incorrect.' })
    expect(await readStatus(assignmentId)).toBe('UrlIssued')
  })

  it('404 for an unknown or malformed token, even with a valid-looking PIN', async () => {
    for (const reviewToken of ['nopenopenope', 'short', 'has space!!!']) {
      const r = await access({ reviewToken, pin: '042817' })
      expect(r.status).toBe(404)
      expect(r.body.error).toEqual({ code: 'NOT_FOUND', message: 'Review link is no longer valid.' })
    }
  })

  it('404 when the paper is withdrawn or closed, or the journal is withdrawn', async () => {
    for (const seed of [{ paperWithdrawn: true }, { paperClosed: true }, { journalWithdrawn: true }]) {
      const { reviewToken, pin } = await seedReview(seed)
      const r = await access({ reviewToken, pin })
      expect(r.status).toBe(404)
      expect(r.body.error.code).toBe('NOT_FOUND')
    }
  })

  afterAll(closePool)
})
