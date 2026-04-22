'use client'

import React, { useEffect, useState } from 'react'
import AddIcon from '@mui/icons-material/Add'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LinkIcon from '@mui/icons-material/Link'
import HomeIcon from '@mui/icons-material/Home'
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import axios from 'axios'
import {
  Autocomplete, Box, Button, Collapse, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControl, Grid, IconButton, MenuItem, Select,
  Switch, TextField, ToggleButton, ToggleButtonGroup, Typography, useMediaQuery, useTheme,
} from '@mui/material'
import dayjs from 'dayjs'
import SnackbarMessage from '../Utils/Snackbar'

type Snack = { open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }
const defaultRow = { client: '', payee: '', reason: '', amount: '', medium: 'Cash', transferMethod: '', comment: '', date: dayjs(), isOneTime: false }
const defaultLinkedExpense = { payee: '', reason: '', amount: '', medium: 'Cash', transferMethod: '', comment: '' }
const defaultPersonal = { category: '', description: '', amount: '', medium: 'Cash', transferMethod: '', comment: '', date: dayjs() }
const reasons = {
  expense: ['Labour Cost', 'Raw Material', 'Logistics', 'Oil', 'Hardware', 'Electricity', 'Maintenance', 'Misc'],
  income: ['Fan Payment', 'Submersible Payment', 'Scrap Payment', 'Misc'],
}
const personalCategories = ['Groceries', 'Medical', 'School / Education', 'Rent', 'Utilities', 'Travel', 'Clothing', 'Entertainment', 'Misc']

const Label = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
    {children}
  </Typography>
)

