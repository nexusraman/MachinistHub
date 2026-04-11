import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { ok, err } from '@/lib/apiHelper'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  if (!username || !password) {
    return err('Please provide a username and password', 400)
  }

  try {
    await connectDB()
    const user = await User.findOne({ username }).select('+password')
    if (!user) return err('User not found', 401)

    const isMatch = await user.matchPassword(password)
    if (!isMatch) return err('Invalid password', 401)

    const token = user.getSignedToken()
    const response = ok({ success: true, token, user: { name: user.name, role: user.role, username: user.username } })
    response.cookies.set('authToken', token, { httpOnly: true, path: '/', maxAge: 86400 })
    return response
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error', 500)
  }
}
