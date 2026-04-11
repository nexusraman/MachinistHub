import mongoose, { Schema } from 'mongoose'

const expenseSchema = new Schema({
  payee: String,
  reason: String,
  amount: Number,
  date: { type: Date, default: Date.now },
  medium: { type: String, enum: ['Cash', 'Transfer'] },
  transferMethod: { type: String, enum: ['UPI', 'Bank Transfer'] },
  comment: { type: String, default: '' },
})

const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema)
export default Expense
