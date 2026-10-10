import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import FanRotorInventory from '@/models/fanRotorInventory'
import { ok, err } from '@/lib/apiHelper'
import { createRotorMovement, errorStatus } from '@/lib/services/entries'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const client = searchParams.get('client')
  const type = searchParams.get('type')
  const filter: Record<string, string> = {}
  if (client) filter.client = client
  if (type) filter.type = type

  try {
    await connectDB()
    const rotors = await FanRotorInventory.find(filter).sort({ date: -1 })
    return ok(rotors)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error', 404)
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  try {
    const result = await createRotorMovement(body)
    return ok(result, 201)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error', errorStatus(e, 409))
  }
}
