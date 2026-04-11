import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Submersible from '@/models/Submersible'
import Clients from '@/models/clients'
import { getRate } from '@/utils/RateList'
import { ok, err } from '@/lib/apiHelper'

export async function POST(req: NextRequest) {
  const { subId, clientName } = await req.json()

  try {
    await connectDB()
    const specificSub = await Submersible.findOne({ subId, client: clientName })
    if (!specificSub) return err(`Submersible with subId ${subId} and client ${clientName} not found`, 404)

    const client = await Clients.findOne({ name: clientName })
    if (!client) return err(`Client ${clientName} not found`, 404)

    const rate = getRate(clientName, specificSub.rotorSize)
    const amountToSubtract = parseInt(specificSub.quantity) * rate

    await Clients.findOneAndUpdate(
      { _id: client._id },
      { $pull: { entries: { subId } }, $inc: { calculatedBalance: -amountToSubtract } },
      { new: true }
    )

    const deleteResult = await Submersible.deleteOne({ subId, client: clientName })
    if (deleteResult.deletedCount === 0) return err('Submersible not found for deletion', 404)

    return ok({ message: 'Submersible and linked client entry deleted successfully' })
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}
