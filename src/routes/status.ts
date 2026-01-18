import type { FastifyInstance } from 'fastify'
import { requireApiKey } from '../auth.js'

export async function statusRoutes(app: FastifyInstance) {
  app.get('/status', async (req, reply) => {
    const auth = requireApiKey(req)
    if (!auth.ok) {
      const status =
        auth.kind === 'missing' ? 401 : auth.kind === 'invalid' ? 403 : 500
      req.log.warn(
        { endpoint: '/status', status, reason: auth.kind },
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
          message: 'Unauthorized',
        },
      })
    }

    const customer_id = (req.query as any)?.customer_id
    if (!customer_id || typeof customer_id !== 'string') {
      req.log.info(
        { endpoint: '/status', status: 400, reason: 'missing_customer_id' },
        'bad_request',
      )
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation error',
          details: [{ path: 'customer_id', message: 'required' }],
        },
      })
    }

    const { count, lastEventAt } = app.eventStore.countLastMinutes(
      customer_id,
      10,
    )

    req.log.info({ customer_id, endpoint: '/status', status: 200 }, 'status_ok')
    return reply.send({
      customer_id,
      events_last_10min: count,
      last_event_at: lastEventAt,
    })
  })
}
