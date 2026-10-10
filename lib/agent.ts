import { ApiError, GoogleGenAI, ThinkingLevel } from '@google/genai'
import { connectDB } from '@/lib/mongodb'
import Clients from '@/models/clients'
import Employee from '@/models/employee'
import ShaftSize from '@/models/shaftSize'
import DailyLog from '@/models/dailyLog'
import FanRotorInventory from '@/models/fanRotorInventory'
import { getRate } from '@/utils/RateList'
import {
  EXPENSE_REASONS, INCOME_REASONS, PERSONAL_CATEGORIES, SUBMERSIBLE_SIZES as SUB_SIZE_OPTIONS, FAN_ROTOR_SIZES, normalizeSubmersibleSize,
} from '@/utils/entryOptions'
import {
  createSubmersible, createRotorMovement, createExpense, createIncome,
  createPersonalExpense, createDailyLog,
} from '@/lib/services/entries'
import { runLookup, lookupNote, LookupQuery, LookupResult } from '@/lib/lookup'

export const ENTRY_KINDS = ['submersible', 'fanRotor', 'expense', 'income', 'personalExpense', 'dailyLog'] as const
export type EntryKind = typeof ENTRY_KINDS[number]

export interface AgentEntry {
  id?: string // stable id while the entry sits in the chat draft
  kind: EntryKind
  date: string // YYYY-MM-DD
  client?: string
  rotorSize?: string
  quantity?: number
  rotorType?: 'received' | 'dispatched'
  shaftSize?: string
  rate?: number
  payee?: string
  reason?: string
  amount?: number
  medium?: 'Cash' | 'Transfer'
  transferMethod?: 'UPI' | 'Bank Transfer'
  isOneTime?: boolean
  category?: string
  description?: string
  relatedTo?: string
  comment?: string
  // Added by the server, never by the model
  estimate?: number
  issues?: string[]
  effects?: string[] // what saving this entry will change, shown in the review dialog
}

export const MAX_ENTRIES_PER_SAVE = 200

export interface ChatMessage {
  role: 'user' | 'model'
  text: string
  images?: { mimeType: string; data: string }[] // base64, user messages only
}

export const MAX_IMAGES_PER_MESSAGE = 4
export interface AgentReply {
  reply: string
  draft: AgentEntry[] // full draft after applying this turn's changes, validated
  changes: { added: number; updated: number; removed: number }
  lookup?: LookupResult & { note: string; query: LookupQuery } // results when the user asked to see past entries
}

const SUBMERSIBLE_SIZES = SUB_SIZE_OPTIONS.map(String)

// Tried in order; on a rate limit or unavailable model the next one is used.
// Lite models first: they have the largest free-tier daily quota.
const DEFAULT_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-2.5-flash']

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

// Ready-made ranges so the model never has to do calendar maths itself
function dateCheatSheet() {
  const t = today()
  const [y, m, d] = t.split('-').map(Number)
  const iso = (dt: Date) => dt.toISOString().slice(0, 10)
  const day = (yy: number, mm: number, dd: number) => iso(new Date(Date.UTC(yy, mm - 1, dd)))
  const lastOfMonth = (yy: number, mm: number) => day(yy, mm + 1, 0)
  const now = new Date(Date.UTC(y, m - 1, d))
  const weekday = now.getUTCDay() // 0 = Sunday
  const monday = new Date(now); monday.setUTCDate(d - ((weekday + 6) % 7))
  const prevMonday = new Date(monday); prevMonday.setUTCDate(monday.getUTCDate() - 7)
  const prevSunday = new Date(monday); prevSunday.setUTCDate(monday.getUTCDate() - 1)
  const yesterday = new Date(now); yesterday.setUTCDate(d - 1)
  const months = [1, 2, 3].map(k => {
    const dt = new Date(Date.UTC(y, m - 1 - k, 1))
    const yy = dt.getUTCFullYear(), mm = dt.getUTCMonth() + 1
    return `${k} month(s) back: ${iso(dt)} to ${lastOfMonth(yy, mm)}`
  })
  return [
    `today: ${t} (${now.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })})`,
    `yesterday: ${iso(yesterday)}`,
    `this week (Mon-today): ${iso(monday)} to ${t}`,
    `last week: ${iso(prevMonday)} to ${iso(prevSunday)}`,
    `this month: ${day(y, m, 1)} to ${t}`,
    ...months,
    `this year: ${y}-01-01 to ${t}`,
  ].join('\n')
}

