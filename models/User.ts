import mongoose, { Schema, Document, Model } from 'mongoose'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

export interface IUser extends Document {
  name: string
  role: string
  username: string
  email: string
  password: string
  date_created: Date
  resetPasswordToken?: string
  resetPasswordExpire?: Date
  matchPassword(password: string): Promise<boolean>
  getSignedToken(): string
  getResetPasswordToken(): string
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  role: { type: String, required: true },
  username: { type: String, required: true },
  email: {
    type: String,
    required: [true, 'Please provide a username'],
    unique: true,
    match: [/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/, 'Please provide a valid email'],
  },
  password: { type: String, required: [true, 'Please add a password'], minlength: 6, select: false },
  date_created: { type: Date, default: Date.now },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
})

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

UserSchema.methods.matchPassword = async function (password: string) {
  return await bcrypt.compare(password, this.password)
}

UserSchema.methods.getSignedToken = function () {
  return jwt.sign({ id: this._id, role: this.role, name: this.name }, 'werollin', { expiresIn: '1d' })
}

UserSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString('hex')
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex')
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000
  return resetToken
}

const User: Model<IUser> = mongoose.models.user || mongoose.model<IUser>('user', UserSchema)
export default User
