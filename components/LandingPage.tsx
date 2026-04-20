'use client'

import Link from 'next/link'
import Image from 'next/image'
import bgImage from '../public/login.jpg'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid'
import AssessmentIcon from '@mui/icons-material/Assessment'
import PeopleIcon from '@mui/icons-material/People'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'

const features = [
  {
    icon: <PrecisionManufacturingIcon sx={{ fontSize: 32 }} />,
    title: 'Manufacturing Tracking',
    desc: 'Log fan and submersible production data. Monitor every job from start to finish with precision.',
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.12)',
  },
  {
    icon: <PeopleIcon sx={{ fontSize: 32 }} />,
    title: 'Client Management',
    desc: 'Every client record, payment status, and order history in one clean, organised place.',
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.12)',
  },
  {
    icon: <ReceiptLongIcon sx={{ fontSize: 32 }} />,
    title: 'Expense & Income',
    desc: 'Track every inflow and outflow in real time. Know exactly where every rupee goes.',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.12)',
  },
  {
    icon: <AssessmentIcon sx={{ fontSize: 32 }} />,
    title: 'Reports & Analytics',
    desc: 'Daily activity reports, transaction summaries, and rotor inventory snapshots — instantly.',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
  },
]

const stats = [
  { value: '100%', label: 'Paperless' },
  { value: 'Real-time', label: 'Data sync' },
  { value: 'All-in-one', label: 'Platform' },
]

