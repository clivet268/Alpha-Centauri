// Serves every route in src/routes.ts on http://localhost:3001 by calling the Lambda handlers
// directly, so the frontend can run against local Postgres without deploying.
// Vite proxies /api/* here (see vite.config.ts).
import { createServer } from 'node:http'
import { routes } from '../src/routes.ts'
import type { Event, Handler } from '../src/shared/http.ts'

const port = Number(process.env.PORT ?? 3001)

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`)
  const method = req.method ?? 'GET'
  const file = routes[`${method} ${url.pathname}` as keyof typeof routes]
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'No such route.' } }))
    return
  }

  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const body = Buffer.concat(chunks).toString('utf8')

  // Minimal API Gateway REST API (v1) proxy event.
  const event = {
    httpMethod: method,
    path: url.pathname,
    resource: url.pathname,
    headers: Object.fromEntries(
      Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : (v ?? '')]),
    ),
    queryStringParameters: url.searchParams.size ? Object.fromEntries(url.searchParams) : null,
    body: body || null,
    isBase64Encoded: false,
  } as unknown as Event

  const mod = (await import(`../src/handlers/${file}.ts`)) as { handler: Handler }
  const result = await mod.handler(event)
  res.writeHead(result.statusCode, result.headers as Record<string, string>)
  res.end(result.body)
  console.log(`${method} ${url.pathname} → ${result.statusCode}`)
})

server.listen(port, () => {
  console.log(`Local API on http://localhost:${port}`)
  for (const key of Object.keys(routes)) console.log(`  ${key}`)
})