const ExpenseTracker = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('expense')
  const [dialogCategory, setDialogCategory] = useState('expense')
  const [rows, setRows] = useState([{ ...defaultRow }])
  const [clients, setClients] = useState<{ name: string }[]>([])
  const [employees, setEmployees] = useState<{ name: string; category: string }[]>([])
  const [snackbar, setSnackbar] = useState<Snack>({ open: false, message: '', severity: 'success' })
  const [singleEntry, setSingleEntry] = useState({ ...defaultRow })
  const [submitting, setSubmitting] = useState(false)

  // Linked expense when adding income
  const [incomeType, setIncomeType] = useState<'client' | 'onetime'>('client')
  const [addLinkedExpense, setAddLinkedExpense] = useState(false)
  const [linkedExpense, setLinkedExpense] = useState({ ...defaultLinkedExpense })

  // Personal / family expense
  const [personal, setPersonal] = useState({ ...defaultPersonal })
  const [personalSubmitting, setPersonalSubmitting] = useState(false)

  const fetchEmployees = () =>
    axios.get('/api/employee').then(res => setEmployees(res.data)).catch(() => {})

  useEffect(() => {
    axios.get('/api/client').then(res => setClients(res.data.sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name))))
    fetchEmployees()
  }, [])

  const saveNewEmployee = async (name: string, cat: string) => {
    if (!name.trim()) return
    const exists = employees.some(e => e.name.toLowerCase() === name.trim().toLowerCase())
    if (!exists) {
      await axios.post('/api/employee', { name: name.trim(), category: cat }).catch(() => {})
      fetchEmployees()
    }
  }

  const renderPayeeField = (
    reason: string,
    payee: string,
    onPayeeChange: (val: string) => void,
    size: 'small' | 'medium' = 'medium',
  ) => {
    const labourOptions = employees.filter(e => e.category === 'labour').map(e => e.name)
    const supplierOptions = employees.filter(e => e.category === 'supplier').map(e => e.name)

    if (reason === 'Labour Cost') {
      return (
        <Autocomplete
          freeSolo
          options={labourOptions}
          value={payee}
          onInputChange={(_, val) => onPayeeChange(val)}
          size={size}
          renderInput={params => (
            <TextField {...params} fullWidth placeholder="Select or type employee…"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          )}
        />
      )
    }
    if (reason === 'Raw Material') {
      return (
        <FormControl fullWidth size={size}>
          <Select value={payee} onChange={e => onPayeeChange(e.target.value)} displayEmpty sx={{ borderRadius: 2 }}>
            <MenuItem value="" disabled><em style={{ color: '#aaa' }}>Select supplier…</em></MenuItem>
            {supplierOptions.map((s, i) => <MenuItem key={i} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
      )
    }
    return (
      <TextField fullWidth size={size} placeholder="Enter payee name" value={payee}
        onChange={e => onPayeeChange(e.target.value)}
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
    )
  }

  // Reset income-specific state when switching away from income
  useEffect(() => {
    if (category !== 'income') {
      setAddLinkedExpense(false)
      setLinkedExpense({ ...defaultLinkedExpense })
      setIncomeType('client')
    }
  }, [category])

  const showSnack = (message: string, severity: 'success' | 'error' = 'success') => setSnackbar({ open: true, message, severity })
  const set = (field: string, val: unknown) => setSingleEntry(p => ({
    ...p,
    [field]: val,
    ...(field === 'reason' ? { payee: '' } : {}),
  }))
  const setLinked = (field: string, val: unknown) => setLinkedExpense(p => ({ ...p, [field]: val }))
  const setPer = (field: string, val: unknown) => setPersonal(p => ({ ...p, [field]: val }))

  const isPersonalValid = () => {
    if (!personal.category || !personal.amount || !personal.date || !personal.medium) return false
    if (personal.medium === 'Transfer' && !personal.transferMethod) return false
    return true
  }

  const handlePersonalSubmit = async () => {
    if (!isPersonalValid()) { showSnack('Please fill all required fields.', 'error'); return }
    setPersonalSubmitting(true)
    try {
      await axios.post('/api/personal-expense', {
        category: personal.category,
        description: personal.description,
        amount: personal.amount,
        date: personal.date,
        medium: personal.medium,
        transferMethod: personal.medium === 'Transfer' ? personal.transferMethod : '',
        comment: personal.comment,
      })
      showSnack('Personal expense submitted!')
      setPersonal({ ...defaultPersonal })
    } catch (err: unknown) { showSnack((err as Error).message || 'Something went wrong.', 'error') }
    finally { setPersonalSubmitting(false) }
  }
  const handleRowChange = (i: number, field: string, val: unknown) => { const next = [...rows]; (next[i] as Record<string, unknown>)[field] = val; setRows(next) }

  const isLinkedExpenseValid = () => {
    if (!addLinkedExpense) return true
    if (!linkedExpense.payee || !linkedExpense.reason || !linkedExpense.amount || !linkedExpense.medium) return false
    if (linkedExpense.medium === 'Transfer' && !linkedExpense.transferMethod) return false
    return true
  }

  const isValid = () => {
    const s = singleEntry
    if (!s.reason || !s.amount || !s.date || !s.medium) return false
    if (s.medium === 'Transfer' && !s.transferMethod) return false
    if (category === 'income' && incomeType === 'client' && !s.client) return false
    if (category === 'expense' && !s.payee) return false
    if (!isLinkedExpenseValid()) return false
    return true
  }

  const handleSubmit = async () => {
    if (!isValid()) { showSnack('Please fill all required fields.', 'error'); return }
    setSubmitting(true)
    const isOneTime = category === 'income' && incomeType === 'onetime'
    const payload = { reason: singleEntry.reason, amount: singleEntry.amount, date: singleEntry.date, comment: singleEntry.comment, medium: singleEntry.medium, transferMethod: singleEntry.medium === 'Transfer' ? singleEntry.transferMethod : '', ...(category === 'income' ? { client: singleEntry.client || 'One-Time', isOneTime } : { payee: singleEntry.payee }) }
    try {
      if (category === 'expense' && singleEntry.reason === 'Labour Cost') {
        await saveNewEmployee(singleEntry.payee, 'labour')
      }

      const fullPayload = category === 'income' && addLinkedExpense
        ? { ...payload, linkedExpense: { payee: linkedExpense.payee, reason: linkedExpense.reason, amount: linkedExpense.amount, medium: linkedExpense.medium, transferMethod: linkedExpense.medium === 'Transfer' ? linkedExpense.transferMethod : '', comment: linkedExpense.comment } }
        : payload

      await axios.post(`/api/${category}`, fullPayload)
      showSnack(addLinkedExpense ? 'Income and linked expense submitted!' : 'Entry submitted successfully!')

      setSingleEntry({ ...defaultRow })
      setLinkedExpense({ ...defaultLinkedExpense })
      setAddLinkedExpense(false)
    } catch (err: unknown) { showSnack((err as Error).message || 'Something went wrong.', 'error') }
    finally { setSubmitting(false) }
  }

  const handleSubmitMultiple = async () => {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      if (!r.reason || !r.amount || !r.date || !r.medium) { showSnack(`Fill all required fields in row ${i + 1}.`, 'error'); return }
      if (r.medium === 'Transfer' && !r.transferMethod) { showSnack(`Select transfer method in row ${i + 1}.`, 'error'); return }
      if (dialogCategory === 'income' && !r.client) { showSnack(`Select client in row ${i + 1}.`, 'error'); return }
      if (dialogCategory === 'expense' && !r.payee) { showSnack(`Enter payee in row ${i + 1}.`, 'error'); return }
    }
    try {
      for (const r of rows) {
        const payload = { reason: r.reason, amount: r.amount, date: r.date, comment: r.comment, medium: r.medium, transferMethod: r.medium === 'Transfer' ? r.transferMethod : '', ...(dialogCategory === 'income' ? { client: r.client } : { payee: r.payee }) }
        await axios.post(`/api/${dialogCategory}`, payload)
      }
      showSnack('All entries submitted!')
      setRows([{ ...defaultRow }])
      setOpen(false)
    } catch (err: unknown) { showSnack((err as Error).message || 'Something went wrong.', 'error') }
  }

  const isIncome = category === 'income'
  const isPersonal = category === 'personal'
  const accentColor = isIncome ? '#2e7d32' : isPersonal ? '#6a1b9a' : '#c62828'

  return (
    <>
      <Box sx={{ bgcolor: '#fff', borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <Box sx={{ height: 4, bgcolor: accentColor }} />

        <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid #f0f4f8' }}>
          <AccountBalanceWalletIcon sx={{ color: accentColor }} />
          <Typography fontWeight={700} fontSize={17}>Expense / Income</Typography>
        </Box>

        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Type toggle */}
          <Box mb={3}>
            <Label>Type</Label>
            <ToggleButtonGroup value={category} exclusive onChange={(_, v) => v && setCategory(v)} fullWidth sx={{ gap: 1 }}>
              <ToggleButton value="expense" sx={{ flex: 1, py: 1.5, textTransform: 'none', fontWeight: 600, fontSize: 14, borderRadius: '10px !important', border: '1px solid #e2e8f0 !important', '&.Mui-selected': { bgcolor: '#ffebee', color: '#c62828', borderColor: '#c62828 !important' } }}>
                <TrendingDownIcon sx={{ mr: 0.75, fontSize: 18 }} /> Expense
              </ToggleButton>
              <ToggleButton value="income" sx={{ flex: 1, py: 1.5, textTransform: 'none', fontWeight: 600, fontSize: 14, borderRadius: '10px !important', border: '1px solid #e2e8f0 !important', '&.Mui-selected': { bgcolor: '#e8f5e9', color: '#2e7d32', borderColor: '#2e7d32 !important' } }}>
                <TrendingUpIcon sx={{ mr: 0.75, fontSize: 18 }} /> Income
              </ToggleButton>
              <ToggleButton value="personal" sx={{ flex: 1, py: 1.5, textTransform: 'none', fontWeight: 600, fontSize: 14, borderRadius: '10px !important', border: '1px solid #e2e8f0 !important', '&.Mui-selected': { bgcolor: '#f3e5f5', color: '#6a1b9a', borderColor: '#6a1b9a !important' } }}>
                <HomeIcon sx={{ mr: 0.75, fontSize: 18 }} /> Personal
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* ── Personal / Family Expense Form ── */}
          {isPersonal && (
            <>
              <Box mb={2.5}>
                <Label>Category</Label>
                <FormControl fullWidth>
                  <Select value={personal.category} onChange={e => setPer('category', e.target.value)} displayEmpty sx={{ borderRadius: 2 }}>
                    <MenuItem value="" disabled><em style={{ color: '#aaa' }}>Select category…</em></MenuItem>
                    {personalCategories.map((c, i) => <MenuItem key={i} value={c} sx={{ py: 1.25, fontSize: 15 }}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>

              <Box mb={2.5}>
                <Label>Description (optional)</Label>
                <TextField fullWidth placeholder="What was it for?" value={personal.description} onChange={e => setPer('description', e.target.value)}
                  inputProps={{ style: { fontSize: 15 } }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              </Box>

              <Box mb={2.5}>
                <Label>Amount (₹)</Label>
                <TextField fullWidth type="number" placeholder="0" value={personal.amount} onChange={e => setPer('amount', e.target.value)}
                  inputProps={{ style: { fontSize: 18, fontWeight: 700 } }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              </Box>

              <Grid container spacing={2} mb={2.5}>
                <Grid item xs={personal.medium === 'Transfer' ? 6 : 12}>
                  <Label>Medium</Label>
                  <ToggleButtonGroup value={personal.medium} exclusive onChange={(_, v) => v && setPer('medium', v)} fullWidth sx={{ gap: 1 }}>
                    {['Cash', 'Transfer'].map(m => (
                      <ToggleButton key={m} value={m} sx={{ flex: 1, py: 1.25, textTransform: 'none', fontWeight: 600, borderRadius: '8px !important', border: '1px solid #e2e8f0 !important', '&.Mui-selected': { bgcolor: '#e3f2fd', color: '#1976d2', borderColor: '#1976d2 !important' } }}>
                        {m}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Grid>
                {personal.medium === 'Transfer' && (
                  <Grid item xs={6}>
                    <Label>Transfer Method</Label>
                    <FormControl fullWidth>
                      <Select value={personal.transferMethod} onChange={e => setPer('transferMethod', e.target.value)} displayEmpty sx={{ borderRadius: 2 }}>
                        <MenuItem value="" disabled><em style={{ color: '#aaa' }}>Select…</em></MenuItem>
                        <MenuItem value="UPI" sx={{ py: 1.25 }}>UPI</MenuItem>
                        <MenuItem value="Bank Transfer" sx={{ py: 1.25 }}>Bank Transfer</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                )}
              </Grid>

              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6}>
                  <Label>Comment (optional)</Label>
                  <TextField fullWidth placeholder="Add a note…" value={personal.comment} onChange={e => setPer('comment', e.target.value)}
                    inputProps={{ style: { fontSize: 15 } }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Label>Date</Label>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker value={personal.date} onChange={v => setPer('date', v ?? dayjs())}
                      renderInput={(params) => <TextField {...params} fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} inputProps={{ ...params.inputProps, style: { fontSize: 15 } }} />} />
                  </LocalizationProvider>
                </Grid>
              </Grid>

              <Button fullWidth variant="contained" size="large" onClick={handlePersonalSubmit} disabled={!isPersonalValid() || personalSubmitting}
                startIcon={<CheckCircleIcon />}
                sx={{ py: 1.75, fontSize: 16, fontWeight: 700, borderRadius: 2.5, textTransform: 'none', bgcolor: '#6a1b9a', '&:hover': { bgcolor: '#4a148c' } }}>
                {personalSubmitting ? 'Submitting…' : 'Submit Personal Expense'}
              </Button>
            </>
          )}

          {/* ── Business Expense / Income Form ── */}
          {!isPersonal && <>

          {/* For income: Client/One-time toggle first. For expense: Reason first */}
          {isIncome ? (
            <Box mb={2.5}>
              <Label>Income From</Label>
              <ToggleButtonGroup value={incomeType} exclusive onChange={(_, v) => { if (v) { setIncomeType(v); set('client', '') } }} fullWidth sx={{ gap: 1, mb: 1.5 }}>
                <ToggleButton value="client" sx={{ flex: 1, py: 1.25, textTransform: 'none', fontWeight: 600, fontSize: 14, borderRadius: '8px !important', border: '1px solid #e2e8f0 !important', '&.Mui-selected': { bgcolor: '#e8f5e9', color: '#2e7d32', borderColor: '#2e7d32 !important' } }}>
                  Existing Client
                </ToggleButton>
                <ToggleButton value="onetime" sx={{ flex: 1, py: 1.25, textTransform: 'none', fontWeight: 600, fontSize: 14, borderRadius: '8px !important', border: '1px solid #e2e8f0 !important', '&.Mui-selected': { bgcolor: '#e3f2fd', color: '#1565c0', borderColor: '#1565c0 !important' } }}>
                  One-Time
                </ToggleButton>
              </ToggleButtonGroup>
              {incomeType === 'client' ? (
                <FormControl fullWidth>
                  <Select value={singleEntry.client} onChange={e => set('client', e.target.value)} displayEmpty sx={{ borderRadius: 2 }}>
                    <MenuItem value="" disabled><em style={{ color: '#aaa' }}>Select client…</em></MenuItem>
                    {clients.map((c, i) => <MenuItem key={i} value={c.name} sx={{ py: 1.25, fontSize: 15 }}>{c.name}</MenuItem>)}
                  </Select>
                </FormControl>
              ) : (
                <TextField fullWidth placeholder="Name or description (optional)" value={singleEntry.client}
                  onChange={e => set('client', e.target.value)}
                  inputProps={{ style: { fontSize: 15 } }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              )}
            </Box>
          ) : (
            <Box mb={2.5}>
              <Label>Reason</Label>
              <FormControl fullWidth>
                <Select value={singleEntry.reason} onChange={e => set('reason', e.target.value)} displayEmpty sx={{ borderRadius: 2 }}>
                  <MenuItem value="" disabled><em style={{ color: '#aaa' }}>Select reason…</em></MenuItem>
                  {reasons.expense.map((r, i) => <MenuItem key={i} value={r} sx={{ py: 1.25, fontSize: 15 }}>{r}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
          )}

          {/* Payee (expense) — shown after reason is selected */}
          {!isIncome && singleEntry.reason && (
            <Box mb={2.5}>
              <Label>Payee</Label>
              {renderPayeeField(singleEntry.reason, singleEntry.payee, val => set('payee', val))}
            </Box>
          )}

          {/* Reason (income only — comes after client) */}
          {isIncome && (
            <Box mb={2.5}>
              <Label>Reason</Label>
              <FormControl fullWidth>
                <Select value={singleEntry.reason} onChange={e => set('reason', e.target.value)} displayEmpty sx={{ borderRadius: 2 }}>
                  <MenuItem value="" disabled><em style={{ color: '#aaa' }}>Select reason…</em></MenuItem>
                  {reasons.income.map((r, i) => <MenuItem key={i} value={r} sx={{ py: 1.25, fontSize: 15 }}>{r}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
          )}

          {/* Amount */}
          <Box mb={2.5}>
            <Label>Amount (₹)</Label>
            <TextField fullWidth type="number" placeholder="0" value={singleEntry.amount} onChange={e => set('amount', e.target.value)}
              inputProps={{ style: { fontSize: 18, fontWeight: 700 } }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          </Box>

          {/* Medium row */}
          <Grid container spacing={2} mb={2.5}>
            <Grid item xs={singleEntry.medium === 'Transfer' ? 6 : 12}>
              <Label>Medium</Label>
              <ToggleButtonGroup value={singleEntry.medium} exclusive onChange={(_, v) => v && set('medium', v)} fullWidth sx={{ gap: 1 }}>
                {['Cash', 'Transfer'].map(m => (
                  <ToggleButton key={m} value={m} sx={{ flex: 1, py: 1.25, textTransform: 'none', fontWeight: 600, borderRadius: '8px !important', border: '1px solid #e2e8f0 !important', '&.Mui-selected': { bgcolor: '#e3f2fd', color: '#1976d2', borderColor: '#1976d2 !important' } }}>
                    {m}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Grid>
            {singleEntry.medium === 'Transfer' && (
              <Grid item xs={6}>
                <Label>Transfer Method</Label>
                <FormControl fullWidth>
                  <Select value={singleEntry.transferMethod} onChange={e => set('transferMethod', e.target.value)} displayEmpty sx={{ borderRadius: 2 }}>
                    <MenuItem value="" disabled><em style={{ color: '#aaa' }}>Select…</em></MenuItem>
                    <MenuItem value="UPI" sx={{ py: 1.25 }}>UPI</MenuItem>
                    <MenuItem value="Bank Transfer" sx={{ py: 1.25 }}>Bank Transfer</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>

          {/* Comment + Date */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={6}>
              <Label>Comment (optional)</Label>
              <TextField fullWidth placeholder="Add a note…" value={singleEntry.comment} onChange={e => set('comment', e.target.value)}
                inputProps={{ style: { fontSize: 15 } }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Label>Date</Label>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker value={singleEntry.date} onChange={v => set('date', v ?? dayjs())}
                  renderInput={(params) => <TextField {...params} fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} inputProps={{ ...params.inputProps, style: { fontSize: 15 } }} />} />
              </LocalizationProvider>
            </Grid>
          </Grid>

          {/* Linked expense toggle — only shown for income */}
          {isIncome && (
            <Box mb={2}>
              <Divider sx={{ mb: 2 }} />
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center" gap={1}>
                  <LinkIcon sx={{ color: '#e65100', fontSize: 20 }} />
                  <Typography fontWeight={700} fontSize={14} color="#e65100">Also record an expense</Typography>
                  <Typography variant="caption" color="text.secondary">(e.g. paid to employee / supplier)</Typography>
                </Box>
                <Switch checked={addLinkedExpense} onChange={e => setAddLinkedExpense(e.target.checked)} color="warning" />
              </Box>

              <Collapse in={addLinkedExpense}>
                <Box sx={{ mt: 2, p: 2, bgcolor: '#fff8f0', border: '1px solid #ffcc80', borderRadius: 2.5 }}>
                  <Typography variant="caption" fontWeight={700} color="#e65100" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mb: 1.5, display: 'block' }}>
                    Linked Expense Details
                  </Typography>

                  <Box mb={2}>
                    <Label>Reason</Label>
                    <FormControl fullWidth size="small">
                      <Select value={linkedExpense.reason} onChange={e => setLinked('reason', e.target.value)} displayEmpty sx={{ borderRadius: 2 }}>
                        <MenuItem value="" disabled><em style={{ color: '#aaa' }}>Select reason…</em></MenuItem>
                        {reasons.expense.map((r, i) => <MenuItem key={i} value={r} sx={{ py: 1.25 }}>{r}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Box>

                  {linkedExpense.reason && (
                    <Box mb={2}>
                      <Label>Payee</Label>
                      {renderPayeeField(linkedExpense.reason, linkedExpense.payee, val => setLinked('payee', val), 'small')}
                    </Box>
                  )}

                  <Box mb={2}>
                    <Label>Amount (₹)</Label>
                    <TextField fullWidth type="number" placeholder="0" value={linkedExpense.amount} onChange={e => setLinked('amount', e.target.value)}
                      size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  </Box>

                  <Grid container spacing={2} mb={2}>
                    <Grid item xs={linkedExpense.medium === 'Transfer' ? 6 : 12}>
                      <Label>Medium</Label>
                      <ToggleButtonGroup value={linkedExpense.medium} exclusive onChange={(_, v) => v && setLinked('medium', v)} fullWidth sx={{ gap: 1 }}>
                        {['Cash', 'Transfer'].map(m => (
                          <ToggleButton key={m} value={m} sx={{ flex: 1, py: 1, textTransform: 'none', fontWeight: 600, fontSize: 13, borderRadius: '8px !important', border: '1px solid #e2e8f0 !important', '&.Mui-selected': { bgcolor: '#e3f2fd', color: '#1976d2', borderColor: '#1976d2 !important' } }}>
                            {m}
                          </ToggleButton>
                        ))}
                      </ToggleButtonGroup>
                    </Grid>
                    {linkedExpense.medium === 'Transfer' && (
                      <Grid item xs={6}>
                        <Label>Transfer Method</Label>
                        <FormControl fullWidth size="small">
                          <Select value={linkedExpense.transferMethod} onChange={e => setLinked('transferMethod', e.target.value)} displayEmpty sx={{ borderRadius: 2 }}>
                            <MenuItem value="" disabled><em style={{ color: '#aaa' }}>Select…</em></MenuItem>
                            <MenuItem value="UPI">UPI</MenuItem>
                            <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    )}
                  </Grid>

                  <Box>
                    <Label>Comment (optional)</Label>
                    <TextField fullWidth placeholder="Add a note…" value={linkedExpense.comment} onChange={e => setLinked('comment', e.target.value)}
                      size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  </Box>
                </Box>
              </Collapse>
            </Box>
          )}

          <Button fullWidth variant="contained" size="large" onClick={handleSubmit} disabled={!isValid() || submitting}
            startIcon={<CheckCircleIcon />}
            sx={{ py: 1.75, fontSize: 16, fontWeight: 700, borderRadius: 2.5, textTransform: 'none', bgcolor: accentColor, '&:hover': { bgcolor: isIncome ? '#1b5e20' : '#b71c1c' } }}>
            {submitting ? 'Submitting…' : `Submit ${isIncome ? 'Income' : 'Expense'}${isIncome && addLinkedExpense ? ' + Expense' : ''}`}
          </Button>

          <Button fullWidth variant="text" startIcon={<AddIcon />} onClick={() => setOpen(true)}
            sx={{ mt: 1.5, textTransform: 'none', color: 'text.secondary', fontWeight: 600 }}>
            Add multiple entries
          </Button>
          </>}
        </Box>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} fullScreen={isMobile} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccountBalanceWalletIcon sx={{ color: accentColor }} /> Add Multiple Entries
        </DialogTitle>
        <DialogContent dividers>
          <Box mb={2}>
            <Label>Type</Label>
            <ToggleButtonGroup value={dialogCategory} exclusive onChange={(_, v) => v && setDialogCategory(v)} fullWidth sx={{ gap: 1 }}>
              {['expense', 'income'].map(v => (
                <ToggleButton key={v} value={v} sx={{ flex: 1, py: 1.25, textTransform: 'none', fontWeight: 600, borderRadius: '8px !important', border: '1px solid #e2e8f0 !important', '&.Mui-selected': { bgcolor: v === 'income' ? '#e8f5e9' : '#ffebee', color: v === 'income' ? '#2e7d32' : '#c62828' } }}>
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
                  <Label>Reason</Label>
                  <FormControl fullWidth size="small">
                    <Select value={row.reason} onChange={e => handleRowChange(i, 'reason', e.target.value)} displayEmpty sx={{ borderRadius: 1.5 }}>
                      <MenuItem value="" disabled><em style={{ color: '#aaa' }}>Select…</em></MenuItem>
                      {reasons[dialogCategory as 'income' | 'expense'].map((r, j) => <MenuItem key={j} value={r}>{r}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Label>Amount</Label>
                  <TextField fullWidth size="small" type="number" value={row.amount} onChange={e => handleRowChange(i, 'amount', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
                </Grid>
                {dialogCategory === 'income' ? (
                  <Grid item xs={6} sm={3}>
                    <Label>Client</Label>
                    <FormControl fullWidth size="small">
                      <Select value={row.client} onChange={e => handleRowChange(i, 'client', e.target.value)} displayEmpty sx={{ borderRadius: 1.5 }}>
                        <MenuItem value="" disabled><em style={{ color: '#aaa' }}>-</em></MenuItem>
                        {clients.map((c, j) => <MenuItem key={j} value={c.name}>{c.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                ) : (
                  <Grid item xs={6} sm={3}>
                    <Label>Payee</Label>
                    <TextField fullWidth size="small" value={row.payee} onChange={e => handleRowChange(i, 'payee', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
                  </Grid>
                )}
                <Grid item xs={12} sm={6}>
                  <Label>Date</Label>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker value={row.date} onChange={nv => handleRowChange(i, 'date', nv ?? dayjs())} renderInput={(params) => <TextField {...params} fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />} />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Label>Comment</Label>
                  <TextField fullWidth size="small" value={row.comment} onChange={e => handleRowChange(i, 'comment', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
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
          <Button onClick={handleSubmitMultiple} variant="contained" sx={{ textTransform: 'none', flex: 2, py: 1.25, borderRadius: 2 }}>Submit All</Button>
        </DialogActions>
      </Dialog>

      <SnackbarMessage open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar(p => ({ ...p, open: false }))} />
    </>
  )
}

export default ExpenseTracker
