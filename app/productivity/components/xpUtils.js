const PRIORITY_MULT = { high: 2, medium: 1.5, low: 1 }
const XP_PER_SUBTASK = 15
const XP_ALL_DONE_BONUS = 50

export function calcXP(task) {
  if (!task.subtasks?.length) return 0
  const mult = PRIORITY_MULT[task.priority] || 1
  const done = task.subtasks.filter((s) => s.completed).length
  const base = done * XP_PER_SUBTASK * mult
  const bonus = done === task.subtasks.length && done > 0 ? XP_ALL_DONE_BONUS : 0
  return Math.round(base + bonus)
}

export function maxXP(task) {
  if (!task.subtasks?.length) return 0
  const mult = PRIORITY_MULT[task.priority] || 1
  return Math.round(task.subtasks.length * XP_PER_SUBTASK * mult + XP_ALL_DONE_BONUS)
}

export const ACHIEVEMENTS = [
  { id: 'first_blood', threshold: 1, absolute: true, label: 'First Blood', icon: '⚡', color: '#ff9800', desc: 'Completed first subtask' },
  { id: 'quarter', threshold: 0.25, label: 'Getting There', icon: '🌱', color: '#8bc34a', desc: '25% subtasks done' },
  { id: 'halfway', threshold: 0.5, label: 'Halfway', icon: '🔥', color: '#ff6b35', desc: 'Halfway through' },
  { id: 'almost', threshold: 0.75, label: 'Almost There', icon: '⚡', color: '#9c27b0', desc: '75% subtasks done' },
  { id: 'perfect', threshold: 1, label: 'Perfectionist', icon: '🏆', color: '#ffd700', desc: 'All subtasks done!' },
]

export function getUnlockedAchievements(task) {
  if (!task.subtasks?.length) return []
  const done = task.subtasks.filter((s) => s.completed).length
  const total = task.subtasks.length
  const ratio = done / total
  return ACHIEVEMENTS.filter((a) => {
    if (a.absolute) return done >= a.threshold
    return ratio >= a.threshold
  })
}
