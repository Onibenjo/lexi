// Storage for synced progress: one record per sync code, in Upstash Redis.
// Each record is two keys: `<key>:rev` (a counter) and `<key>:data` (the JSON snapshot).
// Writes are compare-and-set on rev, so two devices pushing at once can't overwrite each other.

export interface Stored {
  rev: number
  data: string | null
}

export interface Store {
  get(key: string): Promise<Stored | null>
  /** Creates an empty record. Returns false if the key already exists. */
  create(key: string): Promise<boolean>
  /** Writes only if the record is still at `baseRev`. Returns the new rev, or null on a conflict. */
  put(key: string, baseRev: number, data: string): Promise<number | null>
  del(key: string): Promise<void>
}

const CAS = `
local rev = redis.call('GET', KEYS[1])
if not rev or tonumber(rev) ~= tonumber(ARGV[1]) then return -1 end
redis.call('SET', KEYS[2], ARGV[2])
return redis.call('INCR', KEYS[1])
`

function redisStore(url: string, token: string): Store {
  async function cmd<T>(...args: (string | number)[]): Promise<T> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(args.map(String)),
    })
    const body = (await res.json()) as { result?: T; error?: string }
    if (!res.ok || body.error) throw new Error(`Redis: ${body.error ?? res.status}`)
    return body.result as T
  }
  return {
    async get(key) {
      const [rev, data] = await cmd<(string | null)[]>('MGET', `${key}:rev`, `${key}:data`)
      return rev === null ? null : { rev: Number(rev), data }
    },
    async create(key) {
      return (await cmd<string | null>('SET', `${key}:rev`, 0, 'NX')) === 'OK'
    },
    async put(key, baseRev, data) {
      const rev = await cmd<number>('EVAL', CAS, 2, `${key}:rev`, `${key}:data`, baseRev, data)
      return rev < 0 ? null : rev
    },
    async del(key) {
      await cmd('DEL', `${key}:rev`, `${key}:data`)
    },
  }
}

/** Used by `vite dev` when no Redis is configured, so sync can be tried locally. */
function memoryStore(): Store {
  const m = new Map<string, Stored>()
  return {
    async get(key) {
      return m.get(key) ?? null
    },
    async create(key) {
      if (m.has(key)) return false
      m.set(key, { rev: 0, data: null })
      return true
    },
    async put(key, baseRev, data) {
      const cur = m.get(key)
      if (!cur || cur.rev !== baseRev) return null
      m.set(key, { rev: baseRev + 1, data })
      return baseRev + 1
    },
    async del(key) {
      m.delete(key)
    },
  }
}

let memory: Store | null = null

/**
 * The Vercel Marketplace integration sets KV_REST_API_URL / KV_REST_API_TOKEN, optionally with a
 * custom prefix (e.g. STORAGE_DB_KV_REST_API_URL). A direct Upstash setup uses UPSTASH_REDIS_REST_*.
 */
function redisEnv(): { url: string; token: string } | null {
  const env = process.env
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    return { url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN }
  }
  const urlKey = Object.keys(env).find((k) => k.endsWith('KV_REST_API_URL') && env[k])
  const token = urlKey && env[urlKey.replace(/URL$/, 'TOKEN')]
  return urlKey && token ? { url: env[urlKey]!, token } : null
}

export function getStore(): Store | null {
  const redis = redisEnv()
  if (redis) return redisStore(redis.url, redis.token)
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) return (memory ??= memoryStore())
  return null
}
