import { NextRequest } from 'next/server'
import { ok, err } from '@/lib/apiHelper'
import { getUserId } from '@/lib/auth'
import { validateEntries, saveEntry, AgentEntry, MAX_ENTRIES_PER_SAVE } from '@/lib/agent'

// Body: { entries: AgentEntry[] } — entries the user confirmed in the chat.
// Re-validates every entry server-side, then saves them one by one.
export async function POST(req: NextRequest) {
  if (!getUserId(req)) return err('Unauthorized', 401)

  const { entries } = await req.json() as { entries?: AgentEntry[] }
  if (!Array.isArray(entries) || !entries.length) return err('entries is required', 400)
  if (entries.length > MAX_ENTRIES_PER_SAVE) return err(`At most ${MAX_ENTRIES_PER_SAVE} entries at once`, 400)

  try {
    const validated = await validateEntries(entries)
    const results = []
    for (const e of validated) {
      if (e.issues?.length) {
        results.push({ ok: false, error: e.issues.join(', ') })
        continue
      }
      try {
        await saveEntry(e)
        results.push({ ok: true })
      } catch (ex: unknown) {
        results.push({ ok: false, error: ex instanceof Error ? ex.message : 'Save failed' })
      }
    }
    return ok({ results })
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}
