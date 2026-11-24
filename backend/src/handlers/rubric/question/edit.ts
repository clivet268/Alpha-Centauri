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

const RATING_KEYS = ['5', '4', '3', '2', '1']

const Body = z.object({
  designerId: z.string().optional(),
  rubricId: z.string().optional(),
  questionId: z.string().optional(),
  text: z.string().optional(),
  explanations: z.unknown().optional(),
})

export interface EditQuestionResponse {
  questionId: string
  updatedAt: string
}

function parseExplanations(value: unknown): Record<string, string> {
  if (value === undefined) return {}
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw invalidInput('explanations only accepts keys 5 to 1.')
  }

  const explanations: Record<string, string> = {}
  for (const [key, text] of Object.entries(value)) {
    if (!RATING_KEYS.includes(key)) {
      throw invalidInput('explanations only accepts keys 5 to 1.')
    }
    if (typeof text !== 'string' || !text.trim()) {
      throw invalidInput('explanations must not be empty.')
    }
    explanations[key] = text.trim()
  }
  return explanations
}

export const handler = handle(async (event): Promise<EditQuestionResponse> => {
  const body = parseBody(event, Body)

  const rubricId = (body.rubricId ?? '').trim()
  if (!rubricId) throw invalidInput('rubricId is required.')

  const questionId = (body.questionId ?? '').trim()
  if (!questionId.startsWith('q_')) {
    throw invalidInput('questionId is not a valid question ID.')
  }

  const text = body.text?.trim()
  if (text !== undefined && !text) throw invalidInput('text must not be empty.')
  if (text && text.length > 2000)
    throw invalidInput('text must be at most 2000 characters.')

  const explanations = parseExplanations(body.explanations)
  if (text === undefined && Object.keys(explanations).length === 0) {
    throw invalidInput('text or explanations is required.')
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

    const { rows: updated } = await client.query<{ updated_at: string }>(
      `UPDATE question
       SET text = COALESCE($3, text),
           explanations = explanations || $4::jsonb,
           updated_at = now()
       WHERE question_id = $1 AND rubric_id = $2
       RETURNING to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at`,
      [questionId, rubricId, text ?? null, JSON.stringify(explanations)],
    )
    if (!updated[0]) throw notFound('Question not found.')

    return { questionId, updatedAt: updated[0].updated_at }
  })
})
