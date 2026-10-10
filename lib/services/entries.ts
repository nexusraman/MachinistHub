import { nanoid } from 'nanoid'
import { connectDB } from '@/lib/mongodb'
import Submersible from '@/models/Submersible'
import Fan from '@/models/fan'
import FanRotorInventory from '@/models/fanRotorInventory'
import Expense from '@/models/expense'
import Income from '@/models/income'
import PersonalExpense from '@/models/personalExpense'
import DailyLog from '@/models/dailyLog'
import Clients from '@/models/clients'
import { getRate } from '@/utils/RateList'

// Shared write logic used by both the form API routes and the AI agent,
// so side effects (client balances, inventory checks) stay in one place.

export class ServiceError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

type Medium = 'Cash' | 'Transfer'
type TransferMethod = 'UPI' | 'Bank Transfer'

export interface SubmersibleInput { client: string; rotorSize: string; quantity: number | string; date?: string | Date }
export interface FanInput { client: string; rotorSize: string; shaftSize?: string; quantity: number; date?: string | Date }
export interface RotorInput {
  client: string; rotorSize: string; quantity: number; type?: 'received' | 'dispatched'
  shaftSize?: string; rate?: number; date?: string | Date
}
export interface ExpenseInput {
  payee: string; reason?: string; amount: number; date?: string | Date
  medium?: Medium; transferMethod?: TransferMethod; comment?: string
}
export interface IncomeInput {
  client?: string; isOneTime?: boolean; reason?: string; amount: number; date?: string | Date
  medium?: Medium; transferMethod?: TransferMethod; comment?: string
  linkedExpense?: { payee: string; reason?: string; amount: number; medium?: Medium; transferMethod?: TransferMethod; comment?: string }
}
export interface PersonalExpenseInput {
  category?: string; description?: string; amount: number; date?: string | Date
  medium?: Medium; transferMethod?: TransferMethod; comment?: string
}
export interface DailyLogInput { date: string | Date; relatedTo: string; comment?: string }

export async function createSubmersible(body: SubmersibleInput) {
  await connectDB()
  const client = await Clients.findOne({ name: body.client })
  if (!client) throw new ServiceError(`Client "${body.client}" not found`, 404)

  const subId = nanoid()
  const newSub = new Submersible({ ...body, subId })
  const rate = getRate(body.client, body.rotorSize, client.rateCategory)
  const entryAmount = parseInt(String(body.quantity)) * rate

  const entry = { subId, date: body.date, size: body.rotorSize, quantity: body.quantity }
  await Clients.findOneAndUpdate(
    { _id: client._id },
    { $push: { entries: entry }, $inc: { calculatedBalance: entryAmount } }
  )
  await newSub.save()
  return newSub
}

export async function createFan(body: FanInput) {
  await connectDB()
  const newFan = new Fan(body)
  await newFan.save()
  return newFan
}

export async function createRotorMovement(body: RotorInput) {
  const { rotorSize, quantity, type = 'received' } = body
  await connectDB()

  if (type === 'dispatched') {
    // Records without a type field (old data) are treated as 'received'
    const all = await FanRotorInventory.find({ rotorSize })
    const received = all.filter(r => !r.type || r.type === 'received').reduce((s: number, r) => s + (r.quantity ?? 0), 0)
    const dispatched = all.filter(r => r.type === 'dispatched').reduce((s: number, r) => s + (r.quantity ?? 0), 0)
    const available = received - dispatched
    if (quantity > available) {
      throw new ServiceError(`Only ${available} unit(s) of ${rotorSize} in inventory`, 400)
    }
  }

  const newRotor = new FanRotorInventory(body)
  await newRotor.save()
  return newRotor
}

export async function createExpense({ payee, reason, amount, date, medium, transferMethod, comment }: ExpenseInput) {
  await connectDB()
  const newExpense = new Expense({
    payee, reason, amount, date, medium,
    transferMethod: medium === 'Transfer' ? transferMethod : undefined,
    comment,
  })
  await newExpense.save()
  return newExpense
}

export async function createIncome({ client: clientName, isOneTime, reason, amount, date, medium, transferMethod, comment, linkedExpense }: IncomeInput) {
  const paymentId = nanoid()
  await connectDB()

  // Validate the client before writing anything
  const client = isOneTime ? null : await Clients.findOne({ name: clientName })
  if (!isOneTime && !client) throw new ServiceError('Client not found', 404)

  let linkedExpenseId: string | null = null

  if (linkedExpense) {
    const newExpense = new Expense({
      payee: linkedExpense.payee,
      reason: linkedExpense.reason,
      amount: linkedExpense.amount,
      date,
      medium: linkedExpense.medium,
      transferMethod: linkedExpense.medium === 'Transfer' ? linkedExpense.transferMethod : undefined,
      comment: linkedExpense.comment || '',
      linkedIncomeId: paymentId,
    })
    await newExpense.save()
    linkedExpenseId = newExpense._id.toString()
  }

  const newIncome = new Income({
    paymentId, client: clientName || 'One-Time', reason, amount, date, medium,
    transferMethod: medium === 'Transfer' ? transferMethod : undefined,
    comment,
    linkedExpenseId,
  })

  // One-time income: skip client balance update
  if (client) {
    if (client.calculatedBalance === 0 || client.calculatedBalance === undefined) {
      client.calculatedBalance = client.balance
    }
    client.calculatedBalance -= amount
    client.payments.push({
      date, amount, paymentId, medium,
      transferMethod: medium === 'Transfer' ? transferMethod : undefined,
      comment: comment || '',
    })
    await client.save({ validateModifiedOnly: true })
  }

  await newIncome.save()
  return newIncome
}

export async function createPersonalExpense({ category, description, amount, date, medium, transferMethod, comment }: PersonalExpenseInput) {
  await connectDB()
  const entry = new PersonalExpense({
    category, description, amount, date, medium,
    transferMethod: medium === 'Transfer' ? transferMethod : undefined,
    comment,
  })
  await entry.save()
  return entry
}

export async function createDailyLog({ date, relatedTo, comment }: DailyLogInput) {
  await connectDB()
  return DailyLog.create({ date, relatedTo, comment })
}

export function errorStatus(e: unknown, fallback: number) {
  return e instanceof ServiceError ? e.status : fallback
}
