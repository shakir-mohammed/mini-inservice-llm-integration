import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    // Avoid logging body payloads or keys by default (PII/security)
    paths: [
      'req.headers.authorization',
      "req.headers['x-api-key']",
      'req.body',
    ],
    remove: true,
  },
})
