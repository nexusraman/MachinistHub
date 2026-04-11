import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import FanRotorInventory from '@/models/fanRotorInventory'
import { ok, err } from '@/lib/apiHelper'

export async function GET() {
  try {
    await connectDB()
    const rotors = await FanRotorInventory.find()
    return ok(rotors)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error', 404)
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  try {
    await connectDB()
    const newRotor = new FanRotorInventory(body)
    await newRotor.save()
    return ok(newRotor, 201)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error', 409)
  }
}
