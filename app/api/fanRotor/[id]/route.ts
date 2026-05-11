import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import FanRotorInventory from '@/models/fanRotorInventory'
import { ok, err } from '@/lib/apiHelper'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await connectDB()
    const deleted = await FanRotorInventory.findByIdAndDelete(id)
    if (!deleted) return err('Entry not found', 404)
    return ok({ deleted: true })
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  try {
    await connectDB()
    const updated = await FanRotorInventory.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true }
    )
    if (!updated) return err('Entry not found', 404)
    return ok(updated)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}
