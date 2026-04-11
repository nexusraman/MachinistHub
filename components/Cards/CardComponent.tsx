'use client'

import React from 'react'
import { Box, Divider, Paper, Typography } from '@mui/material'

interface Props {
  FirstTitle?: string; FirstValue?: number | string
  SecondTitle?: string; SecondValue?: number | string
  ThirdTitle?: string; ThirdValue?: number | string
  accentColor?: string
}

const CardComponent = ({ FirstTitle, FirstValue, SecondTitle, SecondValue, ThirdTitle, ThirdValue, accentColor = '#1976d2' }: Props) => {
  const rows = [
    { t: FirstTitle, v: FirstValue },
    { t: SecondTitle, v: SecondValue },
    { t: ThirdTitle, v: ThirdValue },
  ].filter(r => r.t)

  return (
    <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ height: 3, bgcolor: accentColor }} />
      <Box sx={{ px: 2, py: 1.5 }}>
        {rows.map(({ t, v }, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Divider sx={{ my: 0.75 }} />}
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary" fontWeight={500}>{t}</Typography>
              <Typography variant="body2" fontWeight={700} color="text.primary">
                {typeof v === 'number' ? `₹${v.toLocaleString('en-IN')}` : v}
              </Typography>
            </Box>
          </React.Fragment>
        ))}
      </Box>
    </Paper>
  )
}

export default CardComponent
