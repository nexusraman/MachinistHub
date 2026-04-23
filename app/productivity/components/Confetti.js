'use client'

import { useEffect, useState } from 'react'
import { Box } from '@mui/material'

const COLORS = ['#ff6b35', '#00d9a3', '#ffd700', '#4a90e2', '#ff9800', '#9c27b0', '#4caf50']
const SHAPES = ['●', '■', '▲', '★', '♦']

function randomBetween(a, b) {
  return a + Math.random() * (b - a)
}

export default function Confetti({ active, onDone }) {
  const [particles, setParticles] = useState([])

  useEffect(() => {
    if (!active) return
    const ps = Array.from({ length: 48 }, (_, i) => ({
      id: i,
      x: randomBetween(5, 95),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      size: randomBetween(10, 18),
      delay: randomBetween(0, 0.5),
      duration: randomBetween(0.9, 1.6),
      dx: randomBetween(-60, 60),
    }))
    setParticles(ps)
    const t = setTimeout(() => { setParticles([]); onDone?.() }, 2200)
    return () => clearTimeout(t)
  }, [active])

  if (!particles.length) return null

  return (
    <Box sx={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      overflow: 'hidden', borderRadius: 'inherit', zIndex: 10,
    }}>
      <style>{`
        @keyframes confettiFly {
          0%   { transform: translateY(0) translateX(0) rotate(0deg); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(-280px) translateX(var(--dx)) rotate(720deg); opacity: 0; }
        }
      `}</style>
      {particles.map((p) => (
        <Box
          key={p.id}
          component="span"
          sx={{
            position: 'absolute',
            bottom: '30%',
            left: `${p.x}%`,
            fontSize: p.size,
            color: p.color,
            '--dx': `${p.dx}px`,
            animation: `confettiFly ${p.duration}s ${p.delay}s ease-out forwards`,
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          {p.shape}
        </Box>
      ))}
    </Box>
  )
}
