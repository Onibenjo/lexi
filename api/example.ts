import { clip, completeJson, guard, json, readBody } from './_lib/openrouter.js'

const SYSTEM = `You write example sentences for an English vocabulary app for adult learners.
Write ONE natural, modern sentence (8–20 words) using the target word with the given meaning, set in everyday life or work (messages, meetings, money, family, travel, food, school).
Make it vivid and specific, not generic or literary. Do not reuse the situations in the sentences to avoid.
Reply with JSON only: {"sentence":"..."}`

interface Body {
  word?: string
  definition?: string
  avoid?: string[]
}

export async function POST(req: Request): Promise<Response> {
  const blocked = guard(req)
  if (blocked) return blocked
  const body = await readBody<Body>(req)
  const word = clip(body?.word, 40)
  if (!word) return json({ error: 'Missing word.' }, 400)
  const avoid = (Array.isArray(body?.avoid) ? body.avoid : []).slice(0, 6).map((s) => `- ${clip(s, 200)}`)

  try {
    const out = await completeJson<{ sentence: string }>(
      SYSTEM,
      `Target word: ${word}\nMeaning: ${clip(body?.definition, 200)}\nSentences to avoid:\n${avoid.join('\n') || '- (none)'}`,
      150,
    )
    const sentence = clip(out.sentence, 300)
    if (!sentence) throw new Error('empty sentence')
    return json({ sentence })
  } catch (err) {
    console.error(err)
    return json({ error: 'Could not get a new example right now.' }, 502)
  }
}
