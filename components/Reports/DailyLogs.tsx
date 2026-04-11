'use client'

import React, { useEffect, useState } from 'react'
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, InputAdornment, Table, TableBody, TableCell, TableContainer,
  TableHead, TablePagination, TableRow, TextField, Tooltip, Typography,
} from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import SearchIcon from '@mui/icons-material/Search'
import AssignmentIcon from '@mui/icons-material/Assignment'
import axios from 'axios'
import SnackbarMessage from '../Utils/Snackbar'

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

const HeadCell = ({ children }: { children?: React.ReactNode }) => (
  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, py: 1.25, bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>
    {children}
  </TableCell>
)

const DailyLogs = () => {
  const [logs, setLogs] = useState<Record<string, unknown>[]>([])
  const [searched, setSearched] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' as 'success' | 'error' | 'info' | 'warning' })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<Record<string, unknown> | null>(null)

  const fetchLogs = async () => {
    try { const res = await axios.get('/api/log'); setLogs(res.data.logs) }
    catch { console.error('Failed to fetch logs') }
  }

  useEffect(() => { fetchLogs() }, [])

  const confirmDelete = async () => {
    if (!selectedLog) return
    try {
      await axios.delete(`/api/log/${selectedLog._id}`)
      setSnackbar({ open: true, message: 'Deleted successfully', severity: 'success' })
      fetchLogs()
    } catch { setSnackbar({ open: true, message: 'Failed to delete', severity: 'error' }) }
    finally { setDialogOpen(false); setSelectedLog(null) }
  }

  const rows = logs.filter(log =>
    (log.relatedTo as string).toLowerCase().includes(searched.toLowerCase()) ||
    ((log.comment as string) || '').toLowerCase().includes(searched.toLowerCase())
  )

  return (
    <>
      <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden', bgcolor: '#fff' }}>
        <Box sx={{ height: 4, bgcolor: '#00838f' }} />
        <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f4f8', flexWrap: 'wrap', gap: 1 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <AssignmentIcon sx={{ color: '#00838f', fontSize: 20 }} />
            <Typography fontWeight={700}>Daily Logs</Typography>
            <Chip label={rows.length} size="small" sx={{ bgcolor: '#e0f7fa', color: '#006064', fontWeight: 700 }} />
          </Box>
          <TextField
            size="small" placeholder="Search…" value={searched}
            onChange={e => { setSearched(e.target.value); setPage(0) }}
            sx={{ width: 200 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
        </Box>

        <TableContainer sx={{ maxHeight: 400 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <HeadCell>Related To</HeadCell>
                <HeadCell>Comment</HeadCell>
                <HeadCell>Date</HeadCell>
           <HeadCell></HeadCell>     
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((log, i) => (
                <TableRow key={log._id as string} hover sx={{ '&:last-child td': { border: 0 }, bgcolor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <TableCell sx={{ fontWeight: 600 }}>{log.relatedTo as string}</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 13, maxWidth: 200 }}>
                    <Tooltip title={(log.comment as string) || ''}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', maxWidth: 180 }}>
                        {(log.comment as string) || <span style={{ color: '#bbb' }}>—</span>}
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>{fmtDate(log.date as string)}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => { setSelectedLog(log); setDialogOpen(true) }}><DeleteOutlineIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.disabled' }}>No logs found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ borderTop: '1px solid #e2e8f0' }}>
          <TablePagination rowsPerPageOptions={[5, 10, 30]} component="div" count={rows.length} rowsPerPage={rowsPerPage} page={page} onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value)); setPage(0) }} />
        </Box>
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="body2"><strong>Related To:</strong> {selectedLog.relatedTo as string}</Typography>
              <Typography variant="body2"><strong>Comment:</strong> {(selectedLog.comment as string) || '—'}</Typography>
              <Typography variant="body2"><strong>Date:</strong> {fmtDate(selectedLog.date as string)}</Typography>
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

export default DailyLogs
