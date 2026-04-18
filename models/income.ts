import mongoose, { Schema } from 'mongoose'

const incomeSchema = new Schema({
  paymentId: { type: String, required: true, unique: true },
  client: String,
  reason: String,
  amount: Number,
  medium: { type: String, enum: ['Cash', 'Transfer'] },
  transferMethod: { type: String, enum: ['UPI', 'Bank Transfer'] },
  comment: { type: String, default: '' },
  date: { type: Date, default: Date.now },
  linkedExpenseId: { type: String, default: null },
})

const Income = mongoose.models.Income || mongoose.model('Income', incomeSchema)
export default Income
