import { z } from 'zod'
import { query } from '../../shared/db.ts'
import { conflict, handle, notFound } from '../../shared/http.ts'
import { Credentials, authenticate, markInProgress, parseReviewBody } from './_shared.ts'

const REQUIRED_QUESTION = 'questionId is required.'
const BAD_RATING = 'rating must be an integer from 1 to 5.'
const BAD_TEXT = 'text must be between 1 and 2000 characters.'

const Body = Credentials.extend({
  questionId: z.string({ error: REQUIRED_QUESTION }).min(1, REQUIRED_QUESTION),
  rating: z.number({ error: BAD_RATING }).int(BAD_RATING).min(1, BAD_RATING).max(5, BAD_RATING),
  text: z
    .string({ error: BAD_TEXT })
    .max(2000, BAD_TEXT)
    .refine((t) => t.trim().length > 0, BAD_TEXT),
})

// POST /review/answer  (one answer per call)
export const handler = handle(async (event) => {
  const { reviewToken, pin, questionId, rating, text } = parseReviewBody(event, Body)

  const ctx = await authenticate(reviewToken, pin)
  if (ctx.status === 'Completed') throw conflict('REVIEW_COMPLETED', 'Completed reviews cannot be changed.')

  const { rows: found } = await query(`SELECT 1 FROM question WHERE question_id = $1 AND rubric_id = $2`, [
    questionId,
    ctx.rubricId,
  ])
  if (found.length === 0) throw notFound('Question is not in this rubric.')

  // Upsert guarded on status, so a review completed after the check above still can't be modified.
  const { rows } = await query<{ saved_at: Date }>(
    `INSERT INTO answer (assignment_id, question_id, rating, text, saved_at)
     SELECT a.assignment_id, $2, $3, $4, now()
       FROM assignment a
      WHERE a.assignment_id = $1 AND a.status <> 'Completed'
     ON CONFLICT (assignment_id, question_id)
     DO UPDATE SET rating = EXCLUDED.rating, text = EXCLUDED.text, saved_at = EXCLUDED.saved_at
     RETURNING saved_at`,
    [ctx.assignmentId, questionId, rating, text],
  )
  if (rows.length === 0) throw conflict('REVIEW_COMPLETED', 'Completed reviews cannot be changed.')

  if (ctx.status === 'UrlIssued') await markInProgress(ctx.assignmentId)

  return { savedAt: rows[0].saved_at.toISOString() }
})
