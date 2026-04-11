import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import FanRotorInventory from '@/models/fanRotorInventory'
import { ok, err } from '@/lib/apiHelper'

export async function GET() {
  try {
    await connectDB()
    const rotors = await FanRotorInventory.find().sort({ date: -1 })
    return ok(rotors)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error', 404)
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { rotorSize, quantity, type = 'received' } = body

  try {
    await connectDB()

    if (type === 'dispatched') {
      // Check available inventory for this rotor size
      // Records without a type field (old data) are treated as 'received'
      const all = await FanRotorInventory.find({ rotorSize })
      const received = all.filter((r: { type?: string }) => !r.type || r.type === 'received').reduce((s: number, r: { quantity: number }) => s + r.quantity, 0)
      const dispatched = all.filter((r: { type?: string }) => r.type === 'dispatched').reduce((s: number, r: { quantity: number }) => s + r.quantity, 0)
      const available = received - dispatched
      if (quantity > available) {
        return err(`Only ${available} unit(s) of ${rotorSize} in inventory`, 400)
      }
    }

    const newRotor = new FanRotorInventory(body)
    await newRotor.save()
    return ok(newRotor, 201)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error', 409)
  }
}
