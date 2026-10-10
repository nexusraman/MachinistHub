import { NextRequest } from 'next/server'
import { ok, err } from '@/lib/apiHelper'
import { getUserId } from '@/lib/auth'
import { validateEntries, AgentEntry, MAX_ENTRIES_PER_SAVE } from '@/lib/agent'

// Body: { entries: AgentEntry[] } — re-checks entries edited in the review dialog.
// Returns them with issues and effects (balance / stock changes). Writes nothing.
export async function POST(req: NextRequest) {
  if (!getUserId(req)) return err('Unauthorized', 401)

  const { entries } = await req.json() as { entries?: AgentEntry[] }
  if (!Array.isArray(entries)) return err('entries is required', 400)
  if (entries.length > MAX_ENTRIES_PER_SAVE) return err(`At most ${MAX_ENTRIES_PER_SAVE} entries at once`, 400)

  try {
    return ok({ entries: await validateEntries(entries) })
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}
