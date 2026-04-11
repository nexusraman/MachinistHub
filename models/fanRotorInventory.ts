import mongoose, { Schema } from 'mongoose'

const fanRotorSchema = new Schema({
  client: String,
  rotorSize: String,
  quantity: Number,
  type: { type: String, enum: ['received', 'dispatched'], default: 'received' },
  shaftSize: { type: String, default: '' },
  date: { type: Date, default: Date.now },
})

// Always delete the cached model so schema changes take effect without restarting the server
if (mongoose.models.FanRotor) {
  delete (mongoose.models as Record<string, unknown>).FanRotor
}

const FanRotorInventory = mongoose.model('FanRotor', fanRotorSchema)
export default FanRotorInventory
