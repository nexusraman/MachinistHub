'use client'

import React, { useEffect, useState } from 'react'
import Navbar from '../Navbar'
import axios from 'axios'
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControl, Grid, InputAdornment,
  InputLabel, MenuItem, Select, Snackbar, Switch, Tab, Tabs, TextField,
  Tooltip, Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import PhoneIcon from '@mui/icons-material/Phone'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt'
import WaterIcon from '@mui/icons-material/Water'
import PeopleIcon from '@mui/icons-material/People'
import AddIcon from '@mui/icons-material/Add'
import PersonOffIcon from '@mui/icons-material/PersonOff'
import { useRouter } from 'next/navigation'

interface Client {
  _id: string
  name: string
  phone: string
  balance: number
  calculatedBalance?: number
  category: string
  active?: boolean
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function getAvatarColor(name: string) {
  const colors = ['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#c62828', '#00838f', '#558b2f', '#6d4c41']
  let hash = 0
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

const CATEGORY_TABS = [
  { value: 'all', label: 'All', icon: <PeopleIcon fontSize="small" /> },
  { value: 'submersible', label: 'Submersible', icon: <WaterIcon fontSize="small" /> },
  { value: 'fan', label: 'Fan', icon: <ElectricBoltIcon fontSize="small" /> },
]

const STATUS_TABS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'all', label: 'All' },
]

