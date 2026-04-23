'use client'

import { useState } from 'react'
import { Box, Typography, Chip, IconButton, Tooltip, LinearProgress } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import HourglassTopIcon from '@mui/icons-material/HourglassTop'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import RepeatIcon from '@mui/icons-material/Repeat'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import axios from 'axios'
import { computeStreak, getEffectiveStatus, isTodayScheduled } from './streakUtils'
import { calcXP } from './xpUtils'

const CATEGORY_COLORS = {
  factory: '#ff6b35', career: '#00d9a3', family: '#ffa500', personal: '#4a90e2',
}
const PRIORITY_COLORS = { high: '#f44336', medium: '#ff9800', low: '#4caf50' }
const PRIORITY_DOT = { high: '#f44336', medium: '#ff9800', low: '#4caf50' }
const STATUS_CYCLE = { todo: 'in-progress', 'in-progress': 'done', done: 'todo' }
const STATUS_CONFIG = {
  todo:         { icon: RadioButtonUncheckedIcon, color: '#cbd5e1' },
  'in-progress':{ icon: HourglassTopIcon,         color: '#ff9800' },
  done:         { icon: CheckCircleIcon,           color: '#4caf50' },
}

function getDaysLabel(task, status) {
  if (task.isRecurring || status === 'done') return null
  const now = new Date(); now.setHours(0,0,0,0)
  const due = new Date(task.deadline); due.setHours(0,0,0,0)
  const d = Math.round((due - now) / 86400000)
  if (d < 0)  return { text: `${Math.abs(d)}d overdue`, color: '#ef4444' }
  if (d === 0) return { text: 'due today',   color: '#f97316' }
  if (d <= 3)  return { text: `${d}d left`,   color: '#f97316' }
  return         { text: `${d}d left`,        color: '#22c55e' }
}

function scheduleLabel(days) {
  if (!days?.length || days.length === 7) return '7×/wk'
  const s = [...days].sort((a,b)=>a-b)
  if (JSON.stringify(s) === JSON.stringify([1,2,3,4,5])) return 'Weekdays'
  if (JSON.stringify(s) === JSON.stringify([0,6]))        return 'Weekends'
  return `${days.length}×/wk`
}

