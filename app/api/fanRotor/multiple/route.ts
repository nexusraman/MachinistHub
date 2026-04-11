import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import FanRotorInventory from '@/models/fanRotorInventory'
import { ok, err } from '@/lib/apiHelper'

export async function POST(req: NextRequest) {
  const rotors = await req.json()

  if (!Array.isArray(rotors) || rotors.length === 0) {
    return err('No fan rotor entries provided', 400)
  }

  try {
    await connectDB()
    const created = await FanRotorInventory.insertMany(rotors)
    return ok({ success: true, count: created.length, data: created }, 201)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error', 409)
  }
}
