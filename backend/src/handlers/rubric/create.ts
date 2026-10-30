import { z } from 'zod'
import { query } from '../../shared/db.ts'
import { handle, notFound, parseBody } from '../../shared/http.ts'

const Body = z.object({
  designerId: z.string().startsWith('ac_'),
  name: z.string().trim().min(1).max(200),
})

export interface CreateRubricResponse {
  rubricId: string
}

export const handler = handle(async (event): Promise<CreateRubricResponse> => {
  const { designerId, name } = parseBody(event, Body)

  const { rows } = await query<{ rubric_id: string }>(
    `INSERT INTO rubric (designer_id, name)
     SELECT account_id, $2 FROM account WHERE account_id = $1
     RETURNING rubric_id`,
    [designerId, name],
  )
  if (!rows[0]) throw notFound('Designer not found.')

  return { rubricId: rows[0].rubric_id }
})
