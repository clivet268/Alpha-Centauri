import { z } from 'zod'
import { transaction } from '../../shared/db.ts'
import { requireDesigner } from '../../shared/designer.ts'
import {
  conflict,
  handle,
  invalidInput,
  notFound,
  parseBody,
} from '../../shared/http.ts'

const MAX_THRESHOLD = 2147483647

const Body = z.object({
  designerId: z.string().optional(),
  rubricId: z.string().optional(),
  name: z.string().optional(),
  lowThreshold: z.unknown().optional(),
  highThreshold: z.unknown().optional(),
})

export interface EditRubricResponse {
  rubricId: string
  updatedAt: string
}

function parseThreshold(
  value: unknown,
  field: string,
): number | null | undefined {
  if (value === undefined || value === null) return value
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > MAX_THRESHOLD
  ) {
    throw invalidInput(`${field} must be a non-negative integer.`)
  }
  return value
}

export const handler = handle(async (event): Promise<EditRubricResponse> => {
  const body = parseBody(event, Body)

  const rubricId = (body.rubricId ?? '').trim()
  if (!rubricId) throw invalidInput('rubricId is required.')

  const name = body.name?.trim()
  if (name !== undefined && !name) throw invalidInput('name must not be empty.')
  if (name && name.length > 200)
    throw invalidInput('name must be at most 200 characters.')

  const lowThreshold = parseThreshold(body.lowThreshold, 'lowThreshold')
  const highThreshold = parseThreshold(body.highThreshold, 'highThreshold')

  return transaction(async (client) => {
    await requireDesigner(client, body.designerId)

    const { rows } = await client.query<{
      name: string
      state: string
      low_threshold: number | null
      high_threshold: number | null
    }>(
      `SELECT name, state, low_threshold, high_threshold
       FROM rubric WHERE rubric_id = $1 FOR UPDATE`,
      [rubricId],
    )

    const rubric = rows[0]
    if (!rubric) throw notFound('Rubric not found.')

    if (rubric.state !== 'Unpublished') {
      throw conflict('RUBRIC_FROZEN', 'Rubric has been published')
    }

    const low = lowThreshold === undefined ? rubric.low_threshold : lowThreshold
    const high =
      highThreshold === undefined ? rubric.high_threshold : highThreshold
    if (low !== null && high !== null && low > high) {
      throw conflict(
        'LOW_ABOVE_HIGH',
        'lowThreshold cannot exceed highThreshold.',
      )
    }

    const { rows: updated } = await client.query<{ updated_at: string }>(
      `UPDATE rubric
       SET name = $2, low_threshold = $3, high_threshold = $4, updated_at = now()
       WHERE rubric_id = $1
       RETURNING to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at`,
      [rubricId, name ?? rubric.name, low, high],
    )

    return { rubricId, updatedAt: updated[0].updated_at }
  })
})
