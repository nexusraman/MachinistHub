import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Fan from '@/models/fan'
import { ok, err } from '@/lib/apiHelper'

export async function GET() {
  try {
    await connectDB()
    const fans = await Fan.find()
    return ok(fans)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error', 404)
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  try {
    await connectDB()
    const newFan = new Fan(body)
    await newFan.save()
    return ok(newFan, 201)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error', 409)
  }
}
