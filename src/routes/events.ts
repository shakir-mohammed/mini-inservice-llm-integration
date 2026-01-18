import type { FastifyInstance } from 'fastify'
import { EventSchema } from '../schemas.js'
import { requireApiKey } from '../auth.js'
import { zodToDetails } from '../errors.js'

export async function eventsRoutes(app: FastifyInstance) {
  app.post('/events', async (req, reply) => {
    const auth = requireApiKey(req)
    if (!auth.ok) {
      const status =
        auth.kind === 'missing' ? 401 : auth.kind === 'invalid' ? 403 : 500
      req.log.warn(
        {
          customer_id: (req.body as any)?.customer_id,
          endpoint: '/events',
          status,
          reason: auth.kind,
        },
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

    const parsed = EventSchema.safeParse(req.body)
    if (!parsed.success) {
      req.log.info(
        {
          customer_id: (req.body as any)?.customer_id,
          endpoint: '/events',
          status: 400,
          reason: 'validation_error',
        },
        'validation_failed',
      )
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation error',
          details: zodToDetails(parsed.error),
        },
      })
    }

    app.eventStore.add(parsed.data)

    req.log.info(
      {
        customer_id: parsed.data.customer_id,
        endpoint: '/events',
        status: 200,
        type: parsed.data.type,
        at: parsed.data.timestamp,
      },
      'event_ingested',
    )

    return reply.status(200).send({ ok: true })
  })
}
