interface ClaudeContentBlock {
  type: string
  text?: string
}

interface ClaudeResponse {
  content?: ClaudeContentBlock[]
}

function extractJson<T>(value: string): T {
  const trimmed = value.trim()
  const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i)?.[1] ?? trimmed.match(/```([\s\S]*?)```/i)?.[1]
  return JSON.parse(fenced ?? trimmed) as T
}

export async function runClaudeJson<T>({
  system,
  prompt,
  fallback,
}: {
  system: string
  prompt: string
  fallback: () => T
}): Promise<T> {
  const apiKey = process.env.CLAUDE_API_KEY
  if (!apiKey) {
    return fallback()
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      return fallback()
    }

    const payload = (await response.json()) as ClaudeResponse
    const text = payload.content
      ?.filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text)
      .join('\n')

    if (!text) {
      return fallback()
    }

    return extractJson<T>(text)
  } catch {
    return fallback()
  }
}