// ---------- Context the model needs to resolve names ----------

interface Context {
  clients: {
    name: string; category?: string; rateCategory?: string; balance?: number; calculatedBalance?: number
    fanRates?: { shaftSize: string; rate: number }[]
  }[]
  employees: { name: string; category: string }[]
  shaftSizes: string[]
  logTopics: string[]
  fanStock: Record<string, number> // available fan rotors by size
}

async function loadContext(): Promise<Context> {
  await connectDB()
  const [clients, employees, shafts, logTopics, stock] = await Promise.all([
    Clients.find({ active: { $ne: false } }, { name: 1, category: 1, rateCategory: 1, fanRates: 1, balance: 1, calculatedBalance: 1 }).lean(),
    Employee.find({}, { name: 1, category: 1 }).lean(),
    ShaftSize.find({}, { name: 1 }).lean(),
    DailyLog.distinct('relatedTo'),
    // Same rule as createRotorMovement: records without a type count as received
    FanRotorInventory.aggregate([
      { $group: {
        _id: '$rotorSize',
        net: { $sum: { $cond: [{ $eq: ['$type', 'dispatched'] }, { $multiply: ['$quantity', -1] }, '$quantity'] } },
      } },
    ]),
  ])
  return {
    clients: clients as unknown as Context['clients'],
    employees: employees as unknown as Context['employees'],
    shaftSizes: (shafts as unknown as { name: string }[]).map(s => s.name),
    logTopics: logTopics as string[],
    fanStock: Object.fromEntries((stock as { _id: string; net: number }[]).map(s => [s._id, s.net])),
  }
}

