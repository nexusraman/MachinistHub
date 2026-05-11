'use client'

import React, { useState, useMemo } from 'react'
import {
  Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, Grid, IconButton, InputAdornment, InputLabel, MenuItem,
  Pagination, Paper, Select, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tabs, TextField, Tooltip, Typography,
} from '@mui/material'
import { Download, Edit, DeleteOutline as DeleteIcon, MonetizationOn, ShoppingCart, WaterDrop, Add } from '@mui/icons-material'
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs, { Dayjs } from 'dayjs'
import rateList, { getRate } from '@/utils/RateList'
import { jsPDF } from 'jspdf'
import axios from 'axios'

const submersibleSizes = [3, 4, 4.5, 5, '5v4', 5.5, '5.5v4', 6, '6v4', '7v3', '7v4', 8, 9, 10, 11, 12, 13, 15, 'Repair']

interface Entry { subId: string; date: string; size: string; quantity: string }
interface Payment { paymentId?: string; date: string; amount: number; medium?: string; transferMethod?: string; comment?: string }
interface Client { _id: string; name: string; calculatedBalance?: number; entries: Entry[]; payments: Payment[] }

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
          <Edit sx={{ fontSize: 14 }} />
        </IconButton>
      </Box>
      <Typography variant="caption" sx={{ opacity: 0.8 }}>Balance Due</Typography>
    </Box>
  )
}

