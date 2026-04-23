'use client'

import { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, MenuItem, FormControl, FormLabel,
  RadioGroup, FormControlLabel, Radio, Box, Alert, Divider,
  Switch, Typography, ToggleButton, ToggleButtonGroup,
} from '@mui/material'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import RepeatIcon from '@mui/icons-material/Repeat'
import axios from 'axios'

const CATEGORIES = [
  { value: 'factory', label: 'Factory' },
  { value: 'career', label: 'Career' },
  { value: 'family', label: 'Family' },
  { value: 'personal', label: 'Personal' },
]

const PRIORITIES = [
  { value: 'high', label: 'High', color: '#f44336' },
  { value: 'medium', label: 'Medium', color: '#ff9800' },
  { value: 'low', label: 'Low', color: '#4caf50' },
]

const DAYS = [
  { value: 1, short: 'M', label: 'Mon' },
  { value: 2, short: 'T', label: 'Tue' },
  { value: 3, short: 'W', label: 'Wed' },
  { value: 4, short: 'T', label: 'Thu' },
  { value: 5, short: 'F', label: 'Fri' },
  { value: 6, short: 'S', label: 'Sat' },
  { value: 0, short: 'S', label: 'Sun' },
]

const PRESETS = [
  { label: 'Every day', days: [] },
  { label: 'Weekdays', days: [1, 2, 3, 4, 5] },
  { label: 'Weekends', days: [6, 0] },
  { label: '5×/week', days: [1, 2, 3, 4, 5] },
]

function daysLabel(recurrenceDays) {
  if (!recurrenceDays || recurrenceDays.length === 0) return 'Every day (7×/week)'
  if (recurrenceDays.length === 7) return 'Every day (7×/week)'
  const names = DAYS.filter((d) => recurrenceDays.includes(d.value)).map((d) => d.label)
  return `${names.join(', ')} (${recurrenceDays.length}×/week)`
}

const defaultForm = {
  title: '',
  description: '',
  category: 'personal',
  deadline: '',
  priority: 'medium',
  isRecurring: false,
  recurrenceDays: [],
}

