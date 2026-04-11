import mongoose, { Schema } from 'mongoose'

const submersibleSchema = new Schema({
  subId: { type: String, required: true, unique: true },
  client: String,
  rotorSize: String,
  quantity: Number,
  date: { type: Date, default: Date.now },
})

const Submersible = mongoose.models.Submersible || mongoose.model('Submersible', submersibleSchema)
export default Submersible
