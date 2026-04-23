export function isScheduledDay(date, recurrenceDays) {
  if (!recurrenceDays || recurrenceDays.length === 0) return true
  return recurrenceDays.includes(date.getDay())
}

export function computeStreak(completionDates, recurrenceDays) {
  if (!completionDates?.length) return 0
  const dateSet = new Set(completionDates.map((d) => new Date(d).toISOString().slice(0, 10)))

  let streak = 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)

  // Walk backwards through scheduled days only
  while (true) {
    if (isScheduledDay(cursor, recurrenceDays)) {
      const key = cursor.toISOString().slice(0, 10)
      if (!dateSet.has(key)) break
      streak++
    }
    cursor.setDate(cursor.getDate() - 1)
    // Safety: don't walk back more than 2 years
    if (streak > 730) break
  }
  return streak
}

export function isCompletedToday(task) {
  if (!task.completedAt) return false
  return new Date(task.completedAt).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)
}

export function getEffectiveStatus(task) {
  if (task.isRecurring) {
    if (isCompletedToday(task)) return 'done'
    return task.status === 'in-progress' ? 'in-progress' : 'todo'
  }
  return task.status || 'todo'
}

export function isTodayScheduled(task) {
  if (!task.isRecurring) return true
  return isScheduledDay(new Date(), task.recurrenceDays)
}
