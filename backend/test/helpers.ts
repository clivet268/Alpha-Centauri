import { query } from '../src/shared/db.ts'
import type { Event } from '../src/shared/http.ts'

export function makeEvent({ method = 'POST', body }: { method?: string; body?: unknown }): Event {
  return {
    httpMethod: method,
    headers: {},
    body: body === undefined ? null : JSON.stringify(body),
  } as unknown as Event
}

export function parse(result: unknown): { status: number; body: any } {
  const r = result as { statusCode: number; body: string }
  return { status: r.statusCode, body: JSON.parse(r.body) }
}

// One RubricDesigner account per test file, sent as designerId on rubric writes.
let designerId: Promise<string> | undefined
export function testDesignerId(): Promise<string> {
  designerId ??= query<{ account_id: string }>(
    `INSERT INTO account (email, password_hash, role)
     VALUES ($1, 'x', 'RubricDesigner') RETURNING account_id`,
    [`designer-${crypto.randomUUID()}@test.org`],
  ).then((r) => r.rows[0].account_id)
  return designerId
}
