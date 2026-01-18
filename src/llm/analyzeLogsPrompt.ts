export function buildAnalyzeLogsPrompt(logs: string) {
  return [
    {
      role: 'system' as const,
      content: [
        'You are an on-call assistant. Analyze ONLY what is present in the provided logs.',
        'Hard rules:',
        '- Do NOT guess. If evidence is missing, say so explicitly.',
        '- Every likely cause MUST include evidence copied verbatim from the input logs.',
        '- Evidence MUST be full original log line(s), not partial fragments or paraphrases.',
        '- Confidence must reflect evidence strength (0-1).',
        '- Output MUST be valid JSON and match the required schema.',
        '- Avoid including secrets or PII. Do not repeat API keys or request bodies unless necessary; prefer referencing log lines.',
        '- Return ONLY JSON. No markdown, no commentary.',
      ].join('\n'),
    },
    {
      role: 'user' as const,
      content: [
        'Input logs (plain text):',
        '----',
        logs,
        '----',
        'Return ONLY JSON with keys:',
        'summary, likely_causes[{cause,evidence[],confidence}], next_steps[], missing_observability[], customer_message_draft',
      ].join('\n'),
    },
  ]
}
