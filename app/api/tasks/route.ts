import { NextRequest } from 'next/server'
import type { SortOrder } from 'mongoose'
import jwt from 'jsonwebtoken'
import { connectDB } from '@/lib/mongodb'
import Task from '@/models/Task'
import { ok, err } from '@/lib/apiHelper'

function getUserId(req: NextRequest): string | null {
  const token = req.cookies.get('authToken')?.value
  if (!token) return null
  try {
    const decoded = jwt.verify(token, 'werollin') as { id: string }
    return decoded.id
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req)
  if (!userId) return err('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const status = searchParams.get('status')
  const sortBy = searchParams.get('sortBy') || 'deadline'

  try {
    await connectDB()

    const query: Record<string, unknown> = { userId }
    if (category && category !== 'all') query.category = category
    if (status && status !== 'all') query.status = status

    const sortMap: Record<string, Record<string, SortOrder>> = {
      deadline: { deadline: 1 },
      priority: { priority: 1 },
      created: { createdAt: -1 },
    }

    const tasks = await Task.find(query).sort(sortMap[sortBy] || { deadline: 1 })
    return ok(tasks)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req)
  if (!userId) return err('Unauthorized', 401)

  const { title, description, category, deadline, priority } = await req.json()
  if (!title) return err('Title is required', 400)
  if (!deadline) return err('Deadline is required', 400)

  try {
    await connectDB()
    const task = await Task.create({ userId, title, description, category, deadline, priority, status: 'todo' })
    return ok(task, 201)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}
