import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Clients from '@/models/clients'
import { ok, err } from '@/lib/apiHelper'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await connectDB()
    const client = await Clients.findById(id, 'fanRates')
    if (!client) return err('Client not found', 404)
    return ok(client.fanRates || [])
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}

// Body: { shaftSize: string, rate: number }
// Upserts the rate for that shaft size (replaces existing entry for that shaft size)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { shaftSize, rate } = await req.json()
  if (!shaftSize || rate == null) return err('shaftSize and rate are required', 400)

  try {
    await connectDB()
    // Remove any existing entry for this shaft size, then push the new one
    const client = await Clients.findByIdAndUpdate(
      id,
      {
        $pull: { fanRates: { shaftSize } },
      },
      { new: true }
    )
    if (!client) return err('Client not found', 404)

    await Clients.findByIdAndUpdate(
      id,
      {
        $push: { fanRates: { shaftSize, rate, updatedAt: new Date() } },
      },
      { new: true }
    )

    const updated = await Clients.findById(id, 'fanRates')
    return ok(updated?.fanRates || [])
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}
