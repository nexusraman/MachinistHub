import mongoose, { Schema } from 'mongoose'

const personalExpenseSchema = new Schema({
  category: { type: String, default: '' },
  description: { type: String, default: '' },
  amount: Number,
  date: { type: Date, default: Date.now },
  medium: { type: String, enum: ['Cash', 'Transfer'] },
  transferMethod: { type: String, enum: ['UPI', 'Bank Transfer'] },
  comment: { type: String, default: '' },
})

const PersonalExpense = mongoose.models.PersonalExpense || mongoose.model('PersonalExpense', personalExpenseSchema)
export default PersonalExpense
