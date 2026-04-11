'use client'

import React, { useEffect, useState } from 'react'
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, InputAdornment, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TablePagination, TableRow, Tabs, TextField, Tooltip, Typography,
} from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import SearchIcon from '@mui/icons-material/Search'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import axios from 'axios'
import SnackbarMessage from '../Utils/Snackbar'

interface Props { customDates?: [number, number]; calenderValue?: string }

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtCur = (n: number | string) => `₹${Number(n).toLocaleString('en-IN')}`

const HeadCell = ({ children }: { children?: React.ReactNode }) => (
  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, py: 1.25, bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>
    {children}
  </TableCell>
)

const DailyTransactions = (props: Props) => {
  const [category, setCategory] = useState('income')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [expense, setExpense] = useState<Record<string, unknown>[]>([])
  const [income, setIncome] = useState<Record<string, unknown>[]>([])
  const [formattedIncome, setFormattedIncome] = useState<Record<string, unknown>[]>([])
  const [formattedExpenses, setFormattedExpenses] = useState<Record<string, unknown>[]>([])
  const [searched, setSearched] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteInfo, setDeleteInfo] = useState<Record<string, unknown> | null>(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' as 'success' | 'error' | 'info' | 'warning' })

  const fetchData = async () => {
    try {
      if (category === 'expense') { const res = await axios.get('/api/expense'); setExpense(res.data) }
      else { const res = await axios.get('/api/income'); setIncome(res.data) }
    } catch { setSnackbar({ open: true, message: 'Failed to fetch data', severity: 'error' }) }
  }

  useEffect(() => { fetchData() }, [category])

  useEffect(() => {
    const now = new Date()
    const backwardDate = new Date(now)
    if (props.calenderValue === 'weekly') backwardDate.setDate(now.getDate() - 7)
    if (props.calenderValue === 'monthly') backwardDate.setDate(now.getDate() - 30)

    const filterData = (data: Record<string, unknown>[]) => {
      if (props.calenderValue === 'daily') return data.filter(d => new Date(d.date as string).toLocaleDateString() === now.toLocaleDateString())
      if (props.calenderValue === 'weekly' || props.calenderValue === 'monthly') return data.filter(d => new Date(d.date as string).getTime() >= backwardDate.getTime())
      if (props.customDates?.[0] && props.customDates?.[1]) return data.filter(d => new Date(d.date as string).getTime() >= props.customDates![0] && new Date(d.date as string).getTime() <= props.customDates![1])
      return data
    }

    setFormattedIncome(filterData(income).sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime()))
    setFormattedExpenses(filterData(expense).sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime()))
  }, [props.calenderValue, income, expense, props.customDates])

  const confirmDelete = async () => {
    try {
      const res = await axios.post('/api/deleteEntry', { _id: deleteInfo!._id, category: deleteInfo!.category })
      setSnackbar({ open: true, message: (res.data.message as string) || 'Deleted', severity: 'success' })
      fetchData()
    } catch { setSnackbar({ open: true, message: 'Failed to delete', severity: 'error' }) }
    finally { setDialogOpen(false); setDeleteInfo(null) }
  }

  const isIncome = category === 'income'
  const rows = (isIncome ? formattedIncome : formattedExpenses).filter(r =>
    ((isIncome ? r.client : r.payee) as string || '').toLowerCase().includes(searched.toLowerCase())
  )
  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0)

  return (
    <>
      <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden', bgcolor: '#fff' }}>
        <Box sx={{ height: 4, bgcolor: isIncome ? '#2e7d32' : '#c62828' }} />
        <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f4f8', flexWrap: 'wrap', gap: 1 }}>
          <Box display="flex" alignItems="center" gap={1}>
            {isIncome ? <TrendingUpIcon sx={{ color: '#2e7d32', fontSize: 20 }} /> : <TrendingDownIcon sx={{ color: '#c62828', fontSize: 20 }} />}
            <Typography fontWeight={700}>Daily Transactions</Typography>
            <Chip label={rows.length} size="small" sx={{ bgcolor: isIncome ? '#e8f5e9' : '#ffebee', color: isIncome ? '#2e7d32' : '#c62828', fontWeight: 700 }} />
          </Box>
          <TextField
            size="small" placeholder={`Search ${isIncome ? 'client' : 'payee'}…`} value={searched}
            onChange={e => { setSearched(e.target.value); setPage(0) }}
            sx={{ width: 200 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
        </Box>

        <Box sx={{ px: 2, pt: 1, borderBottom: '1px solid #f0f4f8' }}>
          <Tabs value={category} onChange={(_, v) => { setCategory(v); setPage(0) }} sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0, textTransform: 'none', fontWeight: 600 } }}>
            <Tab label="Income" value="income" sx={{ '&.Mui-selected': { color: '#2e7d32' } }} />
            <Tab label="Expense" value="expense" sx={{ '&.Mui-selected': { color: '#c62828' } }} />
          </Tabs>
        </Box>

        <TableContainer sx={{ maxHeight: 380 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <HeadCell>{isIncome ? 'Client' : 'Payee'}</HeadCell>
                <HeadCell>Amount</HeadCell>
                <HeadCell>Reason</HeadCell>
                <HeadCell>Date</HeadCell>
                <HeadCell>Medium</HeadCell>
                <HeadCell></HeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, i) => (
                <TableRow key={row._id as string} hover sx={{ '&:last-child td': { border: 0 }, bgcolor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <TableCell sx={{ fontWeight: 600 }}>{(isIncome ? row.client : row.payee) as string || '—'}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: isIncome ? '#2e7d32' : '#c62828' }}>{fmtCur(row.amount as number)}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{row.reason as string || '—'}</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>{fmtDate(row.date as string)}</TableCell>
                  <TableCell>
                    <Chip label={row.medium as string || '—'} size="small" sx={{ fontSize: 11, bgcolor: '#f5f5f5' }} />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => { setDeleteInfo({ ...row, category }); setDialogOpen(true) }}><DeleteOutlineIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.disabled' }}>No records found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ px: 2.5, py: 1, borderTop: '1px solid #e2e8f0', bgcolor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2" fontWeight={600} color="text.secondary">
            Total: <span style={{ color: isIncome ? '#2e7d32' : '#c62828' }}>{fmtCur(total)}</span>
          </Typography>
          <TablePagination rowsPerPageOptions={[5, 10, 30]} component="div" count={rows.length} rowsPerPage={rowsPerPage} page={page} onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value)); setPage(0) }} sx={{ border: 0 }} />
        </Box>
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          {deleteInfo && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="body2"><strong>{isIncome ? 'Client' : 'Payee'}:</strong> {String(deleteInfo.client || deleteInfo.payee || '—')}</Typography>
              <Typography variant="body2"><strong>Amount:</strong> {fmtCur(deleteInfo.amount as number)}</Typography>
              <Typography variant="body2"><strong>Reason:</strong> {String(deleteInfo.reason || '—')}</Typography>
              <Typography variant="body2"><strong>Date:</strong> {fmtDate(deleteInfo.date as string)}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button onClick={confirmDelete} variant="contained" color="error" sx={{ textTransform: 'none' }}>Delete</Button>
        </DialogActions>
      </Dialog>

      <SnackbarMessage open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar(p => ({ ...p, open: false }))} />
    </>
  )
}

export default DailyTransactions
