import { z } from 'zod'

export const EventSchema = z.object({
  customer_id: z.string().min(1),
  timestamp: z.string().datetime({ offset: true }), // requires ISO with timezone, e.g. 2026-01-13T09:12:00Z
  type: z.string().min(1),
  payload: z.record(z.unknown()), // must be object (record) not array/string
})

export type IngestEvent = z.infer<typeof EventSchema>

export const AnalyzeLogsSchema = z.object({
  logs: z.string().min(1),
})

export type AnalyzeLogsInput = z.infer<typeof AnalyzeLogsSchema>

export const AnalyzeLogsOutputSchema = z.object({
  summary: z.string(),
  likely_causes: z.array(
    z.object({
      cause: z.string(),
      evidence: z.array(z.string()).min(1),
      confidence: z.number().min(0).max(1),
    }),
  ),
  next_steps: z.array(z.string()),
  missing_observability: z.array(z.string()),
  customer_message_draft: z.string(),
})

export type AnalyzeLogsOutput = z.infer<typeof AnalyzeLogsOutputSchema>