const SubmersibleClient = ({ client: initialClient }: { client: Client }) => {
  const today = new Date().toISOString().split('T')[0]
  const [dateFilter, setDateFilter] = useState({ from: '', to: today })
  const [entryPage, setEntryPage] = useState(1)
  const [paymentPage, setPaymentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [statPeriod, setStatPeriod] = useState<'week' | 'month' | 'year'>('month')

  // Local state so edits/adds reflect immediately
  const [entries, setEntries] = useState<Entry[]>(initialClient.entries || [])
  const [payments, setPayments] = useState<Payment[]>(initialClient.payments || [])
  const [balance, setBalance] = useState(initialClient.calculatedBalance ?? 0)

  // Entry dialog
  const [entryDialog, setEntryDialog] = useState(false)
  const [editingSubId, setEditingSubId] = useState<string | null>(null)
  const [eSize, setESize] = useState('')
  const [eQty, setEQty] = useState('')
  const [eDate, setEDate] = useState<Dayjs>(dayjs())
  const [savingEntry, setSavingEntry] = useState(false)
  const [entryError, setEntryError] = useState('')

  // Payment dialog
  const [payDialog, setPayDialog] = useState(false)
  const [editingPayId, setEditingPayId] = useState<string | null>(null)
  const [pAmount, setPAmount] = useState('')
  const [pMedium, setPMedium] = useState<'Cash' | 'Transfer' | 'Online'>('Cash')
  const [pTransfer, setPTransfer] = useState<'UPI' | 'Bank Transfer'>('UPI')
  const [pDate, setPDate] = useState<Dayjs>(dayjs())
  const [pComment, setPComment] = useState('')
  const [savingPay, setSavingPay] = useState(false)

  const rates = (rateList as Record<string, Record<string, number>>)[initialClient.name?.toLowerCase()] || {}

  const isInRange = (date: string) => {
    const d = new Date(date)
    const from = dateFilter.from ? new Date(dateFilter.from) : null
    const to = dateFilter.to ? new Date(dateFilter.to + 'T23:59:59.999') : null
    return (!from || d >= from) && (!to || d <= to)
  }

  const allEntries = useMemo(() =>
    entries.map(e => ({ ...e, amount: (Number(e.quantity) || 0) * (Number(rates[e.size]) || 0) })),
    [entries, rates]
  )

  const filteredEntries = useMemo(() =>
    allEntries.filter(e => isInRange(e.date)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [allEntries, dateFilter]
  )

  const filteredPayments = useMemo(() =>
    payments.filter(p => isInRange(p.date)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [payments, dateFilter]
  )

  const periodStats = useMemo(() => {
    const { start, end } = periodBounds(statPeriod)
    const inPeriod = (d: string) => { const dt = new Date(d); return dt >= start && dt <= end }
    const sales = allEntries.filter(e => inPeriod(e.date)).reduce((s, e) => s + e.amount, 0)
    const paid = payments.filter(p => inPeriod(p.date)).reduce((s, p) => s + (p.amount || 0), 0)
    return { sales, paid }
  }, [allEntries, payments, statPeriod])

  const isPaid = balance <= 0

  // ── Entry dialog ───────────────────────────────────────────────────────────

  const openEntryDialog = (entry?: Entry) => {
    setEditingSubId(entry?.subId ?? null)
    setESize(entry?.size ?? '')
    setEQty(entry?.quantity ?? '')
    setEDate(entry ? dayjs(entry.date) : dayjs())
    setEntryError('')
    setEntryDialog(true)
  }

  const submitEntry = async () => {
    if (!eSize || !eQty) { setEntryError('Fill all fields.'); return }
    setSavingEntry(true); setEntryError('')
    try {
      if (editingSubId) {
        await axios.patch(`/api/submersible/${editingSubId}`, { rotorSize: eSize, quantity: Number(eQty), date: eDate.toDate() })
        const oldEntry = entries.find(e => e.subId === editingSubId)
        if (oldEntry) {
          const oldAmt = Number(oldEntry.quantity) * getRate(initialClient.name, oldEntry.size)
          const newAmt = Number(eQty) * getRate(initialClient.name, eSize)
          setBalance(prev => prev + (newAmt - oldAmt))
        }
        setEntries(prev => prev.map(e => e.subId === editingSubId
          ? { ...e, size: eSize, quantity: eQty, date: eDate.toISOString() } : e))
      } else {
        const res = await axios.post('/api/submersible', {
          client: initialClient.name, rotorSize: eSize, quantity: Number(eQty), date: eDate.toDate(),
        })
        const newEntry: Entry = { subId: res.data.subId, date: eDate.toISOString(), size: eSize, quantity: eQty }
        setEntries(prev => [newEntry, ...prev])
        setBalance(prev => prev + Number(eQty) * getRate(initialClient.name, eSize))
      }
      setEntryDialog(false)
    } catch (e: unknown) {
      setEntryError((e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to save.')
    } finally { setSavingEntry(false) }
  }

  // ── Payment dialog ─────────────────────────────────────────────────────────

  const openPayDialog = (payment?: Payment) => {
    setEditingPayId(payment?.paymentId ?? null)
    setPAmount(payment?.amount != null ? String(payment.amount) : '')
    setPMedium((payment?.medium as typeof pMedium) ?? 'Cash')
    setPTransfer((payment?.transferMethod as typeof pTransfer) ?? 'UPI')
    setPDate(payment ? dayjs(payment.date) : dayjs())
    setPComment(payment?.comment ?? '')
    setPayDialog(true)
  }

  const submitPayment = async () => {
    if (!pAmount) return
    setSavingPay(true)
    try {
      const payload = {
        client: initialClient.name, reason: 'Submersible payment',
        amount: Number(pAmount), date: pDate.toDate(), medium: pMedium,
        transferMethod: pMedium === 'Transfer' ? pTransfer : undefined,
        comment: pComment,
      }
      if (editingPayId) {
        await axios.patch(`/api/income/${editingPayId}`, payload)
        const old = payments.find(p => p.paymentId === editingPayId)
        if (old) setBalance(prev => prev + old.amount - Number(pAmount))
        setPayments(prev => prev.map(p => p.paymentId === editingPayId
          ? { ...p, amount: Number(pAmount), medium: pMedium, transferMethod: pMedium === 'Transfer' ? pTransfer : undefined, date: pDate.toISOString(), comment: pComment }
          : p
        ))
      } else {
        await axios.post('/api/income', payload)
        setPayments(prev => [{ date: pDate.toISOString(), amount: Number(pAmount), medium: pMedium, transferMethod: pMedium === 'Transfer' ? pTransfer : undefined, comment: pComment }, ...prev])
        setBalance(prev => prev - Number(pAmount))
      }
      setPayDialog(false)
    } finally { setSavingPay(false) }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  const [confirmDelete, setConfirmDelete] = useState<{ type: 'entry' | 'payment'; id: string; label: string; amount?: number } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const deleteEntry = async (subId: string, amount: number) => {
    setDeleting(true)
    try {
      await axios.delete(`/api/submersible/${subId}`)
      setEntries(prev => prev.filter(e => e.subId !== subId))
      setBalance(prev => prev - amount)
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

  // ── PDF export ─────────────────────────────────────────────────────────────

  const handleExportToPDF = () => {
    const doc = new jsPDF()
    let y = 10
    const fromDate = dateFilter.from || 'start'
    const toDate = dateFilter.to || today
    const filename = `${initialClient.name}_from-${fromDate}_to-${toDate}.pdf`
    const primaryColor: [number, number, number] = [33, 150, 243]
    const dangerColor: [number, number, number] = [244, 67, 54]
    const successColor: [number, number, number] = [76, 175, 80]
    const lightGray: [number, number, number] = [230, 230, 230]

    doc.setFontSize(20).setTextColor(...primaryColor).text(initialClient.name, 10, y); y += 10
    doc.setFontSize(11).setTextColor(0, 0, 0).text(`Report Period: ${fromDate} to ${toDate}`, 10, y); y += 6
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 10, y); y += 8
    doc.setTextColor(...dangerColor).setFontSize(12)
    doc.text(`Remaining Balance: ₹${balance.toLocaleString()}`, 10, y); y += 10
    doc.setDrawColor(150).line(10, y, 200, y); y += 6

    doc.setFontSize(14).setTextColor(...primaryColor).text('Submersible Rotor Sales', 10, y); y += 8
    doc.setFontSize(10).setTextColor(0, 0, 0)
    doc.text('Date', 10, y); doc.text('Qty', 45, y); doc.text('Size', 70, y); doc.text('Amount', 140, y); y += 5
    doc.setDrawColor(...lightGray).line(10, y, 200, y); y += 3

    let totalEntryAmount = 0
    filteredEntries.forEach((entry, i) => {
      doc.setFillColor(...(i % 2 === 0 ? lightGray : [255, 255, 255] as [number, number, number])).rect(10, y - 3, 190, 6, 'F')
      doc.setTextColor(0, 0, 0).text(new Date(entry.date).toLocaleDateString(), 10, y)
      doc.text(String(entry.quantity), 45, y); doc.text(String(entry.size), 70, y)
      doc.text(`${entry.amount.toLocaleString()}`, 140, y)
      totalEntryAmount += entry.amount; y += 6
      if (y > 270) { doc.addPage(); y = 10 }
    })

    if (filteredEntries.length === 0) { doc.text('No sales found.', 10, y); y += 6 }
    else { doc.setTextColor(...primaryColor).text(`Total Sales: ₹${totalEntryAmount.toLocaleString()}`, 10, y); y += 10 }

    doc.setFontSize(14).setTextColor(...successColor).text('Transactions', 10, y); y += 8
    doc.setFontSize(10).setTextColor(0, 0, 0)
    doc.text('Date', 10, y); doc.text('Amount', 45, y); doc.text('Medium', 85, y); doc.text('Method', 125, y); doc.text('Comment', 160, y); y += 5
    doc.setDrawColor(...lightGray).line(10, y, 200, y); y += 3

    let totalPayments = 0
    filteredPayments.forEach((p, i) => {
      doc.setFillColor(...(i % 2 === 0 ? lightGray : [255, 255, 255] as [number, number, number])).rect(10, y - 3, 190, 6, 'F')
      doc.setTextColor(0, 0, 0).text(new Date(p.date).toLocaleDateString(), 10, y)
      doc.text(`₹${p.amount?.toLocaleString() || 0}`, 45, y); doc.text(p.medium || '-', 85, y)
      doc.text(p.transferMethod || '-', 125, y); doc.text(p.comment || '-', 160, y)
      totalPayments += p.amount || 0; y += 6
      if (y > 270) { doc.addPage(); y = 10 }
    })

    if (filteredPayments.length === 0) { doc.text('No transactions found.', 10, y); y += 6 }
    y += 5; doc.setTextColor(...primaryColor).text(`Total Transactions: ₹${totalPayments.toLocaleString()}`, 10, y); y += 10
    doc.setFontSize(13).setTextColor(...dangerColor).text(`Final Balance: ₹${balance.toLocaleString()}`, 10, y)
    doc.save(filename)
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg, #1a237e 0%, #0288d1 100%)', color: '#fff', px: 4, py: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2.5}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 52, height: 52 }}>
            <WaterDrop sx={{ fontSize: 28 }} />
          </Avatar>
          <Box flex={1}>
            <Typography variant="h5" fontWeight={700}>{initialClient.name}</Typography>
            <Chip label="Submersible" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 11 }} />
          </Box>
          <Box display="flex" gap={1}>
            <Button variant="contained" size="small" startIcon={<Add />} onClick={() => openEntryDialog()}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }, boxShadow: 'none' }}>
              Add Entry
            </Button>
            <Button variant="contained" size="small" startIcon={<MonetizationOn />} onClick={() => openPayDialog()}
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
            { label: 'Sales', value: fmtCur(periodStats.sales), color: '#80d8ff' },
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
        {/* Toolbar */}
        <Box display="flex" gap={2} flexWrap="wrap" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
            <TextField label="From" type="date" size="small" InputLabelProps={{ shrink: true }} value={dateFilter.from} onChange={e => setDateFilter(p => ({ ...p, from: e.target.value }))} sx={{ width: 150 }} />
            <TextField label="To" type="date" size="small" InputLabelProps={{ shrink: true }} value={dateFilter.to} onChange={e => setDateFilter(p => ({ ...p, to: e.target.value }))} sx={{ width: 150 }} />
            <FormControl size="small" sx={{ minWidth: 90 }}>
              <InputLabel>Rows</InputLabel>
              <Select value={rowsPerPage} label="Rows" onChange={e => { setRowsPerPage(e.target.value as number); setEntryPage(1); setPaymentPage(1) }}>
                {[5, 10, 20, 50].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <Button variant="contained" startIcon={<Download />} onClick={handleExportToPDF} sx={{ textTransform: 'none', borderRadius: 2 }}>
            Export PDF
          </Button>
        </Box>

        <Grid container spacing={3}>
          {/* Sales table */}
          <Grid item xs={12} lg={6}>
            <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #e2e8f0' }}>
                <ShoppingCart sx={{ color: '#ef5350', fontSize: 20 }} />
                <Typography fontWeight={700}>Rotor Sales</Typography>
                <Chip label={filteredEntries.length} size="small" sx={{ ml: 'auto', bgcolor: '#fce4ec', color: '#c62828', fontWeight: 700 }} />
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <HeadCell>Date</HeadCell>
                      <HeadCell>Size</HeadCell>
                      <HeadCell>Qty</HeadCell>
                      <HeadCell>Amount</HeadCell>
                      <HeadCell>{''}</HeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredEntries.slice((entryPage - 1) * rowsPerPage, entryPage * rowsPerPage).map((entry, idx) => (
                      <TableRow key={idx} hover sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>{fmtDate(entry.date)}</TableCell>
                        <TableCell><Chip label={entry.size} size="small" sx={{ bgcolor: '#e3f2fd', color: '#0277bd', fontWeight: 600, fontSize: 12 }} /></TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{entry.quantity}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#1976d2' }}>{fmtCur(entry.amount)}</TableCell>
                        <TableCell sx={{ py: 0.5, whiteSpace: 'nowrap' }}>
                          <IconButton size="small" onClick={() => openEntryDialog(entry)} sx={{ color: '#1976d2', opacity: 0.6, '&:hover': { opacity: 1 } }}>
                            <Edit sx={{ fontSize: 15 }} />
                          </IconButton>
                          <IconButton size="small" onClick={() => setConfirmDelete({ type: 'entry', id: entry.subId, label: `${entry.size} · qty ${entry.quantity}`, amount: entry.amount })} sx={{ color: '#ef5350', opacity: 0.5, '&:hover': { opacity: 1 } }}>
                            <DeleteIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredEntries.length === 0 && (
                      <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.disabled' }}>No sales in this period.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              {filteredEntries.length > rowsPerPage && (
                <Box sx={{ px: 2.5, py: 1.5, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                  <Pagination count={Math.ceil(filteredEntries.length / rowsPerPage)} page={entryPage} onChange={(_, p) => setEntryPage(p)} size="small" />
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Payments table */}
          <Grid item xs={12} lg={6}>
            <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #e2e8f0' }}>
                <MonetizationOn sx={{ color: '#43a047', fontSize: 20 }} />
                <Typography fontWeight={700}>Transactions</Typography>
                <Chip label={filteredPayments.length} size="small" sx={{ ml: 'auto', bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 700 }} />
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <HeadCell>Date</HeadCell>
                      <HeadCell>Amount</HeadCell>
                      <HeadCell>Medium</HeadCell>
                      <HeadCell>Note</HeadCell>
                      <HeadCell>{''}</HeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredPayments.slice((paymentPage - 1) * rowsPerPage, paymentPage * rowsPerPage).map((p, idx) => (
                      <TableRow key={idx} hover sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>{fmtDate(p.date)}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#2e7d32' }}>{fmtCur(p.amount || 0)}</TableCell>
                        <TableCell sx={{ fontSize: 13 }}>
                          {p.medium || <span style={{ color: '#bbb' }}>—</span>}
                          {p.transferMethod ? <span style={{ color: '#999' }}> · {p.transferMethod}</span> : null}
                        </TableCell>
                        <TableCell sx={{ fontSize: 13, maxWidth: 120 }}>
                          {p.comment
                            ? <Tooltip title={p.comment}><span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.comment}</span></Tooltip>
                            : <span style={{ color: '#bbb' }}>—</span>}
                        </TableCell>
                        <TableCell sx={{ py: 0.5, whiteSpace: 'nowrap' }}>
                          {p.paymentId && (<>
                            <IconButton size="small" onClick={() => openPayDialog(p)} sx={{ color: '#43a047', opacity: 0.6, '&:hover': { opacity: 1 } }}>
                              <Edit sx={{ fontSize: 15 }} />
                            </IconButton>
                            <IconButton size="small" onClick={() => setConfirmDelete({ type: 'payment', id: p.paymentId!, label: `₹${p.amount} on ${fmtDate(p.date)}`, amount: p.amount })} sx={{ color: '#ef5350', opacity: 0.5, '&:hover': { opacity: 1 } }}>
                              <DeleteIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </>)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredPayments.length === 0 && (
                      <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.disabled' }}>No transactions in this period.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              {filteredPayments.length > rowsPerPage && (
                <Box sx={{ px: 2.5, py: 1.5, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                  <Pagination count={Math.ceil(filteredPayments.length / rowsPerPage)} page={paymentPage} onChange={(_, p) => setPaymentPage(p)} size="small" />
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* ── Entry Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={entryDialog} onClose={() => setEntryDialog(false)} PaperProps={{ sx: { borderRadius: 3, minWidth: 320 } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{editingSubId ? 'Edit Entry' : 'Add Entry'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          <Box>
            <Label>Rotor Size</Label>
            <FormControl fullWidth size="small">
              <Select value={eSize} onChange={e => setESize(String(e.target.value))} displayEmpty sx={{ borderRadius: 2 }}>
                <MenuItem value="" disabled><em style={{ color: '#aaa' }}>Select size…</em></MenuItem>
                {submersibleSizes.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <Box display="flex" gap={2}>
            <Box flex={1}>
              <Label>Quantity</Label>
              <TextField fullWidth size="small" type="number" value={eQty} onChange={e => setEQty(e.target.value)}
                placeholder="0" inputProps={{ min: 1 }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            </Box>
            {eSize && eQty && (
              <Box flex={1} display="flex" flexDirection="column" justifyContent="flex-end" pb={0.5}>
                <Typography variant="caption" color="text.secondary">Rate · Amount</Typography>
                <Typography fontWeight={700} color="#1976d2">
                  ₹{getRate(initialClient.name, eSize)} · ₹{(Number(eQty) * getRate(initialClient.name, eSize)).toLocaleString('en-IN')}
                </Typography>
              </Box>
            )}
          </Box>
          <Box>
            <Label>Date</Label>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker value={eDate} onChange={v => setEDate(v ?? dayjs())}
                renderInput={(params) => <TextField {...params} fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
            </LocalizationProvider>
          </Box>
          {entryError && <Typography color="error" fontSize={13}>{entryError}</Typography>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setEntryDialog(false)} sx={{ textTransform: 'none', borderRadius: 2 }}>Cancel</Button>
          <Button variant="contained" onClick={submitEntry} disabled={!eSize || !eQty || savingEntry}
            sx={{ textTransform: 'none', borderRadius: 2, bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' } }}>
            {savingEntry ? 'Saving…' : editingSubId ? 'Update Entry' : 'Save Entry'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Payment Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={payDialog} onClose={() => setPayDialog(false)} PaperProps={{ sx: { borderRadius: 3, minWidth: 340 } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{editingPayId ? 'Edit Payment' : 'Record Payment'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          <Box>
            <Label>Amount</Label>
            <TextField fullWidth size="small" type="number" value={pAmount} onChange={e => setPAmount(e.target.value)}
              placeholder="0" inputProps={{ min: 0 }}
              InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          </Box>
          <Box>
            <Label>Method</Label>
            <FormControl fullWidth size="small">
              <Select value={pMedium} onChange={e => setPMedium(e.target.value as typeof pMedium)} sx={{ borderRadius: 2 }}>
                <MenuItem value="Cash">Cash</MenuItem>
                <MenuItem value="Transfer">Transfer</MenuItem>
                <MenuItem value="Online">Online</MenuItem>
              </Select>
            </FormControl>
          </Box>
          {pMedium === 'Transfer' && (
            <Box>
              <Label>Transfer Via</Label>
              <FormControl fullWidth size="small">
                <Select value={pTransfer} onChange={e => setPTransfer(e.target.value as typeof pTransfer)} sx={{ borderRadius: 2 }}>
                  <MenuItem value="UPI">UPI</MenuItem>
                  <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
          <Box>
            <Label>Date</Label>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker value={pDate} onChange={v => setPDate(v ?? dayjs())}
                renderInput={(params) => <TextField {...params} fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
            </LocalizationProvider>
          </Box>
          <Box>
            <Label>Comment (optional)</Label>
            <TextField fullWidth size="small" value={pComment} onChange={e => setPComment(e.target.value)}
              placeholder="e.g. cheque no., note…"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setPayDialog(false)} sx={{ textTransform: 'none', borderRadius: 2 }}>Cancel</Button>
          <Button variant="contained" onClick={submitPayment} disabled={!pAmount || savingPay}
            sx={{ textTransform: 'none', borderRadius: 2, bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}>
            {savingPay ? 'Saving…' : editingPayId ? 'Update Payment' : 'Save Payment'}
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
              if (confirmDelete.type === 'entry') deleteEntry(confirmDelete.id, confirmDelete.amount ?? 0)
              else deletePayment(confirmDelete.id, confirmDelete.amount ?? 0)
            }}
            sx={{ textTransform: 'none', borderRadius: 2 }}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default SubmersibleClient
