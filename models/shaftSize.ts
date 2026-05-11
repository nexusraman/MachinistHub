import mongoose, { Schema } from 'mongoose'

const shaftSizeSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  createdAt: { type: Date, default: Date.now },
})

const ShaftSize = mongoose.models.ShaftSize || mongoose.model('ShaftSize', shaftSizeSchema)
export default ShaftSize
