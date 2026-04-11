'use client'

import React, { useEffect, useState } from 'react'
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, InputAdornment, Table, TableBody, TableCell, TableContainer,
  TableHead, TablePagination, TableRow, TextField, Tooltip, Typography,
} from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import SearchIcon from '@mui/icons-material/Search'
import RotateRightIcon from '@mui/icons-material/RotateRight'
import axios from 'axios'
import SnackbarMessage from '../Utils/Snackbar'

interface Props { customDates?: [number, number]; calenderValue?: string; entryType?: 'received' | 'dispatched' }

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

const HeadCell = ({ children }: { children?: React.ReactNode }) => (
  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, py: 1.25, bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>
    {children}
  </TableCell>
)

const DailyActivities = (props: Props) => {
  const [fanData, setFanData] = useState<Record<string, unknown>[]>([])
  const [filteredData, setFilteredData] = useState<Record<string, unknown>[]>([])
  const [searched, setSearched] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [deleteItem, setDeleteItem] = useState<Record<string, unknown> | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' as 'success' | 'error' | 'info' | 'warning' })

  const fetchData = async () => {
    try { const res = await axios.get('/api/fanRotor'); setFanData(res.data.data || res.data) }
    catch (e) { console.error(e) }
  }

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    const now = new Date()
    let startDate = new Date(now)
    if (props.calenderValue === 'weekly') startDate.setDate(now.getDate() - 7)
    if (props.calenderValue === 'monthly') startDate.setDate(now.getDate() - 30)

    let filtered = fanData
    if (props.calenderValue === 'daily') filtered = fanData.filter(d => new Date(d.date as string).toLocaleDateString() === now.toLocaleDateString())
    else if (props.calenderValue === 'weekly' || props.calenderValue === 'monthly') filtered = fanData.filter(d => new Date(d.date as string).getTime() >= startDate.getTime())
    else if (props.customDates?.[0] && props.customDates?.[1]) filtered = fanData.filter(d => new Date(d.date as string).getTime() >= props.customDates![0] && new Date(d.date as string).getTime() <= props.customDates![1])

    // Filter by entry type if specified; records without a type field count as 'received'
    if (props.entryType) {
      filtered = filtered.filter(d => {
        const t = (d.type as string) || 'received'
        return t === props.entryType
      })
    }

    setFilteredData(filtered.sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime()))
  }, [props.calenderValue, fanData, props.customDates])

  const confirmDelete = async () => {
    try {
      const res = await axios.post('/api/deleteFanRotor', { _id: deleteItem!._id })
      setSnackbar({ open: true, message: (res.data.message as string) || 'Deleted', severity: 'success' })
      fetchData()
    } catch (e: unknown) { setSnackbar({ open: true, message: (e as Error).message || 'Cannot delete', severity: 'error' }) }
    finally { setDialogOpen(false); setDeleteItem(null) }
  }

  const rows = filteredData.filter(r => (r.client as string).toLowerCase().includes(searched.toLowerCase()))

  const isDispatched = props.entryType === 'dispatched'
  const accentColor = isDispatched ? '#6a1b9a' : '#f57c00'
  const title = isDispatched ? 'Dispatched (Rotor + Shaft)' : 'Received from Clients'
  const chipSx = isDispatched
    ? { bgcolor: '#f3e5f5', color: '#6a1b9a', fontWeight: 700 }
    : { bgcolor: '#fff3e0', color: '#e65100', fontWeight: 700 }

  return (
    <>
      <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden', bgcolor: '#fff' }}>
        <Box sx={{ height: 4, bgcolor: accentColor }} />
        <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f4f8', flexWrap: 'wrap', gap: 1 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <RotateRightIcon sx={{ color: accentColor, fontSize: 20 }} />
            <Typography fontWeight={700}>{title}</Typography>
            <Chip label={rows.length} size="small" sx={chipSx} />
          </Box>
          <TextField
            size="small" placeholder="Search client…" value={searched}
            onChange={e => { setSearched(e.target.value); setPage(0) }}
            sx={{ width: 200 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
        </Box>

        <TableContainer sx={{ maxHeight: 400 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <HeadCell>Client</HeadCell>
                <HeadCell>Qty</HeadCell>
                <HeadCell>Rotor Size</HeadCell>
                {isDispatched && <HeadCell>Shaft Size</HeadCell>}
                <HeadCell>Date</HeadCell>
                <HeadCell></HeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, i) => (
                <TableRow key={row._id as string} hover sx={{ '&:last-child td': { border: 0 }, bgcolor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <TableCell sx={{ fontWeight: 600 }}>{row.client as string}</TableCell>
                  <TableCell>{row.quantity as string}</TableCell>
                  <TableCell><Chip label={row.rotorSize as string} size="small" sx={{ bgcolor: '#fff9c4', color: '#f57f17', fontWeight: 600, fontSize: 11 }} /></TableCell>
                  {isDispatched && <TableCell><Chip label={(row.shaftSize as string) || '—'} size="small" sx={{ bgcolor: '#ede7f6', color: '#4a148c', fontWeight: 600, fontSize: 11 }} /></TableCell>}
                  <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>{fmtDate(row.date as string)}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => { setDeleteItem(row); setDialogOpen(true) }}><DeleteOutlineIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={isDispatched ? 6 : 5} align="center" sx={{ py: 4, color: 'text.disabled' }}>No records found.</TableCell></TableRow>
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
          {deleteItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="body2"><strong>Client:</strong> {deleteItem.client as string}</Typography>
              <Typography variant="body2"><strong>Rotor Size:</strong> {deleteItem.rotorSize as string}</Typography>
              <Typography variant="body2"><strong>Date:</strong> {fmtDate(deleteItem.date as string)}</Typography>
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

export default DailyActivities
