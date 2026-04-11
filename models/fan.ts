import mongoose, { Schema } from 'mongoose'

const fanSchema = new Schema({
  client: String,
  rotorSize: String,
  shaftSize: String,
  quantity: Number,
  date: { type: Date, default: Date.now },
})

const Fan = mongoose.models.Fan || mongoose.model('Fan', fanSchema)
export default Fan