export default function TaskForm({ open, onClose, onSave, editTask }) {
  const isEdit = Boolean(editTask)
  const [form, setForm] = useState(
    isEdit
      ? {
          title: editTask.title,
          description: editTask.description || '',
          category: editTask.category,
          deadline: editTask.deadline
            ? new Date(editTask.deadline).toISOString().slice(0, 10)
            : '',
          priority: editTask.priority,
          isRecurring: editTask.isRecurring || false,
          recurrenceDays: editTask.recurrenceDays || [],
        }
      : defaultForm
  )
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    setError('')
  }

  const toggleDay = (day) => {
    setForm((prev) => {
      const days = prev.recurrenceDays.includes(day)
        ? prev.recurrenceDays.filter((d) => d !== day)
        : [...prev.recurrenceDays, day]
      return { ...prev, recurrenceDays: days }
    })
  }

  const applyPreset = (days) => setForm((prev) => ({ ...prev, recurrenceDays: days }))

  const handleSubmit = async () => {
    if (!form.title.trim()) return setError('Title is required')
    if (!form.isRecurring && !form.deadline) return setError('Deadline is required')
    if (!form.isRecurring && !isEdit && new Date(form.deadline) <= new Date()) {
      return setError('Deadline must be in the future')
    }

    setLoading(true)
    const payload = {
      ...form,
      deadline: form.isRecurring && !form.deadline
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        : form.deadline,
    }

    try {
      if (isEdit) {
        const res = await axios.patch(`/api/tasks/${editTask._id}`, payload)
        onSave(res.data, 'edit')
      } else {
        const res = await axios.post('/api/tasks', payload)
        onSave(res.data, 'create')
      }
      onClose()
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <Box sx={{
        background: 'linear-gradient(135deg, #1a237e 0%, #0288d1 100%)',
        px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 1.5, color: '#fff',
      }}>
        <TaskAltIcon />
        <Box>
          <DialogTitle sx={{ p: 0, color: '#fff', fontWeight: 700, fontSize: 18 }}>
            {isEdit ? 'Edit Task' : 'New Task'}
          </DialogTitle>
          <Box sx={{ fontSize: 12, opacity: 0.8 }}>
            {isEdit ? 'Update task details' : 'Add a task to track'}
          </Box>
        </Box>
      </Box>

      <DialogContent sx={{ pt: 2.5, pb: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

        <TextField
          label="Title"
          value={form.title}
          onChange={set('title')}
          required fullWidth size="small"
          placeholder="What needs to be done?"
        />

        <TextField
          label="Description"
          value={form.description}
          onChange={set('description')}
          fullWidth multiline rows={2} size="small"
          placeholder="Optional details..."
        />

        <Box display="flex" gap={2}>
          <TextField
            select label="Category" value={form.category}
            onChange={set('category')} fullWidth size="small"
          >
            {CATEGORIES.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
          </TextField>

          <TextField
            label="Deadline" type="date" value={form.deadline}
            onChange={set('deadline')} fullWidth size="small"
            InputLabelProps={{ shrink: true }}
            disabled={form.isRecurring}
            helperText={form.isRecurring ? 'Recurring — no deadline' : ''}
          />
        </Box>

        <FormControl>
          <FormLabel sx={{ fontWeight: 600, fontSize: 13, mb: 0.5, color: 'text.secondary' }}>Priority</FormLabel>
          <RadioGroup row value={form.priority} onChange={set('priority')}>
            {PRIORITIES.map((p) => (
              <FormControlLabel
                key={p.value} value={p.value}
                control={<Radio size="small" sx={{ color: p.color + '80', '&.Mui-checked': { color: p.color } }} />}
                label={
                  <Box sx={{ fontSize: 13, fontWeight: form.priority === p.value ? 700 : 400, color: form.priority === p.value ? p.color : 'text.primary' }}>
                    {p.label}
                  </Box>
                }
              />
            ))}
          </RadioGroup>
        </FormControl>

        {/* Daily habit toggle */}
        <Box sx={{
          px: 1.5, py: 1, borderRadius: 2,
          bgcolor: form.isRecurring ? '#fff8e1' : '#f8fafc',
          border: `1px solid ${form.isRecurring ? '#ff980040' : '#e2e8f0'}`,
        }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <RepeatIcon sx={{ fontSize: 18, color: form.isRecurring ? '#ff9800' : 'text.disabled' }} />
              <Box>
                <Typography variant="body2" fontWeight={600} sx={{ color: form.isRecurring ? '#ff9800' : 'text.primary' }}>
                  Daily Habit
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {form.isRecurring ? daysLabel(form.recurrenceDays) : 'Resets each day — builds streaks'}
                </Typography>
              </Box>
            </Box>
            <Switch
              checked={form.isRecurring}
              onChange={(e) => setForm((prev) => ({
                ...prev,
                isRecurring: e.target.checked,
                deadline: e.target.checked ? '' : prev.deadline,
              }))}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#ff9800' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#ff9800' },
              }}
            />
          </Box>

          {/* Day picker — shown only when recurring */}
          {form.isRecurring && (
            <Box mt={1.5}>
              {/* Presets */}
              <Box display="flex" gap={0.75} mb={1.25} flexWrap="wrap">
                {PRESETS.map((p) => {
                  const active = JSON.stringify([...p.days].sort()) === JSON.stringify([...form.recurrenceDays].sort())
                  return (
                    <Button
                      key={p.label}
                      size="small"
                      variant={active ? 'contained' : 'outlined'}
                      onClick={() => applyPreset(p.days)}
                      sx={{
                        textTransform: 'none', fontSize: 11, py: 0.25, px: 1, borderRadius: 2,
                        borderColor: '#ff980060',
                        color: active ? '#fff' : '#ff9800',
                        bgcolor: active ? '#ff9800' : 'transparent',
                        '&:hover': { bgcolor: active ? '#e65100' : '#ff980014', borderColor: '#ff9800' },
                      }}
                    >
                      {p.label}
                    </Button>
                  )
                })}
              </Box>

              {/* Day toggles */}
              <Box display="flex" gap={0.75}>
                {DAYS.map((d) => {
                  const selected = form.recurrenceDays.length === 0 || form.recurrenceDays.includes(d.value)
                  return (
                    <Box
                      key={d.value}
                      onClick={() => toggleDay(d.value)}
                      sx={{
                        width: 34, height: 34, borderRadius: '50%',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', userSelect: 'none',
                        bgcolor: selected ? '#ff9800' : '#f5f5f5',
                        color: selected ? '#fff' : 'text.secondary',
                        fontWeight: 700, fontSize: 11,
                        transition: 'all 0.15s',
                        '&:hover': { bgcolor: selected ? '#e65100' : '#ffe0b2' },
                        border: selected ? '2px solid #e65100' : '2px solid transparent',
                      }}
                    >
                      {d.short}
                      <Box component="span" sx={{ fontSize: 8, lineHeight: 1, opacity: 0.85 }}>{d.label}</Box>
                    </Box>
                  )
                })}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                Click a day to toggle · {form.recurrenceDays.length === 0 ? 7 : form.recurrenceDays.length}× per week
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: 3, py: 1.5, gap: 1 }}>
        <Button onClick={onClose} disabled={loading} sx={{ textTransform: 'none', borderRadius: 2 }}>
          Cancel
        </Button>
        <Button
          variant="contained" onClick={handleSubmit} disabled={loading}
          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, background: 'linear-gradient(135deg, #1a237e 0%, #0288d1 100%)' }}
        >
          {loading ? 'Saving…' : isEdit ? 'Update Task' : 'Create Task'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