// One compact line per draft entry so the model can refer to it by id
function draftLines(draft: AgentEntry[]) {
  return draft.map(e => {
    const fields = Object.entries(e)
      .filter(([k, v]) => !['id', 'estimate', 'issues', 'effects'].includes(k) && v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    return `${e.id}: ${fields.join(' ')}`
  }).join('\n')
}

function systemPrompt(ctx: Context, draft: AgentEntry[]) {
  const clientLines = ctx.clients.map(c => `- ${c.name} (${c.category || 'unknown'})`).join('\n')
  const employeeLines = ctx.employees.map(e => `- ${e.name} (${e.category})`).join('\n')

  return `You are the data-entry assistant for MachinistHub, a small rotor machining workshop in India.
The owner types short notes (English, Hindi or Hinglish) and you turn them into structured entries.
You NEVER save anything yourself. You propose entries; the user reviews and confirms them in the app.

Today's date is ${today()} (IST). Date reference:
${dateCheatSheet()}
Written dates like 23/9 or 5-8 are day/month (Indian format). A month without a year means the most recent one that isn't in the future.
DATES: every entry is for TODAY unless the user explicitly mentions a date or day for it ("yesterday", "kal", "on 5th", "last Monday").
Only then resolve it to YYYY-MM-DD and set dateMentioned=true (keep it true when re-sending that entry after a correction). Otherwise use today's date and set dateMentioned=false. Never guess a past date.

ENTRY KINDS
1. submersible — submersible rotors made for a client (only clients marked "submersible"). Fields: client, rotorSize, quantity.
   Valid sizes: ${SUBMERSIBLE_SIZES.join(', ')}. "4 inch" -> "4". "5 v4" -> "5v4".
   v-variants only exist below 8. From 8 up, ignore any "v4"/"v3": "8 v4" -> "8", "10v4" -> "10".
2. fanRotor — fan rotors received from or dispatched to a client (only clients marked "fan"). Fields: client, rotorSize, quantity,
   Valid fan rotor sizes (use the exact text): ${FAN_ROTOR_SIZES.join('  |  ')}. If the size doesn't clearly match one, ask.
   rotorType ("received" or "dispatched"). For dispatched also shaftSize (one of: ${ctx.shaftSizes.join(', ')}) and rate per piece if stated.
   "fan log", "fan rotor aaye/aya" = received; "bheje/dispatch/delivered" = dispatched.
3. expense — business expense paid to someone. Fields: payee, reason (one of: ${EXPENSE_REASONS.join(', ')}), amount, medium, transferMethod.
   Paying a labour employee is "Labour Cost"; paying a supplier for material is "Raw Material".
4. income — money received. Fields: client, amount, reason (one of: ${INCOME_REASONS.join(', ')}), medium, transferMethod, isOneTime.
   If the payer is a known client, use the exact client name and isOneTime=false (this reduces their balance).
   If the payer is NOT a client (e.g. scrap buyer, one-off customer), set isOneTime=true and put their name in client.
5. personalExpense — home/family spending, not business. Fields: category (one of: ${PERSONAL_CATEGORIES.join(', ')}), description, amount, medium, transferMethod.
6. dailyLog — any other note worth remembering (machine breakdown, attendance, reminders). Fields: relatedTo (short topic), comment (details).
   Existing topics, reuse when they fit: ${ctx.logTopics.slice(0, 50).join(', ') || 'none yet'}.

MONEY
- medium is "Cash" or "Transfer". UPI/GPay/PhonePe/Paytm => Transfer + "UPI". NEFT/RTGS/IMPS/bank => Transfer + "Bank Transfer". Default Cash.
- "2k" = 2000, "1.5L" / "1.5 lakh" = 150000.
- Any extra detail goes in comment.

PEOPLE
Clients (use these exact spellings; match nicknames/typos/Hindi spellings to the closest name):
${clientLines || '(none)'}
Employees and suppliers:
${employeeLines || '(none)'}

LOOKING THINGS UP
If the user asks to SEE or CHECK what was already logged ("what did I log yesterday", "show Tinku's entries this month",
"how much did I pay Mahesh in September", "Tinku balance", "diesel expenses since 1st") fill "query" and add NO entries.
- kinds: only the relevant types, or null for all. "payments to X" = expense; "payments from X" / "received" = income.
- from/to: YYYY-MM-DD in IST. "this month" = 1st of this month to today. "yesterday" = that one day. Null if not stated.
- person: exact client/employee name from the lists, or null. search: a keyword like "diesel", or null.
- The app shows the results as a table with totals, so reply with one short line like "Here's what was logged yesterday."
Otherwise set query to null.

PHOTOS
The user may attach photos: handwritten register/notebook pages, bills, receipts, UPI/bank screenshots, delivery challans.
- Read every row/line and turn each into an entry. A register page can easily have 20+ rows; return all of them.
- A date written on the page or receipt counts as mentioned (dateMentioned=true) for the rows it covers.
- A UPI/bank screenshot is a Transfer. Decide income vs expense from the direction (received vs paid).
- If a value is unreadable, leave that entry out and say which row in reply. Don't invent numbers.

EXAMPLES (today = ${today()})
"groceries 850 cash" -> {kind:"personalExpense", category:"Groceries", description:"Groceries", amount:850, medium:"Cash"}
"paid Mahesh 1500 labour UPI" -> {kind:"expense", payee:"Mahesh", reason:"Labour Cost", amount:1500, medium:"Transfer", transferMethod:"UPI"}
"got 15000 from <client> by NEFT" -> {kind:"income", client:"<client>", amount:15000, reason:"Submersible Payment" or "Fan Payment" by client type, medium:"Transfer", transferMethod:"Bank Transfer", isOneTime:false}
"<client> 20 pcs 4 inch" -> {kind:"submersible", client:"<client>", rotorSize:"4", quantity:20}
"lathe belt changed" -> {kind:"dailyLog", relatedTo:"Lathe", comment:"Belt changed"}
Numbers in the message are amounts or quantities — always copy them into the entry.

RULES
- One message can contain any number of entries (even dozens, e.g. a pasted list or a whole day's work); return every one of them.
- Every entry needs a date. Fill client whenever the entry relates to a client or person.
- If something essential is missing or ambiguous (unknown client for a submersible, two possible clients, missing amount or quantity),
  do not guess: return no entry for that item and ask a short question in reply.
- The app keeps a DRAFT of unsaved entries (below). Never repeat draft items in "entries".
  - New things to log -> "entries" (they are appended to the draft).
  - Changing a draft item -> "updates": one {id, field, value} per changed field, value as text (e.g. {id:"e3", field:"amount", value:"1500"}).
  - Deleting a draft item -> "removeIds".
  - "change the last one" / "that" means the most recent draft item(s).
- If the message is just chat or a question, answer briefly in reply with no entries.
- reply is one or two short sentences. Do not repeat every field; the app shows them as cards.

CURRENT DRAFT (${draft.length} unsaved):
${draft.length ? draftLines(draft) : '(empty)'}`
}

// ---------- Gemini response schema ----------

// Gemini fills properties in this order, so the important fields come first
const ENTRY_PROPERTIES = {
  kind: { type: 'string', enum: [...ENTRY_KINDS] },
  date: { type: 'string', description: 'YYYY-MM-DD' },
  dateMentioned: { type: 'boolean', description: 'true only if the user explicitly gave a date or day for this entry' },
  amount: { anyOf: [{ type: 'number' }, { type: 'null' }], description: 'Rupees for expense/income/personalExpense, else null' },
  quantity: { anyOf: [{ type: 'number' }, { type: 'null' }], description: 'Pieces for submersible/fanRotor, else null' },
  client: { type: 'string', description: 'Client, or payer for one-time income' },
  payee: { type: 'string', description: 'Who was paid (expense)' },
  reason: { type: 'string' },
  category: { type: 'string' },
  description: { type: 'string', description: 'Few words, personalExpense only' },
  rotorSize: { type: 'string' },
  rotorType: { type: 'string', enum: ['received', 'dispatched'] },
  shaftSize: { type: 'string' },
  rate: { anyOf: [{ type: 'number' }, { type: 'null' }], description: 'Rupees per piece for a fanRotor dispatch, else null' },
  medium: { type: 'string', enum: ['Cash', 'Transfer'] },
  transferMethod: { type: 'string', enum: ['UPI', 'Bank Transfer'] },
  isOneTime: { type: 'boolean' },
  relatedTo: { type: 'string' },
  comment: { type: 'string', description: 'Optional extra detail from the user, under 12 words. Omit if none. Never explain your reasoning here.' },
}

const UPDATABLE_FIELDS = Object.keys(ENTRY_PROPERTIES).filter(k => k !== 'dateMentioned')

// Every field is required but may be null: lite models silently skip optional fields,
// so forcing an explicit value (or null) keeps them from dropping clients, sizes and amounts.
// The server strips the nulls afterwards.
const ALWAYS_SET = ['kind', 'date', 'dateMentioned']
const ENTRY_ITEM_PROPERTIES = Object.fromEntries(Object.entries(ENTRY_PROPERTIES).map(([k, spec]) => {
  if (ALWAYS_SET.includes(k) || 'anyOf' in spec) return [k, spec]
  const { description, ...type } = spec as { description?: string }
  return [k, { anyOf: [type, { type: 'null' }], ...(description ? { description } : {}) }]
}))

const responseSchema = {
  type: 'object',
  properties: {
    updates: {
      type: 'array',
      description: 'Field changes to existing draft entries',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          field: { type: 'string', enum: UPDATABLE_FIELDS },
          value: { type: 'string' },
        },
        required: ['id', 'field', 'value'],
      },
    },
    removeIds: { type: 'array', items: { type: 'string' }, description: 'Draft entry ids to delete' },
    query: {
      anyOf: [{
        type: 'object',
        properties: {
          kinds: { anyOf: [{ type: 'array', items: { type: 'string', enum: [...ENTRY_KINDS] } }, { type: 'null' }] },
          from: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'YYYY-MM-DD' },
          to: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'YYYY-MM-DD' },
          person: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          search: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          limit: { anyOf: [{ type: 'number' }, { type: 'null' }] },
        },
        propertyOrdering: ['kinds', 'from', 'to', 'person', 'search', 'limit'],
        required: ['kinds', 'from', 'to', 'person', 'search', 'limit'],
      }, { type: 'null' }],
      description: 'Search of saved entries when the user asks to see past data, else null',
    },
    entries: {
      type: 'array',
      items: {
        type: 'object',
        properties: ENTRY_ITEM_PROPERTIES,
        propertyOrdering: Object.keys(ENTRY_PROPERTIES),
        required: Object.keys(ENTRY_PROPERTIES),
      },
    },
    reply: { type: 'string', description: 'One or two short sentences' },
  },
  propertyOrdering: ['query', 'updates', 'removeIds', 'entries', 'reply'],
  required: ['query', 'updates', 'removeIds', 'entries', 'reply'],
}

