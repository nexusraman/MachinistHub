'use client'

import React, { useEffect, useState } from 'react'
import AddIcon from '@mui/icons-material/Add'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import StorageIcon from '@mui/icons-material/Storage'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import axios from 'axios'
import { nanoid } from 'nanoid'
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, Grid, IconButton, InputLabel, MenuItem, Select,
  TextField, ToggleButton, ToggleButtonGroup, Typography, useMediaQuery, useTheme,
} from '@mui/material'
import dayjs from 'dayjs'
import SnackbarMessage from '../Utils/Snackbar'

const fanItems = {
  fanRotor: ["6'", "7'", '1"', '1.25"', "6' kit", '1" kit', '1.25 kit'],
  fanShaft: ['Farata Relxo', 'Farata Goltu', 'CK Goltu', 'CK Relxo', 'ABC', 'Dhokha'],
  submersibleSize: [3, 4, 4.5, 5, '5v4', 5.5, '5.5v4', 6, '6v4', '7v3', '7v4', 8, 9, 10, 11, 12, 13, 15, 'Repair'],
}

const defaultRow = { client: '', quantity: '', rotorSize: '', shaftSize: '', date: dayjs() }

const Label = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
    {children}
  </Typography>
)

const DataEntry = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [open, setOpen] = useState(false)
  const [clientList, setClientList] = useState<{ name: string; category: string }[]>([])
  const [selectedCategory, setSelectedCategory] = useState('submersible')
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })
  const [rows, setRows] = useState([{ ...defaultRow }])
  const [singleEntry, setSingleEntry] = useState({ category: 'submersible', client: '', quantity: '', rotorSize: '', shaftSize: '', date: dayjs() })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    axios.get('/api/client').then(res => setClientList(res.data.sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)))).catch(() => {})
  }, [])

  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => setSnackbar({ open: true, message, severity })
  const set = (field: string, value: unknown) => setSingleEntry(prev => ({ ...prev, [field]: value }))

  const isValid = () => {
    const s = singleEntry
    if (!s.client || !s.quantity || !s.rotorSize || !s.date) return false
    if (s.category === 'fan' && !s.shaftSize) return false
    return true
  }

  const handleSubmit = async () => {
    if (!isValid()) { showSnackbar('Please fill all required fields.', 'error'); return }
    setSubmitting(true)
    const s = singleEntry
    const payload = { subId: nanoid(), client: s.client, rotorSize: s.rotorSize, quantity: s.quantity, date: new Date(s.date as unknown as string), ...(s.category === 'fan' && { shaftSize: s.shaftSize }) }
    try {
      await axios.post(s.category === 'fan' ? '/api/fan' : '/api/submersible', payload)
      showSnackbar('Entry submitted successfully!')
      setSingleEntry({ category: s.category, client: '', quantity: '', rotorSize: '', shaftSize: '', date: dayjs() })
    } catch (err: unknown) { showSnackbar((err as Error).message || 'Something went wrong.', 'error') }
    finally { setSubmitting(false) }
  }

  const handleRowChange = (i: number, field: string, value: unknown) => { const next = [...rows]; (next[i] as Record<string, unknown>)[field] = value; setRows(next) }

  const handleMultiSubmit = async () => {
    for (const r of rows) {
      if (!r.client || !r.quantity || !r.rotorSize || !r.date || (selectedCategory === 'fan' && !r.shaftSize)) {
        showSnackbar('Please fill all required fields in each row.', 'error'); return
      }
    }
    const payload = rows.map(r => ({ subId: nanoid(), client: r.client, rotorSize: r.rotorSize, quantity: r.quantity, date: new Date(r.date as unknown as string), ...(selectedCategory === 'fan' && { shaftSize: r.shaftSize }) }))
    try {
      await axios.post(selectedCategory === 'fan' ? '/api/fan/multiple' : '/api/submersible/multiple', payload)
      showSnackbar('All entries submitted!')
      setRows([{ ...defaultRow }])
      setOpen(false)
    } catch (err: unknown) { showSnackbar((err as Error).message || 'Something went wrong.', 'error') }
  }

  const filteredClients = clientList.filter(c => c.category === singleEntry.category)

  return (
    <>
      <Box sx={{ bgcolor: '#fff', borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <Box sx={{ height: 4, bgcolor: '#1976d2' }} />

        {/* Card title */}
        <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid #f0f4f8' }}>
          <StorageIcon sx={{ color: '#1976d2' }} />
          <Typography fontWeight={700} fontSize={17}>Data Entry</Typography>
        </Box>

        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Category toggle — big tap targets */}
          <Box mb={3}>
            <Label>Category</Label>
            <ToggleButtonGroup value={singleEntry.category} exclusive onChange={(_, v) => v && set('category', v)} fullWidth sx={{ gap: 1 }}>
              {[
                { value: 'submersible', label: 'Submersible' },
                { value: 'fan', label: 'Fan' },
              ].map(opt => (
                <ToggleButton
                  key={opt.value} value={opt.value}
                  sx={{
                    flex: 1, py: 1.5, textTransform: 'none', fontWeight: 600, fontSize: 15, borderRadius: '10px !important', border: '1px solid #e2e8f0 !important',
                    '&.Mui-selected': { bgcolor: '#e3f2fd', color: '#1976d2', borderColor: '#1976d2 !important' },
                  }}
                >
                  {opt.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          {/* Client */}
          <Box mb={2.5}>
            <Label>Client</Label>
            <FormControl fullWidth>
              <Select value={singleEntry.client} onChange={e => set('client', e.target.value)} displayEmpty sx={{ borderRadius: 2 }}>
                <MenuItem value="" disabled><em style={{ color: '#aaa' }}>Select client…</em></MenuItem>
                {filteredClients.map((c, i) => <MenuItem key={i} value={c.name} sx={{ py: 1.5, fontSize: 15 }}>{c.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>

          {/* Size */}
          <Box mb={2.5}>
            <Label>{singleEntry.category === 'fan' ? 'Rotor Size' : 'Size'}</Label>
            <FormControl fullWidth>
              <Select value={singleEntry.rotorSize} onChange={e => set('rotorSize', e.target.value)} displayEmpty sx={{ borderRadius: 2 }}>
                <MenuItem value="" disabled><em style={{ color: '#aaa' }}>Select size…</em></MenuItem>
                {(singleEntry.category === 'fan' ? fanItems.fanRotor : fanItems.submersibleSize).map((x, i) => (
                  <MenuItem key={i} value={x} sx={{ py: 1.25, fontSize: 15 }}>{x}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Shaft size (fan only) */}
          {singleEntry.category === 'fan' && (
            <Box mb={2.5}>
              <Label>Shaft Size</Label>
              <FormControl fullWidth>
                <Select value={singleEntry.shaftSize} onChange={e => set('shaftSize', e.target.value)} displayEmpty sx={{ borderRadius: 2 }}>
                  <MenuItem value="" disabled><em style={{ color: '#aaa' }}>Select shaft size…</em></MenuItem>
                  {fanItems.fanShaft.map((x, i) => <MenuItem key={i} value={x} sx={{ py: 1.25, fontSize: 15 }}>{x}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
          )}

          {/* Qty + Date row */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6}>
              <Label>Quantity</Label>
              <TextField fullWidth type="number" placeholder="0" value={singleEntry.quantity} onChange={e => set('quantity', e.target.value)}
                inputProps={{ style: { fontSize: 16 } }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            </Grid>
            <Grid item xs={6}>
              <Label>Date</Label>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker value={singleEntry.date} onChange={v => set('date', v)}
                  renderInput={(params) => <TextField {...params} fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} inputProps={{ ...params.inputProps, style: { fontSize: 15 } }} />} />
              </LocalizationProvider>
            </Grid>
          </Grid>

          {/* Submit */}
          <Button fullWidth variant="contained" size="large" onClick={handleSubmit} disabled={!isValid() || submitting}
            startIcon={<CheckCircleIcon />}
            sx={{ py: 1.75, fontSize: 16, fontWeight: 700, borderRadius: 2.5, textTransform: 'none', bgcolor: '#1976d2' }}>
            {submitting ? 'Submitting…' : 'Submit Entry'}
          </Button>

          <Button fullWidth variant="text" startIcon={<AddIcon />} onClick={() => setOpen(true)}
            sx={{ mt: 1.5, textTransform: 'none', color: 'text.secondary', fontWeight: 600 }}>
            Add multiple entries
          </Button>
        </Box>
      </Box>

      {/* Multi-entry dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullScreen={isMobile} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <StorageIcon sx={{ color: '#1976d2' }} /> Add Multiple Entries
        </DialogTitle>
        <DialogContent dividers>
          <Box mb={2}>
            <Label>Category</Label>
            <ToggleButtonGroup value={selectedCategory} exclusive onChange={(_, v) => v && setSelectedCategory(v)} fullWidth sx={{ gap: 1 }}>
              {['submersible', 'fan'].map(v => (
                <ToggleButton key={v} value={v} sx={{ flex: 1, py: 1.25, textTransform: 'none', fontWeight: 600, borderRadius: '8px !important', border: '1px solid #e2e8f0 !important', '&.Mui-selected': { bgcolor: '#e3f2fd', color: '#1976d2', borderColor: '#1976d2 !important' } }}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          {rows.map((row, i) => (
            <Box key={i} sx={{ border: '1px solid #e2e8f0', borderRadius: 2.5, p: 2, mb: 2, bgcolor: '#fafafa' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Typography fontWeight={700} color="text.secondary" fontSize={13}>Row {i + 1}</Typography>
                <IconButton onClick={() => setRows(rows.filter((_, idx) => idx !== i))} color="error" size="small"><RemoveCircleOutlineIcon /></IconButton>
              </Box>
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <Label>Client</Label>
                  <FormControl fullWidth size="small">
                    <Select value={row.client} onChange={e => handleRowChange(i, 'client', e.target.value)} displayEmpty sx={{ borderRadius: 1.5 }}>
                      <MenuItem value="" disabled><em style={{ color: '#aaa' }}>Select…</em></MenuItem>
                      {clientList.filter(c => c.category === selectedCategory).map((c, j) => <MenuItem key={j} value={c.name}>{c.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Label>Qty</Label>
                  <TextField fullWidth size="small" type="number" value={row.quantity} onChange={e => handleRowChange(i, 'quantity', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Label>Size</Label>
                  <FormControl fullWidth size="small">
                    <Select value={row.rotorSize} onChange={e => handleRowChange(i, 'rotorSize', e.target.value)} displayEmpty sx={{ borderRadius: 1.5 }}>
                      <MenuItem value="" disabled><em style={{ color: '#aaa' }}>-</em></MenuItem>
                      {(selectedCategory === 'fan' ? fanItems.fanRotor : fanItems.submersibleSize).map((x, j) => <MenuItem key={j} value={x}>{x}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                {selectedCategory === 'fan' && (
                  <Grid item xs={12} sm={6}>
                    <Label>Shaft Size</Label>
                    <FormControl fullWidth size="small">
                      <Select value={row.shaftSize} onChange={e => handleRowChange(i, 'shaftSize', e.target.value)} displayEmpty sx={{ borderRadius: 1.5 }}>
                        <MenuItem value="" disabled><em style={{ color: '#aaa' }}>-</em></MenuItem>
                        {fanItems.fanShaft.map((x, j) => <MenuItem key={j} value={x}>{x}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                <Grid item xs={12} sm={6}>
                  <Label>Date</Label>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker value={row.date} onChange={v => handleRowChange(i, 'date', v)} renderInput={(params) => <TextField {...params} fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />} />
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

export default DataEntry
