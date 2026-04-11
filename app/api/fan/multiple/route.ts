import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Fan from '@/models/fan'
import { ok, err } from '@/lib/apiHelper'

export async function POST(req: NextRequest) {
  const fans = await req.json()

  if (!Array.isArray(fans) || fans.length === 0) {
    return err('No fan entries provided', 400)
  }

  try {
    await connectDB()
    const created = await Fan.insertMany(fans)
    return ok({ success: true, count: created.length, data: created }, 201)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error', 409)
  }
}