// Photos are sent only with the latest message that has them; earlier ones are already
// summarised by the entries the model extracted from them.
function toContents(history: ChatMessage[]) {
  let lastWithImages = -1
  history.forEach((m, i) => { if (m.images?.length) lastWithImages = i })
  return history.map((m, i) => {
    const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = []
    if (i === lastWithImages) m.images!.forEach(img => parts.push({ inlineData: img }))
    else if (m.images?.length) parts.push({ text: `[${m.images.length} photo(s) attached earlier]` })
    parts.push({ text: m.text || 'Log everything in this photo.' })
    return { role: m.role, parts }
  })
}

const NUMBER_FIELDS = ['amount', 'quantity', 'rate']

// Apply one {field, value} change from the model, converting text to the right type
function applyUpdate(e: AgentEntry, field: string, value: string): AgentEntry {
  if (!UPDATABLE_FIELDS.includes(field)) return e
  let v: unknown = value
  if (NUMBER_FIELDS.includes(field)) {
    const n = Number(String(value).replace(/[₹,\s]/g, ''))
    if (!Number.isFinite(n)) return e
    v = n
  } else if (field === 'isOneTime') v = /^(true|yes|1)$/i.test(value)
  else if (field === 'kind' && !ENTRY_KINDS.includes(value as EntryKind)) return e
  return { ...e, [field]: v }
}

