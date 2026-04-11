import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import FanRotorInventory from '@/models/fanRotorInventory'
import { ok, err } from '@/lib/apiHelper'

export async function POST(req: NextRequest) {
  const { ids } = await req.json()

  try {
    await connectDB()
    await FanRotorInventory.deleteMany({ _id: { $in: ids } })
    return ok({ message: 'Fan Rotors deleted successfully' })
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}
