import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import FanRotorInventory from '@/models/fanRotorInventory'
import { ok, err } from '@/lib/apiHelper'

export async function POST(req: NextRequest) {
  const { _id } = await req.json()

  try {
    await connectDB()
    await FanRotorInventory.deleteOne({ _id })
    return ok({ message: 'Fan Rotor Deleted' })
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error', 404)
  }
}
