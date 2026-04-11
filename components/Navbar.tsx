'use client'

import React, { useState } from 'react'
import {
  AppBar, Box, Button, Drawer, IconButton, List, ListItem,
  ListItemIcon, ListItemText, Toolbar, Typography, useMediaQuery, useTheme,
} from '@mui/material'
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'
import DashboardIcon from '@mui/icons-material/Dashboard'
import PeopleIcon from '@mui/icons-material/People'
import EditNoteIcon from '@mui/icons-material/EditNote'
import AssessmentIcon from '@mui/icons-material/Assessment'
import MenuIcon from '@mui/icons-material/Menu'
import LogoutIcon from '@mui/icons-material/Logout'
import NextLink from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import axios from 'axios'

const NAV_ITEMS = [
  { text: 'Dashboard', path: '/', icon: <DashboardIcon fontSize="small" /> },
  { text: 'Clients', path: '/clients', icon: <PeopleIcon fontSize="small" /> },
  { text: 'Input Form', path: '/create', icon: <EditNoteIcon fontSize="small" /> },
  { text: 'Reports', path: '/reports', icon: <AssessmentIcon fontSize="small" /> },
]

const Navbar = () => {
  const router = useRouter()
  const pathname = usePathname()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [drawerOpen, setDrawerOpen] = useState(false)

  const logoutHandler = async () => {
    await axios.post('/api/auth/logout')
    localStorage.removeItem('authToken')
    router.push('/login')
  }

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path)

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: 'linear-gradient(135deg, #1a237e 0%, #0288d1 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <Toolbar sx={{ gap: 1 }}>
        {/* Brand */}
        <Box display="flex" alignItems="center" gap={1} sx={{ mr: 3 }}>
          <PrecisionManufacturingIcon sx={{ fontSize: 28 }} />
          {!isMobile && (
            <Typography variant="h6" fontWeight={700} letterSpacing={0.5} noWrap>
              MachinistHub
            </Typography>
          )}
        </Box>

        {isMobile ? (
          <>
            <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
              MachinistHub
            </Typography>
            <IconButton color="inherit" onClick={() => setDrawerOpen(true)}>
              <MenuIcon />
            </IconButton>
          </>
        ) : (
          <>
            {/* Desktop nav links */}
            <Box display="flex" gap={0.5} flex={1}>
              {NAV_ITEMS.map(item => (
                <Button
                  key={item.path}
                  component={NextLink}
                  href={item.path}
                  startIcon={item.icon}
                  sx={{
                    color: '#fff',
                    px: 2,
                    py: 0.75,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: isActive(item.path) ? 700 : 400,
                    bgcolor: isActive(item.path) ? 'rgba(255,255,255,0.18)' : 'transparent',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
                  }}
                >
                  {item.text}
                </Button>
              ))}
            </Box>

            <Button
              variant="outlined"
              onClick={logoutHandler}
              startIcon={<LogoutIcon />}
              size="small"
              sx={{
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.5)',
                textTransform: 'none',
                '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              Logout
            </Button>
          </>
        )}
      </Toolbar>

      {/* Mobile drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 260, pt: 1 } }}
      >
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PrecisionManufacturingIcon sx={{ color: '#1a237e' }} />
          <Typography variant="h6" fontWeight={700} color="#1a237e">MachinistHub</Typography>
        </Box>

        <List sx={{ px: 1 }}>
          {NAV_ITEMS.map(item => (
            <ListItem
              key={item.path}
              component={NextLink}
              href={item.path}
              onClick={() => setDrawerOpen(false)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                bgcolor: isActive(item.path) ? 'rgba(25,118,210,0.12)' : 'transparent',
                color: isActive(item.path) ? '#1976d2' : 'text.primary',
                '&:hover': { bgcolor: 'rgba(25,118,210,0.08)' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{ fontWeight: isActive(item.path) ? 700 : 400 }}
              />
            </ListItem>
          ))}
        </List>

        <Box sx={{ px: 2, mt: 'auto', mb: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            color="error"
            startIcon={<LogoutIcon />}
            onClick={logoutHandler}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Logout
          </Button>
        </Box>
      </Drawer>
    </AppBar>
  )
}

export default Navbar
