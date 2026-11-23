import { query } from '../../shared/db.ts'
import { handle } from '../../shared/http.ts'
import { buildReport } from '../../shared/report.ts'
import { Credentials, authenticate, markInProgress, parseReviewBody } from './_shared.ts'

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
  const { reviewToken, pin } = parseReviewBody(event, Credentials)

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
  const questions = questionRes.rows.map((q) => ({
    questionId: q.question_id,
    section: q.section,
    text: q.text,
    explanations: orderExplanations(q.explanations),
  }))
  const answers = answerRes.rows.map((a) => ({ questionId: a.question_id, rating: a.rating, text: a.text }))

  const payload: Record<string, unknown> = {
    status: ctx.status,
    deadline: ctx.deadline,
    paper: { title: ctx.paperTitle, reference: ctx.paperReference },
    journal: { name: ctx.journalName, volume: ctx.volume, number: ctx.number },
    rubric: {
      name: rubric.name,
      lowThreshold: rubric.low_threshold,
      highThreshold: rubric.high_threshold,
      questions,
    },
    answers,
  }

  if (ctx.status === 'Completed') {
    // The CHECK constraints on assignment guarantee these are set once Completed.
    const completedAt = ctx.completedAt!
    payload.completedAt = completedAt.toISOString()
    payload.totalScore = ctx.totalScore
    payload.quality = ctx.quality
    payload.report = buildReport({
      paperTitle: ctx.paperTitle,
      paperReference: ctx.paperReference,
      journalName: ctx.journalName,
      volume: ctx.volume,
      number: ctx.number,
      rubricName: rubric.name,
      lowThreshold: rubric.low_threshold,
      highThreshold: rubric.high_threshold,
      completedAt,
      totalScore: ctx.totalScore!,
      quality: ctx.quality!,
      questions,
      answers,
    })
  }
  return payload
})

// jsonb doesn't preserve key order; emit 5..1 like the contract.
function orderExplanations(ex: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const k of ['5', '4', '3', '2', '1']) if (k in ex) out[k] = ex[k]
  return out
}