export async function runAgent(history: ChatMessage[], draftIn: AgentEntry[] = []): Promise<AgentReply> {
  // Make sure every draft entry has a unique id the model can refer to
  let nextId = 1 + Math.max(0, ...draftIn.map(e => Number(/^e(\d+)$/.exec(e.id ?? '')?.[1] ?? 0)))
  const seen = new Set<string>()
  const draft: AgentEntry[] = draftIn.map(e => {
    const id = e.id && !seen.has(e.id) ? e.id : `e${nextId++}`
    seen.add(id)
    return { ...e, id }
  })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set in .env.local')

  const ctx = await loadContext()
  const ai = new GoogleGenAI({ apiKey })
  const models = process.env.GEMINI_MODEL
    ? process.env.GEMINI_MODEL.split(',').map(m => m.trim()).filter(Boolean)
    : DEFAULT_MODELS
  const request = {
    contents: toContents(history.slice(-20)),
    config: {
      systemInstruction: systemPrompt(ctx, draft),
      responseMimeType: 'application/json',
      responseJsonSchema: responseSchema,
      temperature: 0.2,
    },
  }

  let res
  let lastError: unknown
  for (const model of models) {
    try {
      // A little thinking makes multi-item messages and photos far more reliable.
      // 2.x models take a token budget; 3.x+ take a level.
      const thinkingConfig = model.startsWith('gemini-2') ? { thinkingBudget: 1024 } : { thinkingLevel: ThinkingLevel.LOW }
      res = await ai.models.generateContent({ model, ...request, config: { ...request.config, thinkingConfig } })
      break
    } catch (e) {
      lastError = e
      // 429 = quota used up, 404 = model not available on this key, 5xx = overloaded
      const retryable = e instanceof ApiError && (e.status === 429 || e.status === 404 || e.status >= 500)
      if (!retryable) throw e
      console.warn(`[agent] ${model} failed (${(e as ApiError).status}), trying next model`)
    }
  }
  if (!res) {
    if (lastError instanceof ApiError && lastError.status === 429) {
      throw new Error('AI daily limit reached on all models. Try again later or use the forms.')
    }
    throw lastError instanceof Error ? lastError : new Error('AI is unavailable right now')
  }

  let parsed: {
    reply?: string; entries?: AgentEntry[]; updates?: { id: string; field: string; value: string }[]; removeIds?: string[]
    query?: LookupQuery | null
  }
  try {
    parsed = JSON.parse(res.text ?? '')
  } catch {
    return { reply: "Sorry, I couldn't understand that. Could you rephrase?", draft: validateBatch(draft, ctx), changes: { added: 0, updated: 0, removed: 0 } }
  }

  const removeIds = new Set((parsed.removeIds || []).filter(id => seen.has(id)))
  const updatedIds = new Set<string>()
  let merged = draft.filter(e => !removeIds.has(e.id!))
  for (const u of parsed.updates || []) {
    merged = merged.map(e => {
      if (e.id !== u.id) return e
      const next = applyUpdate(e, u.field, u.value)
      if (next !== e) updatedIds.add(e.id!)
      return next
    })
  }

  // Log for today unless the user actually named a date
  const added = (parsed.entries || []).map(raw => {
    // Drop nulls the schema forces on irrelevant fields
    const cleaned = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== null))
    const { dateMentioned, ...e } = cleaned as AgentEntry & { dateMentioned?: boolean }
    return { ...(dateMentioned ? e : { ...e, date: today() }), id: `e${nextId++}` }
  })

  let lookup: AgentReply['lookup']
  if (parsed.query) {
    const r = await runLookup(parsed.query)
    lookup = { ...r, query: parsed.query, note: lookupNote(parsed.query, r) }
  }

  return {
    reply: parsed.reply || '',
    draft: validateBatch([...merged, ...added], ctx),
    changes: { added: added.length, updated: updatedIds.size, removed: removeIds.size },
    ...(lookup ? { lookup } : {}),
  }
}

