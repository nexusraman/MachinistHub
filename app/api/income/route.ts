import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Income from '@/models/income'
import { ok, err } from '@/lib/apiHelper'
import { createIncome, errorStatus } from '@/lib/services/entries'

export async function GET() {
  try {
    await connectDB()
    const incomes = await Income.find().sort({ date: -1 })
    return ok(incomes)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  try {
    const result = await createIncome(body)
    return ok(result, 201)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error', errorStatus(e, 500))
  }
}
