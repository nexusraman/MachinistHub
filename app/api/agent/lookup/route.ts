import { NextRequest } from 'next/server'
import { ok, err } from '@/lib/apiHelper'
import { getUserId } from '@/lib/auth'
import { runLookup, lookupNote, LookupQuery } from '@/lib/lookup'

// Body: { query: LookupQuery } — re-runs a lookup with a new date range (◀ ▶ / date pickers
// on a results table). No AI call, read-only.
export async function POST(req: NextRequest) {
  if (!getUserId(req)) return err('Unauthorized', 401)

  const { query } = await req.json() as { query?: LookupQuery }
  if (!query || typeof query !== 'object') return err('query is required', 400)

  try {
    const r = await runLookup(query)
    return ok({ ...r, query, note: lookupNote(query, r) })
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}
