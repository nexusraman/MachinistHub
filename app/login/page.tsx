'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Box from '@mui/material/Box'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import bgImage from '../../public/login.jpg'

const inputSx = {
  '& .MuiOutlinedInput-root': {
    color: '#f1f5f9',
    borderRadius: '10px',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
    '&:hover fieldset': { borderColor: 'rgba(99,102,241,0.6)' },
    '&.Mui-focused fieldset': { borderColor: '#6366f1' },
  },
  '& .MuiInputLabel-root': { color: '#94a3b8' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#6366f1' },
  '& input': { color: '#f1f5f9' },
  '& input:-webkit-autofill': {
    WebkitBoxShadow: '0 0 0 100px rgba(15,23,42,0.9) inset',
    WebkitTextFillColor: '#f1f5f9',
  },
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
    <div style={{ position: 'relative', width: '100vw', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* background image */}
      <Image
        src={bgImage}
        alt="Background"
        fill
        quality={90}
        priority
        style={{ objectFit: 'cover', zIndex: 0 }}
      />
      {/* dark overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(6, 11, 24, 0.65)',
          backdropFilter: 'blur(2px)',
          zIndex: 1,
        }}
      />

      {/* card */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: 400,
          mx: 2,
          p: { xs: 4, sm: 5 },
          borderRadius: '20px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* logo */}
        <Avatar
          sx={{
            mb: 2,
            width: 52,
            height: 52,
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            boxShadow: '0 0 24px rgba(99,102,241,0.5)',
          }}
        >
          <LockOutlinedIcon sx={{ fontSize: 26 }} />
        </Avatar>

        <Typography
          variant="h5"
          fontWeight={700}
          sx={{ color: '#f1f5f9', mb: 0.5, letterSpacing: 0.3 }}
        >
          Welcome back
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b', mb: 3.5 }}>
          Sign in to MachinistHub
        </Typography>

        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Username"
            name="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            sx={inputSx}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Password"
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={inputSx}
          />

          {error && (
            <Box
              sx={{
                mt: 1.5,
                px: 2,
                py: 1,
                borderRadius: '8px',
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.3)',
              }}
            >
              <Typography variant="body2" sx={{ color: '#fca5a5', fontSize: '0.82rem' }}>
                {error.includes('401') && 'Incorrect credentials. Please try again.'}
                {error.includes('400') && 'Please fill in all fields.'}
                {error.includes('403') && 'Server error. Try again later.'}
                {!error.includes('401') && !error.includes('400') && !error.includes('403') && 'Something went wrong.'}
              </Typography>
            </Box>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{
              mt: 3,
              mb: 1,
              py: 1.4,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
              fontWeight: 700,
              fontSize: '0.95rem',
              textTransform: 'none',
              letterSpacing: 0.3,
              boxShadow: '0 0 24px rgba(99,102,241,0.4)',
              '&:hover': { opacity: 0.88, boxShadow: '0 0 32px rgba(99,102,241,0.55)' },
              '&.Mui-disabled': { background: 'rgba(99,102,241,0.3)', color: '#94a3b8' },
            }}
          >
            {loading ? <CircularProgress size={22} sx={{ color: '#94a3b8' }} /> : 'Sign In'}
          </Button>
        </Box>

        <Typography variant="caption" sx={{ color: '#334155', mt: 3 }}>
          © {new Date().getFullYear()} MachinistHub
        </Typography>
      </Box>
    </div>
  )
}
