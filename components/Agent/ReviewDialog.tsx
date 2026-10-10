'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import {
  Autocomplete, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, Grid, IconButton, MenuItem, Paper, Stack, TextField, Tooltip, Typography, useMediaQuery, useTheme,
} from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import {
  EXPENSE_REASONS, FAN_ROTOR_SIZES, INCOME_REASONS, PERSONAL_CATEGORIES, SUBMERSIBLE_SIZES,
} from '@/utils/entryOptions'
import { AgentEntry, EntryKind, KIND_META, errorMessage, rupee, stripComputed } from './shared'

type Options = {
  clients: { name: string; category?: string; active?: boolean }[]
  employees: string[]
  shaftSizes: string[]
}

type FieldType = 'text' | 'number' | 'date' | 'select' | 'client' | 'payee' | 'bool' | 'multiline'
interface FieldSpec {
  key: keyof AgentEntry
  label: string
  type: FieldType
  options?: string[]
  clientCategory?: 'submersible' | 'fan'
  show?: (e: AgentEntry) => boolean
  wide?: boolean
}

const isTransfer = (e: AgentEntry) => e.medium === 'Transfer'
const MONEY: FieldSpec[] = [
  { key: 'amount', label: 'Amount (₹)', type: 'number' },
  { key: 'medium', label: 'Paid by', type: 'select', options: ['Cash', 'Transfer'] },
  { key: 'transferMethod', label: 'Transfer via', type: 'select', options: ['UPI', 'Bank Transfer'], show: isTransfer },
]

// Date is always first; client comes next wherever the entry relates to one
const FIELDS: Record<EntryKind, FieldSpec[]> = {
  submersible: [
    { key: 'client', label: 'Client', type: 'client', clientCategory: 'submersible' },
    { key: 'rotorSize', label: 'Size', type: 'select', options: SUBMERSIBLE_SIZES.map(String) },
    { key: 'quantity', label: 'Quantity', type: 'number' },
  ],
  fanRotor: [
    { key: 'client', label: 'Client', type: 'client', clientCategory: 'fan' },
    { key: 'rotorType', label: 'Movement', type: 'select', options: ['received', 'dispatched'] },
    { key: 'rotorSize', label: 'Rotor size', type: 'select', options: FAN_ROTOR_SIZES },
    { key: 'quantity', label: 'Quantity', type: 'number' },
    { key: 'shaftSize', label: 'Shaft size', type: 'select', show: e => e.rotorType === 'dispatched' },
    { key: 'rate', label: 'Rate / pc (₹)', type: 'number', show: e => e.rotorType === 'dispatched' },
  ],
  expense: [
    { key: 'payee', label: 'Paid to', type: 'payee' },
    { key: 'reason', label: 'Reason', type: 'select', options: EXPENSE_REASONS },
    ...MONEY,
    { key: 'comment', label: 'Note', type: 'text', wide: true },
  ],
  income: [
    { key: 'client', label: 'Received from', type: 'client' },
    { key: 'isOneTime', label: 'One-time (not a client)', type: 'bool' },
    { key: 'reason', label: 'Reason', type: 'select', options: INCOME_REASONS },
    ...MONEY,
    { key: 'comment', label: 'Note', type: 'text', wide: true },
  ],
  personalExpense: [
    { key: 'category', label: 'Category', type: 'select', options: PERSONAL_CATEGORIES },
    { key: 'description', label: 'Description', type: 'text' },
    ...MONEY,
    { key: 'comment', label: 'Note', type: 'text', wide: true },
  ],
  dailyLog: [
    { key: 'relatedTo', label: 'Topic', type: 'text' },
    { key: 'comment', label: 'Details', type: 'multiline', wide: true },
  ],
}

