'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  Avatar, Box, Button, Chip, FormControl, Grid, InputLabel, MenuItem,
  Pagination, Paper, Select, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tabs, TextField, Tooltip, Typography,
} from '@mui/material'
import { Download, MonetizationOn, ShoppingCart, WaterDrop } from '@mui/icons-material'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import rateList from '@/utils/RateList'
import { jsPDF } from 'jspdf'

interface Entry { subId: string; date: string; size: string; quantity: string }
interface Payment { date: string; amount: number; medium?: string; transferMethod?: string; comment?: string }
interface Client { name: string; calculatedBalance?: number; entries: Entry[]; payments: Payment[] }

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtCur = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN')}`

function periodBounds(period: 'week' | 'month' | 'year') {
  const now = new Date()
  if (period === 'week') {
    const start = new Date(now); start.setDate(now.getDate() - 6); start.setHours(0, 0, 0, 0)
    return { start, end: now }
  }
  if (period === 'month') {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now }
  }
  return { start: new Date(now.getFullYear(), 0, 1), end: now }
}

const HeadCell = ({ children }: { children: React.ReactNode }) => (
  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, py: 1.25, bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
    {children}
  </TableCell>
)

const SubmersibleClient = ({ client }: { client: Client }) => {
  const today = new Date().toISOString().split('T')[0]
  const [dateFilter, setDateFilter] = useState({ from: '', to: today })
  const [entryPage, setEntryPage] = useState(1)
  const [paymentPage, setPaymentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [statPeriod, setStatPeriod] = useState<'week' | 'month' | 'year'>('month')

  useEffect(() => { setEntryPage(1); setPaymentPage(1) }, [dateFilter])

  const rates = (rateList as Record<string, Record<string, number>>)[client.name?.toLowerCase()] || {}

  const isInRange = (date: string) => {
    const d = new Date(date)
    const from = dateFilter.from ? new Date(dateFilter.from) : null
    const to = dateFilter.to ? new Date(dateFilter.to) : null
    return (!from || d >= from) && (!to || d <= to)
  }

  const allEntries = useMemo(() =>
    client.entries.map(e => ({ ...e, amount: (Number(e.quantity) || 0) * (Number(rates[e.size]) || 0) })),
    [client.entries, rates]
  )

  const filteredEntries = useMemo(() =>
    allEntries.filter(e => isInRange(e.date)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [allEntries, dateFilter]
  )

  const filteredPayments = useMemo(() =>
    client.payments.filter(p => isInRange(p.date)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [client.payments, dateFilter]
  )

  const periodStats = useMemo(() => {
    const { start, end } = periodBounds(statPeriod)
    const inPeriod = (d: string) => { const dt = new Date(d); return dt >= start && dt <= end }
    const sales = allEntries.filter(e => inPeriod(e.date)).reduce((s, e) => s + e.amount, 0)
    const paid = client.payments.filter(p => inPeriod(p.date)).reduce((s, p) => s + (p.amount || 0), 0)
    return { sales, paid }
  }, [allEntries, client.payments, statPeriod])

  const balance = client.calculatedBalance ?? 0
  const isPaid = balance <= 0

  const handleExportToPDF = () => {
    const doc = new jsPDF()
    let y = 10
    const fromDate = dateFilter.from || 'start'
    const toDate = dateFilter.to || today
    const filename = `${client.name}_from-${fromDate}_to-${toDate}.pdf`
    const primaryColor: [number, number, number] = [33, 150, 243]
    const dangerColor: [number, number, number] = [244, 67, 54]
    const successColor: [number, number, number] = [76, 175, 80]
    const lightGray: [number, number, number] = [230, 230, 230]

    doc.setFontSize(20).setTextColor(...primaryColor).text(client.name, 10, y); y += 10
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
      {/* Header banner */}
      <Box sx={{ background: 'linear-gradient(135deg, #1a237e 0%, #0288d1 100%)', color: '#fff', px: 4, py: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2.5}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 52, height: 52 }}>
            <WaterDrop sx={{ fontSize: 28 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>{client.name}</Typography>
            <Chip label="Submersible" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 11 }} />
          </Box>
        </Box>

        {/* Period tabs */}
        <Tabs
          value={statPeriod}
          onChange={(_, v) => setStatPeriod(v)}
          sx={{
            mb: 2,
            minHeight: 32,
            '& .MuiTab-root': { color: 'rgba(255,255,255,0.6)', minHeight: 32, py: 0.5, px: 2, fontSize: 12, textTransform: 'none', fontWeight: 500 },
            '& .Mui-selected': { color: '#fff', fontWeight: 700 },
            '& .MuiTabs-indicator': { bgcolor: '#fff', height: 2 },
          }}
        >
          <Tab label="This Week" value="week" />
          <Tab label="This Month" value="month" />
          <Tab label="This Year" value="year" />
        </Tabs>

        {/* Stats row */}
        <Box display="flex" gap={4} flexWrap="wrap">
          {[
            { label: 'Sales', value: fmtCur(periodStats.sales), color: '#80d8ff' },
            { label: 'Collected', value: fmtCur(periodStats.paid), color: '#ccff90' },
            { label: 'Balance Due', value: fmtCur(balance), color: isPaid ? '#ccff90' : '#ff8a80' },
          ].map(s => (
            <Box key={s.label}>
              <Typography variant="h6" fontWeight={700} sx={{ color: s.color }}>{s.value}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>{s.label}</Typography>
            </Box>
          ))}
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
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredEntries.slice((entryPage - 1) * rowsPerPage, entryPage * rowsPerPage).map((entry, idx) => (
                      <TableRow key={idx} hover sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>{fmtDate(entry.date)}</TableCell>
                        <TableCell><Chip label={entry.size} size="small" sx={{ bgcolor: '#e3f2fd', color: '#0277bd', fontWeight: 600, fontSize: 12 }} /></TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{entry.quantity}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#1976d2' }}>{fmtCur(entry.amount)}</TableCell>
                      </TableRow>
                    ))}
                    {filteredEntries.length === 0 && (
                      <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.disabled' }}>No sales in this period.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              {filteredEntries.length > 0 && (
                <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    Total: <span style={{ color: '#1976d2' }}>{fmtCur(filteredEntries.reduce((s, e) => s + e.amount, 0))}</span>
                  </Typography>
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
                      <HeadCell>Method</HeadCell>
                      <HeadCell>Note</HeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredPayments.slice((paymentPage - 1) * rowsPerPage, paymentPage * rowsPerPage).map((p, idx) => (
                      <TableRow key={idx} hover sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>{fmtDate(p.date)}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#2e7d32' }}>{fmtCur(p.amount || 0)}</TableCell>
                        <TableCell sx={{ fontSize: 13 }}>{p.medium || <span style={{ color: '#bbb' }}>—</span>}</TableCell>
                        <TableCell sx={{ fontSize: 13 }}>{p.transferMethod || <span style={{ color: '#bbb' }}>—</span>}</TableCell>
                        <TableCell sx={{ fontSize: 13 }}>
                          {p.comment
                            ? <Tooltip title={p.comment}><span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{p.comment}</span></Tooltip>
                            : <span style={{ color: '#bbb' }}>—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredPayments.length === 0 && (
                      <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.disabled' }}>No transactions in this period.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              {filteredPayments.length > 0 && (
                <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    Total: <span style={{ color: '#2e7d32' }}>{fmtCur(filteredPayments.reduce((s, p) => s + (p.amount || 0), 0))}</span>
                  </Typography>
                  <Pagination count={Math.ceil(filteredPayments.length / rowsPerPage)} page={paymentPage} onChange={(_, p) => setPaymentPage(p)} size="small" />
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Balance summary */}
        <Paper elevation={0} sx={{ mt: 3, p: 2.5, border: `1px solid ${isPaid ? '#c8e6c9' : '#ffcdd2'}`, borderRadius: 3, bgcolor: isPaid ? '#f1f8e9' : '#fff8f8', display: 'flex', alignItems: 'center', gap: 2 }}>
          <AccountBalanceWalletIcon sx={{ color: isPaid ? '#2e7d32' : '#c62828', fontSize: 28 }} />
          <Box>
            <Typography variant="body2" color="text.secondary">Outstanding Balance</Typography>
            <Typography variant="h6" fontWeight={700} sx={{ color: isPaid ? '#2e7d32' : '#c62828' }}>
              {fmtCur(balance)} {isPaid ? '— Paid up ✓' : '— Due'}
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}

export default SubmersibleClient
