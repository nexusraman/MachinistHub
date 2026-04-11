import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Expense from '@/models/expense'
import { ok, err } from '@/lib/apiHelper'

export async function GET() {
  try {
    await connectDB()
    const expenses = await Expense.find().sort({ date: -1 })
    return ok(expenses)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}

export async function POST(req: NextRequest) {
  const { payee, reason, amount, date, medium, transferMethod, comment } = await req.json()

  try {
    await connectDB()
    const newExpense = new Expense({
      payee, reason, amount, date, medium,
      transferMethod: medium === 'Transfer' ? transferMethod : undefined,
      comment,
    })
    await newExpense.save()
    return ok(newExpense, 201)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}
