import type { Model } from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import Submersible from '@/models/Submersible'
import FanRotorInventory from '@/models/fanRotorInventory'
import Expense from '@/models/expense'
import Income from '@/models/income'
import PersonalExpense from '@/models/personalExpense'
import DailyLog from '@/models/dailyLog'
import Clients from '@/models/clients'
import type { AgentEntry, EntryKind } from '@/lib/agent'

// Read-only search over everything the agent can log, so the chat can answer
// "what did I log yesterday?" or "Mahesh payments this month".

export interface LookupQuery {
  kinds?: EntryKind[] | null
  from?: string | null // YYYY-MM-DD (IST)
  to?: string | null
  person?: string | null // client or payee
  search?: string | null // free text in reason/comment/description/topic
  limit?: number | null
}

export interface LookupResult {
  entries: AgentEntry[] // newest first, at most `limit`
  total: number // all matches, before the limit
  range: { from?: string; to?: string }
  summary: {
    counts: Partial<Record<EntryKind, number>>
    income: number
    expense: number
    personal: number
    submersibleQty: number
    fanReceived: number
    fanDispatched: number
  }
  client?: { name: string; balance: number }
}

const ALL_KINDS: EntryKind[] = ['submersible', 'fanRotor', 'expense', 'income', 'personalExpense', 'dailyLog']
const MAX_PER_COLLECTION = 2000
const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const istDay = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
const validDay = (s?: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) ? s : undefined)

type Doc = Record<string, unknown> & { _id: unknown; date?: Date }

