import type { AnalyzeLogsOutput } from '../schemas.js'

type Finding = { cause: string; evidence: string[]; confidence: number }

function pickEvidence(lines: string[], contains: string) {
  return lines.filter((l) => l.includes(contains)).slice(0, 3)
}

export function heuristicAnalyze(logs: string): AnalyzeLogsOutput {
  const lines = logs
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const causes: Finding[] = []

  const missingKey = pickEvidence(lines, 'status=401')
  if (missingKey.length) {
    causes.push({
      cause:
        'Requests are missing API key (authentication failures on /events).',
      evidence: missingKey,
      confidence: 0.85,
    })
  }

  const validation = pickEvidence(lines, 'status=400')
  if (validation.length) {
    causes.push({
      cause: 'Validation errors in event payload (missing/incorrect fields).',
      evidence: validation,
      confidence: 0.75,
    })
  }

  const downstreamTimeout = pickEvidence(lines, 'Downstream timeout')
  if (downstreamTimeout.length) {
    causes.push({
      cause: 'Downstream dependency is timing out (storage).',
      evidence: downstreamTimeout,
      confidence: 0.8,
    })
  }

  const storageUnavailable = pickEvidence(lines, 'storage unavailable')
  if (storageUnavailable.length) {
    causes.push({
      cause: 'Status endpoint errors likely caused by storage unavailability.',
      evidence: storageUnavailable,
      confidence: 0.7,
    })
  }

  const nextSteps: string[] = []
  if (missingKey.length)
    nextSteps.push(
      'Ensure client sends X-API-Key header; update integration docs and add alerting on 401 spikes.',
    )
  if (validation.length)
    nextSteps.push(
      'Share expected JSON schema; add contract tests / example payloads; consider accepting common aliases or return clearer field paths.',
    )
  if (downstreamTimeout.length || storageUnavailable.length) {
    nextSteps.push(
      'Investigate storage latency/availability; add retries with jitter + circuit breaker; expose dependency health in /health.',
    )
  }

  const missingObs: string[] = [
    'Add structured latency fields (duration_ms) and downstream timing per request.',
    'Add request_id propagation across downstream calls.',
    'Add metrics: 4xx/5xx rate per endpoint+customer, and dependency error rate.',
  ]

  const customerDraft =
    'Hi! We’re seeing some requests failing due to missing authentication headers and a few payload validation issues. ' +
    'Please ensure you include the X-API-Key header on /events requests, and that the payload matches the expected schema (notably payload.order_id). ' +
    'If you can share a sample request and timestamp, we can confirm end-to-end processing.'

  return {
    summary: `Analyzed ${lines.length} log lines; found ${causes.length} likely issue categories.`,
    likely_causes: causes.length
      ? causes
      : [
          {
            cause: 'Insufficient evidence in logs to determine cause.',
            evidence: ['(no matching error patterns found)'],
            confidence: 0.2,
          },
        ],
    next_steps: nextSteps.length
      ? nextSteps
      : [
          'Provide more logs around the incident window and include error stack traces (if any).',
        ],
    missing_observability: missingObs,
    customer_message_draft: customerDraft,
  }
}
