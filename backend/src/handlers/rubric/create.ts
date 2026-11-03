import { z } from 'zod'
import { transaction } from '../../shared/db.ts'
import { handle, invalidInput, parseBody } from '../../shared/http.ts'

// TODO: no designer login yet, so every rubric goes to this placeholder account.
// Once login exists, remove this and the account INSERT below, and use the logged-in designer's ID.
const PLACEHOLDER_DESIGNER_ID = 'ac_placeholder_designer'

const Body = z.object({
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
    await client.query(
      `INSERT INTO account (account_id, email, password_hash, role)
       VALUES ($1, 'placeholder-designer@raser.local', '!', 'RubricDesigner')
       ON CONFLICT DO NOTHING`,
      [PLACEHOLDER_DESIGNER_ID],
    )

    const { rows } = await client.query<{ rubric_id: string }>(
      `INSERT INTO rubric (designer_id, name)
       VALUES ($1, $2)
       RETURNING rubric_id`,
      [PLACEHOLDER_DESIGNER_ID, name],
    )

    return { rubricId: rows[0].rubric_id }
  })
})
