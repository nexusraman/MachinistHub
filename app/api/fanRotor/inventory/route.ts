import { connectDB } from '@/lib/mongodb'
import FanRotorInventory from '@/models/fanRotorInventory'
import { ok, err } from '@/lib/apiHelper'

export async function GET() {
  try {
    await connectDB()
    const all = await FanRotorInventory.find()

    // Group by rotorSize and compute net stock
    const map: Record<string, { received: number; dispatched: number }> = {}
    for (const r of all) {
      const size = r.rotorSize as string
      if (!map[size]) map[size] = { received: 0, dispatched: 0 }
      // Records without a type field (old data) count as received
      if (r.type === 'dispatched') map[size].dispatched += r.quantity as number
      else map[size].received += r.quantity as number
    }

    const inventory = Object.entries(map).map(([size, { received, dispatched }]) => ({
      rotorSize: size,
      received,
      dispatched,
      available: received - dispatched,
    }))

    return ok(inventory)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}
