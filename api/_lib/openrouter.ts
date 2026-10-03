// Shared helpers for the /api functions. Files under api/_lib are not routes on Vercel.

const DEFAULT_MODEL = 'anthropic/claude-haiku-4.5'
const hits = new Map<string, number[]>()

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } })
}

/**
 * Rejects the request unless it carries the shared passcode, and applies a best-effort
 * per-IP limit (in memory, so per warm instance). The passcode is what actually keeps
 * strangers from spending the OpenRouter key.
 */
export function guard(req: Request): Response | null {
  if (!process.env.OPENROUTER_API_KEY) return json({ error: 'AI is not configured on the server.' }, 503)
  const expected = process.env.APP_PASSCODE
  if (expected && req.headers.get('x-lexi-passcode') !== expected) return json({ error: 'Wrong passcode.' }, 401)

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'local'
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3_600_000)
  if (recent.length >= 60) return json({ error: 'Too many requests. Try again in a bit.' }, 429)
  hits.set(ip, [...recent, now])
  return null
}

export async function readBody<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T
  } catch {
    return null
  }
}

export const clip = (s: unknown, max: number) => (typeof s === 'string' ? s.slice(0, max).trim() : '')

/** Calls OpenRouter and returns the first JSON object in the reply. */
export async function completeJson<T>(system: string, user: string, maxTokens = 400): Promise<T> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'content-type': 'application/json',
      'x-title': 'Lexi',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
      max_tokens: maxTokens,
      temperature: 0.4,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const text = data.choices?.[0]?.message?.content ?? ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Model did not return JSON.')
  return JSON.parse(match[0]) as T
}
