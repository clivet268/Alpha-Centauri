import { z } from 'zod'
import { transaction } from '../../shared/db.ts'
import {
  conflict,
  handle,
  invalidInput,
  notFound,
  parseBody,
} from '../../shared/http.ts'

const Body = z.object({
  rubricId: z.string().optional(),
})

export interface DeleteRubricResponse {
  rubricId: string
  deletedAt: string
}

export const handler = handle(async (event): Promise<DeleteRubricResponse> => {
  const body = parseBody(event, Body)

  const rubricId = (body.rubricId ?? '').trim()
  if (!rubricId) throw invalidInput('rubricId is required.')

  return transaction(async (client) => {
    const { rows } = await client.query<{ state: string }>(
      `SELECT state FROM rubric WHERE rubric_id = $1 FOR UPDATE`,
      [rubricId],
    )

    const rubric = rows[0]
    if (!rubric) throw notFound('Rubric not found.')

    if (rubric.state !== 'Unpublished') {
      throw conflict('RUBRIC_PUBLISHED', 'Published rubrics cannot be deleted.')
    }

    const { rows: deleted } = await client.query<{ deleted_at: string }>(
      `DELETE FROM rubric WHERE rubric_id = $1
       RETURNING to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS deleted_at`,
      [rubricId],
    )

    return { rubricId, deletedAt: deleted[0].deleted_at }
  })
})
