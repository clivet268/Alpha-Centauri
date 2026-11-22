import { z } from 'zod'
import { query } from '../../shared/db.ts'
import { conflict, handle, notFound, parseBody } from '../../shared/http.ts'

const Body = z.object({
  journalId: z.string().startsWith('jr_'),
  volume: z.number().int().min(1),
  number: z.number().int().min(1).max(12),
})

export interface CreateIssueResponse {
  issueId: string
}

export const handler = handle(async (event): Promise<CreateIssueResponse> => {
  const { journalId, volume, number } = parseBody(event, Body)

  const { rows } = await query<{ issue_id: string }>(
    `INSERT INTO issue (journal_id, volume, number)
     SELECT journal_id, $2, $3 FROM journal WHERE journal_id = $1
     ON CONFLICT (journal_id, volume, number) DO NOTHING
     RETURNING issue_id`,
    [journalId, volume, number],
  )
  if (rows[0]) return { issueId: rows[0].issue_id }

  // No row inserted: either the journal doesn't exist or the issue already does.
  const journal = await query('SELECT 1 FROM journal WHERE journal_id = $1', [journalId])
  if (!journal.rows[0]) throw notFound('Journal not found.')
  throw conflict('ISSUE_EXISTS', `Volume ${volume}, number ${number} already exists.`)
})
