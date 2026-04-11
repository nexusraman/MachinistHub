import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import sendEmail from '@/utils/sendEmail'
import { ok, err } from '@/lib/apiHelper'

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  try {
    await connectDB()
    const user = await User.findOne({ email })
    if (!user) return err('Email does not exist', 404)

    const resetToken = user.getResetPasswordToken()
    await user.save()

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/passwordReset/${resetToken}`
    const message = `<h1>MachinistHub</h1><h2>You have requested a password reset</h2><a href=${resetUrl}>${resetUrl}</a>`

    try {
      await sendEmail({ to: user.email, subject: 'Password Reset Request', text: message })
      return ok({ success: true, data: 'Email Sent' })
    } catch {
      user.resetPasswordToken = undefined
      user.resetPasswordExpire = undefined
      await user.save()
      return err('Email could not be sent', 500)
    }
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error', 500)
  }
}