function FieldInput({ spec, entry, options, onChange }: {
  spec: FieldSpec; entry: AgentEntry; options: Options; onChange: (key: keyof AgentEntry, value: unknown) => void
}) {
  const value = entry[spec.key]
  const common = { size: 'small' as const, fullWidth: true, label: spec.label }

  switch (spec.type) {
    case 'number':
      return (
        <TextField {...common} type="number" value={value ?? ''} inputProps={{ min: 0 }}
          onChange={e => onChange(spec.key, e.target.value === '' ? undefined : Number(e.target.value))} />
      )
    case 'date':
      return <TextField {...common} type="date" value={value ?? ''} InputLabelProps={{ shrink: true }} onChange={e => onChange(spec.key, e.target.value)} />
    case 'bool':
      return (
        <FormControlLabel label={spec.label} sx={{ ml: 0 }}
          control={<Checkbox size="small" checked={!!value} onChange={e => onChange(spec.key, e.target.checked)} />} />
      )
    case 'select': {
      const opts = spec.key === 'shaftSize' ? options.shaftSizes : spec.options ?? []
      const v = value === undefined ? '' : String(value)
      return (
        <TextField {...common} select value={opts.includes(v) ? v : ''} onChange={e => onChange(spec.key, e.target.value)}
          helperText={v && !opts.includes(v) ? `"${v}" isn't a known option` : undefined} error={!!v && !opts.includes(v)}>
          {opts.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
        </TextField>
      )
    }
    case 'client':
    case 'payee': {
      const opts = spec.type === 'payee'
        ? options.employees
        : options.clients
          .filter(c => c.active !== false && (!spec.clientCategory || c.category === spec.clientCategory))
          .map(c => c.name)
      return (
        <Autocomplete freeSolo options={opts} value={(value as string) ?? ''} size="small"
          onInputChange={(_, v) => onChange(spec.key, v)}
          renderInput={params => <TextField {...params} label={spec.label} />} />
      )
    }
    case 'multiline':
      return <TextField {...common} multiline minRows={2} value={value ?? ''} onChange={e => onChange(spec.key, e.target.value)} />
    default:
      return <TextField {...common} value={value ?? ''} onChange={e => onChange(spec.key, e.target.value)} />
  }
}

type Checked = Pick<AgentEntry, 'issues' | 'effects' | 'estimate'>

export default function ReviewDialog({ entries: initial, onClose, onConfirm, onChange }: {
  entries: AgentEntry[]
  onClose: () => void
  onConfirm: (entries: AgentEntry[]) => Promise<void>
  onChange: (entries: AgentEntry[]) => void
}) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'))

  const [rows, setRows] = useState<AgentEntry[]>(() => initial.map(stripComputed))
  const [checked, setChecked] = useState<Checked[]>(() => initial.map(e => ({ issues: e.issues, effects: e.effects, estimate: e.estimate })))
  const [validating, setValidating] = useState(true)
  const [saving, setSaving] = useState(false)
  const [checkError, setCheckError] = useState('')
  const [options, setOptions] = useState<Options>({ clients: [], employees: [], shaftSizes: [] })

  useEffect(() => {
    Promise.all([axios.get('/api/client'), axios.get('/api/employee'), axios.get('/api/shaftSizes')])
      .then(([c, e, s]) => setOptions({
        clients: [...c.data].sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)),
        employees: e.data.map((x: { name: string }) => x.name),
        shaftSizes: s.data,
      }))
      .catch(() => { /* dropdowns stay empty; typing still works */ })
  }, [])

  // Re-check against live data (balances, stock, names) shortly after each edit
  const requestId = useRef(0)
  useEffect(() => {
    const id = ++requestId.current
    const timer = setTimeout(() => {
      setValidating(true)
      axios.post('/api/agent/validate', { entries: rows })
        .then(res => {
          if (id !== requestId.current) return
          const checkedRows = res.data.entries as AgentEntry[]
          setChecked(checkedRows.map(e => ({ issues: e.issues, effects: e.effects, estimate: e.estimate })))
          // Adopt server clean-ups (e.g. "8v4" -> "8", client name casing) so the fields match what will be saved
          const NORMALIZED: (keyof AgentEntry)[] = ['rotorSize', 'client']
          if (checkedRows.some((e, i) => NORMALIZED.some(k => rows[i] && e[k] !== undefined && e[k] !== rows[i][k]))) {
            setRows(prev => prev.map((r, i) => {
              const c = checkedRows[i]
              if (!c || c.kind !== r.kind) return r
              const fixes = Object.fromEntries(NORMALIZED.filter(k => c[k] !== undefined && c[k] !== r[k]).map(k => [k, c[k]]))
              return Object.keys(fixes).length ? { ...r, ...fixes } : r
            }))
          }
          setCheckError('')
        })
        .catch(e => { if (id === requestId.current) setCheckError(errorMessage(e, 'Could not check entries')) })
        .finally(() => { if (id === requestId.current) setValidating(false) })
    }, 400)
    return () => clearTimeout(timer)
  }, [rows])

  const update = (i: number, key: keyof AgentEntry, value: unknown) =>
    setRows(prev => prev.map((r, j) => (j === i ? { ...r, [key]: value } : r)))
  const remove = (i: number) => {
    setRows(prev => prev.filter((_, j) => j !== i))
    setChecked(prev => prev.filter((_, j) => j !== i))
  }

  const issueCount = checked.filter(c => c.issues?.length).length
  const canSave = rows.length > 0 && !validating && !saving && !issueCount && !checkError

  const totals = useMemo(() => {
    const sum = (k: EntryKind) => rows.filter(r => r.kind === k).reduce((s, r) => s + (r.amount ?? 0), 0)
    const counts = rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.kind]: (acc[r.kind] ?? 0) + 1 }), {})
    return { counts, income: sum('income'), expense: sum('expense'), personal: sum('personalExpense') }
  }, [rows])

  const close = () => {
    onChange(rows.map((r, i) => ({ ...r, ...checked[i] }))) // keep edits (and their checks) in the draft
    onClose()
  }

  const confirm = async () => {
    setSaving(true)
    try { await onConfirm(rows) } finally { setSaving(false) }
  }

  return (
    <Dialog open onClose={saving ? undefined : close} fullScreen={fullScreen} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography fontWeight={700} fontSize={18}>Review before saving</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', rowGap: 1 }}>
          {Object.entries(totals.counts).map(([k, n]) => (
            <Chip key={k} size="small" label={`${n} ${KIND_META[k as EntryKind]?.label ?? k}`}
              sx={{ bgcolor: KIND_META[k as EntryKind]?.color, color: '#fff', fontWeight: 600 }} />
          ))}
          {totals.income > 0 && <Chip size="small" variant="outlined" color="success" label={`In ${rupee(totals.income)}`} />}
          {totals.expense > 0 && <Chip size="small" variant="outlined" color="error" label={`Out ${rupee(totals.expense)}`} />}
          {totals.personal > 0 && <Chip size="small" variant="outlined" color="warning" label={`Personal ${rupee(totals.personal)}`} />}
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ bgcolor: 'grey.50' }}>
        {rows.length === 0 && <Typography color="text.secondary" align="center" sx={{ py: 4 }}>Nothing left to save.</Typography>}
        <Stack spacing={1.5}>
          {rows.map((row, i) => {
            const meta = KIND_META[row.kind]
            const c = checked[i] ?? {}
            const fields = (FIELDS[row.kind] ?? []).filter(f => !f.show || f.show(row))
            return (
              <Paper key={i} variant="outlined" sx={{ p: 1.5, borderLeft: `4px solid ${meta?.color ?? '#555'}`, borderRadius: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>#{i + 1}</Typography>
                  <TextField select size="small" value={row.kind} onChange={e => update(i, 'kind', e.target.value)}
                    sx={{ minWidth: 150, '& .MuiInputBase-input': { fontWeight: 600, color: meta?.color } }}>
                    {Object.entries(KIND_META).map(([k, m]) => <MenuItem key={k} value={k}>{m.label}</MenuItem>)}
                  </TextField>
                  <Box flex={1} />
                  {c.estimate ? <Typography variant="body2" fontWeight={600}>≈ {rupee(c.estimate)}</Typography> : null}
                  <Tooltip title="Don't save this one">
                    <IconButton size="small" onClick={() => remove(i)} aria-label={`Remove entry ${i + 1}`}><DeleteOutlineIcon fontSize="small" /></IconButton>
                  </Tooltip>
                </Stack>

                <Grid container spacing={1.5}>
                  <Grid item xs={6} sm={4} md={3}>
                    <FieldInput spec={{ key: 'date', label: 'Date', type: 'date' }} entry={row} options={options} onChange={(k, v) => update(i, k, v)} />
                  </Grid>
                  {fields.map(f => (
                    <Grid item key={f.key} xs={f.wide ? 12 : 6} sm={f.wide ? 12 : 4} md={f.wide ? 12 : 3}>
                      <FieldInput spec={f} entry={row} options={options} onChange={(k, v) => update(i, k, v)} />
                    </Grid>
                  ))}
                </Grid>

                {(c.effects?.length || c.issues?.length) ? (
                  <Box sx={{ mt: 1.25 }}>
                    {c.effects?.map((fx, j) => (
                      <Stack key={j} direction="row" spacing={0.5} alignItems="center">
                        <ArrowForwardIcon sx={{ fontSize: 14, color: 'info.main' }} />
                        <Typography variant="caption" color="info.dark">{fx}</Typography>
                      </Stack>
                    ))}
                    {c.issues?.map((issue, j) => (
                      <Typography key={j} variant="caption" color="error" display="block">⚠ {issue}</Typography>
                    ))}
                  </Box>
                ) : null}
              </Paper>
            )
          })}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="caption" sx={{ flex: 1, minWidth: 160 }} color={issueCount || checkError ? 'error' : 'text.secondary'}>
          {checkError || (validating ? 'Checking…' : issueCount ? `${issueCount} ${issueCount === 1 ? 'entry needs' : 'entries need'} fixing` : 'All good. Nothing is saved until you confirm.')}
        </Typography>
        <Button onClick={close} disabled={saving}>Back to chat</Button>
        <Button variant="contained" color="success" onClick={confirm} disabled={!canSave}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}>
          Confirm & save {rows.length}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
