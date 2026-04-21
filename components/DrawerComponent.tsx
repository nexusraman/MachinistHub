'use client'

import React, { useState } from 'react'
import { Box, Button, Drawer, IconButton, List, ListItemButton, ListItemText } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import MenuItems from './Utils/MenuItems'
import axios from 'axios'

const DrawerComponent = () => {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const logoutHandler = async () => {
    await axios.post('/api/auth/logout')
    localStorage.removeItem('authToken')
    router.push('/login')
  }

  return (
    <>
      <Drawer open={open} onClose={() => setOpen(false)}>
        <List sx={{ width: 220 }}>
          {MenuItems.MainMenu.map((item, i) => (
            <ListItemButton key={i} component={NextLink} href={item.path} onClick={() => setOpen(false)}>
              <ListItemText primary={item.text} />
            </ListItemButton>
          ))}
          <Box mx={2} mt={2}>
            <Button size="small" color="secondary" variant="contained" onClick={logoutHandler} fullWidth>
              Logout
            </Button>
          </Box>
        </List>
      </Drawer>
      <IconButton sx={{ marginLeft: 'auto', color: 'white' }} onClick={() => setOpen(true)}>
        <MenuIcon />
      </IconButton>
    </>
  )
}

export default DrawerComponent
