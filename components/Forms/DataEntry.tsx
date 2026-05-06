'use client'

import React, { useEffect, useState } from 'react'
import AddIcon from '@mui/icons-material/Add'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import StorageIcon from '@mui/icons-material/Storage'
import WaterDropIcon from '@mui/icons-material/WaterDrop'
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CallReceivedIcon from '@mui/icons-material/CallReceived'
import SendIcon from '@mui/icons-material/Send'
import InventoryIcon from '@mui/icons-material/Inventory2'
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import axios from 'axios'
import { nanoid } from 'nanoid'
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControl, Grid, IconButton, MenuItem, Paper,
  Select, Tab, Table, TableBody, TableCell, TableHead, TableRow,
  Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material'
import dayjs, { Dayjs } from 'dayjs'
import SnackbarMessage from '../Utils/Snackbar'

// ── constants ──────────────────────────────────────────────────────────────
const submersibleSizes = [3, 4, 4.5, 5, '5v4', 5.5, '5.5v4', 6, '6v4', '7v3', '7v4', 8, 9, 10, 11, 12, 13, 15, 'Repair']
const fanRotorSizes = ["6'", "7'", '1"', '1.25"', "6' kit", '1" kit', '1.25 kit']
const fanShaftSizes = ['Farata Relxo', 'Farata Goltu', 'CK Goltu', 'CK Relxo', 'ABC', 'Dhokha']
const rotorInventorySizes = ["6'", "7'", '1"', '1.25"', "6' kit", '1" kit', '1.25 kit']
const rotorShaftSizes = ['Small', 'Medium', 'Large', '6"', '7"', '8"', '10"', '12"']

type InventoryItem = { rotorSize: string; received: number; dispatched: number; available: number }
type RotorItemRow = { rotorSize: string; quantity: string; shaftSize: string }

const Label = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="caption" fontWeight={700} color="text.secondary"
    sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
    {children}
  </Typography>
)

