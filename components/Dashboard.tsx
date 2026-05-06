'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Navbar from './Navbar'
import axios from 'axios'
import {
  Avatar, Box, Chip, CircularProgress, Dialog, DialogContent, DialogTitle,
  Grid, IconButton, Paper, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tabs, Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import PayeeDetailModal from './Utils/PayeeDetailModal'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import PeopleIcon from '@mui/icons-material/People'
import WaterDropIcon from '@mui/icons-material/WaterDrop'
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt'
import EngineeringIcon from '@mui/icons-material/Engineering'
import PieChartIcon from '@mui/icons-material/PieChart'
import BarChartIcon from '@mui/icons-material/BarChart'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import {
  ArcElement, Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler)

type Period = 'week' | 'month' | 'year'

const fmtCur = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN')}`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })

/** Start and end timestamps for the selected period */
function periodRange(period: Period): { start: Date; end: Date } {
  const now = new Date()
  if (period === 'week') {
    const start = new Date(now)
    start.setDate(now.getDate() - 6)
    start.setHours(0, 0, 0, 0)
    return { start, end: now }
  }
  if (period === 'month') {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now }
  }
  // year
  return { start: new Date(now.getFullYear(), 0, 1), end: now }
}

function inRange(dateStr: string, start: Date, end: Date) {
  const d = new Date(dateStr)
  return d >= start && d <= end
}

/** Build chart labels for the period */
function chartLabels(period: Period): string[] {
  const now = new Date()
  if (period === 'week') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now)
      d.setDate(now.getDate() - 6 + i)
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    })
  }
  if (period === 'month') {
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const today = now.getDate()
    return Array.from({ length: today }, (_, i) =>
      new Date(now.getFullYear(), now.getMonth(), i + 1)
        .toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    )
  }
  // year — monthly labels
  return Array.from({ length: 12 }, (_, i) =>
    new Date(now.getFullYear(), i, 1).toLocaleDateString('en-IN', { month: 'short' })
  )
}