export default function TaskCard({ task, onUpdate, onDelete, onEdit, onClick }) {
  const [toggling, setToggling] = useState(false)

  const status        = getEffectiveStatus(task)
  const scheduledToday = isTodayScheduled(task)
  const isOverdue     = status !== 'done' && !task.isRecurring && new Date(task.deadline) < new Date()
  const catColor      = CATEGORY_COLORS[task.category] || '#888'
  const statusCfg     = STATUS_CONFIG[status]
  const StatusIcon    = statusCfg.icon
  const streak        = task.isRecurring ? computeStreak(task.completionDates, task.recurrenceDays) : 0
  const daysLabel     = getDaysLabel(task, status)

  // Subtask progress
  const subTotal = task.subtasks?.length || 0
  const subDone  = task.subtasks?.filter(s => s.completed).length || 0
  const subPct   = subTotal > 0 ? Math.round((subDone / subTotal) * 100) : null
  const xp       = calcXP(task)

  const borderColor = isOverdue ? '#fca5a5'
    : status === 'done'         ? '#bbf7d0'
    : status === 'in-progress'  ? '#fed7aa'
    : '#e2e8f0'

  const accentColor = isOverdue ? '#ef4444'
    : !scheduledToday           ? '#cbd5e1'
    : status === 'in-progress'  ? '#ff9800'
    : status === 'done'         ? '#4caf50'
    : catColor

  const handleCycleStatus = async (e) => {
    e.stopPropagation()
    if (toggling) return
    setToggling(true)
    try {
      const res = await axios.patch(`/api/tasks/${task._id}`, { status: STATUS_CYCLE[status] })
      onUpdate(res.data)
    } catch (err) {
      console.error('Status update failed:', err?.response?.data || err)
      alert(err?.response?.data?.message || 'Failed to update status')
    } finally {
      setToggling(false)
    }
  }

  const handleDelete = async (e) => {
    e.stopPropagation()
    if (!confirm('Delete this task?')) return
    try {
      await axios.delete(`/api/tasks/${task._id}`)
      onDelete(task._id)
    } catch (err) { console.error(err) }
  }

  return (
    <Box
      onClick={() => onClick(task)}
      sx={{
        display: 'flex', alignItems: 'stretch',
        bgcolor: '#fff', borderRadius: 2.5,
        border: `1px solid ${borderColor}`,
        cursor: 'pointer', overflow: 'hidden',
        opacity: status === 'done' ? 0.65 : !scheduledToday ? 0.6 : 1,
        transition: 'box-shadow 0.15s, transform 0.1s, border-color 0.2s',
        '&:hover': { boxShadow: '0 2px 12px rgba(0,0,0,0.07)', transform: 'translateY(-1px)', borderColor: accentColor + '80' },
      }}
    >
      {/* Left accent bar */}
      <Box sx={{ width: 4, flexShrink: 0, bgcolor: accentColor, transition: 'background-color 0.2s' }} />

      <Box sx={{ flex: 1, px: 1.75, py: 1.5, minWidth: 0 }}>
        {/* Row 1: status icon + title + badges */}
        <Box display="flex" alignItems="center" gap={1}>
          <Tooltip title={scheduledToday ? `${status} — click to advance` : 'Rest day'} placement="top">
            <span>
              <IconButton size="small" onClick={handleCycleStatus}
                disabled={toggling || !scheduledToday}
                sx={{ p: 0.25, color: statusCfg.color, flexShrink: 0,
                      '&:hover': { bgcolor: statusCfg.color + '18' },
                      '& .MuiSvgIcon-root': { fontSize: 20 } }}>
                <StatusIcon />
              </IconButton>
            </span>
          </Tooltip>

          <Typography
            variant="body2" fontWeight={600}
            sx={{
              fontSize: 13.5, flex: 1, minWidth: 0,
              textDecoration: status === 'done' ? 'line-through' : 'none',
              color: status === 'done' ? '#94a3b8' : '#1e293b',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {task.title}
          </Typography>

          {/* Priority dot */}
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: PRIORITY_COLORS[task.priority], flexShrink: 0 }} />

          {/* Category pill */}
          <Box sx={{
            px: 0.75, borderRadius: 1, fontSize: 10, fontWeight: 700,
            bgcolor: catColor + '18', color: catColor,
            textTransform: 'capitalize', lineHeight: '18px', flexShrink: 0,
          }}>
            {task.category}
          </Box>

          {/* Edit / delete — appear on hover */}
          <Box display="flex" sx={{ flexShrink: 0, '& .MuiIconButton-root': { opacity: 0.35, transition: 'opacity 0.15s' }, '&:hover .MuiIconButton-root': { opacity: 1 } }}>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(task) }}
              sx={{ p: 0.25, '&:hover': { color: '#0288d1' } }}>
              <EditIcon sx={{ fontSize: 14 }} />
            </IconButton>
            <IconButton size="small" onClick={handleDelete} sx={{ p: 0.25, '&:hover': { color: '#ef4444' } }}>
              <DeleteIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Row 2: description (single line) */}
        {task.description && (
          <Typography variant="caption" color="text.secondary"
            sx={{ display: 'block', mt: 0.4, ml: 4, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {task.description}
          </Typography>
        )}

        {/* Row 3: subtask progress bar */}
        {subTotal > 0 && (
          <Box sx={{ mt: 0.75, ml: 4 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.35}>
              <Typography variant="caption" sx={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                {subDone}/{subTotal} subtasks · {subPct}%
              </Typography>
              {xp > 0 && (
                <Box display="flex" alignItems="center" gap={0.25}>
                  <EmojiEventsIcon sx={{ fontSize: 11, color: '#f59e0b' }} />
                  <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700, color: '#f59e0b' }}>{xp} XP</Typography>
                </Box>
              )}
            </Box>
            <LinearProgress variant="determinate" value={subPct}
              sx={{
                height: 3, borderRadius: 99, bgcolor: '#f1f5f9',
                '& .MuiLinearProgress-bar': { bgcolor: subPct === 100 ? '#4caf50' : catColor, borderRadius: 99, transition: 'transform 0.4s ease' },
              }}
            />
          </Box>
        )}

        {/* Row 4: footer meta */}
        <Box display="flex" alignItems="center" gap={1.5} mt={0.75} ml={4}>
          {task.isRecurring ? (
            <>
              <Box display="flex" alignItems="center" gap={0.4}>
                <RepeatIcon sx={{ fontSize: 11, color: '#ff9800' }} />
                <Typography variant="caption" sx={{ fontSize: 11, color: '#ff9800', fontWeight: 600 }}>
                  {scheduleLabel(task.recurrenceDays)}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={0.35}>
                <LocalFireDepartmentIcon sx={{ fontSize: 12, color: streak > 0 ? '#ff6b35' : '#cbd5e1' }} />
                <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 700, color: streak > 0 ? '#ff6b35' : '#94a3b8' }}>
                  {streak > 0 ? `${streak}d streak` : 'no streak'}
                </Typography>
              </Box>
              {!scheduledToday && (
                <Typography variant="caption" sx={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>rest day</Typography>
              )}
            </>
          ) : (
            <>
              <Typography variant="caption" sx={{ fontSize: 11, color: '#94a3b8' }}>
                {new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Typography>
              {daysLabel && (
                <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 700, color: daysLabel.color }}>
                  {daysLabel.text}
                </Typography>
              )}
              {status === 'done' && task.completedAt && (
                <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: '#4caf50' }}>
                  ✓ {new Date(task.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Typography>
              )}
            </>
          )}
          {task.notes && (
            <Typography variant="caption" sx={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
              📝 {task.notes}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  )
}