// ---------- Validation (runs on propose and again on commit) ----------

function findClient(ctx: Context, name?: string) {
  if (!name) return undefined
  const n = name.trim().toLowerCase()
  return ctx.clients.find(c => c.name.toLowerCase() === n)
}

const isPositive = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n > 0

// Running totals while walking a batch, so the 3rd entry sees the effect of the first two
interface BatchState {
  balances: Map<string, number>
  stock: Record<string, number>
  employees: Set<string>
  topics: Set<string>
}

const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

function currentBalance(c: Context['clients'][number]) {
  // Mirrors createIncome: an unset/zero calculatedBalance falls back to the opening balance
  return c.calculatedBalance === 0 || c.calculatedBalance === undefined ? (c.balance ?? 0) : c.calculatedBalance
}

function validateEntry(raw: AgentEntry, ctx: Context, state: BatchState): AgentEntry {
  const e: AgentEntry = { ...raw, issues: [], effects: [] }
  const issues = e.issues!
  const effects = e.effects!
  delete e.estimate

  if (!ENTRY_KINDS.includes(e.kind)) {
    return { ...e, issues: [`Unknown entry type "${e.kind}"`] }
  }
  if (!e.date || !/^\d{4}-\d{2}-\d{2}$/.test(e.date) || isNaN(Date.parse(e.date))) e.date = today()

  if (['expense', 'income', 'personalExpense'].includes(e.kind)) {
    if (!isPositive(e.amount)) issues.push('Amount is missing')
    if (e.medium !== 'Transfer') { e.medium = 'Cash'; delete e.transferMethod }
    else if (!e.transferMethod) e.transferMethod = 'UPI'
  }

  switch (e.kind) {
    case 'submersible': {
      const client = findClient(ctx, e.client)
      if (!client) issues.push(e.client ? `Client "${e.client}" not found` : 'Client is missing')
      else e.client = client.name
      if (client?.category === 'fan') issues.push(`${client.name} is a fan client`)
      e.rotorSize = normalizeSubmersibleSize(e.rotorSize)
      if (!e.rotorSize || !SUBMERSIBLE_SIZES.includes(e.rotorSize)) issues.push(`Unknown rotor size "${e.rotorSize ?? ''}"`)
      if (!isPositive(e.quantity) || !Number.isInteger(e.quantity)) issues.push('Quantity is missing')
      if (client && e.rotorSize && e.quantity) {
        e.estimate = e.quantity * getRate(client.name, e.rotorSize, client.rateCategory)
        if (!e.estimate) effects.push(`No rate set for size ${e.rotorSize} — balance won't change`)
      }
      if (client && !issues.length && e.estimate) {
        const before = state.balances.get(client.name) ?? currentBalance(client)
        state.balances.set(client.name, before + e.estimate)
        effects.push(`${client.name} balance ${rupees(before)} → ${rupees(before + e.estimate)} (+${rupees(e.estimate)})`)
      }
      break
    }
    case 'fanRotor': {
      const client = findClient(ctx, e.client)
      if (!client) issues.push(e.client ? `Client "${e.client}" not found` : 'Client is missing')
      else e.client = client.name
      if (client?.category === 'submersible') issues.push(`${client.name} is a submersible client`)
      if (!e.rotorSize || !FAN_ROTOR_SIZES.includes(e.rotorSize)) issues.push(`Unknown fan rotor size "${e.rotorSize ?? ''}"`)
      if (!isPositive(e.quantity) || !Number.isInteger(e.quantity)) issues.push('Quantity is missing')
      e.rotorType = e.rotorType === 'dispatched' ? 'dispatched' : 'received'
      if (e.rotorType === 'dispatched') {
        if (!e.shaftSize) issues.push('Shaft size is missing')
        if (!isPositive(e.rate) && client && e.shaftSize) {
          const saved = client.fanRates?.find(r => r.shaftSize === e.shaftSize)
          if (saved) e.rate = saved.rate
        }
        if (!isPositive(e.rate)) issues.push('Rate is missing')
        if (isPositive(e.rate) && e.quantity) e.estimate = e.rate! * e.quantity
      } else {
        delete e.shaftSize
        delete e.rate
      }
      if (e.rotorSize && isPositive(e.quantity)) {
        const before = state.stock[e.rotorSize] ?? 0
        const after = e.rotorType === 'dispatched' ? before - e.quantity! : before + e.quantity!
        if (after < 0) issues.push(`Only ${before} of ${e.rotorSize} in stock`)
        else if (!issues.length) {
          state.stock[e.rotorSize] = after
          effects.push(`Stock of ${e.rotorSize}: ${before} → ${after}`)
        }
      }
      break
    }
    case 'expense':
      if (!e.payee?.trim()) issues.push('Payee is missing')
      if (!e.reason || !EXPENSE_REASONS.includes(e.reason)) e.reason = 'Misc'
      if (e.reason === 'Labour Cost' && e.payee?.trim() && !state.employees.has(e.payee.trim().toLowerCase())) {
        state.employees.add(e.payee.trim().toLowerCase())
        effects.push(`Adds "${e.payee.trim()}" to the labour list`)
      }
      break
    case 'income': {
      if (!e.reason || !INCOME_REASONS.includes(e.reason)) e.reason = 'Misc'
      const client = findClient(ctx, e.client)
      if (client) {
        e.client = client.name
        e.isOneTime = false
        if (isPositive(e.amount)) {
          const before = state.balances.get(client.name) ?? currentBalance(client)
          state.balances.set(client.name, before - e.amount!)
          effects.push(`${client.name} balance ${rupees(before)} → ${rupees(before - e.amount!)} (−${rupees(e.amount!)})`)
        }
      } else if (e.isOneTime) {
        e.client = e.client?.trim() || 'One-Time'
        effects.push('One-time income — no client balance change')
      } else {
        issues.push(e.client ? `Client "${e.client}" not found` : 'Who paid?')
      }
      break
    }
    case 'personalExpense':
      if (!e.category || !PERSONAL_CATEGORIES.includes(e.category)) e.category = 'Misc'
      break
    case 'dailyLog':
      if (!e.relatedTo?.trim()) issues.push('Topic is missing')
      else if (!state.topics.has(e.relatedTo.trim().toLowerCase())) {
        state.topics.add(e.relatedTo.trim().toLowerCase())
        effects.push(`New log topic "${e.relatedTo.trim()}"`)
      }
      break
  }

  if (!issues.length) delete e.issues
  if (!effects.length) delete e.effects
  return e
}

