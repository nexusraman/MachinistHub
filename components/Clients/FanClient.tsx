'use client'

import React, { useState, useMemo } from 'react'
import {
  Avatar, Box, Chip, Grid, Paper, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tabs, TextField, Tooltip, Typography,
} from '@mui/material'
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt'
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn'
import InventoryIcon from '@mui/icons-material/Inventory'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'

interface Client {
  name: string; balance: number;
  sales?: { date: string; model: string; quantity: number }[]
  payments?: { date: string; amount: number }[]
  inventory?: { model: string; stock: number }[]
}

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

const FanClient = ({ client }: { client: Client }) => {
  const today = new Date().toISOString().split('T')[0]
  const [dateFilter, setDateFilter] = useState({ from: '', to: today })
  const [statPeriod, setStatPeriod] = useState<'week' | 'month' | 'year'>('month')

  const isInRange = (date: string) => {
    const d = new Date(date)
    const from = dateFilter.from ? new Date(dateFilter.from) : null
    const to = dateFilter.to ? new Date(dateFilter.to) : null
    return (!from || d >= from) && (!to || d <= to)
  }

  const sales = (client.sales || []).filter(s => isInRange(s.date)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const payments = (client.payments || []).filter(p => isInRange(p.date)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const inventory = client.inventory || []

  const periodStats = useMemo(() => {
    const { start, end } = periodBounds(statPeriod)
    const inPeriod = (d: string) => { const dt = new Date(d); return dt >= start && dt <= end }
    const units = (client.sales || []).filter(s => inPeriod(s.date)).reduce((s, e) => s + e.quantity, 0)
    const paid = (client.payments || []).filter(p => inPeriod(p.date)).reduce((s, p) => s + (p.amount || 0), 0)
    return { units, paid }
  }, [client.sales, client.payments, statPeriod])

  const balance = client.balance ?? 0
  const isPaid = balance <= 0

  return (
    <Box>
      {/* Header banner */}
      <Box sx={{ background: 'linear-gradient(135deg, #f57f17 0%, #ff8f00 50%, #ffa000 100%)', color: '#fff', px: 4, py: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2.5}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 52, height: 52 }}>
            <ElectricBoltIcon sx={{ fontSize: 28 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>{client.name}</Typography>
            <Chip label="Fan" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 11 }} />
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
            { label: 'Units Sold', value: String(periodStats.units), color: '#fff9c4' },
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
        {/* Date filters */}
        <Box display="flex" gap={2} flexWrap="wrap" alignItems="center" mb={3}>
          <TextField label="From" type="date" size="small" InputLabelProps={{ shrink: true }} value={dateFilter.from} onChange={e => setDateFilter(p => ({ ...p, from: e.target.value }))} sx={{ width: 150 }} />
          <TextField label="To" type="date" size="small" InputLabelProps={{ shrink: true }} value={dateFilter.to} onChange={e => setDateFilter(p => ({ ...p, to: e.target.value }))} sx={{ width: 150 }} />
        </Box>

        <Grid container spacing={3}>
          {/* Sales */}
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #e2e8f0' }}>
                <ShoppingCartIcon sx={{ color: '#ef5350', fontSize: 20 }} />
                <Typography fontWeight={700}>Fan Sales</Typography>
                <Chip label={sales.length} size="small" sx={{ ml: 'auto', bgcolor: '#fce4ec', color: '#c62828', fontWeight: 700 }} />
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <HeadCell>Date</HeadCell>
                      <HeadCell>Model</HeadCell>
                      <HeadCell>Qty</HeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sales.map((s, i) => (
                      <TableRow key={i} hover sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>{fmtDate(s.date)}</TableCell>
                        <TableCell><Chip label={s.model} size="small" sx={{ bgcolor: '#fff9c4', color: '#f57f17', fontWeight: 600, fontSize: 12 }} /></TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{s.quantity}</TableCell>
                      </TableRow>
                    ))}
                    {sales.length === 0 && (
                      <TableRow><TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.disabled' }}>No sales in this period.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Payments */}
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #e2e8f0' }}>
                <MonetizationOnIcon sx={{ color: '#43a047', fontSize: 20 }} />
                <Typography fontWeight={700}>Transactions</Typography>
                <Chip label={payments.length} size="small" sx={{ ml: 'auto', bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 700 }} />
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <HeadCell>Date</HeadCell>
                      <HeadCell>Amount</HeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payments.map((p, i) => (
                      <TableRow key={i} hover sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>{fmtDate(p.date)}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#2e7d32' }}>{fmtCur(p.amount || 0)}</TableCell>
                      </TableRow>
                    ))}
                    {payments.length === 0 && (
                      <TableRow><TableCell colSpan={2} align="center" sx={{ py: 4, color: 'text.disabled' }}>No transactions in this period.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              {payments.length > 0 && (
                <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                  <Typography variant="body2" fontWeight={600} color="text.secondary">
                    Total: <span style={{ color: '#2e7d32' }}>{fmtCur(payments.reduce((s, p) => s + (p.amount || 0), 0))}</span>
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Inventory */}
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #e2e8f0' }}>
                <InventoryIcon sx={{ color: '#7b1fa2', fontSize: 20 }} />
                <Typography fontWeight={700}>Inventory</Typography>
                <Chip label={inventory.length} size="small" sx={{ ml: 'auto', bgcolor: '#f3e5f5', color: '#6a1b9a', fontWeight: 700 }} />
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <HeadCell>Model</HeadCell>
                      <HeadCell>Stock</HeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {inventory.map((item, i) => (
                      <TableRow key={i} hover sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell sx={{ fontWeight: 600 }}>{item.model}</TableCell>
                        <TableCell>
                          <Chip
                            label={item.stock}
                            size="small"
                            sx={{ bgcolor: item.stock > 0 ? '#e8f5e9' : '#ffebee', color: item.stock > 0 ? '#2e7d32' : '#c62828', fontWeight: 700 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {inventory.length === 0 && (
                      <TableRow><TableCell colSpan={2} align="center" sx={{ py: 4, color: 'text.disabled' }}>No inventory data.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
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

export default FanClient
