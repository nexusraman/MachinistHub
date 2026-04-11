import { connectDB } from '@/lib/mongodb'
import Clients from '@/models/clients'
import { ok, err } from '@/lib/apiHelper'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    await connectDB()
    const client = await Clients.findById(id)
    if (!client) return err('Client not found', 404)
    return ok(client)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}