function validateBatch(entries: AgentEntry[], ctx: Context) {
  const state: BatchState = {
    balances: new Map(),
    stock: { ...ctx.fanStock },
    employees: new Set(ctx.employees.map(e => e.name.toLowerCase())),
    topics: new Set(ctx.logTopics.map(t => t.toLowerCase())),
  }
  return entries.map(e => validateEntry(e, ctx, state))
}

export async function validateEntries(entries: AgentEntry[]) {
  return validateBatch(entries, await loadContext())
}

// ---------- Saving ----------

export async function saveEntry(e: AgentEntry) {
  const date = new Date(e.date)
  const money = { amount: e.amount!, date, medium: e.medium, transferMethod: e.transferMethod, comment: e.comment || '' }

  switch (e.kind) {
    case 'submersible':
      return createSubmersible({ client: e.client!, rotorSize: e.rotorSize!, quantity: e.quantity!, date })
    case 'fanRotor':
      return createRotorMovement({
        client: e.client!, rotorSize: e.rotorSize!, quantity: e.quantity!, type: e.rotorType,
        shaftSize: e.shaftSize || '', rate: e.rate || 0, date,
      })
    case 'expense':
      if (e.reason === 'Labour Cost') {
        // Same as the expense form: remember new labour names for autocomplete
        const name = e.payee!.trim()
        await Employee.updateOne(
          { name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
          { $setOnInsert: { name, category: 'labour' } },
          { upsert: true },
        )
      }
      return createExpense({ ...money, payee: e.payee!, reason: e.reason })
    case 'income':
      return createIncome({ ...money, client: e.client, isOneTime: e.isOneTime, reason: e.reason })
    case 'personalExpense':
      return createPersonalExpense({ ...money, category: e.category, description: e.description || '' })
    case 'dailyLog':
      return createDailyLog({ date, relatedTo: e.relatedTo!, comment: e.comment || '' })
  }
}
