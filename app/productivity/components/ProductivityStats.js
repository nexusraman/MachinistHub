'use client'

import { Box, Card, CardContent, Typography, LinearProgress, Grid } from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ListAltIcon from '@mui/icons-material/ListAlt'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import DonutLargeIcon from '@mui/icons-material/DonutLarge'

const CATEGORY_COLORS = {
  factory: '#ff6b35',
  career: '#00d9a3',
  family: '#ffa500',
  personal: '#4a90e2',
}

function StatCard({ icon, label, value, color, children }) {
  return (
    <Card elevation={1} sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Box sx={{ color }}>{icon}</Box>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {label}
          </Typography>
        </Box>
        <Typography variant="h4" fontWeight={700} sx={{ color }}>
          {value}
        </Typography>
        {children}
      </CardContent>
    </Card>
  )
}

export default function ProductivityStats({ stats }) {
  if (!stats) return null

  const { totalTasks, completedTasks, completionPercentage, overdueTasks, tasksByCategory } = stats

  return (
    <Box>
      <Grid container spacing={2} mb={2}>
        <Grid item xs={6} md={3}>
          <StatCard icon={<ListAltIcon />} label="Total Tasks" value={totalTasks} color="#1a237e" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard icon={<CheckCircleOutlineIcon />} label="Completed" value={completedTasks} color="#4caf50" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard icon={<DonutLargeIcon />} label="Completion" value={`${completionPercentage}%`} color="#0288d1">
            <LinearProgress
              variant="determinate"
              value={completionPercentage}
              sx={{ mt: 1, borderRadius: 4, height: 6, bgcolor: '#e3f2fd', '& .MuiLinearProgress-bar': { bgcolor: '#0288d1' } }}
            />
          </StatCard>
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard icon={<WarningAmberIcon />} label="Overdue" value={overdueTasks} color={overdueTasks > 0 ? '#f44336' : '#9e9e9e'} />
        </Grid>
      </Grid>

      {tasksByCategory && Object.keys(tasksByCategory).length > 0 && (
        <Box display="flex" gap={1.5} flexWrap="wrap">
          {Object.entries(tasksByCategory).map(([cat, count]) => (
            <Box
              key={cat}
              sx={{
                px: 1.5,
                py: 0.75,
                borderRadius: 2,
                bgcolor: (CATEGORY_COLORS[cat] || '#888') + '18',
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
              }}
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: CATEGORY_COLORS[cat] || '#888',
                }}
              />
              <Typography variant="caption" fontWeight={600} sx={{ textTransform: 'capitalize', color: CATEGORY_COLORS[cat] }}>
                {cat}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {count}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
