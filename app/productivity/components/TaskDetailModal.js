'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Dialog, Box, Typography, IconButton, TextField, Button,
  Chip, Divider, Tooltip, CircularProgress, Checkbox,
  LinearProgress, Collapse,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import HourglassTopIcon from '@mui/icons-material/HourglassTop'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import RepeatIcon from '@mui/icons-material/Repeat'
import EditIcon from '@mui/icons-material/Edit'
import SaveIcon from '@mui/icons-material/Save'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import axios from 'axios'
import { computeStreak, getEffectiveStatus, isTodayScheduled, isScheduledDay } from './streakUtils'
import { calcXP, maxXP, getUnlockedAchievements } from './xpUtils'
import Confetti from './Confetti'

const CATEGORY_COLORS = {
  factory: '#ff6b35', career: '#00d9a3', family: '#ffa500', personal: '#4a90e2',
}
const PRIORITY_COLORS = { high: '#f44336', medium: '#ff9800', low: '#4caf50' }
const STATUS_CYCLE = { todo: 'in-progress', 'in-progress': 'done', done: 'todo' }
const STATUS_CONFIG = {
  todo: { icon: RadioButtonUncheckedIcon, color: '#9e9e9e', label: 'To Do' },
  'in-progress': { icon: HourglassTopIcon, color: '#ff9800', label: 'In Progress' },
  done: { icon: CheckCircleIcon, color: '#4caf50', label: 'Done' },
}

