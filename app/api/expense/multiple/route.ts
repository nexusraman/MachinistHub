import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Expense from '@/models/expense'
import { ok, err } from '@/lib/apiHelper'

export async function POST(req: NextRequest) {
  const expenses = await req.json()

  try {
    await connectDB()
    const saved = await Expense.insertMany(
      expenses.map((exp: Record<string, unknown>) => ({
        payee: exp.payee, reason: exp.reason, amount: exp.amount,
        date: exp.date, medium: exp.medium,
        transferMethod: exp.medium === 'Transfer' ? exp.transferMethod : undefined,
        comment: exp.comment,
      }))
    )
    return ok(saved, 201)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}