export default function LandingPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#060b18 !important',
        color: '#e2e8f0',
        fontFamily: "'Inter', sans-serif",
        '& *': { boxSizing: 'border-box' },
      }}
    >
      {/* ── Navbar ── */}
      <Box
        component="nav"
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 3, md: 8 },
          py: 2,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          background: 'rgba(6,11,24,0.72)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PrecisionManufacturingIcon sx={{ fontSize: 20, color: '#fff' }} />
          </Box>
          <Typography fontWeight={700} fontSize="1.05rem" letterSpacing={0.3}>
            MachinistHub
          </Typography>
        </Box>

        <Button
          component={Link}
          href="/login"
          variant="contained"
          size="small"
          sx={{
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            color: '#fff',
            textTransform: 'none',
            fontWeight: 600,
            px: 2.5,
            py: 0.8,
            borderRadius: '8px',
            fontSize: '0.85rem',
            boxShadow: '0 0 20px rgba(99,102,241,0.35)',
            '&:hover': { opacity: 0.88, boxShadow: '0 0 28px rgba(99,102,241,0.5)' },
          }}
        >
          Sign In
        </Button>
      </Box>

      {/* ── Hero ── */}
      <Box
        sx={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          overflow: 'hidden',
          pt: 10,
        }}
      >
        {/* blurred bg image */}
        <Image
          src={bgImage}
          alt="Background"
          fill
          quality={90}
          priority
          style={{ objectFit: 'cover', filter: 'brightness(0.15) saturate(0.3)', zIndex: 0 }}
        />

        {/* glow orbs */}
        <Box
          sx={{
            position: 'absolute',
            top: '15%',
            left: '10%',
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '10%',
            right: '8%',
            width: 420,
            height: 420,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(6,182,212,0.16) 0%, transparent 70%)',
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />

        <Box sx={{ position: 'relative', zIndex: 1, px: 3, maxWidth: 820 }}>
          {/* badge */}
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.8,
              px: 2,
              py: 0.6,
              mb: 4,
              borderRadius: '999px',
              border: '1px solid rgba(99,102,241,0.4)',
              background: 'rgba(99,102,241,0.1)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                bgcolor: '#6366f1',
                boxShadow: '0 0 8px #6366f1',
              }}
            />
            <Typography variant="caption" sx={{ color: '#a5b4fc', fontWeight: 600, letterSpacing: 1 }}>
              MANUFACTURING &amp; BUSINESS PLATFORM
            </Typography>
          </Box>

          <Typography
            variant="h1"
            fontWeight={800}
            lineHeight={1.08}
            sx={{
              fontSize: { xs: '2.6rem', sm: '3.6rem', md: '4.8rem' },
              mb: 3,
              background: 'linear-gradient(135deg, #f1f5f9 30%, #94a3b8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Run Your Workshop.
            <br />
            <Box
              component="span"
              sx={{
                background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Own Every Detail.
            </Box>
          </Typography>

          <Typography
            sx={{
              color: '#64748b',
              fontSize: { xs: '1rem', md: '1.15rem' },
              mb: 5,
              maxWidth: 560,
              mx: 'auto',
              lineHeight: 1.75,
            }}
          >
            MachinistHub unifies clients, production tracking, finances, and analytics — one
            platform built for the modern machining business.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              component={Link}
              href="/login"
              variant="contained"
              size="large"
              endIcon={<ArrowForwardIcon />}
              sx={{
                background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                color: '#fff',
                px: 4,
                py: 1.5,
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.95rem',
                textTransform: 'none',
                boxShadow: '0 0 32px rgba(99,102,241,0.4)',
                '&:hover': { opacity: 0.88 },
              }}
            >
              Get Started
            </Button>
          </Box>

          {/* stats row */}
          <Box
            sx={{
              mt: 8,
              display: 'flex',
              justifyContent: 'center',
              gap: { xs: 4, md: 8 },
              flexWrap: 'wrap',
            }}
          >
            {stats.map((s) => (
              <Box key={s.label} sx={{ textAlign: 'center' }}>
                <Typography fontWeight={800} fontSize="1.4rem" sx={{ color: '#e2e8f0' }}>
                  {s.value}
                </Typography>
                <Typography variant="caption" sx={{ color: '#475569', letterSpacing: 0.5 }}>
                  {s.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* ── Features ── */}
      <Box sx={{ py: { xs: 10, md: 16 }, position: 'relative' }}>
        {/* subtle grid background */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            zIndex: 0,
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box textAlign="center" mb={8}>
            <Typography
              variant="overline"
              sx={{ color: '#6366f1', letterSpacing: 3, fontWeight: 700 }}
            >
              FEATURES
            </Typography>
            <Typography
              variant="h3"
              fontWeight={800}
              mt={1}
              sx={{
                fontSize: { xs: '1.8rem', md: '2.5rem' },
                background: 'linear-gradient(135deg, #f1f5f9, #94a3b8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Everything your shop needs
            </Typography>
            <Typography sx={{ color: '#475569', mt: 1.5, fontSize: '1rem' }}>
              Purpose-built tools for every part of your operation.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {features.map((f) => (
              <Grid key={f.title} item xs={12} sm={6} md={3}>
                <Box
                  sx={{
                    p: 3.5,
                    height: '100%',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.07)',
                    background: 'rgba(255,255,255,0.03)',
                    backdropFilter: 'blur(12px)',
                    transition: 'border-color 0.25s, transform 0.25s, box-shadow 0.25s',
                    '&:hover': {
                      borderColor: f.color,
                      transform: 'translateY(-4px)',
                      boxShadow: `0 16px 48px rgba(0,0,0,0.3), 0 0 0 1px ${f.color}22`,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 54,
                      height: 54,
                      borderRadius: '14px',
                      background: f.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2.5,
                      color: f.color,
                    }}
                  >
                    {f.icon}
                  </Box>
                  <Typography fontWeight={700} fontSize="0.98rem" mb={1} sx={{ color: '#e2e8f0' }}>
                    {f.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.75 }}>
                    {f.desc}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── CTA ── */}
      <Box sx={{ py: { xs: 10, md: 14 }, px: 3 }}>
        <Container maxWidth="md">
          <Box
            sx={{
              borderRadius: '24px',
              border: '1px solid rgba(99,102,241,0.25)',
              background:
                'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(6,182,212,0.08) 100%)',
              backdropFilter: 'blur(20px)',
              p: { xs: 5, md: 8 },
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: '-40%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 400,
                height: 400,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 65%)',
                pointerEvents: 'none',
              }}
            />
            <Typography
              variant="h4"
              fontWeight={800}
              mb={2}
              sx={{
                fontSize: { xs: '1.6rem', md: '2.2rem' },
                background: 'linear-gradient(135deg, #f1f5f9, #94a3b8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Ready to take control?
            </Typography>
            <Typography sx={{ color: '#64748b', mb: 4, fontSize: '1rem', lineHeight: 1.7 }}>
              Sign in to your MachinistHub account and get back to what you do best.
            </Typography>
            {['Client & payment tracking', 'Live expense monitoring', 'Instant report generation'].map(
              (item) => (
                <Box
                  key={item}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center', mb: 1 }}
                >
                  <CheckCircleOutlineIcon sx={{ color: '#6366f1', fontSize: 18 }} />
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    {item}
                  </Typography>
                </Box>
              )
            )}
            <Button
              component={Link}
              href="/login"
              variant="contained"
              size="large"
              endIcon={<ArrowForwardIcon />}
              sx={{
                mt: 4,
                background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                color: '#fff',
                px: 5,
                py: 1.5,
                borderRadius: '10px',
                fontWeight: 700,
                textTransform: 'none',
                boxShadow: '0 0 32px rgba(99,102,241,0.4)',
                '&:hover': { opacity: 0.88 },
              }}
            >
              Sign In to MachinistHub
            </Button>
          </Box>
        </Container>
      </Box>

      {/* ── Footer ── */}
      <Box
        sx={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          py: 3,
          textAlign: 'center',
        }}
      >
        <Typography variant="body2" sx={{ color: '#334155' }}>
          © {new Date().getFullYear()} MachinistHub. All rights reserved.
        </Typography>
      </Box>
    </Box>
  )
}
