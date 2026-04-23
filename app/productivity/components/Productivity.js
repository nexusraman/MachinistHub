'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Box, Typography, Button, CircularProgress, Alert,
  MenuItem, TextField, Paper, Grid, Tabs, Tab, Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import HourglassTopIcon from '@mui/icons-material/HourglassTop'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import AssignmentIcon from '@mui/icons-material/Assignment'
import axios from 'axios'
import TaskCard from './TaskCard'
import TaskForm from './TaskForm'
import TaskDetailModal from './TaskDetailModal'
import { getEffectiveStatus } from './streakUtils'

const CATEGORY_TABS = [
  { value: 'all', label: 'All' },
  { value: 'factory', label: 'Factory', color: '#ff6b35' },
  { value: 'career', label: 'Career', color: '#00d9a3' },
  { value: 'family', label: 'Family', color: '#ffa500' },
  { value: 'personal', label: 'Personal', color: '#4a90e2' },
]

const SORT_OPTIONS = [
  { value: 'deadline', label: 'Deadline' },
  { value: 'priority', label: 'Priority' },
  { value: 'created', label: 'Newest' },
]

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }
const CATEGORY_COLORS = {
  factory: '#ff6b35', career: '#00d9a3', family: '#ffa500', personal: '#4a90e2',
}

// SVG ring for overall completion
function RingProgress({ pct, size = 88, stroke = 7, label, sublabel }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#fff" strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{pct}%</Typography>
        {sublabel && <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', mt: 0.25, textAlign: 'center', lineHeight: 1.2 }}>{sublabel}</Typography>}
      </Box>
    </Box>
  )
}

// Slim stat pill
function StatPill({ icon, value, label, color }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.25, borderRadius: 2.5, bgcolor: color + '0f', border: `1px solid ${color}22` }}>
      <Box sx={{ color, display: 'flex' }}>{icon}</Box>
      <Box>
        <Typography variant="h6" fontWeight={800} sx={{ color, lineHeight: 1 }}>{value}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>{label}</Typography>
      </Box>
    </Box>
  )
}

