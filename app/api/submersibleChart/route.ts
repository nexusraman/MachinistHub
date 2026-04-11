import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import SubmersibleChart from '@/models/submersibleChart'
import { ok, err } from '@/lib/apiHelper'

export async function GET() {
  try {
    await connectDB()
    const chart = await SubmersibleChart.find()
    return ok(chart)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error', 404)
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  try {
    await connectDB()
    const newChart = new SubmersibleChart(body)
    await newChart.save()
    return ok(newChart, 201)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error', 409)
  }
}
