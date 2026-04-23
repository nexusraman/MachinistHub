import mongoose from 'mongoose'

const SubtaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
  order: { type: Number, default: 0 },
})

const TaskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  notes: { type: String, default: '' },
  category: { type: String, enum: ['factory', 'career', 'family', 'personal'], required: true },
  deadline: { type: Date, required: true },
  priority: { type: String, enum: ['high', 'medium', 'low'], required: true },
  status: { type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' },
  completedAt: { type: Date, default: null },
  isRecurring: { type: Boolean, default: false },
  recurrenceType: { type: String, enum: ['daily'], default: 'daily' },
  recurrenceDays: { type: [Number], default: [] },
  completionDates: [{ type: Date }],
  subtasks: { type: [SubtaskSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
})

TaskSchema.index({ userId: 1, deadline: 1 })
TaskSchema.index({ userId: 1, status: 1 })
TaskSchema.index({ userId: 1, category: 1 })

// Force re-register on schema change to avoid stale cached model in Next.js dev
delete mongoose.models.Task
const Task = mongoose.model('Task', TaskSchema)
export default Task
