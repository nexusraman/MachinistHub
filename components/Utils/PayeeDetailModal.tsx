'use client'

import React from 'react'
import {
  Box, Chip, Dialog, DialogContent, DialogTitle, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'

interface Expense {
  date: string
  amount: number
  reason?: string
  medium?: string
  comment?: string
}

interface Props {
  payee: string
  expenses: Expense[]
  open: boolean
  onClose: () => void
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtCur = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`

const PayeeDetailModal = ({ payee, expenses, open, onClose }: Props) => {
  const records = expenses
    .filter(e => {
      const p = (e as Record<string, unknown>).payee as string | undefined
      return p?.toLowerCase() === payee.toLowerCase()
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const total = records.reduce((s, r) => s + Number(r.amount), 0)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <TrendingDownIcon sx={{ color: '#c62828', fontSize: 20 }} />
          <Typography fontWeight={700} fontSize={16}>{payee}</Typography>
          <Chip label={`${records.length} payments`} size="small" sx={{ bgcolor: '#ffebee', color: '#c62828', fontWeight: 600 }} />
        </Box>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ px: 3, py: 1.5, bgcolor: '#fff8f0', borderBottom: '1px solid #ffe0b2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>Total Paid</Typography>
          <Typography fontWeight={800} fontSize={18} color="#c62828">{fmtCur(total)}</Typography>
        </Box>

        {records.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center', color: 'text.disabled' }}>No records found.</Box>
        ) : (
          <TableContainer sx={{ maxHeight: 380 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, bgcolor: '#f8fafc', color: 'text.secondary' }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, bgcolor: '#f8fafc', color: 'text.secondary' }}>Reason</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, bgcolor: '#f8fafc', color: 'text.secondary' }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, bgcolor: '#f8fafc', color: 'text.secondary' }}>Medium</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((r, i) => (
                  <TableRow key={i} hover sx={{ '&:last-child td': { border: 0 }, bgcolor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>{fmtDate(r.date)}</TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{r.reason || '—'}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#c62828', fontSize: 13 }}>{fmtCur(r.amount)}</TableCell>
                    <TableCell>
                      <Chip label={r.medium || '—'} size="small" sx={{ fontSize: 11, bgcolor: '#f5f5f5' }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default PayeeDetailModal
