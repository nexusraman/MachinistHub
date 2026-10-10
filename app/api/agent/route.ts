import { NextRequest } from 'next/server'
import { ok, err } from '@/lib/apiHelper'
import { getUserId } from '@/lib/auth'
import { runAgent, AgentEntry, ChatMessage, MAX_ENTRIES_PER_SAVE, MAX_IMAGES_PER_MESSAGE } from '@/lib/agent'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_BYTES = 4 * 1024 * 1024 // per image, after base64 decoding

// Body: { messages: { role, text, images? }[], draft?: AgentEntry[] }
// Returns the updated draft (unsaved entries) — nothing is written to the database here.
export async function POST(req: NextRequest) {
  if (!getUserId(req)) return err('Unauthorized', 401)

  const { messages, draft = [] } = await req.json() as { messages?: ChatMessage[]; draft?: AgentEntry[] }
  if (!Array.isArray(draft) || draft.length > MAX_ENTRIES_PER_SAVE) return err(`Draft can hold at most ${MAX_ENTRIES_PER_SAVE} entries`, 400)
  if (!Array.isArray(messages) || !messages.length) return err('messages is required', 400)
  const clean: ChatMessage[] = []
  for (const m of messages) {
    if (m.role !== 'user' && m.role !== 'model') continue
    const text = typeof m.text === 'string' ? m.text.slice(0, 20000) : ''
    const images = m.role === 'user' && Array.isArray(m.images) ? m.images : []
    if (images.length > MAX_IMAGES_PER_MESSAGE) return err(`At most ${MAX_IMAGES_PER_MESSAGE} photos per message`, 400)
    for (const img of images) {
      if (!IMAGE_TYPES.includes(img?.mimeType) || typeof img.data !== 'string') return err('Unsupported photo format', 400)
      if (img.data.length * 0.75 > MAX_IMAGE_BYTES) return err('Photo is too large', 413)
    }
    if (!text.trim() && !images.length) continue
    clean.push({ role: m.role, text, ...(images.length ? { images } : {}) })
  }
  if (!clean.length) return err('messages is required', 400)

  try {
    return ok(await runAgent(clean, draft))
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}