export default function Productivity() {
  const [tasks, setTasks] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState(0)
  const [sortBy, setSortBy] = useState('deadline')
  const [showDone, setShowDone] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [detailTask, setDetailTask] = useState(null)

  const activeCategory = CATEGORY_TABS[activeTab]?.value || 'all'

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get('/api/tasks/stats')
      setStats(res.data)
    } catch { /* non-critical */ }
  }, [])

  const fetchTasks = useCallback(async () => {
    try {
      const params = { sortBy }
      if (activeCategory !== 'all') params.category = activeCategory
      const res = await axios.get('/api/tasks', { params })
      setTasks(res.data)
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load tasks')
    }
  }, [activeCategory, sortBy])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchTasks(), fetchStats()]).finally(() => setLoading(false))
  }, [fetchTasks, fetchStats])

  // Client-side completion metrics (always fresh, includes subtasks)
  const progress = useMemo(() => {
    if (!tasks.length) return { taskPct: 0, subtaskPct: null, doneTasks: 0, totalSubtasks: 0, doneSubtasks: 0 }
    let doneTasks = 0, totalSubtasks = 0, doneSubtasks = 0
    tasks.forEach((t) => {
      if (getEffectiveStatus(t) === 'done') doneTasks++
      if (t.subtasks?.length) {
        totalSubtasks += t.subtasks.length
        doneSubtasks += t.subtasks.filter((s) => s.completed).length
      }
    })
    const taskPct = Math.round((doneTasks / tasks.length) * 100)
    const subtaskPct = totalSubtasks > 0 ? Math.round((doneSubtasks / totalSubtasks) * 100) : null
    return { taskPct, subtaskPct, doneTasks, totalSubtasks, doneSubtasks }
  }, [tasks])

  const handleSave = (task, mode) => {
    if (mode === 'create') setTasks((prev) => [task, ...prev])
    else setTasks((prev) => prev.map((t) => (t._id === task._id ? task : t)))
    fetchStats()
    setEditTask(null)
  }

  const handleUpdate = (updated) => {
    setTasks((prev) => prev.map((t) => (t._id === updated._id ? updated : t)))
    fetchStats()
  }

  const handleDelete = (id) => {
    setTasks((prev) => prev.filter((t) => t._id !== id))
    fetchStats()
  }

  const handleDetailUpdate = (updated) => {
    setTasks((prev) => prev.map((t) => (t._id === updated._id ? updated : t)))
    setDetailTask(updated)
    fetchStats()
  }

  const isDone = (t) => getEffectiveStatus(t) === 'done'

  const displayedTasks = tasks
    .filter((t) => showDone || !isDone(t))
    .sort((a, b) => {
      if (sortBy === 'priority') return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      if (sortBy === 'created') return new Date(b.createdAt) - new Date(a.createdAt)
      return new Date(a.deadline) - new Date(b.deadline)
    })

  const catCounts = tasks
    .filter((t) => showDone || !isDone(t))
    .reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + 1; return acc }, {})
  const totalVisible = Object.values(catCounts).reduce((a, b) => a + b, 0)

  // Pick which % to show in the ring: subtask % if any tasks have subtasks, else task %
  const ringPct = progress.subtaskPct !== null ? progress.subtaskPct : progress.taskPct
  const ringSublabel = progress.subtaskPct !== null ? 'subtasks\ndone' : 'tasks\ndone'

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh' }}>
      {/* ─── Header ─── */}
      <Box sx={{ background: 'linear-gradient(135deg, #1a237e 0%, #0288d1 100%)', color: '#fff', px: { xs: 2, sm: 4 }, pt: 3, pb: 2.5 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap">
          {/* Title + stats */}
          <Box flex={1} minWidth={0}>
            <Box display="flex" alignItems="center" gap={1.25} mb={1.5}>
              <TaskAltIcon sx={{ fontSize: 24, opacity: 0.9 }} />
              <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}>Productivity</Typography>
            </Box>

            {/* Completion dual bar */}
            <Box sx={{ maxWidth: 340 }}>
              <Box display="flex" justifyContent="space-between" mb={0.5}>
                <Typography sx={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}>
                  Tasks &nbsp;
                  <span style={{ opacity: 0.7 }}>{progress.doneTasks}/{tasks.length}</span>
                </Typography>
                <Typography sx={{ fontSize: 12, opacity: 0.85, fontWeight: 700 }}>{progress.taskPct}%</Typography>
              </Box>
              <Box sx={{ height: 6, borderRadius: 99, bgcolor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
                <Box sx={{ height: '100%', width: `${progress.taskPct}%`, bgcolor: '#fff', borderRadius: 99, transition: 'width 0.5s ease' }} />
              </Box>

              {progress.subtaskPct !== null && (
                <>
                  <Box display="flex" justifyContent="space-between" mt={1} mb={0.5}>
                    <Typography sx={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}>
                      Subtasks &nbsp;
                      <span style={{ opacity: 0.7 }}>{progress.doneSubtasks}/{progress.totalSubtasks}</span>
                    </Typography>
                    <Typography sx={{ fontSize: 12, opacity: 0.85, fontWeight: 700 }}>{progress.subtaskPct}%</Typography>
                  </Box>
                  <Box sx={{ height: 6, borderRadius: 99, bgcolor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: `${progress.subtaskPct}%`, bgcolor: 'rgba(255,255,255,0.85)', borderRadius: 99, transition: 'width 0.5s ease' }} />
                  </Box>
                </>
              )}
            </Box>
          </Box>

          {/* Ring + add button */}
          <Box display="flex" flexDirection="column" alignItems="center" gap={1.5}>
            <RingProgress pct={ringPct} sublabel={ringSublabel} />
            <Button
              variant="contained"
              startIcon={<AddIcon sx={{ fontSize: 18 }} />}
              onClick={() => setFormOpen(true)}
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 700,
                textTransform: 'none', borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.35)', fontSize: 13,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' },
              }}
            >
              New Task
            </Button>
          </Box>
        </Box>
      </Box>

      {/* ─── Stat pills ─── */}
      <Box sx={{ px: { xs: 2, sm: 4 }, py: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        {error && <Alert severity="error" sx={{ width: '100%', mb: 1 }}>{error}</Alert>}
        <StatPill icon={<HourglassTopIcon sx={{ fontSize: 20 }} />} value={stats?.inProgressTasks ?? '—'} label="In Progress" color="#ff9800" />
        <StatPill icon={<CheckCircleOutlineIcon sx={{ fontSize: 20 }} />} value={stats?.completedTasks ?? '—'} label="Done" color="#4caf50" />
        <StatPill icon={<WarningAmberIcon sx={{ fontSize: 20 }} />} value={stats?.overdueTasks ?? '—'} label="Overdue" color={(stats?.overdueTasks ?? 0) > 0 ? '#f44336' : '#9e9e9e'} />

        {/* Category breakdown */}
        {stats?.tasksByCategory && Object.entries(stats.tasksByCategory).map(([cat, count]) => (
          <Tooltip key={cat} title={`${count} ${cat} task${count !== 1 ? 's' : ''}`}>
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 0.75,
              px: 1.5, py: 1, borderRadius: 2.5,
              bgcolor: (CATEGORY_COLORS[cat] || '#888') + '12',
              border: `1px solid ${(CATEGORY_COLORS[cat] || '#888')}25`,
              cursor: 'default',
            }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: CATEGORY_COLORS[cat] || '#888' }} />
              <Typography variant="caption" fontWeight={700} sx={{ color: CATEGORY_COLORS[cat] || '#888', textTransform: 'capitalize', fontSize: 12 }}>
                {cat} <span style={{ opacity: 0.7 }}>{count}</span>
              </Typography>
            </Box>
          </Tooltip>
        ))}
      </Box>

      {/* ─── Sticky tab + controls ─── */}
      <Box sx={{ px: { xs: 2, sm: 4 }, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 64, zIndex: 10 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            textColor="primary"
            indicatorColor="primary"
            sx={{
              minHeight: 44,
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 44, fontSize: 13, px: 1.5 },
              '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
            }}
          >
            {CATEGORY_TABS.map((tab, i) => {
              const count = tab.value === 'all' ? totalVisible : (catCounts[tab.value] || 0)
              return (
                <Tab key={tab.value} label={
                  <Box display="flex" alignItems="center" gap={0.6}>
                    {tab.color && <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: tab.color }} />}
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <Box component="span" sx={{
                        px: 0.65, borderRadius: 99, fontSize: 10, fontWeight: 700, lineHeight: '16px',
                        bgcolor: activeTab === i ? '#1a237e' : '#e2e8f0',
                        color: activeTab === i ? '#fff' : '#64748b',
                      }}>
                        {count}
                      </Box>
                    )}
                  </Box>
                } />
              )
            })}
          </Tabs>

          <Box display="flex" gap={0.75} alignItems="center" sx={{ py: 0.5 }}>
            <Box
              onClick={() => setShowDone((v) => !v)}
              sx={{
                px: 1.25, py: 0.5, borderRadius: 2, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                bgcolor: showDone ? '#e3f2fd' : 'transparent',
                color: showDone ? '#0288d1' : '#64748b',
                border: `1px solid ${showDone ? '#0288d1' : '#e2e8f0'}`,
                userSelect: 'none', transition: 'all 0.15s',
              }}
            >
              {showDone ? '✓ Done' : 'Show Done'}
            </Box>
            <TextField
              select size="small" value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              sx={{ minWidth: 105, '& .MuiInputBase-input': { fontSize: 12, py: 0.6 }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            >
              {SORT_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
          </Box>
        </Box>
      </Box>

      {/* ─── Task list ─── */}
      <Box sx={{ px: { xs: 2, sm: 4 }, py: 2.5 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
        ) : displayedTasks.length === 0 ? (
          <Box display="flex" flexDirection="column" alignItems="center" py={8} color="text.secondary">
            <AssignmentIcon sx={{ fontSize: 48, mb: 1.5, opacity: 0.2 }} />
            <Typography variant="h6" fontWeight={600} gutterBottom>No tasks here</Typography>
            <Typography variant="body2" mb={2.5} color="text.disabled">
              {activeCategory === 'all' ? 'Create your first task to get started.' : `No ${activeCategory} tasks yet.`}
            </Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}
              sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>
              New Task
            </Button>
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" gap={1.25}>
            {displayedTasks.map((task) => (
              <TaskCard key={task._id} task={task}
                onUpdate={handleUpdate} onDelete={handleDelete}
                onEdit={(t) => { setEditTask(t); setFormOpen(true) }}
                onClick={setDetailTask}
              />
            ))}
          </Box>
        )}
      </Box>

      {formOpen && (
        <TaskForm open={formOpen}
          onClose={() => { setFormOpen(false); setEditTask(null) }}
          onSave={handleSave} editTask={editTask}
        />
      )}

      <TaskDetailModal
        task={detailTask} open={Boolean(detailTask)}
        onClose={() => setDetailTask(null)}
        onUpdate={handleDetailUpdate}
        onEdit={(task) => { setDetailTask(null); setEditTask(task); setFormOpen(true) }}
      />
    </Box>
  )
}
