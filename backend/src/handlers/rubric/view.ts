import { z } from 'zod'
import { handle, notFound, parseQuery } from '../../shared/http.ts'
import { loadRubric, type GetRubricResponse } from './get.ts'

const Query = z.object({
  rubricId: z.string().startsWith('rb_'),
})

export const handler = handle(async (event): Promise<GetRubricResponse> => {
  const { rubricId } = parseQuery(event, Query)
  const rubric = await loadRubric(rubricId)
  if (rubric?.state !== 'Published') throw notFound('Rubric not found.')
  return rubric
})
