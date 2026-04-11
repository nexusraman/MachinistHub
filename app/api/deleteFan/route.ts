import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Fan from '@/models/fan'
import { ok, err } from '@/lib/apiHelper'

export async function POST(req: NextRequest) {
  const { _id } = await req.json()

  try {
    await connectDB()
    await Fan.deleteOne({ _id })
    return ok({ message: 'Fan Deleted' })
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error', 404)
  }
}