const emptyForm = { name: '', phone: '', category: 'submersible', balance: '' }

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([])
  const [category, setCategory] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [snack, setSnack] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null)
  const router = useRouter()

  useEffect(() => {
    axios.get('/api/client')
      .then(res => setClients(res.data))
      .finally(() => setLoading(false))
  }, [])

  const filtered = clients
    .filter(c => {
      if (statusFilter === 'active') return c.active !== false
      if (statusFilter === 'inactive') return c.active === false
      return true
    })
    .filter(c => category === 'all' || c.category === category)
    .filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search))
    .sort((a, b) => a.name?.localeCompare(b.name))

  const activeCount = clients.filter(c => c.active !== false).length
  const inactiveCount = clients.filter(c => c.active === false).length

  const stats = {
    total: clients.length,
    active: activeCount,
    inactive: inactiveCount,
    submersible: clients.filter(c => c.category === 'submersible' && c.active !== false).length,
    fan: clients.filter(c => c.category === 'fan' && c.active !== false).length,
  }

  async function toggleActive(client: Client, e: React.MouseEvent) {
    e.stopPropagation()
    setToggling(client._id)
    try {
      const newActive = client.active === false ? true : false
      await axios.patch(`/api/client/${client._id}`, { active: newActive })
      setClients(prev => prev.map(c => c._id === client._id ? { ...c, active: newActive } : c))
      setSnack({ msg: newActive ? `${client.name} activated` : `${client.name} deactivated`, severity: 'success' })
    } catch {
      setSnack({ msg: 'Failed to update status', severity: 'error' })
    } finally {
      setToggling(null)
    }
  }

  async function handleCreate() {
    if (!form.name.trim() || !form.category) return
    setSaving(true)
    try {
      const res = await axios.post('/api/client', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        category: form.category,
        balance: Number(form.balance) || 0,
        active: true,
      })
      setClients(prev => [...prev, res.data])
      setAddOpen(false)
      setForm(emptyForm)
      setSnack({ msg: `${form.name.trim()} added`, severity: 'success' })
    } catch {
      setSnack({ msg: 'Failed to create client', severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Navbar />

      {/* Header banner */}
      <Box sx={{ background: 'linear-gradient(135deg, #1a237e 0%, #0288d1 100%)', color: '#fff', px: 4, py: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5} flexWrap="wrap" gap={1}>
          <Typography variant="h4" fontWeight={700}>Clients</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddOpen(true)}
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }, fontWeight: 700, borderRadius: 2 }}
          >
            Add Client
          </Button>
        </Box>
        <Box display="flex" gap={3} flexWrap="wrap">
          {[
            { label: 'Total', value: stats.total, color: '#fff' },
            { label: 'Active', value: stats.active, color: '#ccff90' },
            { label: 'Inactive', value: stats.inactive, color: '#ff8a80' },
            { label: 'Submersible', value: stats.submersible, color: '#80d8ff' },
            { label: 'Fan', value: stats.fan, color: '#ffe082' },
          ].map(s => (
            <Box key={s.label} textAlign="center">
              <Typography variant="h5" fontWeight={700} sx={{ color: s.color }}>{s.value}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>{s.label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Toolbar */}
      <Box sx={{ px: 3, pt: 2, pb: 1, bgcolor: '#fafafa', borderBottom: '1px solid #e0e0e0', display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <Tabs value={category} onChange={(_, v) => setCategory(v)} textColor="primary" indicatorColor="primary">
            {CATEGORY_TABS.map(t => (
              <Tab key={t.value} value={t.value} label={<Box display="flex" alignItems="center" gap={0.5}>{t.icon}<span>{t.label}</span></Box>} />
            ))}
          </Tabs>

          <Tabs
            value={statusFilter}
            onChange={(_, v) => setStatusFilter(v)}
            textColor="primary"
            indicatorColor="primary"
            sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, py: 0.5, fontSize: 13 } }}
          >
            {STATUS_TABS.map(t => (
              <Tab key={t.value} value={t.value} label={t.label} />
            ))}
          </Tabs>
        </Box>

        <TextField
          size="small"
          placeholder="Search by name or phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: 240 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
      </Box>

      {/* Content */}
      <Box sx={{ p: 3 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
        ) : filtered.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>No clients found.</Alert>
        ) : (
          <Grid container spacing={2}>
            {filtered.map((client, i) => {
              const outstanding = client.calculatedBalance ?? client.balance ?? 0
              const isPaid = outstanding <= 0
              const isActive = client.active !== false
              const isToggling = toggling === client._id

              return (
                <Grid key={client._id || i} item xs={12} sm={6} md={4} lg={3}>
                  <Box
                    onClick={() => router.push(`/clients/${client._id}`)}
                    sx={{
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: !isActive ? '#e0e0e0' : isPaid ? '#c8e6c9' : '#ffcdd2',
                      bgcolor: isActive ? '#fff' : '#fafafa',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      overflow: 'hidden',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      opacity: isActive ? 1 : 0.65,
                      '&:hover': { boxShadow: 4, transform: 'translateY(-2px)', borderColor: '#1976d2', opacity: 1 },
                    }}
                  >
                    <Box sx={{ height: 4, bgcolor: !isActive ? '#9e9e9e' : isPaid ? '#4caf50' : '#ef5350' }} />

                    <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {/* Avatar + name row */}
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Avatar sx={{ bgcolor: isActive ? getAvatarColor(client.name) : '#9e9e9e', width: 44, height: 44, fontSize: 16, fontWeight: 700 }}>
                          {isActive ? getInitials(client.name) : <PersonOffIcon fontSize="small" />}
                        </Avatar>
                        <Box flex={1} minWidth={0}>
                          <Typography variant="subtitle1" fontWeight={700} noWrap>{client.name}</Typography>
                          <Box display="flex" gap={0.5} alignItems="center">
                            <Chip
                              label={client.category}
                              size="small"
                              icon={client.category === 'fan' ? <ElectricBoltIcon /> : <WaterIcon />}
                              sx={{ fontSize: 11, height: 20, textTransform: 'capitalize', bgcolor: client.category === 'fan' ? '#fff9c4' : '#e3f2fd', color: client.category === 'fan' ? '#f57f17' : '#0277bd' }}
                            />
                            {!isActive && <Chip label="Inactive" size="small" sx={{ fontSize: 10, height: 18, bgcolor: '#eeeeee', color: '#757575' }} />}
                          </Box>
                        </Box>
                      </Box>

                      <Divider />

                      {/* Phone */}
                      <Box display="flex" alignItems="center" gap={1}>
                        <PhoneIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        <Typography variant="body2" color="text.secondary">{client.phone || '—'}</Typography>
                      </Box>

                      {/* Balance */}
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box display="flex" alignItems="center" gap={0.75}>
                          <AccountBalanceWalletIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                          <Typography variant="body2" color="text.secondary">Balance</Typography>
                        </Box>
                        <Tooltip title={isPaid ? 'Paid up' : 'Outstanding'}>
                          <Typography variant="subtitle2" fontWeight={700} sx={{ color: isPaid ? '#2e7d32' : '#c62828' }}>
                            ₹{Math.abs(outstanding).toLocaleString()}
                          </Typography>
                        </Tooltip>
                      </Box>

                      <Divider />

                      {/* Active toggle */}
                      <Box display="flex" alignItems="center" justifyContent="space-between" onClick={e => e.stopPropagation()}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          {isActive ? 'Active' : 'Inactive'}
                        </Typography>
                        <Tooltip title={isActive ? 'Deactivate client' : 'Activate client'}>
                          <Switch
                            size="small"
                            checked={isActive}
                            disabled={isToggling}
                            onChange={e => { e.stopPropagation(); toggleActive(client, e as unknown as React.MouseEvent) }}
                            onClick={e => e.stopPropagation()}
                            color="success"
                          />
                        </Tooltip>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              )
            })}
          </Grid>
        )}
      </Box>

      {/* Add Client Dialog */}
      <Dialog open={addOpen} onClose={() => { setAddOpen(false); setForm(emptyForm) }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add New Client</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField
            label="Name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            fullWidth
            required
            autoFocus
          />
          <TextField
            label="Phone"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            fullWidth
          />
          <FormControl fullWidth required>
            <InputLabel>Category</InputLabel>
            <Select
              value={form.category}
              label="Category"
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            >
              <MenuItem value="submersible">Submersible</MenuItem>
              <MenuItem value="fan">Fan</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Opening Balance (₹)"
            type="number"
            value={form.balance}
            onChange={e => setForm(f => ({ ...f, balance: e.target.value }))}
            fullWidth
            helperText="Amount the client owes at the start (leave 0 if none)"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setAddOpen(false); setForm(emptyForm) }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={saving || !form.name.trim()}
          >
            {saving ? 'Saving…' : 'Add Client'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snack}
        autoHideDuration={3000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack?.severity} onClose={() => setSnack(null)} sx={{ width: '100%' }}>
          {snack?.msg}
        </Alert>
      </Snackbar>
    </>
  )
}

export default Clients
