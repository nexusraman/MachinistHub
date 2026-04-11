import mongoose, { Schema } from 'mongoose'

const submersibleChartSchema = new Schema({
  size: String,
  price: Number,
})

const SubmersibleChart = mongoose.models.SubmersibleChart || mongoose.model('SubmersibleChart', submersibleChartSchema)
export default SubmersibleChart
