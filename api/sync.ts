import { randomInt, createHash } from 'node:crypto'
import { CODE_WORDS } from './_lib/codewords.js'
import { checkPasscode, json, rateLimit, readBody } from './_lib/openrouter.js'
import { getStore, type Store } from './_lib/store.js'

// Sync records live under a hash of the code, so the database never holds the codes themselves.
// The code travels in a header, never in the URL, to keep it out of request logs.

const CODE = /^[a-z]+(-[a-z]+){3}-\d{2}$/
const MAX_BYTES = 3_000_000

function newCode(): string {
  const words = Array.from({ length: 4 }, () => CODE_WORDS[randomInt(CODE_WORDS.length)])
  return `${words.join('-')}-${String(randomInt(100)).padStart(2, '0')}`
}

const keyFor = (code: string) => `lexi:sync:${createHash('sha256').update(code).digest('hex')}`

/** Shared checks; returns the store and the record key, or the error response to send. */
function open(req: Request): { store: Store; key: string } | Response {
  const store = getStore()
  if (!store) return json({ error: 'Sync is not set up on the server.' }, 503)
  const limited = rateLimit(req, 'sync', 240)
  if (limited) return limited
  const code = req.headers.get('x-lexi-sync') ?? ''
  if (!CODE.test(code)) return json({ error: 'That sync code doesn’t look right.' }, 400)
  return { store, key: keyFor(code) }
}

const notFound = () => json({ error: 'No Lexi was found for that code.' }, 404)

/** Turn on sync: makes a new code. Needs the app passcode so strangers can't fill the database. */
export async function POST(req: Request): Promise<Response> {
  const store = getStore()
  if (!store) return json({ error: 'Sync is not set up on the server.' }, 503)
  const denied = checkPasscode(req) ?? rateLimit(req, 'sync-create', 10)
  if (denied) return denied
  for (let i = 0; i < 5; i++) {
    const code = newCode()
    if (await store.create(keyFor(code))) return json({ code, rev: 0 })
  }
  return json({ error: 'Could not make a code. Try again.' }, 500)
}

export async function GET(req: Request): Promise<Response> {
  const o = open(req)
  if (o instanceof Response) return o
  const rec = await o.store.get(o.key)
  if (!rec) return notFound()
  return json({ rev: rec.rev, data: rec.data ? JSON.parse(rec.data) : null })
}

/** Body: { baseRev, data }. Answers 409 with the current record when another device wrote first. */
export async function PUT(req: Request): Promise<Response> {
  const o = open(req)
  if (o instanceof Response) return o
  const body = await readBody<{ baseRev?: unknown; data?: unknown }>(req)
  if (!body || typeof body.baseRev !== 'number' || typeof body.data !== 'object' || body.data === null) {
    return json({ error: 'Bad request.' }, 400)
  }
  const data = JSON.stringify(body.data)
  if (data.length > MAX_BYTES) return json({ error: 'Too much data to sync.' }, 413)

  const rev = await o.store.put(o.key, body.baseRev, data)
  if (rev !== null) return json({ rev })
  const cur = await o.store.get(o.key)
  if (!cur) return notFound()
  return json({ rev: cur.rev, data: cur.data ? JSON.parse(cur.data) : null }, 409)
}

export async function DELETE(req: Request): Promise<Response> {
  const o = open(req)
  if (o instanceof Response) return o
  await o.store.del(o.key)
  return json({ ok: true })
}
