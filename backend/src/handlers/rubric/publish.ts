import { z } from 'zod'
import { transaction } from '../../shared/db.ts'
import { conflict, handle, notFound, parseBody } from '../../shared/http.ts'

const SECTION_COUNT = 5

const Body = z.object({
  rubricId: z.string().startsWith('rb_'),
})

export interface PublishRubricResponse {
  publishDate: string
}

export const handler = handle(async (event): Promise<PublishRubricResponse> => {
  const { rubricId } = parseBody(event, Body)

  return transaction(async (client) => {
    const { rows } = await client.query<{
      state: string
      low_threshold: number | null
      high_threshold: number | null
      sections: number
    }>(
      `SELECT state, low_threshold, high_threshold,
              (SELECT count(DISTINCT section)::int FROM question q
               WHERE q.rubric_id = r.rubric_id) AS sections
       FROM rubric r WHERE rubric_id = $1 FOR UPDATE`,
      [rubricId],
    )

    const rubric = rows[0]
    if (!rubric) throw notFound('Rubric not found.')

    if (rubric.state !== 'Unpublished') {
      throw conflict('RUBRIC_FROZEN', 'Rubric is already published.')
    }

    if (
      rubric.low_threshold === null ||
      rubric.high_threshold === null ||
      rubric.sections < SECTION_COUNT
    ) {
      throw conflict('RUBRIC_INCOMPLETE', 'Rubric is not ready to publish.')
    }

    const { rows: published } = await client.query<{ publish_date: string }>(
      `UPDATE rubric
       SET state = 'Published', publish_date = (now() AT TIME ZONE 'UTC')::date, updated_at = now()
       WHERE rubric_id = $1
       RETURNING to_char(publish_date, 'YYYY-MM-DD') AS publish_date`,
      [rubricId],
    )
    return { publishDate: published[0].publish_date }
  })
})
