'use client'

import React, { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Box, Drawer, Fab, IconButton, Stack, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import CloseIcon from '@mui/icons-material/Close'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import NextLink from 'next/link'
import { OPEN_AGENT_EVENT } from '@/utils/entryOptions'
import { useAgent } from './Agent/AgentProvider'
import ChatPanel from './Agent/ChatPanel'

export const ASSISTANT_PATH = '/assistant'

// Floating quick-log button + side drawer, available on every page except the Assistant page itself
export default function AgentChat() {
  const pathname = usePathname()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const { loggedIn, drawerOpen, setDrawerOpen, messages, thinking, reset } = useAgent()
  const onAssistantPage = pathname === ASSISTANT_PATH

  // Open from anywhere: other components fire OPEN_AGENT_EVENT; Ctrl/Cmd+K toggles
  useEffect(() => {
    const openPanel = () => setDrawerOpen(true)
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !onAssistantPage) {
        e.preventDefault()
        setDrawerOpen(o => !o)
      }
    }
    window.addEventListener(OPEN_AGENT_EVENT, openPanel)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener(OPEN_AGENT_EVENT, openPanel)
      window.removeEventListener('keydown', onKey)
    }
  }, [setDrawerOpen, onAssistantPage])

  if (!loggedIn || pathname === '/login' || onAssistantPage) return null

  return (
    <>
      {!drawerOpen && (
        <Tooltip title="Quick log with AI (Ctrl+K)" placement="left">
          <Fab color="primary" onClick={() => setDrawerOpen(true)} aria-label="Open AI assistant"
            sx={{ position: 'fixed', right: 20, bottom: 20, zIndex: theme.zIndex.drawer - 1 }}>
            <AutoAwesomeIcon />
          </Fab>
        </Tooltip>
      )}

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: isMobile ? '100%' : 420, display: 'flex', flexDirection: 'column' } }}>
        <Stack direction="row" alignItems="center" sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <AutoAwesomeIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flex: 1, fontSize: 18 }}>Quick log</Typography>
          <Tooltip title="Open full assistant">
            <IconButton component={NextLink} href={ASSISTANT_PATH} onClick={() => setDrawerOpen(false)} aria-label="Open full assistant">
              <OpenInFullIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="New conversation">
            <span>
              <IconButton onClick={reset} disabled={!messages.length || thinking} aria-label="New conversation"><RestartAltIcon /></IconButton>
            </span>
          </Tooltip>
          <IconButton onClick={() => setDrawerOpen(false)} aria-label="Close"><CloseIcon /></IconButton>
        </Stack>
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <ChatPanel variant="drawer" />
        </Box>
      </Drawer>
    </>
  )
}
