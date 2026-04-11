import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Clients from '@/models/clients'
import { ok, err } from '@/lib/apiHelper'

export async function GET() {
  try {
    await connectDB()
    const clients = await Clients.find()
    return ok(clients)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  try {
    await connectDB()
    const newClient = new Clients(body)
    await newClient.save()
    return ok(newClient, 201)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error', 409)
  }
}
