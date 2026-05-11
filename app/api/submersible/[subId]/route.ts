import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Submersible from '@/models/Submersible'
import Clients from '@/models/clients'
import { getRate } from '@/utils/RateList'
import { ok, err } from '@/lib/apiHelper'

export async function DELETE(_req: Request, { params }: { params: Promise<{ subId: string }> }) {
  const { subId } = await params
  try {
    await connectDB()
    const existing = await Submersible.findOne({ subId })
    if (!existing) return err('Entry not found', 404)

    const amount = (existing.quantity || 0) * getRate(existing.client, existing.rotorSize)

    await Submersible.findOneAndDelete({ subId })

    const client = await Clients.findOne({ 'entries.subId': subId })
    if (client) {
      client.entries = client.entries.filter((e: { subId: string }) => e.subId !== subId)
      client.calculatedBalance = (client.calculatedBalance ?? client.balance) - amount
      await client.save({ validateModifiedOnly: true })
    }

    return ok({ deleted: true })
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ subId: string }> }) {
  const { subId } = await params
  const { rotorSize, quantity, date } = await req.json()

  try {
    await connectDB()

    const existing = await Submersible.findOne({ subId })
    if (!existing) return err('Entry not found', 404)

    const oldAmount = (existing.quantity || 0) * getRate(existing.client, existing.rotorSize)
    const newAmount = (Number(quantity) || 0) * getRate(existing.client, rotorSize ?? existing.rotorSize)
    const delta = newAmount - oldAmount

    await Submersible.findOneAndUpdate({ subId }, { $set: { rotorSize, quantity: Number(quantity), date } })

    // Sync the embedded entry in client.entries and adjust balance
    const client = await Clients.findOne({ 'entries.subId': subId })
    if (client) {
      const idx = client.entries.findIndex((e: { subId: string }) => e.subId === subId)
      if (idx !== -1) {
        client.entries[idx].size = rotorSize ?? client.entries[idx].size
        client.entries[idx].quantity = String(quantity)
        client.entries[idx].date = date
        client.calculatedBalance = (client.calculatedBalance ?? client.balance) + delta
        await client.save({ validateModifiedOnly: true })
      }
    }

    return ok({ subId, rotorSize, quantity, date, client: existing.client })
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}
