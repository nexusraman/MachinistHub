import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Submersible from '@/models/Submersible'
import { ok, err } from '@/lib/apiHelper'
import { createSubmersible, errorStatus } from '@/lib/services/entries'

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
  try {
    const result = await createSubmersible(body)
    return ok(result, 201)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error', errorStatus(e, 409))
  }
}
