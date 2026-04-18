import mongoose, { Schema } from 'mongoose'

const employeeSchema = new Schema({
  name: { type: String, required: true, unique: true },
  category: { type: String, enum: ['labour', 'supplier'], default: 'labour' },
})

const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema)
export default Employee
