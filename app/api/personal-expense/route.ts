import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import PersonalExpense from '@/models/personalExpense'
import { ok, err } from '@/lib/apiHelper'

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
  const { category, description, amount, date, medium, transferMethod, comment } = await req.json()
  try {
    await connectDB()
    const entry = new PersonalExpense({
      category, description, amount, date, medium,
      transferMethod: medium === 'Transfer' ? transferMethod : undefined,
      comment,
    })
    await entry.save()
    return ok(entry, 201)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}
