import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Employee from '@/models/employee'
import { ok, err } from '@/lib/apiHelper'

const SEED_LABOUR = ['Mahesh', 'Deepak', 'Deepak 2', 'Suraj', 'RJ', 'Uncle', 'Uncle 2', 'Saroj', 'Pankaj']
const SEED_SUPPLIERS = ['Manik', 'Bhushan']

export async function GET() {
  try {
    await connectDB()
    const seeds = [
      ...SEED_LABOUR.map(name => ({ name, category: 'labour' })),
      ...SEED_SUPPLIERS.map(name => ({ name, category: 'supplier' })),
    ]
    // upsert each seed — safe to call every time, no duplicates
    await Promise.all(seeds.map(s =>
      Employee.updateOne({ name: s.name }, { $setOnInsert: s }, { upsert: true })
    ))
    // remove any duplicates left from prior race-condition seeding
    const all = await Employee.find().sort({ _id: 1 })
    const seen = new Set<string>()
    const toDelete: string[] = []
    for (const e of all) {
      const key = e.name.toLowerCase()
      if (seen.has(key)) toDelete.push(e._id.toString())
      else seen.add(key)
    }
    if (toDelete.length) await Employee.deleteMany({ _id: { $in: toDelete } })

    const employees = await Employee.find().sort({ name: 1 })
    return ok(employees)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}

export async function POST(req: NextRequest) {
  const { name, category = 'labour' } = await req.json()
  try {
    await connectDB()
    const existing = await Employee.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } })
    if (existing) return ok(existing)
    const employee = await Employee.create({ name: name.trim(), category })
    return ok(employee, 201)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}
