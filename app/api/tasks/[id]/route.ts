import { NextRequest } from 'next/server'
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

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserId(req)
  if (!userId) return err('Unauthorized', 401)

  const { id } = await params
  const body = await req.json()

  try {
    await connectDB()

    // Subtask operations need document methods — use findOne + save
    if (body._subtaskToggle || body._subtaskAdd || body._subtaskDelete) {
      const task = await Task.findOne({ _id: id, userId })
      if (!task) return err('Task not found', 404)

      if (body._subtaskToggle) {
        const { subtaskId, completed } = body._subtaskToggle
        const sub = task.subtasks.id(subtaskId)
        if (!sub) return err('Subtask not found', 404)
        sub.completed = completed
        sub.completedAt = completed ? new Date() : null
      } else if (body._subtaskAdd) {
        task.subtasks.push({ title: body._subtaskAdd.title, order: task.subtasks.length })
      } else if (body._subtaskDelete) {
        const idx = task.subtasks.findIndex((s) => s._id.toString() === body._subtaskDelete.subtaskId)
        if (idx !== -1) task.subtasks.splice(idx, 1)
      }

      await task.save()
      return ok(task.toObject())
    }

    // Recurring task completion — use findOne + save for array push
    if (body.status === 'done' || (body.status && body.status !== 'done')) {
      const task = await Task.findOne({ _id: id, userId })
      if (!task) return err('Task not found', 404)

      if (task.isRecurring) {
        if (body.status === 'done') {
          const alreadyDone = task.completionDates.some(
            (d: Date) => new Date(d).toISOString().slice(0, 10) === todayStr()
          )
          if (!alreadyDone) task.completionDates.push(new Date(todayStr()))
          task.status = 'done'
          task.completedAt = new Date()
        } else {
          task.completionDates = task.completionDates.filter(
            (d: Date) => new Date(d).toISOString().slice(0, 10) !== todayStr()
          )
          task.status = body.status
          task.completedAt = null
        }
        await task.save()
        return ok(task.toObject())
      }
    }

    // All other updates (status, notes, title, priority, etc.) — use findOneAndUpdate
    const update: Record<string, unknown> = { ...body }
    delete update._subtaskToggle
    delete update._subtaskAdd
    delete update._subtaskDelete

    if (update.status === 'done') {
      update.completedAt = new Date()
    } else if (update.status && update.status !== 'done') {
      update.completedAt = null
    }

    const updated = await Task.findOneAndUpdate(
      { _id: id, userId },
      { $set: update },
      { new: true, runValidators: false }
    )
    if (!updated) return err('Task not found', 404)
    return ok(updated.toObject())
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserId(req)
  if (!userId) return err('Unauthorized', 401)
  const { id } = await params
  try {
    await connectDB()
    const task = await Task.findOneAndDelete({ _id: id, userId })
    if (!task) return err('Task not found', 404)
    return ok({ success: true })
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}
