import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Expense from '@/models/expense'
import { ok, err } from '@/lib/apiHelper'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  try {
    await connectDB()
    const updated = await Expense.findByIdAndUpdate(id, body, { new: true })
    if (!updated) return err('Expense not found', 404)
    return ok(updated)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}
