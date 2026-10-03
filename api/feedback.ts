import { clip, completeJson, guard, json, readBody } from './_lib/openrouter.js'

const SYSTEM = `You are a warm, precise English tutor. An adult learner (often a Nigerian or West African English speaker) wrote one sentence to practise a new word.
Judge ONLY: is the target word used with the right meaning, is the grammar correct, does it sound natural to a native speaker.
Be encouraging but honest. Never lecture. Keep every note under 20 words and speak to the learner as "you".
Reply with JSON only:
{"verdict":"great"|"good"|"needs-work","notes":["1–3 short notes: what works, then the single most useful fix"],"improved":"a natural version of THEIR sentence, keeping their idea; identical if already great"}`

interface Body {
  word?: string
  definition?: string
  pattern?: string
  sentence?: string
}

export async function POST(req: Request): Promise<Response> {
  const blocked = guard(req)
  if (blocked) return blocked
  const body = await readBody<Body>(req)
  const sentence = clip(body?.sentence, 300)
  const word = clip(body?.word, 40)
  if (!word || sentence.length < 3) return json({ error: 'Write a sentence first.' }, 400)

  const prompt = `Target word: ${word}
Meaning: ${clip(body?.definition, 200)}
Grammar pattern: ${clip(body?.pattern, 120)}
Learner's sentence: """${sentence}"""`

  try {
    const out = await completeJson<{ verdict: string; notes: string[]; improved: string }>(SYSTEM, prompt)
    const verdict = ['great', 'good', 'needs-work'].includes(out.verdict) ? out.verdict : 'good'
    const notes = Array.isArray(out.notes) ? out.notes.slice(0, 3).map((n) => clip(n, 200)) : []
    return json({ verdict, notes, improved: clip(out.improved, 400) || sentence })
  } catch (err) {
    console.error(err)
    return json({ error: 'Feedback is unavailable right now.' }, 502)
  }
}
