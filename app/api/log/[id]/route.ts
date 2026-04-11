import { connectDB } from '@/lib/mongodb'
import DailyLog from '@/models/dailyLog'
import { ok, err } from '@/lib/apiHelper'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    await connectDB()
    const log = await DailyLog.findById(id)
    if (!log) return err('Log not found', 404)
    return ok({ success: true, data: log })
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    await connectDB()
    const log = await DailyLog.findById(id)
    if (!log) return err('Log not found', 404)
    await DailyLog.deleteOne({ _id: id })
    return ok({ success: true, message: 'Log deleted' })
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}
