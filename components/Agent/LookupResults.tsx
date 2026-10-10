'use client'

import React, { useState } from 'react'
import axios from 'axios'
import dayjs, { Dayjs } from 'dayjs'
import { useSnackbar } from 'notistack'
import {
  Box, Chip, CircularProgress, IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography,
} from '@mui/material'
import HistoryIcon from '@mui/icons-material/History'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import type { AgentReply } from '@/lib/agent'
import { AgentEntry, KIND_META, describe, errorMessage, rupee } from './shared'

type Lookup = NonNullable<AgentReply['lookup']>

// Signed amount so income and expenses read at a glance
function amountCell(e: AgentEntry) {
  if (e.amount !== undefined) {
    const inflow = e.kind === 'income'
    return <Typography component="span" fontSize={13} fontWeight={700} color={inflow ? 'success.main' : 'error.main'}>{inflow ? '+' : '−'}{rupee(e.amount)}</Typography>
  }
  if (e.quantity !== undefined) return <Typography component="span" fontSize={13} fontWeight={600}>{e.quantity} pcs</Typography>
  return null
}

function who(e: AgentEntry) {
  return e.client || e.payee || e.category || e.relatedTo || '—'
}

function detail(e: AgentEntry) {
  if (e.kind === 'dailyLog') return e.comment ?? ''
  const { details } = describe(e)
  const extra = e.kind === 'submersible' || e.kind === 'fanRotor' ? [`${e.rotorSize ?? ''}`, ...details] : details
  return [...extra, e.comment].filter(Boolean).join(' · ')
}

const FMT = 'YYYY-MM-DD'

// Step a range back/forward. Whole calendar months (or month-to-date) move by a month,
// anything else moves by its own length in days.
function shiftRange(from: string, to: string | undefined, dir: -1 | 1): { from: string; to: string } {
  const f = dayjs(from)
  const t = dayjs(to ?? dayjs().format(FMT))
  const monthAligned = f.date() === 1 && f.isSame(t, 'month')
  if (monthAligned) {
    const m = f.add(dir, 'month')
    return { from: m.startOf('month').format(FMT), to: m.endOf('month').format(FMT) }
  }
  const days = t.diff(f, 'day') + 1
  return { from: f.add(dir * days, 'day').format(FMT), to: t.add(dir * days, 'day').format(FMT) }
}

