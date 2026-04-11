'use client'

import React, { useEffect, useState } from 'react'
import Navbar from '../Navbar'
import axios from 'axios'
import {
  Alert, Avatar, Box, Chip, CircularProgress, Divider,
  Grid, InputAdornment, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import PhoneIcon from '@mui/icons-material/Phone'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt'
import WaterIcon from '@mui/icons-material/Water'
import PeopleIcon from '@mui/icons-material/People'
import { useRouter } from 'next/navigation'

interface Client { _id: string; name: string; phone: string; balance: number; calculatedBalance?: number; category: string }

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function getAvatarColor(name: string) {
  const colors = ['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#c62828', '#00838f', '#558b2f', '#6d4c41']
  let hash = 0
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

const TABS = [
  { value: 'all', label: 'All', icon: <PeopleIcon fontSize="small" /> },
  { value: 'submersible', label: 'Submersible', icon: <WaterIcon fontSize="small" /> },
  { value: 'fan', label: 'Fan', icon: <ElectricBoltIcon fontSize="small" /> },
]

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([])
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    axios.get('/api/client')
      .then(res => setClients(res.data))
      .finally(() => setLoading(false))
  }, [])

  const filtered = clients
    .filter(c => category === 'all' || c.category === category)
    .filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search))
    .sort((a, b) => a.name?.localeCompare(b.name))

  const stats = {
    total: clients.length,
    submersible: clients.filter(c => c.category === 'submersible').length,
    fan: clients.filter(c => c.category === 'fan').length,
  }

  return (
    <>
      <Navbar />

      {/* Header banner */}
      <Box sx={{ background: 'linear-gradient(135deg, #1a237e 0%, #0288d1 100%)', color: '#fff', px: 4, py: 3 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>Clients</Typography>
        <Box display="flex" gap={3} flexWrap="wrap">
          {[
            { label: 'Total', value: stats.total, color: '#fff' },
            { label: 'Submersible', value: stats.submersible, color: '#80d8ff' },
            { label: 'Fan', value: stats.fan, color: '#ccff90' },
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
        <Tabs
          value={category}
          onChange={(_, v) => setCategory(v)}
          textColor="primary"
          indicatorColor="primary"
        >
          {TABS.map(t => (
            <Tab
              key={t.value}
              value={t.value}
              label={
                <Box display="flex" alignItems="center" gap={0.5}>
                  {t.icon}
                  <span>{t.label}</span>
                </Box>
              }
            />
          ))}
        </Tabs>

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

              return (
                <Grid key={client._id || i} item xs={12} sm={6} md={4} lg={3}>
                  <Box
                    onClick={() => router.push(`/clients/${client._id}`)}
                    sx={{
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: isPaid ? '#c8e6c9' : '#ffcdd2',
                      bgcolor: '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      overflow: 'hidden',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      '&:hover': { boxShadow: 4, transform: 'translateY(-2px)', borderColor: '#1976d2' },
                    }}
                  >
                    {/* Top accent bar */}
                    <Box sx={{ height: 4, bgcolor: isPaid ? '#4caf50' : '#ef5350' }} />

                    <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {/* Avatar + name row */}
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Avatar sx={{ bgcolor: getAvatarColor(client.name), width: 44, height: 44, fontSize: 16, fontWeight: 700 }}>
                          {getInitials(client.name)}
                        </Avatar>
                        <Box flex={1} minWidth={0}>
                          <Typography variant="subtitle1" fontWeight={700} noWrap>{client.name}</Typography>
                          <Chip
                            label={client.category}
                            size="small"
                            icon={client.category === 'fan' ? <ElectricBoltIcon /> : <WaterIcon />}
                            sx={{ fontSize: 11, height: 20, mt: 0.25, textTransform: 'capitalize', bgcolor: client.category === 'fan' ? '#fff9c4' : '#e3f2fd', color: client.category === 'fan' ? '#f57f17' : '#0277bd' }}
                          />
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
                          <Typography
                            variant="subtitle2"
                            fontWeight={700}
                            sx={{ color: isPaid ? '#2e7d32' : '#c62828' }}
                          >
                            ₹{Math.abs(outstanding).toLocaleString()}
                          </Typography>
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
    </>
  )
}

export default Clients
