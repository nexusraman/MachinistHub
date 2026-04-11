'use client'

import React, { useState } from 'react'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Box from '@mui/material/Box'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import CircularProgress from '@mui/material/CircularProgress'
import axios from 'axios'
import { useRouter } from 'next/navigation'

function Copyright() {
  return (
    <Typography variant="body2" color="text.secondary" align="center" mt={8} mb={4}>
      {'Copyright © '}
      <Link color="inherit">MachinistHub</Link> {new Date().getFullYear()}.
    </Typography>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data } = await axios.post('/api/auth/login', { username, password })
      localStorage.setItem('authToken', data.token)
      router.push('/')
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Error'
      setError(msg)
      setTimeout(() => setError(''), 5000)
    }

    setLoading(false)
  }

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      sx={{
        backgroundImage: 'url(/machine.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        sx={{ bgcolor: 'rgba(255,255,255,0.9)', p: 4, borderRadius: 2, minWidth: 320 }}
      >
        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Sign in
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Username"
            name="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2, p: 1.5 }}>
            {!loading ? (
              'Log In'
            ) : (
              <Box display="flex" alignItems="center" justifyContent="center">
                <CircularProgress size="1.5rem" color="inherit" />
              </Box>
            )}
          </Button>
          <div>
            {error.includes('401') && <span>Incorrect Credentials</span>}
            {error.includes('400') && <span>Please try again</span>}
            {error.includes('403') && <span>Server Error. Try Again</span>}
          </div>
        </Box>
        <Copyright />
      </Box>
    </Box>
  )
}
