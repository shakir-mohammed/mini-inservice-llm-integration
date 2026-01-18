import type { FastifyInstance } from 'fastify'
import { requireApiKey } from '../auth.js'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (req, reply) => {
    // Auth
    const auth = requireApiKey(req)
    if (!auth.ok) {
      const status =
        auth.kind === 'missing' ? 401 : auth.kind === 'invalid' ? 403 : 500

      const message =
        status === 401
          ? 'Missing API key'
          : status === 403
            ? 'Invalid API key'
            : 'Unexpected error'

      req.log.warn(
        { endpoint: '/health', status, reason: auth.kind },
        'auth_failed',
      )

      return reply.status(status).send({
        error: {
          code:
            status === 401
              ? 'UNAUTHORIZED'
              : status === 403
                ? 'FORBIDDEN'
                : 'INTERNAL',
          message,
        },
      })
    }

    // "Deeper" checks: env presence + store sanity
    const apiKeyConfigured = !!process.env.API_KEY
    const storeSize = app.eventStore.size()

    const ok = apiKeyConfigured // minimal but meaningful
    const resp = {
      ok,
      checks: {
        api_key_configured: apiKeyConfigured,
        store: { kind: 'memory', size: storeSize },
      },
    }

    req.log.info({ endpoint: '/health', status: ok ? 200 : 500 }, 'health')
    return reply.status(ok ? 200 : 500).send(resp)
  })
}
