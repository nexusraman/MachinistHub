'use client'

import React, { useEffect, useState } from 'react'
import AddIcon from '@mui/icons-material/Add'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import RotateRightIcon from '@mui/icons-material/RotateRight'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CallReceivedIcon from '@mui/icons-material/CallReceived'
import SendIcon from '@mui/icons-material/Send'
import InventoryIcon from '@mui/icons-material/Inventory2'
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import axios from 'axios'
import {
  Box, Button, Chip, Divider, FormControl, Grid, IconButton, MenuItem, Paper,
  Select, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material'
import dayjs, { Dayjs } from 'dayjs'
import SnackbarMessage from '../Utils/Snackbar'

const rotorSizes = ["6'", "7'", '1"', '1.25"', "6' kit", '1" kit', '1.25 kit']
const shaftSizes = ['Small', 'Medium', 'Large', '6"', '7"', '8"', '10"', '12"']

type InventoryItem = { rotorSize: string; received: number; dispatched: number; available: number }
type ItemRow = { rotorSize: string; quantity: string; shaftSize: string }

const defaultItem = (): ItemRow => ({ rotorSize: '', quantity: '', shaftSize: '' })

const Label = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="caption" fontWeight={700} color="text.secondary"
    sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
    {children}
  </Typography>
)

const RotorEntry = () => {
  const [clients, setClients] = useState<{ name: string; category: string }[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [entryType, setEntryType] = useState<'received' | 'dispatched'>('received')

  // Shared fields
  const [client, setClient] = useState('')
  const [date, setDate] = useState<Dayjs>(dayjs())

  // Per-item rows
  const [items, setItems] = useState<ItemRow[]>([defaultItem()])

  const [submitting, setSubmitting] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })

  const fetchInventory = () =>
    axios.get('/api/fanRotor/inventory').then(res => setInventory(res.data)).catch(() => {})

  useEffect(() => {
    axios.get('/api/client').then(res =>
      setClients(res.data.sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name))))
    fetchInventory()
  }, [])

  const showSnack = (msg: string, severity: 'success' | 'error' = 'success') =>
    setSnackbar({ open: true, message: msg, severity })

  const setItem = (idx: number, field: keyof ItemRow, val: string) => {
    setItems(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r))
  }

  const addItem = () => setItems(prev => [...prev, defaultItem()])
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx))

  const isDispatched = entryType === 'dispatched'
  const accentColor = isDispatched ? '#6a1b9a' : '#2e7d32'

  const isFormValid = () => {
    if (!client) return false
    if (items.length === 0) return false
    return items.every(r => {
      if (!r.rotorSize || !r.quantity) return false
      if (isDispatched && !r.shaftSize) return false
      return true
    })
  }

  const handleSubmit = async () => {
    if (!isFormValid()) { showSnack('Fill all required fields in every row.', 'error'); return }
    setSubmitting(true)
    try {
      for (const item of items) {
        await axios.post('/api/fanRotor', {
          client,
          rotorSize: item.rotorSize,
          quantity: Number(item.quantity),
          type: entryType,
          shaftSize: isDispatched ? item.shaftSize : '',
          date: date.toDate(),
        })
      }
      const count = items.length
      showSnack(`${count} item${count > 1 ? 's' : ''} ${isDispatched ? 'dispatched' : 'received'} successfully.`)
      setItems([defaultItem()])
      fetchInventory()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
        || (err as Error).message || 'Something went wrong.'
      showSnack(msg, 'error')
    } finally { setSubmitting(false) }
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
          {/* Inventory summary */}
          {inventory.length > 0 && (
            <Paper elevation={0} sx={{ mb: 3, border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ px: 2, py: 1.25, bgcolor: '#f8fafc', display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #e2e8f0' }}>
                <InventoryIcon sx={{ fontSize: 16, color: '#546e7a' }} />
                <Typography fontWeight={700} fontSize={12} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Current Stock
                </Typography>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Size', 'Received', 'Dispatched', 'Available'].map(h => (
                      <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', py: 0.75, textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inventory.map(item => (
                    <TableRow key={item.rotorSize} sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: 13 }}>{item.rotorSize}</TableCell>
                      <TableCell sx={{ color: '#2e7d32', fontWeight: 600, fontSize: 13 }}>{item.received}</TableCell>
                      <TableCell sx={{ color: '#6a1b9a', fontWeight: 600, fontSize: 13 }}>{item.dispatched}</TableCell>
                      <TableCell>
                        <Chip label={item.available} size="small"
                          sx={{ fontWeight: 700, fontSize: 12, bgcolor: item.available > 0 ? '#e8f5e9' : '#ffebee', color: item.available > 0 ? '#2e7d32' : '#c62828' }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}

          {/* Entry type */}
          <Box mb={3}>
            <Label>Entry Type</Label>
            <ToggleButtonGroup value={entryType} exclusive
              onChange={(_, v) => { if (v) { setEntryType(v); setItems([defaultItem()]) } }}
              fullWidth sx={{ gap: 1 }}>
              <ToggleButton value="received" sx={{ flex: 1, py: 1.5, textTransform: 'none', fontWeight: 600, fontSize: 14, borderRadius: '10px !important', border: '1px solid #e2e8f0 !important', '&.Mui-selected': { bgcolor: '#e8f5e9', color: '#2e7d32', borderColor: '#2e7d32 !important' } }}>
                <CallReceivedIcon sx={{ mr: 0.75, fontSize: 18 }} /> Received from Client
              </ToggleButton>
              <ToggleButton value="dispatched" sx={{ flex: 1, py: 1.5, textTransform: 'none', fontWeight: 600, fontSize: 14, borderRadius: '10px !important', border: '1px solid #e2e8f0 !important', '&.Mui-selected': { bgcolor: '#f3e5f5', color: '#6a1b9a', borderColor: '#6a1b9a !important' } }}>
                <SendIcon sx={{ mr: 0.75, fontSize: 18 }} /> Dispatched to Client
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Client + Date — shared for all rows */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={7}>
              <Label>Client</Label>
              <FormControl fullWidth>
                <Select value={client} onChange={e => setClient(e.target.value)} displayEmpty sx={{ borderRadius: 2 }}>
                  <MenuItem value="" disabled><em style={{ color: '#aaa' }}>Select fan client…</em></MenuItem>
                  {fanClients.map((c, i) => (
                    <MenuItem key={i} value={c.name} sx={{ py: 1.25, fontSize: 15 }}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={5}>
              <Label>Date</Label>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker value={date} onChange={v => setDate(v ?? dayjs())}
                  renderInput={(params) => (
                    <TextField {...params} fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      inputProps={{ ...params.inputProps, style: { fontSize: 15 } }} />
                  )} />
              </LocalizationProvider>
            </Grid>
          </Grid>

          <Divider sx={{ mb: 2.5 }} />

          {/* Item rows */}
          <Box mb={1.5} display="flex" alignItems="center" justifyContent="space-between">
            <Typography fontWeight={700} fontSize={14} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Items
            </Typography>
            <Chip label={`${items.length} row${items.length > 1 ? 's' : ''}`} size="small" sx={{ bgcolor: '#f0f4f8', fontWeight: 600 }} />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
            {items.map((item, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end', p: 1.5, bgcolor: '#fafafa', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                {/* Rotor size */}
                <Box flex={isDispatched ? 2 : 3}>
                  {idx === 0 && <Label>Rotor Size</Label>}
                  <FormControl fullWidth size="small">
                    <Select value={item.rotorSize} onChange={e => setItem(idx, 'rotorSize', e.target.value)} displayEmpty sx={{ borderRadius: 1.5 }}>
                      <MenuItem value="" disabled><em style={{ color: '#aaa' }}>Size…</em></MenuItem>
                      {rotorSizes.map((s, i) => (
                        <MenuItem key={i} value={s}>
                          <Box display="flex" justifyContent="space-between" width="100%" alignItems="center" gap={1}>
                            <span>{s}</span>
                            {isDispatched && (() => {
                              const inv = inventory.find(inv => inv.rotorSize === s)
                              return inv ? (
                                <Chip label={`${inv.available}`} size="small"
                                  sx={{ fontSize: 10, fontWeight: 700, height: 18,
                                    bgcolor: inv.available > 0 ? '#e8f5e9' : '#ffebee',
                                    color: inv.available > 0 ? '#2e7d32' : '#c62828' }} />
                              ) : null
                            })()}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {isDispatched && item.rotorSize && (() => {
                    const inv = inventory.find(i => i.rotorSize === item.rotorSize)
                    if (!inv) return null
                    return (
                      <Typography variant="caption" sx={{ color: inv.available > 0 ? '#2e7d32' : '#c62828', fontWeight: 600 }}>
                        {inv.available} avail.
                      </Typography>
                    )
                  })()}
                </Box>

                {/* Shaft size — dispatched only */}
                {isDispatched && (
                  <Box flex={2}>
                    {idx === 0 && <Label>Shaft Size</Label>}
                    <FormControl fullWidth size="small">
                      <Select value={item.shaftSize} onChange={e => setItem(idx, 'shaftSize', e.target.value)} displayEmpty sx={{ borderRadius: 1.5 }}>
                        <MenuItem value="" disabled><em style={{ color: '#aaa' }}>Shaft…</em></MenuItem>
                        {shaftSizes.map((s, i) => <MenuItem key={i} value={s}>{s}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Box>
                )}

                {/* Quantity */}
                <Box flex={1}>
                  {idx === 0 && <Label>Qty</Label>}
                  <TextField fullWidth size="small" type="number" placeholder="0" value={item.quantity}
                    onChange={e => setItem(idx, 'quantity', e.target.value)}
                    inputProps={{ min: 1, style: { fontWeight: 700 } }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
                </Box>

                {/* Remove */}
                <Box>
                  {idx === 0 && <Box sx={{ mb: 0.5, height: 20 }} />}
                  <IconButton size="small" color="error" onClick={() => removeItem(idx)}
                    disabled={items.length === 1}>
                    <RemoveCircleOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Box>

          <Button variant="outlined" startIcon={<AddIcon />} onClick={addItem} size="small"
            sx={{ textTransform: 'none', borderRadius: 2, mb: 3, borderColor: accentColor, color: accentColor }}>
            Add another rotor
          </Button>

          <Button fullWidth variant="contained" size="large" onClick={handleSubmit}
            disabled={!isFormValid() || submitting}
            startIcon={isDispatched ? <SendIcon /> : <CheckCircleIcon />}
            sx={{ py: 1.75, fontSize: 16, fontWeight: 700, borderRadius: 2.5, textTransform: 'none',
              bgcolor: accentColor, '&:hover': { bgcolor: isDispatched ? '#4a148c' : '#1b5e20' } }}>
            {submitting ? 'Submitting…'
              : `${isDispatched ? 'Dispatch' : 'Record Received'} · ${items.length} item${items.length > 1 ? 's' : ''}`}
          </Button>
        </Box>
      </Box>

      <SnackbarMessage open={snackbar.open} message={snackbar.message} severity={snackbar.severity}
        onClose={() => setSnackbar(p => ({ ...p, open: false }))} />
    </>
  )
}

export default RotorEntry
