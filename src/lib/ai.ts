import type { Word } from '../types'
import type { Feedback } from './db'
import { dayKey } from './dates'

const DAILY_CAP = 30
const CAP_KEY = 'lexi-ai-calls'

/** Client-side daily cap, so a stuck button can't run up the bill. */
function spend(): boolean {
  try {
    const raw = JSON.parse(localStorage.getItem(CAP_KEY) ?? '{}') as { day?: string; n?: number }
    const n = raw.day === dayKey() ? (raw.n ?? 0) : 0
    if (n >= DAILY_CAP) return false
    localStorage.setItem(CAP_KEY, JSON.stringify({ day: dayKey(), n: n + 1 }))
  } catch {
    // storage blocked: allow the call; the server still checks the passcode
  }
  return true
}

async function post<T>(path: string, passcode: string, body: unknown): Promise<T> {
  if (!navigator.onLine) throw new Error('You are offline.')
  if (!spend()) throw new Error('That’s plenty of AI for today. It resets tomorrow.')
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-lexi-passcode': passcode },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong.')
  return data as T
}

export const getFeedback = (passcode: string, word: Word, sentence: string) =>
  post<Feedback>('/api/feedback', passcode, {
    word: word.word,
    definition: word.definition,
    pattern: word.pattern.rule,
    sentence,
  })

export const getExample = (passcode: string, word: Word, avoid: string[]) =>
  post<{ sentence: string }>('/api/example', passcode, { word: word.word, definition: word.definition, avoid })
