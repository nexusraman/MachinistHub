'use client'

import React from 'react'
import { Box, Button, Typography } from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import Navbar from '@/components/Navbar'
import { useAgent } from './AgentProvider'
import ChatPanel from './ChatPanel'

// Full-page version of the quick-log chat (/assistant). Shares its conversation with the drawer.
export default function AssistantPage() {
  const { messages, thinking, reset } = useAgent()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <Navbar />
      <Box sx={{ background: 'linear-gradient(135deg, #1a237e 0%, #0288d1 100%)', color: '#fff', px: { xs: 2, sm: 4 }, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <AutoAwesomeIcon />
        <Box flex={1}>
          <Typography variant="h5" fontWeight={700}>Assistant</Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>Log anything in plain words. Review every entry before it&apos;s saved.</Typography>
        </Box>
        <Button onClick={reset} disabled={!messages.length || thinking} startIcon={<RestartAltIcon />}
          sx={{ color: '#fff', textTransform: 'none', '&.Mui-disabled': { color: 'rgba(255,255,255,0.4)' } }}>
          New chat
        </Button>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <ChatPanel variant="page" />
      </Box>
    </Box>
  )
}
