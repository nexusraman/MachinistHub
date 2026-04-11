import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { ok, err } from '@/lib/apiHelper'

export async function POST(req: NextRequest) {
  const { email, password, role, date_created, name, username } = await req.json()

  try {
    await connectDB()
    const user = await User.create({ name, email, username, password, role, date_created })
    const token = user.getSignedToken()
    return ok({ success: true, token, user }, 200)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error', 500)
  }
}
