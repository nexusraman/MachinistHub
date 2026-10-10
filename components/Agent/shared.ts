import type { AgentEntry, AgentReply, EntryKind } from '@/lib/agent'
import type { ChatImage } from './image'

export type { AgentEntry, EntryKind }
export type SaveResult = { ok: boolean; error?: string }
export type DraftChanges = { added: number; updated: number; removed: number }
export type Message = {
  role: 'user' | 'model'
  text: string
  images?: ChatImage[] // user messages only
  changes?: DraftChanges // what this reply did to the draft
  lookup?: AgentReply['lookup'] // past entries the user asked to see
  note?: boolean // app status line (e.g. "Saved 5 entries"), shown small
}

export const KIND_META: Record<EntryKind, { label: string; color: string }> = {
  submersible: { label: 'Submersible', color: '#1565c0' },
  fanRotor: { label: 'Fan rotor', color: '#6a1b9a' },
  expense: { label: 'Expense', color: '#c62828' },
  income: { label: 'Income', color: '#2e7d32' },
  personalExpense: { label: 'Personal', color: '#ef6c00' },
  dailyLog: { label: 'Daily log', color: '#455a64' },
}

export const EXAMPLES = [
  '20 submersible 4 inch for Akash',
  'Paid Mahesh 1500 labour UPI',
  'Received 15000 from Kaler cash',
  'Groceries 850, petrol 500, Deepu 2000 labour',
]

export const rupee = (n?: number) => (n === undefined ? '' : `₹${n.toLocaleString('en-IN')}`)
const pay = (e: AgentEntry) => (e.medium === 'Transfer' ? e.transferMethod || 'Transfer' : 'Cash')

export function describe(e: AgentEntry): { title: string; details: string[] } {
  switch (e.kind) {
    case 'submersible':
      return { title: `${e.client ?? '?'} · ${e.rotorSize ?? '?'}" × ${e.quantity ?? '?'}`, details: e.estimate ? [`≈ ${rupee(e.estimate)}`] : [] }
    case 'fanRotor':
      return {
        title: `${e.client ?? '?'} · ${e.rotorSize ?? '?'} × ${e.quantity ?? '?'}`,
        details: [e.rotorType === 'dispatched' ? 'Dispatched' : 'Received', e.shaftSize ?? '', e.rate ? `${rupee(e.rate)}/pc` : '', e.estimate ? `≈ ${rupee(e.estimate)}` : ''],
      }
    case 'expense':
      return { title: `${rupee(e.amount)} → ${e.payee ?? '?'}`, details: [e.reason ?? '', pay(e)] }
    case 'income':
      return { title: `${rupee(e.amount)} ← ${e.client ?? '?'}`, details: [e.isOneTime ? 'One-time' : 'Client', e.reason ?? '', pay(e)] }
    case 'personalExpense':
      return { title: `${rupee(e.amount)} · ${e.category ?? ''}`, details: [e.description ?? '', pay(e)] }
    case 'dailyLog':
      return { title: e.relatedTo ?? '?', details: [] }
    default:
      return { title: String((e as AgentEntry).kind), details: [] }
  }
}

// Server-computed fields that should not be echoed back to the model
export const stripComputed = (e: AgentEntry): AgentEntry => ({ ...e, estimate: undefined, issues: undefined, effects: undefined })

export const errorMessage = (e: unknown, fallback: string) => {
  const ax = e as { response?: { data?: { message?: string } }; message?: string }
  return ax?.response?.data?.message || ax?.message || fallback
}
