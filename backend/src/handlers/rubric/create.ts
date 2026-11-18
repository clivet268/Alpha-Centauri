import { z } from 'zod'
import { transaction } from '../../shared/db.ts'
import { requireDesigner } from '../../shared/designer.ts'
import { handle, invalidInput, parseBody } from '../../shared/http.ts'

const Body = z.object({
  designerId: z.string().optional(),
  name: z.string().optional(),
})

export interface CreateRubricResponse {
  rubricId: string
}

export const handler = handle(async (event): Promise<CreateRubricResponse> => {
  const body = parseBody(event, Body)

  const name = (body.name ?? '').trim()
  if (!name) throw invalidInput('name must not be empty.')
  if (name.length > 200)
    throw invalidInput('name must be at most 200 characters.')

  return transaction(async (client) => {
    const designerId = await requireDesigner(client, body.designerId)

    const { rows } = await client.query<{ rubric_id: string }>(
      `INSERT INTO rubric (designer_id, name)
       VALUES ($1, $2)
       RETURNING rubric_id`,
      [designerId, name],
    )

    return { rubricId: rows[0].rubric_id }
  })
})