export async function runLookup(q: LookupQuery): Promise<LookupResult> {
  await connectDB()
  const kinds = q.kinds?.length ? q.kinds.filter(k => ALL_KINDS.includes(k)) : ALL_KINDS
  const limit = Math.min(Math.max(q.limit || DEFAULT_LIMIT, 1), MAX_LIMIT)
  const person = q.person?.trim()
  const search = q.search?.trim()

  let from = validDay(q.from)
  const to = validDay(q.to)
  // Nothing to narrow by at all: default to the last 7 days
  if (!from && !to && !person && !search) {
    const d = new Date(Date.now() - 6 * 86400000)
    from = istDay(d)
  }
  const date: Record<string, Date> = {}
  if (from) date.$gte = new Date(`${from}T00:00:00+05:30`)
  if (to) date.$lte = new Date(`${to}T23:59:59.999+05:30`)
  const dateFilter = Object.keys(date).length ? { date } : {}

  const personRe = person ? new RegExp(escapeRegex(person), 'i') : undefined
  const searchRe = search ? new RegExp(escapeRegex(search), 'i') : undefined
  const textFilter = (fields: string[]) => (searchRe ? { $or: fields.map(f => ({ [f]: searchRe })) } : {})

  const find = async (kind: EntryKind, filter: Record<string, unknown>, map: (d: Doc) => AgentEntry) => {
    if (!kinds.includes(kind)) return []
    const model = ({
      submersible: Submersible, fanRotor: FanRotorInventory, expense: Expense,
      income: Income, personalExpense: PersonalExpense, dailyLog: DailyLog,
    } as unknown as Record<EntryKind, Model<Doc>>)[kind]
    const docs = await model.find({ ...dateFilter, ...filter }).sort({ date: -1 }).limit(MAX_PER_COLLECTION).lean() as Doc[]
    return docs.map(d => ({ ...map(d), id: `db:${kind}:${String(d._id)}`, date: d.date ? istDay(new Date(d.date)) : '' }))
  }
  const str = (v: unknown) => (v === undefined || v === null || v === '' ? undefined : String(v))
  const num = (v: unknown) => (typeof v === 'number' ? v : v === undefined || v === null || v === '' ? undefined : Number(v))
  const money = (d: Doc) => ({
    amount: num(d.amount), medium: str(d.medium) as AgentEntry['medium'],
    transferMethod: str(d.transferMethod) as AgentEntry['transferMethod'], comment: str(d.comment),
  })

  const groups = await Promise.all([
    find('submersible', personRe ? { client: personRe } : {}, d => ({
      kind: 'submersible', date: '', client: str(d.client), rotorSize: str(d.rotorSize), quantity: num(d.quantity),
    })),
    find('fanRotor', { ...(personRe ? { client: personRe } : {}), ...textFilter(['shaftSize']) }, d => ({
      kind: 'fanRotor', date: '', client: str(d.client), rotorSize: str(d.rotorSize), quantity: num(d.quantity),
      rotorType: d.type === 'dispatched' ? 'dispatched' : 'received', shaftSize: str(d.shaftSize), rate: num(d.rate) || undefined,
    })),
    find('expense', { ...(personRe ? { payee: personRe } : {}), ...textFilter(['reason', 'comment', 'payee']) }, d => ({
      kind: 'expense', date: '', payee: str(d.payee), reason: str(d.reason), ...money(d),
    })),
    find('income', { ...(personRe ? { client: personRe } : {}), ...textFilter(['reason', 'comment', 'client']) }, d => ({
      kind: 'income', date: '', client: str(d.client), reason: str(d.reason), isOneTime: d.client === 'One-Time', ...money(d),
    })),
    // Personal spending and logs have no person; skip them when filtering by one
    personRe ? Promise.resolve([]) : find('personalExpense', textFilter(['category', 'description', 'comment']), d => ({
      kind: 'personalExpense', date: '', category: str(d.category), description: str(d.description), ...money(d),
    })),
    personRe ? Promise.resolve([]) : find('dailyLog', textFilter(['relatedTo', 'comment']), d => ({
      kind: 'dailyLog', date: '', relatedTo: str(d.relatedTo), comment: str(d.comment),
    })),
  ])

  const all = groups.flat().sort((a, b) => b.date.localeCompare(a.date))
  const sum = (k: EntryKind) => all.filter(e => e.kind === k).reduce((s, e) => s + (e.amount ?? 0), 0)
  const fanQty = (t: string) => all.filter(e => e.kind === 'fanRotor' && e.rotorType === t).reduce((s, e) => s + (e.quantity ?? 0), 0)

  const result: LookupResult = {
    entries: all.slice(0, limit),
    total: all.length,
    range: { from, to },
    summary: {
      counts: all.reduce<Partial<Record<EntryKind, number>>>((acc, e) => ({ ...acc, [e.kind]: (acc[e.kind] ?? 0) + 1 }), {}),
      income: sum('income'),
      expense: sum('expense'),
      personal: sum('personalExpense'),
      submersibleQty: all.filter(e => e.kind === 'submersible').reduce((s, e) => s + (e.quantity ?? 0), 0),
      fanReceived: fanQty('received'),
      fanDispatched: fanQty('dispatched'),
    },
  }

  // Asking about a client: include their current balance
  if (person) {
    const c = await Clients.findOne({ name: new RegExp(`^${escapeRegex(person)}$`, 'i') }, { name: 1, balance: 1, calculatedBalance: 1 }).lean() as
      { name: string; balance?: number; calculatedBalance?: number } | null
    if (c) {
      const balance = c.calculatedBalance === 0 || c.calculatedBalance === undefined ? (c.balance ?? 0) : c.calculatedBalance
      result.client = { name: c.name, balance }
    }
  }
  return result
}

// Short text the model sees on later turns, so follow-ups like "and last month?" make sense
export function lookupNote(q: LookupQuery, r: LookupResult) {
  const parts = [`${r.total} record(s)`]
  if (r.range.from || r.range.to) parts.push(`from ${r.range.from ?? 'start'} to ${r.range.to ?? 'today'}`)
  if (q.person) parts.push(`person "${q.person}"`)
  if (q.search) parts.push(`matching "${q.search}"`)
  if (q.kinds?.length) parts.push(`types ${q.kinds.join(',')}`)
  if (r.summary.income) parts.push(`income ₹${r.summary.income}`)
  if (r.summary.expense) parts.push(`expense ₹${r.summary.expense}`)
  if (r.client) parts.push(`${r.client.name} balance ₹${r.client.balance}`)
  return `[Showed lookup: ${parts.join(', ')}]`
}
