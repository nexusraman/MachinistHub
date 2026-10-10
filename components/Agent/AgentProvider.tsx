'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import axios from 'axios'
import { useSnackbar } from 'notistack'
import { DATA_CHANGED_EVENT } from '@/utils/entryOptions'
import { AgentEntry, Message, SaveResult, errorMessage, stripComputed } from './shared'
import type { AgentReply } from '@/lib/agent'
import ReviewDialog from './ReviewDialog'
import type { ChatImage } from './image'

// One conversation + one draft, shared by the floating drawer and the full-page Assistant tab.
// The draft holds unsaved entries; each chat message adds to, edits or removes from it.

interface AgentContextValue {
  loggedIn: boolean
  messages: Message[]
  draft: AgentEntry[]
  lastAddedIds: Set<string>
  thinking: boolean
  drawerOpen: boolean
  setDrawerOpen: (open: boolean | ((o: boolean) => boolean)) => void
  send: (text: string, images?: ChatImage[]) => Promise<boolean>
  removeDraft: (id: string) => void
  openReview: () => void
  reset: () => void
}

const AgentContext = createContext<AgentContextValue | null>(null)

export function useAgent() {
  const ctx = useContext(AgentContext)
  if (!ctx) throw new Error('useAgent must be used inside AgentProvider')
  return ctx
}

const entriesLabel = (n: number) => `${n} ${n === 1 ? 'entry' : 'entries'}`

export default function AgentProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { enqueueSnackbar } = useSnackbar()

  const [loggedIn, setLoggedIn] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState<AgentEntry[]>([])
  const [lastAddedIds, setLastAddedIds] = useState<Set<string>>(new Set())
  const [thinking, setThinking] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)

  useEffect(() => {
    let token: string | null = null
    try { token = localStorage.getItem('authToken') } catch { /* storage unavailable */ }
    setLoggedIn(!!token)
    if (!token) { setMessages([]); setDraft([]) } // don't carry anything across logins
  }, [pathname])

  const send = useCallback(async (text: string, images: ChatImage[] = []) => {
    const trimmed = text.trim()
    if ((!trimmed && !images.length) || thinking) return false
    const next: Message[] = [...messages, { role: 'user', text: trimmed, ...(images.length ? { images } : {}) }]
    setMessages(next)
    setThinking(true)
    // Only the latest photos are uploaded again; the model already turned older ones into draft entries
    let lastWithImages = -1
    next.forEach((m, i) => { if (m.images?.length) lastWithImages = i })
    try {
      const res = await axios.post('/api/agent', {
        messages: next.map((m, i) => ({
          role: m.role,
          text: m.images?.length && i !== lastWithImages
            ? `[${m.images.length} photo(s) attached earlier] ${m.text}`
            : m.lookup ? `${m.text} ${m.lookup.note}` : m.text,
          ...(i === lastWithImages ? { images: m.images } : {}),
        })),
        draft: draft.map(stripComputed),
      })
      const { reply, draft: nextDraft, changes, lookup } = res.data as AgentReply
      const before = new Set(draft.map(e => e.id))
      setLastAddedIds(new Set(nextDraft.filter(e => e.id && !before.has(e.id)).map(e => e.id!)))
      setDraft(nextDraft)
      setMessages(prev => [...prev, { role: 'model', text: reply, changes, ...(lookup ? { lookup } : {}) }])
      return true
    } catch (e: unknown) {
      enqueueSnackbar(errorMessage(e, 'Something went wrong'), { variant: 'error' })
      setMessages(prev => prev.slice(0, -1))
      return false
    } finally {
      setThinking(false)
    }
  }, [messages, draft, thinking, enqueueSnackbar])

  const removeDraft = useCallback((id: string) => setDraft(d => d.filter(e => e.id !== id)), [])

  // Called by the review dialog with the (possibly edited) draft
  const commit = async (entries: AgentEntry[]) => {
    const res = await axios.post('/api/agent/commit', { entries: entries.map(stripComputed) })
    const results = res.data.results as SaveResult[]
    // Saved entries leave the draft; failed ones stay with the reason attached
    const failed = entries
      .map((e, i) => ({ e, r: results[i] }))
      .filter(x => !x.r?.ok)
      .map(({ e, r }) => ({ ...e, issues: [r?.error || 'Save failed'] }))
    const saved = results.length - failed.length

    setDraft(failed)
    setLastAddedIds(new Set())
    setMessages(prev => [...prev, {
      role: 'model', note: true,
      text: `Saved ${entriesLabel(saved)}.${failed.length ? ` ${failed.length} couldn't be saved and are still in the draft.` : ''}`,
    }])
    if (saved) window.dispatchEvent(new Event(DATA_CHANGED_EVENT))
    enqueueSnackbar(
      failed.length ? `Saved ${saved}, ${failed.length} failed` : `Saved ${entriesLabel(saved)}`,
      { variant: failed.length ? 'warning' : 'success' },
    )
  }

  const value: AgentContextValue = {
    loggedIn, messages, draft, lastAddedIds, thinking, drawerOpen, setDrawerOpen,
    send, removeDraft,
    openReview: () => { if (draft.length) setReviewOpen(true) },
    reset: () => { setMessages([]); setDraft([]); setLastAddedIds(new Set()) },
  }

  return (
    <AgentContext.Provider value={value}>
      {children}
      {reviewOpen && (
        <ReviewDialog
          entries={draft}
          onClose={() => setReviewOpen(false)}
          onConfirm={async entries => {
            try {
              await commit(entries)
              setReviewOpen(false)
            } catch (e: unknown) {
              enqueueSnackbar(errorMessage(e, 'Save failed'), { variant: 'error' })
            }
          }}
          onChange={entries => setDraft(entries)}
        />
      )}
    </AgentContext.Provider>
  )
}
