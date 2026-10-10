import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import PersonalExpense from '@/models/personalExpense'
import { ok, err } from '@/lib/apiHelper'
import { createPersonalExpense, errorStatus } from '@/lib/services/entries'

export async function GET() {
  try {
    await connectDB()
    const entries = await PersonalExpense.find().sort({ date: -1 })
    return ok(entries)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  try {
    const result = await createPersonalExpense(body)
    return ok(result, 201)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error', errorStatus(e, 500))
  }
}
