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
