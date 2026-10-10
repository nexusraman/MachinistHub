'use client'

import React from 'react'
import dayjs from 'dayjs'
import { Chip, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import { AgentEntry, KIND_META, SaveResult, describe } from './shared'

export default function EntryCard({ entry, result, isNew, onRemove }: { entry: AgentEntry; result?: SaveResult; isNew?: boolean; onRemove?: () => void }) {
  const meta = KIND_META[entry.kind] ?? { label: entry.kind, color: '#555' }
  const { title, details } = describe(entry)
  const extra = [...details, entry.kind !== 'dailyLog' ? entry.comment : ''].filter(Boolean)

  return (
    <Paper variant="outlined" sx={{ p: 1.25, borderLeft: `4px solid ${meta.color}`, borderRadius: 1.5 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Chip label={meta.label} size="small" sx={{ bgcolor: meta.color, color: '#fff', fontWeight: 600, height: 22 }} />
        {isNew && <Chip label="New" size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: 11 }} />}
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>{dayjs(entry.date).format('D MMM YYYY')}</Typography>
        {result?.ok && <CheckCircleIcon fontSize="small" color="success" />}
        {result && !result.ok && <ErrorOutlineIcon fontSize="small" color="error" />}
        {onRemove && !result && (
          <Tooltip title="Remove">
            <IconButton size="small" onClick={onRemove} aria-label="Remove entry"><DeleteOutlineIcon fontSize="small" /></IconButton>
          </Tooltip>
        )}
      </Stack>
      <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>{title}</Typography>
      {extra.length > 0 && <Typography variant="caption" color="text.secondary">{extra.join(' · ')}</Typography>}
      {entry.kind === 'dailyLog' && entry.comment && <Typography variant="body2" sx={{ mt: 0.25 }}>{entry.comment}</Typography>}
      {entry.issues?.map((issue, i) => (
        <Typography key={i} variant="caption" color="error" display="block">⚠ {issue}</Typography>
      ))}
      {result && !result.ok && <Typography variant="caption" color="error" display="block">{result.error}</Typography>}
    </Paper>
  )
}
