import { z } from 'zod'
import { query } from '../../shared/db.ts'
import { HttpError, invalidInput, notFound, parseBody, type Event } from '../../shared/http.ts'
import { verifyPassword } from '../../shared/password.ts'
import type { Quality } from '../../shared/report.ts'

const REQUIRED_TOKEN = 'reviewToken is required.'
const BAD_PIN = 'pin must be a 6-digit string.'

export const Credentials = z.object({
  reviewToken: z.string({ error: REQUIRED_TOKEN }).min(1, REQUIRED_TOKEN),
  pin: z.string({ error: BAD_PIN }).regex(/^\d{6}$/, BAD_PIN),
})

const AnyBody = z.record(z.string(), z.unknown())

/**
 * Like parseBody, but a validation failure reports only the first issue's message, with no
 * field-path prefix, so the error text matches the JSON payload contract exactly.
 */
export function parseReviewBody<T>(event: Event, schema: z.ZodType<T>): T {
  const result = schema.safeParse(parseBody(event, AnyBody))
  if (!result.success) throw invalidInput(result.error.issues[0].message)
  return result.data
}

export interface ReviewContext {
  assignmentId: string
  status: 'UrlIssued' | 'InProgress' | 'Completed'
  deadline: string
  completedAt: Date | null
  totalScore: number | null
  quality: Quality | null
  paperTitle: string
  paperReference: string
  journalName: string
  volume: number
  number: number
  rubricId: string
}

// review_token is char(12); reject anything else up front so char() padding can never produce a match.
const TOKEN_RE = /^[A-Za-z0-9]{12}$/
const LINK_INVALID = 'Review link is no longer valid.'

/** Token + PIN -> assignment. Throws 404 NOT_FOUND (bad/withdrawn link) or 401 INVALID_PIN. */
export async function authenticate(token: string, pin: string): Promise<ReviewContext> {
  if (!TOKEN_RE.test(token)) throw notFound(LINK_INVALID)

  const { rows } = await query<{
    assignment_id: string
    status: ReviewContext['status']
    deadline: string
    pin_hash: string
    completed_at: Date | null
    total_score: number | null
    quality: ReviewContext['quality']
    title: string
    reference: string
    journal_name: string
    volume: number
    number: number
    rubric_id: string
  }>(
    `SELECT a.assignment_id, a.status, to_char(a.deadline, 'YYYY-MM-DD') AS deadline, a.pin_hash,
            a.completed_at, a.total_score, a.quality,
            p.title, p.reference,
            j.name AS journal_name, j.rubric_id,
            i.volume, i.number
       FROM assignment a
       JOIN paper   p ON p.paper_id   = a.paper_id
       JOIN issue   i ON i.issue_id   = p.issue_id
       JOIN journal j ON j.journal_id = i.journal_id
      WHERE a.review_token = $1
        AND p.withdrawn_at IS NULL
        AND p.closed_at    IS NULL
        AND j.withdrawn_at IS NULL`,
    [token],
  )
  const r = rows[0]
  if (!r) throw notFound(LINK_INVALID)

  // ASSUMPTION: the "issue RubricURL" use case stores pin_hash with hashPassword() (scrypt$...).
  if (!(await verifyPassword(pin, r.pin_hash))) {
    throw new HttpError(401, 'INVALID_PIN', 'The PIN is incorrect.')
  }

  return {
    assignmentId: r.assignment_id,
    status: r.status,
    deadline: r.deadline,
    completedAt: r.completed_at,
    totalScore: r.total_score,
    quality: r.quality,
    paperTitle: r.title,
    paperReference: r.reference,
    journalName: r.journal_name,
    volume: r.volume,
    number: r.number,
    rubricId: r.rubric_id,
  }
}

/** First touch of a UrlIssued review moves it to InProgress. Guarded, so it is idempotent and never touches Completed. */
export async function markInProgress(assignmentId: string): Promise<void> {
  await query(
    `UPDATE assignment SET status = 'InProgress'
      WHERE assignment_id = $1 AND status = 'UrlIssued'`,
    [assignmentId],
  )
}
