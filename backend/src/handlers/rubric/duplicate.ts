import { z } from 'zod'
import { transaction } from '../../shared/db.ts'
import {
  handle,
  invalidInput,
  notFound,
  parseBody,
} from '../../shared/http.ts'
import { requireDesigner } from '../../shared/designer.ts'
import type { GetRubricResponse } from './get.ts'

const MAX_NAME = 200

const Body = z.object({
  designerId: z.string().optional(),
  rubricId: z.string().startsWith('rb_'),
  name: z.string().optional(),
})

export type DuplicateRubricResponse = GetRubricResponse

export const handler = handle(
  async (event): Promise<DuplicateRubricResponse> => {
    const body = parseBody(event, Body)

    let name: string | undefined
    if (body.name !== undefined) {
      name = body.name.trim()
      if (!name) throw invalidInput('name must not be empty.')
      if (name.length > MAX_NAME)
        throw invalidInput(`name must be at most ${MAX_NAME} characters.`)
    }

    return transaction(async (client) => {
      // The copy belongs to whoever duplicates it, not the source rubric's designer.
      const designerId = await requireDesigner(client, body.designerId)

      const { rows } = await client.query<{
        name: string
        low_threshold: number | null
        high_threshold: number | null
      }>(
        `SELECT name, low_threshold, high_threshold
         FROM rubric WHERE rubric_id = $1`,
        [body.rubricId],
      )
      const source = rows[0]
      if (!source) throw notFound('Rubric not found.')

      name ??= `Copy of ${source.name}`.slice(0, MAX_NAME)

      const { rows: created } = await client.query<{ rubric_id: string }>(
        `INSERT INTO rubric (designer_id, name, low_threshold, high_threshold)
         VALUES ($1, $2, $3, $4)
         RETURNING rubric_id`,
        [designerId, name, source.low_threshold, source.high_threshold],
      )
      const rubricId = created[0].rubric_id

      await client.query(
        `INSERT INTO question (rubric_id, section, position, text, explanations)
         SELECT $1, section, position, text, explanations
         FROM question WHERE rubric_id = $2`,
        [rubricId, body.rubricId],
      )

      // Same query and ordering as rubric/get.
      const { rows: questions } = await client.query<{
        question_id: string
        section: number
        text: string
        explanations: Record<string, string>
      }>(
        `SELECT question_id, section, text, explanations
         FROM question WHERE rubric_id = $1
         ORDER BY section, position`,
        [rubricId],
      )

      return {
        rubricId,
        name,
        state: 'Unpublished',
        publishDate: null,
        lowThreshold: source.low_threshold,
        highThreshold: source.high_threshold,
        questions: questions.map((q) => ({
          questionId: q.question_id,
          section: q.section,
          text: q.text,
          explanations: q.explanations,
        })),
      }
    })
  },
)
