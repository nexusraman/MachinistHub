'use client'

import { Box, Typography } from '@mui/material'
import AssignmentIcon from '@mui/icons-material/Assignment'
import TaskCard from './TaskCard'

export default function TaskList({ tasks, onUpdate, onDelete, onEdit }) {
  if (!tasks || tasks.length === 0) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        py={8}
        color="text.secondary"
      >
        <AssignmentIcon sx={{ fontSize: 56, mb: 1.5, opacity: 0.3 }} />
        <Typography variant="h6" fontWeight={500} gutterBottom>
          No tasks here
        </Typography>
        <Typography variant="body2">
          Create a task to get started.
        </Typography>
      </Box>
    )
  }

  return (
    <Box display="flex" flexDirection="column" gap={1.5}>
      {tasks.map((task) => (
        <TaskCard
          key={task._id}
          task={task}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </Box>
  )
}
