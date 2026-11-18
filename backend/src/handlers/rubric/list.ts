import { z } from 'zod'
import { query } from '../../shared/db.ts'
import { handle, parseQuery } from '../../shared/http.ts'

const Query = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  state: z.enum(['Published', 'Unpublished', 'Deprecated', 'All']).default('All'),
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
  const { limit, offset, state } = parseQuery(event, Query)
  // NULL matches every state ('All').
  const stateParam = state === 'All' ? null : state

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
     WHERE $3::text IS NULL OR r.state::text = $3
     GROUP BY r.rubric_id
     ORDER BY r.publish_date DESC NULLS LAST, r.rubric_id
     LIMIT $1 OFFSET $2`,
    [limit, offset, stateParam],
  )

  const { rows: totals } = await query<{ total_count: number }>(
    `SELECT count(*)::int AS total_count FROM rubric WHERE $1::text IS NULL OR state::text = $1`,
    [stateParam],
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
