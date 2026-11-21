import { query } from '../../shared/db.ts'
import { handle, parseBody } from '../../shared/http.ts'
import { LooseBody, authenticate, markInProgress, reviewCredentials, type ReviewContext } from './_shared.ts'

interface Rubric {
  name: string
  low_threshold: number | null
  high_threshold: number | null
}
interface Q {
  question_id: string
  section: number
  text: string
  explanations: Record<string, string>
}
interface A {
  question_id: string
  rating: number
  text: string
}

// POST /review/access
export const handler = handle(async (event) => {
  const { reviewToken, pin } = reviewCredentials(parseBody(event, LooseBody))

  const ctx = await authenticate(reviewToken, pin)
  if (ctx.status === 'UrlIssued') {
    await markInProgress(ctx.assignmentId)
    ctx.status = 'InProgress'
  }

  const [rubricRes, questionRes, answerRes] = await Promise.all([
    query<Rubric>(`SELECT name, low_threshold, high_threshold FROM rubric WHERE rubric_id = $1`, [ctx.rubricId]),
    query<Q>(
      `SELECT question_id, section, text, explanations
         FROM question WHERE rubric_id = $1
        ORDER BY section, position`,
      [ctx.rubricId],
    ),
    query<A>(
      `SELECT a.question_id, a.rating, a.text
         FROM answer a JOIN question q ON q.question_id = a.question_id
        WHERE a.assignment_id = $1
        ORDER BY q.section, q.position`,
      [ctx.assignmentId],
    ),
  ])
  const rubric = rubricRes.rows[0]
  const questions = questionRes.rows
  const answers = answerRes.rows

  const payload: Record<string, unknown> = {
    status: ctx.status,
    deadline: ctx.deadline,
    paper: { title: ctx.paperTitle, reference: ctx.paperReference },
    journal: { name: ctx.journalName, volume: ctx.volume, number: ctx.number },
    rubric: {
      name: rubric.name,
      lowThreshold: rubric.low_threshold,
      highThreshold: rubric.high_threshold,
      questions: questions.map((q) => ({
        questionId: q.question_id,
        section: q.section,
        text: q.text,
        explanations: orderExplanations(q.explanations),
      })),
    },
    answers: answers.map((a) => ({ questionId: a.question_id, rating: a.rating, text: a.text })),
  }

  if (ctx.status === 'Completed') {
    payload.completedAt = ctx.completedAt!.toISOString()
    payload.totalScore = ctx.totalScore
    payload.quality = ctx.quality
    payload.report = buildReport(ctx, rubric, questions, answers)
  }
  return payload
})

// jsonb doesn't preserve key order; emit 5..1 like the contract.
function orderExplanations(ex: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const k of ['5', '4', '3', '2', '1']) if (k in ex) out[k] = ex[k]
  return out
}

// TODO(complete-review): move to shared/ and reuse from /review/complete, which must persist/return the same text.
// The schema has no report column, so for now it is generated from the data on read.
function buildReport(ctx: ReviewContext, rubric: Rubric, questions: Q[], answers: A[]): string {
  const byQ = new Map(answers.map((a) => [a.question_id, a]))
  const rule = '='.repeat(72)
  const lines = [
    rule,
    'PEER REVIEW REPORT',
    rule,
    `Paper:      ${ctx.paperTitle}`,
    `Reference:  ${ctx.paperReference}`,
    `Journal:    ${ctx.journalName}, Vol. ${ctx.volume}, No. ${ctx.number}`,
    `Rubric:     ${rubric.name} (low < ${rubric.low_threshold}, high > ${rubric.high_threshold})`,
    `Completed:  ${ctx.completedAt!.toISOString()}`,
    `Score:      ${ctx.totalScore}`,
    `Quality:    ${ctx.quality}`,
    rule,
  ]
  questions.forEach((q, i) => {
    const a = byQ.get(q.question_id)
    lines.push(
      `Q${i + 1} [Section ${q.section}] ${q.text}`,
      `    Rating: ${a ? `${a.rating}/5` : 'n/a'}`,
      `    Comment: ${a ? a.text : ''}`,
      '',
    )
  })
  return lines.join('\n')
}
