import mongoose, { Schema } from 'mongoose'

const clientSchema = new Schema({
  name: String,
  phone: String,
  balance: Number,
  calculatedBalance: Number,
  category: String,
  active: { type: Boolean, default: true },
  rateCategory: { type: String, default: 'common' },
  entries: [
    {
      subId: { type: String, required: true },
      date: Date,
      size: String,
      quantity: String,
    },
  ],
  payments: [
    {
      date: Date,
      amount: Number,
      paymentId: { type: String, required: true },
      medium: { type: String, enum: ['Cash', 'Transfer', 'Online'], default: 'Cash' },
      transferMethod: { type: String, enum: ['UPI', 'Bank Transfer', null], default: null },
      comment: { type: String, default: '' },
    },
  ],
  fanRates: [
    {
      shaftSize: String,
      rate: Number,
      updatedAt: { type: Date, default: Date.now },
    },
  ],
})

const Clients = mongoose.models.Clients || mongoose.model('Clients', clientSchema)
export default Clients
