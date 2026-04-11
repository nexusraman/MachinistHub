import mongoose, { Schema } from 'mongoose'

const clientSchema = new Schema({
  name: String,
  phone: String,
  balance: Number,
  calculatedBalance: Number,
  category: String,
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
})

const Clients = mongoose.models.Clients || mongoose.model('Clients', clientSchema)
export default Clients
