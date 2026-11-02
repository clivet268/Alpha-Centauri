import { z } from 'zod'
import { transaction } from '../../shared/db.ts'
import { conflict, handle, notFound, parseBody } from '../../shared/http.ts'

const Body = z
  .object({
    rubricId: z.string().startsWith('rb_'),
    replacementRubricId: z.string().startsWith('rb_'),
  })

export interface DeprecateRubricResponse {
  rubricId: string
  state: 'Deprecated'
  deprecatedAt: string
  replacementRubricId: string
}

export const handler = handle(
  async (event): Promise<DeprecateRubricResponse> => {
    const { rubricId, replacementRubricId } = parseBody(event, Body)

    return transaction(async (client) => {
      const { rows } = await client.query<{
        rubric_id: string
        state: string
        publish_date: string | null
      }>(
        `SELECT rubric_id, state, to_char(publish_date, 'YYYY-MM-DD') AS publish_date
       FROM rubric WHERE rubric_id = ANY($1)
       ORDER BY rubric_id FOR UPDATE`,
        [[rubricId, replacementRubricId]],
      )

      const rubric = rows.find((r) => r.rubric_id === rubricId)
      if (!rubric) throw notFound('Rubric not found.')

      const replacement = rows.find((r) => r.rubric_id === replacementRubricId)
      if (!replacement) throw notFound('Replacement rubric not found.')

      if (rubric.state !== 'Published') {
        throw conflict(
          'NOT_PUBLISHED',
          'Only published rubrics can be deprecated.',
        )
      }

      if (replacement.state !== 'Published') {
        throw conflict(
          'RUBRIC_NOT_PUBLISHED',
          'Replacement rubric must be published.',
        )
      }

      if (replacement.publish_date! < rubric.publish_date!) {
        throw conflict(
          'REPLACEMENT_NOT_NEWER',
          'Replacement rubric must be published after this rubric.',
        )
      }

      const { rows: deprecated } = await client.query<{
        deprecated_at: string
      }>(
        `UPDATE rubric
       SET state = 'Deprecated', replacement_rubric_id = $2, deprecated_at = now(), updated_at = now()
       WHERE rubric_id = $1
       RETURNING to_char(deprecated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS deprecated_at`,
        [rubricId, replacementRubricId],
      )

      return {
        rubricId,
        state: 'Deprecated',
        deprecatedAt: deprecated[0].deprecated_at,
        replacementRubricId,
      }
    })
  },
)
