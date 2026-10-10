import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import DailyLog from '@/models/dailyLog'
import { ok, err } from '@/lib/apiHelper'
import { createDailyLog, errorStatus } from '@/lib/services/entries'

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
  const body = await req.json()
  try {
    const result = await createDailyLog(body)
    return ok({ success: true, data: result }, 201)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error', errorStatus(e, 500))
  }
}
