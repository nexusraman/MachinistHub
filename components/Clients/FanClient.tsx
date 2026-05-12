'use client'

import React, { useEffect, useState, useMemo } from 'react'
import {
  Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, Grid, IconButton, InputAdornment, MenuItem, Paper, Select,
  Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, TextField, Tooltip, Typography,
} from '@mui/material'
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt'
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn'
import InventoryIcon from '@mui/icons-material/Inventory'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/DeleteOutline'
import PriceChangeIcon from '@mui/icons-material/PriceChange'
import AddIcon from '@mui/icons-material/Add'
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs, { Dayjs } from 'dayjs'
import axios from 'axios'

const INDIGO = '#3f51b5'
const INDIGO_DARK = '#283593'
const INDIGO_MID = '#3949ab'
const INDIGO_LIGHT = '#e8eaf6'

const rotorSizes = ["6'", "7'", '1"', '1.25"', "6' kit", '1" kit', '1.25 kit']

interface FanRate { shaftSize: string; rate: number; updatedAt?: string }
interface DispatchEntry { _id?: string; rotorSize: string; shaftSize: string; rate: number; quantity: number; date: string }
interface Payment { paymentId?: string; date: string; amount: number; medium?: string; transferMethod?: string; comment?: string }
interface Client {
  _id: string
  name: string
  balance: number
  calculatedBalance?: number
  fanRates?: FanRate[]
  payments?: Payment[]
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtCur = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN')}`

function periodBounds(period: 'week' | 'month' | 'year') {
  const now = new Date()
  if (period === 'week') {
    const start = new Date(now); start.setDate(now.getDate() - 6); start.setHours(0, 0, 0, 0)
    return { start, end: now }
  }
  if (period === 'month') return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now }
  return { start: new Date(now.getFullYear(), 0, 1), end: now }
}

const HeadCell = ({ children }: { children: React.ReactNode }) => (
  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, py: 1.25, bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
    {children}
  </TableCell>
)

const Label = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="caption" fontWeight={700} color="text.secondary"
    sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5, display: 'block', fontSize: 11 }}>
    {children}
  </Typography>
)

const BalanceEditor = ({ balance, clientId, onSave }: { balance: number; clientId: string; onSave: (v: number) => void }) => {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  const isPaid = balance <= 0

  const save = async () => {
    setSaving(true)
    try {
      await axios.patch(`/api/client/${clientId}`, { calculatedBalance: Number(input) })
      onSave(Number(input))
      setEditing(false)
    } finally { setSaving(false) }
  }

  if (editing) return (
    <Box display="flex" alignItems="center" gap={0.75}>
      <TextField
        size="small" type="number" value={input} onChange={e => setInput(e.target.value)}
        autoFocus onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
        InputProps={{ startAdornment: <InputAdornment position="start"><Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>₹</Typography></InputAdornment> }}
        sx={{ width: 130, '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.15)', '& fieldset': { borderColor: 'rgba(255,255,255,0.4)' } }, '& input': { color: '#fff', fontWeight: 700, fontSize: 16, py: 0.75 } }} />
      <Button size="small" variant="contained" onClick={save} disabled={saving}
        sx={{ minWidth: 0, px: 1.5, py: 0.5, fontSize: 12, textTransform: 'none', borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.25)', '&:hover': { bgcolor: 'rgba(255,255,255,0.35)' }, boxShadow: 'none' }}>
        {saving ? '…' : 'Save'}
      </Button>
      <Button size="small" onClick={() => setEditing(false)}
        sx={{ minWidth: 0, px: 1, py: 0.5, fontSize: 12, textTransform: 'none', color: 'rgba(255,255,255,0.7)', borderRadius: 1.5 }}>
        ✕
      </Button>
    </Box>
  )

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={0.5}>
        <Typography variant="h6" fontWeight={700} sx={{ color: isPaid ? '#ccff90' : '#ff8a80' }}>
          {fmtCur(balance)}
        </Typography>
        <IconButton size="small" onClick={() => { setInput(String(balance)); setEditing(true) }}
          sx={{ color: 'rgba(255,255,255,0.5)', p: 0.25, '&:hover': { color: '#fff' } }}>
          <EditIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Box>
      <Typography variant="caption" sx={{ opacity: 0.8 }}>Balance Due</Typography>
    </Box>
  )
}

