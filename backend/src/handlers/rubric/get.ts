import { z } from 'zod'
import { query } from '../../shared/db.ts'
import { handle, notFound, parseQuery } from '../../shared/http.ts'

const Query = z.object({
  rubricId: z.string().startsWith('rb_'),
})

export interface GetRubricResponse {
  rubricId: string
  name: string
  state: string
  publishDate: string | null
  lowThreshold: number | null
  highThreshold: number | null
  replacementRubricId?: string
  questions: {
    questionId: string
    section: number
    text: string
    explanations: Record<string, string>
  }[]
}

export const handler = handle(async (event): Promise<GetRubricResponse> => {
  const { rubricId } = parseQuery(event, Query)

  const { rows } = await query<{
    name: string
    state: string
    publish_date: string | null
    low_threshold: number | null
    high_threshold: number | null
    replacement_rubric_id: string | null
  }>(
    `SELECT name, state, to_char(publish_date, 'YYYY-MM-DD') AS publish_date,
            low_threshold, high_threshold, replacement_rubric_id
     FROM rubric WHERE rubric_id = $1`,
    [rubricId],
  )

  const rubric = rows[0]
  if (!rubric) throw notFound('Rubric not found.')

  const { rows: questions } = await query<{
    question_id: string
    section: number
    text: string
    explanations: Record<string, string>
  }>(
    `SELECT question_id, section, text, explanations
     FROM question WHERE rubric_id = $1
     ORDER BY section, position`,
    [rubricId],
  )

  return {
    rubricId,
    name: rubric.name,
    state: rubric.state,
    publishDate: rubric.publish_date,
    lowThreshold: rubric.low_threshold,
    highThreshold: rubric.high_threshold,
    ...(rubric.replacement_rubric_id && {
      replacementRubricId: rubric.replacement_rubric_id,
    }),
    questions: questions.map((q) => ({
      questionId: q.question_id,
      section: q.section,
      text: q.text,
      explanations: q.explanations,
    })),
  }
})
