import mongoose, { Schema } from 'mongoose'

const fanRotorSchema = new Schema({
  client: String,
  rotorSize: String,
  quantity: Number,
  date: { type: Date, default: Date.now },
})

const FanRotorInventory = mongoose.models.FanRotor || mongoose.model('FanRotor', fanRotorSchema)
export default FanRotorInventory