// ── Submersible sub-form ───────────────────────────────────────────────────
const SubmersibleForm = ({ clients }: { clients: { name: string; category: string; active?: boolean }[] }) => {
  const subClients = clients.filter(c => c.category === 'submersible' && c.active !== false)
  const defaultRow = { client: '', quantity: '', rotorSize: '', date: dayjs() }
  const [entry, setEntry] = useState({ client: '', quantity: '', rotorSize: '', date: dayjs() })
  const [rows, setRows] = useState([{ ...defaultRow }])
  const [showMulti, setShowMulti] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })

  const set = (f: string, v: unknown) => setEntry(p => ({ ...p, [f]: v }))
  const showSnack = (message: string, severity: 'success' | 'error' = 'success') => setSnack({ open: true, message, severity })
  const isValid = () => !!(entry.client && entry.quantity && entry.rotorSize && entry.date)

  const handleSubmit = async () => {
    if (!isValid()) { showSnack('Fill all required fields.', 'error'); return }
    setSubmitting(true)
    try {
      await axios.post('/api/submersible', { subId: nanoid(), client: entry.client, rotorSize: entry.rotorSize, quantity: entry.quantity, date: new Date(entry.date as unknown as string) })
      showSnack('Submersible entry submitted!')
      setEntry({ client: '', quantity: '', rotorSize: '', date: dayjs() })
    } catch { showSnack('Something went wrong.', 'error') }
    finally { setSubmitting(false) }
  }

  const handleMultiSubmit = async () => {
    for (const r of rows) {
      if (!r.client || !r.quantity || !r.rotorSize || !r.date) { showSnack('Fill all fields in each row.', 'error'); return }
    }
    try {
      await axios.post('/api/submersible/multiple', rows.map(r => ({ subId: nanoid(), client: r.client, rotorSize: r.rotorSize, quantity: r.quantity, date: new Date(r.date as unknown as string) })))
      showSnack('All entries submitted!')
      setRows([{ ...defaultRow }]); setShowMulti(false)
    } catch { showSnack('Something went wrong.', 'error') }
  }

  const setRow = (i: number, f: string, v: unknown) => { const n = [...rows]; (n[i] as Record<string, unknown>)[f] = v; setRows(n) }

  return (
    <>
      {!showMulti && (
        <Box>
          <Box mb={2.5}>
            <Label>Client</Label>
            <FormControl fullWidth>
              <Select value={entry.client} onChange={e => set('client', e.target.value)} displayEmpty sx={{ borderRadius: 2 }}>
                <MenuItem value="" disabled><em style={{ color: '#aaa' }}>Select client…</em></MenuItem>
                {subClients.map((c, i) => <MenuItem key={i} value={c.name} sx={{ py: 1.25, fontSize: 15 }}>{c.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <Box mb={2.5}>
            <Label>Size</Label>
            <FormControl fullWidth>
              <Select value={entry.rotorSize} onChange={e => set('rotorSize', e.target.value)} displayEmpty sx={{ borderRadius: 2 }}>
                <MenuItem value="" disabled><em style={{ color: '#aaa' }}>Select size…</em></MenuItem>
                {submersibleSizes.map((s, i) => <MenuItem key={i} value={s} sx={{ py: 1.25, fontSize: 15 }}>{s}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6}>
              <Label>Quantity</Label>
              <TextField fullWidth type="number" placeholder="0" value={entry.quantity} onChange={e => set('quantity', e.target.value)}
                inputProps={{ style: { fontSize: 16 } }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            </Grid>
            <Grid item xs={6}>
              <Label>Date</Label>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker value={entry.date} onChange={v => set('date', v ?? dayjs())}
                  renderInput={params => <TextField {...params} fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} inputProps={{ ...params.inputProps, style: { fontSize: 15 } }} />} />
              </LocalizationProvider>
            </Grid>
          </Grid>
          <Button fullWidth variant="contained" size="large" onClick={handleSubmit} disabled={!isValid() || submitting}
            startIcon={<CheckCircleIcon />}
            sx={{ py: 1.75, fontSize: 16, fontWeight: 700, borderRadius: 2.5, textTransform: 'none', bgcolor: '#0288d1' }}>
            {submitting ? 'Submitting…' : 'Submit Entry'}
          </Button>
          <Button fullWidth variant="text" startIcon={<AddIcon />} onClick={() => setShowMulti(true)}
            sx={{ mt: 1.5, textTransform: 'none', color: 'text.secondary', fontWeight: 600 }}>
            Add multiple entries
          </Button>
        </Box>
      )}

      <Dialog open={showMulti} onClose={() => setShowMulti(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pb: 1 }}>Multiple Entries</DialogTitle>
        <DialogContent dividers sx={{ p: 2 }}>
          {rows.map((row, i) => (
            <Box key={i} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, p: 2, mb: 1.5, bgcolor: '#fafafa' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography fontWeight={700} color="text.secondary" fontSize={12}>Row {i + 1}</Typography>
                <IconButton size="small" color="error" onClick={() => setRows(rows.filter((_, j) => j !== i))}><RemoveCircleOutlineIcon fontSize="small" /></IconButton>
              </Box>
              <Grid container spacing={1.5}>
                <Grid item xs={12}>
                  <Label>Client</Label>
                  <FormControl fullWidth size="small">
                    <Select value={row.client} onChange={e => setRow(i, 'client', e.target.value)} displayEmpty sx={{ borderRadius: 1.5 }}>
                      <MenuItem value="" disabled><em style={{ color: '#aaa' }}>-</em></MenuItem>
                      {subClients.map((c, j) => <MenuItem key={j} value={c.name}>{c.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Label>Size</Label>
                  <FormControl fullWidth size="small">
                    <Select value={row.rotorSize} onChange={e => setRow(i, 'rotorSize', e.target.value)} displayEmpty sx={{ borderRadius: 1.5 }}>
                      <MenuItem value="" disabled><em style={{ color: '#aaa' }}>-</em></MenuItem>
                      {submersibleSizes.map((s, j) => <MenuItem key={j} value={s}>{s}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Label>Qty</Label>
                  <TextField fullWidth size="small" type="number" value={row.quantity} onChange={e => setRow(i, 'quantity', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Label>Date</Label>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker value={row.date} onChange={v => setRow(i, 'date', v ?? dayjs())} renderInput={params => <TextField {...params} fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />} />
                  </LocalizationProvider>
                </Grid>
              </Grid>
            </Box>
          ))}
          <Button variant="outlined" size="small" startIcon={<AddIcon />}
            onClick={() => setRows([...rows, { ...defaultRow, date: rows[rows.length - 1].date }])}
            sx={{ textTransform: 'none', borderRadius: 2 }}>
            Add Row
          </Button>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button onClick={() => setShowMulti(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleMultiSubmit} sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none', bgcolor: '#0288d1' }}>Submit All</Button>
        </DialogActions>
      </Dialog>
      <SnackbarMessage open={snack.open} message={snack.message} severity={snack.severity} onClose={() => setSnack(p => ({ ...p, open: false }))} />
    </>
  )
}

// ── Fan Rotors sub-form ────────────────────────────────────────────────────
const FanRotorsForm = ({ clients }: { clients: { name: string; category: string; active?: boolean }[] }) => {
  const fanClients = clients.filter(c => c.category === 'fan' && c.active !== false)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [entryType, setEntryType] = useState<'received' | 'dispatched'>('received')
  const [client, setClient] = useState('')
  const [date, setDate] = useState<Dayjs>(dayjs())
  const [items, setItems] = useState<RotorItemRow[]>([{ rotorSize: '', quantity: '', shaftSize: '' }])
  const [submitting, setSubmitting] = useState(false)
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })

  const fetchInventory = () => axios.get('/api/fanRotor/inventory').then(res => setInventory(res.data)).catch(() => {})
  useEffect(() => { fetchInventory() }, [])

  const showSnack = (msg: string, severity: 'success' | 'error' = 'success') => setSnack({ open: true, message: msg, severity })
  const setItem = (idx: number, f: keyof RotorItemRow, v: string) => setItems(p => p.map((r, i) => i === idx ? { ...r, [f]: v } : r))
  const isDispatched = entryType === 'dispatched'
  const accentColor = isDispatched ? '#6a1b9a' : '#2e7d32'

  const isValid = () => {
    if (!client) return false
    return items.every(r => r.rotorSize && r.quantity && (!isDispatched || r.shaftSize))
  }

  const handleSubmit = async () => {
    if (!isValid()) { showSnack('Fill all required fields.', 'error'); return }
    setSubmitting(true)
    try {
      for (const item of items) {
        await axios.post('/api/fanRotor', { client, rotorSize: item.rotorSize, quantity: Number(item.quantity), type: entryType, shaftSize: isDispatched ? item.shaftSize : '', date: date.toDate() })
      }
      showSnack(`${items.length} item(s) ${isDispatched ? 'dispatched' : 'received'}.`)
      setItems([{ rotorSize: '', quantity: '', shaftSize: '' }])
      fetchInventory()
    } catch (err: unknown) {
      showSnack((err as { response?: { data?: { error?: string } } }).response?.data?.error || (err as Error).message || 'Error', 'error')
    } finally { setSubmitting(false) }
  }

  return (
    <>
      {/* Entry type */}
      <Box mb={3}>
        <Label>Entry Type</Label>
        <ToggleButtonGroup value={entryType} exclusive onChange={(_, v) => { if (v) { setEntryType(v); setItems([{ rotorSize: '', quantity: '', shaftSize: '' }]) } }} fullWidth sx={{ gap: 1 }}>
          <ToggleButton value="received" sx={{ flex: 1, py: 1.25, textTransform: 'none', fontWeight: 600, fontSize: 13, borderRadius: '10px !important', border: '1px solid #e2e8f0 !important', '&.Mui-selected': { bgcolor: '#e8f5e9', color: '#2e7d32', borderColor: '#2e7d32 !important' } }}>
            <CallReceivedIcon sx={{ mr: 0.75, fontSize: 17 }} /> Received from Client
          </ToggleButton>
          <ToggleButton value="dispatched" sx={{ flex: 1, py: 1.25, textTransform: 'none', fontWeight: 600, fontSize: 13, borderRadius: '10px !important', border: '1px solid #e2e8f0 !important', '&.Mui-selected': { bgcolor: '#f3e5f5', color: '#6a1b9a', borderColor: '#6a1b9a !important' } }}>
            <SendIcon sx={{ mr: 0.75, fontSize: 17 }} /> Dispatched to Client
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Client + Date */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={7}>
          <Label>Client</Label>
          <FormControl fullWidth>
            <Select value={client} onChange={e => setClient(e.target.value)} displayEmpty sx={{ borderRadius: 2 }}>
              <MenuItem value="" disabled><em style={{ color: '#aaa' }}>Select fan client…</em></MenuItem>
              {fanClients.map((c, i) => <MenuItem key={i} value={c.name} sx={{ py: 1.25, fontSize: 15 }}>{c.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={5}>
          <Label>Date</Label>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker value={date} onChange={v => setDate(v ?? dayjs())}
              renderInput={params => <TextField {...params} fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} inputProps={{ ...params.inputProps, style: { fontSize: 15 } }} />} />
          </LocalizationProvider>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 2.5 }} />

      <Box mb={1.5} display="flex" alignItems="center" justifyContent="space-between">
        <Typography fontWeight={700} fontSize={13} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Items</Typography>
        <Chip label={`${items.length} row${items.length > 1 ? 's' : ''}`} size="small" sx={{ bgcolor: '#f0f4f8', fontWeight: 600 }} />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
        {items.map((item, idx) => (
          <Box key={idx} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end', p: 1.5, bgcolor: '#fafafa', borderRadius: 2, border: '1px solid #e2e8f0' }}>
            <Box flex={isDispatched ? 2 : 3}>
              {idx === 0 && <Label>Rotor Size</Label>}
              <FormControl fullWidth size="small">
                <Select value={item.rotorSize} onChange={e => setItem(idx, 'rotorSize', e.target.value)} displayEmpty sx={{ borderRadius: 1.5 }}>
                  <MenuItem value="" disabled><em style={{ color: '#aaa' }}>Size…</em></MenuItem>
                  {rotorInventorySizes.map((s, i) => (
                    <MenuItem key={i} value={s}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            {isDispatched && (
              <Box flex={2}>
                {idx === 0 && <Label>Shaft Size</Label>}
                <FormControl fullWidth size="small">
                  <Select value={item.shaftSize} onChange={e => setItem(idx, 'shaftSize', e.target.value)} displayEmpty sx={{ borderRadius: 1.5 }}>
                    <MenuItem value="" disabled><em style={{ color: '#aaa' }}>Shaft…</em></MenuItem>
                    {fanShaftSizes.map((s, i) => <MenuItem key={i} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
            )}
            <Box flex={1}>
              {idx === 0 && <Label>Qty</Label>}
              <TextField fullWidth size="small" type="number" placeholder="0" value={item.quantity}
                onChange={e => setItem(idx, 'quantity', e.target.value)}
                inputProps={{ min: 1, style: { fontWeight: 700 } }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
            </Box>
            <Box>
              {idx === 0 && <Box sx={{ mb: 0.5, height: 20 }} />}
              <IconButton size="small" color="error" onClick={() => setItems(p => p.filter((_, i) => i !== idx))} disabled={items.length === 1}>
                <RemoveCircleOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        ))}
      </Box>

      <Button variant="outlined" startIcon={<AddIcon />} size="small"
        onClick={() => setItems(p => [...p, { rotorSize: '', quantity: '', shaftSize: '' }])}
        sx={{ textTransform: 'none', borderRadius: 2, mb: 3, borderColor: accentColor, color: accentColor }}>
        Add another rotor
      </Button>

      <Button fullWidth variant="contained" size="large" onClick={handleSubmit} disabled={!isValid() || submitting}
        startIcon={isDispatched ? <SendIcon /> : <CheckCircleIcon />}
        sx={{ py: 1.75, fontSize: 16, fontWeight: 700, borderRadius: 2.5, textTransform: 'none', bgcolor: accentColor, '&:hover': { bgcolor: isDispatched ? '#4a148c' : '#1b5e20' } }}>
        {submitting ? 'Submitting…' : `${isDispatched ? 'Dispatch' : 'Record Received'} · ${items.length} item${items.length > 1 ? 's' : ''}`}
      </Button>

      <SnackbarMessage open={snack.open} message={snack.message} severity={snack.severity} onClose={() => setSnack(p => ({ ...p, open: false }))} />
    </>
  )
}

// ── Fan wrapper ────────────────────────────────────────────────────────────
const FanForm = ({ clients }: { clients: { name: string; category: string; active?: boolean }[] }) => (
  <FanRotorsForm clients={clients} />
)

// ── Main DataEntry ─────────────────────────────────────────────────────────
const DataEntry = () => {
  const [outerTab, setOuterTab] = useState(0)
  const [clients, setClients] = useState<{ name: string; category: string; active?: boolean }[]>([])

  useEffect(() => {
    axios.get('/api/client').then(res => setClients(res.data.sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)))).catch(() => {})
  }, [])

  return (
    <Box sx={{ bgcolor: '#fff', borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <Box sx={{ height: 4, bgcolor: '#1976d2' }} />
      <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid #f0f4f8' }}>
        <StorageIcon sx={{ color: '#1976d2' }} />
        <Typography fontWeight={700} fontSize={17}>Data Entry</Typography>
      </Box>

      {/* Outer tabs: Submersible | Fan */}
      <Box sx={{ borderBottom: '1px solid #e2e8f0', px: 1 }}>
        <Tabs value={outerTab} onChange={(_, v) => setOuterTab(v)} textColor="primary" indicatorColor="primary"
          sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 14, minHeight: 48 } }}>
          <Tab label={<Box display="flex" alignItems="center" gap={0.75}><WaterDropIcon fontSize="small" /><span>Submersible</span></Box>} />
          <Tab label={<Box display="flex" alignItems="center" gap={0.75}><ElectricBoltIcon fontSize="small" /><span>Fan</span></Box>} />
        </Tabs>
      </Box>

      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        {outerTab === 0 && <SubmersibleForm clients={clients} />}
        {outerTab === 1 && <FanForm clients={clients} />}
      </Box>
    </Box>
  )
}

export default DataEntry
