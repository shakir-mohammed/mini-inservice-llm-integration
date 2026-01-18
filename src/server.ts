import 'dotenv/config'

import Fastify from 'fastify'
import { logger } from './logger.js'
import { EventStore } from './storage.js'
import { eventsRoutes } from './routes/events.js'
import { statusRoutes } from './routes/status.js'
import { healthRoutes } from './routes/health.js'
import { analyzeLogsRoutes } from './routes/analyzeLogs.js'

declare module 'fastify' {
  interface FastifyInstance {
    eventStore: EventStore
  }
}

const app = Fastify({
  logger,
})

// Attach store
app.decorate('eventStore', new EventStore())

// Basic request logging fields required by assignment
app.addHook('onResponse', async (req, reply) => {
  const customerId =
    (req.body as any)?.customer_id ||
    (req.query as any)?.customer_id ||
    undefined

  req.log.info(
    {
      customer_id: customerId,
      endpoint: req.routerPath ?? req.url,
      method: req.method,
      status: reply.statusCode,
    },
    'request_complete',
  )
})

// Routes
await app.register(eventsRoutes)
await app.register(statusRoutes)
await app.register(healthRoutes)
await app.register(analyzeLogsRoutes)

// Central error handler (avoid leaking internals)
app.setErrorHandler((err, req, reply) => {
  req.log.error({ err, endpoint: req.url }, 'unhandled_error')
  reply
    .status(500)
    .send({ error: { code: 'INTERNAL', message: 'Unexpected error' } })
})

const port = Number(process.env.PORT ?? '3000')
app.listen({ port, host: '0.0.0.0' }).catch((e) => {
  app.log.error(e)
  process.exit(1)
})
