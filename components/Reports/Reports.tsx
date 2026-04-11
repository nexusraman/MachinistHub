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
import { Box, Chip, Grid, Paper, TextField, Typography } from '@mui/material'
import AssessmentIcon from '@mui/icons-material/Assessment'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'

interface Props { role?: string }

const fmtDate = (ts: number) => new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

const Reports = ({ role }: Props) => {
  const today = new Date()
  const [fromValue, setFromValue] = useState(today)
  const [toValue, setToValue] = useState(today)
  const [formattedFromDate, setFormattedFromDate] = useState(today.getTime())
  const [formattedToDate, setFormattedToDate] = useState(today.getTime())

  return (
    <Box>
      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg, #1a237e 0%, #0288d1 100%)', color: '#fff', px: 4, py: 3 }}>
        <Box display="flex" alignItems="center" gap={1.5} mb={2}>
          <AssessmentIcon sx={{ fontSize: 30 }} />
          <Typography variant="h5" fontWeight={700}>Reports</Typography>
        </Box>

        {/* Date range picker */}
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

      <Box sx={{ p: 3 }}>
        {/* Overview stat cards */}
        <Grid container spacing={2} mb={3}>
          {role === 'Admin' && (
            <Grid item xs={12} sm={6} md={3}>
              <ExpenseOverviewCard customDates={[formattedFromDate, formattedToDate]} />
            </Grid>
          )}
          <Grid item xs={12} sm={6} md={3}>
            <ActivitiesOverviewCard customDates={[formattedFromDate, formattedToDate]} />
          </Grid>
        </Grid>

        {/* Tables */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}><DailyActivities customDates={[formattedFromDate, formattedToDate]} /></Grid>
          <Grid item xs={12} md={6}><DailyTransactions customDates={[formattedFromDate, formattedToDate]} /></Grid>
          <Grid item xs={12} md={6}><Rotors customDates={[formattedFromDate, formattedToDate]} /></Grid>
          <Grid item xs={12} md={6}><DailyLogs /></Grid>
        </Grid>
      </Box>
    </Box>
  )
}

export default Reports
