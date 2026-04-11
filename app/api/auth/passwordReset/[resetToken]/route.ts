import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import crypto from 'crypto'
import { ok, err } from '@/lib/apiHelper'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ resetToken: string }> }) {
  const { resetToken } = await params
  const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex')

  try {
    await connectDB()
    const user = await User.findOne({ resetPasswordToken, resetPasswordExpire: { $gt: Date.now() } })
    if (!user) return err('Invalid Reset Token', 400)

    const { password } = await req.json()
    user.password = password
    user.resetPasswordToken = undefined
    user.resetPasswordExpire = undefined
    await user.save()

    return ok({ success: true, data: 'Password Reset Success' }, 201)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error', 500)
  }
}
