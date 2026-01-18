import type { FastifyRequest } from 'fastify'

export function requireApiKey(req: FastifyRequest) {
  const expected = process.env.API_KEY
  if (!expected) {
    // Misconfig should be loud in logs/ops; but do not leak to caller
    return { ok: false as const, kind: 'server_misconfig' as const }
  }

  const provided = req.headers['x-api-key']
  if (!provided) return { ok: false as const, kind: 'missing' as const }
  if (Array.isArray(provided))
    return { ok: false as const, kind: 'invalid' as const }
  if (provided !== expected)
    return { ok: false as const, kind: 'invalid' as const }

  return { ok: true as const }
}
