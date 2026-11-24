import { z } from 'zod'
import { query } from '../../shared/db.ts'
import { handle, notFound, parseBody } from '../../shared/http.ts'

const Body = z.object({
  issueId: z.string().startsWith('is_'),
})

export interface DeleteIssueResponse {
  issueId: string
}

export const handler = handle(async (event): Promise<DeleteIssueResponse> => {



  const { issueId } = parseBody(event, Body)

  const { rows } = await query<{ issue_id: string }>(
    `DELETE FROM issue
     WHERE issue_id = $1
     RETURNING issue_id`,
    [issueId],
  )
  if (!rows[0]) throw notFound('Issue not found.')

  return { issueId: rows[0].issue_id }
})
