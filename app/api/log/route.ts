import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import DailyLog from '@/models/dailyLog'
import { ok, err } from '@/lib/apiHelper'

export async function GET() {
  try {
    await connectDB()
    const logs = await DailyLog.find().sort({ date: -1 })
    return ok({ success: true, count: logs.length, logs })
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}

export async function POST(req: NextRequest) {
  const { date, relatedTo, comment } = await req.json()

  try {
    await connectDB()
    const log = await DailyLog.create({ date, relatedTo, comment })
    return ok({ success: true, data: log }, 201)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}