export default function LookupResults({ lookup: initial, compact }: { lookup: Lookup; compact?: boolean }) {
  const { enqueueSnackbar } = useSnackbar()
  const [lookup, setLookup] = useState<Lookup>(initial)
  const [loading, setLoading] = useState(false)
  const { summary: s, entries, total, range, client } = lookup

  // Re-run the same search for another date range — straight from the database, no AI call
  const load = async (from?: string, to?: string) => {
    if (from && to && from > to) [from, to] = [to, from]
    setLoading(true)
    try {
      const res = await axios.post('/api/agent/lookup', { query: { ...lookup.query, from: from ?? null, to: to ?? null } })
      setLookup(res.data)
    } catch (e) {
      enqueueSnackbar(errorMessage(e, 'Could not load entries'), { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }
  const step = (dir: -1 | 1) => {
    if (!range.from) return
    const next = shiftRange(range.from, range.to, dir)
    load(next.from, next.to)
  }
  const today = dayjs().format(FMT)
  const canGoForward = !!range.from && (range.to ?? today) < today
  const dateInput = (label: string, value: string | undefined, onPick: (v: Dayjs) => void) => (
    <TextField type="date" size="small" label={label} value={value ?? ''} InputLabelProps={{ shrink: true }}
      inputProps={{ max: today }} onChange={e => { if (e.target.value) onPick(dayjs(e.target.value)) }}
      sx={{ width: 150, '& input': { py: 0.6, fontSize: 13 } }} />
  )
  const rangeLabel = range.from || range.to
    ? `${range.from ? dayjs(range.from).format('D MMM') : 'Start'} – ${range.to ? dayjs(range.to).format('D MMM YYYY') : 'today'}`
    : 'All time'

  return (
    <Paper variant="outlined" sx={{ mt: 1, borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ px: 1.5, py: 1, bgcolor: 'grey.100', borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
          <HistoryIcon fontSize="small" color="action" />
          <Typography variant="body2" fontWeight={700}>{total} saved {total === 1 ? 'record' : 'records'}</Typography>
          <Typography variant="caption" color="text.secondary">· {rangeLabel}</Typography>
          {loading && <CircularProgress size={14} />}
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', rowGap: 1 }}>
          <Tooltip title="Earlier">
            <span><IconButton size="small" onClick={() => step(-1)} disabled={loading || !range.from} aria-label="Earlier period"><ChevronLeftIcon /></IconButton></span>
          </Tooltip>
          {dateInput('From', range.from, v => load(v.format(FMT), range.to ?? today))}
          {dateInput('To', range.to ?? (range.from ? today : undefined), v => load(range.from ?? v.format(FMT), v.format(FMT)))}
          <Tooltip title="Later">
            <span><IconButton size="small" onClick={() => step(1)} disabled={loading || !canGoForward} aria-label="Later period"><ChevronRightIcon /></IconButton></span>
          </Tooltip>
          <Chip size="small" variant="outlined" label="Month" disabled={loading}
            onClick={() => load(dayjs(range.to ?? today).startOf('month').format(FMT), dayjs(range.to ?? today).endOf('month').format(FMT))} />
          <Chip size="small" variant="outlined" label="Day" disabled={loading}
            onClick={() => { const d = range.to ?? today; load(d, d) }} />
        </Stack>
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
          {client && <Chip size="small" color="secondary" label={`${client.name} balance ${rupee(client.balance)}`} />}
          {s.income > 0 && <Chip size="small" variant="outlined" color="success" label={`In ${rupee(s.income)}`} />}
          {s.expense > 0 && <Chip size="small" variant="outlined" color="error" label={`Out ${rupee(s.expense)}`} />}
          {s.personal > 0 && <Chip size="small" variant="outlined" color="warning" label={`Personal ${rupee(s.personal)}`} />}
          {s.submersibleQty > 0 && <Chip size="small" variant="outlined" label={`${s.submersibleQty} submersible pcs`} />}
          {s.fanReceived > 0 && <Chip size="small" variant="outlined" label={`${s.fanReceived} fan received`} />}
          {s.fanDispatched > 0 && <Chip size="small" variant="outlined" label={`${s.fanDispatched} fan dispatched`} />}
        </Stack>
      </Box>

      {entries.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>Nothing found.</Typography>
      ) : (
        <TableContainer sx={{ maxHeight: compact ? 280 : 420 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {['Date', 'Type', 'Who', ...(compact ? [] : ['Details']), 'Amount'].map(h => (
                  <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', py: 0.75, bgcolor: 'background.paper' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map(e => {
                const meta = KIND_META[e.kind]
                return (
                  <TableRow key={e.id} hover>
                    <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap', color: 'text.secondary' }}>{dayjs(e.date).format('D MMM')}</TableCell>
                    <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      <Box component="span" sx={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', bgcolor: meta?.color, mr: 0.75 }} />
                      {meta?.label ?? e.kind}
                    </TableCell>
                    <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>
                      {who(e)}
                      {compact && detail(e) && <Typography display="block" variant="caption" color="text.secondary" fontWeight={400}>{detail(e)}</Typography>}
                    </TableCell>
                    {!compact && <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{detail(e)}</TableCell>}
                    <TableCell sx={{ whiteSpace: 'nowrap' }} align="right">{amountCell(e)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {total > entries.length && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 1.5, py: 0.75, borderTop: 1, borderColor: 'divider' }}>
          Showing the latest {entries.length} of {total}. Totals include all {total}. Narrow it down (e.g. a date or person) to see more.
        </Typography>
      )}
    </Paper>
  )
}
