import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Fan from '@/models/fan'
import { ok, err } from '@/lib/apiHelper'

export async function POST(req: NextRequest) {
  const { ids } = await req.json()

  try {
    await connectDB()
    await Fan.deleteMany({ _id: { $in: ids } })
    return ok({ message: 'Fans deleted successfully' })
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}
