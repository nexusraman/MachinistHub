'use client'

import React, { useState } from 'react'
import DailyActivities from './DailyActivities'
import DailyTransactions from './DailyTransactions'
import ExpenseOverviewCard from '../Cards/ExpenseOverviewCard'
import ActivitiesOverviewCard from '../Cards/ActivitiesOverviewCard'
import Rotors from './Rotors'
import DailyLogs from './DailyLogs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker'
import {
  Box, Chip, Grid, Tab, Tabs, TextField, Typography, useMediaQuery, useTheme,
} from '@mui/material'
import AssessmentIcon from '@mui/icons-material/Assessment'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import RotateRightIcon from '@mui/icons-material/RotateRight'
import WaterDropIcon from '@mui/icons-material/WaterDrop'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import AssignmentIcon from '@mui/icons-material/Assignment'

interface Props { role?: string }

const fmtDate = (ts: number) => new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

const TABS = [
  { label: 'Submersible Rotors', icon: <WaterDropIcon fontSize="small" /> },
  { label: 'Fan Rotors', icon: <RotateRightIcon fontSize="small" /> },
  { label: 'Transactions', icon: <SwapHorizIcon fontSize="small" /> },
  { label: 'Daily Logs', icon: <AssignmentIcon fontSize="small" /> },
]

const Reports = ({ role }: Props) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const today = new Date()
  const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7)
  const [fromValue, setFromValue] = useState(weekAgo)
  const [toValue, setToValue] = useState(today)
  const [formattedFromDate, setFormattedFromDate] = useState(weekAgo.getTime())
  const [formattedToDate, setFormattedToDate] = useState(today.getTime())
  const [tab, setTab] = useState(0)

  const dateProps = { customDates: [formattedFromDate, formattedToDate] as [number, number] }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg, #1a237e 0%, #0288d1 100%)', color: '#fff', px: { xs: 2, sm: 4 }, py: 3 }}>
        <Box display="flex" alignItems="center" gap={1.5} mb={2.5}>
          <AssessmentIcon sx={{ fontSize: 28 }} />
          <Typography variant="h5" fontWeight={700}>Reports</Typography>
        </Box>

        {/* Date range */}
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DesktopDatePicker
              label="From"
              inputFormat="MM/DD/YYYY"
              value={fromValue}
              onChange={nv => { if (nv) { setFromValue(nv as unknown as Date); setFormattedFromDate(new Date(nv as unknown as string).getTime()) } }}
              renderInput={(params) => (
                <TextField {...params} size="small" sx={{ width: 150, bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 1, '& .MuiInputBase-input': { color: '#fff' }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.8)' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.4)' }, '& .MuiSvgIcon-root': { color: '#fff' } }} />
              )}
            />
            <DesktopDatePicker
              label="To"
              inputFormat="MM/DD/YYYY"
              value={toValue}
              onChange={nv => { if (nv) { setToValue(nv as unknown as Date); setFormattedToDate(new Date(nv as unknown as string).getTime()) } }}
              renderInput={(params) => (
                <TextField {...params} size="small" sx={{ width: 150, bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 1, '& .MuiInputBase-input': { color: '#fff' }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.8)' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.4)' }, '& .MuiSvgIcon-root': { color: '#fff' } }} />
              )}
            />
          </LocalizationProvider>
          <Chip
            icon={<CalendarTodayIcon style={{ fontSize: 13, color: '#fff' }} />}
            label={`${fmtDate(formattedFromDate)} — ${fmtDate(formattedToDate)}`}
            sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 600, fontSize: 12 }}
          />
        </Box>
      </Box>

      {/* Summary cards */}
      <Box sx={{ px: { xs: 2, sm: 3 }, pt: 3, pb: 1 }}>
        <Grid container spacing={2}>
          {role === 'Admin' && (
            <Grid item xs={12} sm={6} md={4}>
              <ExpenseOverviewCard customDates={[formattedFromDate, formattedToDate]} />
            </Grid>
          )}
          <Grid item xs={12} sm={6} md={4}>
            <ActivitiesOverviewCard customDates={[formattedFromDate, formattedToDate]} />
          </Grid>
        </Grid>
      </Box>

      {/* Tab bar */}
      <Box sx={{ px: { xs: 2, sm: 3 }, mt: 3, bgcolor: '#fff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 64, zIndex: 10 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant={isMobile ? 'scrollable' : 'fullWidth'}
          scrollButtons={isMobile ? 'auto' : false}
          textColor="primary"
          indicatorColor="primary"
          sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 48, fontSize: 13 } }}
        >
          {TABS.map((t, i) => (
            <Tab key={i} label={
              <Box display="flex" alignItems="center" gap={0.75}>
                {t.icon}
                <span>{t.label}</span>
              </Box>
            } />
          ))}
        </Tabs>
      </Box>

      {/* Tab panels */}
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        {tab === 0 && <Rotors {...dateProps} />}
        {tab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <DailyActivities {...dateProps} entryType="received" />
            <DailyActivities {...dateProps} entryType="dispatched" />
          </Box>
        )}
        {tab === 2 && <DailyTransactions {...dateProps} />}
        {tab === 3 && <DailyLogs customDates={[formattedFromDate, formattedToDate]} />}
      </Box>
    </Box>
  )
}

export default Reports
