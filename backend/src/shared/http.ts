import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import type { z } from 'zod'

// REST API (v1) Lambda proxy integration.
export type Event = APIGatewayProxyEvent
export type Result = APIGatewayProxyResult
export type Handler = (event: Event) => Promise<Result>

export class HttpError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown[]

  constructor(status: number, code: string, message: string, details?: unknown[]) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export const invalidInput = (message: string) =>
  new HttpError(400, 'INVALID_INPUT', message)
export const unauthorized = (message = 'Missing or expired token.') =>
  new HttpError(401, 'UNAUTHORIZED', message)
export const forbidden = (message = 'You do not have access to this resource.') =>
  new HttpError(403, 'FORBIDDEN', message)
export const notFound = (message = 'Not found.') =>
  new HttpError(404, 'NOT_FOUND', message)
export const conflict = (code: string, message: string, details?: unknown[]) =>
  new HttpError(409, code, message, details)

function json(status: number, body: unknown, method?: string): Result {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    // REST API proxy integrations don't add CORS headers; the OPTIONS preflight is in infra/lib/api.ts.
    'Access-Control-Allow-Origin': '*',
  }
  if (method === 'GET') headers['Cache-Control'] = 'private, no-store'
  return { statusCode: status, headers, body: JSON.stringify(body) }
}

export function handle<T>(fn: (event: Event) => Promise<T>): Handler {
  return async (event) => {
    const method = event.httpMethod
    try {
      return json(200, await fn(event), method)
    } catch (err) {
      if (err instanceof HttpError) {
        const error: Record<string, unknown> = { code: err.code, message: err.message }
        if (err.details) error.details = err.details
        return json(err.status, { error }, method)
      }
      console.error(err)
      return json(500, { error: { code: 'INTERNAL', message: 'Internal server error.' } }, method)
    }
  }
}

export function parseBody<T>(event: Event, schema: z.ZodType<T>): T {
  let parsed: unknown = {}
  if (event.body) {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw invalidInput('Request body must be valid JSON.')
    }
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    throw invalidInput(
      result.error.issues
        .map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message))
        .join('; '),
    )
  }
  return result.data
}
