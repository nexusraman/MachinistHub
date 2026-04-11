import mongoose, { Schema } from 'mongoose'

const dailyLogSchema = new Schema(
  {
    date: { type: Date, required: true },
    relatedTo: { type: String, required: true, trim: true },
    comment: { type: String, trim: true },
  },
  { timestamps: true }
)

const DailyLogs = mongoose.models.DailyLogs || mongoose.model('DailyLogs', dailyLogSchema)
export default DailyLogs
