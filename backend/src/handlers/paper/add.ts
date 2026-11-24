import { z } from 'zod'
import { query } from '../../shared/db.ts'
import { conflict, handle, notFound, parseBody } from '../../shared/http.ts'

const Body = z.object({
  issueId: z.string().startsWith('is_'),
  title: z.string().trim().min(1),
  doi: z.url("Invalid URL format")
})

export interface AddPaperResponse {
  paperId: string
}

export const handler = handle(async (event): Promise<AddPaperResponse> => {
  console.log('Received event: ', event)

  const { issueId, title, doi } = parseBody(event, Body)


  const { rows } = await query<{ paper_id: string }>(
    `INSERT INTO paper (issue_id, title, reference)
     SELECT issue_id, $2, $3 FROM issue WHERE issue_id = $1
     RETURNING paper_id`,
    [issueId, title, doi],
  )
  if (rows[0]) return { paperId: rows[0].paper_id }

  // No row inserted: either the issue doesn't exist or the paper already does.
  const issue = await query('SELECT 1 FROM issue WHERE issue_id = $1', [issueId])
  if (!issue.rows[0]) throw notFound('Issue not found.')
  throw conflict('PAPER_EXISTS', `Paper with DOI ${doi} already exists.`)
})