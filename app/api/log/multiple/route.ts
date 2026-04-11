import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import DailyLog from '@/models/dailyLog'
import { ok, err } from '@/lib/apiHelper'

export async function POST(req: NextRequest) {
  const entries = await req.json()

  if (!Array.isArray(entries) || entries.length === 0) {
    return err('No entries provided', 400)
  }

  try {
    await connectDB()
    const docs = entries.map((e: { date: string; relatedTo: string; comment?: string }) => ({
      date: e.date, relatedTo: e.relatedTo, comment: e.comment,
    }))
    const created = await DailyLog.insertMany(docs)
    return ok({ success: true, count: created.length, data: created }, 201)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}