const DAYS_ORDER = [
  { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' }, { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
]

function scheduleSummary(recurrenceDays) {
  if (!recurrenceDays || recurrenceDays.length === 0) return 'Every day'
  const sorted = [...recurrenceDays].sort((a, b) => a - b)
  if (JSON.stringify(sorted) === JSON.stringify([1, 2, 3, 4, 5])) return 'Weekdays (Mon–Fri)'
  if (JSON.stringify(sorted) === JSON.stringify([0, 6])) return 'Weekends'
  return DAYS_ORDER.filter((d) => recurrenceDays.includes(d.value)).map((d) => d.label).join(', ')
}

// Animated XP number
function XPCounter({ value }) {
  const [display, setDisplay] = useState(value)
  const prev = useRef(value)
  useEffect(() => {
    if (value === prev.current) return
    const diff = value - prev.current
    const steps = 20
    const step = diff / steps
    let i = 0
    const timer = setInterval(() => {
      i++
      setDisplay((v) => Math.round(v + step))
      if (i >= steps) { clearInterval(timer); setDisplay(value); prev.current = value }
    }, 30)
    return () => clearInterval(timer)
  }, [value])
  return <>{display}</>
}

// Circular SVG progress ring
function ProgressRing({ pct, color, size = 72, stroke = 6 }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={pct === 100 ? '#4caf50' : color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
        />
      </svg>
      <Box sx={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Typography variant="caption" fontWeight={800} sx={{ color: pct === 100 ? '#4caf50' : color, fontSize: 13 }}>
          {pct}%
        </Typography>
      </Box>
    </Box>
  )
}

export default function TaskDetailModal({ task, open, onClose, onUpdate, onEdit }) {
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesDirty, setNotesDirty] = useState(false)
  const [togglingStatus, setTogglingStatus] = useState(false)
  const [newSubtask, setNewSubtask] = useState('')
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [togglingSubtask, setTogglingSubtask] = useState(null)
  const [deletingSubtask, setDeletingSubtask] = useState(null)
  const [confettiActive, setConfettiActive] = useState(false)
  const [newlyUnlocked, setNewlyUnlocked] = useState([])
  const prevAchievements = useRef([])
  const subtaskInputRef = useRef(null)

  useEffect(() => {
    if (task) { setNotes(task.notes || ''); setNotesDirty(false) }
  }, [task?._id])

  // Detect newly unlocked achievements
  useEffect(() => {
    if (!task) return
    const current = getUnlockedAchievements(task).map((a) => a.id)
    const prev = prevAchievements.current
    const fresh = current.filter((id) => !prev.includes(id))
    if (fresh.length) setNewlyUnlocked(fresh)
    prevAchievements.current = current
    const t = setTimeout(() => setNewlyUnlocked([]), 3000)
    return () => clearTimeout(t)
  }, [task?.subtasks])

  if (!task) return null

  const effectiveStatus = getEffectiveStatus(task)
  const statusCfg = STATUS_CONFIG[effectiveStatus]
  const StatusIcon = statusCfg.icon
  const catColor = CATEGORY_COLORS[task.category] || '#888'
  const streak = task.isRecurring ? computeStreak(task.completionDates, task.recurrenceDays) : 0
  const scheduledToday = isTodayScheduled(task)
  const isOverdue = effectiveStatus !== 'done' && !task.isRecurring && new Date(task.deadline) < new Date()
  const accentColor = isOverdue ? '#f44336' : effectiveStatus === 'in-progress' ? '#ff9800' : effectiveStatus === 'done' ? '#4caf50' : catColor

  const subtasks = task.subtasks || []
  const doneCount = subtasks.filter((s) => s.completed).length
  const totalCount = subtasks.length
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
  const xp = calcXP(task)
  const mxp = maxXP(task)
  const achievements = getUnlockedAchievements(task)

  const handleCycleStatus = async () => {
    if (togglingStatus || (task.isRecurring && !scheduledToday)) return
    setTogglingStatus(true)
    try {
      const res = await axios.patch(`/api/tasks/${task._id}`, { status: STATUS_CYCLE[effectiveStatus] })
      onUpdate(res.data)
    } catch (e) { console.error(e) }
    finally { setTogglingStatus(false) }
  }

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    try {
      const res = await axios.patch(`/api/tasks/${task._id}`, { notes })
      onUpdate(res.data)
      setNotesDirty(false)
    } catch (e) { console.error(e) }
    finally { setSavingNotes(false) }
  }

  const handleToggleSubtask = async (subtaskId, completed) => {
    setTogglingSubtask(subtaskId)
    try {
      const res = await axios.patch(`/api/tasks/${task._id}`, { _subtaskToggle: { subtaskId, completed } })
      const updated = res.data
      onUpdate(updated)
      const newDone = (updated.subtasks || []).filter((s) => s.completed).length
      if (newDone === updated.subtasks.length && updated.subtasks.length > 0) {
        setConfettiActive(true)
      }
    } catch (e) { console.error(e) }
    finally { setTogglingSubtask(null) }
  }

  const handleAddSubtask = async () => {
    const title = newSubtask.trim()
    if (!title) return
    setAddingSubtask(true)
    try {
      const res = await axios.patch(`/api/tasks/${task._id}`, { _subtaskAdd: { title } })
      onUpdate(res.data)
      setNewSubtask('')
      subtaskInputRef.current?.focus()
    } catch (e) { console.error(e) }
    finally { setAddingSubtask(false) }
  }

  const handleDeleteSubtask = async (subtaskId) => {
    setDeletingSubtask(subtaskId)
    try {
      const res = await axios.patch(`/api/tasks/${task._id}`, { _subtaskDelete: { subtaskId } })
      onUpdate(res.data)
    } catch (e) { console.error(e) }
    finally { setDeletingSubtask(null) }
  }

  const daysLeft = (() => {
    if (task.isRecurring) return null
    const now = new Date(); now.setHours(0, 0, 0, 0)
    const due = new Date(task.deadline); due.setHours(0, 0, 0, 0)
    return Math.round((due - now) / 86400000)
  })()

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
      <Box sx={{ height: 5, bgcolor: accentColor }} />

      {/* Header */}
      <Box sx={{ px: 3, pt: 2, pb: 1.5, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Box flex={1} minWidth={0}>
          <Box display="flex" alignItems="center" gap={0.75} flexWrap="wrap" mb={0.5}>
            <Chip label={task.category} size="small" sx={{ height: 20, fontSize: 11, fontWeight: 700, textTransform: 'capitalize', bgcolor: catColor + '18', color: catColor }} />
            <Chip label={task.priority} size="small" sx={{ height: 20, fontSize: 11, fontWeight: 700, textTransform: 'capitalize', bgcolor: PRIORITY_COLORS[task.priority] + '18', color: PRIORITY_COLORS[task.priority] }} />
            {task.isRecurring && (
              <Chip icon={<RepeatIcon sx={{ fontSize: 12, ml: 0.5 }} />} label={scheduleSummary(task.recurrenceDays)} size="small"
                sx={{ height: 20, fontSize: 11, fontWeight: 700, bgcolor: '#fff8e1', color: '#ff9800' }} />
            )}
          </Box>
          <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3, wordBreak: 'break-word' }}>
            {task.title}
          </Typography>
          {task.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{task.description}</Typography>
          )}
        </Box>
        <Box display="flex" gap={0.5} ml={1}>
          <Tooltip title="Edit task">
            <IconButton size="small" onClick={() => { onClose(); onEdit(task) }} sx={{ color: 'text.secondary' }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
        </Box>
      </Box>

      <Divider />

      {/* Status + streak/deadline */}
      <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.75, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Status
          </Typography>
          <Tooltip title={task.isRecurring && !scheduledToday ? 'Not scheduled today' : 'Click to advance'}>
            <Box onClick={handleCycleStatus} sx={{
              display: 'inline-flex', alignItems: 'center', gap: 1,
              px: 2, py: 0.75, borderRadius: 2,
              cursor: task.isRecurring && !scheduledToday ? 'default' : 'pointer',
              bgcolor: statusCfg.color + '18', border: `1px solid ${statusCfg.color}40`,
              transition: 'all 0.15s',
              '&:hover': { bgcolor: task.isRecurring && !scheduledToday ? statusCfg.color + '18' : statusCfg.color + '28' },
              opacity: togglingStatus ? 0.6 : 1,
            }}>
              {togglingStatus ? <CircularProgress size={18} sx={{ color: statusCfg.color }} />
                : <StatusIcon sx={{ fontSize: 20, color: statusCfg.color }} />}
              <Typography fontWeight={700} sx={{ color: statusCfg.color, fontSize: 14 }}>{statusCfg.label}</Typography>
            </Box>
          </Tooltip>
        </Box>

        {task.isRecurring ? (
          <Box textAlign="center">
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Streak</Typography>
            <Box display="flex" alignItems="center" gap={0.75}>
              <LocalFireDepartmentIcon sx={{ color: streak > 0 ? '#ff6b35' : '#ccc', fontSize: 30 }} />
              <Box>
                <Typography variant="h5" fontWeight={800} sx={{ color: streak > 0 ? '#ff6b35' : 'text.disabled', lineHeight: 1 }}>{streak}</Typography>
                <Typography variant="caption" color="text.secondary">days in a row</Typography>
              </Box>
            </Box>
          </Box>
        ) : (
          <Box textAlign="right">
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Deadline</Typography>
            <Typography variant="body2" fontWeight={600}>
              {new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Typography>
            {daysLeft !== null && effectiveStatus !== 'done' && (
              <Typography variant="caption" fontWeight={700} sx={{ color: daysLeft < 0 ? '#f44336' : daysLeft <= 3 ? '#ff9800' : '#4caf50' }}>
                {daysLeft < 0 ? `Overdue by ${Math.abs(daysLeft)}d` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* ─── SUBTASKS + GAMIFICATION ─── */}
      <Box sx={{ bgcolor: '#fafbfc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>

        {/* XP + progress header */}
        {totalCount > 0 && (
          <Box sx={{ px: 3, pt: 2, pb: 1.5, position: 'relative', overflow: 'hidden' }}>
            <Confetti active={confettiActive} onDone={() => setConfettiActive(false)} />

            <Box display="flex" alignItems="center" gap={2.5}>
              <ProgressRing pct={pct} color={catColor} />

              <Box flex={1}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2" fontWeight={700} color="text.primary">
                    {doneCount} / {totalCount} subtasks
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.5}
                    sx={{ px: 1.25, py: 0.25, borderRadius: 2, bgcolor: xp > 0 ? '#fff8e1' : '#f5f5f5', border: `1px solid ${xp > 0 ? '#ff980040' : '#e0e0e0'}` }}>
                    <EmojiEventsIcon sx={{ fontSize: 14, color: xp > 0 ? '#ff9800' : '#bdbdbd' }} />
                    <Typography variant="caption" fontWeight={800} sx={{ color: xp > 0 ? '#ff9800' : '#bdbdbd' }}>
                      <XPCounter value={xp} /> XP
                    </Typography>
                    {mxp > 0 && <Typography variant="caption" color="text.disabled">/ {mxp}</Typography>}
                  </Box>
                </Box>

                <LinearProgress
                  variant="determinate" value={pct}
                  sx={{
                    height: 8, borderRadius: 4,
                    bgcolor: '#e2e8f0',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: pct === 100 ? '#4caf50' : catColor,
                      borderRadius: 4,
                      transition: 'transform 0.5s ease',
                    },
                  }}
                />

                {/* Achievement chips */}
                {achievements.length > 0 && (
                  <Box display="flex" gap={0.5} flexWrap="wrap" mt={1}>
                    {achievements.map((a) => (
                      <Chip
                        key={a.id}
                        label={`${a.icon} ${a.label}`}
                        size="small"
                        sx={{
                          height: 20, fontSize: 10, fontWeight: 700,
                          bgcolor: a.color + '18', color: a.color,
                          border: `1px solid ${a.color}40`,
                          animation: newlyUnlocked.includes(a.id) ? 'achievementPop 0.4s ease' : 'none',
                          '@keyframes achievementPop': {
                            '0%': { transform: 'scale(0.5)', opacity: 0 },
                            '60%': { transform: 'scale(1.2)' },
                            '100%': { transform: 'scale(1)', opacity: 1 },
                          },
                        }}
                      />
                    ))}
                  </Box>
                )}

                {/* All done celebration message */}
                <Collapse in={pct === 100}>
                  <Box sx={{ mt: 0.75, px: 1.5, py: 0.5, borderRadius: 2, bgcolor: '#e8f5e9', border: '1px solid #a5d6a7', display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" fontWeight={700} color="success.dark">
                      🏆 All done! +{mxp} XP earned
                    </Typography>
                  </Box>
                </Collapse>
              </Box>
            </Box>
          </Box>
        )}

        {/* Subtask list */}
        <Box sx={{ px: 3, pb: 1 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
            Subtasks
          </Typography>

          {subtasks.length === 0 && (
            <Typography variant="body2" color="text.disabled" sx={{ mb: 1, fontStyle: 'italic', fontSize: 13 }}>
              No subtasks yet — break this task down into steps
            </Typography>
          )}

          <Box display="flex" flexDirection="column" gap={0.5} mb={1.5}>
            {subtasks.map((sub, idx) => (
              <Box
                key={sub._id}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.5,
                  px: 1, py: 0.5, borderRadius: 2,
                  bgcolor: sub.completed ? '#f1f8e9' : '#fff',
                  border: `1px solid ${sub.completed ? '#c8e6c9' : '#e2e8f0'}`,
                  transition: 'all 0.2s',
                  '&:hover .sub-delete': { opacity: 1 },
                }}
              >
                {togglingSubtask === sub._id
                  ? <CircularProgress size={16} sx={{ color: catColor, mx: 0.5 }} />
                  : (
                    <Checkbox
                      checked={sub.completed}
                      size="small"
                      onChange={(e) => handleToggleSubtask(sub._id, e.target.checked)}
                      sx={{
                        p: 0.25, color: catColor + '80',
                        '&.Mui-checked': { color: catColor },
                        '& .MuiSvgIcon-root': { fontSize: 18 },
                      }}
                    />
                  )
                }
                <Typography
                  variant="body2"
                  flex={1}
                  sx={{
                    fontSize: 13, textDecoration: sub.completed ? 'line-through' : 'none',
                    color: sub.completed ? 'text.disabled' : 'text.primary',
                    transition: 'all 0.2s',
                  }}
                >
                  {sub.title}
                </Typography>
                {sub.completed && (
                  <Typography variant="caption" color="success.main" fontWeight={600} sx={{ fontSize: 10, whiteSpace: 'nowrap' }}>
                    +{Math.round(15 * ({ high: 2, medium: 1.5, low: 1 }[task.priority] || 1))} XP
                  </Typography>
                )}
                <IconButton
                  className="sub-delete"
                  size="small"
                  disabled={deletingSubtask === sub._id}
                  onClick={() => handleDeleteSubtask(sub._id)}
                  sx={{ opacity: 0, transition: 'opacity 0.15s', color: '#f44336', p: 0.25 }}
                >
                  {deletingSubtask === sub._id
                    ? <CircularProgress size={14} sx={{ color: '#f44336' }} />
                    : <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                  }
                </IconButton>
              </Box>
            ))}
          </Box>

          {/* Add subtask input */}
          <Box display="flex" gap={1}>
            <TextField
              inputRef={subtaskInputRef}
              size="small"
              fullWidth
              placeholder="Add a subtask…"
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubtask() }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: 13, bgcolor: '#fff' } }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={handleAddSubtask}
              disabled={!newSubtask.trim() || addingSubtask}
              sx={{
                minWidth: 0, px: 1.5, borderRadius: 2,
                background: catColor, '&:hover': { background: catColor, filter: 'brightness(0.9)' },
                flexShrink: 0,
              }}
            >
              {addingSubtask ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <AddIcon sx={{ fontSize: 18 }} />}
            </Button>
          </Box>
        </Box>

        {/* 14-day grid for recurring */}
        {task.isRecurring && (
          <Box sx={{ px: 3, pt: 1, pb: 1.5, borderTop: '1px solid #e2e8f0' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
              Last 14 Days
            </Typography>
            <Box display="flex" gap={0.5} flexWrap="wrap">
              {Array.from({ length: 14 }, (_, i) => {
                const d = new Date(); d.setDate(d.getDate() - 13 + i); d.setHours(0, 0, 0, 0)
                const key = d.toISOString().slice(0, 10)
                const scheduled = isScheduledDay(d, task.recurrenceDays)
                const done = task.completionDates?.some((cd) => new Date(cd).toISOString().slice(0, 10) === key)
                const isToday = key === new Date().toISOString().slice(0, 10)
                return (
                  <Tooltip key={key} title={`${d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}${!scheduled ? ' (rest)' : done ? ' ✓' : ' ✗'}`}>
                    <Box sx={{
                      width: 30, height: 30, borderRadius: 1.5,
                      bgcolor: !scheduled ? '#f5f5f5' : done ? catColor : '#f1f5f9',
                      border: isToday ? `2px solid ${catColor}` : `2px solid ${!scheduled ? '#e0e0e0' : 'transparent'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: !scheduled ? 0.4 : 1,
                    }}>
                      {scheduled && done && <CheckCircleIcon sx={{ fontSize: 14, color: '#fff' }} />}
                      {scheduled && !done && isToday && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: catColor }} />}
                    </Box>
                  </Tooltip>
                )
              })}
            </Box>
          </Box>
        )}
      </Box>

      {/* Notes */}
      <Box sx={{ px: 3, py: 2 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
          Notes
        </Typography>
        <TextField
          multiline rows={3} fullWidth size="small"
          placeholder="Running notes, blockers, ideas…"
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setNotesDirty(true) }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: 14 } }}
        />
        {notesDirty && (
          <Box display="flex" justifyContent="flex-end" mt={1}>
            <Button
              size="small" variant="contained"
              startIcon={savingNotes ? <CircularProgress size={14} color="inherit" /> : <SaveIcon sx={{ fontSize: 14 }} />}
              onClick={handleSaveNotes} disabled={savingNotes}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, background: 'linear-gradient(135deg, #1a237e 0%, #0288d1 100%)', fontSize: 12 }}
            >
              {savingNotes ? 'Saving…' : 'Save Notes'}
            </Button>
          </Box>
        )}
      </Box>
    </Dialog>
  )
}
