import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
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

  try {
    await connectDB()
    const now = new Date()
    const uid = new mongoose.Types.ObjectId(userId)

    const [all, done, inProgress, overdue, byCategory] = await Promise.all([
      Task.countDocuments({ userId }),
      Task.countDocuments({ userId, status: 'done' }),
      Task.countDocuments({ userId, status: 'in-progress' }),
      Task.countDocuments({ userId, status: { $ne: 'done' }, deadline: { $lt: now } }),
      Task.aggregate([
        { $match: { userId: uid } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
    ])

    const tasksByCategory: Record<string, number> = {}
    for (const item of byCategory) tasksByCategory[item._id] = item.count

    return ok({
      totalTasks: all,
      completedTasks: done,
      inProgressTasks: inProgress,
      completionPercentage: all > 0 ? Math.round((done / all) * 100) : 0,
      overdueTasks: overdue,
      tasksByCategory,
    })
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}
