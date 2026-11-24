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
  section: z.unknown().optional(),
  text: z.string().optional(),
  explanations: z.unknown().optional(),
})

export interface AddQuestionResponse {
  questionId: string
}

function parseExplanations(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw invalidInput('explanations is required.')
  }
  const entries = Object.entries(value)
  if (entries.some(([key]) => !RATING_KEYS.includes(key))) {
    throw invalidInput('explanations only accepts keys 5 to 1.')
  }

  const explanations: Record<string, string> = {}
  for (const key of RATING_KEYS) {
    const text = (value as Record<string, unknown>)[key]
    if (typeof text !== 'string' || !text.trim()) {
      throw invalidInput('explanations must include text for keys 5 to 1.')
    }
    explanations[key] = text.trim()
  }
  return explanations
}

export const handler = handle(async (event): Promise<AddQuestionResponse> => {
  const body = parseBody(event, Body)

  const rubricId = (body.rubricId ?? '').trim()
  if (!rubricId) throw invalidInput('rubricId is required.')

  const { section } = body
  if (
    typeof section !== 'number' ||
    !Number.isInteger(section) ||
    section < 1 ||
    section > 5
  ) {
    throw invalidInput('section must be an integer from 1 to 5.')
  }

  const text = (body.text ?? '').trim()
  if (!text) throw invalidInput('text must not be empty.')
  if (text.length > 2000)
    throw invalidInput('text must be at most 2000 characters.')

  const explanations = parseExplanations(body.explanations)

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

    const { rows: inserted } = await client.query<{ question_id: string }>(
      `INSERT INTO question (rubric_id, section, position, text, explanations)
       VALUES (
         $1, $2,
         (SELECT COALESCE(MAX(position), 0) + 1 FROM question
          WHERE rubric_id = $1 AND section = $2),
         $3, $4
       )
       RETURNING question_id`,
      [rubricId, section, text, JSON.stringify(explanations)],
    )

    return { questionId: inserted[0].question_id }
  })
})
