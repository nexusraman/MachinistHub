'use client'

import React, { useState } from 'react'
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, IconButton, TextField, Typography, useMediaQuery, useTheme,
} from '@mui/material'
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import AddIcon from '@mui/icons-material/Add'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import AssignmentIcon from '@mui/icons-material/Assignment'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import dayjs, { Dayjs } from 'dayjs'
import axios from 'axios'
import SnackbarMessage from '../Utils/Snackbar'

type Snack = { open: boolean; severity: 'success' | 'error'; message: string }
type Row = { date: Dayjs; relatedTo: string; comment: string }
const defaultRow: Row = { date: dayjs(), relatedTo: '', comment: '' }

const Label = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
    {children}
  </Typography>
)

const DailyLogs = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [singleLog, setSingleLog] = useState<Row>({ ...defaultRow })
  const [multiRows, setMultiRows] = useState<Row[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [snackbar, setSnackbar] = useState<Snack>({ open: false, severity: 'success', message: '' })
  const [submitting, setSubmitting] = useState(false)

  const showSnack = (message: string, severity: 'success' | 'error' = 'success') => setSnackbar({ open: true, severity, message })
  const set = (field: string, val: unknown) => setSingleLog(p => ({ ...p, [field]: val }))
  const isValid = () => singleLog.date && singleLog.relatedTo.trim()

  const handleSubmit = async () => {
    if (!isValid()) { showSnack('Date and Related To are required.', 'error'); return }
    setSubmitting(true)
    try {
      await axios.post('/api/log', { date: singleLog.date.toDate(), relatedTo: singleLog.relatedTo, comment: singleLog.comment })
      showSnack('Log submitted!')
      setSingleLog({ ...defaultRow })
    } catch (err: unknown) { showSnack((err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || (err as Error).message || 'Error', 'error') }
    finally { setSubmitting(false) }
  }

  const handleRowChange = (idx: number, field: string, val: unknown) => { const next = [...multiRows]; (next[idx] as Record<string, unknown>)[field] = val; setMultiRows(next) }

  const handleMultiSubmit = async () => {
    for (let i = 0; i < multiRows.length; i++) {
      if (!multiRows[i].date || !multiRows[i].relatedTo.trim()) { showSnack(`Row ${i + 1}: fill Date and Related To.`, 'error'); return }
    }
    try {
      await axios.post('/api/log/multiple', multiRows.map(r => ({ date: r.date.toDate(), relatedTo: r.relatedTo, comment: r.comment })))
      showSnack('Logs submitted!')
      setMultiRows([])
      setDialogOpen(false)
    } catch (err: unknown) { showSnack((err as { response?: { data?: { message?: string } } })?.response?.data?.message || (err as Error).message || 'Error', 'error') }
  }

  return (
    <>
      <Box sx={{ bgcolor: '#fff', borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <Box sx={{ height: 4, bgcolor: '#00838f' }} />

        <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid #f0f4f8' }}>
          <AssignmentIcon sx={{ color: '#00838f' }} />
          <Typography fontWeight={700} fontSize={17}>Daily Logs</Typography>
        </Box>

        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Date */}
          <Box mb={2.5}>
            <Label>Date</Label>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker value={singleLog.date} onChange={v => set('date', v ?? dayjs())}
                renderInput={(params) => <TextField {...params} fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} inputProps={{ ...params.inputProps, style: { fontSize: 15 } }} />} />
            </LocalizationProvider>
          </Box>

          {/* Related To */}
          <Box mb={2.5}>
            <Label>Related To</Label>
            <TextField fullWidth placeholder="What is this log about?" value={singleLog.relatedTo} onChange={e => set('relatedTo', e.target.value)}
              inputProps={{ style: { fontSize: 16 } }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          </Box>

          {/* Comment */}
          <Box mb={3}>
            <Label>Comment (optional)</Label>
            <TextField fullWidth multiline rows={2} placeholder="Any additional notes…" value={singleLog.comment} onChange={e => set('comment', e.target.value)}
              inputProps={{ style: { fontSize: 15 } }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          </Box>

          <Button fullWidth variant="contained" size="large" onClick={handleSubmit} disabled={!isValid() || submitting}
            startIcon={<CheckCircleIcon />}
            sx={{ py: 1.75, fontSize: 16, fontWeight: 700, borderRadius: 2.5, textTransform: 'none', bgcolor: '#00838f', '&:hover': { bgcolor: '#006064' } }}>
            {submitting ? 'Submitting…' : 'Submit Log'}
          </Button>

          <Button fullWidth variant="text" startIcon={<AddIcon />}
            onClick={() => { setDialogOpen(true); if (multiRows.length === 0) setMultiRows([{ ...defaultRow }]) }}
            sx={{ mt: 1.5, textTransform: 'none', color: 'text.secondary', fontWeight: 600 }}>
            Add multiple logs
          </Button>
        </Box>
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullScreen={isMobile} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssignmentIcon sx={{ color: '#00838f' }} /> Add Multiple Logs
        </DialogTitle>
        <DialogContent dividers>
          {multiRows.length === 0 && (
            <Typography color="text.disabled" textAlign="center" py={2}>Use the button below to add rows.</Typography>
          )}
          {multiRows.map((row, idx) => (
            <Box key={idx} sx={{ border: '1px solid #e2e8f0', borderRadius: 2.5, p: 2, mb: 2, bgcolor: '#fafafa' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Typography fontWeight={700} color="text.secondary" fontSize={13}>Row {idx + 1}</Typography>
                <IconButton onClick={() => setMultiRows(multiRows.filter((_, i) => i !== idx))} color="error" size="small"><RemoveCircleOutlineIcon /></IconButton>
              </Box>
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={4}>
                  <Label>Date</Label>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker value={row.date} onChange={v => handleRowChange(idx, 'date', v ?? dayjs())} renderInput={(params) => <TextField {...params} fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />} />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Label>Related To</Label>
                  <TextField fullWidth size="small" value={row.relatedTo} onChange={e => handleRowChange(idx, 'relatedTo', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Label>Comment</Label>
                  <TextField fullWidth size="small" value={row.comment} onChange={e => handleRowChange(idx, 'comment', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
                </Grid>
              </Grid>
            </Box>
          ))}
          <Button fullWidth variant="outlined" startIcon={<AddIcon />} onClick={() => setMultiRows([...multiRows, { ...defaultRow }])} sx={{ textTransform: 'none', borderRadius: 2, py: 1.25 }}>
            Add Row
          </Button>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 2, gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none', flex: 1 }}>Cancel</Button>
          <Button onClick={handleMultiSubmit} variant="contained" sx={{ textTransform: 'none', flex: 2, py: 1.25, borderRadius: 2 }}>Submit All</Button>
        </DialogActions>
      </Dialog>

      <SnackbarMessage open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar(p => ({ ...p, open: false }))} />
    </>
  )
}

export default DailyLogs
