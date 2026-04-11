'use client'

import React, { useState } from 'react'
import { Box, Tab, Tabs, Typography, useMediaQuery, useTheme } from '@mui/material'
import StorageIcon from '@mui/icons-material/Storage'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import AssignmentIcon from '@mui/icons-material/Assignment'
import DataEntry from './DataEntry'
import ExpenseTracker from './ExpenseTracker'
import DailyLogs from './DailyLogs'

const TABS = [
  { label: 'Data Entry', icon: <StorageIcon fontSize="small" />, value: 0 },
  { label: 'Expense / Income', icon: <AccountBalanceWalletIcon fontSize="small" />, value: 1 },
  { label: 'Daily Logs', icon: <AssignmentIcon fontSize="small" />, value: 2 },
]

const InputForm = () => {
  const [tab, setTab] = useState(0)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <>
      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg, #1a237e 0%, #0288d1 100%)', color: '#fff', px: { xs: 2, sm: 4 }, py: 2.5 }}>
        <Typography variant="h5" fontWeight={700}>Input Forms</Typography>
      </Box>

      {/* Tab bar */}
      <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 64, zIndex: 10 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant={isMobile ? 'scrollable' : 'fullWidth'}
          scrollButtons={isMobile ? 'auto' : false}
          textColor="primary"
          indicatorColor="primary"
          sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 52, fontSize: { xs: 13, sm: 14 } } }}
        >
          {TABS.map(t => (
            <Tab key={t.value} value={t.value} label={
              <Box display="flex" alignItems="center" gap={0.75}>
                {t.icon}
                <span>{t.label}</span>
              </Box>
            } />
          ))}
        </Tabs>
      </Box>

      {/* Form content */}
      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 680, mx: 'auto' }}>
        {tab === 0 && <DataEntry />}
        {tab === 1 && <ExpenseTracker />}
        {tab === 2 && <DailyLogs />}
      </Box>
    </>
  )
}

export default InputForm