const FanClient = ({ client: initialClient }: { client: Client }) => {
  const today = new Date().toISOString().split('T')[0]
  const [dateFilter, setDateFilter] = useState({ from: '', to: today })
  const [statPeriod, setStatPeriod] = useState<'week' | 'month' | 'year'>('month')

  // Data
  const [entries, setEntries] = useState<DispatchEntry[]>([])
  const [payments, setPayments] = useState<Payment[]>(initialClient.payments || [])
  const [balance, setBalance] = useState(initialClient.calculatedBalance ?? initialClient.balance ?? 0)

  // Rates
  const [fanRates, setFanRates] = useState<FanRate[]>(initialClient.fanRates || [])
  const [shaftSizes, setShaftSizes] = useState<string[]>([])

  // Rate dialog
  const [rateDialog, setRateDialog] = useState(false)
  const [editShaft, setEditShaft] = useState('')
  const [editRate, setEditRate] = useState('')
  const [rateError, setRateError] = useState('')
  const [newShaftName, setNewShaftName] = useState('')
  const [addingShaft, setAddingShaft] = useState(false)
  const [savingRate, setSavingRate] = useState(false)

  // Entry dialog (add + edit)
  const [entryDialog, setEntryDialog] = useState(false)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [entryRotorSize, setEntryRotorSize] = useState('')
  const [entryShaftSize, setEntryShaftSize] = useState('')
  const [entryRate, setEntryRate] = useState('')
  const [entryQty, setEntryQty] = useState('')
  const [entryDate, setEntryDate] = useState<Dayjs>(dayjs())
  const [entryNewShaft, setEntryNewShaft] = useState('')
  const [entryAddingShaft, setEntryAddingShaft] = useState(false)
  const [savingEntry, setSavingEntry] = useState(false)
  const [entryError, setEntryError] = useState('')

  // Payment dialog (add + edit)
  const [payDialog, setPayDialog] = useState(false)
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMedium, setPayMedium] = useState<'Cash' | 'Transfer' | 'Online'>('Cash')
  const [payTransfer, setPayTransfer] = useState<'UPI' | 'Bank Transfer'>('UPI')
  const [payDate, setPayDate] = useState<Dayjs>(dayjs())
  const [payComment, setPayComment] = useState('')
  const [savingPay, setSavingPay] = useState(false)

  useEffect(() => {
    axios.get(`/api/fanRotor?client=${encodeURIComponent(initialClient.name)}&type=dispatched`)
      .then(res => setEntries(res.data)).catch(() => {})
    axios.get('/api/shaftSizes').then(res => setShaftSizes(res.data)).catch(() => {})
  }, [initialClient.name])

  // ── Rates ──────────────────────────────────────────────────────────────────

  const currentRate = (shaft: string) => fanRates.find(r => r.shaftSize === shaft)

  const openRateDialog = (shaft = '') => {
    setEditShaft(shaft)
    setEditRate(shaft ? String(currentRate(shaft)?.rate ?? '') : '')
    setRateError('')
    setRateDialog(true)
  }

  const saveRate = async () => {
    if (!editShaft || !editRate) return
    setSavingRate(true); setRateError('')
    try {
      const res = await axios.patch(`/api/client/${initialClient._id}/fanRates`, { shaftSize: editShaft, rate: Number(editRate) })
      setFanRates(res.data)
      setRateDialog(false)
    } catch (e: unknown) {
      setRateError((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to save rate.')
    } finally { setSavingRate(false) }
  }

  const addShaftForRate = async () => {
    const name = newShaftName.trim()
    if (!name) return
    setAddingShaft(true)
    try {
      await axios.post('/api/shaftSizes', { name })
      setShaftSizes(prev => prev.includes(name) ? prev : [...prev, name])
      setEditShaft(name)
      setNewShaftName('')
    } finally { setAddingShaft(false) }
  }

  // ── Entry dialog ───────────────────────────────────────────────────────────

  const handleEntryShaftChange = (shaft: string) => {
    setEntryShaftSize(shaft)
    const r = currentRate(shaft)
    if (r) setEntryRate(String(r.rate))
  }

  const addShaftForEntry = async () => {
    const name = entryNewShaft.trim()
    if (!name) return
    setEntryAddingShaft(true)
    try {
      await axios.post('/api/shaftSizes', { name })
      setShaftSizes(prev => prev.includes(name) ? prev : [...prev, name])
      handleEntryShaftChange(name)
      setEntryNewShaft('')
    } finally { setEntryAddingShaft(false) }
  }

  const openEntryDialog = (entry?: DispatchEntry) => {
    setEditingEntryId(entry?._id ?? null)
    setEntryRotorSize(entry?.rotorSize ?? '')
    setEntryShaftSize(entry?.shaftSize ?? '')
    setEntryRate(entry?.rate != null ? String(entry.rate) : '')
    setEntryQty(entry?.quantity != null ? String(entry.quantity) : '')
    setEntryDate(entry ? dayjs(entry.date) : dayjs())
    setEntryError('')
    setEntryDialog(true)
  }

  const submitEntry = async () => {
    if (!entryRotorSize || !entryShaftSize || !entryRate || !entryQty) {
      setEntryError('Fill all fields.'); return
    }
    setSavingEntry(true); setEntryError('')
    try {
      const payload = {
        client: initialClient.name,
        rotorSize: entryRotorSize,
        shaftSize: entryShaftSize,
        rate: Number(entryRate),
        quantity: Number(entryQty),
        type: 'dispatched',
        date: entryDate.toDate(),
      }
      if (editingEntryId) {
        const res = await axios.patch(`/api/fanRotor/${editingEntryId}`, payload)
        setEntries(prev => prev.map(e => e._id === editingEntryId ? res.data : e))
      } else {
        const res = await axios.post('/api/fanRotor', payload)
        setEntries(prev => [res.data, ...prev])
      }
      setEntryDialog(false)
    } catch (e: unknown) {
      setEntryError((e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to save.')
    } finally { setSavingEntry(false) }
  }

  // ── Payment dialog ─────────────────────────────────────────────────────────

  const openPayDialog = (payment?: Payment) => {
    setEditingPaymentId(payment?.paymentId ?? null)
    setPayAmount(payment?.amount != null ? String(payment.amount) : '')
    setPayMedium((payment?.medium as typeof payMedium) ?? 'Cash')
    setPayTransfer((payment?.transferMethod as typeof payTransfer) ?? 'UPI')
    setPayDate(payment ? dayjs(payment.date) : dayjs())
    setPayComment(payment?.comment ?? '')
    setPayDialog(true)
  }

  const submitPayment = async () => {
    if (!payAmount) return
    setSavingPay(true)
    try {
      const payload = {
        client: initialClient.name,
        reason: 'Fan payment',
        amount: Number(payAmount),
        date: payDate.toDate(),
        medium: payMedium,
        transferMethod: payMedium === 'Transfer' ? payTransfer : undefined,
        comment: payComment,
      }
      if (editingPaymentId) {
        await axios.patch(`/api/income/${editingPaymentId}`, payload)
        setPayments(prev => prev.map(p => p.paymentId === editingPaymentId
          ? { ...p, amount: Number(payAmount), medium: payMedium, transferMethod: payMedium === 'Transfer' ? payTransfer : undefined, date: payDate.toISOString(), comment: payComment }
          : p
        ))
        // Adjust balance: find old amount and compute delta
        const old = payments.find(p => p.paymentId === editingPaymentId)
        if (old) setBalance(prev => prev + old.amount - Number(payAmount))
      } else {
        await axios.post('/api/income', payload)
        setPayments(prev => [{ date: payDate.toISOString(), amount: Number(payAmount), medium: payMedium, transferMethod: payMedium === 'Transfer' ? payTransfer : undefined, comment: payComment }, ...prev])
        setBalance(prev => prev - Number(payAmount))
      }
      setPayDialog(false)
    } finally { setSavingPay(false) }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  const [confirmDelete, setConfirmDelete] = useState<{ type: 'entry' | 'payment'; id: string; label: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const deleteEntry = async (id: string) => {
    setDeleting(true)
    try {
      await axios.delete(`/api/fanRotor/${id}`)
      setEntries(prev => prev.filter(e => e._id !== id))
    } finally { setDeleting(false); setConfirmDelete(null) }
  }

  const deletePayment = async (paymentId: string, amount: number) => {
    setDeleting(true)
    try {
      await axios.delete(`/api/income/${paymentId}`)
      setPayments(prev => prev.filter(p => p.paymentId !== paymentId))
      setBalance(prev => prev + amount)
    } finally { setDeleting(false); setConfirmDelete(null) }
  }

  // ── Filtering ──────────────────────────────────────────────────────────────

  const isInRange = (date: string) => {
    const d = new Date(date)
    const from = dateFilter.from ? new Date(dateFilter.from) : null
    const to = dateFilter.to ? new Date(dateFilter.to + 'T23:59:59.999') : null
    return (!from || d >= from) && (!to || d <= to)
  }

  const filteredEntries = entries.filter(e => isInRange(e.date)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const filteredPayments = payments.filter(p => isInRange(p.date)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const periodStats = useMemo(() => {
    const { start, end } = periodBounds(statPeriod)
    const inPeriod = (d: string) => { const dt = new Date(d); return dt >= start && dt <= end }
    const units = entries.filter(e => inPeriod(e.date)).reduce((s, e) => s + e.quantity, 0)
    const paid = payments.filter(p => inPeriod(p.date)).reduce((s, p) => s + (p.amount || 0), 0)
    return { units, paid }
  }, [entries, payments, statPeriod])

  const isPaid = balance <= 0

  return (
    <Box>
      {/* Header */}
      <Box sx={{ background: `linear-gradient(135deg, ${INDIGO_DARK} 0%, ${INDIGO_MID} 60%, ${INDIGO} 100%)`, color: '#fff', px: 4, py: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2.5}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.15)', width: 52, height: 52 }}>
            <ElectricBoltIcon sx={{ fontSize: 28 }} />
          </Avatar>
          <Box flex={1}>
            <Typography variant="h5" fontWeight={700}>{initialClient.name}</Typography>
            <Chip label="Fan" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 11 }} />
          </Box>
          <Box display="flex" gap={1}>
            <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => openEntryDialog()}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }, boxShadow: 'none' }}>
              Add Entry
            </Button>
            <Button variant="contained" size="small" startIcon={<MonetizationOnIcon />} onClick={() => openPayDialog()}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }, boxShadow: 'none' }}>
              Add Payment
            </Button>
          </Box>
        </Box>

        <Tabs value={statPeriod} onChange={(_, v) => setStatPeriod(v)} sx={{
          mb: 2, minHeight: 32,
          '& .MuiTab-root': { color: 'rgba(255,255,255,0.6)', minHeight: 32, py: 0.5, px: 2, fontSize: 12, textTransform: 'none', fontWeight: 500 },
          '& .Mui-selected': { color: '#fff', fontWeight: 700 },
          '& .MuiTabs-indicator': { bgcolor: '#fff', height: 2 },
        }}>
          <Tab label="This Week" value="week" />
          <Tab label="This Month" value="month" />
          <Tab label="This Year" value="year" />
        </Tabs>

        <Box display="flex" gap={4} flexWrap="wrap" alignItems="flex-end">
          {[
            { label: 'Units Sold', value: String(periodStats.units), color: '#c5cae9' },
            { label: 'Collected', value: fmtCur(periodStats.paid), color: '#ccff90' },
          ].map(s => (
            <Box key={s.label}>
              <Typography variant="h6" fontWeight={700} sx={{ color: s.color }}>{s.value}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>{s.label}</Typography>
            </Box>
          ))}
          <BalanceEditor balance={balance} clientId={initialClient._id} onSave={setBalance} />
        </Box>
      </Box>

      <Box sx={{ px: 3, py: 2 }}>
        {/* Date filters */}
        <Box display="flex" gap={2} flexWrap="wrap" alignItems="center" mb={3}>
          <TextField label="From" type="date" size="small" InputLabelProps={{ shrink: true }} value={dateFilter.from} onChange={e => setDateFilter(p => ({ ...p, from: e.target.value }))} sx={{ width: 150 }} />
          <TextField label="To" type="date" size="small" InputLabelProps={{ shrink: true }} value={dateFilter.to} onChange={e => setDateFilter(p => ({ ...p, to: e.target.value }))} sx={{ width: 150 }} />
        </Box>

        <Grid container spacing={3}>
          {/* Entries */}
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #e2e8f0' }}>
                <ShoppingCartIcon sx={{ color: INDIGO, fontSize: 20 }} />
                <Typography fontWeight={700}>Dispatches</Typography>
                <Chip label={filteredEntries.length} size="small" sx={{ ml: 'auto', bgcolor: INDIGO_LIGHT, color: INDIGO_DARK, fontWeight: 700 }} />
              </Box>
              <TableContainer sx={{ maxHeight: 360 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <HeadCell>Date</HeadCell>
                      <HeadCell>Rotor</HeadCell>
                      <HeadCell>Shaft</HeadCell>
                      <HeadCell>Rate</HeadCell>
                      <HeadCell>Qty</HeadCell>
                      <HeadCell>Total</HeadCell>
                      <HeadCell>{''}</HeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredEntries.map((e, i) => (
                      <TableRow key={i} hover sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell sx={{ color: 'text.secondary', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(e.date)}</TableCell>
                        <TableCell><Chip label={e.rotorSize} size="small" sx={{ bgcolor: INDIGO_LIGHT, color: INDIGO_DARK, fontWeight: 600, fontSize: 11 }} /></TableCell>
                        <TableCell sx={{ fontSize: 13 }}>{e.shaftSize}</TableCell>
                        <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{e.rate ? `₹${e.rate}` : '—'}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{e.quantity}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: INDIGO_DARK }}>
                          {e.rate && e.quantity ? fmtCur(e.rate * e.quantity) : '—'}
                        </TableCell>
                        <TableCell sx={{ py: 0.5, whiteSpace: 'nowrap' }}>
                          <IconButton size="small" onClick={() => openEntryDialog(e)} sx={{ color: INDIGO, opacity: 0.6, '&:hover': { opacity: 1 } }}>
                            <EditIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                          <IconButton size="small" onClick={() => setConfirmDelete({ type: 'entry', id: e._id!, label: `${e.rotorSize} · ${e.shaftSize} · qty ${e.quantity}` })} sx={{ color: '#ef5350', opacity: 0.5, '&:hover': { opacity: 1 } }}>
                            <DeleteIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredEntries.length === 0 && (
                      <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.disabled' }}>No dispatches in this period.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Payments */}
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #e2e8f0' }}>
                <MonetizationOnIcon sx={{ color: '#43a047', fontSize: 20 }} />
                <Typography fontWeight={700}>Payments</Typography>
                <Chip label={filteredPayments.length} size="small" sx={{ ml: 'auto', bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 700 }} />
              </Box>
              <TableContainer sx={{ maxHeight: 360 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <HeadCell>Date</HeadCell>
                      <HeadCell>Amount</HeadCell>
                      <HeadCell>Via</HeadCell>
                      <HeadCell>Note</HeadCell>
                      <HeadCell>{''}</HeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredPayments.map((p, i) => (
                      <TableRow key={i} hover sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell sx={{ color: 'text.secondary', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(p.date)}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#2e7d32' }}>{fmtCur(p.amount || 0)}</TableCell>
                        <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                          {p.medium || 'Cash'}{p.transferMethod ? ` · ${p.transferMethod}` : ''}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, maxWidth: 120 }}>
                          {p.comment
                            ? <Tooltip title={p.comment}><span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#555' }}>{p.comment}</span></Tooltip>
                            : <span style={{ color: '#bbb' }}>—</span>}
                        </TableCell>
                        <TableCell sx={{ py: 0.5, whiteSpace: 'nowrap' }}>
                          {p.paymentId && (<>
                            <IconButton size="small" onClick={() => openPayDialog(p)} sx={{ color: '#43a047', opacity: 0.6, '&:hover': { opacity: 1 } }}>
                              <EditIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                            <IconButton size="small" onClick={() => setConfirmDelete({ type: 'payment', id: p.paymentId!, label: `₹${p.amount} on ${fmtDate(p.date)}` })} sx={{ color: '#ef5350', opacity: 0.5, '&:hover': { opacity: 1 } }}>
                              <DeleteIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </>)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredPayments.length === 0 && (
                      <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.disabled' }}>No payments in this period.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>

        {/* Shaft Rates */}
        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden', mt: 3 }}>
          <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #e2e8f0' }}>
            <PriceChangeIcon sx={{ color: INDIGO, fontSize: 20 }} />
            <Typography fontWeight={700}>Shaft Rates</Typography>
            <Button size="small" variant="outlined" onClick={() => openRateDialog()}
              sx={{ ml: 'auto', textTransform: 'none', borderRadius: 2, fontSize: 12, borderColor: INDIGO, color: INDIGO }}>
              Set Rate
            </Button>
          </Box>
          <Box sx={{ p: 2, display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {shaftSizes.map(s => {
              const r = currentRate(s)
              return (
                <Box key={s} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: r ? INDIGO_LIGHT : '#fafafa' }}>
                  <Typography fontSize={13} fontWeight={600} color="text.secondary">{s}</Typography>
                  <Typography fontSize={14} fontWeight={700} color={r ? INDIGO_DARK : 'text.disabled'}>
                    {r ? `₹${r.rate}` : '—'}
                  </Typography>
                  <IconButton size="small" onClick={() => openRateDialog(s)} sx={{ p: 0.25, color: INDIGO }}>
                    <EditIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              )
            })}
          </Box>
        </Paper>
      </Box>

      {/* ── Add Entry Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={entryDialog} onClose={() => setEntryDialog(false)} PaperProps={{ sx: { borderRadius: 3, minWidth: 360 } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{editingEntryId ? 'Edit Entry' : 'Add Dispatch Entry'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          <Box>
            <Label>Rotor Size</Label>
            <FormControl fullWidth size="small">
              <Select value={entryRotorSize} onChange={e => setEntryRotorSize(e.target.value)} displayEmpty sx={{ borderRadius: 2 }}>
                <MenuItem value="" disabled><em style={{ color: '#aaa' }}>Select rotor…</em></MenuItem>
                {rotorSizes.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <Box>
            <Label>Shaft Size</Label>
            <FormControl fullWidth size="small">
              <Select value={entryShaftSize} onChange={e => { if (e.target.value !== '__new__') handleEntryShaftChange(e.target.value) }} displayEmpty sx={{ borderRadius: 2 }}>
                <MenuItem value="" disabled><em style={{ color: '#aaa' }}>Select shaft…</em></MenuItem>
                {shaftSizes.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                <MenuItem disableRipple value="__new__" sx={{ p: 0 }} onClickCapture={e => e.stopPropagation()}>
                  <Box display="flex" gap={0.5} px={1} py={0.5} width="100%" onClick={e => e.stopPropagation()}>
                    <TextField size="small" placeholder="New size…" value={entryNewShaft}
                      onChange={e => setEntryNewShaft(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addShaftForEntry() } }}
                      onClick={e => e.stopPropagation()}
                      inputProps={{ style: { fontSize: 13 } }}
                      sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
                    <Button size="small" variant="contained" onClick={addShaftForEntry}
                      disabled={!entryNewShaft.trim() || entryAddingShaft}
                      sx={{ minWidth: 0, px: 1.5, fontSize: 12, textTransform: 'none', borderRadius: 1.5, bgcolor: INDIGO, '&:hover': { bgcolor: INDIGO_DARK } }}>
                      Add
                    </Button>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box display="flex" gap={2}>
            <Box flex={1}>
              <Label>Rate (₹)</Label>
              <TextField fullWidth size="small" type="number" value={entryRate} onChange={e => setEntryRate(e.target.value)}
                placeholder="e.g. 26.5" inputProps={{ min: 0, step: 0.5 }}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            </Box>
            <Box flex={1}>
              <Label>Quantity</Label>
              <TextField fullWidth size="small" type="number" value={entryQty} onChange={e => setEntryQty(e.target.value)}
                placeholder="0" inputProps={{ min: 1 }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            </Box>
          </Box>
          <Box>
            <Label>Date</Label>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker value={entryDate} onChange={v => setEntryDate(v ?? dayjs())}
                renderInput={(params) => <TextField {...params} fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
            </LocalizationProvider>
          </Box>
          {entryError && <Typography color="error" fontSize={13}>{entryError}</Typography>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setEntryDialog(false)} sx={{ textTransform: 'none', borderRadius: 2 }}>Cancel</Button>
          <Button variant="contained" onClick={submitEntry}
            disabled={!entryRotorSize || !entryShaftSize || !entryRate || !entryQty || savingEntry}
            sx={{ textTransform: 'none', borderRadius: 2, bgcolor: INDIGO, '&:hover': { bgcolor: INDIGO_DARK } }}>
            {savingEntry ? 'Saving…' : editingEntryId ? 'Update Entry' : 'Save Entry'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Payment Dialog ───────────────────────────────────────────────── */}
      <Dialog open={payDialog} onClose={() => setPayDialog(false)} PaperProps={{ sx: { borderRadius: 3, minWidth: 340 } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{editingPaymentId ? 'Edit Payment' : 'Record Payment'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          <Box>
            <Label>Amount</Label>
            <TextField fullWidth size="small" type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
              placeholder="0" inputProps={{ min: 0 }}
              InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          </Box>
          <Box>
            <Label>Method</Label>
            <FormControl fullWidth size="small">
              <Select value={payMedium} onChange={e => setPayMedium(e.target.value as typeof payMedium)} sx={{ borderRadius: 2 }}>
                <MenuItem value="Cash">Cash</MenuItem>
                <MenuItem value="Transfer">Transfer</MenuItem>
                <MenuItem value="Online">Online</MenuItem>
              </Select>
            </FormControl>
          </Box>
          {payMedium === 'Transfer' && (
            <Box>
              <Label>Transfer Via</Label>
              <FormControl fullWidth size="small">
                <Select value={payTransfer} onChange={e => setPayTransfer(e.target.value as typeof payTransfer)} sx={{ borderRadius: 2 }}>
                  <MenuItem value="UPI">UPI</MenuItem>
                  <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
          <Box>
            <Label>Date</Label>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker value={payDate} onChange={v => setPayDate(v ?? dayjs())}
                renderInput={(params) => <TextField {...params} fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
            </LocalizationProvider>
          </Box>
          <Box>
            <Label>Comment (optional)</Label>
            <TextField fullWidth size="small" value={payComment} onChange={e => setPayComment(e.target.value)}
              placeholder="e.g. cheque no., note…"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setPayDialog(false)} sx={{ textTransform: 'none', borderRadius: 2 }}>Cancel</Button>
          <Button variant="contained" onClick={submitPayment}
            disabled={!payAmount || savingPay}
            sx={{ textTransform: 'none', borderRadius: 2, bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}>
            {savingPay ? 'Saving…' : editingPaymentId ? 'Update Payment' : 'Save Payment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Set Rate Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={rateDialog} onClose={() => setRateDialog(false)} PaperProps={{ sx: { borderRadius: 3, minWidth: 320 } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Set Shaft Rate</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          <Box>
            <Label>Shaft Size</Label>
            <FormControl fullWidth size="small">
              <Select value={editShaft} onChange={e => { if (e.target.value !== '__new__') { setEditShaft(e.target.value); setEditRate(String(currentRate(e.target.value)?.rate ?? '')) } }} displayEmpty sx={{ borderRadius: 2 }}>
                <MenuItem value="" disabled><em style={{ color: '#aaa' }}>Select shaft size…</em></MenuItem>
                {shaftSizes.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                <MenuItem disableRipple value="__new__" sx={{ p: 0 }} onClickCapture={e => e.stopPropagation()}>
                  <Box display="flex" gap={0.5} px={1} py={0.5} width="100%" onClick={e => e.stopPropagation()}>
                    <TextField size="small" placeholder="New size…" value={newShaftName}
                      onChange={e => setNewShaftName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addShaftForRate() } }}
                      onClick={e => e.stopPropagation()}
                      inputProps={{ style: { fontSize: 13 } }}
                      sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
                    <Button size="small" variant="contained" onClick={addShaftForRate}
                      disabled={!newShaftName.trim() || addingShaft}
                      sx={{ minWidth: 0, px: 1.5, fontSize: 12, textTransform: 'none', borderRadius: 1.5, bgcolor: INDIGO, '&:hover': { bgcolor: INDIGO_DARK } }}>
                      Add
                    </Button>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box>
            <Label>Rate</Label>
            <TextField fullWidth size="small" type="number" value={editRate} onChange={e => setEditRate(e.target.value)}
              placeholder="e.g. 26.5" inputProps={{ min: 0, step: 0.5 }}
              InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          </Box>
          {rateError && <Typography color="error" fontSize={13}>{rateError}</Typography>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setRateDialog(false)} sx={{ textTransform: 'none', borderRadius: 2 }}>Cancel</Button>
          <Button variant="contained" onClick={saveRate} disabled={!editShaft || !editRate || savingRate}
            sx={{ textTransform: 'none', borderRadius: 2, bgcolor: INDIGO, '&:hover': { bgcolor: INDIGO_DARK } }}>
            {savingRate ? 'Saving…' : 'Save Rate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Confirm Delete Dialog ────────────────────────────────────────────── */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} PaperProps={{ sx: { borderRadius: 3, minWidth: 300 } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Delete?</DialogTitle>
        <DialogContent>
          <Typography fontSize={14} color="text.secondary">
            Are you sure you want to delete <strong>{confirmDelete?.label}</strong>? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setConfirmDelete(null)} sx={{ textTransform: 'none', borderRadius: 2 }}>Cancel</Button>
          <Button variant="contained" color="error" disabled={deleting}
            onClick={() => {
              if (!confirmDelete) return
              if (confirmDelete.type === 'entry') deleteEntry(confirmDelete.id)
              else {
                const p = payments.find(p => p.paymentId === confirmDelete.id)
                deletePayment(confirmDelete.id, p?.amount ?? 0)
              }
            }}
            sx={{ textTransform: 'none', borderRadius: 2 }}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default FanClient
