import { z } from 'zod'
import { transaction } from '../../../shared/db.ts'
import { requireDesigner } from '../../../shared/designer.ts'
import {
  conflict,
  handle,
  invalidInput,
  notFound,
  parseBody,
} from '../../../shared/http.ts'

const Body = z.object({
  designerId: z.string().optional(),
  rubricId: z.string().optional(),
  questionId: z.string().optional(),
})

export interface DeleteQuestionResponse {
  questionId: string
  deletedAt: string
}

export const handler = handle(
  async (event): Promise<DeleteQuestionResponse> => {
    const body = parseBody(event, Body)

    const rubricId = (body.rubricId ?? '').trim()
    if (!rubricId) throw invalidInput('rubricId is required.')

    const questionId = (body.questionId ?? '').trim()
    if (!questionId.startsWith('q_')) {
      throw invalidInput('questionId is not a valid question ID.')
    }

    return transaction(async (client) => {
      await requireDesigner(client, body.designerId)

      const { rows } = await client.query<{ state: string }>(
        `SELECT state FROM rubric WHERE rubric_id = $1 FOR UPDATE`,
        [rubricId],
      )

      const rubric = rows[0]
      if (!rubric) throw notFound('Rubric not found.')

      if (rubric.state !== 'Unpublished') {
        throw conflict('RUBRIC_FROZEN', 'Published rubrics cannot be edited.')
      }

      const { rows: deleted } = await client.query<{ deleted_at: string }>(
        `DELETE FROM question WHERE question_id = $1 AND rubric_id = $2
       RETURNING to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS deleted_at`,
        [questionId, rubricId],
      )
      if (!deleted[0]) throw notFound('Question not found.')

      return { questionId, deletedAt: deleted[0].deleted_at }
    })
  },
)
