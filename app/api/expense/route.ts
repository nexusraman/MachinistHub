import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Expense from '@/models/expense'
import { ok, err } from '@/lib/apiHelper'
import { createExpense, errorStatus } from '@/lib/services/entries'

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
  const body = await req.json()
  try {
    const result = await createExpense(body)
    return ok(result, 201)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error', errorStatus(e, 500))
  }
}