function dateLabel(dateStr: string, period: Period): string {
  const d = new Date(dateStr)
  if (period === 'year') return d.toLocaleDateString('en-IN', { month: 'short' })
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

function sumByLabel(
  records: { date: string; amount: number }[],
  labels: string[],
  period: Period,
) {
  const map: Record<string, number> = {}
  records.forEach(r => {
    const k = dateLabel(r.date, period)
    map[k] = (map[k] || 0) + r.amount
  })
  return labels.map(l => map[l] || 0)
}

const KpiCard = ({ icon, label, value, color, sub, trend }: {
  icon: React.ReactNode; label: string; value: string; color: string; sub?: string; trend?: 'up' | 'down' | null
}) => (
  <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden', height: '100%' }}>
    <Box sx={{ height: 4, bgcolor: color }} />
    <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Avatar sx={{ bgcolor: color + '20', color, width: 44, height: 44 }}>{icon}</Avatar>
      <Box flex={1}>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>{label}</Typography>
        <Typography variant="h6" fontWeight={700}>{value}</Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </Box>
    </Box>
  </Paper>
)

const HeadCell = ({ children }: { children: React.ReactNode }) => (
  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, py: 1.25, bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
    {children}
  </TableCell>
)

const PERIOD_LABELS: Record<Period, string> = { week: 'This Week', month: 'This Month', year: 'This Year' }

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>('month')
  const [clients, setClients] = useState<{ _id: string; name: string; balance: number; calculatedBalance?: number; category: string }[]>([])
  const [allIncome, setAllIncome] = useState<{ date: string; amount: number; reason: string; client?: string }[]>([])
  const [allExpenses, setAllExpenses] = useState<{ date: string; amount: number; reason: string; payee?: string }[]>([])
  const [allSubEntries, setAllSubEntries] = useState<{ date: string; quantity: number }[]>([])
  const [allFanEntries, setAllFanEntries] = useState<{ date: string; quantity: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [payeeModal, setPayeeModal] = useState<string | null>(null)
  const [clientModal, setClientModal] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      axios.get('/api/client'),
      axios.get('/api/income'),
      axios.get('/api/expense'),
      axios.get('/api/submersible'),
      axios.get('/api/fan'),
    ]).then(([c, inc, exp, sub, fan]) => {
      setClients(c.data)
      setAllIncome(inc.data)
      setAllExpenses(exp.data)
      setAllSubEntries(sub.data)
      setAllFanEntries(fan.data)
    }).finally(() => setLoading(false))
  }, [])

  const { start, end } = useMemo(() => periodRange(period), [period])
  const labels = useMemo(() => chartLabels(period), [period])

  const income = useMemo(() => allIncome.filter(r => inRange(r.date, start, end)), [allIncome, start, end])
  const expenses = useMemo(() => allExpenses.filter(r => inRange(r.date, start, end)), [allExpenses, start, end])
  const subEntries = useMemo(() => allSubEntries.filter(r => inRange(r.date, start, end)), [allSubEntries, start, end])
  const fanEntries = useMemo(() => allFanEntries.filter(r => inRange(r.date, start, end)), [allFanEntries, start, end])

  const totalIncome = income.reduce((s, r) => s + r.amount, 0)
  const totalExpense = expenses.reduce((s, r) => s + r.amount, 0)
  const net = totalIncome - totalExpense
  const outstanding = clients.reduce((s, c) => s + Math.max(c.calculatedBalance ?? c.balance ?? 0, 0), 0)
  const paidClients = clients.filter(c => (c.calculatedBalance ?? c.balance ?? 0) <= 0).length

  // Income vs Expense chart
  const incomeByLabel = useMemo(() => sumByLabel(income, labels, period), [income, labels, period])
  const expenseByLabel = useMemo(() => sumByLabel(expenses, labels, period), [expenses, labels, period])

  const incomeExpenseChart = {
    labels,
    datasets: [
      { label: 'Income', data: incomeByLabel, backgroundColor: 'rgba(46,125,50,0.15)', borderColor: '#2e7d32', borderWidth: 2, fill: true, tension: 0.4, pointBackgroundColor: '#2e7d32', pointRadius: 3 },
      { label: 'Expense', data: expenseByLabel, backgroundColor: 'rgba(198,40,40,0.12)', borderColor: '#c62828', borderWidth: 2, fill: true, tension: 0.4, pointBackgroundColor: '#c62828', pointRadius: 3 },
    ],
  }
  const lineOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { boxWidth: 12, font: { size: 12 } } },
      tooltip: { callbacks: { label: (ctx: import('chart.js').TooltipItem<'line'>) => `${ctx.dataset.label ?? ''}: ₹${(ctx.parsed.y ?? 0).toLocaleString('en-IN')}` } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { maxRotation: 45, font: { size: 11 } } },
      y: { ticks: { callback: (v: unknown) => `₹${Number(v).toLocaleString('en-IN')}` }, grid: { color: '#f0f4f8' } },
    },
  }

  // Units chart
  const subByLabel = useMemo(() => sumByLabel(subEntries.map(e => ({ ...e, amount: e.quantity })), labels, period), [subEntries, labels, period])
  const fanByLabel = useMemo(() => sumByLabel(fanEntries.map(e => ({ ...e, amount: e.quantity })), labels, period), [fanEntries, labels, period])

  const unitsChart = {
    labels,
    datasets: [
      { label: 'Submersible', data: subByLabel, backgroundColor: 'rgba(2,136,209,0.75)', borderRadius: 4 },
      { label: 'Fan', data: fanByLabel, backgroundColor: 'rgba(245,124,0,0.75)', borderRadius: 4 },
    ],
  }
  const barOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'top' as const, labels: { boxWidth: 12, font: { size: 12 } } } },
    scales: { x: { grid: { display: false }, ticks: { maxRotation: 45, font: { size: 11 } } }, y: { grid: { color: '#f0f4f8' } } },
  }

  // Top outstanding clients (all-time, not filtered by period)
  const topClients = [...clients]
    .filter(c => (c.calculatedBalance ?? c.balance ?? 0) > 0)
    .sort((a, b) => (b.calculatedBalance ?? b.balance ?? 0) - (a.calculatedBalance ?? a.balance ?? 0))
    .slice(0, 12)

  const clientBalanceChart = {
    labels: topClients.map(c => c.name),
    datasets: [{ label: 'Outstanding (₹)', data: topClients.map(c => c.calculatedBalance ?? c.balance ?? 0), backgroundColor: 'rgba(198,40,40,0.75)', borderColor: '#c62828', borderWidth: 1, borderRadius: 4 }],
  }
  const clientBarOptions = {
    responsive: true, maintainAspectRatio: false, indexAxis: 'y' as const,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: { parsed: { x: number } }) => `₹${ctx.parsed.x.toLocaleString('en-IN')}` } } },
    scales: { x: { ticks: { callback: (v: unknown) => `₹${Number(v).toLocaleString('en-IN')}` }, grid: { color: '#f0f4f8' } }, y: { grid: { display: false } } },
  }

  const recentIncome = [...income].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8)
  const recentExpense = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8)

  // Revenue by product type
  const submersibleRevenue = income.filter(r => r.reason === 'Submersible Payment').reduce((s, r) => s + r.amount, 0)
  const fanRevenue = income.filter(r => r.reason === 'Fan Payment').reduce((s, r) => s + r.amount, 0)
  const scrapRevenue = income.filter(r => r.reason === 'Scrap Payment').reduce((s, r) => s + r.amount, 0)
  const miscRevenue = income.filter(r => r.reason === 'Misc').reduce((s, r) => s + r.amount, 0)

  // Expense breakdown by category
  const EXPENSE_CATEGORIES = ['Labour Cost', 'Raw Material', 'Logistics', 'Oil', 'Hardware', 'Electricity', 'Maintenance', 'Misc']
  const EXPENSE_COLORS = ['#1565c0', '#6a1b9a', '#00695c', '#e65100', '#4e342e', '#f9a825', '#2e7d32', '#546e7a']
  const expenseByCategory = EXPENSE_CATEGORIES.map(cat => expenses.filter(e => e.reason === cat).reduce((s, e) => s + e.amount, 0))
  const laborCost = expenseByCategory[0]

  const revenueByProductChart = {
    labels: ['Submersible', 'Fan', 'Scrap', 'Misc'],
    datasets: [{
      data: [submersibleRevenue, fanRevenue, scrapRevenue, miscRevenue],
      backgroundColor: ['rgba(2,136,209,0.8)', 'rgba(245,124,0,0.8)', 'rgba(85,139,47,0.8)', 'rgba(120,120,120,0.8)'],
      borderColor: ['#0277bd', '#e65100', '#558b2f', '#757575'],
      borderWidth: 1,
    }],
  }

  const expenseBreakdownChart = {
    labels: EXPENSE_CATEGORIES,
    datasets: [{
      data: expenseByCategory,
      backgroundColor: EXPENSE_COLORS.map(c => c + 'cc'),
      borderColor: EXPENSE_COLORS,
      borderWidth: 1,
    }],
  }

  const doughnutOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' as const, labels: { boxWidth: 12, font: { size: 11 }, padding: 8 } },
      tooltip: { callbacks: { label: (ctx: import('chart.js').TooltipItem<'doughnut'>) => ` ₹${(ctx.parsed ?? 0).toLocaleString('en-IN')} (${ctx.label})` } },
    },
  }

  if (loading) return (
    <>
      <Navbar />
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh"><CircularProgress /></Box>
    </>
  )

  return (
    <>
      <Navbar />

      {/* Header with period tabs */}
      <Box sx={{ background: 'linear-gradient(135deg, #1a237e 0%, #0288d1 100%)', color: '#fff', px: 4, py: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mb={2}>
          <Typography variant="h5" fontWeight={700}>Dashboard</Typography>

          {/* Period selector */}
          <Tabs
            value={period}
            onChange={(_, v) => setPeriod(v)}
            sx={{
              minHeight: 34,
              bgcolor: 'rgba(255,255,255,0.12)',
              borderRadius: 2,
              px: 0.5,
              '& .MuiTab-root': { color: 'rgba(255,255,255,0.6)', minHeight: 34, py: 0.5, px: 2, fontSize: 13, textTransform: 'none', fontWeight: 500, borderRadius: 1.5 },
              '& .Mui-selected': { color: '#fff', fontWeight: 700, bgcolor: 'rgba(255,255,255,0.2)' },
              '& .MuiTabs-indicator': { display: 'none' },
            }}
          >
            <Tab label="This Week" value="week" />
            <Tab label="This Month" value="month" />
            <Tab label="This Year" value="year" />
          </Tabs>
        </Box>

        {/* Summary stats */}
        <Box display="flex" gap={4} flexWrap="wrap">
          {[
            { label: 'Income', value: fmtCur(totalIncome), color: '#ccff90' },
            { label: 'Expense', value: fmtCur(totalExpense), color: '#ff8a80' },
            { label: 'Net', value: fmtCur(net), color: net >= 0 ? '#ccff90' : '#ff8a80' },
          ].map(s => (
            <Box key={s.label}>
              <Typography variant="h6" fontWeight={700} sx={{ color: s.color }}>{s.value}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.75 }}>{s.label} · {PERIOD_LABELS[period]}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ p: 3 }}>
        {/* KPI cards */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard icon={<TrendingUpIcon />} label="Income" value={fmtCur(totalIncome)} color="#2e7d32" sub={`${income.length} transactions`} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard icon={<TrendingDownIcon />} label="Expense" value={fmtCur(totalExpense)} color="#c62828" sub={`${expenses.length} transactions`} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard icon={<PeopleIcon />} label="Clients" value={String(clients.length)} color="#1976d2" sub={`${paidClients} paid up`} />
          </Grid>
        </Grid>

        {/* Revenue by product + Labour cost KPI row */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard icon={<WaterDropIcon />} label="Submersible Revenue" value={fmtCur(submersibleRevenue)} color="#0288d1" sub={`${income.filter(r => r.reason === 'Submersible Payment').length} payments`} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard icon={<ElectricBoltIcon />} label="Fan Revenue" value={fmtCur(fanRevenue)} color="#f57c00" sub={`${income.filter(r => r.reason === 'Fan Payment').length} payments`} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard icon={<BarChartIcon />} label="Scrap Revenue" value={fmtCur(scrapRevenue)} color="#558b2f" sub={`${income.filter(r => r.reason === 'Scrap Payment').length} payments`} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard icon={<EngineeringIcon />} label="Labour Cost" value={fmtCur(laborCost)} color="#1565c0" sub={`${expenses.filter(e => e.reason === 'Labour Cost').length} entries`} />
          </Grid>
        </Grid>

        {/* Revenue breakdown + Expense breakdown charts */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ height: 4, bgcolor: '#0288d1' }} />
              <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f0f4f8', display: 'flex', alignItems: 'center', gap: 1 }}>
                <PieChartIcon sx={{ color: '#0288d1', fontSize: 20 }} />
                <Typography fontWeight={700}>Revenue by Product</Typography>
                <Chip label={PERIOD_LABELS[period]} size="small" sx={{ ml: 'auto', bgcolor: '#e3f2fd', color: '#0277bd', fontWeight: 600 }} />
              </Box>
              <Box sx={{ p: 2.5, height: 260 }}>
                <Doughnut data={revenueByProductChart} options={doughnutOptions} />
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ height: 4, bgcolor: '#c62828' }} />
              <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f0f4f8', display: 'flex', alignItems: 'center', gap: 1 }}>
                <PieChartIcon sx={{ color: '#c62828', fontSize: 20 }} />
                <Typography fontWeight={700}>Expense Breakdown</Typography>
                <Chip label={PERIOD_LABELS[period]} size="small" sx={{ ml: 'auto', bgcolor: '#ffebee', color: '#c62828', fontWeight: 600 }} />
              </Box>
              <Box sx={{ p: 2.5, height: 260 }}>
                <Doughnut data={expenseBreakdownChart} options={doughnutOptions} />
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Expense category breakdown table */}
        <Grid container spacing={2} mb={3}>
          {EXPENSE_CATEGORIES.map((cat, i) => (
            <Grid item xs={6} sm={4} md={3} key={cat}>
              <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ height: 3, bgcolor: EXPENSE_COLORS[i] }} />
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{cat}</Typography>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ color: expenseByCategory[i] > 0 ? EXPENSE_COLORS[i] : 'text.disabled' }}>
                    {fmtCur(expenseByCategory[i])}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {expenses.filter(e => e.reason === cat).length} entries
                    {totalExpense > 0 && expenseByCategory[i] > 0 ? ` · ${Math.round(expenseByCategory[i] / totalExpense * 100)}%` : ''}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Charts row 1 */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} lg={7}>
            <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ height: 4, bgcolor: '#1976d2' }} />
              <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <TrendingUpIcon sx={{ color: '#1976d2', fontSize: 20 }} />
                  <Typography fontWeight={700}>Income vs Expense</Typography>
                </Box>
                <Chip label={PERIOD_LABELS[period]} size="small" sx={{ bgcolor: '#e3f2fd', color: '#0277bd', fontWeight: 600 }} />
              </Box>
              <Box sx={{ p: 2.5, height: 300 }}>
                <Line data={incomeExpenseChart} options={lineOptions} />
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={5}>
            <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ height: 4, bgcolor: '#0288d1' }} />
              <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <WaterDropIcon sx={{ color: '#0288d1', fontSize: 20 }} />
                  <Typography fontWeight={700}>Units Sold</Typography>
                </Box>
                <Box display="flex" gap={1}>
                  <Chip label={`${subEntries.reduce((s, e) => s + e.quantity, 0)} sub`} size="small" sx={{ bgcolor: '#e3f2fd', color: '#0277bd', fontWeight: 600, fontSize: 11 }} />
                  <Chip label={`${fanEntries.reduce((s, e) => s + e.quantity, 0)} fan`} size="small" sx={{ bgcolor: '#fff9c4', color: '#f57f17', fontWeight: 600, fontSize: 11 }} />
                </Box>
              </Box>
              <Box sx={{ p: 2.5, height: 300 }}>
                <Bar data={unitsChart} options={barOptions} />
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Charts row 2 */}
        <Grid container spacing={3} mb={3}>
          {/* Recent transactions */}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                  <Box sx={{ height: 4, bgcolor: '#2e7d32' }} />
                  <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #f0f4f8', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUpIcon sx={{ color: '#2e7d32', fontSize: 18 }} />
                    <Typography fontWeight={700} fontSize={14}>Recent Income</Typography>
                    <Chip label={income.length} size="small" sx={{ ml: 'auto', bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 600 }} />
                  </Box>
                  <TableContainer sx={{ maxHeight: 220 }}>
                    <Table size="small">
                      <TableHead><TableRow><HeadCell>Client</HeadCell><HeadCell>Reason</HeadCell><HeadCell>Amount</HeadCell><HeadCell>Date</HeadCell></TableRow></TableHead>
                      <TableBody>
                        {recentIncome.map((r, i) => (
                          <TableRow key={i} hover sx={{ '&:last-child td': { border: 0 } }}>
                            <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>
                              {r.client
                                ? <Typography component="span" fontWeight={600} fontSize={13} onClick={() => setClientModal(r.client!)} sx={{ cursor: 'pointer', color: '#1976d2', '&:hover': { textDecoration: 'underline' } }}>{r.client}</Typography>
                                : '—'}
                            </TableCell>
                            <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>{r.reason}</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#2e7d32', fontSize: 13 }}>{fmtCur(r.amount)}</TableCell>
                            <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{fmtDate(r.date)}</TableCell>
                          </TableRow>
                        ))}
                        {recentIncome.length === 0 && <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.disabled' }}>No income this period.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                  <Box sx={{ height: 4, bgcolor: '#c62828' }} />
                  <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #f0f4f8', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingDownIcon sx={{ color: '#c62828', fontSize: 18 }} />
                    <Typography fontWeight={700} fontSize={14}>Recent Expenses</Typography>
                    <Chip label={expenses.length} size="small" sx={{ ml: 'auto', bgcolor: '#ffebee', color: '#c62828', fontWeight: 600 }} />
                  </Box>
                  <TableContainer sx={{ maxHeight: 220 }}>
                    <Table size="small">
                      <TableHead><TableRow><HeadCell>Payee</HeadCell><HeadCell>Reason</HeadCell><HeadCell>Amount</HeadCell><HeadCell>Date</HeadCell></TableRow></TableHead>
                      <TableBody>
                        {recentExpense.map((r, i) => (
                          <TableRow key={i} hover sx={{ '&:last-child td': { border: 0 } }}>
                            <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>
                              {r.payee ? (
                                <Typography component="span" fontWeight={600} fontSize={13}
                                  onClick={() => setPayeeModal(r.payee!)}
                                  sx={{ cursor: 'pointer', color: '#1976d2', '&:hover': { textDecoration: 'underline' } }}>
                                  {r.payee}
                                </Typography>
                              ) : '—'}
                            </TableCell>
                            <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>{r.reason}</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#c62828', fontSize: 13 }}>{fmtCur(r.amount)}</TableCell>
                            <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{fmtDate(r.date)}</TableCell>
                          </TableRow>
                        ))}
                        {recentExpense.length === 0 && <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.disabled' }}>No expenses this period.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

      </Box>

      {payeeModal && (
        <PayeeDetailModal payee={payeeModal} expenses={allExpenses} open={!!payeeModal} onClose={() => setPayeeModal(null)} />
      )}

      {/* Client income modal */}
      <Dialog open={!!clientModal} onClose={() => setClientModal(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700, pb: 1 }}>
          <Box>
            <Typography fontWeight={700} fontSize={18}>{clientModal}</Typography>
            <Typography variant="caption" color="text.secondary">All-time income history</Typography>
          </Box>
          <IconButton onClick={() => setClientModal(null)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {(() => {
            const clientIncomes = allIncome
              .filter(r => r.client === clientModal)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            const total = clientIncomes.reduce((s, r) => s + r.amount, 0)
            return (
              <>
                <Box sx={{ px: 3, py: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 3 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Received</Typography>
                    <Typography fontWeight={700} color="#2e7d32" fontSize={18}>{fmtCur(total)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Transactions</Typography>
                    <Typography fontWeight={700} fontSize={18}>{clientIncomes.length}</Typography>
                  </Box>
                </Box>
                <TableContainer sx={{ maxHeight: 420 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <HeadCell>Date</HeadCell>
                        <HeadCell>Reason</HeadCell>
                        <HeadCell>Amount</HeadCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {clientIncomes.map((r, i) => (
                        <TableRow key={i} hover sx={{ '&:last-child td': { border: 0 } }}>
                          <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>{fmtDate(r.date)}</TableCell>
                          <TableCell sx={{ fontSize: 13 }}>{r.reason}</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: '#2e7d32', fontSize: 13 }}>{fmtCur(r.amount)}</TableCell>
                        </TableRow>
                      ))}
                      {clientIncomes.length === 0 && (
                        <TableRow><TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.disabled' }}>No income recorded.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </>
  )
}
