import type { FastifyInstance } from 'fastify'
import { requireApiKey } from '../auth.js'
import { AnalyzeLogsSchema, AnalyzeLogsOutputSchema } from '../schemas.js'
import { zodToDetails } from '../errors.js'
import { callOpenAI } from '../llm/openaiClient.js'
import { buildAnalyzeLogsPrompt } from '../llm/analyzeLogsPrompt.js'
import { heuristicAnalyze } from '../llm/heuristicAnalyzer.js'

function ensureUsefulOutput(logs: string, data: any) {
  // Keep the API useful for ops even when logs have no signal (e.g. "test")
  if (!Array.isArray(data.likely_causes) || data.likely_causes.length === 0) {
    data.likely_causes = [
      {
        cause: 'Insufficient evidence in logs to determine cause.',
        evidence: [logs.slice(0, 200) || '(empty logs)'],
        confidence: 0.2,
      },
    ]
  }

  if (!Array.isArray(data.next_steps) || data.next_steps.length === 0) {
    data.next_steps = [
      'Provide more logs around the incident window (±5 minutes) including request_id, endpoint, and status codes.',
      'Include any relevant stack traces or downstream error messages if available.',
    ]
  }

  if (
    !Array.isArray(data.missing_observability) ||
    data.missing_observability.length === 0
  ) {
    data.missing_observability = [
      'Add request_id propagation and ensure it is logged for every request.',
      'Log latency (duration_ms) per request and per downstream dependency call.',
      'Add metrics for 4xx/5xx rates per endpoint and per customer_id.',
    ]
  }

  if (
    typeof data.customer_message_draft !== 'string' ||
    !data.customer_message_draft.trim()
  ) {
    data.customer_message_draft =
      'We received your logs, but there is not enough detail to determine the cause. ' +
      'Could you share logs around the time of the issue and any request IDs or error messages you saw?'
  }

  if (typeof data.summary !== 'string' || !data.summary.trim()) {
    data.summary =
      'Insufficient log signal to produce a confident incident analysis.'
  }

  return data
}

function normalizeConfidence(data: any) {
  if (!Array.isArray(data.likely_causes)) return data

  data.likely_causes = data.likely_causes.map((c: any) => {
    const evidenceCount = Array.isArray(c.evidence) ? c.evidence.length : 0

    // Cap confidence to avoid the LLM returning 1.0 for everything.
    // If there are multiple evidence lines, allow slightly higher confidence.
    const max = evidenceCount >= 2 ? 0.9 : 0.85
    const raw = typeof c.confidence === 'number' ? c.confidence : 0.5

    return {
      ...c,
      confidence: Math.max(0, Math.min(max, raw)),
    }
  })

  return data
}

export async function analyzeLogsRoutes(app: FastifyInstance) {
  app.post('/analyze-logs', async (req, reply) => {
    /* ---------------- Auth ---------------- */
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
        { endpoint: '/analyze-logs', status, reason: auth.kind },
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

    /* ------------ Input validation ------------ */
    const parsed = AnalyzeLogsSchema.safeParse(req.body)
    if (!parsed.success) {
      req.log.info(
        { endpoint: '/analyze-logs', status: 400, reason: 'validation_error' },
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

    const logs = parsed.data.logs

    /* ------------ LLM attempt ------------ */
    const llmResult = await callOpenAI(buildAnalyzeLogsPrompt(logs))

    // Always log LLM outcome (for ops/debugging)
    req.log.info(
      {
        endpoint: '/analyze-logs',
        llm_ok: llmResult.ok,
        llm_error: llmResult.ok ? null : llmResult.error,
      },
      'llm_result',
    )

    if (llmResult.ok) {
      try {
        // LLM must return JSON only, but guard against wrappers anyway
        const jsonMatch = llmResult.content.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error('No JSON found in LLM response')

        const candidate = JSON.parse(jsonMatch[0])
        const validated = AnalyzeLogsOutputSchema.safeParse(candidate)

        if (validated.success) {
          let data = ensureUsefulOutput(logs, { ...validated.data })
          data = normalizeConfidence(data)

          req.log.info(
            { endpoint: '/analyze-logs', status: 200, source: 'llm' },
            'analyze_complete',
          )

          // IMPORTANT: return exactly the required schema (no extra keys)
          return reply.send(data)
        }

        req.log.warn(
          { endpoint: '/analyze-logs', reason: 'llm_output_invalid' },
          'llm_fallback',
        )
      } catch (err) {
        req.log.warn(
          { endpoint: '/analyze-logs', reason: 'llm_parse_error', err },
          'llm_fallback',
        )
      }
    } else {
      req.log.info(
        { endpoint: '/analyze-logs', reason: llmResult.error },
        'llm_unavailable',
      )
    }

    /* ------------ Deterministic fallback ------------ */
    const heuristicResult = heuristicAnalyze(logs)
    let finalResult = ensureUsefulOutput(logs, { ...heuristicResult })
    // Heuristic already uses sane confidences, but normalize anyway for consistency
    finalResult = normalizeConfidence(finalResult)

    req.log.info(
      { endpoint: '/analyze-logs', status: 200, source: 'heuristic' },
      'analyze_complete',
    )

    // IMPORTANT: return exactly the required schema (no extra keys)
    return reply.send(finalResult)
  })
}
