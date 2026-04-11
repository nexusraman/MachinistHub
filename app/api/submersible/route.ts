import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Submersible from '@/models/Submersible'
import Clients from '@/models/clients'
import { nanoid } from 'nanoid'
import { getRate } from '@/utils/RateList'
import { ok, err } from '@/lib/apiHelper'

export async function GET() {
  try {
    await connectDB()
    const submersibles = await Submersible.find()
    return ok(submersibles)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error', 404)
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const generatedSubId = nanoid()

  try {
    await connectDB()
    const newSub = new Submersible({ ...body, subId: generatedSubId })
    const client = await Clients.findOne({ name: body.client })
    const rate = getRate(body.client, body.rotorSize)
    const entryAmount = parseInt(body.quantity) * rate

    const entry = { subId: generatedSubId, date: body.date, size: body.rotorSize, quantity: body.quantity }

    await Clients.findOneAndUpdate(
      { _id: client._id },
      { $push: { entries: entry }, $inc: { calculatedBalance: entryAmount } }
    )
    await newSub.save()
    return ok(newSub, 201)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error', 409)
  }
}
