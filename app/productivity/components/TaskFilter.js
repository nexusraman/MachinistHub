'use client'

import { Box, Button, Badge } from '@mui/material'

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'factory', label: 'Factory', color: '#ff6b35' },
  { value: 'career', label: 'Career', color: '#00d9a3' },
  { value: 'family', label: 'Family', color: '#ffa500' },
  { value: 'personal', label: 'Personal', color: '#4a90e2' },
]

export default function TaskFilter({ active, onChange, counts }) {
  return (
    <Box display="flex" gap={1} flexWrap="wrap">
      {CATEGORIES.map((cat) => {
        const count = cat.value === 'all'
          ? Object.values(counts || {}).reduce((a, b) => a + b, 0)
          : (counts?.[cat.value] || 0)
        const isActive = active === cat.value

        return (
          <Button
            key={cat.value}
            onClick={() => onChange(cat.value)}
            size="small"
            variant={isActive ? 'contained' : 'outlined'}
            sx={{
              textTransform: 'none',
              fontWeight: isActive ? 700 : 400,
              borderColor: cat.color || '#1a237e',
              color: isActive ? '#fff' : (cat.color || '#1a237e'),
              bgcolor: isActive ? (cat.color || '#1a237e') : 'transparent',
              '&:hover': {
                bgcolor: isActive ? (cat.color || '#1a237e') : (cat.color || '#1a237e') + '18',
                borderColor: cat.color || '#1a237e',
              },
            }}
          >
            {cat.label}
            {count > 0 && (
              <Box
                component="span"
                sx={{
                  ml: 0.75,
                  px: 0.75,
                  py: 0.1,
                  borderRadius: 99,
                  fontSize: 11,
                  fontWeight: 700,
                  bgcolor: isActive ? 'rgba(255,255,255,0.3)' : (cat.color || '#1a237e') + '22',
                  color: isActive ? '#fff' : (cat.color || '#1a237e'),
                  lineHeight: 1.6,
                }}
              >
                {count}
              </Box>
            )}
          </Button>
        )
      })}
    </Box>
  )
}
