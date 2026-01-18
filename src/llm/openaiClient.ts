export type ChatMessage = { role: 'system' | 'user'; content: string }

type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

export async function callOpenAI(messages: ChatMessage[]) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return { ok: false as const, error: 'missing_api_key' as const }

  const baseUrl = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1'
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS ?? '8000')

  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0, // reduce guessing
        messages,
      }),
    })

    if (!res.ok) {
      return { ok: false as const, error: `http_${res.status}` as const }
    }

    // Type the JSON response so TS allows property access
    const json = (await res.json()) as OpenAIChatResponse

    const content = json?.choices?.[0]?.message?.content
    if (!content || typeof content !== 'string') {
      return { ok: false as const, error: 'no_content' as const }
    }

    return { ok: true as const, content }
  } catch (e: any) {
    return {
      ok: false as const,
      error:
        e?.name === 'AbortError' ? ('timeout' as const) : ('network' as const),
    }
  } finally {
    clearTimeout(t)
  }
}
