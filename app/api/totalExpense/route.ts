import { connectDB } from '@/lib/mongodb'
import Expense from '@/models/expense'
import { ok, err } from '@/lib/apiHelper'

export async function GET() {
  try {
    await connectDB()
    const result = await Expense.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }])
    return ok({ total: result[0]?.total || 0 })
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}
