import { z } from 'zod'
import { query } from '../../shared/db.ts'
import { handle, parseQuery } from '../../shared/http.ts'

const Query = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export interface ListRubricsResponse {
  rubrics: {
    rubricId: string
    name: string
    state: string
    publishDate: string | null
    questionCount: number
  }[]
  page: {
    limit: number
    offset: number
    totalCount: number
  }
}

export const handler = handle(async (event): Promise<ListRubricsResponse> => {
  const { limit, offset } = parseQuery(event, Query)

  // Lists every state for now; RD-10 (BR-06) limits this to published rubrics.
  const { rows } = await query<{
    rubric_id: string
    name: string
    state: string
    publish_date: string | null
    question_count: number
  }>(
    `SELECT r.rubric_id, r.name, r.state, to_char(r.publish_date, 'YYYY-MM-DD') AS publish_date,
            count(q.question_id)::int AS question_count
     FROM rubric r
     LEFT JOIN question q ON q.rubric_id = r.rubric_id
     GROUP BY r.rubric_id
     ORDER BY r.publish_date DESC NULLS LAST, r.rubric_id
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  )

  const { rows: totals } = await query<{ total_count: number }>(
    `SELECT count(*)::int AS total_count FROM rubric`,
  )

  return {
    rubrics: rows.map((r) => ({
      rubricId: r.rubric_id,
      name: r.name,
      state: r.state,
      publishDate: r.publish_date,
      questionCount: r.question_count,
    })),
    page: { limit, offset, totalCount: totals[0].total_count },
  }
})
