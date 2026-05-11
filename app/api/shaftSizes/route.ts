import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import ShaftSize from '@/models/shaftSize'
import { ok, err } from '@/lib/apiHelper'

const DEFAULTS = ['Goltu', 'Relexo', 'Farata Relexo', 'Goltu Relexo', 'ABC', 'Dhokha']

export async function GET() {
  try {
    await connectDB()
    // Seed defaults if collection is empty
    const count = await ShaftSize.countDocuments()
    if (count === 0) {
      await ShaftSize.insertMany(DEFAULTS.map(name => ({ name })))
    }
    const sizes = await ShaftSize.find().sort({ createdAt: 1 })
    return ok(sizes.map((s: { name: string }) => s.name))
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}

// Body: { name: string }
export async function POST(req: NextRequest) {
  const { name } = await req.json()
  if (!name?.trim()) return err('name is required', 400)
  try {
    await connectDB()
    const existing = await ShaftSize.findOne({ name: name.trim() })
    if (existing) return ok(name.trim()) // already exists, not an error
    await ShaftSize.create({ name: name.trim() })
    return ok(name.trim(), 201)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error', 409)
  }
}
