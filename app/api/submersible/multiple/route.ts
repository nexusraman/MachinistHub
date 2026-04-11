import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Submersible from '@/models/Submersible'
import Clients from '@/models/clients'
import { nanoid } from 'nanoid'
import { getRate } from '@/utils/RateList'
import { ok, err } from '@/lib/apiHelper'

export async function POST(req: NextRequest) {
  const submersibles = await req.json()

  if (!Array.isArray(submersibles) || submersibles.length === 0) {
    return err('No submersible data provided', 400)
  }

  try {
    await connectDB()
    const saved = []

    for (const sub of submersibles) {
      const generatedSubId = nanoid()
      const newSub = new Submersible({ ...sub, subId: generatedSubId })
      const client = await Clients.findOne({ name: sub.client })
      const rate = getRate(sub.client, sub.rotorSize)
      const amount = parseInt(sub.quantity) * rate
      const entry = { subId: generatedSubId, date: sub.date, size: sub.rotorSize, quantity: sub.quantity }

      if (client) {
        await Clients.findOneAndUpdate(
          { _id: client._id },
          { $push: { entries: entry }, $inc: { calculatedBalance: amount } }
        )
      }

      const s = await newSub.save()
      saved.push(s)
    }

    return ok({ success: true, count: saved.length, data: saved }, 201)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error', 409)
  }
}
