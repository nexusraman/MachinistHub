'use client'

import React, { useEffect, useState } from 'react'
import AddIcon from '@mui/icons-material/Add'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import RotateRightIcon from '@mui/icons-material/RotateRight'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import axios from 'axios'
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, Grid, IconButton, MenuItem, Select,
  TextField, Typography, useMediaQuery, useTheme,
} from '@mui/material'
import dayjs from 'dayjs'
import SnackbarMessage from '../Utils/Snackbar'

const rotorSizes = ["6'", "7'", '1"', '1.25"', "6' kit", '1" kit', '1.25 kit']
const defaultRow = { client: '', from: '', rotorSize: '', quantity: '', date: dayjs() }

const Label = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
    {children}
  </Typography>
)

const RotorEntry = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [clients, setClients] = useState<{ name: string; category: string }[]>([])
  const [singleClient, setSingleClient] = useState('')
  const [singleFrom, setSingleFrom] = useState('')
  const [singleRotorSize, setSingleRotorSize] = useState('')
  const [singleQuantity, setSingleQuantity] = useState('')
  const [singleDate, setSingleDate] = useState(dayjs())
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState([{ ...defaultRow }])
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    axios.get('/api/client').then(res => setClients(res.data.sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name))))
  }, [])

  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => setSnackbar({ open: true, message, severity })
  const isValid = () => singleClient && singleFrom && singleRotorSize && singleQuantity && singleDate

  const handleSubmit = async () => {
    if (!isValid()) { showSnackbar('Please fill all fields.', 'error'); return }
    setSubmitting(true)
    try {
      await axios.post('/api/fanRotor', { client: singleClient, from: singleFrom, rotorSize: singleRotorSize, quantity: singleQuantity, date: new Date(singleDate as unknown as string) })
      showSnackbar('Rotor entry submitted successfully')
      setSingleClient(''); setSingleFrom(''); setSingleRotorSize(''); setSingleQuantity(''); setSingleDate(dayjs())
    } catch (err: unknown) { showSnackbar((err as Error).message || 'Something went wrong.', 'error') }
    finally { setSubmitting(false) }
  }

  const handleRowChange = (idx: number, field: string, val: unknown) => { const next = [...rows]; (next[idx] as Record<string, unknown>)[field] = val; setRows(next) }

  const handleMultiSubmit = async () => {
    for (let i = 0; i < rows.length; i++) {
      const { client, from, rotorSize, quantity, date } = rows[i]
      if (!client || !from || !rotorSize || !quantity || !date) { showSnackbar(`Fill all fields in row ${i + 1}.`, 'error'); return }
    }
    try {
      for (const row of rows) {
        await axios.post('/api/fanRotor', { client: row.client, from: row.from, rotorSize: row.rotorSize, quantity: row.quantity, date: new Date(row.date as unknown as string) })
      }
      showSnackbar('All rotor entries submitted!')
      setRows([{ ...defaultRow }])
      setOpen(false)
    } catch (err: unknown) { showSnackbar((err as Error).message || 'Something went wrong.', 'error') }
  }

  const fanClients = clients.filter(c => c.category === 'fan')

  return (
    <>
      <Box sx={{ bgcolor: '#fff', borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <Box sx={{ height: 4, bgcolor: '#f57c00' }} />

        <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid #f0f4f8' }}>
          <RotateRightIcon sx={{ color: '#f57c00' }} />
          <Typography fontWeight={700} fontSize={17}>Rotor Entry</Typography>
        </Box>

        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Client */}
          <Box mb={2.5}>
            <Label>Client</Label>
            <FormControl fullWidth>
              <Select value={singleClient} onChange={e => setSingleClient(e.target.value)} displayEmpty sx={{ borderRadius: 2 }}>
                <MenuItem value="" disabled><em style={{ color: '#aaa' }}>Select client…</em></MenuItem>
                {fanClients.map((c, i) => <MenuItem key={i} value={c.name} sx={{ py: 1.5, fontSize: 15 }}>{c.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>

          {/* From */}
          <Box mb={2.5}>
            <Label>From</Label>
            <TextField fullWidth placeholder="Source / supplier name" value={singleFrom} onChange={e => setSingleFrom(e.target.value)}
              inputProps={{ style: { fontSize: 16 } }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          </Box>

          {/* Rotor size */}
          <Box mb={2.5}>
            <Label>Rotor Size</Label>
            <FormControl fullWidth>
              <Select value={singleRotorSize} onChange={e => setSingleRotorSize(e.target.value)} displayEmpty sx={{ borderRadius: 2 }}>
                <MenuItem value="" disabled><em style={{ color: '#aaa' }}>Select size…</em></MenuItem>
                {rotorSizes.map((s, i) => <MenuItem key={i} value={s} sx={{ py: 1.25, fontSize: 15 }}>{s}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>

          {/* Qty + Date */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6}>
              <Label>Quantity</Label>
              <TextField fullWidth type="number" placeholder="0" value={singleQuantity} onChange={e => setSingleQuantity(e.target.value)}
                inputProps={{ style: { fontSize: 16 } }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            </Grid>
            <Grid item xs={6}>
              <Label>Date</Label>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker value={singleDate} onChange={v => setSingleDate(v ?? dayjs())}
                  renderInput={(params) => <TextField {...params} fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} inputProps={{ ...params.inputProps, style: { fontSize: 15 } }} />} />
              </LocalizationProvider>
            </Grid>
          </Grid>

          <Button fullWidth variant="contained" size="large" onClick={handleSubmit} disabled={!isValid() || submitting}
            startIcon={<CheckCircleIcon />}
            sx={{ py: 1.75, fontSize: 16, fontWeight: 700, borderRadius: 2.5, textTransform: 'none', bgcolor: '#f57c00', '&:hover': { bgcolor: '#e65100' } }}>
            {submitting ? 'Submitting…' : 'Submit Entry'}
          </Button>

          <Button fullWidth variant="text" startIcon={<AddIcon />} onClick={() => setOpen(true)}
            sx={{ mt: 1.5, textTransform: 'none', color: 'text.secondary', fontWeight: 600 }}>
            Add multiple entries
          </Button>
        </Box>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} fullScreen={isMobile} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RotateRightIcon sx={{ color: '#f57c00' }} /> Add Multiple Rotor Entries
        </DialogTitle>
        <DialogContent dividers>
          {rows.map((row, idx) => (
            <Box key={idx} sx={{ border: '1px solid #e2e8f0', borderRadius: 2.5, p: 2, mb: 2, bgcolor: '#fafafa' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Typography fontWeight={700} color="text.secondary" fontSize={13}>Row {idx + 1}</Typography>
                <IconButton onClick={() => setRows(rows.filter((_, i) => i !== idx))} color="error" size="small"><RemoveCircleOutlineIcon /></IconButton>
              </Box>
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <Label>Client</Label>
                  <FormControl fullWidth size="small">
                    <Select value={row.client} onChange={e => handleRowChange(idx, 'client', e.target.value)} displayEmpty sx={{ borderRadius: 1.5 }}>
                      <MenuItem value="" disabled><em style={{ color: '#aaa' }}>Select…</em></MenuItem>
                      {fanClients.map((c, i) => <MenuItem key={i} value={c.name}>{c.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Label>From</Label>
                  <TextField fullWidth size="small" value={row.from} onChange={e => handleRowChange(idx, 'from', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Label>Rotor Size</Label>
                  <FormControl fullWidth size="small">
                    <Select value={row.rotorSize} onChange={e => handleRowChange(idx, 'rotorSize', e.target.value)} displayEmpty sx={{ borderRadius: 1.5 }}>
                      <MenuItem value="" disabled><em style={{ color: '#aaa' }}>-</em></MenuItem>
                      {rotorSizes.map((s, i) => <MenuItem key={i} value={s}>{s}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Label>Qty</Label>
                  <TextField fullWidth size="small" type="number" value={row.quantity} onChange={e => handleRowChange(idx, 'quantity', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Label>Date</Label>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker value={row.date} onChange={nv => handleRowChange(idx, 'date', nv ?? dayjs())} renderInput={(params) => <TextField {...params} fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />} />
                  </LocalizationProvider>
                </Grid>
              </Grid>
            </Box>
          ))}
          <Button fullWidth variant="outlined" startIcon={<AddIcon />} onClick={() => setRows([...rows, { ...defaultRow }])} sx={{ textTransform: 'none', borderRadius: 2, py: 1.25 }}>
            Add Row
          </Button>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 2, gap: 1 }}>
          <Button onClick={() => setOpen(false)} sx={{ textTransform: 'none', flex: 1 }}>Cancel</Button>
          <Button onClick={handleMultiSubmit} variant="contained" sx={{ textTransform: 'none', flex: 2, py: 1.25, borderRadius: 2 }}>Submit All</Button>
        </DialogActions>
      </Dialog>

      <SnackbarMessage open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar(p => ({ ...p, open: false }))} />
    </>
  )
}

export default RotorEntry
