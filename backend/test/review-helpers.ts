import { query } from '../src/shared/db.ts'
import { hashPassword } from '../src/shared/password.ts'

export const REVIEW_PIN = '042817'
export const PAPER_TITLE = 'Sample paper title'
export const PAPER_REFERENCE = 'https://doi.org/10.1000/test'
export const JOURNAL_NAME = 'Sample journal'

const explanations = { 5: 'a', 4: 'b', 3: 'c', 2: 'd', 1: 'e' }

export interface SeedReviewOptions {
  status?: 'UrlIssued' | 'InProgress' | 'Completed'
  questions?: number
  paperWithdrawn?: boolean
  paperClosed?: boolean
  journalWithdrawn?: boolean
}

interface SeededChain {
  accountIds: string[]
  rubricId: string
  journalId: string
  issueId: string
  paperId: string
  assignmentId: string
}
const seeded: SeededChain[] = []

// One full chain per call (designer, editor, published rubric, journal, issue, paper, assignment)
// with random ids/emails/token, so tests never collide with each other or with seed data.
// Call cleanupReviews() in afterAll to delete everything this file created.
export async function seedReview({
  status = 'InProgress',
  questions = 2,
  paperWithdrawn = false,
  paperClosed = false,
  journalWithdrawn = false,
}: SeedReviewOptions = {}) {
  const account = async (role: string) =>
    (
      await query<{ account_id: string }>(
        `INSERT INTO account (email, password_hash, role)
         VALUES ($1, 'x', $2) RETURNING account_id`,
        [`${role}-${crypto.randomUUID()}@test.org`, role],
      )
    ).rows[0].account_id

  const designerId = await account('RubricDesigner')
  const editorId = await account('JournalEditor')

  const { rows: rubrics } = await query<{ rubric_id: string }>(
    `INSERT INTO rubric (designer_id, name, state, publish_date, low_threshold, high_threshold)
     VALUES ($1, 'Sample rubric', 'Published', '2026-01-01', 20, 40) RETURNING rubric_id`,
    [designerId],
  )
  const rubricId = rubrics[0].rubric_id

  const questionIds: string[] = []
  for (let i = 0; i < questions; i++) {
    const { rows } = await query<{ question_id: string }>(
      `INSERT INTO question (rubric_id, section, position, text, explanations)
       VALUES ($1, $2, $3, $4, $5) RETURNING question_id`,
      [rubricId, (i % 5) + 1, Math.floor(i / 5) + 1, `Question ${i + 1}`, JSON.stringify(explanations)],
    )
    questionIds.push(rows[0].question_id)
  }

  const { rows: journals } = await query<{ journal_id: string }>(
    `INSERT INTO journal (editor_id, rubric_id, name, withdrawn_at)
     VALUES ($1, $2, $3, $4) RETURNING journal_id`,
    [editorId, rubricId, JOURNAL_NAME, journalWithdrawn ? new Date() : null],
  )
  const { rows: issues } = await query<{ issue_id: string }>(
    `INSERT INTO issue (journal_id, volume, number) VALUES ($1, 12, 3) RETURNING issue_id`,
    [journals[0].journal_id],
  )
  const { rows: papers } = await query<{ paper_id: string }>(
    `INSERT INTO paper (issue_id, title, reference, withdrawn_at, closed_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING paper_id`,
    [
      issues[0].issue_id,
      PAPER_TITLE,
      PAPER_REFERENCE,
      paperWithdrawn ? new Date() : null,
      paperClosed ? new Date() : null,
    ],
  )

  const reviewToken = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
  const completed = status === 'Completed'
  // Deadline is always two weeks out, so the seed stays valid whatever day the tests run.
  const { rows: assignments } = await query<{ assignment_id: string; deadline: string }>(
    `INSERT INTO assignment
       (paper_id, reviewer_email, deadline, status, review_token, pin_hash, completed_at, total_score, quality)
     VALUES ($1, $2, current_date + 14, $3, $4, $5, $6, $7, $8)
     RETURNING assignment_id, to_char(deadline, 'YYYY-MM-DD') AS deadline`,
    [
      papers[0].paper_id,
      `reviewer-${crypto.randomUUID()}@test.org`,
      status,
      reviewToken,
      await hashPassword(REVIEW_PIN),
      completed ? '2026-10-20T16:02:11Z' : null,
      completed ? 36 : null,
      completed ? 'Moderate' : null,
    ],
  )

  const assignmentId = assignments[0].assignment_id
  seeded.push({
    accountIds: [designerId, editorId],
    rubricId,
    journalId: journals[0].journal_id,
    issueId: issues[0].issue_id,
    paperId: papers[0].paper_id,
    assignmentId,
  })

  return { reviewToken, pin: REVIEW_PIN, assignmentId, rubricId, questionIds, deadline: assignments[0].deadline }
}

/** Deletes every chain seedReview() created, children first (answers and questions cascade). */
export async function cleanupReviews() {
  const chains = seeded.splice(0)
  if (chains.length === 0) return
  const ids = (pick: (c: SeededChain) => string) => chains.map(pick)
  await query(`DELETE FROM assignment WHERE assignment_id = ANY($1)`, [ids((c) => c.assignmentId)])
  await query(`DELETE FROM paper WHERE paper_id = ANY($1)`, [ids((c) => c.paperId)])
  await query(`DELETE FROM issue WHERE issue_id = ANY($1)`, [ids((c) => c.issueId)])
  await query(`DELETE FROM journal WHERE journal_id = ANY($1)`, [ids((c) => c.journalId)])
  await query(`DELETE FROM rubric WHERE rubric_id = ANY($1)`, [ids((c) => c.rubricId)])
  await query(`DELETE FROM account WHERE account_id = ANY($1)`, [chains.flatMap((c) => c.accountIds)])
}

export async function saveAnswerRow(assignmentId: string, questionId: string, rating: number, text: string) {
  await query(`INSERT INTO answer (assignment_id, question_id, rating, text) VALUES ($1, $2, $3, $4)`, [
    assignmentId,
    questionId,
    rating,
    text,
  ])
}

export async function readAnswers(assignmentId: string) {
  const { rows } = await query<{ question_id: string; rating: number; text: string }>(
    `SELECT question_id, rating, text FROM answer WHERE assignment_id = $1 ORDER BY question_id`,
    [assignmentId],
  )
  return rows
}

export async function readStatus(assignmentId: string): Promise<string> {
  const { rows } = await query<{ status: string }>(`SELECT status FROM assignment WHERE assignment_id = $1`, [
    assignmentId,
  ])
  return rows[0].status
}
