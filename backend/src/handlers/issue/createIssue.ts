import { z } from 'zod'
import { query } from '../../shared/db.ts'
import { handle, notFound, parseBody } from '../../shared/http.ts'

const Body = z.object({
  journalId: z.string().startsWith('jr_'),
  volume: z.number().positive(),
  number: z.number().positive(),
})

export interface CreateIssueResponse {
  issueId: string
}


export const handler = handle(async ( event) : Promise<CreateIssueResponse> => {
  const { journalId, volume, number } = parseBody(event, Body)

  const { rows } = await query<{ issue_id: string }>(
    `INSERT INTO issue (journalId, volume, number)
      SELECT account_id, $2 FROM account WHERE account_id = $2
    RETURNING issue_id`,
    [journalId, volume, number]
  )
  if (!rows[0]) throw notFound("Designer not found")

  return { issueId: rows[0].issue_id }
})